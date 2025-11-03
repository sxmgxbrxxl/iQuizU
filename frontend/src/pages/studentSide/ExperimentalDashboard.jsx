import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import StudentSidebar from "../../components/StudentSideBar";
import { auth, db } from "../../firebase/firebaseConfig";
    import {
    collection,
    query,
    where,
    getDocs,
} from "firebase/firestore";
    import {
    BookOpen,
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2,
    Zap,
    LogIn,
    Medal,
} from "lucide-react";

export default function ExperimentalDashboard({ user, userDoc }) {
    const navigate = useNavigate();
    const [sidebarWidth, setSidebarWidth] = useState("288px");
    const location = useLocation();
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
    
      // 🔹 Sidebar width handling
    useEffect(() => {
        const observer = new MutationObserver(() => {
        const width = getComputedStyle(document.documentElement)
            .getPropertyValue("--sidebar-width")
            .trim();
        if (width) {
            setSidebarWidth(width);
        }
        });

        observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["style"],
        });

        const initialWidth = getComputedStyle(document.documentElement)
        .getPropertyValue("--sidebar-width")
        .trim();
        if (initialWidth) {
        setSidebarWidth(initialWidth);
        }

        return () => observer.disconnect();
    }, []);

    const isMainDashboard =
        location.pathname === "/student" || location.pathname === "/student/";

    return (
        <div className="flex h-screen bg-background">
        <StudentSidebar />

        <div
            className="flex-1 overflow-y-auto transition-all duration-300"
            style={{ marginLeft: window.innerWidth >= 1024 ? sidebarWidth : "0" }}
        >
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-background rounded-3xl shadow-md border border-gray-100 p-8 min-h-[400px] font-Outfit">
                    {isMainDashboard ? (
                    <div className="px-2 py-6 md:p-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-title">
                        Welcome, {userDoc?.name || "Student"}!
                        </h1>
                        <p className="text-md text-subtext font-light mb-6">
                        Your personalized hub for learning and progress.
                        </p>

                        {/* Join Live Quiz Section */}
                        <section className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-3xl shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Zap className="w-8 h-8 text-white" />
                            <div>
                            <h3 className="text-2xl font-bold text-white">Join Live Quiz</h3>
                            <p className="text-purple-100 text-sm">
                                Enter the quiz code from your teacher
                            </p>
                            </div>
                        </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        <input
                        type="text"
                        value={quizCode}
                        onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === "Enter" && handleJoinWithCode()}
                        placeholder="Enter Quiz Code (e.g., ABC123)"
                        maxLength={6}
                        className="flex-1 px-6 py-4 text-lg font-bold tracking-widest uppercase text-center border-4 border-purple-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-500 bg-white"
                        />
                        <button
                        onClick={handleJoinWithCode}
                        disabled={joiningQuiz || !quizCode.trim()}
                        className="px-8 py-4 bg-white text-purple-700 rounded-xl font-bold text-lg hover:bg-purple-50 transition disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                        {joiningQuiz ? (
                            <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Joining...
                            </>
                        ) : (
                            <>
                            <LogIn className="w-6 h-6" />
                            Join Quiz
                            </>
                        )}
                        </button>
                    </div>

                    <div className="mt-4 p-4 bg-purple-500 bg-opacity-30 rounded-lg">
                        <p className="text-sm text-white">
                        <strong>Note:</strong> Your teacher will provide you with a
                        6-character quiz code. Enter it above to join the live quiz
                        session.
                        </p>
                    </div>
                    </section>

                    <section className="flex flex-col mt-8 bg-components rounded-3xl shadow-md p-6">
                        <div className="flex flex-row gap-4 mb-4 items-center">
                            <Medal className="w-8 h-8 text-yellow-500" />
                            <div className="flex flex-col">
                            <h1 className="text-xl font-semibold text-title">Leaderboards</h1>
                            <p className="font-light text-subtext">Ranking based on your previous quiz.</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <div className="py-4 px-2 bg-gray-100 rounded-2xl">
                                    1st Place - Jane Doe
                                </div>
                                <div className="py-4 px-2 bg-gray-100 rounded-2xl">
                                    2nd Place - Jane Doe
                                </div>
                                <div className="py-4 px-2 bg-gray-100 rounded-2xl">
                                    3rd Place - Jane Doe
                                </div>
                            </div>
                        </div>
                        
                    </section>
                </div>
                ) : (
                <Outlet />
                )}
            </div>
            </div>
        </div>
        </div>
    );
    }
