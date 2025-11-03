import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "../../firebase/firebaseConfig";
import {
  ArrowLeft,
  Clock,
  Send,
  AlertCircle,
  Loader,
  CheckCircle,
  XCircle,
  Zap,
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Award,
  TrendingUp,
} from "lucide-react";

export default function TakeSyncQuiz({ user, userDoc }) {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sessionStatus, setSessionStatus] = useState("not_started");
  const [quizStarted, setQuizStarted] = useState(false);
  const [identificationChoices, setIdentificationChoices] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState(null);

  useEffect(() => {
    fetchQuizData();
  }, [assignmentId]);

  useEffect(() => {
    if (!assignmentId) return;

    const assignmentRef = doc(db, "assignedQuizzes", assignmentId);
    const unsubscribe = onSnapshot(assignmentRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSessionStatus(data.sessionStatus || "not_started");
        
        if (data.sessionStatus === "ended" && quizStarted && !submitting) {
          handleAutoSubmit();
        }
      }
    });

    return () => unsubscribe();
  }, [assignmentId, quizStarted, submitting]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || sessionStatus !== "active") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, sessionStatus]);

  const fetchIdentificationChoices = async (quizId) => {
    try {
      const quizRef = doc(db, "quizzes", quizId);
      const quizSnap = await getDoc(quizRef);
      
      if (quizSnap.exists()) {
        const quizData = quizSnap.data();
        const allQuestions = quizData.questions || [];
        
        const identificationAnswers = allQuestions
          .filter(q => q.type === "identification")
          .map(q => q.correct_answer)
          .filter(answer => answer && answer.trim() !== "");
        
        const uniqueAnswers = [...new Set(identificationAnswers)];
        
        const choicesMap = {};
        allQuestions.forEach((question, index) => {
          if (question.type === "identification") {
            const shuffledChoices = shuffleArray([...uniqueAnswers]);
            choicesMap[index] = shuffledChoices;
          }
        });
        
        setIdentificationChoices(choicesMap);
      }
    } catch (error) {
      console.error("Error fetching identification choices:", error);
    }
  };

  const fetchQuizData = async () => {
    setLoading(true);
    setError(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError("Please log in first");
        navigate("/login");
        return;
      }

      const assignmentRef = doc(db, "assignedQuizzes", assignmentId);
      const assignmentSnap = await getDoc(assignmentRef);

      if (!assignmentSnap.exists()) {
        setError("Assignment not found");
        return;
      }

      const assignmentData = assignmentSnap.data();

      if (assignmentData.studentId !== currentUser.uid) {
        setError("This quiz is not assigned to you");
        return;
      }

      if (assignmentData.quizMode !== "synchronous") {
        setError("This is not a live quiz");
        return;
      }

      if (assignmentData.completed) {
        setError("You have already completed this quiz");
        return;
      }

      setAssignment({ id: assignmentSnap.id, ...assignmentData });
      setSessionStatus(assignmentData.sessionStatus || "not_started");

      const quizRef = doc(db, "quizzes", assignmentData.quizId);
      const quizSnap = await getDoc(quizRef);

      if (!quizSnap.exists()) {
        setError("Quiz not found");
        return;
      }

      const quizData = { id: quizSnap.id, ...quizSnap.data() };
      setQuiz(quizData);

      await fetchIdentificationChoices(assignmentData.quizId);

      let quizQuestions = quizData.questions || [];

      if (assignmentData.settings?.shuffleQuestions) {
        quizQuestions = shuffleArray([...quizQuestions]);
      }

      if (assignmentData.settings?.shuffleChoices) {
        quizQuestions = quizQuestions.map((q) => {
          if (q.type === "multiple_choice" && q.choices) {
            return {
              ...q,
              choices: shuffleArray([...q.choices]),
            };
          }
          return q;
        });
      }

      setQuestions(quizQuestions);

      if (assignmentData.settings?.timeLimit && assignmentData.sessionStatus === "active") {
        setTimeLeft(assignmentData.settings.timeLimit * 60);
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      setError("Failed to load quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleStartQuiz = async () => {
    try {
      const assignmentRef = doc(db, "assignedQuizzes", assignmentId);
      await updateDoc(assignmentRef, {
        status: "in_progress",
        startedAt: serverTimestamp(),
      });

      setQuizStarted(true);

      if (assignment.settings?.timeLimit) {
        setTimeLeft(assignment.settings.timeLimit * 60);
      }
    } catch (error) {
      console.error("Error starting quiz:", error);
      alert("Error starting quiz. Please try again.");
    }
  };

  const handleAnswerChange = (questionIndex, answer) => {
    setAnswers({
      ...answers,
      [questionIndex]: answer,
    });
  };

  const calculateScore = () => {
    let correctPoints = 0;
    let totalPoints = 0;

    questions.forEach((question, index) => {
      totalPoints += question.points || 1;
      const studentAnswer = answers[index];

      if (!studentAnswer) return;

      if (question.type === "multiple_choice") {
        const correctChoice = question.choices?.find((c) => c.is_correct);
        if (correctChoice && studentAnswer === correctChoice.text) {
          correctPoints += question.points || 1;
        }
      } else if (question.type === "true_false") {
        if (
          studentAnswer.toLowerCase() ===
          question.correct_answer.toLowerCase()
        ) {
          correctPoints += question.points || 1;
        }
      } else if (question.type === "identification") {
        if (
          studentAnswer.toLowerCase().trim() ===
          question.correct_answer.toLowerCase().trim()
        ) {
          correctPoints += question.points || 1;
        }
      }
    });

    // Calculate raw score percentage
    const rawScorePercentage = totalPoints > 0 ? Math.round((correctPoints / totalPoints) * 100) : 0;
    
    // Calculate base-50 score percentage (Transmutation)
    const base50ScorePercentage = Math.round(50 + (rawScorePercentage / 2));

    return {
      rawScorePercentage,
      base50ScorePercentage,
      correctPoints,
      totalPoints,
    };
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const unanswered = questions.filter((_, index) => !answers[index]);
    if (unanswered.length > 0) {
      if (
        !window.confirm(
          `You have ${unanswered.length} unanswered question(s). Submit anyway?`
        )
      ) {
        return;
      }
    }

    await submitQuiz();
  };

  const handleAutoSubmit = async () => {
    alert("Time's up! Your quiz will be submitted automatically.");
    await submitQuiz();
  };

  const submitQuiz = async () => {
    setSubmitting(true);

    try {
      const { rawScorePercentage, base50ScorePercentage, correctPoints, totalPoints } = calculateScore();
      const currentUser = auth.currentUser;

      const assignmentRef = doc(db, "assignedQuizzes", assignmentId);
      await updateDoc(assignmentRef, {
        status: "completed",
        completed: true,
        rawScorePercentage: rawScorePercentage,
        base50ScorePercentage: base50ScorePercentage,
        attempts: (assignment.attempts || 0) + 1,
        submittedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "quizSubmissions"), {
        assignmentId: assignmentId,
        quizId: quiz.id,
        studentId: currentUser.uid,
        studentName: userDoc?.name || "Unknown",
        answers: answers,
        rawScorePercentage: rawScorePercentage,
        base50ScorePercentage: base50ScorePercentage,
        correctPoints: correctPoints,
        totalPoints: totalPoints,
        submittedAt: serverTimestamp(),
        quizMode: "synchronous",
      });

      // Set results and show results screen
      setQuizResults({
        rawScorePercentage,
        base50ScorePercentage,
        correctPoints,
        totalPoints,
        totalQuestions: questions.length,
      });
      setShowResults(true);
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const getQuestionTypeLabel = (type) => {
    switch (type) {
      case "multiple_choice":
        return "Multiple Choice";
      case "true_false":
        return "True or False";
      case "identification":
        return "Identification";
      default:
        return type;
    }
  };

  const getQuestionTypeColor = (type) => {
    switch (type) {
      case "multiple_choice":
        return "bg-purple-100 text-purple-700 border-purple-300";
      case "true_false":
        return "bg-green-100 text-green-700 border-green-300";
      case "identification":
        return "bg-blue-100 text-blue-700 border-blue-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getGradeRemark = (base50ScorePercentage) => {
    if (base50ScorePercentage >= 90) return { text: "Excellent!", color: "text-green-600" };
    if (base50ScorePercentage >= 85) return { text: "Very Good!", color: "text-blue-600" };
    if (base50ScorePercentage >= 80) return { text: "Good!", color: "text-indigo-600" };
    if (base50ScorePercentage >= 75) return { text: "Passed", color: "text-yellow-600" };
    return { text: "Needs Improvement", color: "text-red-600" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-md">
          <Loader className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading live quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Unable to Load Quiz
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/student")}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (sessionStatus === "not_started" && !quizStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl w-full">
          <div className="text-center">
            <div className="mb-6">
              <Zap className="w-20 h-20 text-purple-600 mx-auto mb-4 animate-pulse" />
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Waiting Room
              </h2>
              <p className="text-lg text-gray-600">
                Your teacher hasn't started the quiz yet
              </p>
            </div>

            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-purple-900 mb-3">
                Quiz Details
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Quiz:</strong> {quiz?.title}</p>
                <p><strong>Class:</strong> {assignment?.className}</p>
                {assignment?.subject && (
                  <p><strong>Subject:</strong> {assignment.subject}</p>
                )}
                <p><strong>Questions:</strong> {questions.length}</p>
                {assignment?.settings?.timeLimit && (
                  <p><strong>Time Limit:</strong> {assignment.settings.timeLimit} minutes</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg mb-6">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-900 mb-1">
                  Please Wait for Instructions
                </p>
                <p className="text-sm text-yellow-800">
                  Your teacher will start the quiz session shortly. Stay on this page 
                  and wait for the quiz to become active. Do not refresh or close this page.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Loader className="w-5 h-5 animate-spin" />
              <span>Waiting for teacher to start the quiz...</span>
            </div>

            <button
              onClick={() => navigate("/studentDashboard")}
              className="mt-6 w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (sessionStatus === "ended") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Quiz Session Ended
          </h2>
          <p className="text-gray-600 mb-6">
            The teacher has ended this quiz session. You can no longer submit answers.
          </p>
          <button
            onClick={() => navigate("/student")}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (sessionStatus === "active" && !quizStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl w-full">
          <div className="text-center">
            <div className="mb-6">
              <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Quiz is Now Active!
              </h2>
              <p className="text-lg text-gray-600">
                Your teacher has started the quiz session
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl p-6 mb-6">
              <h3 className="text-2xl font-bold mb-4">{quiz?.title}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white bg-opacity-20 rounded-lg p-3">
                  <p className="font-semibold">Questions</p>
                  <p className="text-2xl font-bold">{questions.length}</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-3">
                  <p className="font-semibold">Total Points</p>
                  <p className="text-2xl font-bold">{quiz?.totalPoints || questions.length}</p>
                </div>
                {assignment?.settings?.timeLimit && (
                  <div className="bg-white bg-opacity-20 rounded-lg p-3 col-span-2">
                    <p className="font-semibold">Time Limit</p>
                    <p className="text-2xl font-bold">{assignment.settings.timeLimit} minutes</p>
                  </div>
                )}
              </div>
            </div>

            {assignment?.instructions && (
              <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded text-left">
                <p className="text-sm text-gray-700">
                  <strong>Instructions:</strong> {assignment.instructions}
                </p>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-green-50 border-2 border-green-300 rounded-lg mb-6">
              <AlertCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-left">
                <p className="font-semibold text-green-900 mb-1">
                  Ready to Begin
                </p>
                <p className="text-sm text-green-800">
                  Click the button below to start the quiz. Your time will begin immediately.
                </p>
              </div>
            </div>

            <button
              onClick={handleStartQuiz}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-lg font-bold text-xl hover:from-purple-700 hover:to-pink-700 transition transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Zap className="w-6 h-6" />
              Start Quiz Now
            </button>

            <button
              onClick={() => navigate("/studentDashboard")}
              className="mt-4 w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz || !assignment) {
    return null;
  }

  // Results Screen
  if (showResults && quizResults) {
    const remark = getGradeRemark(quizResults.base50ScorePercentage);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4 font-Outfit">
        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white text-center">
            <Award className="w-20 h-20 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Quiz Completed!</h1>
            <p className="text-purple-100">Great job on completing the live quiz</p>
          </div>

          {/* Results Content */}
          <div className="p-8">
            {/* Quiz Title */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{quiz.title}</h2>
              <p className="text-gray-600">{assignment.className}</p>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Raw Score */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center">
                <div className="text-sm text-blue-600 font-semibold mb-2">Raw Score</div>
                <div className="text-4xl font-bold text-blue-700 mb-1">
                  {quizResults.rawScorePercentage}%
                </div>
                <div className="text-sm text-gray-600">
                  {quizResults.correctPoints} / {quizResults.totalPoints} points
                </div>
              </div>

              {/* Base-50 Score */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-2xl p-6 text-center">
                <div className="text-sm text-purple-600 font-semibold mb-2">Base-50 Grade</div>
                <div className="text-4xl font-bold text-purple-700 mb-1">
                  {quizResults.base50ScorePercentage}%
                </div>
                <div className={`text-sm font-bold ${remark.color}`}>
                  {remark.text}
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Quiz Statistics
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-800">{quizResults.totalQuestions}</div>
                  <div className="text-sm text-gray-600">Total Questions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{quizResults.correctPoints}</div>
                  <div className="text-sm text-gray-600">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {quizResults.totalPoints - quizResults.correctPoints}
                  </div>
                  <div className="text-sm text-gray-600">Incorrect</div>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg p-4 mb-8">
              <p className="text-sm text-gray-700">
                <strong className="text-purple-700">Note:</strong> Your raw score of {quizResults.rawScorePercentage}% 
                has been transmuted to a Base-50 grade of {quizResults.base50ScorePercentage}% using the formula: 
                Grade = 50 + (Raw Score ÷ 2)
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={() => navigate("/studentDashboard")}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 font-Outfit">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6" />
              <span className="font-bold text-lg">LIVE QUIZ</span>
            </div>

            {timeLeft !== null && (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold ${
                  timeLeft <= 300
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-white text-purple-700"
                }`}
              >
                <Clock className="w-5 h-5" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-6">
        {/* Quiz Info */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {quiz.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span className="font-semibold text-purple-700">
              📚 {assignment.className}
            </span>
            {assignment.subject && <span>• {assignment.subject}</span>}
            <span>• {questions.length} Questions</span>
            <span>• Total Points: {quiz.totalPoints || questions.length}</span>
            <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold">
              <CheckCircle className="w-4 h-4" />
              Session Active
            </span>
          </div>

          {assignment.instructions && (
            <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-sm text-gray-700">
                <strong>Instructions:</strong> {assignment.instructions}
              </p>
            </div>
          )}
        </div>

        {/* Question Type Badge */}
        <div className="mb-6 flex items-center justify-between">
          <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 font-bold text-lg ${getQuestionTypeColor(currentQuestion.type)}`}>
            <span>Question Type: {getQuestionTypeLabel(currentQuestion.type)}</span>
          </div>
          <div className="text-sm text-gray-600 font-semibold">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Progress</span>
            <span className="text-sm font-semibold text-purple-600">
              {Object.keys(answers).length} / {questions.length} answered
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-300"
              style={{
                width: `${(Object.keys(answers).length / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Current Question */}
        <div className="bg-white rounded-2xl shadow-md p-8 border-2 border-purple-200 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <span className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
              {currentQuestionIndex + 1}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-600">
                  {currentQuestion.points || 1}{" "}
                  {currentQuestion.points === 1 ? "point" : "points"}
                </span>
              </div>
              <p className="text-xl font-semibold text-gray-800 leading-relaxed">
                {currentQuestion.question}
              </p>
            </div>
          </div>

          <div className="ml-16">
            {currentQuestion.type === "multiple_choice" && (
              <div className="space-y-3">
                {currentQuestion.choices?.map((choice, choiceIndex) => (
                  <label
                    key={choiceIndex}
                    className={`flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition ${
                      answers[currentQuestionIndex] === choice.text
                        ? "border-purple-500 bg-purple-50 shadow-md"
                        : "border-gray-200 hover:border-purple-300 bg-white hover:shadow-sm"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestionIndex}`}
                      value={choice.text}
                      checked={answers[currentQuestionIndex] === choice.text}
                      onChange={(e) =>
                        handleAnswerChange(currentQuestionIndex, e.target.value)
                      }
                      className="w-6 h-6 text-purple-600"
                    />
                    <span className="flex-1 text-gray-800 text-lg">
                      {String.fromCharCode(65 + choiceIndex)}. {choice.text}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === "true_false" && (
              <div className="space-y-3">
                {["True", "False"].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition ${
                      answers[currentQuestionIndex] === option
                        ? "border-purple-500 bg-purple-50 shadow-md"
                        : "border-gray-200 hover:border-purple-300 bg-white hover:shadow-sm"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestionIndex}`}
                      value={option}
                      checked={answers[currentQuestionIndex] === option}
                      onChange={(e) =>
                        handleAnswerChange(currentQuestionIndex, e.target.value)
                      }
                      className="w-6 h-6 text-purple-600"
                    />
                    <span className="flex-1 text-gray-800 font-semibold text-lg">
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === "identification" && (
              <div className="relative">
                <select
                  value={answers[currentQuestionIndex] || ""}
                  onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
                  className="w-full px-5 py-4 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white text-gray-800 cursor-pointer hover:border-purple-300 transition text-lg"
                >
                  <option value="" disabled>
                    Select your answer...
                  </option>
                  {identificationChoices[currentQuestionIndex]?.map((choice, choiceIdx) => (
                    <option key={choiceIdx} value={choice}>
                      {choice}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            <div className="flex items-center gap-2">
              {answers[currentQuestionIndex] ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
              <span className="text-sm text-gray-600">
                {answers[currentQuestionIndex] ? "Answered" : "Not answered"}
              </span>
            </div>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Quiz
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={goToNextQuestion}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Question Navigation Grid */}
        <div className="mt-6 bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Question Navigator</h3>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-full aspect-square rounded-lg font-bold text-sm transition ${
                  index === currentQuestionIndex
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white ring-2 ring-purple-300"
                    : answers[index]
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}