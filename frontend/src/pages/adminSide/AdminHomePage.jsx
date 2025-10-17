import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Upload, BarChart3, Home, UserPlus } from "lucide-react";
import { auth, db } from "../../firebase/firebaseConfig";
import { createUserWithEmailAndPassword, updateCurrentUser, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function AdminHomePage() {
  const navigate = useNavigate();

  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // ✅ Step 0: Save current admin user
      const currentAdmin = auth.currentUser;

      // ✅ Step 1: Create teacher account in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        teacherEmail,
        teacherPassword
      );
      const teacherUser = userCredential.user;

      // ✅ Step 2: Store teacher info in Firestore under "users" with auto-generated ID
      await setDoc(doc(db, "users", teacherUser.uid), {
        email: teacherEmail,
        uid: teacherUser.uid,
        role: "teacher",
        createdAt: new Date().toISOString(),
      });

      // ✅ Step 3: Restore admin session (IMPORTANT!)
      await updateCurrentUser(auth, currentAdmin);

      // ✅ Step 4: Reset form and show success
      setSuccessMsg(`✅ Teacher account created successfully: ${teacherEmail}`);
      setTeacherEmail("");
      setTeacherPassword("");

      // Auto-clear success message after 5 seconds
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (error) {
      console.error("Error creating teacher:", error);
      if (error.code === "auth/email-already-in-use") {
        setErrorMsg("That email is already in use.");
      } else if (error.code === "auth/invalid-email") {
        setErrorMsg("Invalid email format.");
      } else if (error.code === "auth/weak-password") {
        setErrorMsg("Password should be at least 6 characters.");
      } else {
        setErrorMsg("Failed to create teacher account. Please try again.");
      }

      // Auto-clear error message after 5 seconds
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100 font-Quizzard">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-primary to-secondary text-white flex flex-col p-6">
        <h1 className="text-2xl font-bold mb-10 text-center">Quizzard Admin</h1>

        <nav className="flex flex-col space-y-3">
          <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-white hover:text-primary transition">
            <Home size={20} />
            <span>Dashboard</span>
          </button>

          <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-white hover:text-primary transition">
            <Upload size={20} />
            <span>Upload Module</span>
          </button>

          <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-white hover:text-primary transition">
            <BarChart3 size={20} />
            <span>Analytics</span>
          </button>
        </nav>

        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-600 bg-red-500 text-white w-full justify-center transition"
          >
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Welcome, Admin 👋</h2>

        {/* Dashboard cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">Total Quizzes</h3>
            <p className="text-4xl font-bold text-primary">15</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">Active Students</h3>
            <p className="text-4xl font-bold text-primary">120</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">Modules Uploaded</h3>
            <p className="text-4xl font-bold text-primary">8</p>
          </div>
        </div>

        {/* ✅ Create Teacher Account Section */}
        <div className="bg-white p-8 rounded-xl shadow-lg mb-10">
          <h3 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            <UserPlus size={22} /> Create Teacher Account
          </h3>

          <form onSubmit={handleCreateTeacher} className="flex flex-col gap-4 max-w-md">
            <input
              type="email"
              placeholder="Teacher Email"
              className="border rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none"
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Temporary Password"
              className="border rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none"
              value={teacherPassword}
              onChange={(e) => setTeacherPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white py-3 rounded-lg hover:bg-secondary transition font-semibold"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>

          {successMsg && <p className="text-green-600 mt-4">{successMsg}</p>}
          {errorMsg && <p className="text-red-600 mt-4">{errorMsg}</p>}
        </div>

        {/* Admin notes */}
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <h3 className="text-2xl font-bold mb-4 text-gray-800">Admin Notes</h3>
          <p className="text-gray-600">
            This is your admin control panel. From here, you can upload course modules, generate quizzes, create teacher accounts,
            and monitor student performance.
          </p>
        </div>
      </main>
    </div>
  );
}