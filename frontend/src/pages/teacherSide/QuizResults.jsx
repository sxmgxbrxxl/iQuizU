import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  RefreshCw,
  Calendar,
  X,
  AlertTriangle,
  Eye,
  Shield,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import * as XLSX from "xlsx";
import Toast from "../../components/Toast";
import { QuizResultsSkeleton } from "../../components/SkeletonLoaders";

export default function QuizResults() {
  const navigate = useNavigate();
  const { quizId, classId } = useParams();

  const [quiz, setQuiz] = useState(null);
  const [students, setStudents] = useState([]);
  const [assignedStudentIds, setAssignedStudentIds] = useState(new Set());
  const [assignmentDeadlines, setAssignmentDeadlines] = useState({});
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAnswers, setStudentAnswers] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [showReschedModal, setShowReschedModal] = useState(false);
  const [showAntiCheatModal, setShowAntiCheatModal] = useState(false);
  const [selectedAntiCheatData, setSelectedAntiCheatData] = useState(null);
  const [selectedStudentForAction, setSelectedStudentForAction] = useState(null);
  const [retakeDeadline, setRetakeDeadline] = useState("");
  const [reschedDeadline, setReschedDeadline] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Custom Toast state
  const [toast, setToast] = useState({ show: false, type: "", title: "", message: "" });
  const showToast = useCallback((type, title, message) => {
    setToast({ show: true, type, title, message });
  }, []);

  useEffect(() => {
    fetchData();
  }, [quizId, classId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const quizDoc = await getDoc(doc(db, "quizzes", quizId));
      if (!quizDoc.exists()) {
        setError("Quiz not found");
        return;
      }

      const quizData = { id: quizDoc.id, ...quizDoc.data() };
      setQuiz(quizData);

      const studentsQuery = query(
        collection(db, "users"),
        where("classIds", "array-contains", classId),
        where("role", "==", "student")
      );
      const studentSnapshot = await getDocs(studentsQuery);

      const allStudents = [];
      studentSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        allStudents.push({
          id: data.authUID || docSnap.id,
          docId: docSnap.id,
          firstName: data.name?.split(" ")[0] || "",
          lastName: data.name?.split(" ").slice(1).join(" ") || "",
          email: data.emailAddress || "",
          name: data.name || "Unknown",
        });
      });

      setStudents(allStudents);

      // Store assigned student IDs and their deadlines
      const assignedIds = new Set();
      const deadlinesMap = {};

      const assignmentsQuery = query(
        collection(db, "assignedQuizzes"),
        where("quizId", "==", quizId),
        where("classId", "==", classId),
        where("quizMode", "==", "asynchronous")
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);

      const assignmentIds = [];
      assignmentsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        assignmentIds.push(docSnap.id);
        if (data.studentId) {
          assignedIds.add(data.studentId);
          // Store the deadline for this student (dueDate takes priority, then deadline)
          const rawDeadline = data.dueDate || data.deadline;
          if (rawDeadline) {
            let deadlineDate;
            if (rawDeadline?.toDate) {
              deadlineDate = rawDeadline.toDate();
            } else if (rawDeadline?.seconds) {
              deadlineDate = new Date(rawDeadline.seconds * 1000);
            } else {
              deadlineDate = new Date(rawDeadline);
            }
            deadlinesMap[data.studentId] = deadlineDate;
          }
        }
      });

      setAssignedStudentIds(assignedIds);
      setAssignmentDeadlines(deadlinesMap);

      if (assignmentIds.length === 0) {
        setResults([]);
        return;
      }

      const submissionsData = [];
      const batchSize = 10;
      for (let i = 0; i < assignmentIds.length; i += batchSize) {
        const batch = assignmentIds.slice(i, i + batchSize);

        const submissionsQuery = query(
          collection(db, "quizSubmissions"),
          where("assignmentId", "in", batch),
          where("quizMode", "==", "asynchronous")
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);

        submissionsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const studentInClass = allStudents.find(s => s.id === data.studentId);

          console.log("Anti-cheat data:", data.antiCheatData); // Debug log

          submissionsData.push({
            id: docSnap.id,
            studentId: data.studentId,
            studentName: data.studentName || studentInClass?.name || "Unknown",
            correctPoints: data.correctPoints || 0,
            totalPoints: data.totalPoints || quizData.totalPoints || 0,
            rawScorePercentage: data.rawScorePercentage || 0,
            base50ScorePercentage: data.base50ScorePercentage || 0,
            submittedAt: data.submittedAt,
            answers: data.answers || {},
            assignmentId: data.assignmentId,
            antiCheatData: data.antiCheatData || {
              tabSwitchCount: 0,
              fullscreenExitCount: 0,
              copyAttempts: 0,
              rightClickAttempts: 0,
              suspiciousActivities: [],
              totalSuspiciousActivities: 0,
              quizDuration: 0,
              flaggedForReview: false,
            },
          });
        });
      }

      setResults(submissionsData);

    } catch (e) {
      console.error("Error fetching data:", e);
      setError("Error loading results. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStudentResult = (studentId) => {
    return results.find((r) => r.studentId === studentId);
  };

  const handleViewDetails = (studentId) => {
    const result = getStudentResult(studentId);
    if (!result) {
      showToast("warning", "No Submission", "No submission found for this student");
      return;
    }
    setStudentAnswers(result);
    setSelectedStudent(studentId);
    setShowDetailModal(true);
  };

  const handleViewAntiCheat = (e, result) => {
    e.stopPropagation();
    if (!result.antiCheatData) {
      showToast("info", "No Data", "No anti-cheat data available for this submission");
      return;
    }
    setSelectedAntiCheatData(result.antiCheatData);
    setShowAntiCheatModal(true);
  };

  const handleOpenRetakeModal = (student, e) => {
    e.stopPropagation();
    setSelectedStudentForAction(student);
    setRetakeDeadline("");
    setShowRetakeModal(true);
  };

  const handleOpenReschedModal = (student, e) => {
    e.stopPropagation();
    setSelectedStudentForAction(student);
    setReschedDeadline("");
    setShowReschedModal(true);
  };

  const handleGrantRetake = async () => {
    if (!retakeDeadline) {
      showToast("warning", "Missing Deadline", "Please select a deadline for the retake");
      return;
    }

    setActionLoading(true);
    try {
      const result = getStudentResult(selectedStudentForAction.id);

      const newDeadlineDate = new Date(retakeDeadline);
      const newAssignment = {
        quizId: quizId,
        classId: classId,
        studentId: selectedStudentForAction.id,
        studentName: selectedStudentForAction.name,
        quizMode: "asynchronous",
        assignedAt: serverTimestamp(),
        dueDate: retakeDeadline,
        deadline: newDeadlineDate,
        status: "pending",
        isRetake: true,
        originalSubmissionId: result?.id || null,
        retakeGrantedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "assignedQuizzes"), newAssignment);

      const actionType = result ? "Retake" : "Quiz access";
      showToast("success", "Access Granted!", `${actionType} granted to ${selectedStudentForAction.name}!`);
      setShowRetakeModal(false);
      fetchData();
    } catch (error) {
      console.error("Error granting retake:", error);
      showToast("error", "Failed", "Failed to grant access. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!reschedDeadline) {
      showToast("warning", "Missing Deadline", "Please select a new deadline");
      return;
    }

    setActionLoading(true);
    try {
      const assignmentsQuery = query(
        collection(db, "assignedQuizzes"),
        where("quizId", "==", quizId),
        where("classId", "==", classId),
        where("studentId", "==", selectedStudentForAction.id),
        where("quizMode", "==", "asynchronous")
      );

      const assignmentsSnapshot = await getDocs(assignmentsQuery);

      if (assignmentsSnapshot.empty) {
        showToast("error", "Not Found", "No assignment found for this student");
        setActionLoading(false);
        return;
      }

      const assignmentDoc = assignmentsSnapshot.docs[0];
      await updateDoc(doc(db, "assignedQuizzes", assignmentDoc.id), {
        dueDate: reschedDeadline,
        deadline: new Date(reschedDeadline),
        rescheduledAt: serverTimestamp(),
      });

      showToast("success", "Rescheduled!", `Quiz rescheduled for ${selectedStudentForAction.name}!`);
      setShowReschedModal(false);
      fetchData();
    } catch (error) {
      console.error("Error rescheduling:", error);
      showToast("error", "Failed", "Failed to reschedule quiz. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const isDeadlinePassed = (studentId) => {
    const deadline = assignmentDeadlines[studentId];
    if (!deadline) return false;
    return new Date() > new Date(deadline);
  };

  const calculateStats = () => {
    const submittedIds = new Set(results.map(r => r.studentId));
    const pendingStudents = students.filter(s => !submittedIds.has(s.id) && assignedStudentIds.has(s.id));
    const missed = pendingStudents.filter(s => isDeadlinePassed(s.id)).length;
    const pending = pendingStudents.length - missed;
    return {
      completed: results.length,
      pending: pending,
      missed: missed,
      notStarted: students.length - results.length,
      flaggedForReview: results.filter(r => r.antiCheatData?.flaggedForReview).length,
    };
  };

  const handleDownloadExcel = () => {
    const excelData = students.map((student) => {
      const result = getStudentResult(student.id);

      return {
        "Last Name": student.lastName || "",
        "First Name": student.firstName || "",
        "Email": student.email || "",
        "Status": result ? "Completed" : (assignedStudentIds.has(student.id) && isDeadlinePassed(student.id) ? "Missed" : "Pending"),
        "Score": result ? `${result.correctPoints}/${result.totalPoints}` : "—",
        "Raw Score (%)": result ? result.rawScorePercentage.toFixed(2) : "—",
        "Base-50 Grade (%)": result ? result.base50ScorePercentage.toFixed(2) : "—",
        "Submitted At": result?.submittedAt
          ? new Date(result.submittedAt.seconds * 1000).toLocaleString()
          : "—",
        "Flagged for Review": result?.antiCheatData?.flaggedForReview ? "Yes" : "No",
        "Tab Switches": result?.antiCheatData?.tabSwitchCount || 0,
        "Fullscreen Exits": result?.antiCheatData?.fullscreenExitCount || 0,
        "Copy Attempts": result?.antiCheatData?.copyAttempts || 0,
        "Right-Click Attempts": result?.antiCheatData?.rightClickAttempts || 0,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet["!cols"] = [
      { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 12 },
      { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 20 },
      { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Results");

    const quizTitle = quiz?.title || "Quiz";
    const date = new Date().toISOString().split("T")[0];
    const filename = `${quizTitle}_Results_${date}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  if (loading) {
    return <QuizResultsSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-blue-600 hover:text-blue-800 font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="w-full font-Poppins">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-2 hover:gap-6 hover:duration-200">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-subtext hover:text-subsubtext transition hover:duration-200 hover:scale-110 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Quiz Details
        </button>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-400 text-white p-4 md:p-6 rounded-xl mb-6 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold mb-1">Quiz Results (Asynchronous)</h1>
            <p className="text-white/90 text-sm">{quiz?.title} • {quiz?.totalPoints || 0} points</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-8">
        <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <Users className="w-6 h-6 md:w-8 md:h-8 text-button" />
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-title">{students.length}</div>
              <div className="text-xs md:text-sm text-subtext font-semibold">Total</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <Clock className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-title">{stats.pending}</div>
              <div className="text-xs md:text-sm text-subtext font-semibold">Pending</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-accent" />
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-title">{stats.completed}</div>
              <div className="text-xs md:text-sm text-subtext font-semibold">Completed</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-red-500" />
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-title">{stats.missed}</div>
              <div className="text-xs md:text-sm text-subtext font-semibold">Missed</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3 md:p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-title">{stats.flaggedForReview}</div>
              <div className="text-xs md:text-sm text-subtext font-semibold">Flagged</div>
            </div>
          </div>
        </div>
      </div>

      {/* Student Results Section */}
      <div className="border border-gray-200 rounded-xl p-4 md:p-6 bg-white shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
          <h3 className="text-lg md:text-xl font-bold flex items-center gap-2 text-title">
            <Users className="w-5 h-5 md:w-6 md:h-6 text-button" />
            Student Results
          </h3>
          <button
            onClick={handleDownloadExcel}
            className="flex items-center justify-center gap-2 bg-button hover:bg-buttonHover text-white px-4 py-2 rounded-lg font-semibold transition text-sm w-full md:w-auto"
          >
            <Download className="w-5 h-5" />
            Download Excel
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead className="bg-blue-600 text-white rounded-lg">
              <tr>
                <th className="px-6 py-4 text-left font-bold rounded-l-lg">Student</th>
                <th className="px-6 py-4 text-left font-bold">Email</th>
                <th className="px-6 py-4 text-center font-bold">Score</th>
                <th className="px-6 py-4 text-center font-bold">Raw Score</th>
                <th className="px-6 py-4 text-center font-bold">Base-50 Grade</th>
                <th className="px-6 py-4 text-center font-bold">Status</th>
                <th className="px-6 py-4 text-center font-bold">Anti-Cheat</th>
                <th className="px-6 py-4 text-center font-bold rounded-r-lg">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    No students in this class
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => {
                  const result = getStudentResult(student.id);
                  const submitted = !!result;

                  return (
                    <tr
                      key={student.id}
                      className={`border-b transition ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} ${result?.antiCheatData?.flaggedForReview ? "bg-red-50" : "hover:bg-gray-100"}`}
                    >
                      <td
                        className="px-6 py-4 cursor-pointer"
                        onClick={() => submitted && handleViewDetails(student.id)}
                      >
                        <p className="font-semibold text-title">
                          {student.firstName} {student.lastName}
                        </p>
                      </td>
                      <td
                        className="px-6 py-4 text-subtext cursor-pointer"
                        onClick={() => submitted && handleViewDetails(student.id)}
                      >
                        {student.email}
                      </td>
                      <td
                        className="px-6 py-4 text-center cursor-pointer"
                        onClick={() => submitted && handleViewDetails(student.id)}
                      >
                        {submitted ? (
                          <span className="font-bold text-lg text-title">
                            {result.correctPoints}/{result.totalPoints}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td
                        className="px-6 py-4 text-center cursor-pointer"
                        onClick={() => submitted && handleViewDetails(student.id)}
                      >
                        {submitted ? (
                          <span className="font-bold text-lg text-title">
                            {result.rawScorePercentage.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td
                        className="px-6 py-4 text-center cursor-pointer"
                        onClick={() => submitted && handleViewDetails(student.id)}
                      >
                        {submitted ? (
                          <span className="font-bold text-lg text-accent">
                            {result.base50ScorePercentage.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td
                        className="px-6 py-4 text-center cursor-pointer"
                        onClick={() => submitted && handleViewDetails(student.id)}
                      >
                        {submitted ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            Completed
                          </span>
                        ) : assignedStudentIds.has(student.id) && isDeadlinePassed(student.id) ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">
                            Missed
                          </span>
                        ) : assignedStudentIds.has(student.id) ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        ) : student.id === student.docId ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">
                            No Account
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                            Not Assigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {submitted && result.antiCheatData ? (
                          <button
                            onClick={(e) => handleViewAntiCheat(e, result)}
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-semibold transition ${result.antiCheatData.flaggedForReview
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-accent hover:bg-accentHover"
                              }`}
                          >
                            <Shield className="w-4 h-4" />
                            <span className="hidden sm:inline">View</span>
                          </button>
                        ) : submitted ? (
                          <button
                            onClick={(e) => handleViewAntiCheat(e, result)}
                            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-semibold transition bg-gray-400"
                          >
                            <Shield className="w-4 h-4" />
                            <span className="hidden sm:inline">View</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {submitted ? (
                            <span className="text-sm text-gray-500 italic">No actions</span>
                          ) : assignedStudentIds.has(student.id) ? (
                            <>
                              <button
                                onClick={(e) => handleOpenRetakeModal(student, e)}
                                className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Access
                              </button>
                              <button
                                onClick={(e) => handleOpenReschedModal(student, e)}
                                className="flex items-center gap-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition"
                              >
                                <Calendar className="w-4 h-4" />
                                Extend
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-red-500 font-semibold">
                              {student.id === student.docId ? "No Account" : "Not Assigned"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div >

      {/* Mobile Card View */}
      < div className="md:hidden space-y-4" >
        {
          students.length === 0 ? (
            <div className="text-center text-gray-500 py-8 bg-white rounded-lg border border-gray-200">
              No students in this class
            </div>
          ) : (
            students.map((student) => {
              const result = getStudentResult(student.id);
              const submitted = !!result;

              return (
                <div
                  key={student.id}
                  className={`bg-white rounded-xl border p-4 shadow-sm ${result?.antiCheatData?.flaggedForReview ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                  onClick={() => submitted && handleViewDetails(student.id)}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="font-bold text-title text-lg">
                        {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-xs text-subsubtext">{student.email}</p>
                    </div>
                    {submitted ? (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Completed
                      </span>
                    ) : assignedStudentIds.has(student.id) && isDeadlinePassed(student.id) ? (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Missed
                      </span>
                    ) : assignedStudentIds.has(student.id) ? (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    ) : student.id === student.docId ? (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        No Account
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Not Assigned
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-gray-50 p-2 rounded-lg text-center">
                      <p className="text-xs text-subsubtext mb-1">Score</p>
                      <p className="font-bold text-title">
                        {submitted ? `${result.correctPoints}/${result.totalPoints}` : "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg text-center">
                      <p className="text-xs text-subsubtext mb-1">Raw %</p>
                      <p className="font-bold text-title">
                        {submitted ? `${result.rawScorePercentage.toFixed(0)}%` : "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg text-center">
                      <p className="text-xs text-subsubtext mb-1">Base-50</p>
                      <p className={`font-bold ${submitted ? "text-accent" : "text-gray-400"}`}>
                        {submitted ? `${result.base50ScorePercentage.toFixed(0)}%` : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      {submitted && result.antiCheatData ? (
                        <button
                          onClick={(e) => handleViewAntiCheat(e, result)}
                          className={`w-full flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-white text-xs font-semibold transition ${result.antiCheatData.flaggedForReview
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-accent hover:bg-accentHover"
                            }`}
                        >
                          <Shield className="w-3 h-3" />
                          {result.antiCheatData.flaggedForReview ? "Flagged" : "Clean"}
                        </button>
                      ) : submitted ? (
                        <button
                          onClick={(e) => handleViewAntiCheat(e, result)}
                          className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-white text-xs font-semibold transition bg-gray-400"
                        >
                          <Shield className="w-3 h-3" />
                          Anti-Cheat
                        </button>
                      ) : (
                        <div className="text-center text-xs text-gray-400 py-2">
                          No Data
                        </div>
                      )}
                    </div>

                    {/* Actions for Pending Students */}
                    {!submitted && (
                      <div className="flex gap-2 flex-1">
                        {assignedStudentIds.has(student.id) ? (
                          <>
                            <button
                              onClick={(e) => handleOpenRetakeModal(student, e)}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Access
                            </button>
                            <button
                              onClick={(e) => handleOpenReschedModal(student, e)}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition"
                            >
                              <Calendar className="w-3 h-3" />
                              Extend
                            </button>
                          </>
                        ) : (
                          <div className="w-full text-center py-2 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-xs text-red-500 font-semibold flex items-center justify-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {student.id === student.docId ? "Account Required" : "Not Assigned"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Visual fix for completed students to not have empty space if they don't have actions, 
                      but typically they don't have actions here in the table version either. 
                      However, keeping structure consistent. */}
                  </div>
                </div>
              );
            })
          )
        }
      </div >

      {/* Anti-Cheat Modal */}
      {
        showAntiCheatModal && selectedAntiCheatData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-overlayFade">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all animate-popIn">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Shield className={`w-6 h-6 ${selectedAntiCheatData?.flaggedForReview ? "text-red-600" : "text-green-600"}`} />
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800">Anti-Cheating Report</h3>
                </div>
                <button
                  onClick={() => setShowAntiCheatModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className={`p-4 rounded-lg mb-6 ${selectedAntiCheatData?.flaggedForReview ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                <p className="font-bold text-gray-800 mb-2">Status</p>
                <p className={selectedAntiCheatData?.flaggedForReview ? "text-red-700 font-semibold" : "text-green-700 font-semibold"}>
                  {selectedAntiCheatData?.flaggedForReview ? "⚠️ Flagged for Review - Suspicious Activity Detected" : "✓ Clean - No Suspicious Activity"}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs md:text-sm font-semibold text-gray-600 mb-1">🔄 Tab Switches</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-700">{selectedAntiCheatData?.tabSwitchCount || 0}</p>
                  <p className="text-xs text-gray-500 mt-2">Total times student left the quiz</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-xs md:text-sm font-semibold text-gray-600 mb-1">📺 Fullscreen Exits</p>
                  <p className="text-xl md:text-2xl font-bold text-purple-700">{selectedAntiCheatData?.fullscreenExitCount || 0}</p>
                  <p className="text-xs text-gray-500 mt-2">Times exited fullscreen mode</p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <p className="text-xs md:text-sm font-semibold text-gray-600 mb-1">📋 Copy Attempts</p>
                  <p className="text-xl md:text-2xl font-bold text-orange-700">{selectedAntiCheatData?.copyAttempts || 0}</p>
                  <p className="text-xs text-gray-500 mt-2">Copy/paste blocked</p>
                </div>

                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="text-xs md:text-sm font-semibold text-gray-600 mb-1">🖱️ Right-Click Attempts</p>
                  <p className="text-xl md:text-2xl font-bold text-red-700">{selectedAntiCheatData?.rightClickAttempts || 0}</p>
                  <p className="text-xs text-gray-500 mt-2">Right-click blocked</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">📋 Detailed Activity Timeline</p>
                {selectedAntiCheatData?.suspiciousActivities && selectedAntiCheatData.suspiciousActivities.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedAntiCheatData.suspiciousActivities.map((activity, idx) => {
                      const activityTime = new Date(activity.timestamp);
                      const activityHour = activityTime.getHours().toString().padStart(2, '0');
                      const activityMin = activityTime.getMinutes().toString().padStart(2, '0');
                      const activitySec = activityTime.getSeconds().toString().padStart(2, '0');

                      let icon = '⚠️';
                      let bgColor = 'bg-yellow-50 border-yellow-200';
                      let textColor = 'text-yellow-700';

                      if (activity.type === 'tab_switch') {
                        icon = '🔄';
                        bgColor = 'bg-blue-50 border-blue-200';
                        textColor = 'text-blue-700';
                      } else if (activity.type === 'fullscreen_exit') {
                        icon = '📺';
                        bgColor = 'bg-purple-50 border-purple-200';
                        textColor = 'text-purple-700';
                      } else if (activity.type === 'copy_attempt') {
                        icon = '📋';
                        bgColor = 'bg-orange-50 border-orange-200';
                        textColor = 'text-orange-700';
                      } else if (activity.type === 'right_click') {
                        icon = '🖱️';
                        bgColor = 'bg-red-50 border-red-200';
                        textColor = 'text-red-700';
                      } else if (activity.type === 'dev_tools_attempt') {
                        icon = '🛠️';
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
                                <p>
                                  <span className="font-semibold">Full Timestamp: </span>
                                  {activityTime.toLocaleString()}
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

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-2">⏱️ Quiz Duration</p>
                <p className="text-gray-600">
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

      {/* Detail Modal */}
      {
        showDetailModal && studentAnswers && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-overlayFade">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all animate-popIn">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-700 text-white p-6 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg md:text-xl font-bold">
                      {students.find((s) => s.id === selectedStudent)?.name || "Student"}
                    </h3>
                    <p className="text-blue-100 mt-1">
                      Score: {studentAnswers.correctPoints}/{studentAnswers.totalPoints}
                    </p>
                    <p className="text-blue-100">
                      Raw Score: {studentAnswers.rawScorePercentage?.toFixed(0)}%
                    </p>
                    <p className="text-blue-100">
                      Base-50 Grade: {studentAnswers.base50ScorePercentage?.toFixed(0)}%
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-white hover:bg-blue-800 rounded-lg p-2 transition"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {studentAnswers.answers && Object.keys(studentAnswers.answers).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(studentAnswers.answers).map(([questionIndex, studentAnswer]) => {
                      const question = quiz?.questions?.[parseInt(questionIndex)];
                      if (!question) return null;

                      let isCorrect = false;
                      let correctAnswer = "";

                      if (question.type === "multiple_choice") {
                        const correctChoice = question.choices?.find((c) => c.is_correct);
                        correctAnswer = correctChoice?.text || "";
                        isCorrect = studentAnswer === correctAnswer;
                      } else if (question.type === "true_false") {
                        correctAnswer = question.correct_answer;
                        isCorrect = studentAnswer?.toLowerCase() === correctAnswer?.toLowerCase();
                      } else if (question.type === "identification") {
                        correctAnswer = question.correct_answer;
                        isCorrect = studentAnswer?.toLowerCase().trim() === correctAnswer?.toLowerCase().trim();
                      }

                      return (
                        <div
                          key={questionIndex}
                          className={`border-2 rounded-lg p-4 ${isCorrect ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"
                            }`}
                        >
                          <div className="flex items-start gap-3 mb-2">
                            <span className="font-bold text-lg text-gray-700">
                              {parseInt(questionIndex) + 1}.
                            </span>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{question.question}</p>
                              <p className="text-sm text-gray-600 mt-1">Points: {question.points || 1}</p>
                            </div>
                            {isCorrect ? (
                              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                            )}
                          </div>

                          <div className="ml-10 mt-3 space-y-2">
                            <p className="text-sm">
                              <span className="font-semibold text-gray-700">Student's Answer: </span>
                              <span className={isCorrect ? "text-green-700 font-bold" : "text-red-700 font-bold"}>
                                {studentAnswer || "No answer"}
                              </span>
                            </p>
                            {!isCorrect && (
                              <p className="text-sm">
                                <span className="font-semibold text-gray-700">Correct Answer: </span>
                                <span className="text-green-700 font-bold">{correctAnswer}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-500">No answers recorded</p>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Retake Modal */}
      {
        showRetakeModal && selectedStudentForAction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-overlayFade">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl transform transition-all animate-popIn">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Grant Quiz Access</h3>
                <button onClick={() => setShowRetakeModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-gray-600 mb-4">
                Grant <span className="font-semibold">{selectedStudentForAction.name}</span> access to take the quiz.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Set New Deadline</label>
                <input
                  type="datetime-local"
                  value={retakeDeadline}
                  onChange={(e) => setRetakeDeadline(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRetakeModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantRetake}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Grant Access
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Reschedule Modal */}
      {
        showReschedModal && selectedStudentForAction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-overlayFade">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl transform transition-all animate-popIn">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Extend Deadline</h3>
                <button onClick={() => setShowReschedModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-gray-600 mb-4">
                Extend the deadline for <span className="font-semibold">{selectedStudentForAction.name}</span>.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Set Extended Deadline</label>
                <input
                  type="datetime-local"
                  value={reschedDeadline}
                  onChange={(e) => setReschedDeadline(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowReschedModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReschedule}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      Extend Deadline
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }
      <Toast {...toast} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
    </div >
  );
}