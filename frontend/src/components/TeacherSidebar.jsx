import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import LOGO from "../assets/iQuizU.svg";
import {
  Menu,
  X,
  BookOpen,
  FileText,
  BarChart3,
  LogOut,
  Home,
  ChevronDown,
  Plus,
  Archive,
  User,
  Settings,
} from "lucide-react";

export default function Sidebar({ user, userDoc }) {
  const sidebarRef = useRef(null);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [classesOpen, setClassesOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [hoveredClass, setHoveredClass] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, name: '' });
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // FIXED: Simple logic - if collapsed, stay collapsed unless explicitly expanded
  const shouldExpand = !isCollapsed;

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      shouldExpand ? "288px" : "80px"
    );
  }, [shouldExpand]);

  useEffect(() => {
    if (user) {
      fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    const handleClassesUpdate = () => {
      console.log("🔄 Classes updated event received, refreshing sidebar...");
      fetchClasses();
      setClassesOpen(true);
    };

    const handleClassArchived = () => {
      console.log("📦 Class archived event received, removing from sidebar...");
      fetchClasses();
      setClassesOpen(true);
    };

    window.addEventListener('classesUpdated', handleClassesUpdate);
    window.addEventListener('classArchived', handleClassArchived);

    return () => {
      window.removeEventListener('classesUpdated', handleClassesUpdate);
      window.removeEventListener('classArchived', handleClassArchived);
    };
  }, [user]);

  useEffect(() => {
    if (location.pathname.includes('/teacher/class')) {
      fetchClasses();
    }
  }, [location.pathname]);

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

  const fetchClasses = async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, "classes"),
        where("teacherId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);

      const classList = [];
      querySnapshot.forEach((docSnapshot) => {
        const classData = docSnapshot.data();

        if (classData.status !== "archived") {
          classList.push({ id: docSnapshot.id, ...classData });
        }
      });

      classList.sort((a, b) => {
        const dateA = a.uploadedAt?.toDate() || new Date(0);
        const dateB = b.uploadedAt?.toDate() || new Date(0);
        return dateB - dateA;
      });

      setClasses(classList);
      console.log(`✅ Fetched ${classList.length} active classes`);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

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
    { to: "/teacher", icon: Home, label: "Dashboard" },
  ];

  const otherMenuItems = [
    { to: "quizzes", icon: FileText, label: "Quizzes" },
    { to: "reports", icon: BarChart3, label: "Reports" },
  ];

  const isActive = (path) => {
    if (path === "/teacher") {
      return location.pathname === "/teacher";
    }
    return location.pathname.includes(path);
  };

  const isClassActive = (classId) => {
    return location.pathname.includes(`/teacher/class/${classId}`);
  };

  const userName = userDoc?.firstName || user?.displayName || "Teacher";
  const userEmail = userDoc?.email || user?.email || userDoc?.teacherEmail || "Educator";
  const userInitial = userName.charAt(0).toUpperCase();

  // Staggered animation delay helper
  const staggerDelay = (index) => ({ animationDelay: `${index * 0.06}s`, animationFillMode: 'both' });

  return (
    <>
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 shadow-lg z-50 flex items-center justify-between px-6">
        {/* Left Section: Hamburger + Logo (desktop only) */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsMobileOpen(!isMobileOpen);
              } else {
                setIsCollapsed(!isCollapsed);
              }
            }}
            className="text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200 hover:scale-105"
            aria-label="Toggle sidebar"
          >
            <Menu size={24} />
          </button>

          {/* Logo next to hamburger - desktop only */}
          <div className="hidden lg:flex items-center gap-3">
            <img src={LOGO} alt="Logo" className="w-10 h-10" />
            <h1 className="text-2xl font-bold font-Outfit leading-tight text-white">iQuizU</h1>
          </div>
        </div>

        {/* Center Section: Logo - mobile only */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex lg:hidden items-center gap-3">
          <img src={LOGO} alt="Logo" className="w-10 h-10" />
          <h1 className="text-2xl font-bold font-Outfit leading-tight text-white">iQuizU</h1>
        </div>

        {/* Right Section: Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className={`flex items-center gap-2 p-2 pr-3 rounded-lg transition-all duration-200 hover:scale-105 ${profileDropdownOpen ? "bg-white/20" : "hover:bg-white/10"
                }`}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-green-300 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white/20">
                {userInitial}
              </div>
            </button>

            {/* Dropdown Menu */}
            {profileDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[60] animate-fadeIn"
                style={{ animation: 'fadeIn 0.15s ease-out' }}
              >
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-300 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md">
                      {userInitial}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-Outfit font-semibold text-sm text-gray-800 truncate">{userName}</span>
                      <span className="font-Outfit text-xs text-gray-400 truncate">{userEmail}</span>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/teacher/profile');
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-150 group"
                  >
                    <User size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <span className="font-Outfit text-sm font-medium">My Profile</span>
                  </button>
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
                    <span className="font-Outfit text-sm font-medium">Logout</span>
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
          className={`flex flex-col py-6 space-y-1 overflow-y-auto flex-1 transition-all duration-300 [&::-webkit-scrollbar]:hidden ${shouldExpand ? "px-6" : "px-2"
            }`}
        >
          <div className="flex flex-col space-y-3">
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
                className={`flex items-center relative overflow-hidden rounded-xl text-gray-700 transition-all duration-300 group animate-sidebarSlideIn
                ${shouldExpand
                    ? "gap-4 px-3 py-3 hover:bg-blue-50 hover:shadow-md"
                    : "justify-center py-3 hover:bg-blue-50"
                  }
                ${isActive(item.to) ? "bg-gradient-to-r from-blue-50 to-blue-100/60 text-blue-700 shadow-md ring-1 ring-blue-200/50" : ""}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 to-blue-50/50 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
                {isActive(item.to) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full transition-all duration-300" />
                )}
                <div className={`relative flex items-center justify-center w-10 h-10 group-hover:scale-110 transition-all duration-300 ${isActive(item.to) ? "scale-110" : ""}`}>
                  <item.icon size={22} className={`transition-colors duration-300 ${isActive(item.to) ? "text-blue-600" : "text-gray-500 group-hover:text-blue-600"}`} />
                </div>
                <span
                  className={`relative font-Outfit font-medium text-base transition-all duration-300 whitespace-nowrap ${shouldExpand
                    ? "opacity-100 max-w-xs"
                    : "opacity-0 max-w-0 overflow-hidden"
                    }`}
                >
                  {item.label}
                </span>
              </Link>
            ))}

            <div>
              <button
                onClick={() => {
                  if (shouldExpand) {
                    setClassesOpen(!classesOpen);
                  }
                }}
                title={!shouldExpand ? "Classes" : ""}
                style={staggerDelay(1)}
                className={`flex items-center relative overflow-hidden rounded-xl text-gray-700 transition-all duration-300 group w-full animate-sidebarSlideIn
                ${shouldExpand
                    ? "gap-4 px-3 py-3 hover:bg-blue-50 hover:shadow-md"
                    : "justify-center py-3 hover:bg-blue-50"
                  }
                ${location.pathname.includes('/teacher/class') && !location.pathname.includes('/archive') ? "bg-gradient-to-r from-blue-50 to-blue-100/60 text-blue-700 shadow-md ring-1 ring-blue-200/50" : ""}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 to-blue-50/50 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
                {(location.pathname.includes('/teacher/class') && !location.pathname.includes('/archive')) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full transition-all duration-300" />
                )}
                <div className={`relative flex items-center justify-center w-10 h-10 group-hover:scale-110 transition-all duration-300 ${location.pathname.includes('/teacher/class') && !location.pathname.includes('/archive') ? "scale-110" : ""}`}>
                  <BookOpen size={22} className={`transition-colors duration-300 ${location.pathname.includes('/teacher/class') && !location.pathname.includes('/archive') ? "text-blue-600" : "text-gray-500 group-hover:text-blue-600"}`} />
                </div>
                <span
                  className={`relative font-Outfit font-medium text-base transition-all duration-300 whitespace-nowrap flex-1 text-left ${shouldExpand
                    ? "opacity-100 max-w-xs"
                    : "opacity-0 max-w-0 overflow-hidden"
                    }`}
                >
                  Classes
                </span>
                {shouldExpand && (
                  <div className="relative flex items-center gap-2">
                    {classes.length > 0 && (
                      <span className="bg-blue-100 text-blue-600 text-xs font-bold font-Outfit px-2 py-0.5 rounded-full min-w-[20px] text-center transition-transform duration-300 group-hover:scale-110">
                        {classes.length}
                      </span>
                    )}
                    <div className={`transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${classesOpen ? "rotate-180" : ""}`}>
                      <ChevronDown size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                    </div>
                  </div>
                )}
              </button>

              {shouldExpand && classesOpen && (
                <div className="mt-1 ml-3 border-l-2 border-blue-200 pl-3 animate-expandDown overflow-hidden">
                  {/* Add Class Button */}
                  <Link
                    to="/teacher/classes/add"
                    onClick={() => setIsMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 my-1 rounded-lg text-blue-600 hover:bg-blue-50 hover:shadow-sm transition-all duration-200 group animate-popIn"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 group-hover:rotate-90 transition-all duration-300 flex-shrink-0">
                      <Plus size={16} className="text-blue-600" />
                    </div>
                    <span className="font-Outfit text-sm font-semibold">Add Class</span>
                  </Link>

                  {classes.length === 0 && (
                    <div className="px-3 py-3 text-gray-400 text-sm italic font-Outfit text-center animate-fadeIn">
                      No classes yet
                    </div>
                  )}

                  {/* Scrollable class list */}
                  {classes.length > 0 && (
                    <div
                      className="space-y-0.5 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden"
                      style={{
                        maxHeight: 'calc(5 * 44px)',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                      }}
                    >
                      {classes.map((cls, idx) => (
                        <div
                          key={cls.id}
                          className="relative animate-sidebarSlideIn"
                          style={staggerDelay(idx)}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredClass(cls.id);
                            setTooltipPos({ top: rect.top, left: rect.left + 12, name: cls.name });
                          }}
                          onMouseLeave={() => setHoveredClass(null)}
                        >
                          <Link
                            to={`/teacher/class/${cls.id}`}
                            onClick={() => {
                              setIsMobileOpen(false);
                              setHoveredClass(null);
                            }}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isClassActive(cls.id)
                              ? "bg-blue-50 text-blue-700 shadow-sm"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-800 hover:translate-x-1"
                              }`}
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300 ${isClassActive(cls.id) ? "bg-blue-500 scale-125 animate-activePulse" : "bg-green-400 group-hover:scale-150 group-hover:bg-blue-400"
                              }`}></div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-Outfit text-sm font-medium truncate">
                                {cls.code || "No Code"}
                              </span>
                              <span className={`font-Outfit text-xs truncate transition-colors duration-200 ${isClassActive(cls.id) ? "text-blue-500" : "text-gray-400"
                                }`}>
                                Section {cls.classNo || "—"}
                              </span>
                            </div>
                            <span className={`text-xs font-Outfit font-medium flex-shrink-0 px-1.5 py-0.5 rounded-md transition-all duration-200 ${isClassActive(cls.id)
                              ? "bg-blue-100 text-blue-600"
                              : "bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600"
                              }`}>
                              {cls.studentCount || 0}
                            </span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {otherMenuItems.map((item, index) => (
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
                style={staggerDelay(index + 2)}
                className={`flex items-center relative overflow-hidden rounded-xl text-gray-700 transition-all duration-300 group animate-sidebarSlideIn
                ${shouldExpand
                    ? "gap-4 px-3 py-3 hover:bg-blue-50 hover:shadow-md"
                    : "justify-center py-3 hover:bg-blue-50"
                  }
                ${isActive(item.to) ? "bg-gradient-to-r from-blue-50 to-blue-100/60 text-blue-700 shadow-md ring-1 ring-blue-200/50" : ""}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 to-blue-50/50 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
                {isActive(item.to) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full transition-all duration-300" />
                )}
                <div className={`relative flex items-center justify-center w-10 h-10 group-hover:scale-110 transition-all duration-300 ${isActive(item.to) ? "scale-110" : ""}`}>
                  <item.icon size={22} className={`transition-colors duration-300 ${isActive(item.to) ? "text-blue-600" : "text-gray-500 group-hover:text-blue-600"}`} />
                </div>
                <span
                  className={`relative font-Outfit font-medium text-base transition-all duration-300 whitespace-nowrap ${shouldExpand
                    ? "opacity-100 max-w-xs"
                    : "opacity-0 max-w-0 overflow-hidden"
                    }`}
                >
                  {item.label}
                </span>
              </Link>
            ))}

            <div>
              <button
                onClick={() => {
                  if (shouldExpand) {
                    setArchiveOpen(!archiveOpen);
                  }
                }}
                title={!shouldExpand ? "Archives" : ""}
                style={staggerDelay(4)}
                className={`flex items-center relative overflow-hidden rounded-xl text-gray-700 transition-all duration-300 group w-full animate-sidebarSlideIn
                ${shouldExpand
                    ? "gap-4 px-3 py-3 hover:bg-blue-50 hover:shadow-md"
                    : "justify-center py-3 hover:bg-blue-50"
                  }
                ${location.pathname.includes('/teacher/archives') ? "bg-gradient-to-r from-blue-50 to-blue-100/60 text-blue-700 shadow-md ring-1 ring-blue-200/50" : ""}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 to-blue-50/50 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
                {location.pathname.includes('/teacher/archives') && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full transition-all duration-300" />
                )}
                <div className={`relative flex items-center justify-center w-10 h-10 group-hover:scale-110 transition-all duration-300 ${location.pathname.includes('/teacher/archives') ? "scale-110" : ""}`}>
                  <Archive size={22} className={`transition-colors duration-300 ${location.pathname.includes('/teacher/archives') ? "text-blue-600" : "text-gray-500 group-hover:text-blue-600"}`} />
                </div>
                <span
                  className={`relative font-Outfit font-medium text-base transition-all duration-300 whitespace-nowrap flex-1 text-left ${shouldExpand
                    ? "opacity-100 max-w-xs"
                    : "opacity-0 max-w-0 overflow-hidden"
                    }`}
                >
                  Archives
                </span>
                {shouldExpand && (
                  <div className="relative">
                    <div className={`transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${archiveOpen ? "rotate-180" : ""}`}>
                      <ChevronDown size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                    </div>
                  </div>
                )}
              </button>

              {shouldExpand && archiveOpen && (
                <div className="mt-2 ml-4 space-y-2 border-l-2 border-blue-200 pl-4 animate-expandDown overflow-hidden">
                  <Link
                    to="/teacher/archives/classes"
                    onClick={() => setIsMobileOpen(false)}
                    style={staggerDelay(0)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:translate-x-1 transition-all duration-200 group animate-sidebarSlideIn ${location.pathname === '/teacher/archives/classes' ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                  >
                    <BookOpen size={18} className="text-amber-500 group-hover:scale-110 transition-all duration-300" />
                    <span className="font-Outfit text-sm font-medium">Archived Classes</span>
                  </Link>

                  <Link
                    to="/teacher/archives/quizzes"
                    onClick={() => setIsMobileOpen(false)}
                    style={staggerDelay(1)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:translate-x-1 transition-all duration-200 group animate-sidebarSlideIn ${location.pathname === '/teacher/archives/quizzes' ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                  >
                    <FileText size={18} className="text-amber-500 group-hover:scale-110 transition-all duration-300" />
                    <span className="font-Outfit text-sm font-medium">Archived Quizzes</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>

      {/* Fixed tooltip for class items - renders outside scrollable container */}
      {hoveredClass && tooltipPos.name && (
        <div
          className="fixed z-[9999] pointer-events-none animate-fadeIn"
          style={{
            top: tooltipPos.top - 8,
            left: tooltipPos.left,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="bg-white text-gray-800 text-xs rounded-lg px-3 py-2 shadow-lg border border-gray-200 font-Outfit font-medium whitespace-nowrap">
            {tooltipPos.name}
          </div>
          <div className="absolute top-full left-4 w-2 h-2 bg-white border-b border-r border-gray-200 transform rotate-45 -mt-1"></div>
        </div>
      )}



      {showConfirm && (
        <div className="font-Outfit fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
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