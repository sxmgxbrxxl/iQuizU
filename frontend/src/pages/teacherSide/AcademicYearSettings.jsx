import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { collection, query, where, getDocs, doc, deleteDoc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/firebaseConfig";
import {
  CalendarRange,
  Archive,
  BookOpen,
  Users,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  X,
  AlertTriangle,
  GraduationCap,
  FolderArchive,
  Calendar,
  Info,
} from "lucide-react";

export default function AcademicYearSettings({ user }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: "", title: "", message: "" });
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(null); // { academicYear, semester } or { academicYear }
  const [archiveProgress, setArchiveProgress] = useState("");

  const showNotification = useCallback((type, title, message) => {
    setNotification({ show: true, type, title, message });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 4000);
  }, []);

  const closeNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, show: false }));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock scroll when archive confirm modal is open
  useEffect(() => {
    if (!showArchiveConfirm) return;
    const scrollableParent = document.querySelector('.overflow-y-auto');
    document.body.style.overflow = 'hidden';
    if (scrollableParent) scrollableParent.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      if (scrollableParent) scrollableParent.style.overflow = '';
    };
  }, [showArchiveConfirm]);

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const fetchClasses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "classes"),
        where("teacherId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const classList = [];
      querySnapshot.forEach((docSnapshot) => {
        classList.push({ id: docSnapshot.id, ...docSnapshot.data() });
      });
      classList.sort((a, b) => {
        const dateA = a.uploadedAt?.toDate() || new Date(0);
        const dateB = b.uploadedAt?.toDate() || new Date(0);
        return dateB - dateA;
      });
      setClasses(classList);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group classes by Academic Year > Semester
  const groupedClasses = classes.reduce((acc, cls) => {
    const ay = cls.academicYear || "No Academic Year";
    const sem = cls.semester || "No Semester";
    if (!acc[ay]) acc[ay] = {};
    if (!acc[ay][sem]) acc[ay][sem] = [];
    acc[ay][sem].push(cls);
    return acc;
  }, {});

  // Sort academic years (descending)
  const sortedAYs = Object.keys(groupedClasses).sort((a, b) => {
    if (a === "No Academic Year") return 1;
    if (b === "No Academic Year") return -1;
    return b.localeCompare(a);
  });

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Get count of classes for an AY or AY+Semester combo
  const getClassCount = (ay, sem = null) => {
    if (sem) {
      return groupedClasses[ay]?.[sem]?.length || 0;
    }
    return Object.values(groupedClasses[ay] || {}).reduce((sum, arr) => sum + arr.length, 0);
  };

  const getStudentCount = (ay, sem = null) => {
    if (sem) {
      return (groupedClasses[ay]?.[sem] || []).reduce((sum, cls) => sum + (cls.studentCount || 0), 0);
    }
    return Object.values(groupedClasses[ay] || {}).reduce(
      (sum, arr) => sum + arr.reduce((s, cls) => s + (cls.studentCount || 0), 0),
      0
    );
  };

  // Bulk archive handler
  const handleBulkArchive = async () => {
    if (!showArchiveConfirm) return;
    const { academicYear, semester } = showArchiveConfirm;

    setArchiving(true);
    setArchiveProgress("Preparing to archive...");

    try {
      // Get classes to archive
      let classesToArchive = [];
      if (semester) {
        classesToArchive = groupedClasses[academicYear]?.[semester] || [];
      } else {
        classesToArchive = Object.values(groupedClasses[academicYear] || {}).flat();
      }

      if (classesToArchive.length === 0) {
        showNotification("error", "No Classes", "No classes found to archive.");
        return;
      }

      let archivedClassCount = 0;
      let archivedQuizCount = 0;
      let totalStudentsArchived = 0;
      const archivedClassIds = [];

      // ===== PHASE 1: Archive Classes =====
      for (let i = 0; i < classesToArchive.length; i++) {
        const cls = classesToArchive[i];
        setArchiveProgress(`Archiving class ${i + 1}/${classesToArchive.length}: ${cls.name || cls.code}`);

        try {
          // 1. Fetch enrolled students
          const studentsQuery = query(
            collection(db, "users"),
            where("role", "==", "student"),
            where("classIds", "array-contains", cls.id)
          );
          const studentsSnapshot = await getDocs(studentsQuery);

          const enrolledStudents = [];
          const updatePromises = [];

          studentsSnapshot.forEach((docSnapshot) => {
            const student = docSnapshot.data();
            enrolledStudents.push({
              id: docSnapshot.id,
              name: student.name,
              email: student.emailAddress,
              studentNo: student.studentNo,
              program: student.program,
            });

            // Remove classId from student's classIds array
            const updatedClassIds = (student.classIds || []).filter(id => id !== cls.id);
            updatePromises.push(
              updateDoc(doc(db, "users", docSnapshot.id), {
                classIds: updatedClassIds,
              })
            );
          });

          await Promise.all(updatePromises);

          // 2. Move class to archivedClasses
          const classDocRef = doc(db, "classes", cls.id);
          const classDocSnap = await getDoc(classDocRef);

          if (classDocSnap.exists()) {
            const classData = classDocSnap.data();
            const archivedData = {
              ...classData,
              originalClassId: cls.id,
              archivedAt: new Date(),
              archivedBy: user.uid,
              status: "archived",
              studentSnapshot: {
                count: enrolledStudents.length,
                students: enrolledStudents,
                snapshotDate: new Date(),
              },
            };

            await setDoc(doc(db, "archivedClasses", cls.id), archivedData);
            await deleteDoc(classDocRef);

            archivedClassCount++;
            archivedClassIds.push(cls.id);
            totalStudentsArchived += enrolledStudents.length;
          }
        } catch (classError) {
          console.error(`Error archiving class ${cls.id}:`, classError);
        }
      }

      // ===== PHASE 2: Archive Quizzes assigned to these classes =====
      if (archivedClassIds.length > 0) {
        setArchiveProgress("Archiving related quizzes...");

        try {
          // Find all quizzes owned by this teacher
          const quizzesQuery = query(
            collection(db, "quizzes"),
            where("teacherId", "==", user.uid)
          );
          const quizzesSnapshot = await getDocs(quizzesQuery);

          // For each quiz, check if it has assignments to any of the archived classes
          for (const quizDoc of quizzesSnapshot.docs) {
            const quizId = quizDoc.id;

            // Check if this quiz has assignments to any of the archived class IDs
            const assignmentsQuery = query(
              collection(db, "assignedQuizzes"),
              where("quizId", "==", quizId),
              where("assignedBy", "==", user.uid)
            );
            const assignmentsSnap = await getDocs(assignmentsQuery);

            // Get all classIds this quiz is assigned to
            const assignedClassIds = new Set();
            assignmentsSnap.forEach((aDoc) => {
              assignedClassIds.add(aDoc.data().classId);
            });

            // Check if this quiz was assigned to any of the archived classes
            const wasAssignedToArchivedClass = archivedClassIds.some(id => assignedClassIds.has(id));

            if (wasAssignedToArchivedClass) {
              // Check if the quiz still has assignments to any active (non-archived) classes
              const hasActiveAssignments = [...assignedClassIds].some(
                id => !archivedClassIds.includes(id)
              );

              // Only archive the quiz if it has NO remaining active class assignments
              if (!hasActiveAssignments) {
                setArchiveProgress(`Archiving quiz: ${quizDoc.data().title || "Untitled"}`);

                const quizData = quizDoc.data();
                const archivedQuizData = {
                  ...quizData,
                  originalQuizId: quizId,
                  archivedAt: new Date(),
                  archivedBy: user.uid,
                  status: "archived",
                  archivedFromAcademicYear: academicYear,
                  archivedFromSemester: semester || "All Semesters",
                };

                await setDoc(doc(db, "archivedQuizzes", quizId), archivedQuizData);
                await deleteDoc(doc(db, "quizzes", quizId));
                archivedQuizCount++;
              }
            }
          }
        } catch (quizError) {
          console.error("Error archiving quizzes:", quizError);
        }
      }

      // Refresh
      await fetchClasses();
      window.dispatchEvent(new Event("classArchived"));
      window.dispatchEvent(new Event("classesUpdated"));

      const label = semester
        ? `${semester} — A.Y. ${academicYear}`
        : `A.Y. ${academicYear}`;

      let message = `${archivedClassCount} class${archivedClassCount !== 1 ? "es" : ""} from ${label} archived successfully. ${totalStudentsArchived} student record${totalStudentsArchived !== 1 ? "s" : ""} preserved.`;
      if (archivedQuizCount > 0) {
        message += ` ${archivedQuizCount} quiz${archivedQuizCount !== 1 ? "zes" : ""} also archived.`;
      }

      showNotification("success", "Archive Complete!", message);
    } catch (error) {
      console.error("Error during bulk archive:", error);
      showNotification("error", "Archive Failed", "An error occurred during archiving: " + error.message);
    } finally {
      setArchiving(false);
      setArchiveProgress("");
      setShowArchiveConfirm(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  // Skeleton loader
  if (loading) {
    return (
      <div className="w-full font-Poppins animate-fadeIn">
        <div className="w-full">
          <div className="mb-8">
            <div className="relative group flex gap-3 mb-2 bg-blue-600 p-10 rounded-3xl w-full flex-col items-start">
              <div className="absolute -top-16 -right-16 w-64 h-64 bg-white rounded-full opacity-10 transition-transform group-hover:scale-110 pointer-events-none" />
              <h1 className="text-xl md:text-2xl font-bold text-white">Academic Year Settings</h1>
              <p className="text-white">Manage and archive classes by academic year and semester.</p>
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 animate-pulse">
                <div className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-200 rounded-lg w-48" />
                    <div className="h-4 bg-gray-200 rounded-lg w-32" />
                  </div>
                  <div className="w-24 h-9 bg-gray-200 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full font-Poppins animate-fadeIn">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="relative group flex gap-3 mb-2 bg-blue-600 p-10 rounded-3xl w-full flex-col items-start">
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-white rounded-full opacity-10 transition-transform group-hover:scale-110 pointer-events-none" />
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <CalendarRange className="w-6 h-6" />
              Academic Year Settings
            </h1>
            <p className="text-white">
              Manage and archive classes by academic year and semester. Bulk archive an entire semester or academic year at once.
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 mb-6 bg-blue-50 border border-blue-200 rounded-xl animate-slideIn">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">How Academic Year Archiving Works</p>
            <p className="text-blue-700">
              When you upload a class list (Excel), the Semester and Academic Year are automatically extracted from the file header.
              You can then archive all classes for a specific semester or the entire academic year at once. Quizzes that are only assigned to the archived classes will also be archived automatically. Archived items can be restored from the Archives section.
            </p>
          </div>
        </div>

        {/* Classes grouped by AY */}
        {sortedAYs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center animate-slideIn">
            <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Active Classes</h2>
            <p className="text-gray-500">
              Upload a class list to get started. Academic year and semester information will be extracted automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4 animate-slideIn">
            {sortedAYs.map((ay) => {
              const semesters = Object.keys(groupedClasses[ay]).sort();
              const isExpanded = expandedGroups[ay] !== false; // default expanded
              const totalClasses = getClassCount(ay);
              const totalStudents = getStudentCount(ay);

              return (
                <div key={ay} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 transition-all duration-300">
                  {/* AY Header */}
                  <button
                    onClick={() => toggleGroup(ay)}
                    className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md flex-shrink-0">
                      <CalendarRange className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-800">
                        {ay === "No Academic Year" ? "Untagged Classes" : `A.Y. ${ay}`}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {totalClasses} class{totalClasses !== 1 ? "es" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {totalStudents} student{totalStudents !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    {ay !== "No Academic Year" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowArchiveConfirm({ academicYear: ay, semester: null });
                        }}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all text-sm font-semibold flex-shrink-0"
                        title="Archive all classes for this academic year"
                      >
                        <FolderArchive className="w-4 h-4" />
                        Archive A.Y.
                      </button>
                    )}
                    <div className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>

                  {/* Mobile archive button */}
                  {ay !== "No Academic Year" && isExpanded && (
                    <div className="px-5 pb-3 sm:hidden">
                      <button
                        onClick={() => setShowArchiveConfirm({ academicYear: ay, semester: null })}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all text-sm font-semibold"
                      >
                        <FolderArchive className="w-4 h-4" />
                        Archive Entire A.Y. {ay}
                      </button>
                    </div>
                  )}

                  {/* Semesters */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {semesters.map((sem) => {
                        const semClasses = groupedClasses[ay][sem];
                        const semKey = `${ay}-${sem}`;
                        const isSemExpanded = expandedGroups[semKey] !== false;
                        const semStudentCount = getStudentCount(ay, sem);

                        return (
                          <div key={semKey} className="border-b border-gray-50 last:border-b-0">
                            {/* Semester Header */}
                            <button
                              onClick={() => toggleGroup(semKey)}
                              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left pl-10"
                            >
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-4 h-4 text-indigo-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-gray-700">
                                  {sem === "No Semester" ? "Untagged Semester" : sem}
                                </h4>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {semClasses.length} class{semClasses.length !== 1 ? "es" : ""} · {semStudentCount} student{semStudentCount !== 1 ? "s" : ""}
                                </p>
                              </div>
                              {sem !== "No Semester" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowArchiveConfirm({ academicYear: ay, semester: sem });
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-100 transition-all text-xs font-semibold flex-shrink-0"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                  Archive
                                </button>
                              )}
                              <div className={`transition-transform duration-300 ${isSemExpanded ? "rotate-90" : ""}`}>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </div>
                            </button>

                            {/* Class List */}
                            {isSemExpanded && (
                              <div className="px-5 pb-3 pl-16 space-y-2">
                                {semClasses.map((cls) => (
                                  <div
                                    key={cls.id}
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                      <BookOpen className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-800 truncate">
                                        {cls.code || cls.name || "Untitled"}
                                      </p>
                                      <p className="text-xs text-gray-400 truncate">
                                        {cls.name} · Section {cls.classNo || "—"}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-200">
                                        <Users className="w-3 h-3 inline mr-1" />
                                        {cls.studentCount || 0}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {formatDate(cls.uploadedAt)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Archive Confirmation Modal */}
      {mounted && showArchiveConfirm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-overlayFade font-Poppins">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md text-center animate-popIn">
            <div className="flex items-center justify-center w-14 h-14 bg-amber-100 rounded-full mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {showArchiveConfirm.semester
                ? "Archive Semester?"
                : "Archive Academic Year?"}
            </h2>

            <p className="text-gray-600 mb-2">
              {showArchiveConfirm.semester
                ? `This will archive all classes from:`
                : `This will archive ALL classes from:`}
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="font-bold text-amber-800">
                {showArchiveConfirm.semester
                  ? `${showArchiveConfirm.semester}`
                  : `Academic Year ${showArchiveConfirm.academicYear}`}
              </p>
              {showArchiveConfirm.semester && (
                <p className="text-sm text-amber-700">A.Y. {showArchiveConfirm.academicYear}</p>
              )}
              <div className="flex items-center justify-center gap-4 text-sm text-amber-700 mt-2">
                <span>
                  <BookOpen className="w-3.5 h-3.5 inline mr-1" />
                  {getClassCount(showArchiveConfirm.academicYear, showArchiveConfirm.semester)} classes
                </span>
                <span>
                  <Users className="w-3.5 h-3.5 inline mr-1" />
                  {getStudentCount(showArchiveConfirm.academicYear, showArchiveConfirm.semester)} students
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Students will be unenrolled and class data will be moved to archives. Quizzes that are only assigned to these classes will also be archived. This can be undone from the Archives page.
            </p>

            {archiving && archiveProgress && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{archiveProgress}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowArchiveConfirm(null)}
                disabled={archiving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 active:scale-95 hover:scale-105 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-800 font-semibold transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkArchive}
                disabled={archiving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              >
                {archiving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <FolderArchive className="w-4 h-4" />
                    Archive
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Notification Toast */}
      {mounted && notification.show && createPortal(
        <div
          className="fixed top-6 right-6 z-[60] animate-slideIn font-Poppins"
          style={{ maxWidth: '420px', minWidth: '320px' }}
        >
          <div
            className="rounded-2xl shadow-2xl overflow-hidden border"
            style={{
              background: 'white',
              borderColor: notification.type === 'success' ? '#bbf7d0' : '#fecaca',
            }}
          >
            <div className="px-5 py-4 flex items-start gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5"
                style={{
                  background: notification.type === 'success'
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : 'linear-gradient(135deg, #ef4444, #dc2626)',
                }}
              >
                {notification.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <XCircle className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="font-bold text-base mb-0.5"
                  style={{
                    color: notification.type === 'success' ? '#15803d' : '#dc2626',
                  }}
                >
                  {notification.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {notification.message}
                </p>
              </div>
              <button
                onClick={closeNotification}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {/* Progress bar */}
            <div className="h-1 w-full" style={{ background: '#f3f4f6' }}>
              <div
                className="h-full rounded-full"
                style={{
                  background: notification.type === 'success'
                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                    : 'linear-gradient(90deg, #ef4444, #dc2626)',
                  animation: 'shrinkWidth 4s linear forwards',
                }}
              />
            </div>
          </div>
          <style>{`
            @keyframes shrinkWidth {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>
        </div>,
        document.body
      )}
    </div>
  );
}
