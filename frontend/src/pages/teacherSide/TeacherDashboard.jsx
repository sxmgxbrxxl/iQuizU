import TeacherSidebar from "../../components/TeacherSidebar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import {
  School,
  NotebookPen,
  Users,
  TrendingUp,
  PlusCircle,
  BookOpen,
  BarChart3,
  Clock,
  FileText,
  ArrowRight,
  Trophy,
  CalendarDays,
  Sparkles,
} from "lucide-react";

export default function TeacherDashboard({ user, userDoc }) {
  const [sidebarWidth, setSidebarWidth] = useState("288px");
  const location = useLocation();
  const navigate = useNavigate();

  const isMainDashboard =
    location.pathname === "/teacher" || location.pathname === "/teacher/";

  const [totalClasses, setTotalClasses] = useState(0);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [averageScore, setAverageScore] = useState(null);

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingAvgScore, setLoadingAvgScore] = useState(true);

  // Recent quizzes
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // Recent activity
  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Live clock
  const [currentTime, setCurrentTime] = useState(new Date());

  const teacherId = user?.uid;

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getFormattedDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Fetch total classes
  useEffect(() => {
    if (!teacherId) {
      setLoadingClasses(false);
      return;
    }

    if (!isMainDashboard) return;

    setLoadingClasses(true);
    const q = query(collection(db, "classes"), where("teacherId", "==", teacherId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setTotalClasses(snapshot.size);
        setLoadingClasses(false);
      },
      (error) => {
        console.error("Error fetching classes:", error);
        setLoadingClasses(false);
      }
    );

    return () => unsubscribe();
  }, [teacherId, location.pathname]);

  // Fetch total quizzes
  useEffect(() => {
    if (!teacherId) {
      setLoadingQuizzes(false);
      return;
    }

    if (!isMainDashboard) return;

    setLoadingQuizzes(true);
    const q = query(collection(db, "quizzes"), where("teacherId", "==", teacherId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setTotalQuizzes(snapshot.size);
        setLoadingQuizzes(false);
      },
      (error) => {
        console.error("Error fetching quizzes:", error);
        setLoadingQuizzes(false);
      }
    );

    return () => unsubscribe();
  }, [teacherId, location.pathname]);

  // Fetch total students
  useEffect(() => {
    if (!teacherId) {
      setLoadingStudents(false);
      return;
    }

    if (!isMainDashboard) return;

    setLoadingStudents(true);
    const q = query(collection(db, "classes"), where("teacherId", "==", teacherId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let totalStudentCount = 0;
        snapshot.forEach((doc) => {
          totalStudentCount += doc.data().studentCount || 0;
        });
        setTotalStudents(totalStudentCount);
        setLoadingStudents(false);
      },
      (error) => {
        console.error("Error fetching students:", error);
        setLoadingStudents(false);
      }
    );

    return () => unsubscribe();
  }, [teacherId, location.pathname]);

  // Fetch average score from quizSubmissions
  useEffect(() => {
    if (!teacherId) {
      setLoadingAvgScore(false);
      return;
    }

    if (!isMainDashboard) return;

    const fetchAverageScore = async () => {
      setLoadingAvgScore(true);
      try {
        // First get all quizzes by this teacher
        const quizzesQ = query(
          collection(db, "quizzes"),
          where("teacherId", "==", teacherId)
        );
        const quizzesSnap = await getDocs(quizzesQ);
        const quizIds = quizzesSnap.docs.map((d) => d.id);

        if (quizIds.length === 0) {
          setAverageScore(null);
          setLoadingAvgScore(false);
          return;
        }

        // Fetch submissions in batches of 10 (Firestore 'in' limit)
        let totalScore = 0;
        let totalSubmissions = 0;

        for (let i = 0; i < quizIds.length; i += 10) {
          const batch = quizIds.slice(i, i + 10);
          const subsQ = query(
            collection(db, "quizSubmissions"),
            where("quizId", "in", batch)
          );
          const subsSnap = await getDocs(subsQ);
          subsSnap.forEach((doc) => {
            const data = doc.data();
            if (data.rawScorePercentage != null) {
              totalScore += data.rawScorePercentage;
              totalSubmissions++;
            }
          });
        }

        if (totalSubmissions > 0) {
          setAverageScore(Math.round(totalScore / totalSubmissions));
        } else {
          setAverageScore(null);
        }
      } catch (error) {
        console.error("Error fetching average score:", error);
        setAverageScore(null);
      } finally {
        setLoadingAvgScore(false);
      }
    };

    fetchAverageScore();
  }, [teacherId, location.pathname]);

  // Fetch recent quizzes
  useEffect(() => {
    if (!teacherId) {
      setLoadingRecent(false);
      return;
    }

    if (!isMainDashboard) return;

    setLoadingRecent(true);
    const q = query(
      collection(db, "quizzes"),
      where("teacherId", "==", teacherId),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const quizzes = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            title: d.title,
            questionCount: d.questions?.length || 0,
            totalPoints: d.totalPoints || 0,
            createdAt: d.createdAt,
            status: d.status || "published",
          };
        });
        setRecentQuizzes(quizzes);
        setLoadingRecent(false);
      },
      (error) => {
        console.error("Error fetching recent quizzes:", error);
        setLoadingRecent(false);
      }
    );

    return () => unsubscribe();
  }, [teacherId, location.pathname]);

  // Fetch recent activity (assigned quizzes)
  useEffect(() => {
    if (!teacherId) {
      setLoadingActivity(false);
      return;
    }

    if (!isMainDashboard) return;

    setLoadingActivity(true);
    const q = query(
      collection(db, "assignedQuizzes"),
      where("assignedBy", "==", teacherId),
      orderBy("assignedAt", "desc"),
      limit(8)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activities = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            quizTitle: d.quizTitle,
            className: d.className,
            assignedAt: d.assignedAt,
            quizMode: d.quizMode || "asynchronous",
            dueDate: d.dueDate,
          };
        });

        // Deduplicate by quiz+class combo, keep latest
        const seen = new Map();
        activities.forEach((a) => {
          const key = `${a.quizTitle}-${a.className}`;
          if (!seen.has(key)) {
            seen.set(key, a);
          }
        });

        setRecentActivity(Array.from(seen.values()).slice(0, 5));
        setLoadingActivity(false);
      },
      (error) => {
        console.error("Error fetching activity:", error);
        setLoadingActivity(false);
      }
    );

    return () => unsubscribe();
  }, [teacherId, location.pathname]);

  // Sidebar width handling
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



  const isInitialLoading =
    loadingClasses || loadingQuizzes || loadingStudents || loadingAvgScore || loadingRecent || loadingActivity;

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Skeleton component
  const Skeleton = ({ className = "" }) => (
    <div className={`bg-gray-200 rounded-lg animate-pulse ${className}`}></div>
  );

  // Full-page skeleton
  const DashboardSkeleton = () => (
    <div className="px-2 py-6 md:p-8">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-8">
        <div>
          <Skeleton className="h-8 md:h-9 w-72 md:w-96 mb-3" />
          <Skeleton className="h-5 w-80 md:w-[28rem]" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="relative bg-white border border-gray-100 p-6 rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full opacity-80"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-10 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="w-14 h-14 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div className="mt-8">
        <Skeleton className="h-6 w-36 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-2xl shadow-sm"
            >
              <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
        {/* Recent Quizzes Skeleton */}
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="p-6 space-y-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Skeleton */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="p-6 space-y-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      <TeacherSidebar user={user} userDoc={userDoc} />

      <div
        className="flex-1 overflow-y-auto transition-all duration-300 pt-16"
        style={{ marginLeft: window.innerWidth >= 1024 ? sidebarWidth : "0" }}
      >
        <div className="max-w-7xl mx-auto p-6 font-Outfit">
          {isMainDashboard ? (
            isInitialLoading ? (
              <DashboardSkeleton />
            ) : (
              <div className="px-2 py-6 md:p-8">
                {/* Header with greeting */}
                {/* Header with greeting */}
                {/* Header with greeting */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold">
                      {getGreeting()},{" "}
                      {userDoc?.firstName || user?.displayName || "Teacher"}! 👋
                    </h1>
                    <p className="text-md md:text-lg text-blue-100 mt-1">
                      Manage your classes, quizzes, and view student performance
                      analytics
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-blue-100 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={16} />
                      <span>{getFormattedDate()}</span>
                    </div>
                    <span className="text-blue-200">|</span>
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span className="font-medium tabular-nums">
                        {currentTime.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stat Cards - 4 cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* Classes Card */}
                  <div className="group relative bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full opacity-80"></div>
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Total Classes
                        </p>
                        <h2 className="text-4xl font-extrabold text-gray-800 mt-2">
                          {totalClasses}
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">Active classes</p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                        <School className="h-7 w-7 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Quizzes Card */}
                  <div className="group relative bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-50 to-transparent rounded-bl-full opacity-80"></div>
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Total Quizzes
                        </p>
                        <h2 className="text-4xl font-extrabold text-gray-800 mt-2">
                          {totalQuizzes}
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">Created quizzes</p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                        <NotebookPen className="h-7 w-7 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Students Card */}
                  <div className="group relative bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-violet-50 to-transparent rounded-bl-full opacity-80"></div>
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Total Students
                        </p>
                        <h2 className="text-4xl font-extrabold text-gray-800 mt-2">
                          {totalStudents}
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">Enrolled students</p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform duration-300">
                        <Users className="h-7 w-7 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Average Score Card */}
                  <div className="group relative bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-50 to-transparent rounded-bl-full opacity-80"></div>
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Avg. Score
                        </p>
                        <h2 className="text-4xl font-extrabold text-gray-800 mt-2">
                          {averageScore !== null ? (
                            <span>
                              {averageScore}
                              <span className="text-xl text-gray-400 font-bold">%</span>
                            </span>
                          ) : (
                            <span className="text-2xl text-gray-300">N/A</span>
                          )}
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">Overall performance</p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                        <TrendingUp className="h-7 w-7 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Sparkles size={20} className="text-gray-400" />
                    Quick Actions
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      onClick={() => navigate("/teacher/quizzes")}
                      className="group flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-lg hover:bg-blue-50 hover:border-blue-200 active:bg-blue-100 hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <PlusCircle size={20} className="text-blue-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm text-gray-700">Create Quiz</p>
                        <p className="text-xs text-gray-400">Generate or build a new quiz</p>
                      </div>
                      <ArrowRight
                        size={16}
                        className="ml-auto text-gray-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                      />
                    </button>

                    <button
                      onClick={() => navigate("/teacher/classes/add")}
                      className="group flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-lg hover:bg-blue-50 hover:border-blue-200 active:bg-blue-100 hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <BookOpen size={20} className="text-emerald-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm text-gray-700">Create Class</p>
                        <p className="text-xs text-gray-400">Add a new class section</p>
                      </div>
                      <ArrowRight
                        size={16}
                        className="ml-auto text-gray-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                      />
                    </button>

                    <button
                      onClick={() => navigate("/teacher/reports")}
                      className="group flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-lg hover:bg-blue-50 hover:border-blue-200 active:bg-blue-100 hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <BarChart3 size={20} className="text-violet-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm text-gray-700">View Reports</p>
                        <p className="text-xs text-gray-400">Analytics & performance</p>
                      </div>
                      <ArrowRight
                        size={16}
                        className="ml-auto text-gray-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                      />
                    </button>
                  </div>
                </div>

                {/* Bottom Section: Recent Quizzes + Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
                  {/* Recent Quizzes - takes 3/5 */}
                  <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                      <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <FileText size={18} className="text-blue-500" />
                        Recent Quizzes
                      </h3>
                      <button
                        onClick={() => navigate("/teacher/quizzes")}
                        className="text-sm text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
                      >
                        View all <ArrowRight size={14} />
                      </button>
                    </div>

                    {recentQuizzes.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                          <NotebookPen size={28} className="text-gray-300" />
                        </div>
                        <p className="text-gray-400 text-sm font-medium">
                          No quizzes yet
                        </p>
                        <p className="text-gray-300 text-xs mt-1">
                          Create your first quiz to get started
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {recentQuizzes.map((quiz) => (
                          <div
                            key={quiz.id}
                            onClick={() => navigate(`/teacher/edit-quiz/${quiz.id}`)}
                            className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 cursor-pointer transition-colors group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <NotebookPen size={18} className="text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-700 truncate">
                                {quiz.title}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {quiz.questionCount} questions · {quiz.totalPoints} pts
                                {quiz.createdAt && (
                                  <span> · {formatTimeAgo(quiz.createdAt)}</span>
                                )}
                              </p>
                            </div>
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                              {quiz.status === "published" ? "Published" : quiz.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Activity - takes 2/5 */}
                  <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50">
                      <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <Clock size={18} className="text-violet-500" />
                        Recent Activity
                      </h3>
                    </div>

                    {recentActivity.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                          <Clock size={28} className="text-gray-300" />
                        </div>
                        <p className="text-gray-400 text-sm font-medium">
                          No recent activity
                        </p>
                        <p className="text-gray-300 text-xs mt-1">
                          Assign quizzes to see activity here
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {recentActivity.map((activity, index) => (
                          <div
                            key={activity.id || index}
                            className="flex items-start gap-3 px-6 py-4 hover:bg-gray-50/50 transition-colors"
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activity.quizMode === "synchronous"
                                ? "bg-amber-50"
                                : "bg-blue-50"
                                }`}
                            >
                              {activity.quizMode === "synchronous" ? (
                                <Trophy size={15} className="text-amber-500" />
                              ) : (
                                <FileText size={15} className="text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold">{activity.quizTitle}</span>
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Assigned to{" "}
                                <span className="font-medium text-gray-500">
                                  {activity.className}
                                </span>
                                {activity.quizMode === "synchronous" && (
                                  <span className="ml-1.5 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-bold uppercase">
                                    Live
                                  </span>
                                )}
                              </p>
                              {activity.assignedAt && (
                                <p className="text-[11px] text-gray-300 mt-1">
                                  {formatTimeAgo(activity.assignedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
}