import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import LOGO from "../assets/iQuizU.svg";
import {
  Menu,
  X,
  Home,
  FileText,
  BarChart3,
  Trophy,
  LogOut,
  User,
  Bell,
  PanelLeft,
  PanelLeftClose,
  ChevronDown,
} from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function StudentSidebar({ user, userDoc }) {
  const sidebarRef = useRef(null);
  const profileDropdownRef = useRef(null);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, name: '' });

  const navigate = useNavigate();
  const location = useLocation();

  // On mobile, always show expanded. On desktop, respect collapse state.
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const shouldExpand = isMobile ? true : !isCollapsed;

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      shouldExpand ? "288px" : "80px"
    );
  }, [shouldExpand]);

  // Handle click outside sidebar on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Check if sidebar is open, click is outside sidebar, AND checked not on toggle button
      if (
        isMobileOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target) &&
        !e.target.closest('button[aria-label="Toggle sidebar"]')
      ) {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileOpen]);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Close notification dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications (assigned quizzes)
  useEffect(() => {
    if (!user || !user.uid) return;

    const q = query(
      collection(db, "assignedQuizzes"),
      where("studentId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quizzes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort by assignedAt desc
      quizzes.sort((a, b) => {
        const dateA = a.assignedAt?.seconds || 0;
        const dateB = b.assignedAt?.seconds || 0;
        return dateB - dateA;
      });

      // Get read notifications from local storage
      const readNotifs = JSON.parse(localStorage.getItem("readNotifications") || "[]");

      // Calculate unread count
      const unread = quizzes.filter(q => !readNotifs.includes(q.id) && !q.completed).length;

      setNotifications(quizzes.slice(0, 10)); // Keep top 10
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [user]);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);

    if (!showNotifications && notifications.length > 0) {
      // Mark currently visible notifications as read in local storage
      const readNotifs = JSON.parse(localStorage.getItem("readNotifications") || "[]");
      const newReadIds = notifications.map(n => n.id);
      const updatedReadNotifs = [...new Set([...readNotifs, ...newReadIds])];

      localStorage.setItem("readNotifications", JSON.stringify(updatedReadNotifs));
      setUnreadCount(0);
    }
  };

  const menuItems = [
    { to: "/student", icon: Home, label: "Dashboard" },
    { to: "/student/quizzes", icon: FileText, label: "Quizzes" },
    { to: "/student/performance", icon: BarChart3, label: "Performance" },
    { to: "/student/leaderboards", icon: Trophy, label: "Leaderboards" },
  ];

  const isActive = (path) => {
    if (path === "/student") {
      return location.pathname === "/student";
    }
    return location.pathname.includes(path);
  };

  const userName = userDoc?.firstName || userDoc?.name || "Student";
  const userEmail = userDoc?.email || user?.email || "Learner";
  const userInitial = userName.charAt(0).toUpperCase();

  // Staggered animation delay helper
  const staggerDelay = (index) => ({ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' });

  return (
    <>
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-green-600 via-green-700 to-green-800 shadow-lg z-50 flex items-center justify-between px-4 sm:px-6">
        {/* Left Section: Mobile hamburger */}
        <div className="flex lg:hidden w-10">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200 hover:scale-105"
            aria-label="Toggle sidebar"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Logo - Centered on mobile, left-aligned on desktop */}
        <div className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0 flex items-center gap-2 sm:gap-3">
          <img src={LOGO} alt="Logo" className="w-8 h-8 lg:w-10 lg:h-10" />
          <h1 className="text-xl lg:text-2xl font-bold font-Poppins leading-tight text-white">iQuizU</h1>
        </div>

        {/* Right Section: Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className={`flex items-center gap-2 p-2 pr-3 rounded-lg transition-all duration-200 hover:scale-105 ${profileDropdownOpen ? "bg-white/20" : "hover:bg-white/10"
                }`}
            >
              <div className="relative w-8 h-8 bg-gradient-to-br from-green-300 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white/20">
                {userInitial}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-green-700 animate-pulse"></span>
                )}
              </div>
            </button>

            {/* Dropdown Menu */}
            {profileDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[60] animate-fadeIn"
                style={{ animation: 'fadeIn 0.15s ease-out' }}
              >
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-300 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md">
                      {userInitial}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-Poppins font-semibold text-sm text-gray-800 truncate">{userName}</span>
                      <span className="font-Poppins text-xs text-gray-400 truncate">{userEmail}</span>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/student/profile');
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-gray-700 hover:bg-green-50 hover:text-green-700 transition-all duration-150 group"
                  >
                    <User size={18} className="text-gray-400 group-hover:text-green-500 transition-colors" />
                    <span className="font-Poppins text-sm font-medium">My Profile</span>
                  </button>

                  <div ref={notificationRef}>
                    <button
                      onClick={handleNotificationClick}
                      className={`flex items-center justify-between gap-3 w-full px-4 py-2.5 transition-all duration-150 group ${showNotifications ? "bg-green-50 text-green-700" : "text-gray-700 hover:bg-green-50 hover:text-green-700"}`}
                    >
                      <div className="flex items-center gap-3">
                        <Bell size={18} className={`transition-colors ${showNotifications ? "text-green-500" : "text-gray-400 group-hover:text-green-500"}`} />
                        <span className="font-Poppins text-sm font-medium">Notifications</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${showNotifications ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {showNotifications && (
                      <div className="bg-gray-50/50 border-y border-gray-100 max-h-[40vh] overflow-y-auto animate-expandDown">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-gray-400">
                            <p className="font-Poppins text-sm">No notifications yet</p>
                          </div>
                        ) : (
                          <div className="space-y-0.5 p-1">
                            {notifications.map((notif) => (
                              <button
                                key={notif.id}
                                onClick={() => {
                                  if (!notif.completed) {
                                    navigate(notif.quizMode === "synchronous"
                                      ? `/student/take-sync-quiz/${notif.id}`
                                      : `/student/take-assigned-quiz/${notif.id}`
                                    );
                                    setShowNotifications(false);
                                    setProfileDropdownOpen(false);
                                  }
                                }}
                                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-left
                                  ${!notif.completed 
                                    ? "bg-white hover:bg-green-50 border border-transparent shadow-sm" 
                                    : "hover:bg-gray-100"
                                  }`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 transition-all duration-300 ${!notif.completed ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}></div>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className={`font-Poppins text-sm font-medium truncate ${!notif.completed ? "text-gray-800" : "text-gray-500"}`}>
                                    {notif.quizTitle}
                                  </span>
                                  <span className="font-Poppins text-xs text-gray-500 truncate mt-0.5">
                                    {notif.subject || notif.className} &bull; {notif.quizMode === "synchronous" ? "Live" : "Self-Paced"}
                                  </span>
                                  <span className="font-Poppins text-[10px] text-gray-400 mt-1">
                                    {notif.assignedAt?.seconds ? new Date(notif.assignedAt.seconds * 1000).toLocaleDateString() : "Just now"}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider + Logout */}
                <div className="border-t border-gray-100 pt-1">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setShowConfirm(true);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-red-600 hover:bg-red-50 transition-all duration-150 group"
                  >
                    <LogOut size={18} className="text-red-400 group-hover:text-red-500 transition-colors" />
                    <span className="font-Poppins text-sm font-medium">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Overlay Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden animate-overlayFade"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed top-16 left-0 h-[calc(100vh-64px)] bg-white border-r border-gray-200 shadow-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-40 flex flex-col
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${isCollapsed ? "lg:w-20" : "lg:w-72"}
        w-72`}
      >
        <nav
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          className={`flex flex-col py-5 space-y-1 overflow-y-auto flex-1 transition-all duration-300 [&::-webkit-scrollbar]:hidden ${shouldExpand ? "px-4" : "px-3"
            }`}
        >
          {/* Navigation Header with Toggle */}
          <div className={`flex items-center mb-3 ${shouldExpand ? "justify-between px-2" : "justify-center"}`}>
            {shouldExpand && (
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-Poppins">Navigation</span>
            )}
            {/* Desktop: sidebar collapse/expand toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
              aria-label="Toggle sidebar"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            </button>
            {/* Mobile: close button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="flex lg:hidden items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col space-y-1.5">
            {menuItems.map((item, index) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => {
                  setIsMobileOpen(false);
                  if (isActive(item.to)) {
                    window.dispatchEvent(new Event('refreshPage'));
                  }
                }}
                title={!shouldExpand ? item.label : ""}
                style={staggerDelay(index)}
                className={`flex items-center rounded-xl transition-all duration-200 group animate-sidebarSlideIn
                ${shouldExpand
                    ? `gap-3 px-3 py-2.5 ${isActive(item.to) ? "bg-green-600 text-white shadow-lg shadow-green-600/25" : "text-gray-500 hover:bg-gray-100"}`
                    : `justify-center py-3 ${!isActive(item.to) ? "text-gray-500 hover:bg-gray-100" : ""}`
                  }`}
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${!shouldExpand && isActive(item.to) ? "bg-green-600 shadow-lg shadow-green-600/25" : ""
                  }`}>
                  <item.icon size={22} className={`transition-colors duration-200 ${isActive(item.to) ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`} />
                </div>
                <span
                  className={`font-Poppins font-medium text-sm transition-all duration-300 whitespace-nowrap ${shouldExpand
                    ? "opacity-100 max-w-xs"
                    : "opacity-0 max-w-0 overflow-hidden"
                    }`}
                >
                  {item.label}
                </span>
              </Link>
            ))}


          </div>
        </nav>
      </div>

      {showConfirm && (
        <div className="font-Poppins fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform animate-slideUp">
            <div className="flex items-start gap-4">
              <div className="bg-red-100 p-4 rounded-full items-center justify-center flex">
                <LogOut className="text-red-500" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-title">Confirm Logout</h3>
                <p className="text-subtext">
                  Are you sure you want to log out?
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 active:scale-95 hover:scale-105 duration-200 transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 active:scale-95 hover:scale-105 duration-200 transition font-semibold"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
