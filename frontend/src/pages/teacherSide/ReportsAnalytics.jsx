import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { db, auth } from "../../firebase/firebaseConfig";
import {
  BarChart2,
  TrendingUp,
  AlertTriangle,
  Trophy,
  Zap,
  Clock,
  ChevronDown,
  Users,
  Target,
  Loader,
  Edit3,
  Trash2,
  X,
  CheckCircle,
  PlusCircle,
  Save,
  Loader2
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

export default function ReportsAnalytics() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingChanges, setSavingChanges] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassQuizzes();
    }
  }, [selectedClass]);

  const fetchTeacherClasses = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const classesRef = collection(db, "classes");
      const q = query(classesRef, where("teacherId", "==", currentUser.uid));
      const snapshot = await getDocs(q);

      const classData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setClasses(classData);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassQuizzes = async () => {
    try {
      const assignmentsRef = collection(db, "assignedQuizzes");
      const q = query(
        assignmentsRef,
        where("classId", "==", selectedClass),
        where("completed", "==", true)
      );
      const snapshot = await getDocs(q);

      const quizIds = new Set();
      const quizData = [];

      for (const assignDoc of snapshot.docs) {
        const data = assignDoc.data();
        if (!quizIds.has(data.quizId)) {
          quizIds.add(data.quizId);
          
          const quizRef = doc(db, "quizzes", data.quizId);
          const quizSnap = await getDoc(quizRef);
          
          if (quizSnap.exists()) {
            quizData.push({
              id: data.quizId,
              title: quizSnap.data().title,
              quizMode: data.quizMode,
              assignedAt: data.assignedAt
            });
          }
        }
      }

      quizData.sort((a, b) => {
        if (a.assignedAt && b.assignedAt) {
          return b.assignedAt.seconds - a.assignedAt.seconds;
        }
        return 0;
      });

      setQuizzes(quizData);
      setSelectedQuiz(null);
      setAnalytics(null);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    }
  };

  const fetchQuizAnalytics = async (quizId, quizMode) => {
    setLoadingAnalytics(true);
    try {
      const quizRef = doc(db, "quizzes", quizId);
      const quizSnap = await getDoc(quizRef);
      
      if (!quizSnap.exists()) {
        console.error("Quiz not found");
        return;
      }

      const quizData = quizSnap.data();
      const questions = quizData.questions || [];

      const submissionsRef = collection(db, "quizSubmissions");
      const q = query(
        submissionsRef,
        where("quizId", "==", quizId)
      );
      const submissionsSnapshot = await getDocs(q);

      const submissions = [];
      for (const subDoc of submissionsSnapshot.docs) {
        const subData = subDoc.data();
        
        const assignmentRef = doc(db, "assignedQuizzes", subData.assignmentId);
        const assignmentSnap = await getDoc(assignmentRef);
        
        if (assignmentSnap.exists() && assignmentSnap.data().classId === selectedClass) {
          submissions.push({
            id: subDoc.id,
            ...subData
          });
        }
      }

      if (submissions.length === 0) {
        setAnalytics({
          quizId,
          quizMode,
          questions,
          totalStudents: 0,
          averageRawScore: 0,
          averageBase50Score: 0,
          itemAnalysis: [],
          lowPerformers: [],
          topPerformers: [],
          submissions: []
        });
        setLoadingAnalytics(false);
        return;
      }

      const itemAnalysis = questions.map((question, qIndex) => {
        let correctCount = 0;

        submissions.forEach(sub => {
          const studentAnswer = sub.answers?.[qIndex];
          if (!studentAnswer) return;

          let isCorrect = false;

          if (question.type === "multiple_choice") {
            const correctChoice = question.choices?.find(c => c.is_correct);
            isCorrect = correctChoice && studentAnswer === correctChoice.text;
          } else if (question.type === "true_false") {
            isCorrect = studentAnswer.toLowerCase() === question.correct_answer.toLowerCase();
          } else if (question.type === "identification") {
            isCorrect = studentAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
          }

          if (isCorrect) correctCount++;
        });

        const percentCorrect = (correctCount / submissions.length) * 100;

        return {
          questionNumber: qIndex + 1,
          questionText: question.question,
          type: question.type,
          correctCount,
          totalStudents: submissions.length,
          percentCorrect: Math.round(percentCorrect),
          points: question.points || 1,
          index: qIndex
        };
      });

      // Calculate both raw and base-50 averages for complete analytics
      const averageRawScore = submissions.reduce((sum, sub) => sum + (sub.rawScorePercentage || 0), 0) / submissions.length;
      const averageBase50Score = submissions.reduce((sum, sub) => sum + (sub.base50ScorePercentage || 0), 0) / submissions.length;

      const lowPerformers = itemAnalysis
        .filter(item => item.percentCorrect < 50)
        .map(item => `Q${item.questionNumber}`);

      const topPerformers = itemAnalysis
        .filter(item => item.percentCorrect === 100)
        .map(item => `Q${item.questionNumber}`);

      setAnalytics({
        quizId,
        quizMode,
        questions,
        totalStudents: submissions.length,
        averageRawScore: Math.round(averageRawScore),
        averageBase50Score: Math.round(averageBase50Score),
        itemAnalysis,
        lowPerformers,
        topPerformers,
        submissions
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleQuizSelect = (quiz) => {
    setSelectedQuiz(quiz);
    fetchQuizAnalytics(quiz.id, quiz.quizMode);
  };

  const handleOpenQuestionEditor = (itemAnalysis) => {
    const question = analytics.questions[itemAnalysis.index];
    setEditingQuestion(itemAnalysis.index);
    setEditForm({
      question: question.question,
      type: question.type,
      points: question.points,
      correct_answer: question.correct_answer || "",
      choices: question.choices ? [...question.choices] : null,
      bloom_classification: question.bloom_classification || "LOTS"
    });
    setShowEditModal(true);
  };

  const handleSaveQuestionChanges = async () => {
    if (!editForm.question.trim()) {
      alert("Question text cannot be empty");
      return;
    }

    if (editForm.type === "multiple_choice") {
      if (!editForm.choices || editForm.choices.length < 2) {
        alert("Multiple choice must have at least 2 choices");
        return;
      }
      if (!editForm.choices.some(c => c.is_correct)) {
        alert("Please mark one choice as correct");
        return;
      }
      if (editForm.choices.some(c => !c.text.trim())) {
        alert("All choices must have text");
        return;
      }
    } else {
      if (!editForm.correct_answer.trim()) {
        alert("Correct answer cannot be empty");
        return;
      }
    }

    setSavingChanges(true);
    try {
      const oldQuestion = analytics.questions[editingQuestion];
      const updatedQuestions = [...analytics.questions];
      updatedQuestions[editingQuestion] = {
        ...updatedQuestions[editingQuestion],
        question: editForm.question,
        points: editForm.points,
        correct_answer: editForm.correct_answer,
        choices: editForm.choices,
        bloom_classification: editForm.bloom_classification
      };

      const quizRef = doc(db, "quizzes", analytics.quizId);
      const totalPoints = updatedQuestions.reduce((sum, q) => sum + q.points, 0);
      const hotsCount = updatedQuestions.filter(q => q.bloom_classification === "HOTS").length;
      const lotsCount = updatedQuestions.filter(q => q.bloom_classification === "LOTS").length;

      await updateDoc(quizRef, {
        questions: updatedQuestions,
        totalPoints: totalPoints,
        classificationStats: {
          hots_count: hotsCount,
          lots_count: lotsCount,
          hots_percentage: ((hotsCount / updatedQuestions.length) * 100).toFixed(1),
          lots_percentage: ((lotsCount / updatedQuestions.length) * 100).toFixed(1)
        },
        updatedAt: new Date()
      });

      // Recalculate affected student scores
      await recalculateStudentScores(analytics.quizId, editingQuestion, oldQuestion, updatedQuestions[editingQuestion], updatedQuestions);

      alert("Question updated successfully! Student scores have been recalculated.");
      setShowEditModal(false);
      setEditingQuestion(null);
      
      // Refresh analytics
      await fetchQuizAnalytics(analytics.quizId, analytics.quizMode);
    } catch (error) {
      console.error("Error saving question changes:", error);
      alert("Error saving changes. Please try again.");
    } finally {
      setSavingChanges(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!window.confirm("Are you sure you want to delete this question? Student scores will be recalculated.")) {
      return;
    }

    setSavingChanges(true);
    try {
      const deletedQuestion = analytics.questions[editingQuestion];
      const updatedQuestions = analytics.questions.filter((_, i) => i !== editingQuestion);

      const quizRef = doc(db, "quizzes", analytics.quizId);
      const totalPoints = updatedQuestions.reduce((sum, q) => sum + q.points, 0);
      const hotsCount = updatedQuestions.filter(q => q.bloom_classification === "HOTS").length;
      const lotsCount = updatedQuestions.filter(q => q.bloom_classification === "LOTS").length;

      await updateDoc(quizRef, {
        questions: updatedQuestions,
        totalPoints: totalPoints,
        classificationStats: {
          hots_count: hotsCount,
          lots_count: lotsCount,
          hots_percentage: updatedQuestions.length > 0 ? ((hotsCount / updatedQuestions.length) * 100).toFixed(1) : "0.0",
          lots_percentage: updatedQuestions.length > 0 ? ((lotsCount / updatedQuestions.length) * 100).toFixed(1) : "0.0"
        },
        updatedAt: new Date()
      });

      // Recalculate student scores after deletion
      await recalculateStudentScoresAfterDeletion(analytics.quizId, editingQuestion, deletedQuestion, updatedQuestions);

      alert("Question deleted successfully! Student scores have been recalculated.");
      setShowEditModal(false);
      setEditingQuestion(null);
      
      // Refresh analytics
      await fetchQuizAnalytics(analytics.quizId, analytics.quizMode);
    } catch (error) {
      console.error("Error deleting question:", error);
      alert("Error deleting question. Please try again.");
    } finally {
      setSavingChanges(false);
    }
  };

  const recalculateStudentScores = async (quizId, questionIndex, oldQuestion, newQuestion, allQuestions) => {
    try {
      const submissionsRef = collection(db, "quizSubmissions");
      const q = query(submissionsRef, where("quizId", "==", quizId));
      const submissionsSnapshot = await getDocs(q);

      const batch = writeBatch(db);

      for (const subDoc of submissionsSnapshot.docs) {
        const subData = subDoc.data();
        
        // Check if this submission belongs to the selected class
        const assignmentRef = doc(db, "assignedQuizzes", subData.assignmentId);
        const assignmentSnap = await getDoc(assignmentRef);
        
        if (assignmentSnap.exists() && assignmentSnap.data().classId === selectedClass) {
          let newScore = 0;
          let correctCount = 0;

          // Recalculate entire score and correct count from scratch
          allQuestions.forEach((question, qIndex) => {
            const studentAnswer = subData.answers?.[qIndex];
            if (!studentAnswer) return;

            let isCorrect = false;

            if (question.type === "multiple_choice") {
              const correctChoice = question.choices?.find(c => c.is_correct);
              isCorrect = correctChoice && studentAnswer === correctChoice.text;
            } else if (question.type === "true_false") {
              isCorrect = studentAnswer.toLowerCase() === question.correct_answer.toLowerCase();
            } else if (question.type === "identification") {
              isCorrect = studentAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
            }

            if (isCorrect) {
              correctCount++;
              newScore += question.points || 1;
            }
          });

          // Calculate total points
          const totalPoints = allQuestions.reduce((sum, q) => sum + (q.points || 1), 0);
          
          // Calculate raw score percentage
          const rawScorePercentage = totalPoints > 0 ? Math.round((newScore / totalPoints) * 100) : 0;
          
          // Calculate base-50 score percentage (Transmutation)
          const base50ScorePercentage = Math.round(50 + (rawScorePercentage / 2));

          // Update submission with all fields
          batch.update(subDoc.ref, { 
            score: Math.max(0, newScore),
            correctPoints: correctCount,
            totalPoints: totalPoints,
            rawScorePercentage: rawScorePercentage,
            base50ScorePercentage: base50ScorePercentage
          });

          // Also update the assignedQuizzes document
          batch.update(assignmentRef, {
            rawScorePercentage: rawScorePercentage,
            base50ScorePercentage: base50ScorePercentage
          });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error("Error recalculating scores:", error);
      throw error;
    }
  };

  const recalculateStudentScoresAfterDeletion = async (quizId, deletedQuestionIndex, deletedQuestion, updatedQuestions) => {
    try {
      const submissionsRef = collection(db, "quizSubmissions");
      const q = query(submissionsRef, where("quizId", "==", quizId));
      const submissionsSnapshot = await getDocs(q);

      const batch = writeBatch(db);

      for (const subDoc of submissionsSnapshot.docs) {
        const subData = subDoc.data();
        
        const assignmentRef = doc(db, "assignedQuizzes", subData.assignmentId);
        const assignmentSnap = await getDoc(assignmentRef);
        
        if (assignmentSnap.exists() && assignmentSnap.data().classId === selectedClass) {
          let newScore = 0;
          let correctCount = 0;

          // Recalculate entire score and correct count from scratch
          updatedQuestions.forEach((question, qIndex) => {
            // Adjust index to account for deleted question
            const originalIndex = qIndex >= deletedQuestionIndex ? qIndex + 1 : qIndex;
            const studentAnswer = subData.answers?.[originalIndex];
            
            if (!studentAnswer) return;

            let isCorrect = false;

            if (question.type === "multiple_choice") {
              const correctChoice = question.choices?.find(c => c.is_correct);
              isCorrect = correctChoice && studentAnswer === correctChoice.text;
            } else if (question.type === "true_false") {
              isCorrect = studentAnswer.toLowerCase() === question.correct_answer.toLowerCase();
            } else if (question.type === "identification") {
              isCorrect = studentAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
            }

            if (isCorrect) {
              correctCount++;
              newScore += question.points || 1;
            }
          });

          // Calculate total points
          const totalPoints = updatedQuestions.reduce((sum, q) => sum + (q.points || 1), 0);
          
          // Calculate raw score percentage
          const rawScorePercentage = totalPoints > 0 ? Math.round((newScore / totalPoints) * 100) : 0;
          
          // Calculate base-50 score percentage (Transmutation)
          const base50ScorePercentage = Math.round(50 + (rawScorePercentage / 2));

          // Update submission with all fields
          batch.update(subDoc.ref, { 
            score: Math.max(0, newScore),
            correctPoints: correctCount,
            totalPoints: totalPoints,
            rawScorePercentage: rawScorePercentage,
            base50ScorePercentage: base50ScorePercentage
          });

          // Also update the assignedQuizzes document
          batch.update(assignmentRef, {
            rawScorePercentage: rawScorePercentage,
            base50ScorePercentage: base50ScorePercentage
          });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error("Error recalculating scores after deletion:", error);
      throw error;
    }
  };

  const getBarColor = (percent) => {
    if (percent >= 80) return "#10b981";
    if (percent >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const getQuestionTypeLabel = (type) => {
    switch (type) {
      case "multiple_choice":
        return "Multiple Choice";
      case "true_false":
        return "True/False";
      case "identification":
        return "Identification";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-Outfit">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <span className="ml-3 text-subtext">Loading…</span>
      </div>
    );
  }

  return (
    <div className="py-6 px-2 md:p-8 font-Outfit">
      <div className="flex items-center gap-3">
        <BarChart2 className="w-8 h-8 text-accent mb-6" />
        <div className="flex flex-col mb-6">
          <h1 className="text-2xl font-bold text-title flex items-center gap-2">
            Reports & Analytics
          </h1>
          <p className="text-md font-light text-subtext">
            View detailed quiz details and student performance and insights.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rounded-3xl mb-8">
        <div className="bg-components rounded-2xl p-6 shadow-md">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Class
          </label>
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer"
            >
              <option value="">Choose a class...</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {selectedClass && (
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Quiz
            </label>
            <div className="relative">
              <select
                value={selectedQuiz?.id || ""}
                onChange={(e) => {
                  const quiz = quizzes.find(q => q.id === e.target.value);
                  if (quiz) handleQuizSelect(quiz);
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer"
              >
                <option value="">Choose a quiz...</option>
                {quizzes.map(quiz => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title} ({quiz.quizMode === "synchronous" ? "Live" : "Self-Paced"})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {loadingAnalytics && (
        <div className="bg-white rounded-2xl p-12 shadow-md text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      )}

      {!loadingAnalytics && analytics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 shadow-lg text-white">
              <div className="flex items-center gap-3 mb-3">
                {analytics.quizMode === "synchronous" ? (
                  <Zap className="w-6 h-6" />
                ) : (
                  <Clock className="w-6 h-6" />
                )}
                <h2 className="font-semibold text-sm uppercase tracking-wide">Quiz Mode</h2>
              </div>
              <p className="text-2xl font-bold">
                {analytics.quizMode === "synchronous" ? "LIVE QUIZ" : "SELF-PACED"}
              </p>
              <p className="text-sm opacity-90 mt-1">
                {analytics.quizMode === "synchronous" ? "Synchronous" : "Asynchronous"}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 shadow-lg text-white">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-6 h-6" />
                <h2 className="font-semibold text-sm uppercase tracking-wide">Avg Raw Score</h2>
              </div>
              <p className="text-4xl font-bold">{analytics.averageRawScore}%</p>
              <p className="text-sm opacity-90 mt-1">{analytics.totalStudents} students</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 shadow-lg text-white">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-6 h-6" />
                <h2 className="font-semibold text-sm uppercase tracking-wide">Avg Base-50 Grade</h2>
              </div>
              <p className="text-4xl font-bold">{analytics.averageBase50Score}%</p>
              <p className="text-sm opacity-90 mt-1">Transmuted grade</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 shadow-lg text-white">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-6 h-6" />
                <h2 className="font-semibold text-sm uppercase tracking-wide">Low Performers</h2>
              </div>
              <p className="text-2xl font-bold">
                {analytics.lowPerformers.length > 0 
                  ? analytics.lowPerformers.join(", ")
                  : "None"}
              </p>
              <p className="text-sm opacity-90 mt-1">Below 50% correct</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl p-6 shadow-lg text-white">
              <div className="flex items-center gap-3 mb-3">
                <Trophy className="w-6 h-6" />
                <h2 className="font-semibold text-sm uppercase tracking-wide">Top Performers</h2>
              </div>
              <p className="text-2xl font-bold">
                {analytics.topPerformers.length > 0 
                  ? analytics.topPerformers.join(", ")
                  : "None"}
              </p>
              <p className="text-sm opacity-90 mt-1">100% correct</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">Item Analysis Overview</h2>
            </div>
            
            {analytics.itemAnalysis.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.itemAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="questionNumber" 
                    label={{ value: 'Question Number', position: 'insideBottom', offset: -5 }}
                    tickFormatter={(value) => `Q${value}`}
                  />
                  <YAxis 
                    label={{ value: 'Percentage Correct (%)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Correct']}
                    labelFormatter={(label) => `Question ${label}`}
                  />
                  <Bar dataKey="percentCorrect" radius={[8, 8, 0, 0]}>
                    {analytics.itemAnalysis.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.percentCorrect)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md overflow-x-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Detailed Item Analysis</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Q#</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Question</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Type</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">% Correct</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Total Students</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Correct Count</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {analytics.itemAnalysis.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-700">{item.questionNumber}</td>
                    <td className="py-3 px-4 text-gray-600 max-w-md truncate">{item.questionText}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {getQuestionTypeLabel(item.type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold ${
                        item.percentCorrect >= 80 ? 'text-green-600' :
                        item.percentCorrect >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {item.percentCorrect}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-gray-700">{item.totalStudents}</td>
                    <td className="py-3 px-4 text-center font-semibold text-gray-700">{item.correctCount}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenQuestionEditor(item)}
                        className="inline-flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm transition"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loadingAnalytics && !analytics && selectedClass && quizzes.length === 0 && (
        <div className="bg-white rounded-2xl p-12 shadow-md text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No completed quizzes found for this class</p>
        </div>
      )}

      {!selectedClass && (
        <div className="bg-white rounded-2xl p-12 shadow-md text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Select a class to view quiz analytics</p>
        </div>
      )}

      {/* Edit Question Modal */}
      {showEditModal && editingQuestion !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Edit Question {editingQuestion + 1}</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingQuestion(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Question Text</label>
                <textarea
                  value={editForm.question}
                  onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Points</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.points}
                    onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Classification</label>
                  <select
                    value={editForm.bloom_classification}
                    onChange={(e) => setEditForm({ ...editForm, bloom_classification: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOTS">LOTS (Lower Order Thinking)</option>
                    <option value="HOTS">HOTS (Higher Order Thinking)</option>
                  </select>
                </div>
              </div>

              {editForm.type === "multiple_choice" && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Answer Choices</label>
                  <div className="space-y-2">
                    {editForm.choices && editForm.choices.map((choice, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={choice.is_correct}
                          onChange={() => {
                            const newChoices = editForm.choices.map((c, idx) => ({
                              ...c,
                              is_correct: idx === i
                            }));
                            setEditForm({ ...editForm, choices: newChoices });
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={choice.text}
                          onChange={(e) => {
                            const newChoices = [...editForm.choices];
                            newChoices[i].text = e.target.value;
                            setEditForm({ ...editForm, choices: newChoices });
                          }}
                          placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                          className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {editForm.choices.length > 2 && (
                          <button
                            onClick={() => {
                              const newChoices = editForm.choices.filter((_, idx) => idx !== i);
                              setEditForm({ ...editForm, choices: newChoices });
                            }}
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setEditForm({
                          ...editForm,
                          choices: [...editForm.choices, { text: "", is_correct: false }]
                        });
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1 mt-2"
                    >
                      <PlusCircle className="w-4 h-4" /> Add Choice
                    </button>
                  </div>
                </div>
              )}

              {editForm.type === "true_false" && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Correct Answer</label>
                  <select
                    value={editForm.correct_answer}
                    onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="True">True</option>
                    <option value="False">False</option>
                  </select>
                </div>
              )}

              {editForm.type === "identification" && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Correct Answer</label>
                  <input
                    type="text"
                    value={editForm.correct_answer}
                    onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter the correct answer"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6 justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingQuestion(null);
                }}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteQuestion}
                disabled={savingChanges}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Question
              </button>
              <button
                onClick={handleSaveQuestionChanges}
                disabled={savingChanges}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 flex items-center gap-2"
              >
                {savingChanges ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}