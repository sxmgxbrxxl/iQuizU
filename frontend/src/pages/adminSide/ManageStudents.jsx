import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { Search, Trash2, Key, Shield, ShieldOff, CheckCircle, GraduationCap } from "lucide-react";
import { AdminTableSkeleton } from "../../components/SkeletonLoaders";

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);

  const fetchStudents = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "student"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStudents(list);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching students:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleResetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset link sent to: " + email);
    } catch (error) {
      console.error(error);
      alert("Failed to send reset email.");
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), { status: "Inactive" });
      fetchStudents();
    } catch (error) {
      console.error(error);
    }
  };

  const handleActivate = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), { status: "Active" });
      fetchStudents();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      fetchStudents();
    } catch (error) {
      console.error(error);
    }
  };

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudents(filteredStudents.map((s) => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  // Handle individual checkbox
  const handleSelectStudent = (id) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(selectedStudents.filter((sid) => sid !== id));
    } else {
      setSelectedStudents([...selectedStudents, id]);
    }
  };

  // Bulk delete selected students
  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) {
      alert("Please select students to delete.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedStudents.length} student(s)?`)) {
      return;
    }

    try {
      const batch = writeBatch(db);
      selectedStudents.forEach((id) => {
        const studentRef = doc(db, "users", id);
        batch.delete(studentRef);
      });

      await batch.commit();
      setSelectedStudents([]);
      fetchStudents();
      alert("Selected students deleted successfully.");
    } catch (error) {
      console.error("Error deleting students:", error);
      alert("Failed to delete selected students.");
    }
  };

  const filteredStudents = students.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Check if all filtered students are selected
  const isAllSelected = filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length;

  return (
    <div className="p-8 bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen font-Poppins">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 animate-fadeIn">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-200">
              <GraduationCap size={28} />
            </div>
            Manage Students
          </h1>
          <p className="text-gray-600 ml-1">
            Review student accounts, manage access, and maintain platform security.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.04)] border border-gray-100 p-6 md:p-8 animate-slideIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search student by name..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {selectedStudents.length > 0 && (
              <button
                className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-4 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2"
                onClick={handleBulkDelete}
              >
                <Trash2 size={18} />
                Delete Selected ({selectedStudents.length})
              </button>
            )}
          </div>

          {loading ? (
            <AdminTableSkeleton />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 w-12 text-center border-r border-gray-50">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          className="w-4 h-4 cursor-pointer text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                        />
                      </div>
                    </th>
                    <th className="p-4 font-semibold text-gray-700 text-sm">Name</th>
                    <th className="p-4 font-semibold text-gray-700 text-sm">Email</th>
                    <th className="p-4 font-semibold text-gray-700 text-sm">Status</th>
                    <th className="p-4 font-semibold text-gray-700 text-sm text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="p-4 text-center border-r border-gray-50">
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.id)}
                              onChange={() => handleSelectStudent(student.id)}
                              className="w-4 h-4 cursor-pointer text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                            />
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm flex-shrink-0 border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                              {student.name ? student.name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <span className="font-semibold text-gray-800">{student.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-500">{student.emailAddress}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                              student.status === "Active" || !student.status
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-red-50 text-red-700 border border-red-100"
                            }`}
                          >
                            {student.status === "Active" || !student.status ? (
                              <CheckCircle size={14} className="text-emerald-500" />
                            ) : (
                              <ShieldOff size={14} className="text-red-500" />
                            )}
                            {student.status || "Active"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors tooltip-trigger"
                              title="Reset Password"
                              onClick={() => handleResetPassword(student.emailAddress)}
                            >
                              <Key size={18} />
                            </button>

                            {student.status === "Active" || !student.status ? (
                              <button
                                className="p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors tooltip-trigger"
                                title="Deactivate Account"
                                onClick={() => handleDeactivate(student.id)}
                              >
                                <ShieldOff size={18} />
                              </button>
                            ) : (
                              <button
                                className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors tooltip-trigger"
                                title="Activate Account"
                                onClick={() => handleActivate(student.id)}
                              >
                                <Shield size={18} />
                              </button>
                            )}

                            <button
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors tooltip-trigger"
                              title="Delete Student"
                              onClick={() => handleDelete(student.id)}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-12 text-center text-gray-500" colSpan={5}>
                        <div className="flex flex-col items-center gap-3">
                          <GraduationCap className="text-gray-300" size={48} />
                          <p>No students found matching your criteria.</p>
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

export default ManageStudents;