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
  Megaphone,
  AlertTriangle,
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

  // Announcements
  const [announcements, setAnnouncements] = useState([]);

  // Live clock
  const [currentTime, setCurrentTime] = useState(new Date());

  const teacherId = user?.uid;

  // Fetch announcements for teachers
  useEffect(() => {
    if (!isMainDashboard) return;
    const fetchAnnouncements = async () => {
      try {
        const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((a) => a.targetAudience === "all" || a.targetAudience === "teachers");
        setAnnouncements(data);
      } catch (error) {
        console.error("Error fetching announcements:", error);
      }
    };
    fetchAnnouncements();
  }, [isMainDashboard]);

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
    <div className="w-full">
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
        <div className="w-full px-6 md:px-3 lg:px-6 py-6 font-Poppins">
          {isMainDashboard ? (
            isInitialLoading ? (
              <DashboardSkeleton />
            ) : (
              <div className="w-full">
                {/* Header with greeting */}
                {/* Header with greeting */}
                {/* Header with greeting */}
                <div className="relative bg-blue-600 rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_6px_25px_rgb(0,0,0,0.15)] transition-all overflow-hidden p-6 md:p-8 group text-white border border-blue-500 flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4 animate-fadeIn">
                  {/* Background blob design */}
                  <div className="absolute -top-16 -right-16 w-64 h-64 bg-white rounded-full opacity-10 transition-transform group-hover:scale-110 pointer-events-none" />

                  <div className="relative z-10">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                      {getGreeting()},{" "}
                      {userDoc?.firstName || user?.displayName || "Teacher"}!
                    </h1>
                    <p className="text-sm md:text-base text-blue-100 mt-1">
                      Manage your classes, quizzes, and view student performance analytics
                    </p>
                  </div>
                  <div className="relative z-10 flex items-center gap-3 text-sm text-blue-100 bg-blue-700/30 px-4 py-2 rounded-xl backdrop-blur-sm border border-blue-500/30">
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

                {/* Announcement Banners */}
                {announcements.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className={`flex items-start gap-3 p-4 rounded-xl border transition-all animate-slideIn font-Poppins ${
                          ann.priority === "urgent"
                            ? "bg-red-50 border-red-200 text-red-800"
                            : "bg-blue-50 border-blue-200 text-blue-800"
                        }`}
                      >
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          ann.priority === "urgent" ? "bg-red-100" : "bg-blue-100"
                        }`}>
                          {ann.priority === "urgent" ? (
                            <AlertTriangle size={18} className="text-red-600" />
                          ) : (
                            <Megaphone size={18} className="text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm">{ann.title}</h4>
                          <p className="text-sm opacity-80 mt-0.5 whitespace-pre-wrap text-justify">{ann.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Stat Cards - 4 cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
                  {/* Classes Card */}
                  <div className="relative bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition-all overflow-hidden p-6 group">
                    <div className="absolute -top-16 -right-16 w-52 h-52 bg-blue-100 rounded-full opacity-60 transition-transform group-hover:scale-110 pointer-events-none" />
                    <div className="relative z-10 flex flex-col h-full gap-3">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                          <School className="w-5 h-5 text-blue-700" strokeWidth={2.5} />
                        </div>
                        <h3 className="font-bold text-[#0f172a] text-base leading-tight line-clamp-2">
                          Total Classes
                        </h3>
                      </div>

                      <div className="flex items-baseline mt-1">
                        <h2 className="text-3xl font-extrabold text-[#0f172a]">
                          {totalClasses}
                        </h2>
                      </div>
                      <p className="text-[#475569] text-sm leading-relaxed line-clamp-2 mt-auto">
                        Active classes
                      </p>
                    </div>
                  </div>

                  {/* Quizzes Card */}
                  <div className="relative bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition-all overflow-hidden p-6 group">
                    <div className="absolute -top-16 -right-16 w-52 h-52 bg-emerald-100 rounded-full opacity-60 transition-transform group-hover:scale-110 pointer-events-none" />
                    <div className="relative z-10 flex flex-col h-full gap-3">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                          <NotebookPen className="w-5 h-5 text-emerald-700" strokeWidth={2.5} />
                        </div>
                        <h3 className="font-bold text-[#0f172a] text-base leading-tight line-clamp-2">
                          Total Quizzes
                        </h3>
                      </div>

                      <div className="flex items-baseline mt-1">
                        <h2 className="text-3xl font-extrabold text-[#0f172a]">
                          {totalQuizzes}
                        </h2>
                      </div>
                      <p className="text-[#475569] text-sm leading-relaxed line-clamp-2 mt-auto">
                        Created quizzes
                      </p>
                    </div>
                  </div>

                  {/* Students Card */}
                  <div className="relative bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition-all overflow-hidden p-6 group">
                    <div className="absolute -top-16 -right-16 w-52 h-52 bg-[#f3e8ff] rounded-full opacity-60 transition-transform group-hover:scale-110 pointer-events-none" />
                    <div className="relative z-10 flex flex-col h-full gap-3">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-[#f3e8ff] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                          <Users className="w-5 h-5 text-[#6b21a8]" strokeWidth={2.5} />
                        </div>
                        <h3 className="font-bold text-[#0f172a] text-base leading-tight line-clamp-2">
                          Total Students
                        </h3>
                      </div>

                      <div className="flex items-baseline mt-1">
                        <h2 className="text-3xl font-extrabold text-[#0f172a]">
                          {totalStudents}
                        </h2>
                      </div>
                      <p className="text-[#475569] text-sm leading-relaxed line-clamp-2 mt-auto">
                        Enrolled students
                      </p>
                    </div>
                  </div>

                  {/* Average Score Card */}
                  <div className="relative bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition-all overflow-hidden p-6 group">
                    <div className="absolute -top-16 -right-16 w-52 h-52 bg-[#fef3c7] rounded-full opacity-60 transition-transform group-hover:scale-110 pointer-events-none" />
                    <div className="relative z-10 flex flex-col h-full gap-3">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                          <TrendingUp className="w-5 h-5 text-[#92400e]" strokeWidth={2.5} />
                        </div>
                        <h3 className="font-bold text-[#0f172a] text-base leading-tight line-clamp-2">
                          Average Score
                        </h3>
                      </div>

                      <div className="flex items-baseline mt-1">
                        <h2 className="text-3xl font-extrabold text-[#0f172a]">
                          {averageScore !== null ? (
                            <span>
                              {averageScore}
                              <span className="text-xl text-gray-500 font-bold">%</span>
                            </span>
                          ) : (
                            <span className="text-2xl text-gray-400">N/A</span>
                          )}
                        </h2>
                      </div>
                      <p className="text-[#475569] text-sm leading-relaxed line-clamp-2 mt-auto">
                        Overall performance
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-6">
                  <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2 animate-fadeIn">
                    <Sparkles size={20} className="text-gray-400" />
                    Quick Actions
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-fadeIn">
                    <button
                      onClick={() => navigate("/teacher/quizzes")}
                      className="relative overflow-hidden group flex flex-col items-start text-left bg-white border border-gray-100 p-6 rounded-[20px] shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-50 transition-opacity duration-500 z-0" />

                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 z-10 shadow-sm border border-blue-100 group-hover:border-transparent">
                        <PlusCircle size={28} />
                      </div>

                      <div className="mt-5 z-10">
                        <h3 className="font-bold text-gray-800 text-base group-hover:text-blue-600 transition-colors">Create Quiz</h3>
                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">Generate dynamically via AI or build manually</p>
                      </div>

                      <div className="mt-4 flex items-center gap-1.5 text-sm font-bold text-blue-600 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-10">
                        Get Started <ArrowRight size={16} />
                      </div>
                    </button>

                    <button
                      onClick={() => navigate("/teacher/classes/add")}
                      className="relative overflow-hidden group flex flex-col items-start text-left bg-white border border-gray-100 p-6 rounded-[20px] shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-50 transition-opacity duration-500 z-0" />

                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 z-10 shadow-sm border border-emerald-100 group-hover:border-transparent">
                        <BookOpen size={28} />
                      </div>

                      <div className="mt-5 z-10">
                        <h3 className="font-bold text-gray-800 text-base group-hover:text-emerald-600 transition-colors">Create Class</h3>
                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">Add a new class section and enroll students</p>
                      </div>

                      <div className="mt-4 flex items-center gap-1.5 text-sm font-bold text-emerald-600 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-10">
                        Enroll Now <ArrowRight size={16} />
                      </div>
                    </button>

                    <button
                      onClick={() => navigate("/teacher/reports")}
                      className="relative overflow-hidden group flex flex-col items-start text-left bg-white border border-gray-100 p-6 rounded-[20px] shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-50 transition-opacity duration-500 z-0" />

                      <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 z-10 shadow-sm border border-violet-100 group-hover:border-transparent">
                        <BarChart3 size={28} />
                      </div>

                      <div className="mt-5 z-10">
                        <h3 className="font-bold text-gray-800 text-base group-hover:text-violet-600 transition-colors">View Reports</h3>
                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">Analyze performance, scores, and growth</p>
                      </div>

                      <div className="mt-4 flex items-center gap-1.5 text-sm font-bold text-violet-600 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-10">
                        Analytics <ArrowRight size={16} />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Bottom Section: Recent Quizzes + Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8 animate-fadeIn">
                  {/* Recent Quizzes - takes 3/5 */}
                  <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                      <h3 className="font-semibold text-gray-700 text-base flex items-center gap-2">
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
                      <h3 className="font-semibold text-gray-700 text-base flex items-center gap-2">
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