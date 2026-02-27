import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { collection, query, where, getDocs, doc, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { Archive, RefreshCw, Trash2, Calendar, FileText, Award, Loader2, CheckCircle, XCircle, X } from "lucide-react";

export default function ArchivedQuizzes({ user }) {
  const [archivedQuizzes, setArchivedQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: "", title: "", message: "" });

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

  // Lock scroll when delete confirm modal is open
  useEffect(() => {
    if (!showDeleteConfirm) return;
    const scrollableParent = document.querySelector('.overflow-y-auto');
    document.body.style.overflow = 'hidden';
    if (scrollableParent) scrollableParent.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      if (scrollableParent) scrollableParent.style.overflow = '';
    };
  }, [showDeleteConfirm]);

  useEffect(() => {
    fetchArchivedQuizzes();
  }, [user]);

  const fetchArchivedQuizzes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, "archivedQuizzes"),
        where("teacherId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);

      const quizList = [];
      querySnapshot.forEach((docSnapshot) => {
        quizList.push({ id: docSnapshot.id, ...docSnapshot.data() });
      });

      quizList.sort((a, b) => {
        const dateA = a.archivedAt?.toDate ? a.archivedAt.toDate() : new Date(0);
        const dateB = b.archivedAt?.toDate ? b.archivedAt.toDate() : new Date(0);
        return dateB - dateA;
      });

      setArchivedQuizzes(quizList);
    } catch (error) {
      console.error("Error fetching archived quizzes:", error);
      showNotification("error", "Load Failed", "Failed to load archived quizzes.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (quiz) => {
    setRestoring(quiz.id);
    try {
      const originalQuizId = quiz.originalQuizId || quiz.id;

      // Prepare quiz data for restoration
      const quizData = { ...quiz };
      delete quizData.id;
      delete quizData.archivedAt;
      delete quizData.archivedBy;
      delete quizData.originalQuizId;
      delete quizData.status;

      quizData.mode = "Published";
      quizData.status = "published";
      quizData.createdAt = new Date();
      quizData.updatedAt = new Date();

      // Restore to quizzes collection using setDoc
      const quizRef = doc(db, "quizzes", originalQuizId);
      await setDoc(quizRef, quizData);

      // Delete from archivedQuizzes
      await deleteDoc(doc(db, "archivedQuizzes", quiz.id));

      // Refresh list
      await fetchArchivedQuizzes();

      showNotification("success", "Quiz Restored!", `"${quiz.title}" has been restored successfully.`);
    } catch (error) {
      console.error("Error restoring quiz:", error);
      showNotification("error", "Restore Failed", "Failed to restore quiz. Please try again.");
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (quizId) => {
    setDeleting(quizId);
    try {
      await deleteDoc(doc(db, "archivedQuizzes", quizId));
      await fetchArchivedQuizzes();
      showNotification("success", "Quiz Deleted", "The quiz has been permanently deleted.");
    } catch (error) {
      console.error("Error deleting quiz:", error);
      showNotification("error", "Delete Failed", "Failed to delete quiz. Please try again.");
    } finally {
      setDeleting(null);
      setShowDeleteConfirm(null);
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

  const getModeColor = (mode) => {
    switch (mode) {
      case "Published":
        return "bg-blue-100 text-blue-700";
      case "Draft":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  if (loading) {
    return (
      <div className="py-6 px-2 md:p-8 font-Outfit animate-fadeIn">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Archive className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-800">Archived Quizzes</h1>
            </div>
            <p className="text-gray-600">
              Manage your archived quizzes. You can restore or permanently delete them.
            </p>
          </div>

          {/* Skeleton Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                {/* Skeleton gradient header */}
                <div className="bg-gradient-to-r from-gray-200 to-gray-300 p-4 animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-white/30 rounded" />
                    <div className="h-5 bg-white/30 rounded-lg flex-1" />
                  </div>
                  <div className="h-6 bg-white/30 rounded-lg w-20" />
                </div>
                {/* Skeleton body */}
                <div className="p-4 space-y-3 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded-lg w-20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded-lg w-24" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded-lg w-36" />
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <div className="h-3 bg-gray-200 rounded-lg w-24 mb-2" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded w-16" />
                      <div className="h-6 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex gap-2">
                    <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
                    <div className="w-12 h-10 bg-gray-200 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-2 md:p-8 font-Outfit animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Archive className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Archived Quizzes</h1>
          </div>
          <p className="text-gray-600">
            Manage your archived quizzes. You can restore or permanently delete them.
          </p>
        </div>

        {/* Quizzes Grid */}
        {archivedQuizzes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center border border-gray-100 animate-slideIn">
            <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Archived Quizzes</h2>
            <p className="text-gray-500">
              Quizzes you archive will appear here for safekeeping.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slideIn">
            {archivedQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
              >
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-300 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-white flex-shrink-0" />
                    <h3 className="text-lg font-bold text-white truncate flex-1">
                      {quiz.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getModeColor(quiz.mode)}`}>
                      {quiz.mode || "Published"}
                    </span>
                  </div>
                </div>

                {/* Quiz Details */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Award className="w-4 h-4 flex-shrink-0" />
                    <span>{quiz.totalPoints || 0} points</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span>{quiz.questions?.length || 0} questions</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>Archived: {formatDate(quiz.archivedAt)}</span>
                  </div>

                  {/* Classification Stats */}
                  {quiz.classificationStats && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 font-semibold mb-2">Classification:</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                          HOTS: {quiz.classificationStats.hots_count || 0}
                        </span>
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          LOTS: {quiz.classificationStats.lots_count || 0}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={() => handleRestore(quiz)}
                      disabled={restoring === quiz.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-all font-semibold"
                      title="Restore this quiz"
                    >
                      {restoring === quiz.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Restoring...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          <span className="text-sm">Restore</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setShowDeleteConfirm(quiz.id)}
                      disabled={deleting === quiz.id}
                      className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-all font-semibold"
                      title="Permanently delete this quiz"
                    >
                      {deleting === quiz.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {mounted && showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn font-Outfit">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md text-center animate-slideUp">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Permanently Delete Quiz?
            </h2>

            <p className="text-gray-600 mb-4">
              This action cannot be undone. All quiz data will be permanently deleted from the system.
            </p>

            {/* Find the quiz being deleted */}
            {archivedQuizzes.find(q => q.id === showDeleteConfirm) && (
              <p className="text-sm text-gray-500 mb-6 p-2 bg-gray-100 rounded-lg">
                <strong>Quiz:</strong> {archivedQuizzes.find(q => q.id === showDeleteConfirm)?.title}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 active:scale-95 hover:scale-105 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-800 font-semibold transition-all"
              >
                Cancel
              </button>

              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deleting === showDeleteConfirm}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold transition-all flex items-center justify-center gap-2"
              >
                {deleting === showDeleteConfirm ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Permanently"
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
          className="fixed top-6 right-6 z-[60] animate-slideIn font-Outfit"
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