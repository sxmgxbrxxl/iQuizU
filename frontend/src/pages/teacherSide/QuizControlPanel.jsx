import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase/firebaseConfig";
import {
  ArrowLeft,
  Play,
  StopCircle,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Zap,
  AlertCircle,
  Eye,
  Settings as SettingsIcon,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Award,
  Download,
  Shield,
  AlertTriangle,
  Flag,
  Clipboard,
  Timer,
  Wrench,
  Ban,
  UserX,
} from "lucide-react";
import * as XLSX from "xlsx";
import { QuizControlPanelSkeleton } from "../../components/SkeletonLoaders";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function QuizControlPanel() {
  const { quizId, classId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [quizSession, setQuizSession] = useState({
    status: "not_started",
    startedAt: null,
    endedAt: null,
    quizCode: null,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showAntiCheatModal, setShowAntiCheatModal] = useState(false);
  const [selectedAntiCheatData, setSelectedAntiCheatData] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    onConfirm: null,
    onCancel: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
    color: "blue",
    icon: null,
    showCancel: true,
  });

  const showConfirm = (title, message, onConfirm, color = "blue", confirmLabel = "Confirm", icon = null) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
      color,
      confirmLabel,
      cancelLabel: "Cancel",
      showCancel: true,
      icon,
    });
  };

  const showAlert = (title, message, color = "blue", icon = null) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
      onCancel: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
      color,
      confirmLabel: "OK",
      cancelLabel: "",
      showCancel: false,
      icon,
    });
  };

  useEffect(() => {
    let unsubscribers = [];

    const init = async () => {
      await fetchQuizData();
      unsubscribers = setupRealtimeListeners();
    };

    init();

    return () => {
      unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [quizId, classId]);

  const fetchQuizData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        showAlert("Error", "Please login first", "red");
        navigate("/login");
        return;
      }

      const quizRef = doc(db, "quizzes", quizId);
      const quizSnap = await getDoc(quizRef);

      if (!quizSnap.exists()) {
        showAlert("Error", "Quiz not found!", "red");
        navigate("/teacher/quizzes");
        return;
      }

      const quizData = { id: quizSnap.id, ...quizSnap.data() };

      if (quizData.teacherId !== currentUser.uid) {
        showAlert("Error", "❌ You don't have permission to control this quiz!", "red");
        navigate("/teacher/quizzes");
        return;
      }

      setQuiz(quizData);

      const classRef = doc(db, "classes", classId);
      const classSnap = await getDoc(classRef);

      if (classSnap.exists()) {
        setClassData({ id: classSnap.id, ...classSnap.data() });
      }

      const assignmentsRef = collection(db, "assignedQuizzes");
      const q = query(
        assignmentsRef,
        where("quizId", "==", quizId),
        where("classId", "==", classId)
      );
      const assignmentsSnap = await getDocs(q);

      if (assignmentsSnap.size > 0) {
        const firstDoc = assignmentsSnap.docs[0].data();
        setQuizSession({
          status: firstDoc.sessionStatus || "not_started",
          startedAt: firstDoc.sessionStartedAt || null,
          endedAt: firstDoc.sessionEndedAt || null,
          quizCode: firstDoc.quizCode || null,
        });
      }

      const usersRef = collection(db, "users");
      const allUsersSnap = await getDocs(usersRef);
      const userMap = new Map();

      allUsersSnap.forEach((userDoc) => {
        const userData = userDoc.data();
        userMap.set(userDoc.id, userData);
      });

      // Fetch submissions to get anti-cheat data
      const submissionsRef = collection(db, "quizSubmissions");
      const submissionsQuery = query(
        submissionsRef,
        where("quizId", "==", quizId),
        where("classId", "==", classId),
        where("quizMode", "==", "synchronous")
      );
      const submissionsSnap = await getDocs(submissionsQuery);

      const submissionsMap = new Map();
      submissionsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        submissionsMap.set(data.studentId, data);
      });

      const studentsList = [];
      assignmentsSnap.forEach((doc) => {
        const data = doc.data();
        const studentId = data.studentId;
        const studentData = userMap.get(studentId);
        const submissionData = submissionsMap.get(studentId);

        studentsList.push({
          id: studentId,
          name: studentData?.name || data.studentName || "Unknown",
          studentNo: studentData?.studentNo || data.studentNo || "N/A",
          status: data.status || "pending",
          score: data.score || null,
          rawScore: data.rawScorePercentage || null,
          base50Score: data.base50ScorePercentage || null,
          completed: data.completed || false,
          attempts: data.attempts || 0,
          startedAt: data.startedAt || null,
          submittedAt: data.submittedAt || null,
          antiCheatData: submissionData?.antiCheatData || data.antiCheatData || {
            tabSwitchCount: 0,
            suspiciousActivities: [],
            totalSuspiciousActivities: 0,
            quizDuration: 0,
            flaggedForReview: false,
          },
          currentQuestionIndex: data.currentQuestionIndex ?? null,
        });
      });

      studentsList.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(studentsList);
    } catch (error) {
      console.error("Error fetching quiz data:", error);
      showAlert("Error", "Error loading quiz data", "red");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListeners = () => {
    const unsubscribers = [];

    const assignmentsRef = collection(db, "assignedQuizzes");
    const q = query(
      assignmentsRef,
      where("quizId", "==", quizId),
      where("classId", "==", classId)
    );

    const unsubAssignments = onSnapshot(q, async (snapshot) => {
      try {
        if (snapshot.size > 0) {
          const firstDoc = snapshot.docs[0].data();
          setQuizSession({
            status: firstDoc.sessionStatus || "not_started",
            startedAt: firstDoc.sessionStartedAt || null,
            endedAt: firstDoc.sessionEndedAt || null,
            quizCode: firstDoc.quizCode || null,
          });
        }

        const usersRef = collection(db, "users");
        const allUsersSnap = await getDocs(usersRef);
        const userMap = new Map();

        allUsersSnap.forEach((userDoc) => {
          const userData = userDoc.data();
          userMap.set(userDoc.id, userData);
        });

        // Fetch submissions for anti-cheat data
        const submissionsRef = collection(db, "quizSubmissions");
        const submissionsQuery = query(
          submissionsRef,
          where("quizId", "==", quizId),
          where("classId", "==", classId),
          where("quizMode", "==", "synchronous")
        );
        const submissionsSnap = await getDocs(submissionsQuery);

        const submissionsMap = new Map();
        submissionsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          submissionsMap.set(data.studentId, data);
        });

        const updatedStudents = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const studentId = data.studentId;
          const studentData = userMap.get(studentId);
          const submissionData = submissionsMap.get(studentId);

          updatedStudents.push({
            id: studentId,
            name: studentData?.name || data.studentName || "Unknown",
            studentNo: studentData?.studentNo || data.studentNo || "N/A",
            status: data.status || "pending",
            score: data.score || null,
            rawScore: data.rawScorePercentage || null,
            base50Score: data.base50ScorePercentage || null,
            completed: data.completed || false,
            attempts: data.attempts || 0,
            startedAt: data.startedAt || null,
            submittedAt: data.submittedAt || null,
            antiCheatData: submissionData?.antiCheatData || data.antiCheatData || {
              tabSwitchCount: 0,
              suspiciousActivities: [],
              totalSuspiciousActivities: 0,
              quizDuration: 0,
              flaggedForReview: false,
            },
            currentQuestionIndex: data.currentQuestionIndex ?? null,
          });
        });

        updatedStudents.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(updatedStudents);
      } catch (error) {
        console.error("Error processing assignments:", error);
      }
    }, (error) => {
      console.error("Error listening to assignments:", error);
    });
    unsubscribers.push(unsubAssignments);

    return unsubscribers;
  };

  const handleStartQuiz = async () => {
    showConfirm(
      "Start Quiz?",
      "Are you sure you want to START this live quiz? Students will be able to access it.",
      async () => {
        setActionLoading(true);
        try {
          const assignmentsRef = collection(db, "assignedQuizzes");
          const q = query(
            assignmentsRef,
            where("quizId", "==", quizId),
            where("classId", "==", classId)
          );
          const assignmentsSnap = await getDocs(q);

          const updatePromises = assignmentsSnap.docs.map((docSnap) =>
            updateDoc(doc(db, "assignedQuizzes", docSnap.id), {
              sessionStatus: "active",
              sessionStartedAt: new Date(),
              sessionEndedAt: null,
            })
          );

          await Promise.all(updatePromises);

          showAlert("Success", "✅ Quiz started! Students can now access the quiz.", "green");
        } catch (error) {
          console.error("Error starting quiz:", error);
          showAlert("Error", "❌ Error starting quiz. Please try again.", "red");
        } finally {
          setActionLoading(false);
        }
      },
      "green",
      "Start Quiz"
    );
  };

  const handleEndQuiz = async () => {
    showConfirm(
      "End Quiz?",
      "Are you sure you want to END this quiz? This action cannot be undone. Students will no longer be able to submit.",
      async () => {
        setActionLoading(true);
        try {
          const assignmentsRef = collection(db, "assignedQuizzes");
          const q = query(
            assignmentsRef,
            where("quizId", "==", quizId),
            where("classId", "==", classId)
          );
          const assignmentsSnap = await getDocs(q);

          const updatePromises = assignmentsSnap.docs.map((docSnap) =>
            updateDoc(doc(db, "assignedQuizzes", docSnap.id), {
              sessionStatus: "ended",
              sessionEndedAt: new Date(),
            })
          );

          await Promise.all(updatePromises);

          showAlert("Quiz Ended", "🛑 Quiz ended. Students can no longer submit.", "orange");
        } catch (error) {
          console.error("Error ending quiz:", error);
          showAlert("Error", "❌ Error ending quiz. Please try again.", "red");
        } finally {
          setActionLoading(false);
        }
      },
      "red",
      "End Quiz"
    );
  };

  const handleRestartQuiz = async () => {
    showConfirm(
      "Restart Quiz Session?",
      "This will reset the session to 'Not Started', clear all student scores, and allow them to retake the quiz. Are you sure?",
      async () => {
        setActionLoading(true);
        try {
          const assignmentsRef = collection(db, "assignedQuizzes");
          const q = query(
            assignmentsRef,
            where("quizId", "==", quizId),
            where("classId", "==", classId)
          );
          const assignmentsSnap = await getDocs(q);

          const updatePromises = assignmentsSnap.docs.map((docSnap) =>
            updateDoc(doc(db, "assignedQuizzes", docSnap.id), {
              sessionStatus: "not_started",
              sessionStartedAt: null,
              sessionEndedAt: null,
              status: "not_started",
              completed: false,
              score: null,
              rawScorePercentage: null,
              base50ScorePercentage: null,
              attempts: 0,
              startedAt: null,
              submittedAt: null,
              answers: null,
            })
          );

          await Promise.all(updatePromises);

          showAlert("Success", "✅ Quiz session restarted successfully! Students can now retake the quiz.", "green");
        } catch (error) {
          console.error("Error restarting quiz:", error);
          showAlert("Error", "❌ Error restarting quiz. Please try again.", "red");
        } finally {
          setActionLoading(false);
        }
      },
      "yellow",
      "Restart Quiz"
    );
  };

  const handleCopyCode = () => {
    if (quizSession.quizCode) {
      navigator.clipboard.writeText(quizSession.quizCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleViewAntiCheat = (e, student) => {
    e.stopPropagation();
    if (!student.antiCheatData) {
      showAlert("Info", "No anti-cheat data available for this student", "blue");
      return;
    }
    setSelectedAntiCheatData({ ...student.antiCheatData, studentName: student.name });
    setShowAntiCheatModal(true);
  };

  // -----------------------------------------------------------------
  // FORCE STOP STUDENT QUIZ (for violations)
  // -----------------------------------------------------------------
  const handleForceStopStudent = (student) => {
    const tabCount = student.antiCheatData?.tabSwitchCount || 0;
    showConfirm(
      "Force Stop Student's Quiz?",
      `Are you sure you want to force-stop the quiz for "${student.name}"?\n\n⚠️ Violations Detected:\n• Tab Switches: ${tabCount}\n• Suspicious Activities: ${student.antiCheatData?.totalSuspiciousActivities || 0}\n\nThis will immediately end their quiz session and auto-submit their current answers. This action cannot be undone.`,
      async () => {
        setActionLoading(true);
        try {
          // Find the student's specific assignment document
          const assignmentsRef = collection(db, "assignedQuizzes");
          const q = query(
            assignmentsRef,
            where("quizId", "==", quizId),
            where("classId", "==", classId),
            where("studentId", "==", student.id)
          );
          const assignmentsSnap = await getDocs(q);

          const updatePromises = assignmentsSnap.docs.map((docSnap) =>
            updateDoc(doc(db, "assignedQuizzes", docSnap.id), {
              forceStoppedByTeacher: true,
              forceStoppedAt: new Date(),
              forceStopReason: `Violations detected - Tab switches: ${tabCount}`,
            })
          );

          await Promise.all(updatePromises);

          showAlert(
            "Student Stopped",
            `✅ Quiz force-stopped for ${student.name}. Their current answers will be auto-submitted.`,
            "orange"
          );
        } catch (error) {
          console.error("Error force-stopping student:", error);
          showAlert("Error", "❌ Error stopping student's quiz. Please try again.", "red");
        } finally {
          setActionLoading(false);
        }
      },
      "red",
      "Force Stop",
      <Ban className="w-5 h-5" />
    );
  };

  // -----------------------------------------------------------------
  // EXPORT TO EXCEL
  // -----------------------------------------------------------------
  const handleExportToExcel = () => {
    setExportLoading(true);

    try {
      const totalQuestions = quiz.questions?.length || 0;
      const passingScore = quiz.settings?.passingScore || 60;

      const formatTime = (seconds) => {
        if (!seconds) return "";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
      };

      const getStatusText = (student) => {
        if (student.completed) return "Completed";
        if (student.status === "in_progress") return "In Progress";
        if (student.status === "not_started" || student.status === "pending") return "Not Started";
        if (student.status === "expired") return "Expired";
        return student.status;
      };

      const passedCount = students.filter((s) => s.base50Score !== null && s.base50Score >= passingScore).length;
      const failedCount = students.filter((s) => s.base50Score !== null && s.base50Score < passingScore).length;
      const flaggedCount = students.filter((s) => s.antiCheatData?.flaggedForReview).length;

      // Summary data
      const summaryData = [
        ["Quiz Title", quiz.title],
        ["Class", classData.name],
        ["Total Questions", totalQuestions],
        ["Passing Score", `${passingScore}%`],
        ["Quiz Code", quizSession.quizCode || "N/A"],
        ["Session Status", quizSession.status === "active" ? "LIVE" : quizSession.status === "ended" ? "ENDED" : "NOT STARTED"],
        [""],
        ["STATISTICS", ""],
        ["Total Students", students.length],
        ["Not Started", students.filter((s) => s.status === "not_started" || s.status === "pending").length],
        ["In Progress", students.filter((s) => s.status === "in_progress").length],
        ["Completed", students.filter((s) => s.completed).length],
        ["Passed", passedCount],
        ["Failed", failedCount],
        ["Flagged for Review", flaggedCount],
        [""],
        ["Session Started", quizSession.startedAt?.seconds
          ? new Date(quizSession.startedAt.seconds * 1000).toLocaleString('en-PH', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
          : "N/A"],
        ["Session Ended", quizSession.endedAt?.seconds
          ? new Date(quizSession.endedAt.seconds * 1000).toLocaleString('en-PH', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
          : "N/A"],
        ["Exported On", new Date().toLocaleString('en-PH', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })],
      ];

      // Student results data
      const studentData = students.map((student) => {
        const timeDifference = (student.submittedAt?.seconds && student.startedAt?.seconds)
          ? (student.submittedAt.seconds - student.startedAt.seconds)
          : null;

        const nameParts = student.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        return [
          lastName,
          firstName,
          student.studentNo,
          getStatusText(student),
          student.score !== null && student.score !== undefined
            ? `${student.score}/${totalQuestions}`
            : "",
          student.rawScore !== null ? student.rawScore : "",
          student.base50Score !== null ? student.base50Score : "",
          student.base50Score !== null
            ? (student.base50Score >= passingScore ? "PASSED" : "FAILED")
            : "",
          timeDifference ? formatTime(timeDifference) : "",
          student.submittedAt?.seconds
            ? new Date(student.submittedAt.seconds * 1000).toLocaleString('en-PH', {
              month: 'numeric',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
            : "",
          student.antiCheatData?.flaggedForReview ? "Yes" : "No",
          student.antiCheatData?.tabSwitchCount || 0,
        ];
      });

      const wb = XLSX.utils.book_new();

      // Summary sheet
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      ws1['!cols'] = [
        { wch: 20 },
        { wch: 40 }
      ];
      XLSX.utils.book_append_sheet(wb, ws1, "Summary");

      // Student results sheet
      const ws2 = XLSX.utils.aoa_to_sheet([
        ["Last Name", "First Name", "Student Number", "Status", "Score", "Raw Score (%)", "Base-50 Grade (%)", "Result", "Time Taken", "Submitted At", "Flagged", "Tab Switches"],
        ...studentData
      ]);
      ws2['!cols'] = [
        { wch: 20 },  // Last Name
        { wch: 20 },  // First Name
        { wch: 15 },  // Student Number
        { wch: 15 },  // Status
        { wch: 10 },  // Score
        { wch: 15 },  // Raw Score
        { wch: 18 },  // Base-50 Grade
        { wch: 10 },  // Result
        { wch: 12 },  // Time Taken
        { wch: 22 },  // Submitted At
        { wch: 10 },  // Flagged
        { wch: 12 },  // Tab Switches
      ];
      XLSX.utils.book_append_sheet(wb, ws2, "Student Results");

      const fileName = `${quiz.title}_${classData.name}_Sync_Results_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      showAlert("Success", "✅ Excel file downloaded successfully!", "green");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      showAlert("Error", "❌ Error exporting to Excel. Please try again.", "red");
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return <QuizControlPanelSkeleton />;
  }

  if (!quiz || !classData) return null;

  const inLobbyCount = students.filter((s) => s.status === "in_lobby").length;
  const notStartedCount = students.filter((s) => s.status === "not_started" || s.status === "pending").length;
  const inProgressCount = students.filter((s) => s.status === "in_progress").length;
  const completedCount = students.filter((s) => s.completed).length;
  const flaggedCount = students.filter((s) => s.antiCheatData?.flaggedForReview).length;
  const totalStudents = students.length;
  const passingScore = quiz.settings?.passingScore || 60;
  const totalQuestions = quiz.questions?.length || 0;

  const getStatusDisplay = (status) => {
    switch (status) {
      case "in_progress":
        return { text: "In Progress", className: "bg-yellow-100 text-yellow-800", Icon: Loader };
      case "in_lobby":
        return { text: "In Lobby", className: "bg-purple-100 text-purple-800", Icon: Users };
      case "completed":
        return { text: "Completed", className: "bg-green-100 text-green-800", Icon: CheckCircle };
      case "not_started":
      case "pending":
        return { text: "Not Started", className: "bg-gray-100 text-gray-800", Icon: Clock };
      case "expired":
        return { text: "Expired", className: "bg-red-100 text-red-800", Icon: XCircle };
      case "force_stopped":
        return { text: "Force Stopped", className: "bg-orange-100 text-orange-800", Icon: Ban };
      default:
        return { text: status, className: "bg-gray-100 text-gray-800", Icon: Clock };
    }
  };

  return (
    <div className="w-full font-Poppins">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-2">
        <button
          onClick={() => navigate("/teacher/quizzes")}
          className="flex items-center gap-2 text-subtext hover:text-subsubtext transititon hover:duration-200 hover:scale-110 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Manage Quizzes
        </button>

        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-blue-600">Live Control Panel</span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 md:p-6 rounded-xl mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg md:text-xl font-bold">{quiz.title}</h2>
            <p className="text-white/90 text-sm mt-1">
              Class: {classData.name} • {totalQuestions} questions
            </p>
          </div>
          <div>
            <div
              className={`px-4 py-2 rounded-lg font-bold text-base md:text-lg ${quizSession.status === "active"
                ? "bg-white/90 text-green-800"
                : quizSession.status === "ended"
                  ? "bg-white/90 text-red-800"
                  : "bg-white/70 text-gray-700"
                }`}
            >
              {quizSession.status === "active"
                ? "🟢 LIVE"
                : quizSession.status === "ended"
                  ? "🛑 ENDED"
                  : "⚪ NOT STARTED"}
            </div>
          </div>
        </div>
      </div>

      {quizSession.quizCode && (
        <div className="mb-6 bg-gray-50 border-2 border-gray-200 rounded-xl p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-title mb-2">Live Quiz Code</p>
              <div className="flex items-center gap-3">
                <div className="bg-white border-2 border-blue-600 rounded-lg px-4 md:px-6 py-3">
                  <span className="text-xl md:text-2xl font-bold text-blue-600 tracking-wider">
                    {quizSession.quizCode}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                >
                  {codeCopied ? (
                    <>
                      <Check className="w-5 h-5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="md:text-right">
              <p className="text-sm text-subtext">Share this code with students</p>
              <p className="text-xs text-subsubtext mt-1">They'll need it to access the live quiz</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 space-y-3">
        {quizSession.status === "not_started" && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-8 shadow-sm">
             <h3 className="text-2xl font-black text-center text-purple-900 mb-6 tracking-wide drop-shadow-sm">
                PLAYERS IN LOBBY ({inLobbyCount})
             </h3>
             <div className="flex flex-wrap gap-4 justify-center min-h-[80px] items-center">
                {students.filter(s => s.status === "in_lobby").length === 0 ? (
                  <p className="text-purple-500/80 font-bold text-lg animate-pulse tracking-widest">WAITING FOR PLAYERS...</p>
                ) : (
                  students.filter(s => s.status === "in_lobby").map((student) => (
                    <div key={student.id} className="bg-white border-b-4 border-r-4 border-t-2 border-l-2 border-purple-400 text-purple-800 px-6 py-3 rounded-2xl font-bold shadow-md flex items-center gap-2 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:scale-105">
                      <Users className="w-5 h-5 text-purple-600" />
                      <span className="text-lg">{student.name}</span>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {quizSession.status === "not_started" && (
          <button
            onClick={handleStartQuiz}
            disabled={actionLoading}
            className="w-full bg-accent hover:bg-accentHover text-white p-4 rounded-xl font-extrabold text-base md:text-xl shadow-lg flex items-center justify-center gap-3 disabled:bg-gray-400 transition transform hover:scale-[1.01]"
          >
            {actionLoading ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                STARTING LIVE QUIZ...
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                START LIVE QUIZ
              </>
            )}
          </button>
        )}

        {quizSession.status === "active" && (
          <button
            onClick={handleEndQuiz}
            disabled={actionLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white p-4 rounded-xl font-bold text-base md:text-xl flex items-center justify-center gap-3 disabled:bg-gray-400 transition transform hover:scale-[1.01]"
          >
            {actionLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Ending...
              </>
            ) : (
              <>
                <StopCircle className="w-5 h-5" />
                END QUIZ
              </>
            )}
          </button>
        )}

        {quizSession.status === "ended" && (
          <div className="space-y-3">
            <div className="w-full bg-gray-100 border-2 border-gray-300 text-gray-700 p-4 rounded-xl font-bold text-sm md:text-lg flex items-center justify-center gap-3">
              <AlertCircle className="w-6 h-6" />
              Quiz Session Has Ended
            </div>

            <button
              onClick={handleRestartQuiz}
              disabled={actionLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold text-base md:text-xl flex items-center justify-center gap-3 disabled:bg-gray-400 transition transform hover:scale-[1.01]"
            >
              {actionLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Restarting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  RESTART QUIZ SESSION
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
        <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-title">{totalStudents}</div>
              <div className="text-xs md:text-sm text-subtext font-semibold">Total</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <Users className="w-6 h-6 md:w-8 md:h-8 text-purple-600 animate-pulse" />
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-title">{inLobbyCount}</div>
              <div className="text-xs md:text-sm text-subtext font-semibold">In Lobby</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <Clock className="w-6 h-6 md:w-8 md:h-8 text-gray-500" />
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-title">{notStartedCount}</div>
              <div className="text-xs md:text-sm text-subtext font-semibold">Not Started</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <Loader className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-title">{inProgressCount}</div>
              <div className="text-xs md:text-sm text-subtext font-semibold">In Progress</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-accent" />
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-title">{completedCount}</div>
              <div className="text-xs md:text-sm text-subtext font-semibold">Completed</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-xl col-span-2 md:col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between">
            <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-red-500" />
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-title">{flaggedCount}</div>
              <div className="text-xs md:text-sm text-subtext font-semibold">Flagged</div>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
          <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
            <Eye className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            Live Student Monitoring
          </h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
            <p className="text-xs md:text-sm text-subsubtext flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Passing Score: {passingScore}%
            </p>
            <button
              onClick={handleExportToExcel}
              disabled={exportLoading || students.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed text-sm w-full sm:w-auto justify-center"
            >
              {exportLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export to Excel
                </>
              )}
            </button>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No students assigned to this quiz</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-sm">Student Name</th>
                    <th className="px-6 py-3 text-left font-bold text-sm">Student #</th>
                    <th className="px-6 py-3 text-center font-bold text-sm">Live Status</th>
                    <th className="px-6 py-3 text-center font-bold text-sm">Score</th>
                    <th className="px-6 py-3 text-center font-bold text-sm">Raw Score</th>
                    <th className="px-6 py-3 text-center font-bold text-sm">Base-50 Grade</th>
                    <th className="px-6 py-3 text-center font-bold text-sm">Time Taken</th>
                    <th className="px-6 py-3 text-center font-bold text-sm">Anti-Cheat</th>
                    {quizSession.status === "active" && <th className="px-6 py-3 text-center font-bold text-sm">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    const { text, className, Icon } = getStatusDisplay(student.completed ? "completed" : student.status);

                    const timeDifference = (student.submittedAt?.seconds && student.startedAt?.seconds)
                      ? (student.submittedAt.seconds - student.startedAt.seconds)
                      : null;

                    const formatTime = (seconds) => {
                      const minutes = Math.floor(seconds / 60);
                      const remainingSeconds = seconds % 60;
                      return `${minutes}m ${remainingSeconds}s`;
                    };

                    return (
                      <tr
                        key={student.id}
                        className={`border-b transition ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          } ${student.antiCheatData?.flaggedForReview ? "bg-red-50" : "hover:bg-gray-100"}`}
                      >
                        <td className="px-6 py-3 font-semibold text-title">{student.name}</td>
                        <td className="px-6 py-3 text-subtext">{student.studentNo}</td>
                        <td className="px-6 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${className}`}>
                            <Icon className="w-4 h-4" />
                            {text}
                          </span>
                          {student.status === "in_progress" && !student.completed && totalQuestions > 0 && student.currentQuestionIndex !== null && (
                            <div className="text-xs text-blue-600 font-semibold mt-1">
                              📝 Q {(student.currentQuestionIndex || 0) + 1}/{totalQuestions}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {student.score !== null && student.score !== undefined ? (
                            <div className="flex items-center justify-center gap-1">
                              <Award className="w-4 h-4 text-blue-600" />
                              <span className="font-bold text-lg text-title">
                                {student.score}/{totalQuestions}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {student.rawScore !== null ? (
                            <span className="font-bold text-lg text-title">
                              {student.rawScore}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {student.base50Score !== null ? (
                            <span className={`font-bold text-lg ${student.base50Score >= passingScore
                              ? "text-accent"
                              : "text-red-500"
                              }`}>
                              {student.base50Score}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-center text-sm text-subtext">
                          {timeDifference !== null ? formatTime(timeDifference) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {student.completed || (student.status === "in_progress" && student.antiCheatData) ? (
                            <button
                              onClick={(e) => handleViewAntiCheat(e, student)}
                              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-semibold transition mx-auto ${
                                student.antiCheatData?.flaggedForReview || (student.antiCheatData?.tabSwitchCount > 0)
                                  ? "bg-red-500 hover:bg-red-600 animate-pulse"
                                  : "bg-accent hover:bg-accentHover"
                              }`}
                            >
                              <Shield className="w-4 h-4" />
                              {student.antiCheatData?.tabSwitchCount > 0
                                ? `🔄 ${student.antiCheatData.tabSwitchCount} Tab${student.antiCheatData.tabSwitchCount > 1 ? 's' : ''}`
                                : student.antiCheatData?.flaggedForReview ? "Flagged" : "Clean"}
                            </button>
                          ) : student.status === "in_progress" ? (
                            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-100 text-green-700 text-xs font-semibold">
                              <Shield className="w-4 h-4" />
                              Clean
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">N/A</span>
                          )}
                        </td>
                        {quizSession.status === "active" && (
                          <td className="px-6 py-3 text-center">
                            {student.status === "in_progress" && !student.completed ? (
                              <button
                                onClick={() => handleForceStopStudent(student)}
                                disabled={actionLoading}
                                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-bold transition mx-auto disabled:bg-gray-400 ${
                                  student.antiCheatData?.flaggedForReview || (student.antiCheatData?.tabSwitchCount > 0)
                                    ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-md"
                                    : "bg-orange-500 hover:bg-orange-600"
                                }`}
                              >
                                <Ban className="w-4 h-4" />
                                Force Stop
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-3 max-h-[500px] overflow-y-auto">
              {students.map((student) => {
                const { text, className, Icon } = getStatusDisplay(student.completed ? "completed" : student.status);

                const timeDifference = (student.submittedAt?.seconds && student.startedAt?.seconds)
                  ? (student.submittedAt.seconds - student.startedAt.seconds)
                  : null;

                const formatTime = (seconds) => {
                  const minutes = Math.floor(seconds / 60);
                  const remainingSeconds = seconds % 60;
                  return `${minutes}m ${remainingSeconds}s`;
                };

                return (
                  <div
                    key={student.id}
                    className={`border rounded-xl p-4 ${student.antiCheatData?.flaggedForReview ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-title text-sm">{student.name}</p>
                        <p className="text-xs text-subsubtext">{student.studentNo}</p>
                      </div>
                      <span className={`px-2 py-1 ${className} rounded-full text-xs font-bold inline-flex items-center gap-1`}>
                        <Icon className="w-3 h-3" />
                        {text}
                      </span>
                    </div>

                    {/* Show question progress for in-progress students */}
                    {student.status === "in_progress" && !student.completed && totalQuestions > 0 && student.currentQuestionIndex !== null && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-blue-600 font-semibold">📝 Question {(student.currentQuestionIndex || 0) + 1} of {totalQuestions}</span>
                          <span className="text-xs text-subsubtext">{Math.round((((student.currentQuestionIndex || 0) + 1) / totalQuestions) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(((student.currentQuestionIndex || 0) + 1) / totalQuestions) * 100}%` }}></div>
                        </div>
                      </div>
                    )}

                    {student.completed && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center">
                          <p className="text-xs text-subsubtext">Score</p>
                          <p className="font-bold text-title text-sm">{student.score}/{totalQuestions}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-subsubtext">Raw</p>
                          <p className="font-bold text-title text-sm">{student.rawScore}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-subsubtext">Base-50</p>
                          <p className={`font-bold text-sm ${student.base50Score >= passingScore ? "text-accent" : "text-red-500"
                            }`}>
                            {student.base50Score}%
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-subsubtext">
                        {timeDifference !== null ? `⏱ ${formatTime(timeDifference)}` : ""}
                      </span>
                      {(student.completed || student.status === "in_progress") && (
                        <button
                          onClick={(e) => handleViewAntiCheat(e, student)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-white text-xs font-semibold ${
                            student.antiCheatData?.flaggedForReview || (student.antiCheatData?.tabSwitchCount > 0)
                              ? "bg-red-500 animate-pulse"
                              : "bg-accent"
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {student.antiCheatData?.tabSwitchCount > 0 ? (
                            <>
                              <RefreshCw className="w-4 h-4 inline mr-1" />
                              {student.antiCheatData.tabSwitchCount}
                            </>
                          ) : student.antiCheatData?.flaggedForReview ? (
                            "Flagged"
                          ) : (
                            "Clean"
                          )}
                        </button>
                      )}
                    </div>

                    {/* Mobile Force Stop Button */}
                    {quizSession.status === "active" && student.status === "in_progress" && !student.completed && (
                      <button
                        onClick={() => handleForceStopStudent(student)}
                        disabled={actionLoading}
                        className={`w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-bold transition disabled:bg-gray-400 ${
                          student.antiCheatData?.flaggedForReview || (student.antiCheatData?.tabSwitchCount > 0)
                            ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-md"
                            : "bg-orange-500 hover:bg-orange-600"
                        }`}
                      >
                        <Ban className="w-4 h-4" />
                        Force Stop Quiz
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {
        quizSession.status !== "not_started" && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {quizSession.startedAt && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-subtext mb-1">Session Started</p>
                <p className="text-base md:text-lg font-bold text-title">
                  {new Date(quizSession.startedAt.seconds * 1000).toLocaleString('en-PH', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
            )}

            {quizSession.endedAt && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-subtext mb-1">Session Ended</p>
                <p className="text-base md:text-lg font-bold text-title">
                  {new Date(quizSession.endedAt.seconds * 1000).toLocaleString('en-PH', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
            )}
          </div>
        )
      }

      {/* Anti-Cheat Modal */}
      {
        showAntiCheatModal && selectedAntiCheatData && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-3 md:p-4 animate-ovelayFade">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto animate-popIn">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Shield className={`w-5 h-5 md:w-6 md:h-6 ${selectedAntiCheatData?.flaggedForReview ? "text-red-500" : "text-accent"}`} />
                  <h3 className="text-base md:text-xl font-bold text-title">Anti-Cheating Report</h3>
                </div>
                <button
                  onClick={() => setShowAntiCheatModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-lg font-semibold text-gray-800">{selectedAntiCheatData.studentName}</p>
              </div>

              <div className={`p-3 md:p-4 rounded-lg mb-4 md:mb-6 ${selectedAntiCheatData?.flaggedForReview ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                <p className="font-bold text-title mb-1 text-sm">Status</p>
                <p className={`text-sm ${selectedAntiCheatData?.flaggedForReview ? "text-red-600 font-semibold" : "text-accent font-semibold"}`}>
                  {selectedAntiCheatData?.flaggedForReview ? (
                    <>
                    <Flag className="w-4 h-4 inline mr-1" />
                    Flagged for Review - Suspicious Activity Detected </>
                    ) : (
                    <>
                    <Check className="w-4 h-4 inline mr-1" />
                    Clean - No Suspicious Activity
                    </>
                    )}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 mb-4 md:mb-6">
                <div className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200">
                  <p className="text-xs md:text-sm font-semibold text-subtext mb-1"><RefreshCw className="w-4 h-4 inline mr-1"/> Tab Switches</p>
                  <p className="text-lg md:text-xl font-bold text-title">{selectedAntiCheatData?.tabSwitchCount || 0}</p>
                  <p className="text-xs text-subsubtext mt-1">Times left the quiz</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200 mb-4 md:mb-6">
                <p className="text-xs md:text-sm font-semibold text-subtext mb-3"> <Clipboard className="w-4 h-4 inline mr-1"/>Detailed Activity Timeline</p>
                {selectedAntiCheatData?.suspiciousActivities && selectedAntiCheatData.suspiciousActivities.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {[...selectedAntiCheatData.suspiciousActivities].reverse().map((activity, idx) => {
                      const activityTime = new Date(activity.timestamp);
                      const activityHour = activityTime.getHours().toString().padStart(2, '0');
                      const activityMin = activityTime.getMinutes().toString().padStart(2, '0');
                      const activitySec = activityTime.getSeconds().toString().padStart(2, '0');

                      let icon = <AlertTriangle className="w-4 h-4 inline"/>;
                      let bgColor = 'bg-yellow-50 border-yellow-200';
                      let textColor = 'text-yellow-700';

                      if (activity.type === 'tab_switch') {
                        icon = <RefreshCw className="w-4 h-4 inline"/>;
                        bgColor = 'bg-blue-50 border-blue-200';
                        textColor = 'text-blue-700';
                      } else if (activity.type === 'dev_tools_attempt') {
                        icon = <Wrench className="w-4 h-4 inline"/>;
                        bgColor = 'bg-red-50 border-red-200';
                        textColor = 'text-red-700';
                      }

                      return (
                        <div key={idx} className={`border rounded-lg p-3 ${bgColor}`}>
                          <div className="flex items-start gap-3">
                            <span className="text-xl mt-0.5">{icon}</span>
                            <div className="flex-1">
                              <p className={`font-bold ${textColor}`}>{activity.details}</p>
                              <div className="mt-2 text-xs text-gray-600 space-y-1">
                                <p>
                                  <span className="font-semibold">Time: </span>
                                  {activityHour}:{activityMin}:{activitySec}
                                </p>
                                {activity.duration && (
                                  <p>
                                    <span className="font-semibold">Duration Away: </span>
                                    {activity.duration}s ({Math.floor(activity.duration / 60)}m {activity.duration % 60}s)
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${textColor}`}>
                              #{idx + 1}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No suspicious activities recorded</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200 mb-4 md:mb-6">
                <p className="text-xs md:text-sm font-semibold text-subtext mb-2"> <Timer className="w-4 h-4 inline mr-1"/> Quiz Duration</p>
                <p className="text-sm text-subtext">
                  {Math.floor((selectedAntiCheatData?.quizDuration || 0) / 60)} minutes {(selectedAntiCheatData?.quizDuration || 0) % 60} seconds
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAntiCheatModal(false)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        color={confirmDialog.color}
        icon={confirmDialog.icon}
        showCancel={confirmDialog.showCancel}
      />
    </div >
  );
}