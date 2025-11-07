import Sidebar from "../../components/Sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { School, NotebookPen, Users } from "lucide-react";

export default function TeacherDashboard({ user, userDoc }) {
  const [sidebarWidth, setSidebarWidth] = useState("288px");
  const location = useLocation();

  const [totalClasses, setTotalClasses] = useState(0);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // 🔹 Get teacherId
  const teacherId = userDoc?.id || user?.uid;

  // 🔹 Fetch total number of classes
  useEffect(() => {
    const fetchTotalClasses = async () => {
      if (!teacherId) return;
      try {
        setLoadingClasses(true);
        const q = query(collection(db, "classes"), where("teacherId", "==", teacherId));
        const snapshot = await getDocs(q);
        setTotalClasses(snapshot.size);
      } catch (error) {
        console.error("Error fetching classes:", error);
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchTotalClasses();
  }, [teacherId]);

  // 🔹 Fetch total number of quizzes
  useEffect(() => {
    const fetchTotalQuizzes = async () => {
      if (!teacherId) return;
      try {
        setLoadingQuizzes(true);
        const q = query(collection(db, "quizzes"), where("teacherId", "==", teacherId));
        const snapshot = await getDocs(q);
        setTotalQuizzes(snapshot.size);
      } catch (error) {
        console.error("Error fetching quizzes:", error);
      } finally {
        setLoadingQuizzes(false);
      }
    };

    fetchTotalQuizzes();
  }, [teacherId]);

  // 🔹 Fetch total number of students through classes
  useEffect(() => {
    const fetchTotalStudents = async () => {
      if (!teacherId) return;
      try {
        setLoadingStudents(true);
        
        // Get all classes for this teacher
        const classesQuery = query(collection(db, "classes"), where("teacherId", "==", teacherId));
        const classesSnapshot = await getDocs(classesQuery);
        
        // Sum up studentCount from all classes
        let totalStudentCount = 0;
        classesSnapshot.forEach(doc => {
          totalStudentCount += doc.data().studentCount || 0;
        });
        
        setTotalStudents(totalStudentCount);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchTotalStudents();
  }, [teacherId]);

  // 🔹 Sidebar width handling
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

  const isMainDashboard =
    location.pathname === "/teacher" || location.pathname === "/teacher/";

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div
        className="flex-1 overflow-y-auto transition-all duration-300"
        style={{ marginLeft: window.innerWidth >= 1024 ? sidebarWidth : "0" }}
      >
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-background rounded-3xl shadow-md border border-gray-100 p-8 min-h-[400px] font-Outfit">
            {isMainDashboard ? (
              <div className="px-2 py-6 md:p-8">
                <h1 className="text-2xl md:text-3xl font-bold text-title">
                  Welcome, {userDoc?.firstName || user?.displayName || "Teacher"}!
                </h1>
                <p className="text-md md:text-xl text-subtext">
                  Manage your classes, quizzes, and view student performance analytics
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3">

                  <div className="bg-components p-6 m-4 rounded-2xl shadow hover:shadow-lg transition">
                    <div className="flex flex-row">
                      <School className="h-6 w-6 mr-2 text-accent" />
                      <h1 className="text-xl font-semibold mb-2 text-title">
                        Classes
                      </h1>
                    </div>
                    <h1 className="text-3xl font-bold text-accent mt-2">
                      {loadingClasses ? "..." : totalClasses}
                    </h1>
                    <p className="text-sm text-subtext mt-1">Total Classes</p>
                  </div>

                  <div className="bg-components p-6 m-4 rounded-2xl shadow hover:shadow-lg transition">
                    <div className="flex flex-row">
                      <NotebookPen className="h-6 w-6 mr-2 text-accent" />
                      <h1 className="text-xl font-semibold mb-2 text-title">
                        Quizzes
                      </h1>
                    </div>
                    <h1 className="text-3xl font-bold text-accent mt-2">
                      {loadingQuizzes ? "..." : totalQuizzes}
                    </h1>
                    <p className="text-sm text-subtext mt-1">Total Quizzes</p>
                  </div>

                  <div className="bg-components p-6 m-4 rounded-2xl shadow hover:shadow-lg transition">
                    <div className="flex flex-row">
                      <Users className="h-6 w-6 mr-2 text-accent" />
                      <h1 className="text-xl font-semibold mb-2 text-title">
                        Students
                      </h1>
                    </div>
                    <h1 className="text-3xl font-bold text-accent mt-2">
                      {loadingStudents ? "..." : totalStudents}
                    </h1>
                    <p className="text-sm text-subtext mt-1">Total Students</p>
                  </div>
                </div>

                <div className="bg-components p-6 m-4 rounded-3xl shadow">
                  {/* Additional dashboard content */}
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