import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../firebase/firebaseConfig";
import {
  Megaphone,
  Plus,
  Trash2,
  Send,
  Users,
  GraduationCap,
  Globe,
  AlertTriangle,
  Info,
  X,
  Clock,
} from "lucide-react";
import { SkeletonBlock, SkeletonKeyframes } from "../../components/SkeletonLoaders";

const ManageAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [priority, setPriority] = useState("normal");

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAnnouncements(data);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "announcements"), {
        title: title.trim(),
        message: message.trim(),
        targetAudience,
        priority,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || "admin",
      });

      setTitle("");
      setMessage("");
      setTargetAudience("all");
      setPriority("normal");
      setShowForm(false);
      fetchAnnouncements();
    } catch (error) {
      console.error("Error creating announcement:", error);
      alert("Failed to create announcement. Please try again.");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;

    setDeleting(id);
    try {
      await deleteDoc(doc(db, "announcements", id));
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      console.error("Error deleting announcement:", error);
      alert("Failed to delete announcement.");
    }
    setDeleting(null);
  };

  const getAudienceIcon = (audience) => {
    switch (audience) {
      case "teachers": return <Users size={14} />;
      case "students": return <GraduationCap size={14} />;
      default: return <Globe size={14} />;
    }
  };

  const getAudienceLabel = (audience) => {
    switch (audience) {
      case "teachers": return "Teachers Only";
      case "students": return "Students Only";
      default: return "Everyone";
    }
  };

  const getAudienceColor = (audience) => {
    switch (audience) {
      case "teachers": return "bg-blue-100 text-blue-700";
      case "students": return "bg-green-100 text-green-700";
      default: return "bg-violet-100 text-violet-700";
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen font-Poppins animate-fadeIn">
      <SkeletonKeyframes />
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-200">
                <Megaphone size={26} />
              </div>
              Announcements
            </h1>
            <p className="text-gray-500 mt-1 ml-1">Broadcast messages to teachers and students</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 ${
              showForm
                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? "Cancel" : "New Announcement"}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8 animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
              <Send size={20} className="text-indigo-500" />
              Create New Announcement
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. System Maintenance Bukas!"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all text-sm"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your announcement message here..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all text-sm resize-none"
                  required
                />
              </div>

              {/* Audience & Priority Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Target Audience */}
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5">Target Audience</label>
                  <div className="flex gap-2">
                    {[
                      { value: "all", label: "Everyone", icon: Globe },
                      { value: "teachers", label: "Teachers", icon: Users },
                      { value: "students", label: "Students", icon: GraduationCap },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTargetAudience(opt.value)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                          targetAudience === opt.value
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                            : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <opt.icon size={14} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5">Priority</label>
                  <div className="flex gap-2">
                    {[
                      { value: "normal", label: "Normal", icon: Info, color: "bg-blue-600" },
                      { value: "urgent", label: "Urgent", icon: AlertTriangle, color: "bg-red-600" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPriority(opt.value)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                          priority === opt.value
                            ? `${opt.color} text-white border-transparent shadow-md`
                            : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <opt.icon size={14} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !message.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  <Send size={16} />
                  {submitting ? "Publishing..." : "Publish Announcement"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Announcements List */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                  <div className="flex items-start justify-between mb-3">
                    <SkeletonBlock width="60%" height="20px" delay={i * 0.1} />
                    <SkeletonBlock width="80px" height="24px" rounded="999px" delay={i * 0.1 + 0.05} />
                  </div>
                  <SkeletonBlock width="100%" height="14px" delay={i * 0.1 + 0.1} className="mb-2" />
                  <SkeletonBlock width="75%" height="14px" delay={i * 0.1 + 0.15} />
                  <div className="flex items-center gap-3 mt-4">
                    <SkeletonBlock width="120px" height="12px" delay={i * 0.1 + 0.2} />
                    <SkeletonBlock width="100px" height="12px" delay={i * 0.1 + 0.25} />
                  </div>
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Megaphone size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-500 mb-1">No Announcements Yet</h3>
              <p className="text-gray-400 text-sm">Click "New Announcement" to broadcast your first message.</p>
            </div>
          ) : (
            announcements.map((ann) => (
              <div
                key={ann.id}
                className={`bg-white rounded-2xl border shadow-sm p-6 hover:shadow-md transition-all group ${
                  ann.priority === "urgent"
                    ? "border-red-200 bg-gradient-to-r from-white to-red-50/30"
                    : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {ann.priority === "urgent" && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                          <AlertTriangle size={12} /> URGENT
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-gray-800 truncate">{ann.title}</h3>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap text-justify">{ann.message}</p>

                    <div className="flex items-center gap-3 mt-4 flex-wrap">
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getAudienceColor(ann.targetAudience)}`}>
                        {getAudienceIcon(ann.targetAudience)}
                        {getAudienceLabel(ann.targetAudience)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={12} />
                        {formatDate(ann.createdAt)}
                      </span>
                      <span className="text-xs text-gray-400">
                        by {ann.createdBy}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(ann.id)}
                    disabled={deleting === ann.id}
                    className="flex-shrink-0 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Delete announcement"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageAnnouncements;
