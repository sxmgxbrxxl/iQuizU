import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LOGO from "../assets/iQuizU.svg";
import {
  Menu,
  X,
  BarChart3,
  UsersRound,
  LogOut,
  Home,
  ChevronLeft,
  ChevronRight,
  NotebookTabs,
  ShieldCheck
} from "lucide-react";
import { auth } from "../firebase/firebaseConfig";
import { signOut } from "firebase/auth";

export default function AdminSidebar({ user, userDoc }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('adminSidebarCollapsed');
    return saved === 'true';
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', isCollapsed.toString());
    document.documentElement.style.setProperty(
      "--sidebar-width",
      isCollapsed ? "80px" : "288px"
    );
  }, [isCollapsed]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  const menuItems = [
    { to: "/admin/dashboard", icon: Home, label: "Dashboard" },
    { to: "/admin/teachers", icon: UsersRound, label: "Manage Teachers" },
    { to: "/admin/students", icon: NotebookTabs, label: "Manage Students" },
    { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  ];

  const isActive = (path) => {
    if (path === "/admin/dashboard") {
      return location.pathname === "/admin/dashboard";
    }
    return location.pathname.includes(path);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 bg-slate-900 text-white p-2.5 rounded-lg shadow-lg hover:bg-slate-800 transition-all lg:hidden active:scale-95"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-slate-900 text-slate-100 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] z-40 flex flex-col border-r border-slate-800
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${isCollapsed ? "lg:w-20" : "lg:w-72"}
        w-72`}
      >
        {/* Header Section */}
        <div className="relative h-20 flex items-center border-b border-slate-800/50 bg-slate-950/30">
          <div className={`w-full flex items-center ${isCollapsed ? "justify-center px-0" : "px-6 gap-3"} transition-all duration-300`}>
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full"></div>
              <img src={LOGO} alt="iQuizU Logo" className="w-9 h-9 relative z-10" />
            </div>

            <div className={`flex flex-col transition-all duration-300 overflow-hidden ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
              <h1 className="font-Outfit font-bold text-xl tracking-tight text-white leading-none">iQuizU</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mt-1 flex items-center gap-1">
                <ShieldCheck size={10} /> Admin Panel
              </span>
            </div>
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all hover:scale-110 shadow-sm z-50"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 custom-scrollbar">
          {menuItems.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => {
                  setIsOpen(false);
                  if (active) window.dispatchEvent(new Event('refreshPage'));
                }}
                title={isCollapsed ? item.label : ""}
                className={`group relative flex items-center rounded-xl transition-all duration-200 ease-out
                        ${isCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3"}
                        ${active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  }`}
              >
                {/* Icon */}
                <div className={`relative z-10 transition-transform duration-300 ${active ? "scale-100" : "group-hover:scale-110"}`}>
                  <item.icon size={22} strokeWidth={active ? 2.5 : 2} />
                </div>

                {/* Label */}
                <span className={`font-Outfit font-medium text-sm whitespace-nowrap transition-all duration-300 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"}`}>
                  {item.label}
                </span>

                {/* Active Indicator (Left Bar) - Only visible when NOT collapsed and active */}
                {active && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-r-full"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer / User / Logout Section */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          <button
            onClick={() => {
              setIsOpen(false);
              setShowConfirm(true);
            }}
            title={isCollapsed ? "Sign Out" : ""}
            className={`w-full group flex items-center rounded-xl transition-all duration-200 
                ${isCollapsed ? "justify-center p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white" : "px-4 py-3 gap-3 hover:bg-red-950/30 text-slate-400 hover:text-red-400"}
                `}
          >
            <LogOut size={20} className={`transition-transform duration-300 ${isCollapsed ? "" : "group-hover:-translate-x-1"}`} />

            <span className={`font-Outfit font-medium text-sm whitespace-nowrap transition-all duration-300 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"}`}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Logout Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm font-Outfit animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Sign Out?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Are you sure you want to sign out of the admin panel?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}