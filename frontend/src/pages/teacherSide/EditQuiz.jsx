import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { ArrowLeft, Save, Edit3, Trash2, PlusCircle, X, CheckCircle, Loader2, BadgeQuestionMark, CircleStar, Copy, AlertTriangle } from "lucide-react";

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
        alert("Quiz not found!");
        navigate("/teacher/quizzes");
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      alert("Error loading quiz");
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

  const handleQuestionEdit = (index, question) => {
    setEditingQuestion(index);
    setEditForm({
      question: question.question,
      type: question.type,
      points: question.points,
      correct_answer: question.correct_answer || "",
      choices: question.choices ? [...question.choices] : null,
      bloom_classification: question.bloom_classification || "LOTS"
    });
  };

  const handleQuestionSave = (index) => {
    if (!editForm.question.trim()) {
      alert("Question text cannot be empty");
      return;
    }

    if (editForm.type === "multiple_choice") {
      if (!editForm.choices || editForm.choices.length < 2) {
        alert("Multiple choice must have at least 2 choices");
        return;
      }
      if (!editForm.choices.some(c => c.is_correct)) {
        alert("Please mark one choice as correct");
        return;
      }
      if (editForm.choices.some(c => !c.text.trim())) {
        alert("All choices must have text");
        return;
      }
    } else {
      if (!editForm.correct_answer.trim()) {
        alert("Correct answer cannot be empty");
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
      bloom_classification: editForm.bloom_classification
    };

    setQuiz({ ...quiz, questions: updatedQuestions });
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (index) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      const updatedQuestions = quiz.questions.filter((_, i) => i !== index);
      setQuiz({ ...quiz, questions: updatedQuestions });
    }
  };

  const handleAddQuestion = (type) => {
    const newQuestion = {
      type: type,
      question: "",
      points: 1,
      correct_answer: type === "true_false" ? "True" : "",
      choices: type === "multiple_choice" ? [
        { text: "", is_correct: false },
        { text: "", is_correct: false }
      ] : null,
      bloom_classification: "LOTS"
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
        { text: "", is_correct: false }
      ] : null,
      bloom_classification: "LOTS"
    });
  };

  const handleSaveQuiz = async () => {
    if (!quiz.title.trim()) {
      alert("Quiz title cannot be empty");
      return;
    }

    if (quiz.questions.length === 0) {
      alert("Quiz must have at least one question");
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
      
      alert("Quiz updated successfully!");
      navigate("/teacher/quizzes");
    } catch (error) {
      console.error("Error updating quiz:", error);
      alert("Error saving quiz. Please try again.");
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
    return (
      <div className="p-8 font-Outfit">
        <div className="flex items-center justify-center">
          <Loader2 className="animate-spin rounded-full h-5 w-5 text-accent"/>
          <span className="ml-3 text-gray-600">Loading quiz...</span>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return null;
  }

  const grouped = groupQuestionsByType(quiz.questions);
  const typeLabels = {
    multiple_choice: "Multiple Choice",
    true_false: "True/False",
    identification: "Identification"
  };

  const hasChanges = hasUnsavedChanges();

  return (
    <div className="px-2 py-6 md:p-8 font-Outfit">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => handleNavigation("/teacher/quizzes")}
          className="flex items-center gap-2 text-subtext hover:text-subsubtext"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Manage Quizzes
        </button>
        {hasChanges && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 border border-yellow-400 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-semibold text-yellow-700">You have unsaved changes</span>
          </div>
        )}
      </div>

      {/* Title Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-300 text-white p-6 rounded-3xl mb-6">
        {isEditingTitle ? (
          <div className="flex flex-col md:flex-row items-center gap-2">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="text-2xl font-bold bg-white text-gray-800 px-3 py-2 mr-2 rounded-xl flex-1"
              autoFocus
            />
            <button
              onClick={handleTitleSave}
              className="bg-accent hover:bg-accentHover px-4 py-2 rounded-xl transform-all active:scale-95 hover:scale-105 duration-200"
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
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold cursor-default">{quiz.title}</h2>
              <div className="flex items-center gap-6 text-sm text-white mt-2 cursor-default">
                <span className="flex flex-row gap-1 items-center"><BadgeQuestionMark className="w-4 h-4"/> {quiz.questions.length} questions</span>
                <span className="flex flex-row gap-1 items-center"><CircleStar className="w-4 h-4"/> {quiz.questions.reduce((sum, q) => sum + q.points, 0)} points</span>
              </div>
            </div>
            <button
              onClick={handleTitleEdit}
              className="bg-accent hover:bg-accentHover mt-4 md:mt-0 rounded-lg px-4 py-2 flex items-center gap-2 transform-all active:scale-95 hover:scale-105 duration-200"
            >
              <Edit3 className="w-4 h-4" /> Edit Title
            </button>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-8">
        {Object.entries(grouped).map(([type, questions]) => {
          if (questions.length === 0) return null;
          
          return (
            <div key={type} className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start gap-3 md:gap-0 border-b-2 border-accent pb-6">
                <h3 className="text-xl font-bold text-title flex items-start gap-2">
                  {typeLabels[type]}
                  <span className="text-sm bg-green-100 text-accent px-2 py-1 rounded-full">
                    {questions.length} {questions.length === 1 ? 'question' : 'questions'}
                  </span>
                </h3>
                <button
                  onClick={() => handleAddQuestion(type)}
                  className="flex items-center gap-1 bg-accent text-white px-3 py-2 rounded-lg hover:bg-accentHover transition text-sm transform-all active:scale-95 hover:scale-105 duration-200"
                >
                  <PlusCircle className="w-4 h-4" /> Add Question
                </button>
              </div>

              <div className="space-y-4">
                {questions.map((q) => {
                  const isEditing = editingQuestion === q.originalIndex;

                  return (  
                    <div key={q.originalIndex} className="bg-gray-50 p-6 border-2 rounded-3xl border-gray-200">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-md font-semibold mb-2">Question</label>
                            <textarea
                              value={editForm.question}
                              onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg"
                              rows="3"
                            />
                          </div>

                          <div className="flex gap-4">
                            <div className="w-32">
                              <label className="block text-md font-semibold mb-2">Points</label>
                              <input
                                type="number"
                                min="1"
                                value={editForm.points}
                                onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 border rounded-lg"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-md font-semibold mb-2">Classification</label>
                              <select
                                value={editForm.bloom_classification}
                                onChange={(e) => setEditForm({ ...editForm, bloom_classification: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                              >
                                <option value="LOTS">LOTS (Lower Order Thinking)</option>
                                <option value="HOTS">HOTS (Higher Order Thinking)</option>
                              </select>
                            </div>
                          </div>

                          {editForm.type === "multiple_choice" && (
                            <div>
                              <label className="block text-md font-semibold mb-2">Choices</label>
                              <div className="space-y-2">
                                {editForm.choices.map((choice, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      checked={choice.is_correct}
                                      onChange={() => {
                                        const newChoices = editForm.choices.map((c, idx) => ({
                                          ...c,
                                          is_correct: idx === i
                                        }));
                                        setEditForm({ ...editForm, choices: newChoices });
                                      }}
                                      className="w-4 h-4"
                                    />
                                    <input
                                      type="text"
                                      value={choice.text}
                                      onChange={(e) => {
                                        const newChoices = [...editForm.choices];
                                        newChoices[i].text = e.target.value;
                                        setEditForm({ ...editForm, choices: newChoices });
                                      }}
                                      placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                                      className="flex-1 px-3 py-2 border rounded-lg"
                                    />
                                    {editForm.choices.length > 2 && (
                                      <button
                                        onClick={() => {
                                          const newChoices = editForm.choices.filter((_, idx) => idx !== i);
                                          setEditForm({ ...editForm, choices: newChoices });
                                        }}
                                        className="text-red-600 hover:text-red-700 transform-all active:scale-95 hover:scale-105 duration-200"
                                      >
                                        <X className="w-5 h-5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <button
                                  onClick={() => {
                                    setEditForm({
                                      ...editForm,
                                      choices: [...editForm.choices, { text: "", is_correct: false }]
                                    });
                                  }}
                                  className="text-blue-600 text-md hover:underline flex items-center gap-1"
                                >
                                  <PlusCircle className="w-4 h-4" /> Add Choice
                                </button>
                              </div>
                            </div>
                          )}

                          {editForm.type === "true_false" && (
                            <div>
                              <label className="block text-sm font-semibold mb-2">Correct Answer</label>
                              <select
                                value={editForm.correct_answer}
                                onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                              >
                                <option value="True">True</option>
                                <option value="False">False</option>
                              </select>
                            </div>
                          )}

                          {editForm.type === "identification" && (
                            <div>
                              <label className="block text-sm font-semibold mb-2">Correct Answer</label>
                              <input
                                type="text"
                                value={editForm.correct_answer}
                                onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="Enter the correct answer"
                              />
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleQuestionSave(q.originalIndex)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-1 transform-all active:scale-95 hover:scale-105 duration-200"
                            >
                              <CheckCircle className="w-4 h-4" /> Save
                            </button>
                            <button
                              onClick={() => setEditingQuestion(null)}
                              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transform-all active:scale-95 hover:scale-105 duration-200"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(q.originalIndex)}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 ml-auto flex items-center gap-1 transform-all active:scale-95 hover:scale-105 duration-200"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start gap-3 mb-4">
                            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                              {q.originalIndex + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                  {q.type.replace("_", " ").toUpperCase()}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  q.bloom_classification === "HOTS" 
                                    ? "bg-purple-100 text-purple-700" 
                                    : "bg-yellow-100 text-yellow-700"
                                }`}>
                                  {q.bloom_classification}
                                </span>
                                <span className="text-sm text-gray-600 rounded-full px-3 py-1 bg-gray-100">
                                  {q.points} {q.points === 1 ? 'point' : 'points'}
                                </span>
                                <button
                                  onClick={() => handleQuestionEdit(q.originalIndex, q)}
                                  className="ml-auto text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                                >
                                  <Edit3 className="w-4 h-4" /><span className="hidden md:block">Edit</span>
                                </button>
                              </div>
                              <p className="text-lg font-semibold text-gray-800">{q.question}</p>
                            </div>
                          </div>

                          {q.choices && (
                            <div className="ml-11 space-y-2">
                              {q.choices.map((choice, i) => (
                                <div 
                                  key={i} 
                                  className={`p-3 rounded-lg border-2 ${
                                    choice.is_correct 
                                      ? "bg-green-50 border-green-400" 
                                      : "bg-white border-gray-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-700">
                                      {String.fromCharCode(65 + i)}.
                                    </span>
                                    <span className={choice.is_correct ? "text-green-700 font-semibold" : "text-gray-700"}>
                                      {choice.text}
                                    </span>
                                    {choice.is_correct && (
                                      <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {!q.choices && (
                            <div className="ml-11 mt-3">
                              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3">
                                <span className="text-sm text-gray-600 font-semibold">Correct Answer: </span>
                                <span className="text-green-700 font-bold">{q.correct_answer}</span>
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
      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={() => handleNavigation("/teacher/quizzes")}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transform-all active:scale-95 hover:scale-105 duration-200"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveQuiz}
          disabled={saving || !hasChanges}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed transform-all active:scale-95 hover:scale-105 duration-200"
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

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition transform-all active:scale-95 hover:scale-105 duration-200"
              >
                Stay and continue editing
              </button>
              <button
                onClick={handleConfirmNavigation}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition transform-all active:scale-95 hover:scale-105 duration-200"
              >
                Leave without saving
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}