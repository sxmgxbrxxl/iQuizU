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
                <span className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full whitespace-nowrap">
                    <CheckCircle className="w-3 h-3" /> 
                    <span className="hidden sm:inline">Completed</span>
                    <span className="sm:hidden">Done</span>
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
                        <Clock className="w-3 h-3" /> 
                        <span className="hidden sm:inline">Due Soon</span>
                        <span className="sm:hidden">Soon</span>
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
        <div className="px-3 py-4 sm:px-4 sm:py-6 md:p-8 font-Outfit min-h-screen">
            
            {/* Header - Responsive */}
            <div className="flex flex-row items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <FileText className="text-blue-500 w-6 h-6 sm:w-8 sm:h-8" />
                <div className="flex flex-col">
                    <h1 className="text-xl sm:text-2xl font-bold text-title">Quizzes</h1>
                    <p className="text-xs sm:text-sm md:text-base font-light text-subtext">
                        View your assigned quizzes here.
                    </p>
                </div>
            </div>

            {/* Assigned Quizzes Section - Responsive */}
            <section className="bg-components rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 flex-shrink-0" />
                        <span className="leading-tight">
                            My Assigned Quizzes 
                            <span className="block sm:inline sm:ml-1 text-sm sm:text-base md:text-lg text-gray-600">(Self-Paced)</span>
                        </span>
                    </h3>
                    {assignedQuizzes.length > 0 && (
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs sm:text-sm font-bold self-start sm:self-auto whitespace-nowrap">
                            {assignedQuizzes.filter((q) => !q.completed).length} Pending
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center py-8 sm:py-12 gap-2">
                        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-indigo-600" />
                        <span className="text-sm sm:text-base text-gray-600">Loading your quizzes...</span>
                    </div>
                ) : assignedQuizzes.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg sm:rounded-xl border-2 border-dashed border-gray-300">
                        <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                        <p className="text-gray-500 text-base sm:text-lg font-medium">No quizzes assigned yet</p>
                        <p className="text-gray-400 text-xs sm:text-sm mt-2 px-4">
                            Check back later for new assignments
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 sm:space-y-4">
                        {assignedQuizzes.map((quiz) => (
                            <div
                                key={quiz.id}
                                className={`border-2 rounded-lg sm:rounded-xl p-4 sm:p-5 transition-all ${
                                    quiz.completed
                                        ? "border-gray-200 bg-gray-50"
                                        : "border-indigo-200 bg-white hover:shadow-md"
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* Title and Badge */}
                                        <div className="flex items-start gap-2 sm:gap-3 mb-2 flex-wrap">
                                            <h4 className="text-base sm:text-lg font-bold text-gray-800 break-words flex-1 min-w-0">
                                                {quiz.quizTitle}
                                            </h4>
                                            <div className="flex-shrink-0">
                                                {getStatusBadge(quiz)}
                                            </div>
                                        </div>

                                        {/* Info Section */}
                                        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600 mb-3">
                                            <p className="font-semibold text-indigo-700 break-words">
                                                📚 {quiz.className}
                                                {quiz.subject && ` • ${quiz.subject}`}
                                            </p>

                                            <div className="flex items-start sm:items-center gap-1.5 text-gray-600">
                                                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5 sm:mt-0" />
                                                <span className="break-words">Due: {formatDueDate(quiz.dueDate)}</span>
                                            </div>

                                            {quiz.instructions && (
                                                <p className="text-gray-500 italic mt-2 break-words leading-relaxed">
                                                    "{quiz.instructions}"
                                                </p>
                                            )}

                                            {/* Completed Info */}
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
                                                    <p className="text-gray-500 text-xs sm:text-sm">
                                                        Submitted:{" "}
                                                        {quiz.submittedAt
                                                            ? new Date(
                                                                quiz.submittedAt.seconds * 1000
                                                            ).toLocaleDateString()
                                                            : "N/A"}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Attempts Info */}
                                            {!quiz.completed && quiz.attempts > 0 && (
                                                <p className="text-yellow-700 font-semibold text-xs sm:text-sm">
                                                    Attempts: {quiz.attempts} / {quiz.maxAttempts}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="flex-shrink-0 w-full sm:w-auto">
                                        {canTakeQuiz(quiz) ? (
                                            <button
                                                onClick={() => handleTakeQuiz(quiz.id)}
                                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition font-semibold text-sm sm:text-base"
                                            >
                                                <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                                {quiz.attempts > 0 ? "Retake" : "Start Quiz"}
                                            </button>
                                        ) : quiz.completed ? (
                                            <button
                                                disabled
                                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-300 text-gray-600 px-4 py-2.5 sm:py-2 rounded-lg cursor-not-allowed font-semibold text-sm sm:text-base"
                                            >
                                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                                Completed
                                            </button>
                                        ) : (
                                            <button
                                                disabled
                                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-300 text-red-700 px-4 py-2.5 sm:py-2 rounded-lg cursor-not-allowed font-semibold text-sm sm:text-base"
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
        </div>
    );
}