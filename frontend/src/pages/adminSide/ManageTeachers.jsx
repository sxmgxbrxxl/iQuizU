// src/pages/adminSide/ManageTeachers.jsx
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { db, auth } from "../../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  setDoc,
} from "firebase/firestore";
import {
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateCurrentUser,
} from "firebase/auth";
import { UserPlus, CheckCircle, X, Loader2 } from "lucide-react";
import { setAccountCreationFlag } from "../../App";

const ManageTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Create Teacher states
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Fetch all teachers from "users" collection where role === "teacher"
  const fetchTeachers = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "teacher"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTeachers(list);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Create Teacher Account
  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    // ✅ CRITICAL: Set flag BEFORE creating account
    setAccountCreationFlag(true);

    try {
      // ✅ Step 1: Save current admin user
      const currentAdmin = auth.currentUser;

      // ✅ Step 2: Create teacher account in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        teacherEmail,
        teacherPassword
      );
      const teacherUser = userCredential.user;

      // ✅ Step 3: Store teacher info in Firestore
      await setDoc(doc(db, "users", teacherUser.uid), {
        email: teacherEmail,
        uid: teacherUser.uid,
        authUID: teacherUser.uid,
        role: "teacher",
        status: "Active",
        createdAt: new Date().toISOString(),
      });

      // ✅ Step 4: Send password reset email to teacher
      await sendPasswordResetEmail(auth, teacherEmail);

      // ✅ Step 5: Restore admin session (IMPORTANT!)
      await updateCurrentUser(auth, currentAdmin);

      // ✅ Step 6: Reset form and show success
      setSuccessMsg(
        `Teacher account created! Password reset link sent to ${teacherEmail}`
      );
      setShowSuccessDialog(true);
      setTeacherEmail("");
      setTeacherPassword("");

      // Refresh teacher list
      fetchTeachers();

      // Auto-close dialog after 4 seconds
      setTimeout(() => {
        setShowSuccessDialog(false);
        setSuccessMsg("");
      }, 4000);
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
      setCreateLoading(false);

      // ✅ CRITICAL: Release flag AFTER everything is done
      setTimeout(() => {
        setAccountCreationFlag(false);
      }, 1000);
    }
  };

  // Reset teacher password
  const handleResetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset link sent to: " + email);
    } catch (error) {
      console.error(error);
      alert("Failed to send reset email.");
    }
  };

  // Deactivate teacher
  const handleDeactivate = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), { status: "Inactive" });
      fetchTeachers();
    } catch (error) {
      console.error(error);
    }
  };

  // Activate teacher
  const handleActivate = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), { status: "Active" });
      fetchTeachers();
    } catch (error) {
      console.error(error);
    }
  };

  // Delete teacher
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this teacher?"))
      return;
    try {
      await deleteDoc(doc(db, "users", id));
      fetchTeachers();
    } catch (error) {
      console.error(error);
    }
  };

  // Filter teachers by search
  const filteredTeachers = teachers.filter((t) =>
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen font-Poppins">
      {/* ✅ Success Dialog Modal */}
      {mounted &&
        showSuccessDialog &&
        createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Success!</h2>
                <button
                  onClick={() => setShowSuccessDialog(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X size={24} />
                </button>
              </div>
              <p className="text-gray-600 mb-6">{successMsg}</p>
              <button
                onClick={() => setShowSuccessDialog(false)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Got it!
              </button>
            </div>
          </div>,
          document.body
        )}

      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Manage Teachers
        </h1>
        <p className="text-gray-600 mb-8">
          Add, edit, or remove teacher records with ease.
        </p>

        {/* ✅ Create Teacher Account Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <UserPlus size={28} className="text-blue-600" />
            Create Teacher Account
          </h2>

          <form onSubmit={handleCreateTeacher} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                placeholder="teacher@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temporary Password
              </label>
              <input
                type="password"
                value={teacherPassword}
                onChange={(e) => setTeacherPassword(e.target.value)}
                placeholder="Enter temporary password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Teacher will receive email to set their own password
              </p>
            </div>

            <button
              type="submit"
              disabled={createLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold flex items-center justify-center gap-2"
            >
              {createLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Create Teacher Account
                </>
              )}
            </button>
          </form>

          {errorMsg && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <X className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-700">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* ✅ Teacher List Section */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Teacher List
          </h2>

          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <span className="ml-3 text-gray-600">Loading teachers...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.length > 0 ? (
                    filteredTeachers.map((teacher) => (
                      <tr
                        key={teacher.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition"
                      >
                        <td className="py-3 px-4 text-gray-800">
                          {teacher.email}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${teacher.status === "Active" ||
                                !teacher.status
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                              }`}
                          >
                            <CheckCircle size={16} />
                            {teacher.status || "Active"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleResetPassword(teacher.email)
                              }
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-medium"
                            >
                              Reset Password
                            </button>
                            {teacher.status === "Active" ||
                              !teacher.status ? (
                              <button
                                onClick={() =>
                                  handleDeactivate(teacher.id)
                                }
                                className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition text-sm font-medium"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  handleActivate(teacher.id)
                                }
                                className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition text-sm font-medium"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(teacher.id)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-12 text-center text-gray-500">
                        No teachers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageTeachers;