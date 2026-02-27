import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  Users,
  Target,
  Loader,
  Edit3,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  PlusCircle,
  Save,
  Loader2,
  ChevronRight
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  AreaChart,
  Area
} from "recharts";

// ─── Custom Toast Notification ───────────────────────────────────────────────
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => onClose(), 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const styles = {
    success: {
      bg: "bg-green-50 border-green-200",
      icon: <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />,
      text: "text-green-800",
    },
    error: {
      bg: "bg-red-50 border-red-200",
      icon: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
      text: "text-red-800",
    },
    warning: {
      bg: "bg-yellow-50 border-yellow-200",
      icon: <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />,
      text: "text-yellow-800",
    },
  };

  const s = styles[toast.type] || styles.warning;

  return createPortal(
    <div className="fixed top-20 right-6 z-[9999] animate-slideIn max-w-sm w-full">
      <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${s.bg}`}>
        {s.icon}
        <p className={`text-sm font-medium flex-1 ${s.text}`}>{toast.message}</p>
        <button onClick={onClose} className="p-0.5 hover:bg-black/5 rounded-lg transition">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>,
    document.body
  );
}

// ─── Custom Confirm Dialog ───────────────────────────────────────────────────
function ConfirmDialog({ isOpen, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, icon, color }) {
  useEffect(() => {
    if (!isOpen) return;
    const scrollableParent = document.querySelector('.overflow-y-auto');
    document.body.style.overflow = 'hidden';
    if (scrollableParent) scrollableParent.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      if (scrollableParent) scrollableParent.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const colorMap = {
    orange: { btn: "bg-orange-500 hover:bg-orange-600", iconBg: "bg-orange-100", iconColor: "text-orange-600" },
    red: { btn: "bg-red-500 hover:bg-red-600", iconBg: "bg-red-100", iconColor: "text-red-600" },
    blue: { btn: "bg-blue-500 hover:bg-blue-600", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
  };
  const c = colorMap[color] || colorMap.blue;

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-full ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
              {icon || <AlertTriangle className={`w-6 h-6 ${c.iconColor}`} />}
            </div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed ml-16">{message}</p>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end border-t border-gray-100">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition text-sm"
          >
            {cancelLabel || "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 ${c.btn} text-white rounded-xl font-semibold transition text-sm`}
          >
            {confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ReportsAnalytics() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingChanges, setSavingChanges] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);
  const showToast = useCallback((type, message) => {
    setToast({ type, message });
  }, []);
  const clearToast = useCallback(() => setToast(null), []);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

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
    setLoadingQuizzes(true);
    try {
      const assignmentsRef = collection(db, "assignedQuizzes");
      const q = query(
        assignmentsRef,
        where("classId", "==", selectedClass.id),
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
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const calculateDifficultyIndex = (percentCorrect) => {
    return percentCorrect / 100;
  };

  const calculateDiscriminationIndex = (submissions, questionIndex, question) => {
    if (submissions.length < 2) return 0;

    const scores = submissions.map(sub => {
      let isCorrect = false;
      const studentAnswer = sub.answers?.[questionIndex];

      if (!studentAnswer) {
        return { score: 0, totalScore: sub.rawScorePercentage || 0 };
      }

      if (question.type === "multiple_choice") {
        const correctChoice = question.choices?.find(c => c.is_correct);
        isCorrect = correctChoice && studentAnswer === correctChoice.text;
      } else if (question.type === "true_false") {
        isCorrect = studentAnswer.toLowerCase() === question.correct_answer.toLowerCase();
      } else if (question.type === "identification") {
        isCorrect = studentAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
      }

      return { score: isCorrect ? 1 : 0, totalScore: sub.rawScorePercentage || 0 };
    });

    const sortedByTotal = scores.sort((a, b) => b.totalScore - a.totalScore);
    const upperHalf = Math.ceil(sortedByTotal.length / 2);
    const lowerHalf = sortedByTotal.length - upperHalf;

    const upperCorrect = sortedByTotal.slice(0, upperHalf).filter(s => s.score === 1).length;
    const lowerCorrect = sortedByTotal.slice(upperHalf).filter(s => s.score === 1).length;

    const discrimination = (upperCorrect / upperHalf) - (lowerCorrect / lowerHalf);
    return Math.round(discrimination * 100) / 100;
  };

  const getItemQuality = (difficulty, discrimination) => {
    if (difficulty >= 0.86) {
      return "discard";
    } else if (difficulty >= 0.71 && difficulty <= 0.85) {
      return "revise";
    } else if (difficulty >= 0.30 && difficulty <= 0.70) {
      return "good";
    } else if (difficulty >= 0.15 && difficulty <= 0.29) {
      return "revise";
    } else if (difficulty < 0.15) {
      return "discard";
    }

    return "revise";
  };

  const getItemQualityColor = (quality) => {
    switch (quality) {
      case "good":
        return "#10b981";
      case "revise":
        return "#eab308";
      case "discard":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getItemQualityLabel = (quality) => {
    switch (quality) {
      case "good":
        return "Very Good Items";
      case "revise":
        return "To be Revised";
      case "discard":
        return "To be Discarded";
      default:
        return "Unknown";
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

        if (assignmentSnap.exists() && assignmentSnap.data().classId === selectedClass.id) {
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
        let correctAnswer = "";

        if (question.type === "multiple_choice") {
          const correctChoice = question.choices?.find(c => c.is_correct);
          correctAnswer = correctChoice?.text || "";
        } else {
          correctAnswer = question.correct_answer || "";
        }

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
        const difficultyIndex = calculateDifficultyIndex(percentCorrect);
        const discriminationIndex = calculateDiscriminationIndex(submissions, qIndex, question);
        const quality = getItemQuality(difficultyIndex, discriminationIndex);

        return {
          questionNumber: qIndex + 1,
          questionText: question.question,
          type: question.type,
          correctCount,
          totalStudents: submissions.length,
          percentCorrect: Math.round(percentCorrect),
          difficultyIndex: Math.round(difficultyIndex * 100) / 100,
          discriminationIndex,
          quality,
          points: question.points || 1,
          index: qIndex
        };
      });

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
      showToast("warning", "Question text cannot be empty");
      return;
    }

    if (editForm.type === "multiple_choice") {
      if (!editForm.choices || editForm.choices.length < 2) {
        showToast("warning", "Multiple choice must have at least 2 choices");
        return;
      }
      if (!editForm.choices.some(c => c.is_correct)) {
        showToast("warning", "Please mark one choice as correct");
        return;
      }
      if (editForm.choices.some(c => !c.text.trim())) {
        showToast("warning", "All choices must have text");
        return;
      }
    } else {
      if (!editForm.correct_answer.trim()) {
        showToast("warning", "Correct answer cannot be empty");
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

      await recalculateStudentScores(analytics.quizId, editingQuestion, oldQuestion, updatedQuestions[editingQuestion], updatedQuestions);

      showToast("success", "Question updated successfully! Student scores have been recalculated.");
      setShowEditModal(false);
      setEditingQuestion(null);

      await fetchQuizAnalytics(analytics.quizId, analytics.quizMode);
    } catch (error) {
      console.error("Error saving question changes:", error);
      showToast("error", "Error saving changes. Please try again.");
    } finally {
      setSavingChanges(false);
    }
  };

  const handleDeleteQuestion = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Question",
      message: "Are you sure you want to delete this question? Student scores will be recalculated.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      color: "red",
      icon: <Trash2 className="w-6 h-6 text-red-600" />,
      onConfirm: () => {
        setConfirmDialog({ isOpen: false });
        executeDeleteQuestion();
      },
      onCancel: () => setConfirmDialog({ isOpen: false }),
    });
  };

  const executeDeleteQuestion = async () => {

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

      await recalculateStudentScoresAfterDeletion(analytics.quizId, editingQuestion, deletedQuestion, updatedQuestions);

      showToast("success", "Question deleted successfully! Student scores have been recalculated.");
      setShowEditModal(false);
      setEditingQuestion(null);

      await fetchQuizAnalytics(analytics.quizId, analytics.quizMode);
    } catch (error) {
      console.error("Error deleting question:", error);
      showToast("error", "Error deleting question. Please try again.");
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

        const assignmentRef = doc(db, "assignedQuizzes", subData.assignmentId);
        const assignmentSnap = await getDoc(assignmentRef);

        if (assignmentSnap.exists() && assignmentSnap.data().classId === selectedClass.id) {
          let newScore = 0;
          let correctCount = 0;

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

          const totalPoints = allQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

          const rawScorePercentage = totalPoints > 0 ? Math.round((newScore / totalPoints) * 100) : 0;

          const base50ScorePercentage = Math.round(50 + (rawScorePercentage / 2));

          batch.update(subDoc.ref, {
            score: Math.max(0, newScore),
            correctPoints: correctCount,
            totalPoints: totalPoints,
            rawScorePercentage: rawScorePercentage,
            base50ScorePercentage: base50ScorePercentage
          });

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

        if (assignmentSnap.exists() && assignmentSnap.data().classId === selectedClass.id) {
          let newScore = 0;
          let correctCount = 0;

          updatedQuestions.forEach((question, qIndex) => {
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

          const totalPoints = updatedQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

          const rawScorePercentage = totalPoints > 0 ? Math.round((newScore / totalPoints) * 100) : 0;

          const base50ScorePercentage = Math.round(50 + (rawScorePercentage / 2));

          batch.update(subDoc.ref, {
            score: Math.max(0, newScore),
            correctPoints: correctCount,
            totalPoints: totalPoints,
            rawScorePercentage: rawScorePercentage,
            base50ScorePercentage: base50ScorePercentage
          });

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
      <div className="py-4 px-3 md:py-6 md:px-8 font-Outfit">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-7 h-7 md:w-8 md:h-8 text-blue-500 mb-4 md:mb-6" />
          <div className="flex flex-col mb-4 md:mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-title flex items-center gap-2">
              Reports & Analytics
            </h1>
            <p className="text-sm md:text-md font-light text-subtext">
              View detailed quiz details and student performance and insights.
            </p>
          </div>
        </div>

        {/* Skeleton Class Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded-lg w-24 mb-1" />
              <div className="h-3 bg-gray-200 rounded-lg w-28 mb-1" />
              <div className="h-3 bg-gray-200 rounded-lg w-32 mb-4" />
              <div className="flex items-center justify-end">
                <div className="h-5 bg-gray-200 rounded-lg w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 px-3 md:py-6 md:px-8 font-Outfit">
      {/* Toast Notification */}
      <Toast toast={toast} onClose={clearToast} />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
        icon={confirmDialog.icon}
        color={confirmDialog.color}
      />
      <div className="flex items-center gap-3">
        <BarChart2 className="w-7 h-7 md:w-8 md:h-8 text-blue-500 mb-4 md:mb-6" />
        <div className="flex flex-col mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-title flex items-center gap-2">
            Reports & Analytics
          </h1>
          <p className="text-sm md:text-md font-light text-subtext">
            View detailed quiz details and student performance and insights.
          </p>
        </div>
      </div>

      {!selectedClass ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setSelectedClass(cls)}
              className="bg-gradient-to-br from-blue-50 to-emerald-50 border-2 border-blue-200 rounded-2xl p-6 text-left hover:shadow-lg hover:border-blue-400 transition-all duration-300 group"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition">
                {cls.name}
              </h2>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-semibold">{cls.studentCount || 0}</span> students
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Teacher: {cls.teacherName || "teacher1"}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Created: {cls.createdAt ? new Date(cls.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}
              </p>
              <div className="flex items-center justify-end text-blue-600 group-hover:text-blue-700 font-semibold">
                View Quizzes
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <>
          {!selectedQuiz && (
            <div className="mb-4 md:mb-8">
              <button
                onClick={() => {
                  setSelectedClass(null);
                  setSelectedQuiz(null);
                  setAnalytics(null);
                }}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold mb-3 md:mb-4 text-sm md:text-base"
              >
                ← Back to Classes
              </button>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-4 md:p-6">
                <h2 className="text-lg md:text-2xl font-bold text-gray-800 mb-1 md:mb-2">{selectedClass.name}</h2>
                <p className="text-sm md:text-base text-gray-600">Select a quiz to view analytics</p>
              </div>
            </div>
          )}

          {!selectedQuiz ? (
            <>
              {loadingQuizzes ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white border-2 border-gray-200 rounded-2xl p-6 animate-pulse"
                    >
                      <div className="h-5 bg-gray-200 rounded-lg w-3/4 mb-4" />
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-4 h-4 bg-gray-200 rounded" />
                        <div className="h-4 bg-gray-200 rounded-lg w-20" />
                      </div>
                      <div className="h-3 bg-gray-200 rounded-lg w-32 mb-4" />
                      <div className="flex items-center justify-end">
                        <div className="h-5 bg-gray-200 rounded-lg w-28" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : quizzes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {quizzes.map((quiz) => (
                    <button
                      key={quiz.id}
                      onClick={() => handleQuizSelect(quiz)}
                      className="bg-white border-2 border-gray-200 rounded-2xl p-6 text-left hover:shadow-lg hover:border-blue-400 transition-all duration-300 group"
                    >
                      <h3 className="text-lg font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition">
                        {quiz.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        {quiz.quizMode === "synchronous" ? (
                          <Zap className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-blue-500" />
                        )}
                        <span className="text-sm font-semibold text-gray-600">
                          {quiz.quizMode === "synchronous" ? "Live Quiz" : "Self-Paced"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">
                        Assigned: {quiz.assignedAt ? new Date(quiz.assignedAt.seconds * 1000).toLocaleDateString() : "N/A"}
                      </p>
                      <div className="flex items-center justify-end text-blue-600 group-hover:text-blue-700 font-semibold">
                        View Analytics
                        <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 shadow-md text-center">
                  <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No completed quizzes found for this class</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-4 md:mb-8">
                <button
                  onClick={() => {
                    setSelectedQuiz(null);
                    setAnalytics(null);
                  }}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold mb-3 md:mb-4 text-sm md:text-base"
                >
                  ← Back to Quizzes
                </button>
              </div>

              {loadingAnalytics && (
                <>
                  {/* Skeleton Stat Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-8">
                    {[
                      "from-purple-400 to-pink-400",
                      "from-blue-400 to-cyan-400",
                      "from-blue-400 to-emerald-400",
                      "from-yellow-400 to-orange-400",
                      "from-indigo-400 to-purple-400"
                    ].map((gradient, i) => (
                      <div
                        key={i}
                        className={`bg-gradient-to-br ${gradient} rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg animate-pulse ${i === 4 ? "col-span-2 md:col-span-1" : ""}`}
                      >
                        <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                          <div className="w-4 h-4 md:w-6 md:h-6 bg-white/30 rounded" />
                          <div className="h-3 md:h-4 bg-white/30 rounded-lg flex-1" />
                        </div>
                        <div className="h-6 md:h-9 bg-white/30 rounded-lg w-2/3 mb-1" />
                        <div className="h-3 md:h-4 bg-white/30 rounded-lg w-1/2 mt-1" />
                      </div>
                    ))}
                  </div>

                  {/* Skeleton Chart */}
                  <div className="bg-white rounded-2xl p-4 md:p-6 shadow-md mb-4 md:mb-8 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded-lg w-48 mb-4" />
                    <div className="h-48 md:h-64 bg-gray-100 rounded-xl flex items-end justify-around px-4 pb-4 gap-2">
                      {[40, 70, 55, 85, 30, 65, 90, 45, 75, 60].map((h, i) => (
                        <div key={i} className="bg-gray-200 rounded-t-md w-full" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>

                  {/* Skeleton Table */}
                  <div className="bg-white rounded-2xl p-4 md:p-6 shadow-md animate-pulse">
                    <div className="h-5 bg-gray-200 rounded-lg w-56 mb-4" />
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0" />
                          <div className="flex-1 h-4 bg-gray-200 rounded-lg" />
                          <div className="w-16 h-4 bg-gray-200 rounded-lg" />
                          <div className="w-16 h-4 bg-gray-200 rounded-lg" />
                          <div className="w-20 h-6 bg-gray-200 rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {!loadingAnalytics && analytics && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-8">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg text-white">
                      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                        {analytics.quizMode === "synchronous" ? (
                          <Zap className="w-4 h-4 md:w-6 md:h-6" />
                        ) : (
                          <Clock className="w-4 h-4 md:w-6 md:h-6" />
                        )}
                        <h2 className="font-semibold text-[10px] md:text-sm uppercase tracking-wide">Quiz Mode</h2>
                      </div>
                      <p className="text-sm md:text-2xl font-bold">
                        {analytics.quizMode === "synchronous" ? "LIVE QUIZ" : "SELF-PACED"}
                      </p>
                      <p className="text-[10px] md:text-sm opacity-90 mt-0.5 md:mt-1">
                        {analytics.quizMode === "synchronous" ? "Synchronous" : "Asynchronous"}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg text-white">
                      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                        <TrendingUp className="w-4 h-4 md:w-6 md:h-6" />
                        <h2 className="font-semibold text-[10px] md:text-sm uppercase tracking-wide">Avg Raw Score</h2>
                      </div>
                      <p className="text-2xl md:text-4xl font-bold">{analytics.averageRawScore}%</p>
                      <p className="text-[10px] md:text-sm opacity-90 mt-0.5 md:mt-1">{analytics.totalStudents} students</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg text-white">
                      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                        <TrendingUp className="w-4 h-4 md:w-6 md:h-6" />
                        <h2 className="font-semibold text-[10px] md:text-sm uppercase tracking-wide">Avg Base-50</h2>
                      </div>
                      <p className="text-2xl md:text-4xl font-bold">{analytics.averageBase50Score}%</p>
                      <p className="text-[10px] md:text-sm opacity-90 mt-0.5 md:mt-1">Transmuted grade</p>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg text-white">
                      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                        <AlertTriangle className="w-4 h-4 md:w-6 md:h-6" />
                        <h2 className="font-semibold text-[10px] md:text-sm uppercase tracking-wide">Low Performers</h2>
                      </div>
                      <p className="text-sm md:text-2xl font-bold break-words">
                        {analytics.lowPerformers.length > 0
                          ? analytics.lowPerformers.join(", ")
                          : "None"}
                      </p>
                      <p className="text-[10px] md:text-sm opacity-90 mt-0.5 md:mt-1">Below 50% correct</p>
                    </div>

                    <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg text-white">
                      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                        <Trophy className="w-4 h-4 md:w-6 md:h-6" />
                        <h2 className="font-semibold text-[10px] md:text-sm uppercase tracking-wide">Top Performers</h2>
                      </div>
                      <p className="text-sm md:text-2xl font-bold break-words">
                        {analytics.topPerformers.length > 0
                          ? analytics.topPerformers.join(", ")
                          : "None"}
                      </p>
                      <p className="text-[10px] md:text-sm opacity-90 mt-0.5 md:mt-1">100% correct</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl md:rounded-2xl border border-gray-200 mb-4 md:mb-8 overflow-hidden">
                    {/* Card Header */}
                    <div className="p-4 md:p-6 pb-2 md:pb-3">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                        <div>
                          <h2 className="text-base md:text-xl font-semibold text-gray-900 tracking-tight">Item Analysis Overview</h2>
                          <p className="text-xs md:text-sm text-gray-500 mt-0.5">Percentage correct per question</p>
                        </div>
                      </div>
                    </div>

                    {/* Chart */}
                    {analytics.itemAnalysis.length > 0 ? (
                      <div className="px-2 md:px-6 pb-4 md:pb-6">
                        <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 220 : 350}>
                          <AreaChart data={analytics.itemAnalysis} margin={{ top: 10, right: 10, left: window.innerWidth < 768 ? -20 : 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="areaGradientMain" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#18181b" stopOpacity={0.3} />
                                <stop offset="50%" stopColor="#18181b" stopOpacity={0.1} />
                                <stop offset="100%" stopColor="#18181b" stopOpacity={0.01} />
                              </linearGradient>
                              <linearGradient id="areaGradientSecondary" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a1a1aa" stopOpacity={0.2} />
                                <stop offset="50%" stopColor="#a1a1aa" stopOpacity={0.08} />
                                <stop offset="100%" stopColor="#a1a1aa" stopOpacity={0.01} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="#f4f4f5" />
                            <XAxis
                              dataKey="questionNumber"
                              tickFormatter={(value) => `Q${value}`}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: window.innerWidth < 768 ? 10 : 12, fill: '#a1a1aa' }}
                              dy={8}
                            />
                            <YAxis
                              domain={[0, 100]}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: window.innerWidth < 768 ? 10 : 12, fill: '#a1a1aa' }}
                              tickFormatter={(value) => `${value}%`}
                              width={window.innerWidth < 768 ? 35 : 45}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white rounded-lg border border-gray-200 shadow-lg px-3 py-2">
                                      <p className="text-xs font-medium text-gray-500 mb-1">Question {label}</p>
                                      {payload.map((entry, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.color }}></div>
                                          <span className="text-sm font-semibold text-gray-900">{entry.value}%</span>
                                          <span className="text-xs text-gray-500">{entry.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="basis"
                              dataKey="percentCorrect"
                              name="Correct"
                              stroke="#18181b"
                              strokeWidth={2}
                              fill="url(#areaGradientMain)"
                              dot={false}
                              activeDot={{ r: 4, strokeWidth: 2, stroke: '#18181b', fill: '#fff' }}
                            />
                            <Area
                              type="basis"
                              dataKey="difficultyIndex"
                              name="Difficulty"
                              stroke="#a1a1aa"
                              strokeWidth={1.5}
                              fill="url(#areaGradientSecondary)"
                              dot={false}
                              activeDot={{ r: 3, strokeWidth: 2, stroke: '#a1a1aa', fill: '#fff' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-40 md:h-64 flex items-center justify-center text-gray-400">
                        No data available
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-md mb-4 md:mb-8">
                    <h3 className="text-sm md:text-lg font-bold text-gray-800 mb-3 md:mb-4">Item Quality Legend (Hopkins & Antes)</h3>
                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                      <div className="flex flex-col md:flex-row items-center md:items-center gap-1.5 md:gap-3 p-2 md:p-4 bg-blue-50 border border-blue-200 md:border-2 rounded-lg text-center md:text-left">
                        <div className="w-4 h-4 md:w-6 md:h-6 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <div>
                          <p className="font-semibold text-gray-800 text-[10px] md:text-base leading-tight">Very Good Items</p>
                          <p className="text-[8px] md:text-xs text-gray-600 hidden md:block">Difficulty: Moderate (0.30 - 0.70)</p>
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row items-center md:items-center gap-1.5 md:gap-3 p-2 md:p-4 bg-yellow-50 border border-yellow-200 md:border-2 rounded-lg text-center md:text-left">
                        <div className="w-4 h-4 md:w-6 md:h-6 bg-yellow-500 rounded-full flex-shrink-0"></div>
                        <div>
                          <p className="font-semibold text-gray-800 text-[10px] md:text-base leading-tight">To be Revised</p>
                          <p className="text-[8px] md:text-xs text-gray-600 hidden md:block">Difficulty: Easy (0.71-0.85) or Difficult (0.15-0.29)</p>
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row items-center md:items-center gap-1.5 md:gap-3 p-2 md:p-4 bg-red-50 border border-red-200 md:border-2 rounded-lg text-center md:text-left">
                        <div className="w-4 h-4 md:w-6 md:h-6 bg-red-500 rounded-full flex-shrink-0"></div>
                        <div>
                          <p className="font-semibold text-gray-800 text-[10px] md:text-base leading-tight">To be Discarded</p>
                          <p className="text-[8px] md:text-xs text-gray-600 hidden md:block">Difficulty: Very Easy (≥0.86) or Very Difficult (&lt;0.15)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-md">
                    <h2 className="text-base md:text-xl font-bold text-gray-800 mb-3 md:mb-4">Detailed Item Analysis</h2>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 w-10">Q#</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 flex-1">Question</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700 w-24">Type</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700 w-20">% Correct</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700 w-24">Difficulty</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700 w-28">Quality</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700 w-24">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.itemAnalysis.map((item, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-bold text-gray-700">{item.questionNumber}</td>
                              <td className="py-3 px-4 text-gray-600 max-w-sm truncate">{item.questionText}</td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                                  {getQuestionTypeLabel(item.type)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`font-bold ${item.percentCorrect >= 80 ? 'text-blue-600' :
                                  item.percentCorrect >= 50 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                  {item.percentCorrect}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="font-semibold text-gray-800">{item.difficultyIndex}</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block text-xs px-2 py-1 rounded-md font-semibold whitespace-nowrap ${item.quality === 'good' ? 'bg-blue-100 text-blue-700' :
                                  item.quality === 'revise' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                  {getItemQualityLabel(item.quality)}
                                </span>
                              </td>
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

                    {/* Mobile Card Layout */}
                    <div className="md:hidden space-y-3">
                      {analytics.itemAnalysis.map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded-xl p-3 hover:shadow-md transition">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="bg-gray-100 text-gray-700 font-bold text-xs px-2 py-0.5 rounded-md flex-shrink-0">Q{item.questionNumber}</span>
                              <p className="text-xs text-gray-600 truncate">{item.questionText}</p>
                            </div>
                            <button
                              onClick={() => handleOpenQuestionEditor(item)}
                              className="ml-2 bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-lg transition flex-shrink-0"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                              {getQuestionTypeLabel(item.type)}
                            </span>
                            <span className={`text-xs font-bold ${item.percentCorrect >= 80 ? 'text-blue-600' :
                              item.percentCorrect >= 50 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                              {item.percentCorrect}%
                            </span>
                            <span className="text-[10px] text-gray-500">DI: {item.difficultyIndex}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${item.quality === 'good' ? 'bg-blue-100 text-blue-700' :
                              item.quality === 'revise' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                              {getItemQualityLabel(item.quality)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
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
                Delete
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