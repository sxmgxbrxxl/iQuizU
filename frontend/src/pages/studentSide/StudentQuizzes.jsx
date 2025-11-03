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
    FileText,
} from "lucide-react";

export default function StudentQuizzes({ user, userDoc }) {
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
                <FileText className="text-blue-500 w-8 h-8 mb-6" />
                <div className="flex flex-col mb-6">
                    <h1 className="text-2xl font-bold text-title">Quizzes</h1>
                    <p className="text-md font-light text-subtext">View your assigned quizzes here.</p>
                </div>
            </div>

            {/* Assigned Quizzes Section */}
            <section className="bg-components rounded-2xl shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-7 h-7 text-indigo-600" />
                My Assigned Quizzes (Self-Paced)
                </h3>
                {assignedQuizzes.length > 0 && (
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
                    {assignedQuizzes.filter((q) => !q.completed).length} Pending
                </span>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="ml-3 text-gray-600">Loading your quizzes...</span>
                </div>
            ) : assignedQuizzes.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-lg">No quizzes assigned yet</p>
                <p className="text-gray-400 text-sm mt-2">
                    Check back later for new assignments
                </p>
                </div>
            ) : (
                <div className="space-y-4">
                {assignedQuizzes.map((quiz) => (
                    <div
                    key={quiz.id}
                    className={`border-2 rounded-xl p-5 transition-all ${
                        quiz.completed
                        ? "border-gray-200 bg-gray-50"
                        : "border-indigo-200 bg-white hover:shadow-md"
                    }`}
                    >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-bold text-gray-800">
                            {quiz.quizTitle}
                            </h4>
                            {getStatusBadge(quiz)}
                        </div>

                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                            <p className="font-semibold text-indigo-700">
                            📚 {quiz.className}
                            {quiz.subject && ` • ${quiz.subject}`}
                            </p>

                            <div className="flex items-center gap-1 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>Due: {formatDueDate(quiz.dueDate)}</span>
                            </div>

                            {quiz.instructions && (
                            <p className="text-gray-500 italic mt-2">
                                "{quiz.instructions}"
                            </p>
                            )}

                            {quiz.completed && (
                            <div className="mt-2 flex items-center gap-4">
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
                                <p className="text-gray-500">
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

                        <div className="flex-shrink-0">
                        {canTakeQuiz(quiz) ? (
                            <button
                            onClick={() => handleTakeQuiz(quiz.id)}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-semibold"
                            >
                            <PlayCircle className="w-5 h-5" />
                            {quiz.attempts > 0 ? "Retake" : "Start Quiz"}
                            </button>
                        ) : quiz.completed ? (
                            <button
                            disabled
                            className="flex items-center gap-2 bg-gray-300 text-gray-600 px-4 py-2 rounded-lg cursor-not-allowed font-semibold"
                            >
                            <CheckCircle className="w-5 h-5" />
                            Completed
                            </button>
                        ) : (
                            <button
                            disabled
                            className="flex items-center gap-2 bg-red-300 text-red-700 px-4 py-2 rounded-lg cursor-not-allowed font-semibold"
                            >
                            <AlertCircle className="w-5 h-5" />
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

        </div>
    );
}