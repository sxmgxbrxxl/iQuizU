import { useState, useEffect, useRef } from "react";
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

// ─── localStorage helpers (base64 encode/decode to deter casual editing) ───
const encodeProgress = (data) => {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  } catch {
    return null;
  }
};

const decodeProgress = (str) => {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
  } catch {
    return null;
  }
};

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    showCancel: true,
    confirmLabel: "Confirm",
  });

  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(null);

  const tabSwitchOutTimeRef = useRef(null);
  const tabCountRef = useRef(0);
  const activitiesRef = useRef([]);
  const quizStartedRef = useRef(false);
  const quizStartTimeRef = useRef(null);

  useEffect(() => { quizStartedRef.current = isQuizStarted; }, [isQuizStarted]);
  useEffect(() => { quizStartTimeRef.current = quizStartTime; }, [quizStartTime]);

  const isAssignedQuiz = !!assignmentId;

  // ─── Anti-cheat: tab visibility ───
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!quizStartedRef.current) return;
      if (document.hidden) {
        tabSwitchOutTimeRef.current = new Date();
        tabCountRef.current += 1;
        setTabSwitchCount(tabCountRef.current);
        const activity = {
          type: "tab_switch",
          timestamp: new Date().toISOString(),
          details: "⚠️ Student switched AWAY from quiz tab",
          switchedOutAt: tabSwitchOutTimeRef.current.toISOString(),
        };
        activitiesRef.current = [...activitiesRef.current, activity];
        setSuspiciousActivities([...activitiesRef.current]);
        if (assignmentId) {
          try {
            const assignmentRef = doc(db, "assignedQuizzes", assignmentId);
            await updateDoc(assignmentRef, {
              antiCheatData: {
                tabSwitchCount: tabCountRef.current,
                suspiciousActivities: activitiesRef.current,
                totalSuspiciousActivities: activitiesRef.current.length,
                flaggedForReview: true,
                quizDuration: quizStartTimeRef.current
                  ? Math.round((new Date() - quizStartTimeRef.current) / 1000)
                  : 0,
              },
            });
          } catch (err) {
            console.error("Error writing real-time anti-cheat data:", err);
          }
        }
      } else if (tabSwitchOutTimeRef.current) {
        const now = new Date();
        const durationAway = Math.floor((now - tabSwitchOutTimeRef.current) / 1000);
        const activity = {
          type: "tab_switch",
          timestamp: now.toISOString(),
          details: `✅ Student returned to quiz tab (was away for ${durationAway}s)`,
          duration: durationAway,
          returnedAt: now.toISOString(),
        };
        activitiesRef.current = [...activitiesRef.current, activity];
        setSuspiciousActivities([...activitiesRef.current]);
        tabSwitchOutTimeRef.current = null;
        if (assignmentId) {
          try {
            const assignmentRef = doc(db, "assignedQuizzes", assignmentId);
            await updateDoc(assignmentRef, {
              antiCheatData: {
                tabSwitchCount: tabCountRef.current,
                suspiciousActivities: activitiesRef.current,
                totalSuspiciousActivities: activitiesRef.current.length,
                flaggedForReview: activitiesRef.current.length > 0,
                quizDuration: quizStartTimeRef.current
                  ? Math.round((new Date() - quizStartTimeRef.current) / 1000)
                  : 0,
              },
            });
          } catch (err) {
            console.error("Error writing real-time anti-cheat data:", err);
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [assignmentId]);

  // ─── Anti-cheat: devtools keyboard shortcuts ───
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isQuizStarted) return;
      if (e.key === "F12") {
        e.preventDefault();
        setSuspiciousActivities((prev) => [...prev, { type: "dev_tools_attempt", timestamp: new Date().toISOString(), details: "Student attempted to open developer tools (F12)" }]);
      }
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        setSuspiciousActivities((prev) => [...prev, { type: "dev_tools_attempt", timestamp: new Date().toISOString(), details: "Student attempted to open developer tools (Ctrl+Shift+I)" }]);
      }
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        setSuspiciousActivities((prev) => [...prev, { type: "dev_tools_attempt", timestamp: new Date().toISOString(), details: "Student attempted to open element picker (Ctrl+Shift+C)" }]);
      }
      if (e.ctrlKey && e.shiftKey && e.key === "J") {
        e.preventDefault();
        setSuspiciousActivities((prev) => [...prev, { type: "dev_tools_attempt", timestamp: new Date().toISOString(), details: "Student attempted to open console (Ctrl+Shift+J)" }]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQuizStarted]);

  // ─── Anti-cheat: block back navigation ───
  useEffect(() => {
    if (!isQuizStarted || showResults) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave the quiz? Your progress might be lost.";
      return "Are you sure you want to leave the quiz? Your progress might be lost.";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      setConfirmDialog({
        isOpen: true,
        title: "Action Not Allowed",
        message: "You cannot navigate back while taking a quiz. Please submit your answers first.",
        onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
        showCancel: false,
        confirmLabel: "Okay",
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isQuizStarted, showResults]);

  // ─── Save progress to localStorage (encoded, NO index saved) ───
  useEffect(() => {
    if (assignmentId && answers && Object.keys(answers).length > 0) {
      const progressData = {
        answers,
        // currentQuestionIndex is intentionally NOT saved —
        // it will be derived from answers on restore to prevent skip exploitation
        timestamp: new Date().getTime(),
      };
      const encoded = encodeProgress(progressData);
      if (encoded) {
        localStorage.setItem(`quiz_progress_${assignmentId}`, encoded);
      }
    }
  }, [answers, assignmentId]);

  // ─── Restore progress from localStorage with sequential validation ───
  useEffect(() => {
    if (assignmentId && questions.length > 0) {
      const raw = localStorage.getItem(`quiz_progress_${assignmentId}`);
      if (raw) {
        try {
          const decoded = decodeProgress(raw);
          if (!decoded || typeof decoded !== "object") {
            localStorage.removeItem(`quiz_progress_${assignmentId}`);
            return;
          }

          const { answers: savedAnswers } = decoded;
          if (!savedAnswers || typeof savedAnswers !== "object") {
            localStorage.removeItem(`quiz_progress_${assignmentId}`);
            return;
          }

          // Sequential validation: only accept answers with no gaps.
          // If index 3 is answered but index 2 is not, discard from index 3 onward.
          const validatedAnswers = {};
          let highestValidIndex = -1;

          for (let i = 0; i < questions.length; i++) {
            const ans = savedAnswers[i];
            if (ans !== undefined && ans !== null && ans !== "") {
              // Every previous question must also be answered
              if (i === 0 || validatedAnswers[i - 1] !== undefined) {
                validatedAnswers[i] = ans;
                highestValidIndex = i;
              } else {
                // Gap detected — stop accepting answers
                break;
              }
            } else {
              break;
            }
          }

          setAnswers(validatedAnswers);

          // Restore index to exactly one past the last valid answer
          // (cannot go back, cannot skip ahead)
          const restoredIndex = Math.min(highestValidIndex + 1, questions.length - 1);
          setCurrentQuestionIndex(Math.max(restoredIndex, 0));
        } catch (err) {
          console.error("Error loading saved progress:", err);
          localStorage.removeItem(`quiz_progress_${assignmentId}`);
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

  // ─── Countdown timer ───
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
            choicesMap[index] = shuffleArray([...uniqueAnswers]);
          }
        });
        setIdentificationChoices(choicesMap);
      }
    } catch (error) {
      console.error("Error fetching identification choices:", error);
    }
  };

  const groupQuestionsByType = (questionsToGroup) => {
    const grouped = { multiple_choice: [], true_false: [], identification: [] };
    questionsToGroup.forEach((q) => {
      if (q.type === "multiple_choice") grouped.multiple_choice.push(q);
      else if (q.type === "true_false") grouped.true_false.push(q);
      else if (q.type === "identification") grouped.identification.push(q);
    });
    return grouped;
  };

  const fetchAssignedQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) { setError("Please log in first"); navigate("/login"); return; }
      const assignmentRef = doc(db, "assignedQuizzes", assignmentId);
      const assignmentSnap = await getDoc(assignmentRef);
      if (!assignmentSnap.exists()) { setError("Assignment not found"); return; }
      const assignmentData = assignmentSnap.data();
      if (assignmentData.studentId !== currentUser.uid) { setError("This quiz is not assigned to you"); return; }
      if (assignmentData.quizMode !== "asynchronous") { setError("This quiz is not available for self-paced completion"); return; }
      if (assignmentData.completed && assignmentData.attempts >= (assignmentData.settings?.maxAttempts || 1)) { setError("You have already completed this quiz"); return; }
      const quizDeadline = assignmentData.dueDate || assignmentData.deadline;
      if (quizDeadline) {
        const deadline = new Date(quizDeadline);
        if (new Date() > deadline) { setError("This quiz is past its due date"); return; }
      }
      setAssignment({ id: assignmentSnap.id, ...assignmentData });
      if (assignmentData.antiCheatData) {
        const existingData = assignmentData.antiCheatData;
        tabCountRef.current = existingData.tabSwitchCount || 0;
        activitiesRef.current = existingData.suspiciousActivities || [];
        setTabSwitchCount(tabCountRef.current);
        setSuspiciousActivities([...activitiesRef.current]);
      }
      const quizRef = doc(db, "quizzes", assignmentData.quizId);
      const quizSnap = await getDoc(quizRef);
      if (!quizSnap.exists()) { setError("Quiz not found"); return; }
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
      const orderedQuestions = [...grouped.multiple_choice, ...grouped.true_false, ...grouped.identification];
      if (assignmentData.settings?.shuffleChoices) {
        setQuestions(orderedQuestions.map((q) => q.type === "multiple_choice" && q.choices ? { ...q, choices: shuffleArray([...q.choices]) } : q));
      } else {
        setQuestions(orderedQuestions);
      }
      if (assignmentData.settings?.timeLimit) setTimeLeft(assignmentData.settings.timeLimit * 60);
      if (assignmentData.status === "pending") {
        await updateDoc(assignmentRef, { status: "in_progress", startedAt: serverTimestamp() });
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

  // ─── Answer handler — only accepts answer for the CURRENT question ───
  const handleAnswerChange = (questionIndex, answer, choiceIndex = null) => {
    // Block answering any question that is not the current one.
    // This prevents manipulated calls (e.g., via React DevTools) from
    // setting answers on questions the student hasn't reached yet.
    if (questionIndex !== currentQuestionIndex) return;

    setAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
    if (choiceIndex !== null) {
      setSelectedAnswerIndices((prev) => ({ ...prev, [questionIndex]: choiceIndex }));
    }
  };

  const isChoiceSelected = (questionIndex, choiceText, choiceIndex) => {
    if (answers[questionIndex] !== choiceText) return false;
    if (questions[questionIndex]?.type === "multiple_choice") {
      if (selectedAnswerIndices[questionIndex] !== undefined) return selectedAnswerIndices[questionIndex] === choiceIndex;
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
        if (correctChoice && studentAnswer === correctChoice.text) correctPoints += question.points || 1;
      } else if (question.type === "true_false") {
        if (studentAnswer.toLowerCase() === question.correct_answer.toLowerCase()) correctPoints += question.points || 1;
      } else if (question.type === "identification") {
        if (studentAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()) correctPoints += question.points || 1;
      }
    });
    const rawScorePercentage = totalPoints > 0 ? Math.round((correctPoints / totalPoints) * 100) : 0;
    const base50ScorePercentage = Math.round(50 + rawScorePercentage / 2);
    return { rawScorePercentage, base50ScorePercentage, correctPoints, totalPoints };
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const unanswered = questions.filter((_, index) => !answers[index]);
    if (unanswered.length > 0) {
      setConfirmDialog({
        isOpen: true,
        title: "Unanswered Questions",
        message: `Please answer all questions before submitting. You have ${unanswered.length} unanswered question(s).`,
        onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
        showCancel: false,
        confirmLabel: "Okay",
      });
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: "Submit Quiz?",
      message: "Are you sure you want to submit your quiz? You cannot change your answers after submission.",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await submitQuiz();
      },
      showCancel: true,
      confirmLabel: "Submit Quiz",
    });
  };

  const handleAutoSubmit = async () => {
    setConfirmDialog({
      isOpen: true,
      title: "Time's Up!",
      message: "Your quiz time has ended. Your answers will be submitted automatically.",
      onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
      showCancel: false,
      confirmLabel: "Okay",
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
        rawScorePercentage,
        base50ScorePercentage,
        attempts: (assignment.attempts || 0) + 1,
        submittedAt: serverTimestamp(),
      });
      await addDoc(collection(db, "quizSubmissions"), {
        assignmentId,
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
        answers,
        rawScorePercentage,
        base50ScorePercentage,
        correctPoints,
        totalPoints,
        totalQuestions: questions.length,
        submittedAt: serverTimestamp(),
        quizMode: "asynchronous",
        antiCheatData: {
          tabSwitchCount,
          suspiciousActivities,
          totalSuspiciousActivities: suspiciousActivities.length,
          quizDuration: quizStartTime ? Math.round((new Date() - quizStartTime) / 1000) : 0,
          flaggedForReview: suspiciousActivities.length > 0,
        },
      });
      localStorage.removeItem(`quiz_progress_${assignmentId}`);
      setQuizResults({ rawScorePercentage, base50ScorePercentage, correctPoints, totalPoints, totalQuestions: questions.length });
      setShowResults(true);
    } catch (error) {
      console.error("Error submitting quiz:", error);
      setConfirmDialog({
        isOpen: true,
        title: "Submission Error",
        message: "Failed to submit quiz. Please try again.",
        onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
        showCancel: false,
        confirmLabel: "Okay",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} : ${secs.toString().padStart(2, "0")}`;
  };

  const isCurrentQuestionAnswered = () => {
    return answers[currentQuestionIndex] !== undefined && answers[currentQuestionIndex] !== null && answers[currentQuestionIndex] !== "";
  };

  // ─── Only advance forward; enforce sequential answering ───
  const goToNextQuestion = () => {
    if (!isCurrentQuestionAnswered()) {
      setConfirmDialog({
        isOpen: true,
        title: "Answer Required",
        message: "Please answer the current question before proceeding to the next one.",
        onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
        showCancel: false,
        confirmLabel: "Okay",
      });
      return;
    }
    // Only move forward — never allow going back or jumping ahead
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setIsDropdownOpen(false);
    }
  };

  const getQuestionTypeLabel = (type) => {
    switch (type) {
      case "multiple_choice": return "Multiple Choice";
      case "true_false": return "True or False";
      case "identification": return "Matching Type";
      default: return type;
    }
  };

  // ─── Hide sidebar / nav while quiz is active ───
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "quiz-fullscreen-style";
    style.textContent = `.quiz-active-hide { display: none !important; }`;
    document.head.appendChild(style);
    const fixedEls = document.querySelectorAll(
      'nav, aside, header, [class*="Sidebar"], [class*="sidebar"], [class*="TopBar"], [class*="topbar"]'
    );
    fixedEls.forEach((el) => el.classList.add("quiz-active-hide"));
    document.documentElement.style.setProperty("--sidebar-width", "0px");
    return () => {
      const injected = document.getElementById("quiz-fullscreen-style");
      if (injected) injected.remove();
      fixedEls.forEach((el) => el.classList.remove("quiz-active-hide"));
      document.documentElement.style.setProperty("--sidebar-width", "288px");
    };
  }, []);

  // ─── Render: loading ───
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center font-Poppins z-[9999]" style={{ background: "#eef0f3" }}>
        <div className="bg-white p-8 rounded-2xl shadow-md text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: "#2e7d32" }} />
          <p className="text-gray-500 text-sm">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // ─── Render: error ───
  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4 font-Poppins z-[9999]" style={{ background: "#eef0f3" }}>
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full text-center">
          <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Unable to Load Quiz</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button onClick={() => navigate("/student")} className="text-white px-6 py-3 rounded-lg font-semibold text-sm transition" style={{ background: "#2e7d32" }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!quiz || !assignment) return null;

  // ─── Render: results ───
  if (showResults && quizResults) {
    return <QuizResults quiz={quiz} assignment={assignment} quizResults={quizResults} questions={questions} answers={answers} onNavigate={navigate} />;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const hasWarnings = suspiciousActivities.length > 0;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;

  // ─── Render: quiz ───
  return (
    <div className="fixed inset-0 font-Poppins overflow-y-auto z-[9999]" style={{ background: "#eef0f3" }}>

      {/* Decorative background bubbles */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "320px", height: "320px", borderRadius: "50%", background: "rgba(46,125,50,0.08)" }} />
        <div style={{ position: "absolute", top: "200px", left: "-60px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(46,125,50,0.05)" }} />
        <div style={{ position: "absolute", bottom: "120px", right: "5%", width: "150px", height: "150px", borderRadius: "50%", background: "rgba(46,125,50,0.06)" }} />
        <div style={{ position: "absolute", bottom: "-60px", left: "20%", width: "260px", height: "260px", borderRadius: "50%", background: "rgba(46,125,50,0.06)" }} />
        <div style={{ position: "absolute", top: "45%", right: "-40px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(46,125,50,0.04)" }} />
      </div>

      {/* Mobile-only green header strip */}
      <div
        className="relative w-full overflow-hidden sm:hidden"
        style={{ background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #43a047 100%)", padding: "16px 20px" }}
      >
        <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ position: "absolute", bottom: "-20px", right: "12%", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div className="relative">
          <p style={{ fontSize: "10px", letterSpacing: "0.1em" }} className="text-green-200 font-semibold uppercase mb-1">
            {assignment.className}{assignment.subject ? ` · ${assignment.subject}` : ""}
          </p>
          <h1 style={{ fontSize: "18px" }} className="text-white font-extrabold leading-tight mb-0.5">{quiz.title}</h1>
          {assignment.teacherName && <p style={{ fontSize: "11px" }} className="text-green-300">{assignment.teacherName}</p>}
        </div>
      </div>

      {/* Main Content */}
      <div
        className="relative z-10 w-full mx-auto space-y-4"
        style={{
          maxWidth: "min(900px, 92vw)",
          paddingLeft: "clamp(12px, 3vw, 40px)",
          paddingRight: "clamp(12px, 3vw, 40px)",
          paddingTop: "16px",
          paddingBottom: "clamp(16px, 3vw, 40px)",
        }}
      >
        <div className="hidden sm:block h-6" />

        {/* ── Unified Info Card ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">

          {/* Desktop green title row */}
          <div
            className="hidden sm:block relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #43a047 100%)", padding: "20px 28px" }}
          >
            <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "160px", height: "160px", borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
            <div style={{ position: "absolute", bottom: "-20px", right: "12%", width: "100px", height: "100px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
            <div style={{ position: "absolute", top: "8px", left: "55%", width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
            <div className="relative">
              <p style={{ fontSize: "11px", letterSpacing: "0.1em" }} className="text-green-200 font-semibold uppercase mb-1">
                {assignment.className}{assignment.subject ? ` · ${assignment.subject}` : ""}
              </p>
              <h1 style={{ fontSize: "clamp(18px, 1.8vw, 24px)" }} className="text-white font-extrabold leading-tight mb-0.5">{quiz.title}</h1>
              {assignment.teacherName && <p style={{ fontSize: "12px" }} className="text-green-300">{assignment.teacherName}</p>}
            </div>
          </div>

          {/* Warning row */}
          <div className="flex items-start gap-4 px-6 py-4" style={{ borderLeft: "5px solid #2e7d32" }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#2e7d32" }} />
            <p className="text-gray-700 text-sm leading-relaxed">
              <span className="font-bold">WARNING:</span> Answer the question before you click &apos;Next Question&apos; button. Please be reminded that you are not allowed to see previous questions.
            </p>
          </div>

          {/* Suspicious activity row */}
          {hasWarnings && (
            <div className="flex items-start gap-4 px-6 py-4" style={{ borderLeft: "5px solid #2e7d32" }}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#2e7d32" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "#1b5e20" }}>Suspicious Activity Detected</p>
                {tabSwitchCount > 0 && (
                  <p className="text-sm mt-0.5" style={{ color: "#2e7d32" }}>Tab switches recorded: {tabSwitchCount}</p>
                )}
              </div>
            </div>
          )}

          {/* Answered count row */}
          <div className="flex items-center gap-4 px-6 py-4" style={{ borderLeft: "5px solid #2e7d32" }}>
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#2e7d32" }} />
            <p className="text-gray-600 text-sm font-semibold tracking-wide uppercase">
              Number of Answered Questions :{" "}
              <span className="text-gray-900 font-extrabold text-xl">{answeredCount} / {questions.length}</span>
            </p>
          </div>

          {/* Timer row */}
          {timeLeft !== null && (
            <div className="flex items-center gap-4 px-6 py-4" style={{ borderLeft: "5px solid #2e7d32" }}>
              <Clock className="w-5 h-5 flex-shrink-0" style={{ color: "#2e7d32" }} />
              <p className="text-gray-600 text-sm font-semibold tracking-wide uppercase">
                Remaining Time in Minutes :{" "}
                <span className={`font-extrabold text-xl ${timeLeft <= 300 ? "text-red-600" : "text-gray-900"}`}>
                  {formatTime(timeLeft)}
                </span>
              </p>
            </div>
          )}

          {/* Instructions row */}
          {assignment.instructions && (
            <div className="flex items-start gap-4 px-6 py-4" style={{ borderLeft: "5px solid #2e7d32" }}>
              <BookOpen className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#2e7d32" }} />
              <p className="text-gray-700 text-sm leading-relaxed">
                <span className="font-bold">Instructions:</span> {assignment.instructions}
              </p>
            </div>
          )}

        </div>
        {/* end unified info card */}

        {/* ── Question Card ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">

          {/* Progress Bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Progress</span>
              <span className="text-xs font-bold" style={{ color: "#2e7d32" }}>
                {currentQuestionIndex + 1} / {questions.length}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  background: "linear-gradient(90deg, #1b5e20, #43a047)",
                }}
              />
            </div>
          </div>

          {/* Question Type Label */}
          <p className="text-sm font-bold italic mb-3" style={{ color: "#2e7d32" }}>
            {getQuestionTypeLabel(currentQuestion.type)}{" "}
            <span className="not-italic">:</span>{" "}
            <span className="font-bold not-italic text-gray-800">
              ({currentQuestion.points || 1})
            </span>
          </p>

          {/* Question Text */}
          <p
            className="text-gray-900 font-poppins text-sm sm:text-base mb-6 leading-relaxed"
            style={{ userSelect: "none", textAlign: "justify" }}
          >
            {currentQuestionIndex + 1}. {currentQuestion.question}
          </p>

          {/* Multiple Choice */}
          {currentQuestion.type === "multiple_choice" && (
            <div className="space-y-3">
              {currentQuestion.choices?.map((choice, choiceIndex) => (
                <label
                  key={choiceIndex}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl border cursor-pointer transition-all"
                  style={{
                    borderColor: isChoiceSelected(currentQuestionIndex, choice.text, choiceIndex) ? "#2e7d32" : "#e5e7eb",
                    background: isChoiceSelected(currentQuestionIndex, choice.text, choiceIndex) ? "#f0fdf4" : "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestionIndex}`}
                    value={choice.text}
                    checked={isChoiceSelected(currentQuestionIndex, choice.text, choiceIndex)}
                    onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value, choiceIndex)}
                    className="w-5 h-5 accent-green-700 flex-shrink-0"
                  />
                  <span className="text-gray-800 text-sm sm:text-base" style={{ userSelect: "none" }}>
                    {choice.text}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* True / False */}
          {currentQuestion.type === "true_false" && (
            <div className="space-y-3">
              {["True", "False"].map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl border cursor-pointer transition-all"
                  style={{
                    borderColor: answers[currentQuestionIndex] === option ? "#2e7d32" : "#e5e7eb",
                    background: answers[currentQuestionIndex] === option ? "#f0fdf4" : "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestionIndex}`}
                    value={option}
                    checked={answers[currentQuestionIndex] === option}
                    onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
                    className="w-5 h-5 accent-green-700 flex-shrink-0"
                  />
                  <span className="text-gray-800 font-semibold text-sm sm:text-base" style={{ userSelect: "none" }}>
                    {option}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Identification / Matching Type */}
          {currentQuestion.type === "identification" && (
            <div className="relative">
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-4 py-3 pr-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-800 cursor-pointer transition text-sm sm:text-base flex items-center justify-between"
                style={{ borderColor: answers[currentQuestionIndex] ? "#2e7d32" : "#d1d5db" }}
              >
                <span className={answers[currentQuestionIndex] ? "text-gray-800 block truncate" : "text-gray-500 block truncate"} style={{ width: "calc(100% - 20px)" }}>
                  {answers[currentQuestionIndex] || "Select your answer..."}
                </span>
                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto left-0 divide-y divide-gray-100">
                  {identificationChoices[currentQuestionIndex]?.map((choice, choiceIdx) => (
                    <div
                      key={choiceIdx}
                      onClick={() => {
                        handleAnswerChange(currentQuestionIndex, choice);
                        setIsDropdownOpen(false);
                      }}
                      className="px-4 py-3 hover:bg-green-50 cursor-pointer text-sm sm:text-base transition-colors"
                      style={{
                        backgroundColor: answers[currentQuestionIndex] === choice ? "#f0fdf4" : "",
                        color: answers[currentQuestionIndex] === choice ? "#1b5e20" : "#374151"
                      }}
                    >
                      {choice}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pb-12">
          <p className="text-sm text-gray-400">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>

          {currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || answeredCount !== questions.length}
              className="flex items-center gap-2 text-white px-7 py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#2e7d32" }}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                <><Send className="w-4 h-4" /> Submit Quiz</>
              )}
            </button>
          ) : (
            <button
              onClick={goToNextQuestion}
              className="flex items-center gap-1 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition"
              style={{
                background: isCurrentQuestionAnswered() ? "#2e7d32" : "#9ca3af",
                cursor: isCurrentQuestionAnswered() ? "pointer" : "not-allowed",
              }}
            >
              Next Question
              <ChevronRight className="w-4 h-4" />
              <ChevronRight className="w-4 h-4 -ml-2.5" />
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        confirmLabel={confirmDialog.confirmLabel}
        showCancel={confirmDialog.showCancel}
        color="blue"
      />
    </div>
  );
}