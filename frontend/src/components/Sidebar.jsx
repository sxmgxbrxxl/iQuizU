import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, X, BookOpen, FileText, BarChart3, LogOut, Home } from "lucide-react";
import { auth } from "../firebase/firebaseConfig";
import { signOut } from "firebase/auth";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

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
    { to: "/teacher/dashboard", icon: Home, label: "Dashboard" },
    { to: "classes", icon: BookOpen, label: "Classes" },
    { to: "quizzes", icon: FileText, label: "Quizzes" },
    { to: "reports", icon: BarChart3, label: "Reports" },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 bg-white text-gray-700 p-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors lg:hidden border border-gray-200"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen bg-gradient-to-b from-blue-600 to-blue-700 shadow-2xl transition-transform duration-300 ease-in-out z-40 w-72
        ${isOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0`}
      >
        {/* Header */}
        <div className="p-6 bg-blue-800 bg-opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
              <span className="text-2xl">📚</span>
            </div>
            <h1 className="text-2xl font-bold text-white">iQuizU</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-6 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-4 px-4 py-3 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-200 group"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-10 h-10 bg-white bg-opacity-10 group-hover:bg-opacity-20 rounded-lg flex items-center justify-center transition-all">
                <item.icon size={20} className="text-white" />
              </div>
              <span className="font-medium text-base">{item.label}</span>
            </Link>
          ))}

          {/* Divider */}
          <div className="pt-4 pb-2">
            <div className="border-t border-white border-opacity-20"></div>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              setIsOpen(false);
              handleLogout();
            }}
            className="flex items-center gap-4 px-4 py-3 text-white hover:bg-red-500 hover:bg-opacity-30 rounded-lg transition-all duration-200 w-full group"
          >
            <div className="w-10 h-10 bg-white bg-opacity-10 group-hover:bg-opacity-20 rounded-lg flex items-center justify-center transition-all">
              <LogOut size={20} className="text-white" />
            </div>
            <span className="font-medium text-base">Logout</span>
          </button>
        </nav>

        {/* User Profile Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-blue-800 bg-opacity-50">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
              T
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Teacher Name</p>
              <p className="text-blue-200 text-xs">Educator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
        />
      )}
    </>
  );
}