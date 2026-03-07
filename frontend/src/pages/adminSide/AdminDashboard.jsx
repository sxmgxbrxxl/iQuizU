import AdminSidebar from "../../components/AdminSideBar"
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { CircleAlert } from "lucide-react";

export default function AdminDashboard() {
  const [sidebarWidth, setSidebarWidth] = useState("288px");
  const location = useLocation();

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

  const isMainDashboard = location.pathname === "/admin/dashboard";

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />

      <div className="flex-1 overflow-y-auto transition-all duration-300 pt-16"
        style={{ marginLeft: window.innerWidth >= 1024 ? sidebarWidth : "0" }}
      >
        <div className="py-6 px-2 md:p-8 font-Poppins">
          <div className="bg-background rounded-3xl shadow-md border border-gray-100 p-8 min-h-[400px] font-Poppins animate-fadeIn">
            {isMainDashboard ? (
              <div className="px-2 py-6 md:p-8 animate-fadeIn">
                <h1 className="text-2xl md:text-3xl font-bold text-title">
                  Welcome, Admin!
                </h1>
                <p className="text-md md:text-xl text-subtext">
                  Manage teachers, students, and view reports in analytics.
                </p>

                <div className="bg-white p-8 rounded-xl shadow-lg mt-6 animate-slideIn">
                  <div className="flex items-center mb-2 gap-2">
                    <CircleAlert className="text-yellow-500" />
                    <h2 className="text-2xl font-semibold text-title">Admin Notes</h2>
                  </div>
                  <p className="text-gray-600">
                    This is your admin control panel. From here, you can create and manage teacher accounts, manage student accounts,
                    and monitor system's analytics.
                  </p>
                </div>

              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}