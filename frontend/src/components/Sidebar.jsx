import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LOGO from "../assets/iQuizU.svg";
import {
  Menu,
  X,
  BookOpen,
  FileText,
  BarChart3,
  LogOut,
  Home,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { auth } from "../firebase/firebaseConfig";
import { signOut } from "firebase/auth";

export default function Sidebar({ user, userDoc }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
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
    { to: "/teacher", icon: Home, label: "Dashboard" },
    { to: "classes", icon: BookOpen, label: "Classes" },
    { to: "quizzes", icon: FileText, label: "Quizzes" },
    { to: "reports", icon: BarChart3, label: "Reports" },
  ];

  // Get user display name
  const userName = userDoc?.firstName || user?.displayName || "Teacher";
  const userEmail = userDoc?.email || user?.email || userDoc?.teacherEmail || "Educator";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 right-6 z-50 bg-components text-black p-3 rounded-full shadow-md hover:bg-gray-50 transition-all lg:hidden border border-gray-100 hover:scale-105"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-800 shadow-2xl transition-all duration-300 ease-in-out z-40
        ${isOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0
        ${isCollapsed ? "lg:w-20" : "lg:w-72"}
        w-72`}
      >
        {/* Header */}
          <div className="relative bg-gradient-to-r from-green-800/50 to-blue-800/50 backdrop-blur-sm font-Outfit cursor-default">
            <div
              className={`flex items-center ${
                isCollapsed ? "justify-center py-6 ml-4" : "px-10 py-6 gap-3"
              } transition-all duration-300`}
            >
              {/* Logo and Text Container */}
              <div className="flex items-center gap-4 transform hover:scale-105 transition-transform duration-300">
                {/* Logo */}
                <img
                  src={LOGO}
                  alt="Logo"
                  className={`transition-all duration-300 ${
                    isCollapsed ? "w-10 h-10" : "w-12 h-12"
                  }`}
                />
                
                <div
                  className={`flex flex-col text-white overflow-hidden transition-all duration-300 ${
                    isCollapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-xs"
                  }`}
                >
                  <h1 className="text-2xl font-bold leading-tight">iQuizU</h1>
                  <p className="text-sm -mt-1">Teacher</p>
                </div>
              </div>
            </div>  

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full items-center justify-center shadow-md hover:bg-green-50 transition-all hover:scale-110 border-2 border-green-600"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? (
              <ChevronRight size={14} className="text-green-600" />
            ) : (
              <ChevronLeft size={14} className="text-green-600" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav
          className={`flex flex-col px-4 py-6 space-y-3 overflow-y-auto h-[calc(100vh-200px)] transition-all duration-300 ${
            isCollapsed ? "px-2" : "px-6"
          }`}
        >
          {/* --- Menu Items --- */}
          <div className="flex flex-col space-y-3">
            {menuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? item.label : ""}
                className={`flex items-center relative overflow-hidden rounded-xl text-white transition-all duration-300 group
                  ${
                    isCollapsed
                      ? "justify-center py-3 hover:bg-white/10"
                      : "gap-4 px-3 py-3 hover:bg-white/10"
                  }`}
              >
                {/* Hover gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>

                {/* Icon */}
                <div className="relative flex items-center justify-center w-10 h-10 group-hover:scale-110 transition-transform duration-300">
                  <item.icon size={22} className="text-white" />
                </div>

                {/* Label */}
                <span
                  className={`relative font-Outfit font-medium text-base transition-all duration-300 whitespace-nowrap ${
                    isCollapsed
                      ? "opacity-0 max-w-0 overflow-hidden"
                      : "opacity-100 max-w-xs"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            ))}
          </div>

          {/* --- Divider --- */}
          <div className="pt-4 pb-2">
            <div className="border-t border-white/20 rounded-full"></div>
          </div>

          {/* --- Logout Button --- */}
          <button
            onClick={() => {
              setIsOpen(false);
              setShowConfirm(true);
            }}
            title={isCollapsed ? "Logout" : ""}
            className={`flex items-center relative overflow-hidden rounded-xl text-white transition-all duration-300 group w-full
              ${
                isCollapsed
                  ? "justify-center py-3 hover:bg-red-500/30"
                  : "gap-4 px-3 py-3.5 hover:bg-red-500/30"
              }`}
          >
            {/* Hover gradient effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 to-red-500/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>

            {/* Icon */}
            <div className="relative flex items-center justify-center w-10 h-10 group-hover:scale-110 transition-transform duration-300">
              <LogOut size={22} className="text-white" />
            </div>

            {/* Label */}
            <span
              className={`relative font-Outfit font-medium text-base transition-all duration-300 whitespace-nowrap ${
                isCollapsed
                  ? "opacity-0 max-w-0 overflow-hidden"
                  : "opacity-100 max-w-xs"
              }`}
            >
              Logout
            </span>
          </button>
        </nav>

        {/* User Profile Section */}
        <div
          onClick={() => (setIsOpen(false), navigate('/teacher/profile'))}
          className={`flex w-full absolute bottom-0 font-Outfit items-center bg-gradient-to-r from-green-900/50 to-blue-900/50 backdrop-blur-sm border-t border-white/10 transition-all duration-300 cursor-pointer ${
            isCollapsed ? "items-center justify-center py-6 pl-4" : "px-10 py-6 gap-3"
              } transition-all duration-300`}
            >
            {/* Profile and Name */}
            <div className="flex items-center gap-4 transform hover:scale-105 transition-transform duration-300">
              {/* Initial */}
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/20">
                {userInitial}
              </div>
              <div
                className={`flex flex-col text-white overflow-hidden transition-all duration-300 ${
                    isCollapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-xs"
                  }`}
                >
                <p className="text-white font-semibold text-sm">{userName}</p>
                <p className="text-blue-200 font-light text-xs">{userEmail}</p>
              </div>
            </div>
          </div>  
        </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden transition-opacity"
        />
      )}

      {/* Logout Confirmation Modal */}
      {showConfirm && ( 
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-Outfit">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 text-center animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Are you sure you want to logout?
            </h2>
            <div className="flex justify-center gap-4 mt-5">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition-all"
              >
                No
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  handleLogout();
                }}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}