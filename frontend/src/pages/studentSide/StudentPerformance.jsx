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
    BarChart3,
    TrendingUp,
    Zap,
    NotebookPen,
} from "lucide-react";

export default function StudentPeformance({ user, userDoc }) {
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

            // Filter for asynchronous only
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

        // Sort
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

        // Search for quiz with this code assigned to current student
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

        // Navigate to take quiz page
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
            <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
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
            <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                <AlertCircle className="w-3 h-3" /> Overdue
            </span>
            );
        }

        const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 3) {
            return (
            <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                <Clock className="w-3 h-3" /> Due Soon
            </span>
            );
        }
        }

        return (
        <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
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
        <div className="px-2 py-6 md:p-8 font-Outfit">

            <div className="flex flex-row items-center gap-4">
                <BarChart3 className="text-blue-500 w-8 h-8 mb-6" />
                <div className="flex flex-col mb-6">
                    <h1 className="text-2xl font-bold text-title">Performance</h1>
                    <p className="text-md font-light text-subtext">View your recent performance here.</p>
                </div>
            </div>

            {/* Quiz Analytics Section */}
            <section className="bg-white rounded-2xl shadow-md p-6">

            {analytics.totalQuizzes === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-500">
                    Complete quizzes to see your performance
                </p>
                </div>
            ) : (
                <div className="space-y-4">
                {/* Summary Card */}
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between">
                    <div>
                        <p className="text-indigo-100 text-sm font-semibold">Overall Average</p>
                        <p className="text-4xl font-bold mt-1">{analytics.overallAvgScore}%</p>
                        <p className="text-indigo-100 text-xs mt-2">
                        {analytics.totalQuizzes} quiz{analytics.totalQuizzes !== 1 ? "zes" : ""} taken
                        </p>
                    </div>
                    <TrendingUp className="w-16 h-16 opacity-20" />
                    </div>
                </div>

                {/* Quiz Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Self-Paced */}
                    {analytics.asyncQuizzes.completed > 0 && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-gray-800 text-sm">Self-Paced</span>
                        </div>
                        <span className="text-2xl font-bold text-green-700">{analytics.asyncQuizzes.avgScore}%</span>
                        </div>
                        <p className="text-xs text-gray-600">{analytics.asyncQuizzes.completed} quiz{analytics.asyncQuizzes.completed !== 1 ? "zes" : ""}</p>
                    </div>
                    )}

                    {/* Live Quizzes */}
                    {analytics.syncQuizzes.completed > 0 && (
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-purple-600" />
                            <span className="font-semibold text-gray-800 text-sm">Live Quiz</span>
                        </div>
                        <span className="text-2xl font-bold text-purple-700">{analytics.syncQuizzes.avgScore}%</span>
                        </div>
                        <p className="text-xs text-gray-600">{analytics.syncQuizzes.completed} quiz{analytics.syncQuizzes.completed !== 1 ? "zes" : ""}</p>
                    </div>
                    )}
                </div>

                {/* Individual Quiz Scores */}
                {quizSubmissions.length > 0 && (
                    <div>
                    <h4 className="text-sm font-bold text-gray-800 mb-3">Recent Quiz Scores</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {quizSubmissions.map((submission) => (
                        <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                            <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                                Quiz #{quizSubmissions.indexOf(submission) + 1}
                            </p>
                            <p className="text-xs text-gray-500">
                                {submission.quizMode === "asynchronous" ? "📚 Self-Paced" : "⚡ Live"}
                            </p>
                            </div>
                            <div className="text-right">
                            <p className={`text-lg font-bold ${getScoreColor(submission.base50ScorePercentage)}`}>
                                {submission.base50ScorePercentage}%
                            </p>
                            <p className="text-xs text-gray-500">
                                {submission.correctPoints}/{submission.totalPoints} points
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
        </div>
        
    );
}