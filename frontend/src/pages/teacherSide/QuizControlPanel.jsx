import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase/firebaseConfig";
import {
  ArrowLeft,
  Play,
  Pause,
  StopCircle,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Zap,
  AlertCircle,
  Eye,
} from "lucide-react";

export default function QuizControlPanel() {
  const { quizId, classId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [quizSession, setQuizSession] = useState({
    status: "not_started",
    startedAt: null,
    pausedAt: null,
    endedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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
        alert("Please login first");
        navigate("/login");
        return;
      }

      const quizRef = doc(db, "quizzes", quizId);
      const quizSnap = await getDoc(quizRef);

      if (!quizSnap.exists()) {
        alert("Quiz not found!");
        navigate("/teacher/quizzes");
        return;
      }

      const quizData = { id: quizSnap.id, ...quizSnap.data() };

      if (quizData.teacherId !== currentUser.uid) {
        alert("❌ You don't have permission to control this quiz!");
        navigate("/teacher/quizzes");
        return;
      }

      setQuiz(quizData);

      const classRef = doc(db, "classes", classId);
      const classSnap = await getDoc(classRef);

      if (classSnap.exists()) {
        setClassData({ id: classSnap.id, ...classSnap.data() });
      }

      if (quizData.sessions && quizData.sessions[classId]) {
        setQuizSession(quizData.sessions[classId]);
      }

      // FIXED: Changed from getDoc to getDocs
      const studentsRef = collection(db, "users");
      const q = query(
        studentsRef,
        where("role", "==", "student"),
        where("classId", "==", classId)
      );
      const studentsSnap = await getDocs(q);

      const studentsList = [];
      studentsSnap.forEach((doc) => {
        const data = doc.data();
        const hasQuiz = data.assignedQuizzes?.some(
          (aq) => aq.quizId === quizId && aq.classId === classId
        );
        
        if (hasQuiz) {
          const quizAssignment = data.assignedQuizzes.find(
            (aq) => aq.quizId === quizId && aq.classId === classId
          );
          
          studentsList.push({
            id: doc.id,
            name: data.name || "Unknown",
            studentNo: data.studentNo || "N/A",
            status: quizAssignment?.status || "pending",
            score: quizAssignment?.score || null,
            completed: quizAssignment?.completed || false,
            startedAt: quizAssignment?.startedAt || null,
            submittedAt: quizAssignment?.submittedAt || null,
          });
        }
      });

      studentsList.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(studentsList);
    } catch (error) {
      console.error("Error fetching quiz data:", error);
      alert("Error loading quiz data");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListeners = () => {
    const unsubscribers = [];

    const quizRef = doc(db, "quizzes", quizId);
    const unsubQuiz = onSnapshot(quizRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.sessions && data.sessions[classId]) {
          setQuizSession(data.sessions[classId]);
        }
        setQuiz({ id: doc.id, ...data });
      }
    });
    unsubscribers.push(unsubQuiz);

    const studentsRef = collection(db, "users");
    const q = query(
      studentsRef,
      where("role", "==", "student"),
      where("classId", "==", classId)
    );
    
    const unsubStudents = onSnapshot(q, (snapshot) => {
      const updatedStudents = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const hasQuiz = data.assignedQuizzes?.some(
          (aq) => aq.quizId === quizId && aq.classId === classId
        );
        
        if (hasQuiz) {
          const quizAssignment = data.assignedQuizzes.find(
            (aq) => aq.quizId === quizId && aq.classId === classId
          );
          
          updatedStudents.push({
            id: doc.id,
            name: data.name || "Unknown",
            studentNo: data.studentNo || "N/A",
            status: quizAssignment?.status || "pending",
            score: quizAssignment?.score || null,
            completed: quizAssignment?.completed || false,
            startedAt: quizAssignment?.startedAt || null,
            submittedAt: quizAssignment?.submittedAt || null,
          });
        }
      });
      
      updatedStudents.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(updatedStudents);
    });
    unsubscribers.push(unsubStudents);

    return unsubscribers;
  };

  const handleStartQuiz = async () => {
    const confirm = window.confirm(
      "Are you sure you want to START this quiz? Students will be able to access it immediately."
    );
    if (!confirm) return;

    setActionLoading(true);
    try {
      const quizRef = doc(db, "quizzes", quizId);
      await updateDoc(quizRef, {
        [`sessions.${classId}`]: {
          status: "active",
          startedAt: new Date(),
          pausedAt: null,
          endedAt: null,
        },
      });

      alert("✅ Quiz started! Students can now access it.");
    } catch (error) {
      console.error("Error starting quiz:", error);
      alert("❌ Error starting quiz. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseQuiz = async () => {
    const confirm = window.confirm(
      "Are you sure you want to PAUSE this quiz? Students will not be able to continue."
    );
    if (!confirm) return;

    setActionLoading(true);
    try {
      const quizRef = doc(db, "quizzes", quizId);
      await updateDoc(quizRef, {
        [`sessions.${classId}.status`]: "paused",
        [`sessions.${classId}.pausedAt`]: new Date(),
      });

      alert("⏸️ Quiz paused.");
    } catch (error) {
      console.error("Error pausing quiz:", error);
      alert("❌ Error pausing quiz. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeQuiz = async () => {
    setActionLoading(true);
    try {
      const quizRef = doc(db, "quizzes", quizId);
      await updateDoc(quizRef, {
        [`sessions.${classId}.status`]: "active",
        [`sessions.${classId}.pausedAt`]: null,
      });

      alert("▶️ Quiz resumed.");
    } catch (error) {
      console.error("Error resuming quiz:", error);
      alert("❌ Error resuming quiz. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndQuiz = async () => {
    const confirm = window.confirm(
      "Are you sure you want to END this quiz? This action cannot be undone. Students will no longer be able to submit."
    );
    if (!confirm) return;

    setActionLoading(true);
    try {
      const quizRef = doc(db, "quizzes", quizId);
      await updateDoc(quizRef, {
        [`sessions.${classId}.status`]: "ended",
        [`sessions.${classId}.endedAt`]: new Date(),
      });

      alert("🛑 Quiz ended. Students can no longer submit.");
    } catch (error) {
      console.error("Error ending quiz:", error);
      alert("❌ Error ending quiz. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-md">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading Control Panel...</span>
        </div>
      </div>
    );
  }

  if (!quiz || !classData) return null;

  const notStartedCount = students.filter((s) => s.status === "pending").length;
  const inProgressCount = students.filter((s) => s.status === "in_progress").length;
  const completedCount = students.filter((s) => s.completed).length;
  const totalStudents = students.length;

  return (
    <div className="bg-white p-8 rounded-2xl shadow-md max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/teacher/quizzes")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Manage Quizzes
        </button>

        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-600" />
          <span className="font-semibold text-purple-700">Live Control Panel</span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-xl mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{quiz.title}</h2>
            <p className="text-purple-100 text-sm mt-1">
              {classData.name} • {quiz.questions?.length || 0} questions
            </p>
          </div>
          <div className="text-right">
            <div
              className={`px-4 py-2 rounded-lg font-bold text-lg ${
                quizSession.status === "active"
                  ? "bg-green-400 text-green-900"
                  : quizSession.status === "paused"
                  ? "bg-yellow-400 text-yellow-900"
                  : quizSession.status === "ended"
                  ? "bg-red-400 text-red-900"
                  : "bg-gray-300 text-gray-700"
              }`}
            >
              {quizSession.status === "active"
                ? "🟢 ACTIVE"
                : quizSession.status === "paused"
                ? "⏸️ PAUSED"
                : quizSession.status === "ended"
                ? "🛑 ENDED"
                : "⚪ NOT STARTED"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        {quizSession.status === "not_started" && (
          <button
            onClick={handleStartQuiz}
            disabled={actionLoading}
            className="col-span-4 bg-green-600 hover:bg-green-700 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-3 disabled:bg-gray-400"
          >
            {actionLoading ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                START QUIZ
              </>
            )}
          </button>
        )}

        {quizSession.status === "active" && (
          <>
            <button
              onClick={handlePauseQuiz}
              disabled={actionLoading}
              className="col-span-2 bg-yellow-500 hover:bg-yellow-600 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-3 disabled:bg-gray-400"
            >
              {actionLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Pausing...
                </>
              ) : (
                <>
                  <Pause className="w-5 h-5" />
                  PAUSE QUIZ
                </>
              )}
            </button>
            <button
              onClick={handleEndQuiz}
              disabled={actionLoading}
              className="col-span-2 bg-red-600 hover:bg-red-700 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-3 disabled:bg-gray-400"
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
          </>
        )}

        {quizSession.status === "paused" && (
          <>
            <button
              onClick={handleResumeQuiz}
              disabled={actionLoading}
              className="col-span-2 bg-green-600 hover:bg-green-700 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-3 disabled:bg-gray-400"
            >
              {actionLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Resuming...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  RESUME QUIZ
                </>
              )}
            </button>
            <button
              onClick={handleEndQuiz}
              disabled={actionLoading}
              className="col-span-2 bg-red-600 hover:bg-red-700 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-3 disabled:bg-gray-400"
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
          </>
        )}

        {quizSession.status === "ended" && (
          <div className="col-span-4 bg-gray-100 border-2 border-gray-300 text-gray-700 p-4 rounded-xl font-bold flex items-center justify-center gap-3">
            <AlertCircle className="w-6 h-6" />
            Quiz has ended. No further actions available.
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-900">{totalStudents}</div>
              <div className="text-sm text-blue-700 font-semibold">Total Students</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <Clock className="w-8 h-8 text-gray-600" />
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{notStartedCount}</div>
              <div className="text-sm text-gray-700 font-semibold">Not Started</div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <Loader className="w-8 h-8 text-yellow-600" />
            <div className="text-right">
              <div className="text-3xl font-bold text-yellow-900">{inProgressCount}</div>
              <div className="text-sm text-yellow-700 font-semibold">In Progress</div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border-2 border-green-200 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="text-right">
              <div className="text-3xl font-bold text-green-900">{completedCount}</div>
              <div className="text-sm text-green-700 font-semibold">Completed</div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-2 border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Eye className="w-6 h-6 text-purple-600" />
          Live Student Monitoring
        </h3>

        {students.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No students assigned to this quiz</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="text-left p-3 font-bold text-gray-700">Student Name</th>
                  <th className="text-left p-3 font-bold text-gray-700">Student #</th>
                  <th className="text-center p-3 font-bold text-gray-700">Status</th>
                  <th className="text-center p-3 font-bold text-gray-700">Score</th>
                  <th className="text-center p-3 font-bold text-gray-700">Started At</th>
                  <th className="text-center p-3 font-bold text-gray-700">Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition"
                  >
                    <td className="p-3 font-semibold text-gray-800">{student.name}</td>
                    <td className="p-3 text-gray-600">{student.studentNo}</td>
                    <td className="p-3 text-center">
                      {student.completed ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold inline-flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Completed
                        </span>
                      ) : student.status === "in_progress" ? (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold inline-flex items-center gap-1">
                          <Loader className="w-4 h-4 animate-spin" />
                          In Progress
                        </span>
                      ) : student.status === "pending" ? (
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold inline-flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Not Started
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold inline-flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          {student.status}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {student.score !== null ? (
                        <span className={`font-bold text-lg ${
                          student.score >= (quiz.settings?.passingScore || 60)
                            ? "text-green-600"
                            : "text-red-600"
                        }`}>
                          {student.score}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center text-sm text-gray-600">
                      {student.startedAt ? (
                        new Date(student.startedAt.seconds * 1000).toLocaleTimeString('en-PH', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center text-sm text-gray-600">
                      {student.submittedAt ? (
                        new Date(student.submittedAt.seconds * 1000).toLocaleTimeString('en-PH', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {quizSession.status !== "not_started" && (
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {quizSession.startedAt && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-700 mb-1">Started At</p>
              <p className="text-lg font-bold text-green-900">
                {new Date(quizSession.startedAt.seconds * 1000).toLocaleString('en-PH', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </p>
            </div>
          )}

          {quizSession.pausedAt && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-yellow-700 mb-1">Paused At</p>
              <p className="text-lg font-bold text-yellow-900">
                {new Date(quizSession.pausedAt.seconds * 1000).toLocaleString('en-PH', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </p>
            </div>
          )}

          {quizSession.endedAt && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Ended At</p>
              <p className="text-lg font-bold text-red-900">
                {new Date(quizSession.endedAt.seconds * 1000).toLocaleString('en-PH', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {quizSession.status === "not_started" && (
        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-bold text-blue-900 mb-2">Instructions:</h4>
              <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                <li>Click <strong>"START QUIZ"</strong> to allow students to begin</li>
                <li>Students cannot access the quiz until you start it</li>
                <li>Monitor student progress in real-time</li>
                <li>You can pause or end the quiz at any time</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}