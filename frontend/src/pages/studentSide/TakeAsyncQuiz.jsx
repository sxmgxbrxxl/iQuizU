import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../firebase/firebaseConfig";
import {
  ArrowLeft,
  Clock,
  Send,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Award,
  TrendingUp,
  Brain,
  Sparkles,
  Target,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import QuizResults from "../studentSide/QuizResults";
import ConfirmDialog from "../../components/ConfirmDialog";

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
  const [selectedAnswerIndices, setSelectedAnswerIndices] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    showCancel: true,
    confirmLabel: "Confirm"
  });

  // Anti-cheating state
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fullscreenExits, setFullscreenExitCount] = useState(0);
  const [copyAttempts, setCopyAttempts] = useState(0);
  const [rightClickAttempts, setRightClickAttempts] = useState(0);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(null);

  const isAssignedQuiz = !!assignmentId;

  // Track tab visibility changes
  useEffect(() => {
    let tabSwitchOutTime = null;

    const handleVisibilityChange = () => {
      if (document.hidden && isQuizStarted) {
        // Student switched AWAY from tab
        tabSwitchOutTime = new Date();
        setTabSwitchCount(prev => prev + 1);
        const activity = {
          type: "tab_switch",
          timestamp: new Date().toISOString(),
          details: "⚠️ Student switched AWAY from quiz tab",
          switchedOutAt: tabSwitchOutTime.toISOString()
        };
        setSuspiciousActivities(prev => [...prev, activity]);
      } else if (!document.hidden && tabSwitchOutTime && isQuizStarted) {
        // Student switched BACK to tab
        const now = new Date();
        const durationAway = Math.floor((now - tabSwitchOutTime) / 1000); // in seconds

        const activity = {
          type: "tab_switch",
          timestamp: now.toISOString(),
          details: `✅ Student returned to quiz tab (was away for ${durationAway}s)`,
          duration: durationAway,
          returnedAt: now.toISOString()
        };
        setSuspiciousActivities(prev => [...prev, activity]);
        tabSwitchOutTime = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isQuizStarted]);

  // Track fullscreen exit attempts
  useEffect(() => {
    let fullscreenExitTime = null;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isQuizStarted) {
        fullscreenExitTime = new Date();
        setFullscreenExitCount(prev => prev + 1);
        const activity = {
          type: "fullscreen_exit",
          timestamp: new Date().toISOString(),
          details: "⚠️ Student EXITED fullscreen mode",
          exitedAt: fullscreenExitTime.toISOString()
        };
        setSuspiciousActivities(prev => [...prev, activity]);
      } else if (document.fullscreenElement && fullscreenExitTime && isQuizStarted) {
        const now = new Date();
        const durationOutOfFullscreen = Math.floor((now - fullscreenExitTime) / 1000);

        const activity = {
          type: "fullscreen_exit",
          timestamp: now.toISOString(),
          details: `✅ Student RETURNED to fullscreen (was out for ${durationOutOfFullscreen}s)`,
          duration: durationOutOfFullscreen,
          returnedAt: now.toISOString()
        };
        setSuspiciousActivities(prev => [...prev, activity]);
        fullscreenExitTime = null;
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isQuizStarted]);

  // Track copy attempts
  useEffect(() => {
    const handleCopy = (e) => {
      if (isQuizStarted) {
        e.preventDefault();
        setCopyAttempts(prev => prev + 1);
        const activity = {
          type: "copy_attempt",
          timestamp: new Date().toISOString(),
          details: "Student attempted to copy content"
        };
        setSuspiciousActivities(prev => [...prev, activity]);
      }
    };

    document.addEventListener("copy", handleCopy);
    return () => document.removeEventListener("copy", handleCopy);
  }, [isQuizStarted]);

  // Track right-click attempts
  useEffect(() => {
    const handleRightClick = (e) => {
      if (isQuizStarted) {
        e.preventDefault();
        setRightClickAttempts(prev => prev + 1);
        const activity = {
          type: "right_click",
          timestamp: new Date().toISOString(),
          details: "Student attempted to right-click (possible inspection)"
        };
        setSuspiciousActivities(prev => [...prev, activity]);
      }
    };

    document.addEventListener("contextmenu", handleRightClick);
    return () => document.removeEventListener("contextmenu", handleRightClick);
  }, [isQuizStarted]);

  // Disable developer tools
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isQuizStarted) return;

      // F12 - Developer Tools
      if (e.key === "F12") {
        e.preventDefault();
        const activity = {
          type: "dev_tools_attempt",
          timestamp: new Date().toISOString(),
          details: "Student attempted to open developer tools (F12)"
        };
        setSuspiciousActivities(prev => [...prev, activity]);
      }

      // Ctrl+Shift+I - Inspector
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        const activity = {
          type: "dev_tools_attempt",
          timestamp: new Date().toISOString(),
          details: "Student attempted to open developer tools (Ctrl+Shift+I)"
        };
        setSuspiciousActivities(prev => [...prev, activity]);
      }

      // Ctrl+Shift+C - Element Picker
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        const activity = {
          type: "dev_tools_attempt",
          timestamp: new Date().toISOString(),
          details: "Student attempted to open element picker (Ctrl+Shift+C)"
        };
        setSuspiciousActivities(prev => [...prev, activity]);
      }

      // Ctrl+Shift+J - Console
      if (e.ctrlKey && e.shiftKey && e.key === "J") {
        e.preventDefault();
        const activity = {
          type: "dev_tools_attempt",
          timestamp: new Date().toISOString(),
          details: "Student attempted to open console (Ctrl+Shift+J)"
        };
        setSuspiciousActivities(prev => [...prev, activity]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQuizStarted]);

  // Save progress to localStorage
  useEffect(() => {
    if (assignmentId && answers && Object.keys(answers).length > 0) {
      const progressData = {
        answers,
        currentQuestionIndex,
        timestamp: new Date().getTime(),
      };
      localStorage.setItem(`quiz_progress_${assignmentId}`, JSON.stringify(progressData));
    }
  }, [answers, currentQuestionIndex, assignmentId]);

  // Load saved progress
  useEffect(() => {
    if (assignmentId && questions.length > 0) {
      const savedProgress = localStorage.getItem(`quiz_progress_${assignmentId}`);
      if (savedProgress) {
        try {
          const { answers: savedAnswers, currentQuestionIndex: savedIndex } = JSON.parse(savedProgress);
          setAnswers(savedAnswers);
          setCurrentQuestionIndex(savedIndex);
        } catch (error) {
          console.error("Error loading saved progress:", error);
        }
      }
    }
  }, [assignmentId, questions.length]);

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

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const fetchIdentificationChoices = async (quizId) => {
    try {
      const quizRef = doc(db, "quizzes", quizId);
      const quizSnap = await getDoc(quizRef);

      if (quizSnap.exists()) {
        const quizData = quizSnap.data();
        const allQuestions = quizData.questions || [];

        const identificationAnswers = allQuestions
          .filter((q) => q.type === "identification")
          .map((q) => q.correct_answer)
          .filter((answer) => answer && answer.trim() !== "");

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

  const groupQuestionsByType = (questionsToGroup) => {
    const grouped = {
      multiple_choice: [],
      true_false: [],
      identification: [],
    };

    questionsToGroup.forEach((q) => {
      if (q.type === "multiple_choice") {
        grouped.multiple_choice.push(q);
      } else if (q.type === "true_false") {
        grouped.true_false.push(q);
      } else if (q.type === "identification") {
        grouped.identification.push(q);
      }
    });

    return grouped;
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

      const quizDeadline = assignmentData.dueDate || assignmentData.deadline;
      if (quizDeadline) {
        const deadline = new Date(quizDeadline);
        const now = new Date();
        if (now > deadline) {
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

      const grouped = groupQuestionsByType(quizQuestions);

      if (assignmentData.settings?.shuffleQuestions) {
        grouped.multiple_choice = shuffleArray(grouped.multiple_choice);
        grouped.true_false = shuffleArray(grouped.true_false);
        grouped.identification = shuffleArray(grouped.identification);
      }

      const orderedQuestions = [
        ...grouped.multiple_choice,
        ...grouped.true_false,
        ...grouped.identification,
      ];

      if (assignmentData.settings?.shuffleChoices) {
        const finalQuestions = orderedQuestions.map((q) => {
          if (q.type === "multiple_choice" && q.choices) {
            return {
              ...q,
              choices: shuffleArray([...q.choices]),
            };
          }
          return q;
        });
        setQuestions(finalQuestions);
      } else {
        setQuestions(orderedQuestions);
      }

      if (assignmentData.settings?.timeLimit) {
        setTimeLeft(assignmentData.settings.timeLimit * 60);
      }

      if (assignmentData.status === "pending") {
        await updateDoc(assignmentRef, {
          status: "in_progress",
          startedAt: serverTimestamp(),
        });
      }

      setIsQuizStarted(true);
      setQuizStartTime(new Date());
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

  const handleAnswerChange = (questionIndex, answer, choiceIndex = null) => {
    setAnswers({
      ...answers,
      [questionIndex]: answer,
    });

    if (choiceIndex !== null) {
      setSelectedAnswerIndices((prev) => ({
        ...prev,
        [questionIndex]: choiceIndex,
      }));
    }
  };

  const isChoiceSelected = (questionIndex, choiceText, choiceIndex) => {
    if (answers[questionIndex] !== choiceText) return false;

    // For multiple choice with potential duplicate options
    if (questions[questionIndex]?.type === "multiple_choice") {
      if (selectedAnswerIndices[questionIndex] !== undefined) {
        return selectedAnswerIndices[questionIndex] === choiceIndex;
      }
      // Fallback: only select the first occurrence of this text
      const choices = questions[questionIndex].choices;
      return choices?.findIndex((c) => c.text === choiceText) === choiceIndex;
    }

    return true;
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

    const rawScorePercentage = totalPoints > 0 ? Math.round((correctPoints / totalPoints) * 100) : 0;
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
      setConfirmDialog({
        isOpen: true,
        title: "Unanswered Questions",
        message: `Please answer all questions before submitting. You have ${unanswered.length} unanswered question(s).`,
        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
        showCancel: false,
        confirmLabel: "Okay"
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Submit Quiz?",
      message: "Are you sure you want to submit your quiz? You cannot change your answers after submission.",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        await submitQuiz();
      },
      showCancel: true,
      confirmLabel: "Submit Quiz"
    });
  };

  const handleAutoSubmit = async () => {
    setConfirmDialog({
      isOpen: true,
      title: "Time's Up!",
      message: "Your quiz time has ended. Your answers will be submitted automatically.",
      onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
      showCancel: false,
      confirmLabel: "Okay"
    });
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
        quizTitle: quiz.title || "Untitled Quiz",

        studentId: currentUser.uid,
        studentName: userDoc?.name || userDoc?.firstName + " " + (userDoc?.lastName || "") || currentUser.email || "Unknown",
        studentNo: userDoc?.studentNo || assignment.studentNo || "",
        studentDocId: assignment.studentDocId || null,

        teacherEmail: assignment.teacherEmail || null,
        teacherName: assignment.teacherName || null,

        classId: assignment.classId || null,
        className: assignment.className || "Unknown Class",
        subject: assignment.subject || quiz.subject || "",

        answers: answers,
        rawScorePercentage: rawScorePercentage,
        base50ScorePercentage: base50ScorePercentage,
        correctPoints: correctPoints,
        totalPoints: totalPoints,
        totalQuestions: questions.length,

        submittedAt: serverTimestamp(),
        quizMode: "asynchronous",

        // Anti-cheating data
        antiCheatData: {
          tabSwitchCount: tabSwitchCount,
          fullscreenExitCount: fullscreenExits,
          copyAttempts: copyAttempts,
          rightClickAttempts: rightClickAttempts,
          suspiciousActivities: suspiciousActivities,
          totalSuspiciousActivities: suspiciousActivities.length,
          quizDuration: quizStartTime ? Math.round((new Date() - quizStartTime) / 1000) : 0,
          flaggedForReview: suspiciousActivities.length > 0,
        }
      });

      // Clear saved progress after successful submission
      localStorage.removeItem(`quiz_progress_${assignmentId}`);

      setQuizResults({
        rawScorePercentage,
        base50ScorePercentage,
        correctPoints,
        totalPoints,
        totalQuestions: questions.length,
      });
      setShowResults(true);
      setShowResults(true);
    } catch (error) {
      console.error("Error submitting quiz:", error);
      setConfirmDialog({
        isOpen: true,
        title: "Submission Error",
        message: "Failed to submit quiz. Please try again.",
        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
        showCancel: false,
        confirmLabel: "Okay"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isCurrentQuestionAnswered = () => {
    return answers[currentQuestionIndex] !== undefined && answers[currentQuestionIndex] !== null && answers[currentQuestionIndex] !== "";
  };

  const goToNextQuestion = () => {
    if (!isCurrentQuestionAnswered()) {
      setConfirmDialog({
        isOpen: true,
        title: "Answer Required",
        message: "Please answer the current question before proceeding to the next one.",
        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
        showCancel: false,
        confirmLabel: "Okay"
      });
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-Outfit p-4">
        <div className="bg-components p-6 rounded-3xl shadow-md">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 text-sm sm:text-base">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md max-w-md w-full text-center">
          <XCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            Unable to Load Quiz
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/student")}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition text-sm sm:text-base"
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

  if (showResults && quizResults) {
    return (
      <QuizResults
        quiz={quiz}
        assignment={assignment}
        quizResults={quizResults}
        questions={questions}
        answers={answers}
        onNavigate={navigate}
      />
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const hasWarnings = suspiciousActivities.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 font-Outfit">
      <div className="bg-components shadow-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">

            <div className="flex items-center gap-2 sm:gap-4">
              {hasWarnings && (
                <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 bg-red-100 text-red-700 rounded-lg text-xs sm:text-sm font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden sm:inline">Suspicious Activity Detected</span>
                  <span className="sm:hidden">Alert</span>
                </div>
              )}

              {timeLeft !== null && (
                <div
                  className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-bold text-sm sm:text-base ${timeLeft <= 300
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                    }`}
                >
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  {formatTime(timeLeft)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {hasWarnings && (
        <div className="bg-red-50 border-b-2 border-red-300">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex gap-2 sm:gap-3">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-red-800">
                  Suspicious Activity Warning
                </p>
                <p className="text-xs sm:text-sm text-red-700 mt-1">
                  The following activities have been detected and recorded:
                  {tabSwitchCount > 0 && ` Tab switches: ${tabSwitchCount}`}
                  {fullscreenExits > 0 && `${tabSwitchCount > 0 ? ',' : ''} Fullscreen exits: ${fullscreenExits}`}
                  {copyAttempts > 0 && `${tabSwitchCount > 0 || fullscreenExits > 0 ? ',' : ''} Copy attempts: ${copyAttempts}`}
                  {rightClickAttempts > 0 && `${tabSwitchCount > 0 || fullscreenExits > 0 || copyAttempts > 0 ? ',' : ''} Right-click attempts: ${rightClickAttempts}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="bg-components rounded-2xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-title mb-2">
            {quiz.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
            <span className="font-semibold text-blue-700 flex flex-row gap-2 items-center justify-center">
              <BookOpen className="w-4 h-4" /> {assignment.className}
            </span>
            {assignment.subject && <span>• {assignment.subject}</span>}
            <span>• {questions.length} Questions</span>
            <span className="hidden sm:inline">• Total Points: {quiz.totalPoints || questions.length}</span>
          </div>

          {assignment.instructions && (
            <div className="mt-4 p-3 sm:p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-xs sm:text-sm text-gray-700">
                <strong>Instructions:</strong> {assignment.instructions}
              </p>
            </div>
          )}
        </div>

        <div className="mb-4 sm:mb-6 flex flex-row items-center justify-between">
          <div className={`inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full border-2 font-bold text-sm sm:text-lg ${getQuestionTypeColor(currentQuestion.type)}`}>
            <span className="hidden sm:inline">Question Type: {getQuestionTypeLabel(currentQuestion.type)}</span>
            <span className="sm:hidden">{getQuestionTypeLabel(currentQuestion.type)}</span>
          </div>
          <div className="text-xs sm:text-sm text-gray-600 font-semibold">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-700">Progress</span>
            <span className="text-xs sm:text-sm font-semibold text-blue-600">
              {Object.keys(answers).length} / {questions.length} answered
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
            <div
              className="bg-blue-600 h-2 sm:h-3 rounded-full transition-all duration-300"
              style={{
                width: `${(Object.keys(answers).length / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-4 sm:p-8 border-2 border-blue-200 mb-4 sm:mb-6">
          <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <span className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-base sm:text-lg">
              {currentQuestionIndex + 1}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm text-gray-600" style={{ userSelect: 'none' }}>
                  {currentQuestion.points || 1}{" "}
                  {currentQuestion.points === 1 ? "point" : "points"}
                </span>
              </div>
              <p className="text-base sm:text-xl font-semibold text-gray-800 leading-relaxed" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
                {currentQuestion.question}
              </p>
            </div>
          </div>

          <div className="sm:ml-16">
            {currentQuestion.type === "multiple_choice" && (
              <div className="space-y-2 sm:space-y-3">
                {currentQuestion.choices?.map((choice, choiceIndex) => (
                  <label
                    key={choiceIndex}
                    className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-5 rounded-xl border-2 cursor-pointer transition ${isChoiceSelected(currentQuestionIndex, choice.text, choiceIndex)
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 hover:border-blue-300 bg-white hover:shadow-sm"
                      }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestionIndex}`}
                      value={choice.text}
                      checked={isChoiceSelected(currentQuestionIndex, choice.text, choiceIndex)}
                      onChange={(e) =>
                        handleAnswerChange(currentQuestionIndex, e.target.value, choiceIndex)
                      }
                      className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600"
                    />
                    <span className="flex-1 text-gray-800 text-sm sm:text-lg" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
                      {choice.text}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === "true_false" && (
              <div className="space-y-2 sm:space-y-3">
                {["True", "False"].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-5 rounded-xl border-2 cursor-pointer transition ${answers[currentQuestionIndex] === option
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 hover:border-blue-300 bg-white hover:shadow-sm"
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
                      className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600"
                    />
                    <span className="flex-1 text-gray-800 font-semibold text-sm sm:text-lg" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
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
                  className="w-full px-4 sm:px-5 py-3 sm:py-4 pr-10 sm:pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white text-gray-800 cursor-pointer hover:border-blue-300 transition text-sm sm:text-lg"
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
                <ChevronDown className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end mt-4 sm:mt-6">
          {currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || Object.keys(answers).length !== questions.length}
              className="flex items-center gap-2 bg-green-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-bold hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  Submit Quiz
                </>
              )}
            </button>
          ) : (
            <button
              onClick={goToNextQuestion}
              disabled={!isCurrentQuestionAnswered()}
              className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition ${isCurrentQuestionAnswered()
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
            >
              Next
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      </main>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        confirmLabel={confirmDialog.confirmLabel}
        showCancel={confirmDialog.showCancel}
        color="blue"
      />
    </div >
  );
}