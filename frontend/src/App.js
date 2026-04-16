import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { auth, db } from "./firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import Lottie from "lottie-react";
import animationData from "../src/assets/Books.json";

// GENERAL PAGES
import LandingPage from "./pages/general/LandingPage";
import FeaturesPage from "./pages/general/FeaturesPage";
import AboutPage from "./pages/general/AboutPage";
import LoginPage from "./pages/studentSide/LoginPage";

// STUDENT PAGES
import StudentDashboard from "./pages/studentSide/StudentDashboard";
import StudentProfile from "./pages/studentSide/StudentProfile";
import StudentQuizzes from "./pages/studentSide/StudentQuizzes";
import StudentPerformance from "./pages/studentSide/StudentPerformance";
import Leaderboards from "./pages/studentSide/LeaderBoards";
import TakeAsyncQuiz from "./pages/studentSide/TakeAsyncQuiz";
import TakeSyncQuiz from "./pages/studentSide/TakeSyncQuiz";

// TEACHER PAGES
import TeacherDashboard from "./pages/teacherSide/TeacherDashboard";
import ManageClasses from "./pages/teacherSide/ManageClasses";
import ManageQuizzes from "./pages/teacherSide/ManageQuizzes";
import ReportsAnalytics from "./pages/teacherSide/ReportsAnalytics";
import TeacherProfile from "./pages/teacherSide/TeacherProfile";
import ViewClassPage from "./pages/teacherSide/ViewClassPage";
import AssignQuizToClass from "./pages/teacherSide/AssignQuiztoClass";
import ArchivedClasses from "./pages/teacherSide/ArchivedClasses";
import ArchivedQuizzes from "./pages/teacherSide/ArchivedQuizzes";

// QUIZ MANAGEMENT
import EditQuiz from "./pages/teacherSide/EditQuiz";
import QuizSettings from "./pages/teacherSide/QuizSettings";
import AssignQuiz from "./pages/teacherSide/AssignQuiz";
import QuizControlPanel from "./pages/teacherSide/QuizControlPanel";
import QuizResults from "./pages/teacherSide/QuizResults";

// ADMIN PAGE
import AdminDashboard from "./pages/adminSide/AdminDashboard";
import ManageTeachers from "./pages/adminSide/ManageTeachers";
import ManageStudents from "./pages/adminSide/ManageStudents";
import AdminAnalytics from "./pages/adminSide/AdminAnalytics";
import ManageAnnouncements from "./pages/adminSide/ManageAnnouncements";
import ManageContent from "./pages/adminSide/ManageContent";

// COMPONENTS
import StudentSidebar from "./components/StudentSideBar";

// ✅ GLOBAL FLAG TO PREVENT REDIRECTS DURING ACCOUNT CREATION
let isAccountCreationInProgress = false;

export function setAccountCreationFlag(value) {
  isAccountCreationInProgress = value;
}

export function isAccountCreationActive() {
  return isAccountCreationInProgress;
}

