import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LU from "../assets/LU.svg";
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
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 left-6 z-50 bg-components text-black p-3 rounded-full shadow-md hover:bg-gray-50 transition-all lg:hidden border border-gray-100 hover:scale-105"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 shadow-2xl transition-all duration-300 ease-in-out z-40
        ${isOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0
        ${isCollapsed ? "lg:w-20" : "lg:w-72"}
        w-72`}
      >
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-blue-800/50 to-indigo-800/50 backdrop-blur-sm font-Outfit">
          <div
            className={`flex items-center ${
              isCollapsed ? "justify-center" : "gap-3"
            } transition-all duration-300`}
          >
            <div className="w-10 h-10 flex items-center justify-center transform hover:scale-110 transition-transform">
              <img src={LU} alt="Logo" className="w-12 h-12" />
            </div>
            <h1
              className={`text-2xl font-bold text-white transition-all duration-300 ${
                isCollapsed
                  ? "opacity-0 w-0 overflow-hidden"
                  : "opacity-100"
              }`}
            >
              iQuizU
            </h1>
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full items-center justify-center shadow-md hover:bg-blue-50 transition-all hover:scale-110 border-2 border-blue-600"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? (
              <ChevronRight size={14} className="text-blue-600" />
            ) : (
              <ChevronLeft size={14} className="text-blue-600" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-6 space-y-1 overflow-y-auto h-[calc(100vh-200px)]">
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-4 px-4 py-3.5 text-white hover:bg-white/20 rounded-xl transition-all duration-200 group relative overflow-hidden
              ${isCollapsed ? "justify-center" : ""}`}
              onClick={() => setIsOpen(false)}
              title={isCollapsed ? item.label : ""}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
              <div className="relative w-10 h-10 bg-white/10 group-hover:bg-white/20 rounded-xl flex items-center justify-center transition-all group-hover:scale-110">
                <item.icon size={20} className="text-white" />
              </div>
              <span
                className={`relative font-Outfit font-medium text-base transition-all duration-300 ${
                  isCollapsed
                    ? "opacity-0 w-0 overflow-hidden"
                    : "opacity-100"
                }`}
              >
                {item.label}
              </span>
            </Link>
          ))}

          {/* Divider */}
          <div className="pt-4 pb-2 rounded-full">
            <div className="border-t border-white/20"></div>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              setIsOpen(false);
              setShowConfirm(true);
            }}
            className={`flex items-center gap-4 px-4 py-3.5 text-white hover:bg-red-500/30 rounded-xl transition-all duration-200 w-full group relative overflow-hidden
            ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Logout" : ""}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 to-red-500/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
            <div className="relative w-10 h-10 bg-white/10 group-hover:bg-red-500/30 rounded-xl flex items-center justify-center transition-all group-hover:scale-110">
              <LogOut size={20} className="text-white" />
            </div>
            <span
              className={`relative font-Outfit font-medium text-base transition-all duration-300 ${
                isCollapsed
                  ? "opacity-0 w-0 overflow-hidden"
                  : "opacity-100"
              }`}
            >
              Logout
            </span>
          </button>
        </nav>

        {/* User Profile Section */}
        <div
          className={`absolute font-Outfit bottom-0 left-0 right-0 p-4 bg-gradient-to-r from-blue-900/50 to-indigo-900/50 backdrop-blur-sm border-t border-white/10 transition-all duration-300 ${
            isCollapsed ? "items-center justify-center" : ""
          }`}
        >
          {!isCollapsed ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/20">
                {userInitial}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{userName}</p>
                <p className="text-blue-200 text-xs">Educator</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/20 hover:scale-110 transition-transform cursor-pointer">
                {userInitial}
              </div>
            </div>
          )}
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