import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import LOGO from "../assets/iQuizU.svg";
import {
  Menu,
  X,
  BarChart3,
  UsersRound,
  LogOut,
  Home,
  NotebookTabs,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { auth } from "../firebase/firebaseConfig";
import { signOut } from "firebase/auth";

export default function AdminTopbar({ user, userDoc }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
    if (path === "/admin/dashboard") return location.pathname === "/admin/dashboard";
    return location.pathname.includes(path);
  };

  return (
    <>
      {/* ── Top Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-slate-900 border-b border-slate-800 shadow-lg shadow-slate-950/30">
        <div className="h-full flex items-center px-4 lg:px-6 gap-4">

          {/* Logo */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-blue-500 blur-lg opacity-30 rounded-full" />
            <img src={LOGO} alt="iQuizU Logo" className="w-8 h-8 relative z-10" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-Outfit font-bold text-lg text-white tracking-tight">iQuizU</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400 flex items-center gap-0.5 mt-0.5">
              <ShieldCheck size={9} /> Admin Panel
            </span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 ml-6 flex-1">
            {menuItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    if (active) window.dispatchEvent(new Event("refreshPage"));
                  }}
                  className={`group relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium font-Outfit transition-all duration-200
                    ${active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                >
                  <item.icon size={17} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-blue-300 rounded-full opacity-60" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Spacer on mobile */}
          <div className="flex-1 lg:hidden" />

          {/* Desktop: User Dropdown */}
          <div className="hidden lg:block relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-700 text-slate-300 hover:text-white transition-all duration-200 text-sm font-Outfit"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-900 to-blue-300 rounded-full flex items-center justify-center text-sm shadow-lg ring-2 ring-white/20">
                {user?.displayName?.[0] || user?.email?.[0] || "A"}
              </div>
            </button>

            {userMenuOpen && (
              <div className="font-Outfit absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-b border-slate-700">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs uppercase shrink-0">
                    {user?.displayName?.[0] || user?.email?.[0] || "A"}
                  </div>
                  <span className="max-w-[120px] truncate">{user?.displayName || user?.email || "Admin"}</span>
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    setShowConfirm(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors font-Outfit"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile: Hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Slide-down panel */}
      <div
        className={`fixed top-16 left-0 right-0 z-35 lg:hidden bg-slate-900 border-b border-slate-800 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
          ${mobileOpen ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"}`}
        style={{ zIndex: 35 }}
      >
        {/* User info strip */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm uppercase shrink-0">
            {user?.displayName?.[0] || user?.email?.[0] || "A"}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white font-Outfit truncate">
              {user?.displayName || "Admin"}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="px-3 py-3 space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => {
                  setMobileOpen(false);
                  if (active) window.dispatchEvent(new Event("refreshPage"));
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium font-Outfit transition-all duration-150
                  ${active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
              >
                <item.icon size={19} strokeWidth={active ? 2.5 : 2} />
                {item.label}
                {active && <span className="ml-auto w-2 h-2 rounded-full bg-blue-300 opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 pb-4 pt-1 border-t border-slate-800 mt-1">
          <button
            onClick={() => {
              setMobileOpen(false);
              setShowConfirm(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors font-Outfit"
          >
            <LogOut size={19} />
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Page offset helper ── */}
      {/* Add pt-16 to your page layout wrapper to offset the fixed navbar */}

      {/* ── Logout Confirmation Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm font-Outfit animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 animate-popIn">
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
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
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
