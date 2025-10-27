import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Award,
  TrendingUp,
} from "lucide-react";

export default function TakeAsyncQuiz({ user, userDoc }) {
  const { quizCode, assignmentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [identificationChoices, setIdentificationChoices] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState(null);

  const isAssignedQuiz = !!assignmentId;

  useEffect(() => {
    if (isAssignedQuiz) {
      fetchAssignedQuiz();
    } else {
      fetchQuizByCode();
    }
  }, [assignmentId, quizCode]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

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
  }, [timeLeft]);

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

  const fetchAssignedQuiz = async () => {
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

      if (assignmentData.quizMode !== "asynchronous") {
        setError("This quiz is not available for self-paced completion");
        return;
      }

      if (
        assignmentData.completed &&
        assignmentData.attempts >= (assignmentData.settings?.maxAttempts || 1)
      ) {
        setError("You have already completed this quiz");
        return;
      }

      if (assignmentData.dueDate) {
        const dueDate = new Date(assignmentData.dueDate);
        const now = new Date();
        if (now > dueDate) {
          setError("This quiz is past its due date");
          return;
        }
      }

      setAssignment({ id: assignmentSnap.id, ...assignmentData });

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

      if (assignmentData.settings?.timeLimit) {
        setTimeLeft(assignmentData.settings.timeLimit * 60);
      }

      if (assignmentData.status === "pending") {
        await updateDoc(assignmentRef, {
          status: "in_progress",
          startedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error fetching assigned quiz:", error);
      setError("Failed to load quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizByCode = async () => {
    setLoading(true);
    setError(null);

    try {
      setError("Code-based quiz loading not implemented in this update");
    } catch (error) {
      console.error("Error fetching quiz by code:", error);
      setError("Failed to load quiz");
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
        quizMode: "asynchronous",
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-md">
          <Loader className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Unable to Load Quiz
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/studentDashboard")}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Back to Dashboard
          </button>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 font-Outfit">
        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white text-center">
            <Award className="w-20 h-20 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Quiz Completed!</h1>
            <p className="text-indigo-100">Great job on completing the quiz</p>
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
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-2xl p-6 text-center">
                <div className="text-sm text-indigo-600 font-semibold mb-2">Base-50 Grade</div>
                <div className="text-4xl font-bold text-indigo-700 mb-1">
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
            <div className="bg-indigo-50 border-l-4 border-indigo-500 rounded-lg p-4 mb-8">
              <p className="text-sm text-gray-700">
                <strong className="text-indigo-700">Note:</strong> Your raw score of {quizResults.rawScorePercentage}% 
                has been transmuted to a Base-50 grade of {quizResults.base50ScorePercentage}% using the formula: 
                Grade = 50 + (Raw Score ÷ 2)
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={() => navigate("/studentDashboard")}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-lg"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-Outfit">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to leave? Your progress will be lost."
                  )
                ) {
                  navigate("/studentDashboard");
                }
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>

            {timeLeft !== null && (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold ${
                  timeLeft <= 300
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
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
            <span className="font-semibold text-indigo-700">
              📚 {assignment.className}
            </span>
            {assignment.subject && <span>• {assignment.subject}</span>}
            <span>• {questions.length} Questions</span>
            <span>• Total Points: {quiz.totalPoints || questions.length}</span>
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
            <span className="text-sm font-semibold text-indigo-600">
              {Object.keys(answers).length} / {questions.length} answered
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
              style={{
                width: `${(Object.keys(answers).length / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Current Question */}
        <div className="bg-white rounded-2xl shadow-md p-8 border-2 border-indigo-200 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <span className="flex-shrink-0 w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
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
                        ? "border-indigo-500 bg-indigo-50 shadow-md"
                        : "border-gray-200 hover:border-indigo-300 bg-white hover:shadow-sm"
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
                      className="w-6 h-6 text-indigo-600"
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
                        ? "border-indigo-500 bg-indigo-50 shadow-md"
                        : "border-gray-200 hover:border-indigo-300 bg-white hover:shadow-sm"
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
                      className="w-6 h-6 text-indigo-600"
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
                  className="w-full px-5 py-4 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white text-gray-800 cursor-pointer hover:border-indigo-300 transition text-lg"
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
                className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
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
                    ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
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