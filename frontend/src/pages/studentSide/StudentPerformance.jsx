// StudentPerformance.jsx - Updated with clickable quiz history
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase/firebaseConfig";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import {
    BookOpen, Clock, CheckCircle, AlertCircle, Loader2, BarChart3, TrendingUp, Zap, NotebookPen, Lightbulb, X, ChevronRight, Brain, Award
} from "lucide-react";
import { AnalyticsSkeleton } from "../../components/SkeletonLoaders";

export default function StudentPerformance({ user, userDoc }) {
    const navigate = useNavigate();
    const [assignedQuizzes, setAssignedQuizzes] = useState([]);
    const [quizSubmissions, setQuizSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quizCode, setQuizCode] = useState("");
    const [joiningQuiz, setJoiningQuiz] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [analytics, setAnalytics] = useState({
        totalQuizzes: 0,
        completedQuizzes: 0,
        asyncQuizzes: { completed: 0, total: 0, avgScore: 0 },
        syncQuizzes: { completed: 0, total: 0, avgScore: 0 },
        overallAvgScore: 0,
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (user && userDoc) {
            const loadData = async () => {
                setLoading(true);
                await Promise.all([fetchAssignedQuizzes(), fetchQuizSubmissions()]);
                setLoading(false);
            };
            loadData();
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
            setQuizSubmissions(submissions);
        } catch (error) {
            console.error("❌ ERROR FETCHING SUBMISSIONS:", error);
        }
    };

    const fetchAssignedQuizzes = async () => {
        try {
            const currentUser = auth.currentUser;

            if (!currentUser) {
                console.log("❌ WALANG LOGGED IN USER");
                return;
            }

            const assignedRef = collection(db, "assignedQuizzes");
            const q = query(
                assignedRef,
                where("studentId", "==", currentUser.uid)
            );

            const snapshot = await getDocs(q);

            const quizzes = [];

            snapshot.forEach((doc) => {
                const data = doc.data();

                if (data.quizMode === "asynchronous") {
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
                }
            });

            quizzes.sort((a, b) => {
                if (a.completed !== b.completed) {
                    return a.completed ? 1 : -1;
                }
                if (a.dueDate && b.dueDate) {
                    return new Date(a.dueDate) - new Date(b.dueDate);
                }
                return 0;
            });

            setAssignedQuizzes(quizzes);
        } catch (error) {
            console.error("❌ ERROR FETCHING QUIZZES:", error);
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

    const openQuizDetail = (submission) => {
        setSelectedQuiz(submission);
        setShowDetailModal(true);
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
            <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                <BookOpen className="w-3 h-3" /> Pending
            </span>
        );
    };

    const getScoreColor = (score) => {
        if (score >= 85) return "text-green-600";
        if (score >= 75) return "text-green-600";
        if (score >= 60) return "text-yellow-600";
        return "text-red-600";
    };

    const getScoreBgColor = (score) => {
        if (score >= 85) return "bg-green-50";
        if (score >= 75) return "bg-green-50";
        if (score >= 60) return "bg-yellow-50";
        return "bg-red-50";
    };

    const getGradeRemark = (score) => {
        if (score >= 90) return "Excellent!";
        if (score >= 85) return "Very Good!";
        if (score >= 80) return "Good!";
        if (score >= 75) return "Passed";
        return "Needs Improvement";
    };

    return (
        <div className="px-4 py-4 sm:px-3 sm:py-4 md:p-4 lg:px-5 lg:py-6 font-Poppins animate-fadeIn">
            {/* Header Card */}
            <div className="relative bg-green-600 rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_6px_25px_rgb(0,0,0,0.15)] transition-all overflow-hidden p-5 md:p-6 group text-white border border-green-500 mb-4">
                {/* Background blob */}
                <div className="absolute -top-16 -right-16 w-64 h-64 bg-white rounded-full opacity-10 transition-transform group-hover:scale-110 pointer-events-none" />
                <div className="relative z-10">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Performance</h1>
                    <p className="text-green-100 mt-1">View your recent performance here.</p>
                </div>
            </div>

            {loading ? (
                <AnalyticsSkeleton />
            ) : (
                /* Quiz Analytics Section */
                <section className="bg-components rounded-2xl border border-green-500 p-4 sm:p-5 animate-slideIn" >
                    {analytics.totalQuizzes === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                            <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p className="text-gray-500">
                                Complete quizzes to see your performance
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-slideIn">
                            {/* Summary Card */}
                            <div className="bg-gradient-to-r from-green-600 to-green-400 rounded-xl p-5 text-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white text-sm font-semibold">Overall Average</p>
                                        <p className="text-3xl font-bold mt-1">{analytics.overallAvgScore}%</p>
                                        <p className="text-white text-xs mt-2">
                                            {analytics.totalQuizzes} quiz{analytics.totalQuizzes !== 1 ? "zes" : ""} taken
                                        </p>
                                    </div>
                                    <TrendingUp className="w-16 h-16 opacity-50 mr-4 animate-bounceIn" />
                                </div>
                            </div>

                            {/* Quiz Breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {analytics.asyncQuizzes.completed > 0 && (
                                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Lightbulb className="w-5 h-5 text-green-600" />
                                                <span className="font-semibold text-gray-800 text-sm">Asynchronous Quiz</span>
                                            </div>
                                            <span className="text-xl font-bold text-green-700">{analytics.asyncQuizzes.avgScore}%</span>
                                        </div>
                                        <p className="text-xs text-gray-600">{analytics.asyncQuizzes.completed} quiz{analytics.asyncQuizzes.completed !== 1 ? "zes" : ""}</p>
                                    </div>
                                )}

                                {analytics.syncQuizzes.completed > 0 && (
                                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Zap className="w-5 h-5 text-yellow-600" />
                                                <span className="font-semibold text-gray-800 text-sm">Synchronous Quiz</span>
                                            </div>
                                            <span className="text-xl font-bold text-yellow-700">{analytics.syncQuizzes.avgScore}%</span>
                                        </div>
                                        <p className="text-xs text-gray-600">{analytics.syncQuizzes.completed} quiz{analytics.syncQuizzes.completed !== 1 ? "zes" : ""}</p>
                                    </div>
                                )}
                            </div>

                            {/* Individual Quiz Scores - CLICKABLE */}
                            {quizSubmissions.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 mb-3">Quiz History</h4>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {quizSubmissions
                                            .sort((a, b) => {
                                                const dateA = a.submittedAt?.seconds || 0;
                                                const dateB = b.submittedAt?.seconds || 0;
                                                return dateB - dateA;
                                            })
                                            .map((submission, index) => (
                                                <div
                                                    key={submission.id}
                                                    onClick={() => openQuizDetail(submission)}
                                                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition cursor-pointer hover:shadow-lg hover:border-green-300 ${getScoreBgColor(submission.base50ScorePercentage || 0)} border-gray-200`}
                                                >
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <p className="text-sm font-bold text-gray-900 mb-1">
                                                            {submission.quizTitle || `Quiz #${index + 1}`}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                                            <div className="flex items-center gap-1">
                                                                {submission.quizMode === "asynchronous" ? (
                                                                    <Lightbulb className="w-3 h-3 text-green-600" />
                                                                ) : (
                                                                    <Zap className="w-3 h-3 text-yellow-600" />
                                                                )}
                                                                <span className="font-medium">
                                                                    {submission.quizMode === "asynchronous" ? "Asynchronous" : "Synchronous"}
                                                                </span>
                                                            </div>
                                                            {submission.className && (
                                                                <>
                                                                    <span className="text-gray-400">•</span>
                                                                    <span>{submission.className}</span>
                                                                </>
                                                            )}
                                                            {submission.submittedAt && (
                                                                <>
                                                                    <span className="text-gray-400">•</span>
                                                                    <span className="text-gray-500">
                                                                        {new Date(submission.submittedAt.seconds * 1000).toLocaleDateString("en-PH", {
                                                                            month: "short",
                                                                            day: "numeric",
                                                                            year: "numeric"
                                                                        })}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className={`text-xl font-bold ${getScoreColor(submission.base50ScorePercentage || 0)}`}>
                                                            {submission.base50ScorePercentage || 0}%
                                                        </p>
                                                        <p className="text-xs text-gray-600 font-medium mt-1">
                                                            {submission.correctPoints || 0}/{submission.totalPoints || 0} pts
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
            )}

            {/* Detailed Quiz Modal */}
            {mounted && showDetailModal && selectedQuiz && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm animate-overlayFade font-Poppins">
                    <div
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none'
                        }}
                        className="bg-white animate-popIn rounded-2xl shadow-2xl w-[98vw] sm:w-[95vw] md:w-full md:max-w-4xl max-h-[92vh] overflow-y-auto [&::-webkit-scrollbar]:hidden"
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-green-800 to-green-500 p-6 text-white sticky top-0 z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Award className="w-8 h-8" />
                                <div>
                                    <h2 className="text-xl font-bold">{selectedQuiz.quizTitle}</h2>
                                    <p className="text-indigo-100 text-sm">{selectedQuiz.className}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="hover:bg-green-700 hover:bg-opacity-20 p-2 rounded-lg transition"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Score Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200">
                                    <p className="text-xs text-gray-600 font-semibold mb-1">Final Score</p>
                                    <p className={`text-2xl font-bold ${getScoreColor(selectedQuiz.base50ScorePercentage)}`}>
                                        {selectedQuiz.base50ScorePercentage}%
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">{selectedQuiz.remark}</p>
                                </div>

                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200">
                                    <p className="text-xs text-gray-600 font-semibold mb-1">Raw Score</p>
                                    <p className="text-2xl font-bold text-green-600">{selectedQuiz.rawScorePercentage}%</p>
                                    <p className="text-xs text-gray-500 mt-2">{selectedQuiz.correctPoints}/{selectedQuiz.totalPoints}</p>
                                </div>

                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200">
                                    <p className="text-xs text-gray-600 font-semibold mb-1">Questions</p>
                                    <p className="text-2xl font-bold text-purple-600">{selectedQuiz.totalQuestions}</p>
                                    <p className="text-xs text-gray-500 mt-2">Total Items</p>
                                </div>
                            </div>

                            {/* Quiz Details */}
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between">
                                    <span className="font-semibold text-gray-700">Submitted:</span>
                                    <span className="text-gray-600">
                                        {selectedQuiz.submittedAt ? new Date(selectedQuiz.submittedAt.seconds * 1000).toLocaleString("en-PH") : "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold text-gray-700">Quiz Mode:</span>
                                    <span className="text-gray-600 capitalize">{selectedQuiz.quizMode}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold text-gray-700">Subject:</span>
                                    <span className="text-gray-600">{selectedQuiz.subject || "N/A"}</span>
                                </div>
                            </div>

                            {/* Recommendations */}
                            {selectedQuiz.recommendations && selectedQuiz.recommendations.length > 0 && (
                                <div className="bg-gradient-to-br from-purple-50 to-purple-50 p-4 rounded-lg border-2 border-purple-100">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Brain className="w-5 h-5 text-purple-500" />
                                        <h3 className="font-bold text-title">AI Study Recommendations</h3>
                                        <span className="ml-auto text-xs bg-purple-400 text-white px-2 py-1 rounded-full">
                                            {selectedQuiz.recommendations.length} Tips
                                        </span>
                                    </div>
                                    <p className="text-xs text-subtext mb-3">Personalized based on your performance</p>
                                    <div className="space-y-2">
                                        {selectedQuiz.recommendations.map((rec, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-start gap-3 p-3 bg-white rounded-lg border-l-4 border-purple-400 hover:shadow-md transition"
                                            >
                                                <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-purple-500 to-purple-400 text-white rounded-full flex items-center justify-center font-bold text-xs flex-none">
                                                    {idx + 1}
                                                </span>
                                                <p className="text-sm text-subtext leading-relaxed pt-0.5">{rec}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}


                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 p-6 border-t flex gap-3">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400  active:scale-95 hover:scale-105 text-title font-bold rounded-lg transition"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    setShowDetailModal(false);
                                    navigate("/student");
                                }}
                                className="flex-1 px-4 py-2 bg-button hover:bg-buttonHover  active:scale-95 hover:scale-105 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
                            >
                                Back to Dashboard
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}