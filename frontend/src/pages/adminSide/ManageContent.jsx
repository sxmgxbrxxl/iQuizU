import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import {
  Layers,
  BookOpen,
  GraduationCap,
  Search,
  Archive,
  Trash2,
  Users,
  FileText,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { SkeletonBlock, SkeletonKeyframes } from "../../components/SkeletonLoaders";

const ManageContent = () => {
  const [activeTab, setActiveTab] = useState("classes");
  const [classes, setClasses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  // Confirmation modal
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    fetchClasses();
    fetchQuizzes();
  }, []);

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const snapshot = await getDocs(collection(db, "classes"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClasses(data);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
    setLoadingClasses(false);
  };

  const fetchQuizzes = async () => {
    setLoadingQuizzes(true);
    try {
      const snapshot = await getDocs(collection(db, "quizzes"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setQuizzes(data);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    }
    setLoadingQuizzes(false);
  };

  const handleArchiveClass = async (classId) => {
    setActionLoading(classId);
    try {
      await updateDoc(doc(db, "classes", classId), { status: "archived" });
      setClasses((prev) =>
        prev.map((c) => (c.id === classId ? { ...c, status: "archived" } : c))
      );
    } catch (error) {
      console.error("Error archiving class:", error);
      alert("Failed to archive class.");
    }
    setActionLoading(null);
    setConfirmAction(null);
  };

  const handleRestoreClass = async (classId) => {
    setActionLoading(classId);
    try {
      await updateDoc(doc(db, "classes", classId), { status: "active" });
      setClasses((prev) =>
        prev.map((c) => (c.id === classId ? { ...c, status: "active" } : c))
      );
    } catch (error) {
      console.error("Error restoring class:", error);
      alert("Failed to restore class.");
    }
    setActionLoading(null);
  };

  const handleArchiveQuiz = async (quizId) => {
    setActionLoading(quizId);
    try {
      await updateDoc(doc(db, "quizzes", quizId), { status: "archived" });
      setQuizzes((prev) =>
        prev.map((q) => (q.id === quizId ? { ...q, status: "archived" } : q))
      );
    } catch (error) {
      console.error("Error archiving quiz:", error);
      alert("Failed to archive quiz.");
    }
    setActionLoading(null);
    setConfirmAction(null);
  };

  const handleRestoreQuiz = async (quizId) => {
    setActionLoading(quizId);
    try {
      await updateDoc(doc(db, "quizzes", quizId), { status: "published" });
      setQuizzes((prev) =>
        prev.map((q) => (q.id === quizId ? { ...q, status: "published" } : q))
      );
    } catch (error) {
      console.error("Error restoring quiz:", error);
      alert("Failed to restore quiz.");
    }
    setActionLoading(null);
  };

  const handleDeleteClass = async (classId) => {
    setActionLoading(classId);
    try {
      await deleteDoc(doc(db, "classes", classId));
      setClasses((prev) => prev.filter((c) => c.id !== classId));
    } catch (error) {
      console.error("Error deleting class:", error);
      alert("Failed to delete class.");
    }
    setActionLoading(null);
    setConfirmAction(null);
  };

  const handleDeleteQuiz = async (quizId) => {
    setActionLoading(quizId);
    try {
      await deleteDoc(doc(db, "quizzes", quizId));
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (error) {
      console.error("Error deleting quiz:", error);
      alert("Failed to delete quiz.");
    }
    setActionLoading(null);
    setConfirmAction(null);
  };

  // Filtered data
  const filteredClasses = classes.filter((c) => {
    const matchesSearch =
      (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.teacherEmail || c.createdBy || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArchive = showArchived ? c.status === "archived" : c.status !== "archived";
    return matchesSearch && matchesArchive;
  });

  const filteredQuizzes = quizzes.filter((q) => {
    const matchesSearch =
      (q.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.teacherEmail || q.createdBy || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.subject || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArchive = showArchived ? q.status === "archived" : q.status !== "archived";
    return matchesSearch && matchesArchive;
  });

  const getStatusPill = (status) => {
    const s = (status || "active").toLowerCase();
    const styles = {
      active: "bg-emerald-100 text-emerald-700",
      published: "bg-blue-100 text-blue-700",
      draft: "bg-gray-100 text-gray-600",
      archived: "bg-orange-100 text-orange-700",
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${styles[s] || styles.active}`}>
        {s}
      </span>
    );
  };

  const TableSkeleton = () => (
    <div className="animate-pulse p-6 space-y-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <SkeletonBlock width="30%" height="16px" delay={i * 0.05} />
          <SkeletonBlock width="25%" height="16px" delay={i * 0.05 + 0.05} />
          <SkeletonBlock width="15%" height="16px" delay={i * 0.05 + 0.1} />
          <SkeletonBlock width="15%" height="16px" delay={i * 0.05 + 0.15} />
          <SkeletonBlock width="15%" height="16px" delay={i * 0.05 + 0.2} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen font-Poppins animate-fadeIn">
      <SkeletonKeyframes />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-200">
              <Layers size={26} />
            </div>
            Manage Content
          </h1>
          <p className="text-gray-500 mt-1 ml-1">Overview of all classes and quizzes across teachers</p>
        </div>

        {/* Tabs & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex bg-white rounded-xl border border-gray-200 shadow-sm p-1">
            <button
              onClick={() => { setActiveTab("classes"); setSearchTerm(""); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "classes"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <GraduationCap size={16} />
              Classes
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                activeTab === "classes" ? "bg-white/20" : "bg-gray-100"
              }`}>
                {filteredClasses.length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab("quizzes"); setSearchTerm(""); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "quizzes"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <BookOpen size={16} />
              Quizzes
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                activeTab === "quizzes" ? "bg-white/20" : "bg-gray-100"
              }`}>
                {filteredQuizzes.length}
              </span>
            </button>
          </div>

          {/* Search & Archive Toggle */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full sm:w-64 pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                showArchived
                  ? "bg-orange-50 text-orange-600 border-orange-200"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Archive size={14} />
              {showArchived ? "Archived" : "Active"}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* ═══════════════ CLASSES TAB ═══════════════ */}
          {activeTab === "classes" && (
            <>
              {loadingClasses ? (
                <TableSkeleton />
              ) : filteredClasses.length === 0 ? (
                <div className="p-12 text-center">
                  <GraduationCap size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-bold text-gray-500 mb-1">
                    {showArchived ? "No Archived Classes" : "No Active Classes Found"}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {searchTerm ? "Try adjusting your search term." : showArchived ? "No classes have been archived yet." : "No classes exist in the system."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Class Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Teacher</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Students</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right pr-8">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredClasses.map((cls, idx) => (
                        <tr key={cls.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-400 font-mono">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-gray-800">{cls.name || "Untitled Class"}</span>
                            {cls.section && <span className="text-xs text-gray-400 ml-2">({cls.section})</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{cls.teacherEmail || cls.createdBy || "—"}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="flex items-center justify-center gap-1 text-sm text-gray-600">
                              <Users size={14} className="text-gray-400" />
                              {cls.students?.length || cls.studentCount || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">{getStatusPill(cls.status)}</td>
                          <td className="px-6 py-4 text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              {cls.status === "archived" ? (
                                <button
                                  onClick={() => handleRestoreClass(cls.id)}
                                  disabled={actionLoading === cls.id}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-all disabled:opacity-50"
                                >
                                  <RotateCcw size={12} /> Restore
                                </button>
                              ) : (
                                <button
                                  onClick={() => setConfirmAction({ type: "archiveClass", id: cls.id, name: cls.name })}
                                  disabled={actionLoading === cls.id}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-semibold hover:bg-orange-100 transition-all disabled:opacity-50"
                                >
                                  <Archive size={12} /> Archive
                                </button>
                              )}
                              <button
                                onClick={() => setConfirmAction({ type: "deleteClass", id: cls.id, name: cls.name })}
                                disabled={actionLoading === cls.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-all disabled:opacity-50"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ═══════════════ QUIZZES TAB ═══════════════ */}
          {activeTab === "quizzes" && (
            <>
              {loadingQuizzes ? (
                <TableSkeleton />
              ) : filteredQuizzes.length === 0 ? (
                <div className="p-12 text-center">
                  <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-bold text-gray-500 mb-1">
                    {showArchived ? "No Archived Quizzes" : "No Active Quizzes Found"}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {searchTerm ? "Try adjusting your search term." : showArchived ? "No quizzes have been archived yet." : "No quizzes exist in the system."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quiz Title</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Teacher</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Questions</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right pr-8">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredQuizzes.map((quiz, idx) => (
                        <tr key={quiz.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-400 font-mono">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-gray-800">{quiz.title || "Untitled Quiz"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{quiz.teacherEmail || quiz.createdBy || "—"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{quiz.subject || "—"}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="flex items-center justify-center gap-1 text-sm text-gray-600">
                              <FileText size={14} className="text-gray-400" />
                              {quiz.questions?.length || quiz.questionCount || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">{getStatusPill(quiz.status)}</td>
                          <td className="px-6 py-4 text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              {quiz.status === "archived" ? (
                                <button
                                  onClick={() => handleRestoreQuiz(quiz.id)}
                                  disabled={actionLoading === quiz.id}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-all disabled:opacity-50"
                                >
                                  <RotateCcw size={12} /> Restore
                                </button>
                              ) : (
                                <button
                                  onClick={() => setConfirmAction({ type: "archiveQuiz", id: quiz.id, name: quiz.title })}
                                  disabled={actionLoading === quiz.id}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-semibold hover:bg-orange-100 transition-all disabled:opacity-50"
                                >
                                  <Archive size={12} /> Archive
                                </button>
                              )}
                              <button
                                onClick={() => setConfirmAction({ type: "deleteQuiz", id: quiz.id, name: quiz.title })}
                                disabled={actionLoading === quiz.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-all disabled:opacity-50"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══════════════ CONFIRMATION MODAL ═══════════════ */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-overlayFade font-Poppins">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-popIn">
            <div className="flex items-start gap-4">
              <div className={`p-4 rounded-full flex items-center justify-center ${
                confirmAction.type.includes("delete") ? "bg-red-100" : "bg-orange-100"
              }`}>
                {confirmAction.type.includes("delete") ? (
                  <Trash2 className="text-red-500 w-6 h-6" />
                ) : (
                  <Archive className="text-orange-500 w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {confirmAction.type.includes("delete") ? "Confirm Delete" : "Confirm Archive"}
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  {confirmAction.type.includes("delete")
                    ? <>Are you sure you want to <strong className="text-red-600">permanently delete</strong> <strong>"{confirmAction.name}"</strong>? This action cannot be undone.</>
                    : <>Are you sure you want to archive <strong>"{confirmAction.name}"</strong>? You can restore it later.</>
                  }
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === "archiveClass") handleArchiveClass(confirmAction.id);
                  else if (confirmAction.type === "deleteClass") handleDeleteClass(confirmAction.id);
                  else if (confirmAction.type === "archiveQuiz") handleArchiveQuiz(confirmAction.id);
                  else if (confirmAction.type === "deleteQuiz") handleDeleteQuiz(confirmAction.id);
                }}
                className={`flex-1 py-3 rounded-lg transition font-semibold text-sm text-white ${
                  confirmAction.type.includes("delete")
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                {confirmAction.type.includes("delete") ? "Delete" : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageContent;
