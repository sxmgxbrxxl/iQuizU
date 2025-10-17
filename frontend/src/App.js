import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";

import LandingPage from "./pages/general/LandingPage";
import LoginPage from "./pages/studentSide/LoginPage";
import SignUpPage from "./pages/studentSide/SignUpPage";
import StudentDashboard from "./pages/studentSide/StudentDashboard";
import TeacherDashboard from "./pages/teacherSide/TeacherDashboard";
import ManageClasses from "./pages/teacherSide/ManageClasses";
import ManageQuizzes from "./pages/teacherSide/ManageQuizzes";
import ReportsAnalytics from "./pages/teacherSide/ReportsAnalytics";

import AdminHomePage from "./pages/adminSide/AdminHomePage";

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);

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
            console.log("User role:", docData.role);
          } else {
            console.log("No user document found for:", user.email);
            setUserDoc(null);
            setRole(null);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserDoc(null);
          setRole(null);
        }
      } else {
        // User logged out
        setAuthUser(null);
        setUserDoc(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsub();
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

        {/* STUDENT DASHBOARD */}
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

        {/* TEACHER DASHBOARD */}
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
        </Route>

        {/* ADMIN */}
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