// ✅ STUDENT LAYOUT WRAPPER WITH SIDEBAR
function StudentLayout({ user, userDoc, children }) {
  const [sidebarWidth, setSidebarWidth] = useState("288px");

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

  return (
    <div className="flex h-screen w-screen">
      <StudentSidebar user={user} userDoc={userDoc} />

      <div
        className="flex-1 overflow-y-auto transition-all duration-300 pt-16"
        style={{ marginLeft: window.innerWidth >= 1024 ? sidebarWidth : "0" }}
      >
        {children}
      </div>
    </div>
  );
}

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const previousAuthUserRef = useRef(null);
  const authStateChangeCountRef = useRef(0);

  useEffect(() => {
    console.log("🔍 Setting up auth state listener...");

    const unsub = onAuthStateChanged(auth, async (user) => {
      authStateChangeCountRef.current += 1;
      const changeNumber = authStateChangeCountRef.current;


      // ✅ CRITICAL: Block ALL auth state changes during account creation
      if (isAccountCreationInProgress) {
        return;
      }

      if (user) {
        setAuthUser(user);
        previousAuthUserRef.current = user;

        try {
          const usersRef = collection(db, "users");

          // Try to find by email first
          let q = query(usersRef, where("email", "==", user.email));
          let snapshot = await getDocs(q);

          // If not found, try emailAddress field
          if (snapshot.empty) {
            q = query(usersRef, where("emailAddress", "==", user.email));
            snapshot = await getDocs(q);
          }

          // ✅ FIXED: Try to find by authUID if still not found
          if (snapshot.empty) {
            q = query(usersRef, where("authUID", "==", user.uid));
            snapshot = await getDocs(q);
          }

          if (!snapshot.empty) {
            const doc = snapshot.docs[0];

            // ✅ CRITICAL FIX: Include document ID!
            const userDocWithId = {
              id: doc.id, // <-- IMPORTANT: Document ID from Firestore
              ...doc.data(),
            };

            setUserDoc(userDocWithId);
            setRole(userDocWithId.role || null);
          } else {
            
            setUserDoc(null);
            setRole(null);
          }
        } catch (error) {
          console.error("❌ Error fetching user role:", error);
          setUserDoc(null);
          setRole(null);
        }
      } else {
        // ✅ Only clear state if we're not in account creation mode
        if (previousAuthUserRef.current) {
          setAuthUser(null);
          setUserDoc(null);
          setRole(null);
          previousAuthUserRef.current = null;
        } else {
        }
      }

      setLoading(false);
    });

    return () => {
      console.log("🔚 Cleaning up auth state listener");
      unsub();
    };
  }, []);

  const isPublicPath =
    window.location.pathname === "/" ||
    window.location.pathname === "/features" ||
    window.location.pathname === "/about";

  if (loading && !isPublicPath) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-200 via-background to-green-200">
        <Lottie animationData={animationData} loop={true} className="w-32" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/about" element={<AboutPage />} />

        <Route
          path="/login"
          element={
            authUser && role ? (
              role === "teacher" ? (
                <Navigate to="/teacher" replace />
              ) : role === "student" ? (
                <Navigate to="/student" replace />
              ) : role === "admin" ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <LoginPage />
              )
            ) : (
              <LoginPage />
            )
          }
        />


        {/* ============================
            ✅ STUDENT ROUTES WITH SIDEBAR
        ============================ */}

        {/* Main Student Dashboard */}
        <Route
          path="/student"
          element={
            authUser && role === "student" ? (
              <StudentDashboard user={authUser} userDoc={userDoc} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Student Profile */}
        <Route
          path="/student/profile"
          element={
            authUser && role === "student" ? (
              <StudentLayout user={authUser} userDoc={userDoc}>
                <div className="p-6">
                  <StudentProfile user={authUser} userDoc={userDoc} />
                </div>
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Student Quizzes */}
        <Route
          path="/student/quizzes"
          element={
            authUser && role === "student" ? (
              <StudentLayout user={authUser} userDoc={userDoc}>
                <StudentQuizzes user={authUser} userDoc={userDoc} />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Student Performance */}
        <Route
          path="/student/performance"
          element={
            authUser && role === "student" ? (
              <StudentLayout user={authUser} userDoc={userDoc}>
                <StudentPerformance user={authUser} userDoc={userDoc} />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Student Leaderboards */}
        <Route
          path="/student/leaderboards"
          element={
            authUser && role === "student" ? (
              <StudentLayout user={authUser} userDoc={userDoc}>
                <Leaderboards user={authUser} userDoc={userDoc} />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Student Take Quiz by Quiz Code */}
        <Route
          path="/student/take-quiz/:quizCode"
          element={
            authUser && role === "student" ? (
              <TakeAsyncQuiz user={authUser} userDoc={userDoc} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Student Take Assigned (Async) Quiz by Assignment ID */}
        <Route
          path="/student/take-assigned-quiz/:assignmentId"
          element={
            authUser && role === "student" ? (
              <TakeAsyncQuiz user={authUser} userDoc={userDoc} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Student Take Synchronous Quiz */}
        <Route
          path="/student/take-sync-quiz/:assignmentId"
          element={
            authUser && role === "student" ? (
              <TakeSyncQuiz user={authUser} userDoc={userDoc} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* ============================
              ✅ TEACHER ROUTES
          ============================ */}
        <Route
          path="/teacher"
          element={
            authUser && role === "teacher" ? (
              <TeacherDashboard user={authUser} userDoc={userDoc} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          {/* ADD CLASS PAGE */}
          <Route path="classes/add" element={<ManageClasses />} />

          {/* VIEW SPECIFIC CLASS */}
          <Route path="class/:classId" element={<ViewClassPage />} />

          <Route path="quizzes" element={<ManageQuizzes />} />
          <Route path="reports" element={<ReportsAnalytics />} />

          {/* ✅ ARCHIVE ROUTES */}
          <Route
            path="archives/classes"
            element={<ArchivedClasses user={authUser} />}
          />
          <Route
            path="archives/quizzes"
            element={<ArchivedQuizzes user={authUser} />}
          />

          {/* QUIZ MANAGEMENT ROUTES */}
          <Route path="edit-quiz/:quizId" element={<EditQuiz />} />
          <Route path="quiz-settings/:quizId" element={<QuizSettings />} />
          <Route path="assign-quiz/:quizId" element={<AssignQuiz />} />

          {/* ASSIGN QUIZ TO SPECIFIC CLASS (from ViewClassPage) */}
          <Route
            path="assign-quiz-to-class/:quizId/:classId"
            element={<AssignQuizToClass />}
          />

          {/* SYNCHRONOUS QUIZ CONTROL PANEL */}
          <Route
            path="quiz-control/:quizId/:classId"
            element={<QuizControlPanel />}
          />

          {/* QUIZ RESULTS ROUTE */}
          <Route
            path="quiz-results/:quizId/:classId"
            element={<QuizResults />}
          />

          {/* TEACHER PROFILE ROUTE */}
          <Route
            path="profile"
            element={<TeacherProfile user={authUser} userDoc={userDoc} />}
          />
        </Route>

        {/* ============================
            ✅ ADMIN ROUTES
        ============================ */}
        <Route
          path="/admin"
          element={
            authUser && role === "admin" ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="teachers" element={<ManageTeachers />} />
          <Route path="students" element={<ManageStudents />} />
          <Route path="announcements" element={<ManageAnnouncements />} />
          <Route path="content" element={<ManageContent />} />
          <Route path="analytics" element={<AdminAnalytics />} />
        </Route>

        {/* CATCH-ALL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
