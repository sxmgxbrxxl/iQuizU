import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { ArrowLeft, Save, Edit3, Trash2, PlusCircle, X, CheckCircle, Loader2, BadgeQuestionMark, CircleStar, Copy, AlertTriangle } from "lucide-react";
import { EditQuizSkeleton } from "../../components/SkeletonLoaders";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function EditQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [originalQuiz, setOriginalQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  // Custom Toast & Confirm Dialog state
  const [toast, setToast] = useState({ show: false, type: "", title: "", message: "" });
  const showToast = useCallback((type, title, message) => {
    setToast({ show: true, type, title, message });
  }, []);
  const [confirmDialogState, setConfirmDialogState] = useState({ isOpen: false });

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [quiz, originalQuiz, isEditingTitle, editedTitle]);

  const fetchQuiz = async () => {
    try {
      const docRef = doc(db, "quizzes", quizId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const quizData = { id: docSnap.id, ...docSnap.data() };
        setQuiz(quizData);
        setOriginalQuiz(JSON.parse(JSON.stringify(quizData)));
      } else {
        showToast("error", "Not Found", "Quiz not found!");
        navigate("/teacher/quizzes");
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      showToast("error", "Error", "Error loading quiz");
    } finally {
      setLoading(false);
    }
  };

  const hasUnsavedChanges = () => {
    if (!quiz || !originalQuiz) return false;

    const quizChanged = JSON.stringify(quiz) !== JSON.stringify(originalQuiz);
    const titleEditing = isEditingTitle;

    return quizChanged || titleEditing;
  };

  const handleNavigation = (path) => {
    if (hasUnsavedChanges()) {
      setPendingNavigation(path);
      setShowUnsavedModal(true);
    } else {
      navigate(path);
    }
  };

  const handleConfirmNavigation = () => {
    setShowUnsavedModal(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  };

  const handleTitleEdit = () => {
    setEditedTitle(quiz.title);
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    if (editedTitle.trim()) {
      setQuiz({ ...quiz, title: editedTitle });
      setIsEditingTitle(false);
    }
  };

  const padChoicesTo4 = (choices) => {
    const base = choices ? [...choices] : [];
    while (base.length < 4) base.push({ text: "", is_correct: false });
    return base.slice(0, 4); // cap at 4
  };

  const handleQuestionEdit = (index, question) => {
    setEditingQuestion(index);
    setEditForm({
      question: question.question,
      type: question.type,
      points: question.points,
      correct_answer: question.correct_answer || "",
      choices: question.type === "multiple_choice" ? padChoicesTo4(question.choices) : null,
      bloom_classification: question.bloom_classification || "LOTS",
      cognitive_level: question.cognitive_level || "remembering",
      difficulty: question.difficulty || "easy"
    });
  };

  const handleQuestionSave = (index) => {
    if (!editForm.question.trim()) {
      showToast("warning", "Validation", "Question text cannot be empty");
      return;
    }

    if (editForm.type === "multiple_choice") {
      if (!editForm.choices || editForm.choices.length < 2) {
        showToast("warning", "Validation", "Multiple choice must have at least 2 choices");
        return;
      }
      if (!editForm.choices.some(c => c.is_correct)) {
        showToast("warning", "Validation", "Please mark one choice as correct");
        return;
      }
      if (editForm.choices.some(c => !c.text.trim())) {
        showToast("warning", "Validation", "All choices must have text");
        return;
      }
    } else {
      if (!editForm.correct_answer.trim()) {
        showToast("warning", "Validation", "Correct answer cannot be empty");
        return;
      }
    }

    const updatedQuestions = [...quiz.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      question: editForm.question,
      points: editForm.points,
      correct_answer: editForm.correct_answer,
      choices: editForm.choices,
      bloom_classification: editForm.bloom_classification,
      cognitive_level: editForm.cognitive_level,
      difficulty: editForm.difficulty
    };

    setQuiz({ ...quiz, questions: updatedQuestions });
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (index) => {
    setConfirmDialogState({
      isOpen: true,
      title: "Delete Question?",
      message: "Are you sure you want to delete this question? This action cannot be undone.",
      confirmLabel: "Delete",
      color: "red",
      onConfirm: () => {
        const updatedQuestions = quiz.questions.filter((_, i) => i !== index);
        setQuiz({ ...quiz, questions: updatedQuestions });
        setConfirmDialogState({ isOpen: false });
        showToast("success", "Deleted", "Question deleted successfully");
      },
      onCancel: () => setConfirmDialogState({ isOpen: false }),
    });
  };

  const handleAddQuestion = (type) => {
    const newQuestion = {
      type: type,
      question: "",
      points: 1,
      correct_answer: type === "true_false" ? "True" : "",
      choices: type === "multiple_choice" ? [
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ] : null,
      bloom_classification: "LOTS",
      cognitive_level: "remembering",
      difficulty: "easy"
    };

    setQuiz({
      ...quiz,
      questions: [...quiz.questions, newQuestion]
    });

    setEditingQuestion(quiz.questions.length);
    setEditForm({
      question: "",
      type: type,
      points: 1,
      correct_answer: type === "true_false" ? "True" : "",
      choices: type === "multiple_choice" ? [
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ] : null,
      bloom_classification: "LOTS",
      cognitive_level: "remembering",
      difficulty: "easy"
    });
  };

  const handleSaveQuiz = async () => {
    if (!quiz.title.trim()) {
      showToast("warning", "Missing Title", "Quiz title cannot be empty");
      return;
    }

    if (quiz.questions.length === 0) {
      showToast("warning", "Empty Quiz", "Quiz must have at least one question");
      return;
    }

    setSaving(true);
    try {
      const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
      const hotsCount = quiz.questions.filter(q => q.bloom_classification === "HOTS").length;
      const lotsCount = quiz.questions.filter(q => q.bloom_classification === "LOTS").length;

      const docRef = doc(db, "quizzes", quizId);
      await updateDoc(docRef, {
        title: quiz.title,
        questions: quiz.questions,
        totalPoints: totalPoints,
        classificationStats: {
          hots_count: hotsCount,
          lots_count: lotsCount,
          hots_percentage: ((hotsCount / quiz.questions.length) * 100).toFixed(1),
          lots_percentage: ((lotsCount / quiz.questions.length) * 100).toFixed(1)
        },
        updatedAt: new Date()
      });

      // Update original quiz to match current quiz (no more unsaved changes)
      setOriginalQuiz(JSON.parse(JSON.stringify(quiz)));

      showToast("success", "Saved!", "Quiz updated successfully!");
      setTimeout(() => navigate("/teacher/quizzes"), 1500);
    } catch (error) {
      console.error("Error updating quiz:", error);
      showToast("error", "Error", "Error saving quiz. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const groupQuestionsByType = (questions) => {
    const grouped = {
      multiple_choice: [],
      true_false: [],
      identification: []
    };

    questions.forEach((q, index) => {
      grouped[q.type].push({ ...q, originalIndex: index });
    });

    return grouped;
  };

  if (loading) {
    return <EditQuizSkeleton />;
  }

  if (!quiz) {
    return null;
  }

  const grouped = groupQuestionsByType(quiz.questions);
  const typeLabels = {
    multiple_choice: "Multiple Choice",
    true_false: "True/False",
    identification: "Matching Type"
  };
  // Always show all three sections so teachers can add any type
  const allTypes = ["multiple_choice", "true_false", "identification"];

  const hasChanges = hasUnsavedChanges();

  return (
    <div className="w-full font-Poppins">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mb-6">
        <button
          onClick={() => handleNavigation("/teacher/quizzes")}
          className="flex items-center gap-2 text-subtext hover:text-subsubtext text-sm md:text-base"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Manage Quizzes
        </button>
        {hasChanges && (
          <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-yellow-100 border border-yellow-400 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="text-xs md:text-sm font-semibold text-yellow-700">Unsaved changes</span>
          </div>
        )}
      </div>

      {/* Title Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-300 text-white p-4 md:p-6 rounded-3xl mb-6">
        {isEditingTitle ? (
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="text-base md:text-xl font-bold bg-white text-gray-800 px-3 py-2 mr-2 rounded-xl flex-1 w-full"
              autoFocus
            />
            <button
              onClick={handleTitleSave}
              className="bg-blue-600 hover:bg-blue-600Hover px-4 py-2 rounded-xl transform-all active:scale-95 hover:scale-105 duration-200"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditingTitle(false)}
              className="bg-subtext hover:bg-subsubtext px-4 py-2 rounded-xl transform-all active:scale-95 hover:scale-105 duration-200"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-bold cursor-default">{quiz.title}</h2>
              <div className="flex items-center gap-6 text-sm text-white mt-2 cursor-default">
                <span className="flex flex-row gap-1 items-center"><BadgeQuestionMark className="w-4 h-4" /> {quiz.questions.length} questions</span>
                <span className="flex flex-row gap-1 items-center"><CircleStar className="w-4 h-4" /> {quiz.questions.reduce((sum, q) => sum + q.points, 0)} points</span>
              </div>
            </div>
            <button
              onClick={handleTitleEdit}
              className="bg-blue-600 hover:bg-blue-600Hover mt-4 md:mt-0 rounded-lg px-4 py-2 flex items-center gap-2 transform-all active:scale-95 hover:scale-105 duration-200"
            >
              <Edit3 className="w-4 h-4" /> Edit Title
            </button>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-8">
        {allTypes.map((type) => {
          const questions = grouped[type] || [];

          return (
            <div key={type} className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start gap-3 md:gap-0 border-b-2 border-blue-600 pb-6">
                <h3 className="text-lg md:text-xl font-bold text-title flex items-start gap-2">
                  {typeLabels[type]}
                  <span className="text-sm bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                    {questions.length} {questions.length === 1 ? 'question' : 'questions'}
                  </span>
                </h3>
                <button
                  onClick={() => handleAddQuestion(type)}
                  className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-600Hover transition text-sm transform-all active:scale-95 hover:scale-105 duration-200"
                >
                  <PlusCircle className="w-4 h-4" /> Add {typeLabels[type]}
                </button>
              </div>

              {questions.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 text-sm">No {typeLabels[type]} questions yet. Click "Add {typeLabels[type]}" to add one.</p>
                </div>
              )}

              <div className="space-y-4">
                {questions.map((q) => {
                  const isEditing = editingQuestion === q.originalIndex;

                  return (
                    <div key={q.originalIndex} className="bg-gray-50 p-4 md:p-6 border-2 rounded-3xl border-gray-200">
                      {isEditing ? (
                        <div className="space-y-5">
                          {/* Question Text */}
                          <div>
                            <label className="block text-sm font-bold mb-1.5 text-gray-700">Question *</label>
                            <textarea
                              value={editForm.question}
                              onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition resize-none"
                              rows="3"
                              placeholder="Type your question here..."
                            />
                          </div>

                          {/* Metadata Row */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs font-bold mb-1.5 text-gray-500 uppercase tracking-wide">Points</label>
                              <input
                                type="number"
                                min="1"
                                value={editForm.points}
                                onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 transition text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold mb-1.5 text-gray-500 uppercase tracking-wide">LOTS / HOTS</label>
                              <select
                                value={editForm.bloom_classification}
                                onChange={(e) => setEditForm({ ...editForm, bloom_classification: e.target.value })}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 transition text-sm"
                              >
                                <option value="LOTS">LOTS</option>
                                <option value="HOTS">HOTS</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold mb-1.5 text-gray-500 uppercase tracking-wide">Cognitive Level</label>
                              <select
                                value={editForm.cognitive_level || "remembering"}
                                onChange={(e) => setEditForm({ ...editForm, cognitive_level: e.target.value })}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 transition text-sm"
                              >
                                <option value="remembering">Remembering</option>
                                <option value="understanding">Understanding</option>
                                <option value="application">Application</option>
                                <option value="analysis">Analysis</option>
                                <option value="evaluation">Evaluation</option>
                                <option value="creating">Creating</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold mb-1.5 text-gray-500 uppercase tracking-wide">Difficulty</label>
                              <select
                                value={editForm.difficulty || "easy"}
                                onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 transition text-sm"
                              >
                                <option value="easy">Easy</option>
                                <option value="average">Average</option>
                                <option value="difficult">Difficult</option>
                              </select>
                            </div>
                          </div>

                          {/* Multiple Choice — fixed 4 choices */}
                          {editForm.type === "multiple_choice" && (
                            <div>
                              <label className="block text-sm font-bold mb-2 text-gray-700">Choices <span className="text-xs font-normal text-gray-400">(select the correct answer)</span></label>
                              <div className="space-y-2">
                                {editForm.choices.map((choice, i) => (
                                  <div
                                    key={i}
                                    onClick={() => {
                                      const newChoices = editForm.choices.map((c, idx) => ({ ...c, is_correct: idx === i }));
                                      setEditForm({ ...editForm, choices: newChoices });
                                    }}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                      choice.is_correct
                                        ? "bg-blue-50 border-blue-500"
                                        : "bg-white border-gray-200 hover:border-blue-300"
                                    }`}
                                  >
                                    <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                                      choice.is_correct
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-white border-gray-300 text-gray-500"
                                    }`}>
                                      {String.fromCharCode(65 + i)}
                                    </span>
                                    <input
                                      type="text"
                                      value={choice.text}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        const newChoices = [...editForm.choices];
                                        newChoices[i] = { ...newChoices[i], text: e.target.value };
                                        setEditForm({ ...editForm, choices: newChoices });
                                      }}
                                      placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                                      className="flex-1 bg-transparent outline-none text-sm font-medium text-gray-800 placeholder-gray-400"
                                    />
                                    {choice.is_correct && (
                                      <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* True/False — button toggle */}
                          {editForm.type === "true_false" && (
                            <div>
                              <label className="block text-sm font-bold mb-2 text-gray-700">Correct Answer</label>
                              <div className="flex gap-3">
                                {["True", "False"].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => setEditForm({ ...editForm, correct_answer: val })}
                                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                                      editForm.correct_answer === val
                                        ? "bg-blue-600 border-blue-600 text-white shadow-md"
                                        : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                                    }`}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Matching Type */}
                          {editForm.type === "identification" && (
                            <div>
                              <label className="block text-sm font-bold mb-1.5 text-gray-700">Correct Answer *</label>
                              <input
                                type="text"
                                value={editForm.correct_answer}
                                onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition text-sm"
                                placeholder="Enter the correct answer"
                              />
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                            <button
                              onClick={() => handleQuestionSave(q.originalIndex)}
                              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 text-sm font-semibold transform-all active:scale-95 hover:scale-105 duration-200"
                            >
                              <CheckCircle className="w-4 h-4" /> Save Question
                            </button>
                            <button
                              onClick={() => setEditingQuestion(null)}
                              className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-200 text-sm font-semibold transform-all active:scale-95 hover:scale-105 duration-200"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(q.originalIndex)}
                              className="ml-auto bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 flex items-center gap-1.5 text-sm font-semibold transform-all active:scale-95 hover:scale-105 duration-200"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start gap-3 mb-4">
                            <span className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm md:text-base">
                              {q.originalIndex + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5 md:gap-2 flex-wrap flex-1">
                                  <span className="px-2 py-0.5 md:px-3 md:py-1 bg-blue-100 text-blue-700 text-[10px] md:text-xs font-semibold rounded-full">
                                    {q.type.replace("_", " ").toUpperCase()}
                                  </span>
                                  <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold border-2 ${q.bloom_classification === "HOTS"
                                    ? "bg-purple-100 text-purple-700 border-purple-300"
                                    : "bg-blue-100 text-blue-700 border-blue-300"
                                    }`}>
                                    {q.bloom_classification}
                                  </span>
                                  {q.cognitive_level && (
                                    <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${q.cognitive_level === "remembering" ? "bg-blue-50 text-blue-600" :
                                      q.cognitive_level === "understanding" ? "bg-cyan-50 text-cyan-600" :
                                        q.cognitive_level === "application" ? "bg-teal-50 text-teal-600" :
                                          q.cognitive_level === "analysis" ? "bg-purple-50 text-purple-600" :
                                            q.cognitive_level === "evaluation" ? "bg-pink-50 text-pink-600" :
                                              q.cognitive_level === "creating" ? "bg-red-50 text-red-600" :
                                                "bg-gray-100 text-gray-700"
                                      }`}>
                                      {q.cognitive_level.charAt(0).toUpperCase() + q.cognitive_level.slice(1)}
                                    </span>
                                  )}
                                  {(() => {
                                    const diff = q.difficulty || "easy";
                                    const diffColors = {
                                      easy: "bg-green-100 text-green-700 border-green-300",
                                      average: "bg-yellow-100 text-yellow-700 border-yellow-300",
                                      difficult: "bg-red-100 text-red-700 border-red-300",
                                    };
                                    return (
                                      <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold border-2 ${diffColors[diff] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
                                        {diff.charAt(0).toUpperCase() + diff.slice(1)}
                                      </span>
                                    );
                                  })()}
                                  <span className="text-[10px] md:text-sm text-gray-600 rounded-full px-2 py-0.5 md:px-3 md:py-1 bg-gray-100">
                                    {q.points} {q.points === 1 ? 'point' : 'points'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleQuestionEdit(q.originalIndex, q)}
                                  className="flex-shrink-0 ml-2 text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                                >
                                  <Edit3 className="w-4 h-4" /><span className="hidden md:block">Edit</span>
                                </button>
                              </div>
                              <p className="text-base md:text-lg font-semibold text-gray-800">{q.question}</p>
                            </div>
                          </div>

                          {q.choices && (
                            <div className="ml-6 md:ml-11 space-y-2">
                              {q.choices.map((choice, i) => (
                                <div
                                  key={i}
                                  className={`p-3 rounded-lg border-2 ${choice.is_correct
                                    ? "bg-blue-50 border-blue-400"
                                    : "bg-white border-gray-200"
                                    }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-700">
                                      {String.fromCharCode(65 + i)}.
                                    </span>
                                    <span className={choice.is_correct ? "text-blue-700 font-semibold" : "text-gray-700"}>
                                      {choice.text}
                                    </span>
                                    {choice.is_correct && (
                                      <CheckCircle className="w-5 h-5 text-blue-600 ml-auto" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {!q.choices && (
                            <div className="ml-6 md:ml-11 mt-3">
                              <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-3">
                                <span className="text-sm text-gray-600 font-semibold">Correct Answer: </span>
                                <span className="text-blue-700 font-bold">{q.correct_answer}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="mt-8 flex flex-col-reverse md:flex-row justify-end gap-3">
        <button
          onClick={() => handleNavigation("/teacher/quizzes")}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transform-all active:scale-95 hover:scale-105 duration-200 text-center"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveQuiz}
          disabled={saving || !hasChanges}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed transform-all active:scale-95 hover:scale-105 duration-200"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <h2 className="text-xl font-bold text-gray-800">Unsaved Changes</h2>
            </div>

            <p className="text-gray-600 mb-6">
              You have unsaved changes. Are you sure you want to leave without saving?
            </p>

            <div className="flex flex-col-reverse md:flex-row gap-3 justify-end">
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition transform-all active:scale-95 hover:scale-105 duration-200 text-center"
              >
                Stay and continue editing
              </button>
              <button
                onClick={handleConfirmNavigation}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition transform-all active:scale-95 hover:scale-105 duration-200 text-center"
              >
                Leave without saving
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast */}
      <Toast {...toast} onClose={() => setToast(prev => ({ ...prev, show: false }))} />

      {/* Custom Confirm Dialog */}
      <ConfirmDialog {...confirmDialogState} />
    </div>
  );
}