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
import { UserPlus, CheckCircle, X, Loader2, Mail, Key, Search, Shield, ShieldOff, Trash2 } from "lucide-react";
import { setAccountCreationFlag } from "../../App";
import { AdminTableSkeleton } from "../../components/SkeletonLoaders";

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
      {mounted && showSuccessDialog && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-8 max-w-sm w-full mx-4 animate-slideIn">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle size={28} />
              </div>
              <button onClick={() => setShowSuccessDialog(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition">
                <X size={20} />
              </button>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-600 mb-8">{successMsg}</p>
            <button
              onClick={() => setShowSuccessDialog(false)}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition font-bold shadow-sm"
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-8 animate-fadeIn">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-200">
              <UserPlus size={28} />
            </div>
            Manage Teachers
          </h1>
          <p className="text-gray-600 ml-1">
            Add new educators, control access levels, and secure the platform.
          </p>
        </div>

        {/* ✅ Create Teacher Account Section */}
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.04)] border border-gray-100 p-6 md:p-8 mb-8 animate-slideIn">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3">
              <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                Create Account
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Fill in the details to invite a new teacher to the platform. They will receive a password reset link to access their account.
              </p>
            </div>
            
            <div className="md:w-2/3">
              <form onSubmit={handleCreateTeacher} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        placeholder="teacher@example.com"
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                      Temporary Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Key className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        value={teacherPassword}
                        onChange={(e) => setTeacherPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex sm:justify-end mt-4">
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 transition-all font-bold flex items-center justify-center gap-2 shadow-sm"
                  >
                    {createLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <UserPlus size={18} />
                        Add Teacher
                      </>
                    )}
                  </button>
                </div>
              </form>

              {errorMsg && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fadeIn">
                  <X className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-red-700 text-sm font-medium">{errorMsg}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ✅ Teacher List Section */}
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.04)] border border-gray-100 p-6 md:p-8 animate-slideIn" style={{ animationDelay: '100ms' }}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Teacher Records
            </h2>
            <div className="relative w-full max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {loading ? (
            <AdminTableSkeleton />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 font-semibold text-gray-700 text-sm">Teacher Email</th>
                    <th className="p-4 font-semibold text-gray-700 text-sm">Status</th>
                    <th className="p-4 font-semibold text-gray-700 text-sm text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTeachers.length > 0 ? (
                    filteredTeachers.map((teacher) => (
                      <tr
                        key={teacher.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0 border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                              {teacher.email ? teacher.email.charAt(0).toUpperCase() : "?"}
                            </div>
                            <span className="font-semibold text-gray-800">{teacher.email}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                              teacher.status === "Active" || !teacher.status
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-red-50 text-red-700 border border-red-100"
                            }`}
                          >
                            {teacher.status === "Active" || !teacher.status ? (
                              <CheckCircle size={14} className="text-emerald-500" />
                            ) : (
                              <ShieldOff size={14} className="text-red-500" />
                            )}
                            {teacher.status || "Active"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleResetPassword(teacher.email)}
                              className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors tooltip-trigger"
                              title="Reset Password"
                            >
                              <Key size={18} />
                            </button>
                            
                            {teacher.status === "Active" || !teacher.status ? (
                              <button
                                onClick={() => handleDeactivate(teacher.id)}
                                className="p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors tooltip-trigger"
                                title="Deactivate Account"
                              >
                                <ShieldOff size={18} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(teacher.id)}
                                className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors tooltip-trigger"
                                title="Activate Account"
                              >
                                <Shield size={18} />
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDelete(teacher.id)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors tooltip-trigger"
                              title="Delete Account"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="p-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-3">
                          <UserPlus className="text-gray-300" size={48} />
                          <p>No teachers found matching your criteria.</p>
                        </div>
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