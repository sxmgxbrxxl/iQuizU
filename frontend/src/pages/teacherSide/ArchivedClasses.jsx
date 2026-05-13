import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { collection, query, where, getDocs, setDoc, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import {
  Archive, RefreshCw, Trash2, Calendar, Users, BookOpen,
  CheckCircle, XCircle, X, ChevronRight, ChevronDown,
  GraduationCap, Layers
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

const SEMESTER_ORDER = ["1st Semester", "2nd Semester", "Short Term Semester"];

/** Group a flat list of archived classes into { academicYear → { semester → [classes] } } */
function groupClasses(classes) {
  const grouped = {};
  for (const c of classes) {
    const year = c.academicYear || "Unknown A.Y.";
    const sem  = c.semester     || "Unknown Semester";
    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][sem]) grouped[year][sem] = [];
    grouped[year][sem].push(c);
  }
  return grouped;
}

/** Sort academic years descending, e.g. "2025-2026" > "2024-2025" */
function sortYears(years) {
  return [...years].sort((a, b) => {
    const numA = parseInt((a.match(/\d+/) || [0])[0], 10);
    const numB = parseInt((b.match(/\d+/) || [0])[0], 10);
    return numB - numA;
  });
}

function sortSemesters(sems) {
  return [...sems].sort(
    (a, b) => (SEMESTER_ORDER.indexOf(a) === -1 ? 99 : SEMESTER_ORDER.indexOf(a))
            - (SEMESTER_ORDER.indexOf(b) === -1 ? 99 : SEMESTER_ORDER.indexOf(b))
  );
}

