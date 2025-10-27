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
import LoginPage from "./pages/studentSide/LoginPage";
import SignUpPage from "./pages/studentSide/SignUpPage";

// STUDENT PAGES
import StudentDashboard from "./pages/studentSide/StudentDashboard";
import TakeAsyncQuiz from "./pages/studentSide/TakeAsyncQuiz"; // ✅ FIXED: Updated import name
import TakeSyncQuiz from "./pages/studentSide/TakeSyncQuiz";

// TEACHER PAGES
import TeacherDashboard from "./pages/teacherSide/TeacherDashboard";
import ManageClasses from "./pages/teacherSide/ManageClasses";
import ManageQuizzes from "./pages/teacherSide/ManageQuizzes";
import ReportsAnalytics from "./pages/teacherSide/ReportsAnalytics";

// QUIZ MANAGEMENT
import EditQuiz from "./pages/teacherSide/EditQuiz";
import QuizSettings from "./pages/teacherSide/QuizSettings";
import AssignQuiz from "./pages/teacherSide/AssignQuiz";
import QuizControlPanel from "./pages/teacherSide/QuizControlPanel";
import QuizResults from "./pages/teacherSide/QuizResults"; // ✅ NEW: Quiz Results

// ADMIN PAGE
import AdminHomePage from "./pages/adminSide/AdminHomePage";

// ✅ GLOBAL FLAG TO PREVENT REDIRECTS DURING ACCOUNT CREATION
let isAccountCreationInProgress = false;

export function setAccountCreationFlag(value) {
  isAccountCreationInProgress = value;
  console.log(`🔧 Account creation flag set to: ${value}`);
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
        console.log(`⛔ BLOCKED: Account creation in progress, ignoring change #${changeNumber}`);
        return;
      }

      if (user) {
        console.log(`✅ Processing user login: ${user.email}`);
        setAuthUser(user);
        previousAuthUserRef.current = user;

        try {
          const usersRef = collection(db, "users");

          let q = query(usersRef, where("email", "==", user.email));
          let snapshot = await getDocs(q);

          if (snapshot.empty) {
            q = query(usersRef, where("emailAddress", "==", user.email));
            snapshot = await getDocs(q);
          }

          if (!snapshot.empty) {
            const docData = snapshot.docs[0].data();
            setUserDoc(docData);
            setRole(docData.role || null);
            console.log(`✅ User role found: ${docData.role}`);
          } else {
            console.log(`⚠️ No user document found for: ${user.email}`);
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
          console.log(`⚠️ User logged out (was: ${previousAuthUserRef.current.email})`);
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
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/login"
          element={
            authUser && role ? (
              role === "teacher" ? (
                <Navigate to="/teacher" replace />
              ) : role === "student" ? (
                <Navigate to="/studentDashboard" replace />
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
            ✅ STUDENT ROUTES
        ============================ */}
        <Route
          path="/studentDashboard"
          element={
            authUser && role === "student" ? (
              <StudentDashboard user={authUser} userDoc={userDoc} />
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

        {/* ✅ NEW: Student Take Synchronous Quiz */}
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

          {/* ✅ NEW: QUIZ RESULTS ROUTE */}
          <Route
            path="quiz-results/:quizId/:classId"
            element={<QuizResults />}
          />
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