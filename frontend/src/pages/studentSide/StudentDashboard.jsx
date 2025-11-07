import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import {
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  PlayCircle,
  Loader2,
  Zap,
  LogIn,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import StudentSidebar from "../../components/StudentSideBar";

export default function StudentDashboard({ user, userDoc }) {
  const navigate = useNavigate();
  const [assignedQuizzes, setAssignedQuizzes] = useState([]);
  const [quizSubmissions, setQuizSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizCode, setQuizCode] = useState("");
  const [joiningQuiz, setJoiningQuiz] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalQuizzes: 0,
    completedQuizzes: 0,
    asyncQuizzes: { completed: 0, total: 0, avgScore: 0 },
    syncQuizzes: { completed: 0, total: 0, avgScore: 0 },
    overallAvgScore: 0,
  });

  useEffect(() => {
    if (user && userDoc) {
      fetchAssignedQuizzes();
      fetchQuizSubmissions();
    }
  }, [user, userDoc]);

  useEffect(() => {
    if (quizSubmissions.length > 0) {
      calculateAnalytics();
    }
  }, [quizSubmissions]);

  const calculateAnalytics = () => {
    const asyncSubmissions = quizSubmissions.filter(
      (sub) => sub.quizMode === "asynchronous"
    );
    const syncSubmissions = quizSubmissions.filter(
      (sub) => sub.quizMode === "synchronous"
    );

    const asyncAvg =
      asyncSubmissions.length > 0
        ? Math.round(
            asyncSubmissions.reduce((sum, sub) => sum + (sub.base50ScorePercentage || 0), 0) /
              asyncSubmissions.length
          )
        : 0;

    const syncAvg =
      syncSubmissions.length > 0
        ? Math.round(
            syncSubmissions.reduce((sum, sub) => sum + (sub.base50ScorePercentage || 0), 0) /
              syncSubmissions.length
          )
        : 0;

    const overallAvg =
      quizSubmissions.length > 0
        ? Math.round(
            quizSubmissions.reduce((sum, sub) => sum + (sub.base50ScorePercentage || 0), 0) /
              quizSubmissions.length
          )
        : 0;

    setAnalytics({
      totalQuizzes: quizSubmissions.length,
      completedQuizzes: quizSubmissions.length,
      asyncQuizzes: {
        completed: asyncSubmissions.length,
        total: asyncSubmissions.length,
        avgScore: asyncAvg,
      },
      syncQuizzes: {
        completed: syncSubmissions.length,
        total: syncSubmissions.length,
        avgScore: syncAvg,
      },
      overallAvgScore: overallAvg,
    });
  };

  const fetchQuizSubmissions = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("❌ WALANG LOGGED IN USER");
        return;
      }

      const submissionsRef = collection(db, "quizSubmissions");
      const q = query(
        submissionsRef,
        where("studentId", "==", currentUser.uid)
      );

      const snapshot = await getDocs(q);
      const submissions = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        submissions.push({
          id: doc.id,
          ...data,
        });
      });

      console.log("✅ QUIZ SUBMISSIONS FETCHED:", submissions.length);
      console.log("📝 SUBMISSIONS DATA:", submissions);
      setQuizSubmissions(submissions);
    } catch (error) {
      console.error("❌ ERROR FETCHING SUBMISSIONS:", error);
    }
  };

  const fetchAssignedQuizzes = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.log("❌ WALANG LOGGED IN USER");
        return;
      }

      console.log("✅ LOGGED IN USER:", currentUser.uid);
      console.log("📧 EMAIL:", currentUser.email);

      const assignedRef = collection(db, "assignedQuizzes");

      const q = query(
        assignedRef,
        where("studentId", "==", currentUser.uid)
      );

      const snapshot = await getDocs(q);

      console.log("📦 TOTAL DOCUMENTS NAKUHA:", snapshot.size);

      if (snapshot.size === 0) {
        console.log("⚠️ WALANG DOCUMENTS! Possible reasons:");
        console.log("   - Hindi pa nag-assign ng quiz ang teacher");
        console.log("   - Mali ang studentId sa database");
        console.log("   - May permission issue sa Firestore rules");
      }

      const quizzes = [];

      snapshot.forEach((doc) => {
        const data = doc.data();

        console.log("📄 DOCUMENT ID:", doc.id);
        console.log("   - quizTitle:", data.quizTitle);
        console.log("   - quizMode:", data.quizMode);
        console.log("   - studentId:", data.studentId);
        console.log("   - className:", data.className);
        console.log("   - status:", data.status);

        if (data.quizMode === "asynchronous") {
          console.log("   ✅ ASYNCHRONOUS - IDADAGDAG SA LIST");
          quizzes.push({
            id: doc.id,
            quizId: data.quizId,
            quizTitle: data.quizTitle || "Untitled Quiz",
            className: data.className || "Unknown Class",
            subject: data.subject || "",
            dueDate: data.dueDate,
            status: data.status || "pending",
            completed: data.completed || false,
            score: data.score,
            base50ScorePercentage: data.base50ScorePercentage,
            attempts: data.attempts || 0,
            maxAttempts: data.settings?.maxAttempts || 1,
            assignedAt: data.assignedAt,
            submittedAt: data.submittedAt,
            instructions: data.instructions || "",
          });
        } else {
          console.log("   ⏭️ HINDI ASYNCHRONOUS - SKIP");
        }
      });

      console.log("✅ FINAL COUNT NG ASYNCHRONOUS QUIZZES:", quizzes.length);

      quizzes.sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.assignedAt && b.assignedAt) {
          return (b.assignedAt.seconds || 0) - (a.assignedAt.seconds || 0);
        }
        return 0;
      });

      setAssignedQuizzes(quizzes);
    } catch (error) {
      console.error("❌ ERROR NANGYARI:", error);
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  const handleTakeQuiz = (assignmentId) => {
    navigate(`/student/take-assigned-quiz/${assignmentId}`);
  };

  const handleJoinWithCode = async () => {
    if (!quizCode.trim()) {
      alert("Please enter a quiz code");
      return;
    }

    setJoiningQuiz(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("Please log in first");
        navigate("/login");
        return;
      }

      const assignedRef = collection(db, "assignedQuizzes");
      const q = query(
        assignedRef,
        where("quizCode", "==", quizCode.toUpperCase().trim()),
        where("studentId", "==", currentUser.uid),
        where("quizMode", "==", "synchronous")
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        alert("❌ Invalid quiz code or this quiz is not assigned to you!");
        setJoiningQuiz(false);
        return;
      }

      const assignmentDoc = snapshot.docs[0];
      const assignmentId = assignmentDoc.id;

      navigate(`/student/take-sync-quiz/${assignmentId}`);
    } catch (error) {
      console.error("Error joining quiz:", error);
      alert("Error joining quiz. Please try again.");
    } finally {
      setJoiningQuiz(false);
    }
  };

  const getStatusBadge = (quiz) => {
    if (quiz.completed) {
      return (
        <span className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full whitespace-nowrap">
          <CheckCircle className="w-3 h-3" /> Completed
        </span>
      );
    }

    if (quiz.dueDate) {
      const dueDate = new Date(quiz.dueDate);
      const now = new Date();
      const isOverdue = now > dueDate;

      if (isOverdue) {
        return (
          <span className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full whitespace-nowrap">
            <AlertCircle className="w-3 h-3" /> Overdue
          </span>
        );
      }

      const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 3) {
        return (
          <span className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full whitespace-nowrap">
            <Clock className="w-3 h-3" /> Due Soon
          </span>
        );
      }
    }

    return (
      <span className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full whitespace-nowrap">
        <BookOpen className="w-3 h-3" /> Pending
      </span>
    );
  };

  const formatDueDate = (dueDate) => {
    if (!dueDate) return "No due date";

    const date = new Date(dueDate);
    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canTakeQuiz = (quiz) => {
    if (quiz.completed && quiz.attempts >= quiz.maxAttempts) {
      return false;
    }

    if (quiz.dueDate) {
      const dueDate = new Date(quiz.dueDate);
      const now = new Date();
      return now <= dueDate;
    }

    return true;
  };

  const getScoreColor = (score) => {
    if (score >= 85) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score) => {
    if (score >= 85) return "bg-green-50";
    if (score >= 75) return "bg-blue-50";
    if (score >= 60) return "bg-yellow-50";
    return "bg-red-50";
  };

  return (
    <div className="min-h-screen bg-background font-Outfit flex">
      {/* SIDEBAR */}
      <StudentSidebar user={user} userDoc={userDoc} />

      {/* MAIN CONTENT */}
      <div className="flex-1 transition-all duration-300 lg:ml-[var(--sidebar-width,288px)]">
        <main className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
          {/* Welcome Section */}
          <section className="px-2 sm:px-0">
            <h2 className="text-xl sm:text-3xl lg:text-5xl font-bold text-title mb-1 sm:mb-2">
              Welcome back, {userDoc?.firstName || userDoc?.name || "Student"}!
            </h2>
            <p className="text-subtext text-base sm:text-xl lg:text-3xl">Your dashboard is ready.</p>
          </section>

          {/* Join Live Quiz Section */}
          <section className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-white flex-shrink-0" />
              <div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Join Live Quiz</h3>
                <p className="text-purple-100 text-xs sm:text-sm">
                  Enter the quiz code from your teacher
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={quizCode}
                onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === "Enter" && handleJoinWithCode()}
                placeholder="Enter Quiz Code"
                maxLength={6}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg font-bold tracking-widest uppercase text-center border-2 sm:border-4 border-purple-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-purple-400 focus:border-purple-500 bg-white"
              />
              <button
                onClick={handleJoinWithCode}
                disabled={joiningQuiz || !quizCode.trim()}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-purple-700 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg hover:bg-purple-50 transition disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {joiningQuiz ? (
                  <>
                    <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                    <span className="hidden sm:inline">Joining...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>Join Quiz</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-purple-500 bg-opacity-30 rounded-lg">
              <p className="text-xs sm:text-sm text-white">
                <strong>Note:</strong> Your teacher will provide you with a
                6-character quiz code. Enter it above to join the live quiz
                session.
              </p>
            </div>
          </section>

          {/* Assigned Quizzes Section */}
          <section className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-indigo-600" />
                <span className="leading-tight">My Assigned Quizzes <span className="hidden sm:inline">(Self-Paced)</span></span>
              </h3>
              {assignedQuizzes.length > 0 && (
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs sm:text-sm font-bold w-fit">
                  {assignedQuizzes.filter((q) => !q.completed).length} Pending
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-indigo-600" />
                <span className="ml-3 text-sm sm:text-base text-gray-600">Loading your quizzes...</span>
              </div>
            ) : assignedQuizzes.length === 0 ? (
              <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-gray-500 text-base sm:text-lg">No quizzes assigned yet</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-2">
                  Check back later for new assignments
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {assignedQuizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className={`border-2 rounded-lg sm:rounded-xl p-3 sm:p-5 transition-all ${
                      quiz.completed
                        ? "border-gray-200 bg-gray-50"
                        : "border-indigo-200 bg-white hover:shadow-md"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <h4 className="text-base sm:text-lg font-bold text-gray-800 truncate">
                            {quiz.quizTitle}
                          </h4>
                          {getStatusBadge(quiz)}
                        </div>

                        <div className="space-y-1 text-xs sm:text-sm text-gray-600 mb-3">
                          <p className="font-semibold text-indigo-700 truncate">
                            📚 {quiz.className}
                            {quiz.subject && ` • ${quiz.subject}`}
                          </p>

                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="truncate">Due: {formatDueDate(quiz.dueDate)}</span>
                          </div>

                          {quiz.instructions && (
                            <p className="text-gray-500 italic mt-2 line-clamp-2">
                              "{quiz.instructions}"
                            </p>
                          )}

                          {quiz.completed && (
                            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                              <p
                                className={`font-semibold ${getScoreColor(
                                  quiz.base50ScorePercentage
                                )}`}
                              >
                                Score:{" "}
                                {quiz.base50ScorePercentage !== null
                                  ? `${quiz.base50ScorePercentage}%`
                                  : "Grading"}
                              </p>
                              <p className="text-gray-500 text-xs">
                                Submitted:{" "}
                                {quiz.submittedAt
                                  ? new Date(
                                      quiz.submittedAt.seconds * 1000
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </p>
                            </div>
                          )}

                          {!quiz.completed && quiz.attempts > 0 && (
                            <p className="text-yellow-700 font-semibold">
                              Attempts: {quiz.attempts} / {quiz.maxAttempts}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0 w-full sm:w-auto">
                        {canTakeQuiz(quiz) ? (
                          <button
                            onClick={() => handleTakeQuiz(quiz.id)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-semibold text-sm sm:text-base"
                          >
                            <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                            {quiz.attempts > 0 ? "Retake" : "Start Quiz"}
                          </button>
                        ) : quiz.completed ? (
                          <button
                            disabled
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-300 text-gray-600 px-4 py-2 rounded-lg cursor-not-allowed font-semibold text-sm sm:text-base"
                          >
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                            Completed
                          </button>
                        ) : (
                          <button
                            disabled
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-300 text-red-700 px-4 py-2 rounded-lg cursor-not-allowed font-semibold text-sm sm:text-base"
                          >
                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                            Expired
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quiz Analytics Section */}
          <section className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-indigo-600" />
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Your Quiz Performance</h3>
            </div>

            {analytics.totalQuizzes === 0 ? (
              <div className="text-center py-6 sm:py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-500 text-sm sm:text-base">
                  Complete quizzes to see your performance
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {/* Summary Card */}
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 sm:p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-indigo-100 text-xs sm:text-sm font-semibold">Overall Average</p>
                      <p className="text-3xl sm:text-4xl font-bold mt-1">{analytics.overallAvgScore}%</p>
                      <p className="text-indigo-100 text-xs mt-2">
                        {analytics.totalQuizzes} quiz{analytics.totalQuizzes !== 1 ? "zes" : ""} taken
                      </p>
                    </div>
                    <TrendingUp className="w-12 h-12 sm:w-16 sm:h-16 opacity-20" />
                  </div>
                </div>

                {/* Quiz Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Self-Paced */}
                  {analytics.asyncQuizzes.completed > 0 && (
                    <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                          <span className="font-semibold text-gray-800 text-xs sm:text-sm">Self-Paced</span>
                        </div>
                        <span className="text-xl sm:text-2xl font-bold text-green-700">{analytics.asyncQuizzes.avgScore}%</span>
                      </div>
                      <p className="text-xs text-gray-600">{analytics.asyncQuizzes.completed} quiz{analytics.asyncQuizzes.completed !== 1 ? "zes" : ""}</p>
                    </div>
                  )}

                  {/* Live Quizzes */}
                  {analytics.syncQuizzes.completed > 0 && (
                    <div className="bg-purple-50 rounded-lg p-3 sm:p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                          <span className="font-semibold text-gray-800 text-xs sm:text-sm">Live Quiz</span>
                        </div>
                        <span className="text-xl sm:text-2xl font-bold text-purple-700">{analytics.syncQuizzes.avgScore}%</span>
                      </div>
                      <p className="text-xs text-gray-600">{analytics.syncQuizzes.completed} quiz{analytics.syncQuizzes.completed !== 1 ? "zes" : ""}</p>
                    </div>
                  )}
                </div>

                {/* Individual Quiz Scores */}
                {quizSubmissions.length > 0 && (
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-800 mb-2 sm:mb-3">Recent Quiz Scores</h4>
                    <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                      {quizSubmissions.map((submission, index) => (
                        <div key={submission.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                              Quiz #{index + 1}
                            </p>
                            <p className="text-xs text-gray-500">
                              {submission.quizMode === "asynchronous" ? "📚 Self-Paced" : "⚡ Live"}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-base sm:text-lg font-bold ${getScoreColor(submission.base50ScorePercentage)}`}>
                              {submission.base50ScorePercentage}%
                            </p>
                            <p className="text-xs text-gray-500">
                              {submission.correctPoints}/{submission.totalPoints} pts
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}