function formatDate(ts) {
  if (!ts) return "N/A";
  return ts.toDate().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Semester pill colors
const SEM_COLORS = {
  "1st Semester":    { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500"   },
  "2nd Semester":    { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  "Short Term Semester": { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500"  },
};
function semColor(sem) {
  return SEM_COLORS[sem] || { bg: "bg-gray-50", text: "text-gray-700", dot: "bg-gray-400" };
}

// ─── sub-components ─────────────────────────────────────────────────────────

function ClassCard({ classItem, onRestore, onDeleteRequest, restoring, deleting }) {
  const isRestoring = restoring === classItem.id;
  const isDeleting  = deleting  === classItem.id;

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 group">
      {/* Card header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5">
        <div className="flex items-start gap-2">
          <BookOpen className="w-4 h-4 text-white/80 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate leading-tight">
              {classItem.name}
            </h3>
            <p className="text-white/70 text-xs mt-0.5 truncate">
              {classItem.subject || "No subject"}
            </p>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>{classItem.studentCount || 0} student{classItem.studentCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>Archived {formatDate(classItem.archivedAt)}</span>
        </div>

        {/* Actions */}
        <div className="pt-2.5 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => onRestore(classItem)}
            disabled={isRestoring || isDeleting}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white text-sm px-3 py-2.5 rounded-xl transition-all font-medium"
          >
            {isRestoring ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Restore
              </>
            )}
          </button>
          <button
            onClick={() => onDeleteRequest(classItem.id)}
            disabled={isRestoring || isDeleting}
            className="flex items-center justify-center bg-red-50 hover:bg-red-100 disabled:bg-gray-100 text-red-600 disabled:text-gray-400 px-3 py-2.5 rounded-xl transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SemesterSection({ semester, classes, onRestore, onDeleteRequest, restoring, deleting }) {
  const [open, setOpen] = useState(true);
  const col = semColor(semester);

  return (
    <div className="mb-4">
      {/* Semester toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl ${col.bg} hover:opacity-80 transition-all`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${col.dot}`} />
        <span className={`font-semibold text-sm flex-1 text-left ${col.text}`}>{semester}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full bg-white/60 ${col.text} font-medium`}>
          {classes.length} class{classes.length !== 1 ? "es" : ""}
        </span>
        {open
          ? <ChevronDown className={`w-4 h-4 ${col.text}`} />
          : <ChevronRight className={`w-4 h-4 ${col.text}`} />
        }
      </button>

      {/* Classes grid */}
      {open && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-2">
          {classes.map(c => (
            <ClassCard
              key={c.id}
              classItem={c}
              onRestore={onRestore}
              onDeleteRequest={onDeleteRequest}
              restoring={restoring}
              deleting={deleting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AcademicYearSection({ year, semData, onRestore, onDeleteRequest, restoring, deleting }) {
  const [open, setOpen] = useState(true);
  const totalClasses = Object.values(semData).reduce((s, arr) => s + arr.length, 0);
  const semesters    = sortSemesters(Object.keys(semData));

  return (
    <div className="mb-6 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Year header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 transition-all"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 shrink-0">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">
            Academic Year
          </p>
          <p className="text-base font-bold text-gray-800">{year}</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-semibold mr-2">
          {totalClasses} class{totalClasses !== 1 ? "es" : ""}
        </span>
        {open
          ? <ChevronDown className="w-5 h-5 text-gray-400" />
          : <ChevronRight className="w-5 h-5 text-gray-400" />
        }
      </button>

      {/* Semesters */}
      {open && (
        <div className="px-6 pb-5 pt-3 border-t border-gray-50">
          {semesters.map(sem => (
            <SemesterSection
              key={sem}
              semester={sem}
              classes={semData[sem]}
              onRestore={onRestore}
              onDeleteRequest={onDeleteRequest}
              restoring={restoring}
              deleting={deleting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[0, 1].map(i => (
        <div key={i} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-200" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-20 bg-gray-200 rounded" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="px-6 pb-5 pt-3 space-y-4">
            {[0].map(j => (
              <div key={j}>
                <div className="h-9 bg-gray-100 rounded-xl mb-3" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-2">
                  {[0, 1, 2].map(k => (
                    <div key={k} className="rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="h-16 bg-gray-200" />
                      <div className="p-4 space-y-2">
                        <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                        <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                        <div className="h-9 bg-gray-100 rounded-xl mt-3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function ArchivedClasses({ user }) {
  const [archivedClasses, setArchivedClasses] = useState([]);
  const [loading,          setLoading]         = useState(true);
  const [restoring,        setRestoring]        = useState(null);
  const [deleting,         setDeleting]         = useState(null);
  const [showDeleteConfirm,setShowDeleteConfirm]= useState(null);
  const [mounted,          setMounted]          = useState(false);
  const [notification,     setNotification]     = useState({ show: false, type: "", title: "", message: "" });

  // ── notification helpers ───────────────────────────────────────────────────
  const showNotification = useCallback((type, title, message) => {
    setNotification({ show: true, type, title, message });
    setTimeout(() => setNotification(p => ({ ...p, show: false })), 4000);
  }, []);
  const closeNotification = useCallback(() =>
    setNotification(p => ({ ...p, show: false })), []);

  // ── mount / scroll lock ────────────────────────────────────────────────────
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!showDeleteConfirm) return;
    const el = document.querySelector('.overflow-y-auto');
    document.body.style.overflow = 'hidden';
    if (el) el.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      if (el) el.style.overflow = '';
    };
  }, [showDeleteConfirm]);

  // ── fetch (fast: single query, no per-doc reads) ───────────────────────────
  const fetchArchivedClasses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "archivedClasses"),
        where("teacherId", "==", user.uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Newest archived first (within each group)
      list.sort((a, b) => {
        const da = a.archivedAt?.toDate() || new Date(0);
        const db_ = b.archivedAt?.toDate() || new Date(0);
        return db_ - da;
      });
      setArchivedClasses(list);
    } catch (err) {
      console.error("Error fetching archived classes:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchArchivedClasses(); }, [fetchArchivedClasses]);

  // ── restore ────────────────────────────────────────────────────────────────
  const handleRestore = async (classItem) => {
    setRestoring(classItem.id);
    try {
      const originalClassId = classItem.originalClassId || classItem.id;
      const classData = { ...classItem };
      delete classData.id;
      delete classData.archivedAt;
      delete classData.archivedBy;
      delete classData.originalClassId;
      delete classData.studentSnapshot;
      classData.status = "active";

      await setDoc(doc(db, "classes", originalClassId), classData);

      if (classItem.studentSnapshot?.students?.length) {
        await Promise.all(
          classItem.studentSnapshot.students.map(async (info) => {
            try {
              const ref  = doc(db, "users", info.id);
              const snap = await getDoc(ref);
              if (!snap.exists()) return;
              const ids = snap.data().classIds || [];
              if (!ids.includes(originalClassId)) ids.push(originalClassId);
              await updateDoc(ref, { classIds: ids });
            } catch (e) {
              console.error(`Error restoring student ${info.name}:`, e);
            }
          })
        );
      }

      await deleteDoc(doc(db, "archivedClasses", classItem.id));
      await fetchArchivedClasses();
      window.dispatchEvent(new Event('classesUpdated'));

      const n = classItem.studentSnapshot?.students?.length || 0;
      showNotification("success", "Class Restored!",
        `"${classItem.name}" restored. ${n} student${n !== 1 ? "s" : ""} re-enrolled.`);
    } catch (err) {
      showNotification("error", "Restore Failed", "Failed to restore class: " + err.message);
    } finally {
      setRestoring(null);
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (classId) => {
    setDeleting(classId);
    try {
      await deleteDoc(doc(db, "archivedClasses", classId));
      // optimistic update — remove from local state immediately
      setArchivedClasses(prev => prev.filter(c => c.id !== classId));
      showNotification("success", "Class Deleted", "The class has been permanently deleted.");
    } catch (err) {
      showNotification("error", "Delete Failed", "Failed to delete class. Please try again.");
    } finally {
      setDeleting(null);
      setShowDeleteConfirm(null);
    }
  };

  // ── grouped data ───────────────────────────────────────────────────────────
  const grouped      = groupClasses(archivedClasses);
  const sortedYears  = sortYears(Object.keys(grouped));

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full font-Poppins animate-fadeIn">
      {/* Page header */}
      <div className="mb-8">
        <div className="relative group flex gap-3 bg-blue-600 p-10 rounded-3xl w-full flex-col items-start overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white rounded-full opacity-10 transition-transform group-hover:scale-110 pointer-events-none" />
          <div className="flex items-center gap-3">
            <Archive className="w-6 h-6 text-white/80" />
            <h1 className="text-xl md:text-2xl font-bold text-white">Archived Classes</h1>
          </div>
          <p className="text-white/80 text-sm max-w-lg">
            Browse your archived classes by Academic Year and Semester. Restore or permanently delete them anytime.
          </p>
          {!loading && archivedClasses.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <Layers className="w-4 h-4 text-white/60" />
              <span className="text-white/60 text-xs">
                {archivedClasses.length} class{archivedClasses.length !== 1 ? "es" : ""} across {sortedYears.length} academic year{sortedYears.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : archivedClasses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
          <Archive className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-600 mb-1">No Archived Classes</h2>
          <p className="text-gray-400 text-sm">Classes you archive will appear here, organized by year and semester.</p>
        </div>
      ) : (
        sortedYears.map(year => (
          <AcademicYearSection
            key={year}
            year={year}
            semData={grouped[year]}
            onRestore={handleRestore}
            onDeleteRequest={id => setShowDeleteConfirm(id)}
            restoring={restoring}
            deleting={deleting}
          />
        ))
      )}

      {/* ── Delete confirmation modal ── */}
      {mounted && showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm font-Poppins animate-overlayFade">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 text-center animate-popIn">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Permanently Delete Class?</h2>
            <p className="text-gray-500 text-sm mb-6">This action cannot be undone. All class data will be permanently removed.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={!!deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-medium transition-all text-sm"
              >
                {deleting ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Toast notification ── */}
      {mounted && notification.show && createPortal(
        <div className="fixed top-6 right-6 z-[60] font-Poppins" style={{ maxWidth: 420, minWidth: 320 }}>
          <div
            className="rounded-2xl shadow-2xl overflow-hidden border"
            style={{ background: "white", borderColor: notification.type === "success" ? "#bbf7d0" : "#fecaca" }}
          >
            <div className="px-5 py-4 flex items-start gap-4">
              <div
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5"
                style={{
                  background: notification.type === "success"
                    ? "linear-gradient(135deg,#22c55e,#16a34a)"
                    : "linear-gradient(135deg,#ef4444,#dc2626)"
                }}
              >
                {notification.type === "success"
                  ? <CheckCircle className="w-4 h-4 text-white" />
                  : <XCircle    className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm mb-0.5"
                  style={{ color: notification.type === "success" ? "#15803d" : "#dc2626" }}>
                  {notification.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">{notification.message}</p>
              </div>
              <button onClick={closeNotification} className="shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
            <div className="h-1 bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{
                  background: notification.type === "success"
                    ? "linear-gradient(90deg,#22c55e,#16a34a)"
                    : "linear-gradient(90deg,#ef4444,#dc2626)",
                  animation: "shrinkWidth 4s linear forwards"
                }}
              />
            </div>
          </div>
          <style>{`@keyframes shrinkWidth { from{width:100%} to{width:0%} }`}</style>
        </div>,
        document.body
      )}
    </div>
  );
}