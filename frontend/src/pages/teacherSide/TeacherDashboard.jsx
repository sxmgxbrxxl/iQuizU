import Sidebar from "../../components/Sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function TeacherDashboard({ user, userDoc }) {
  const [sidebarWidth, setSidebarWidth] = useState('288px');
  const location = useLocation();

  useEffect(() => {
    // Listen for sidebar width changes
    const observer = new MutationObserver(() => {
      const width = getComputedStyle(document.documentElement)
        .getPropertyValue('--sidebar-width')
        .trim();
      if (width) {
        setSidebarWidth(width);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });

    // Check initial value
    const initialWidth = getComputedStyle(document.documentElement)
      .getPropertyValue('--sidebar-width')
      .trim();
    if (initialWidth) {
      setSidebarWidth(initialWidth);
    }

    return () => observer.disconnect();
  }, []);

  // Determine if we're on the main dashboard or a subroute
  const isMainDashboard = location.pathname === '/teacher' || location.pathname === '/teacher/';

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className="flex-1 overflow-y-auto transition-all duration-300"
        style={{ marginLeft: window.innerWidth >= 1024 ? sidebarWidth : '0' }}
      >
        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 min-h-[400px]">
            {isMainDashboard ? (
              // Default Dashboard Content
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome, {userDoc?.firstName || user?.displayName || 'Teacher'}!
                </h1>
                <p className="text-gray-600 mt-2">
                  Manage your classes, quizzes, and view student performance analytics
                </p>
              </div>
            ) : (
              // Render nested routes content
              <Outlet />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}