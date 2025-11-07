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

// GENERAL PAGES
import LandingPage from "./pages/general/LandingPage";
import FeaturesPage from "./pages/general/FeaturesPage";
import AboutPage from "./pages/general/AboutPage";
import LoginPage from "./pages/studentSide/LoginPage";
import SignUpPage from "./pages/studentSide/SignUpPage";

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

// QUIZ MANAGEMENT
import EditQuiz from "./pages/teacherSide/EditQuiz";
import QuizSettings from "./pages/teacherSide/QuizSettings";
import AssignQuiz from "./pages/teacherSide/AssignQuiz";
import QuizControlPanel from "./pages/teacherSide/QuizControlPanel";
import QuizResults from "./pages/teacherSide/QuizResults";

// ADMIN PAGE
import AdminHomePage from "./pages/adminSide/AdminHomePage";

// COMPONENTS
import StudentSidebar from "./components/StudentSideBar";

// ✅ GLOBAL FLAG TO PREVENT REDIRECTS DURING ACCOUNT CREATION
let isAccountCreationInProgress = false;

export function setAccountCreationFlag(value) {
  isAccountCreationInProgress = value;
  console.log(`🔧 Account creation flag set to: ${value}`);
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
    <div className="flex h-screen bg-background">
      <StudentSidebar user={user} userDoc={userDoc} />
      
      <div
        className="flex-1 overflow-y-auto transition-all duration-300"
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

      console.log(`\n🔄 Auth State Change #${changeNumber}`);
      console.log(`   User: ${user?.email || "None"}`);
      console.log(`   UID: ${user?.uid || "None"}`);
      console.log(`   Account Creation Flag: ${isAccountCreationInProgress}`);

      // ✅ CRITICAL: Block ALL auth state changes during account creation
      if (isAccountCreationInProgress) {
        console.log(
          `⛔ BLOCKED: Account creation in progress, ignoring change #${changeNumber}`
        );
        return;
      }

      if (user) {
        console.log(`✅ Processing user login: ${user.email}`);
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
            console.log(`🔍 Trying to find by authUID: ${user.uid}`);
            q = query(usersRef, where("authUID", "==", user.uid));
            snapshot = await getDocs(q);
          }

          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            
            // ✅ CRITICAL FIX: Include document ID!
            const userDocWithId = {
              id: doc.id,  // <-- IMPORTANT: Document ID from Firestore
              ...doc.data()
            };
            
            console.log(`✅ User document found!`);
            console.log(`   Document ID: ${doc.id}`);
            console.log(`   Auth UID: ${user.uid}`);
            console.log(`   Role: ${userDocWithId.role}`);
            console.log(`   Name: ${userDocWithId.name || userDocWithId.displayName}`);
            
            setUserDoc(userDocWithId);
            setRole(userDocWithId.role || null);
          } else {
            console.log(`⚠️ No user document found for: ${user.email}`);
            console.log(`   Tried: email, emailAddress, and authUID fields`);
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
          console.log(
            `⚠️ User logged out (was: ${previousAuthUserRef.current.email})`
          );
          setAuthUser(null);
          setUserDoc(null);
          setRole(null);
          previousAuthUserRef.current = null;
        } else {
          console.log(`ℹ️ No user logged in`);
        }
      }

      setLoading(false);
    });

    return () => {
      console.log("🔚 Cleaning up auth state listener");
      unsub();
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        {/* Animated spinner */}
        <div
          style={{
            width: "60px",
            height: "60px",
            border: "4px solid rgba(255, 255, 255, 0.3)",
            borderTop: "4px solid white",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: "30px",
          }}
        />

        {/* Loading text */}
        <h1
          style={{
            color: "white",
            fontSize: "28px",
            fontWeight: "600",
            margin: "0 0 10px 0",
            letterSpacing: "0.5px",
          }}
        >
          Pakiss pwede ba?
        </h1>

        {/* Subtitle */}
        <p
          style={{
            color: "rgba(255, 255, 255, 0.8)",
            fontSize: "14px",
            margin: "0",
            letterSpacing: "1px",
          }}
        >
          Sandali lang 🎯
        </p>

        {/* CSS Animation */}
        <style>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
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
                <Navigate to="/AdminHomePage" replace />
              ) : (
                <LoginPage />
              )
            ) : (
              <LoginPage />
            )
          }
        />

        <Route path="/signup" element={<SignUpPage />} />

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
                <div className="max-w-7xl mx-auto p-6">
                  <div className="bg-background rounded-3xl shadow-md border border-gray-100 p-8 min-h-[400px] font-Outfit">
                    <StudentProfile user={authUser} userDoc={userDoc} />
                  </div>
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
                <div className="max-w-7xl mx-auto p-6">
                  <div className="bg-background rounded-3xl shadow-md border border-gray-100 p-8 min-h-[400px] font-Outfit">
                    <StudentQuizzes user={authUser} userDoc={userDoc} />
                  </div>
                </div>
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
                <div className="max-w-7xl mx-auto p-6">
                  <div className="bg-background rounded-3xl shadow-md border border-gray-100 p-8 min-h-[400px] font-Outfit">
                    <StudentPerformance user={authUser} userDoc={userDoc} />
                  </div>
                </div>
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
                <div className="max-w-7xl mx-auto p-6">
                  <div className="bg-background rounded-3xl shadow-md border border-gray-100 p-8 min-h-[400px] font-Outfit">
                    <Leaderboards user={authUser} userDoc={userDoc} />
                  </div>
                </div>
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
          <Route path="classes" element={<ManageClasses />} />
          <Route path="quizzes" element={<ManageQuizzes />} />
          <Route path="reports" element={<ReportsAnalytics />} />

          {/* QUIZ MANAGEMENT ROUTES */}
          <Route path="edit-quiz/:quizId" element={<EditQuiz />} />
          <Route path="quiz-settings/:quizId" element={<QuizSettings />} />
          <Route path="assign-quiz/:quizId" element={<AssignQuiz />} />

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
          <Route path="profile" element={<TeacherProfile />} />
        </Route>

        {/* ============================
            ✅ ADMIN ROUTES
        ============================ */}
        <Route
          path="/AdminHomePage"
          element={
            authUser && role === "admin" ? (
              <AdminHomePage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* CATCH-ALL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;