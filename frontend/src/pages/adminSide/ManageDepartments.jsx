// src/pages/adminSide/ManageDepartments.jsx
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { db } from "../../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  CheckCircle,
  Loader2,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import { SkeletonBlock, SkeletonKeyframes } from "../../components/SkeletonLoaders";

const ManageDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Add/Edit states
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptName, setDeptName] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Success dialog
  const [successMsg, setSuccessMsg] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const q = query(collection(db, "departments"), orderBy("name", "asc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDepartments(list);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
    setLoading(false);
  };

  // Open modal for adding
  const handleOpenAdd = () => {
    setEditingDept(null);
    setDeptName("");
    setModalError("");
    setShowModal(true);
  };

  // Open modal for editing
  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setDeptName(dept.name || "");
    setModalError("");
    setShowModal(true);
  };

  // Save (add or edit)
  const handleSave = async () => {
    const trimmedName = deptName.trim().toUpperCase();

    if (!trimmedName) {
      setModalError("Department name is required.");
      return;
    }

    // Check for duplicate
    const duplicate = departments.find(
      (d) =>
        d.name.toUpperCase() === trimmedName &&
        (!editingDept || d.id !== editingDept.id)
    );
    if (duplicate) {
      setModalError(`"${trimmedName}" already exists.`);
      return;
    }

    setModalLoading(true);
    setModalError("");

    try {
      if (editingDept) {
        await updateDoc(doc(db, "departments", editingDept.id), {
          name: trimmedName,
          updatedAt: serverTimestamp(),
        });
        setSuccessMsg(`"${trimmedName}" updated successfully!`);
      } else {
        await addDoc(collection(db, "departments"), {
          name: trimmedName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setSuccessMsg(`"${trimmedName}" added successfully!`);
      }

      setShowModal(false);
      setShowSuccessDialog(true);
      fetchDepartments();

      setTimeout(() => {
        setShowSuccessDialog(false);
        setSuccessMsg("");
      }, 3000);
    } catch (error) {
      console.error("Error saving department:", error);
      setModalError("Failed to save. Please try again.");
    }
    setModalLoading(false);
  };

  // Delete
  const handleDelete = async (dept) => {
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, "departments", dept.id));
      setSuccessMsg(`"${dept.name}" deleted successfully!`);
      setConfirmDelete(null);
      setShowSuccessDialog(true);
      fetchDepartments();

      setTimeout(() => {
        setShowSuccessDialog(false);
        setSuccessMsg("");
      }, 3000);
    } catch (error) {
      console.error("Error deleting department:", error);
      alert("Failed to delete department.");
    }
    setDeleteLoading(false);
  };

  // Filter
  const filtered = departments.filter((d) =>
    d.name?.toLowerCase().includes(search.toLowerCase())
  );

  const TableSkeleton = () => (
    <div className="animate-pulse p-6 space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <SkeletonBlock width="10%" height="16px" delay={i * 0.05} />
          <SkeletonBlock width="40%" height="16px" delay={i * 0.05 + 0.05} />
          <SkeletonBlock width="20%" height="16px" delay={i * 0.05 + 0.1} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen font-Poppins animate-fadeIn">
      <SkeletonKeyframes />

      {/* ✅ Success Dialog */}
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

      {/* ✅ Add/Edit Modal */}
      {mounted && showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-8 max-w-md w-full mx-4 animate-slideIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  {editingDept ? <Pencil size={20} /> : <Plus size={20} />}
                </div>
                {editingDept ? "Edit Department" : "Add Department"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                  Department Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value.toUpperCase())}
                  placeholder="e.g. CCS, CTE, CBAA, CAS"
                  maxLength={30}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all uppercase font-semibold tracking-wider text-lg"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                  }}
                  autoFocus
                />
              </div>

              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 animate-fadeIn">
                  <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-red-700 text-sm font-medium">{modalError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={modalLoading}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={modalLoading}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:text-gray-500 shadow-sm"
                >
                  {modalLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : editingDept ? (
                    "Update"
                  ) : (
                    "Add"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ✅ Delete Confirmation Modal */}
      {mounted && confirmDelete && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-overlayFade font-Poppins">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-popIn">
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-full flex items-center justify-center bg-red-100">
                <Trash2 className="text-red-500 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Delete Department</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Are you sure you want to delete <strong className="text-red-600">"{confirmDelete.name}"</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleteLoading}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleteLoading}
                className="flex-1 py-3 rounded-lg transition font-semibold text-sm text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fadeIn">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center border border-violet-200">
              <Building2 size={26} />
            </div>
            Manage Departments
          </h1>
          <p className="text-gray-600 ml-1">
            Maintain the list of departments available across the platform.
          </p>
        </div>

        {/* Add Button + Search */}
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.04)] border border-gray-100 p-6 md:p-8 mb-8 animate-slideIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Department List</h2>
              <p className="text-sm text-gray-500">
                These departments will appear as dropdown options in the teacher's Personal Details.
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-sm hover:shadow-md"
            >
              <Plus size={18} />
              Add Department
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-5 max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search departments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Department Table */}
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden animate-slideIn" style={{ animationDelay: "100ms" }}>
          {loading ? (
            <TableSkeleton />
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-500 mb-1">
                {search ? "No Departments Found" : "No Departments Yet"}
              </h3>
              <p className="text-gray-400 text-sm">
                {search
                  ? "Try adjusting your search term."
                  : 'Click "Add Department" to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right pr-8">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((dept, idx) => (
                    <tr key={dept.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-4 text-sm text-gray-400 font-mono">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-sm font-bold border border-violet-100">
                          <Building2 size={14} />
                          {dept.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(dept)}
                            className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(dept)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Note */}
        <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-3 animate-fadeIn" style={{ animationDelay: "200ms" }}>
          <GraduationCap size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-700 font-medium">How it works</p>
            <p className="text-xs text-blue-600 mt-1">
              Departments added here will appear as dropdown options in the Teacher Profile under Personal Details. 
              Teachers can select their department from this list.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageDepartments;
