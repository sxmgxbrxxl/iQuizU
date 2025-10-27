import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
 } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import {
  ArrowLeft,
  Save,
  Trash2,
  Settings,
  Clock,
  AlertCircle,
  Zap,
  Calendar,
} from "lucide-react";

export default function QuizSettings() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const assignmentData = location.state;

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    mode: "asynchronous",
    deadline: "",
    timeLimit: 0,
    shuffleQuestions: false,
    shuffleChoices: false,
    showResults: true,
    allowReview: true,
    passingScore: 60,
    maxAttempts: 1,
    showCorrectAnswers: true,
    isPublic: false,
    status: "published",
  });

  // ✅ Fetch quiz on mount
  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const docRef = doc(db, "quizzes", quizId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setQuiz({ id: docSnap.id, ...data });

        // ✅ Check if coming from assignment
        if (assignmentData?.fromAssignment) {
          // Use assignment-specific settings
          setSettings((prev) => ({
            ...prev,
            mode: assignmentData.mode || "asynchronous",
            deadline: assignmentData.dueDate || "",
            ...(data.settings || {}), // Merge with quiz settings
          }));
        } else {
          // Use default quiz settings
          if (data.settings) {
            setSettings((prev) => ({ ...prev, ...data.settings }));
          }
        }
      } else {
        alert("Quiz not found!");
        navigate("/teacher/quizzes");
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      alert("Error loading quiz.");
      navigate("/teacher/quizzes");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // ✅ If editing an assignment, update assignedQuizzes instead
      if (assignmentData?.fromAssignment) {
        const assignmentsRef = collection(db, "assignedQuizzes");
        const q = query(
          assignmentsRef,
          where("quizId", "==", quizId),
          where("classId", "==", assignmentData.classId)
        );
        const snapshot = await getDocs(q);
        
        const updatePromises = snapshot.docs.map((docSnap) =>
          updateDoc(doc(db, "assignedQuizzes", docSnap.id), {
            dueDate: settings.deadline || settings.dueDate,
            quizMode: settings.mode,
            settings: settings,
            updatedAt: new Date(),
          })
        );
        
        await Promise.all(updatePromises);
        alert(`✅ Assignment settings updated for ${assignmentData.className}!`);
      } else {
        // Original quiz settings update
        const docRef = doc(db, "quizzes", quizId);
        await updateDoc(docRef, {
          settings: settings,
          updatedAt: new Date(),
        });
        alert("✅ Settings saved successfully!");
      }
      
      navigate("/teacher/quizzes");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("❌ Error saving settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuiz = async () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${quiz.title}"? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      const docRef = doc(db, "quizzes", quizId);
      await deleteDoc(docRef);
      alert("✅ Quiz deleted successfully!");
      navigate("/teacher/quizzes");
    } catch (error) {
      console.error("Error deleting quiz:", error);
      alert("❌ Error deleting quiz. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-md">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading settings...</span>
        </div>
      </div>
    );
  }

  if (!quiz) return null;

  return (
    <div className="bg-white p-8 rounded-2xl shadow-md max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/teacher/quizzes")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Manage Quizzes
        </button>
      </div>

      <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white p-6 rounded-xl mb-8">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">Quiz Settings</h2>
            <p className="text-gray-300 text-sm mt-1">{quiz.title}</p>
            {assignmentData?.fromAssignment && (
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="bg-yellow-500 text-gray-900 px-3 py-1 rounded-full font-semibold">
                  Editing Assignment
                </span>
                <span>Class: {assignmentData.className}</span>
                <span>Students: {assignmentData.studentCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Quiz Mode */}
        <div className="border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold">Quiz Mode</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Choose how students will take this quiz
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <label
              className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition ${
                settings.mode === "asynchronous"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-300"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value="asynchronous"
                checked={settings.mode === "asynchronous"}
                onChange={(e) =>
                  setSettings({ ...settings, mode: e.target.value })
                }
                className="sr-only"
              />
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-bold">Asynchronous</span>
              </div>
              <p className="text-sm text-gray-600">
                Students can take the quiz anytime before the due date
              </p>
            </label>

            <label
              className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition ${
                settings.mode === "synchronous"
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-300 hover:border-purple-300"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value="synchronous"
                checked={settings.mode === "synchronous"}
                onChange={(e) =>
                  setSettings({ ...settings, mode: e.target.value })
                }
                className="sr-only"
              />
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-purple-600" />
                <span className="font-bold">Synchronous (Live)</span>
              </div>
              <p className="text-sm text-gray-600">
                All students take it together at the same time with live monitoring
              </p>
            </label>
          </div>

          {settings.mode === "asynchronous" && (
            <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-start gap-3 mb-4">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-blue-800 mb-1">
                    Assignment Deadline
                  </h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Set when students must submit their responses
                  </p>
                </div>
              </div>
              
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Due Date & Time
              </label>
              <input
                type="datetime-local"
                value={settings.deadline}
                onChange={(e) =>
                  setSettings({ ...settings, deadline: e.target.value })
                }
                className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-gray-500 mt-2">
                ✅ Students can submit anytime until this deadline
              </p>
            </div>
          )}

          {settings.mode === "synchronous" && (
            <div className="mt-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-purple-800 mb-1">
                    Live Monitoring Required
                  </h4>
                  <p className="text-sm text-purple-700 mb-2">
                    This mode requires you to START, monitor, and control the quiz session live from the Quiz Control Dashboard.
                  </p>
                  <div className="bg-white border border-purple-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-900 mb-1">📌 How it works:</p>
                    <ul className="text-xs text-gray-700 space-y-1 ml-4 list-disc">
                      <li>Students CANNOT access the quiz until you click START</li>
                      <li>You control when to open, pause, and end the session</li>
                      <li>Real-time monitoring like Kahoot</li>
                    </ul>
                  </div>
                </div>
              </div>

              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Expiration Deadline (Optional)
              </label>
              <input
                type="datetime-local"
                value={settings.deadline}
                onChange={(e) =>
                  setSettings({ ...settings, deadline: e.target.value })
                }
                className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-gray-500 mt-1">
                ⚠️ Safety net only - Quiz assignment will expire after this date if not taken
              </p>
            </div>
          )}
        </div>

        {/* Time Limit */}
        <div className="border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold">Time Settings</h3>
          </div>
          <label className="block text-sm font-semibold mb-2">
            Time Limit (minutes) - Set to 0 for no limit
          </label>
          <input
            type="number"
            min="0"
            value={settings.timeLimit}
            onChange={(e) =>
              setSettings({
                ...settings,
                timeLimit: parseInt(e.target.value) || 0,
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {settings.timeLimit === 0
              ? "No time limit"
              : `Students have ${settings.timeLimit} minutes to complete.`}
          </p>
        </div>

        {/* Randomization */}
        <div className="border-2 border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Randomization</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.shuffleQuestions}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    shuffleQuestions: e.target.checked,
                  })
                }
                className="w-5 h-5 text-blue-600"
              />
              <div>
                <div className="font-semibold">Shuffle Questions</div>
                <div className="text-sm text-gray-600">
                  Present questions in random order
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.shuffleChoices}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    shuffleChoices: e.target.checked,
                  })
                }
                className="w-5 h-5 text-blue-600"
              />
              <div>
                <div className="font-semibold">Shuffle Answer Choices</div>
                <div className="text-sm text-gray-600">
                  Randomize multiple choice options
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Scoring & Results */}
        <div className="border-2 border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Scoring & Results</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Passing Score (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.passingScore}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    passingScore: parseInt(e.target.value) || 60,
                  })
                }
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Maximum Attempts
              </label>
              <input
                type="number"
                min="1"
                value={settings.maxAttempts}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxAttempts: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showResults}
                onChange={(e) =>
                  setSettings({ ...settings, showResults: e.target.checked })
                }
                className="w-5 h-5 text-blue-600"
              />
              <div>
                <div className="font-semibold">
                  Show Results After Submission
                </div>
                <div className="text-sm text-gray-600">
                  Display score immediately after quiz completion
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showCorrectAnswers}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    showCorrectAnswers: e.target.checked,
                  })
                }
                className="w-5 h-5 text-blue-600"
              />
              <div>
                <div className="font-semibold">Show Correct Answers</div>
                <div className="text-sm text-gray-600">
                  Allow students to see correct answers after submission
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowReview}
                onChange={(e) =>
                  setSettings({ ...settings, allowReview: e.target.checked })
                }
                className="w-5 h-5 text-blue-600"
              />
              <div>
                <div className="font-semibold">Allow Review</div>
                <div className="text-sm text-gray-600">
                  Students can review their answers before submitting
                </div>
              </div>
            </label>
          </div>
        </div>

        {assignmentData?.fromAssignment && (
          <div className="border-2 border-yellow-200 rounded-xl p-4 bg-yellow-50 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-yellow-900 mb-1">
                  Editing Assignment for {assignmentData.className}
                </h4>
                <p className="text-sm text-yellow-800">
                  Changes here will only affect this specific assignment. 
                  The original quiz template remains unchanged.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Access Control */}
        <div className="border-2 border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Access Control</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.isPublic}
                onChange={(e) =>
                  setSettings({ ...settings, isPublic: e.target.checked })
                }
                className="w-5 h-5 text-blue-600"
              />
              <div>
                <div className="font-semibold">Public Quiz</div>
                <div className="text-sm text-gray-600">
                  Anyone with the code can take this quiz
                </div>
              </div>
            </label>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Quiz Status
              </label>
              <select
                value={settings.status}
                onChange={(e) =>
                  setSettings({ ...settings, status: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border-2 border-red-200 rounded-xl p-6 bg-red-50">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-bold text-red-700">Danger Zone</h3>
          </div>
          <p className="text-sm text-gray-700 mb-4">
            Once you delete a quiz, there is no going back. Please be certain.
          </p>
          <button
            onClick={handleDeleteQuiz}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            Delete Quiz
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={() => navigate("/teacher/quizzes")}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-gray-400"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}