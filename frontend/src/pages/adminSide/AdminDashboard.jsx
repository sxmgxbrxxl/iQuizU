import AdminSidebar from "../../components/AdminSideBar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  CalendarDays, 
  Clock, 
  Users, 
  GraduationCap, 
  TrendingUp, 
  UserPlus, 
  ArrowRight, 
  Activity,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

export default function AdminDashboard() {
  const [sidebarWidth, setSidebarWidth] = useState("288px");
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [totalStudents, setTotalStudents] = useState(0);
  const [totalTeachers, setTotalTeachers] = useState(0);

  const isMainDashboard = location.pathname === "/admin/dashboard" || location.pathname === "/admin";

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isMainDashboard) return;
    
    const stuQuery = query(collection(db, "users"), where("role", "==", "student"));
    const unsubStu = onSnapshot(stuQuery, (snap) => setTotalStudents(snap.size));

    const teaQuery = query(collection(db, "users"), where("role", "==", "teacher"));
    const unsubTea = onSnapshot(teaQuery, (snap) => setTotalTeachers(snap.size));

    return () => {
      unsubStu();
      unsubTea();
    };
  }, [isMainDashboard]);

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

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />

      <div className="flex-1 overflow-y-auto transition-all duration-300 pt-16"
        style={{ marginLeft: window.innerWidth >= 1024 ? sidebarWidth : "0" }}
      >
        <div className="w-full px-6 md:px-3 lg:px-6 py-6 font-Poppins">
            {isMainDashboard ? (
              <div className="w-full animate-fadeIn">
                {/* Header Banner */}
                <div className="relative bg-indigo-600 rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_6px_25px_rgb(0,0,0,0.15)] transition-all overflow-hidden p-6 md:p-8 group text-white border border-indigo-500 flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                  {/* Background blob design */}
                  <div className="absolute -top-16 -right-16 w-64 h-64 bg-white rounded-full opacity-10 transition-transform group-hover:scale-110 pointer-events-none" />

                  <div className="relative z-10 flex items-center gap-4">
                    <div className="hidden sm:flex w-14 h-14 bg-indigo-500/50 rounded-2xl items-center justify-center backdrop-blur-sm border border-indigo-400">
                      <ShieldCheck size={32} className="text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                        {getGreeting()}, Admin!
                      </h1>
                      <p className="text-sm md:text-base text-indigo-100 mt-1">
                        Monitor platform activity, manage user accounts, and view system metrics.
                      </p>
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center gap-3 text-sm text-indigo-100 bg-indigo-700/30 px-4 py-2 rounded-xl backdrop-blur-sm border border-indigo-500/30">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={16} />
                      <span>{getFormattedDate()}</span>
                    </div>
                    <span className="text-indigo-200">|</span>
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

                {/* Stat Cards - Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 text-left">
                  <div className="relative bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition-all overflow-hidden p-6 group">
                    <div className="absolute -top-16 -right-16 w-52 h-52 bg-indigo-100 rounded-full opacity-60 transition-transform group-hover:scale-110 pointer-events-none" />
                    <div className="relative z-10 flex flex-col h-full gap-3">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                          <Users className="w-5 h-5 text-indigo-700" strokeWidth={2.5} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-base leading-tight">
                          Total Teachers
                        </h3>
                      </div>
                      <div className="flex items-baseline mt-1">
                        <h2 className="text-3xl font-extrabold text-gray-900">
                          {totalTeachers}
                        </h2>
                      </div>
                      <p className="text-sm text-gray-500 mt-auto">Registered educators</p>
                    </div>
                  </div>

                  <div className="relative bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition-all overflow-hidden p-6 group">
                    <div className="absolute -top-16 -right-16 w-52 h-52 bg-emerald-100 rounded-full opacity-60 transition-transform group-hover:scale-110 pointer-events-none" />
                    <div className="relative z-10 flex flex-col h-full gap-3">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                          <GraduationCap className="w-5 h-5 text-emerald-700" strokeWidth={2.5} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-base leading-tight">
                          Total Students
                        </h3>
                      </div>
                      <div className="flex items-baseline mt-1">
                        <h2 className="text-3xl font-extrabold text-gray-900">
                          {totalStudents}
                        </h2>
                      </div>
                      <p className="text-sm text-gray-500 mt-auto">Registered learners</p>
                    </div>
                  </div>

                  <div className="relative bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition-all overflow-hidden p-6 group sm:col-span-2 lg:col-span-1">
                    <div className="absolute -top-16 -right-16 w-52 h-52 bg-orange-100 rounded-full opacity-60 transition-transform group-hover:scale-110 pointer-events-none" />
                    <div className="relative z-10 flex flex-col h-full gap-3">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                          <Activity className="w-5 h-5 text-orange-700" strokeWidth={2.5} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-base leading-tight">
                          System Status
                        </h3>
                      </div>
                      <div className="flex items-baseline mt-1">
                        <h2 className="text-2xl font-extrabold text-emerald-600 flex items-center gap-2">
                          <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                          Operational
                        </h2>
                      </div>
                      <p className="text-sm text-gray-500 mt-auto">All services are running smoothly</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-6">
                  <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Sparkles size={20} className="text-gray-400" />
                    Quick Actions
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <button
                      onClick={() => navigate("/admin/manage-teachers")}
                      className="relative overflow-hidden group flex flex-col items-start text-left bg-white border border-gray-100 p-6 rounded-[20px] shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-50 transition-opacity duration-500 z-0" />
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 z-10 shadow-sm border border-indigo-100 group-hover:border-transparent">
                        <UserPlus size={28} />
                      </div>
                      <div className="mt-5 z-10">
                        <h3 className="font-bold text-gray-800 text-base group-hover:text-indigo-600 transition-colors">Manage Teachers</h3>
                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">Create, update, or remove teacher accounts.</p>
                      </div>
                      <div className="mt-4 flex items-center gap-1.5 text-sm font-bold text-indigo-600 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-10">
                        Go to Teachers <ArrowRight size={16} />
                      </div>
                    </button>

                    <button
                      onClick={() => navigate("/admin/manage-students")}
                      className="relative overflow-hidden group flex flex-col items-start text-left bg-white border border-gray-100 p-6 rounded-[20px] shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-50 transition-opacity duration-500 z-0" />
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 z-10 shadow-sm border border-emerald-100 group-hover:border-transparent">
                        <GraduationCap size={28} />
                      </div>
                      <div className="mt-5 z-10">
                        <h3 className="font-bold text-gray-800 text-base group-hover:text-emerald-600 transition-colors">Manage Students</h3>
                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">Review student accounts and modify access.</p>
                      </div>
                      <div className="mt-4 flex items-center gap-1.5 text-sm font-bold text-emerald-600 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-10">
                        Go to Students <ArrowRight size={16} />
                      </div>
                    </button>

                    <button
                      onClick={() => navigate("/admin/analytics")}
                      className="relative overflow-hidden group flex flex-col items-start text-left bg-white border border-gray-100 p-6 rounded-[20px] shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-100 to-transparent rounded-bl-full opacity-0 group-hover:opacity-50 transition-opacity duration-500 z-0" />
                      <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 z-10 shadow-sm border border-violet-100 group-hover:border-transparent">
                        <TrendingUp size={28} />
                      </div>
                      <div className="mt-5 z-10">
                        <h3 className="font-bold text-gray-800 text-base group-hover:text-violet-600 transition-colors">System Analytics</h3>
                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">View overall performances and engagement.</p>
                      </div>
                      <div className="mt-4 flex items-center gap-1.5 text-sm font-bold text-violet-600 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-10">
                        View Analytics <ArrowRight size={16} />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Outlet />
            )}
        </div>
      </div>
    </div>
  );
}