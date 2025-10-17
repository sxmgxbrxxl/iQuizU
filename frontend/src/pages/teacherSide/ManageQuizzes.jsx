
import { useState } from "react";
import { FileUp, Edit3, Settings, Send, PlusCircle, X, Loader2, CheckCircle, Trash2, Brain } from "lucide-react";

export default function ManageQuizzes() {
  const [quizzes, setQuizzes] = useState([
    { id: 1, title: "Midterm Quiz", mode: "Synchronous", code: "QZ1234" },
    { id: 2, title: "Pre-Final Assessment", mode: "Asynchronous", code: "QZ5678" },
  ]);

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [numMC, setNumMC] = useState(5);
  const [numTF, setNumTF] = useState(5);
  const [numID, setNumID] = useState(5);
  const [loading, setLoading] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      alert("Please select a PDF file");
    }
  };

  const handleGenerateQuiz = async () => {
    if (!selectedFile) {
      alert("Please select a PDF file");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("num_multiple_choice", numMC);
    formData.append("num_true_false", numTF);
    formData.append("num_identification", numID);
    formData.append("title", quizTitle || "Generated Quiz");

    try {
      const response = await fetch("http://localhost:8000/api/quiz/generate-from-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedQuiz(data.quiz);
        setShowPdfModal(false);
        setShowPreviewModal(true);
      } else {
        alert("Failed to generate quiz: " + data.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error generating quiz. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const closePdfModal = () => {
    setShowPdfModal(false);
    setSelectedFile(null);
    setQuizTitle("");
  };

  const closePreviewModal = () => {
    setShowPreviewModal(false);
    setIsEditingTitle(false);
    setEditingQuestion(null);
  };

  const handleTitleEdit = () => {
    setEditedTitle(generatedQuiz.title);
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    if (editedTitle.trim()) {
      setGeneratedQuiz({ ...generatedQuiz, title: editedTitle });
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

    const updatedQuestions = [...generatedQuiz.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      question: editForm.question,
      points: editForm.points,
      correct_answer: editForm.correct_answer,
      choices: editForm.choices,
      bloom_classification: editForm.bloom_classification
    };

    setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions });
    setEditingQuestion(null);
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
      bloom_classification: "LOTS",
      classification_confidence: 0
    };

    setGeneratedQuiz({
      ...generatedQuiz,
      questions: [...generatedQuiz.questions, newQuestion]
    });

    setEditingQuestion(generatedQuiz.questions.length);
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

  const handleDeleteQuestion = (index) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      const updatedQuestions = generatedQuiz.questions.filter((_, i) => i !== index);
      setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions });
      setEditingQuestion(null);
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

  const handleSaveQuiz = () => {
    if (generatedQuiz) {
      const newQuiz = {
        id: quizzes.length + 1,
        title: generatedQuiz.title,
        mode: "Published",
        code: `QZ${Math.floor(1000 + Math.random() * 9000)}`
      };
      setQuizzes([...quizzes, newQuiz]);
      setShowPreviewModal(false);
      setGeneratedQuiz(null);
      alert("Quiz published successfully!");
    }
  };

  // Helper function to get badge color
  const getClassificationBadge = (classification, confidence) => {
    const isHOTS = classification === "HOTS";
    const bgColor = isHOTS ? "bg-purple-100" : "bg-blue-100";
    const textColor = isHOTS ? "text-purple-700" : "text-blue-700";
    const borderColor = isHOTS ? "border-purple-300" : "border-blue-300";
    
    return (
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${bgColor} ${textColor} ${borderColor}`}>
          {classification}
        </span>
        {confidence && (
          <span className="text-xs text-gray-500">
            {(confidence * 100).toFixed(1)}%
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        📝 Manage Quizzes
      </h2>

      {/* Create Quiz Options */}
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 mb-8">
        <h3 className="text-lg font-semibold mb-3">Create New Quiz</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <FileUp className="w-5 h-5" /> Upload PDF (AI Generate)
          </button>
          <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
            <PlusCircle className="w-5 h-5" /> Manual Quiz Creation
          </button>
        </div>
      </div>

      {/* Quiz Library */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Quiz Library</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="border rounded-xl p-5 shadow-sm hover:shadow-md transition bg-yellow-50"
            >
              <h4 className="text-lg font-bold text-gray-800">{quiz.title}</h4>
              <p className="text-gray-600 text-sm">Mode: {quiz.mode}</p>
              <p className="text-gray-500 text-sm">Code: {quiz.code}</p>

              <div className="flex justify-between items-center mt-4">
                <button className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
                  <Edit3 className="w-4 h-4" /> Edit
                </button>
                <button className="text-gray-700 font-semibold hover:underline flex items-center gap-1">
                  <Settings className="w-4 h-4" /> Settings
                </button>
                <button className="text-green-600 font-semibold hover:underline flex items-center gap-1">
                  <Send className="w-4 h-4" /> Publish
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PDF Upload Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Generate Quiz from PDF</h3>
              <button onClick={closePdfModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Quiz Title</label>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="e.g., Midterm Exam"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Upload PDF</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                {selectedFile && (
                  <p className="text-sm text-green-600 mt-2">Selected: {selectedFile.name}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Multiple Choice</label>
                  <input
                    type="number"
                    min="0"
                    value={numMC}
                    onChange={(e) => setNumMC(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">True/False</label>
                  <input
                    type="number"
                    min="0"
                    value={numTF}
                    onChange={(e) => setNumTF(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Identification</label>
                  <input
                    type="number"
                    min="0"
                    value={numID}
                    onChange={(e) => setNumID(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateQuiz}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Quiz...
                  </>
                ) : (
                  "Generate Quiz"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Quiz Preview/Edit Modal */}
      {showPreviewModal && generatedQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-t-2xl">
              <div className="flex-1">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-2xl font-bold bg-white text-gray-800 px-3 py-1 rounded"
                      autoFocus
                    />
                    <button
                      onClick={handleTitleSave}
                      className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingTitle(false)}
                      className="bg-gray-500 hover:bg-gray-600 px-3 py-1 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Brain className="w-8 h-8" />
                    <div>
                      <h3 className="text-2xl font-bold">{generatedQuiz.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-blue-100 mt-1">
                        <span>📝 {generatedQuiz.questions.length} questions</span>
                        <span>• {generatedQuiz.total_points || generatedQuiz.questions.reduce((sum, q) => sum + q.points, 0)} points</span>
                        {generatedQuiz.classification_stats && (
                          <>
                            <span className="font-semibold">
                              🟣 HOTS: {generatedQuiz.classification_stats.hots_count} 
                              ({generatedQuiz.classification_stats.hots_percentage}%)
                            </span>
                            <span className="font-semibold">
                              🔵 LOTS: {generatedQuiz.classification_stats.lots_count}
                              ({generatedQuiz.classification_stats.lots_percentage}%)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleTitleEdit}
                      className="bg-blue-800 hover:bg-blue-900 rounded-lg px-3 py-1 text-sm flex items-center gap-1 ml-auto"
                    >
                      <Edit3 className="w-4 h-4" /> Edit
                    </button>
                  </div>
                )}
              </div>
              <button 
                onClick={closePreviewModal} 
                className="text-white hover:bg-blue-800 rounded-lg p-2 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Questions List - Grouped by Type */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const grouped = groupQuestionsByType(generatedQuiz.questions);
                const typeLabels = {
                  multiple_choice: "Multiple Choice",
                  true_false: "True/False",
                  identification: "Identification"
                };

                return (
                  <div className="space-y-8">
                    {Object.entries(grouped).map(([type, questions]) => {
                      if (questions.length === 0) return null;
                      
                      return (
                        <div key={type} className="space-y-4">
                          {/* Category Header */}
                          <div className="flex items-center justify-between border-b-2 border-blue-600 pb-2">
                            <h4 className="text-xl font-bold text-blue-700 flex items-center gap-2">
                              📋 {typeLabels[type]}
                              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {questions.length} {questions.length === 1 ? 'question' : 'questions'}
                              </span>
                            </h4>
                            <button
                              onClick={() => handleAddQuestion(type)}
                              className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition text-sm"
                            >
                              <PlusCircle className="w-4 h-4" /> Add Question
                            </button>
                          </div>

                          {/* Questions in Category */}
                          <div className="space-y-4">
                            {questions.map((q) => {
                              const isEditing = editingQuestion === q.originalIndex;

                              return (
                                <div key={q.originalIndex} className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 hover:border-blue-300 transition">
                                  {isEditing ? (
                                    /* Edit Mode */
                                    <div className="space-y-4">
                                      <div>
                                        <label className="block text-sm font-semibold mb-2">Question</label>
                                        <textarea
                                          value={editForm.question}
                                          onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                                          className="w-full px-3 py-2 border rounded-lg"
                                          rows="3"
                                        />
                                      </div>

                                      <div className="flex gap-4">
                                        <div className="w-32">
                                          <label className="block text-sm font-semibold mb-2">Points</label>
                                          <input
                                            type="number"
                                            min="1"
                                            value={editForm.points}
                                            onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) || 1 })}
                                            className="w-full px-3 py-2 border rounded-lg"
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <label className="block text-sm font-semibold mb-2">Classification</label>
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
                                          <label className="block text-sm font-semibold mb-2">Choices (Select the correct answer)</label>
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
                                                    className="text-red-600 hover:text-red-700"
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
                                              className="text-blue-600 text-sm hover:underline flex items-center gap-1"
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
                                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-1"
                                        >
                                          <CheckCircle className="w-4 h-4" /> Save
                                        </button>
                                        <button
                                          onClick={() => setEditingQuestion(null)}
                                          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => handleDeleteQuestion(q.originalIndex)}
                                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 ml-auto flex items-center gap-1"
                                        >
                                          <Trash2 className="w-4 h-4" /> Delete
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* View Mode */
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
                                            <span className="text-sm text-gray-600">
                                              {q.points} {q.points === 1 ? 'point' : 'points'}
                                            </span>
                                            {getClassificationBadge(q.bloom_classification, q.classification_confidence)}
                                            <button
                                              onClick={() => handleQuestionEdit(q.originalIndex, q)}
                                              className="ml-auto text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                                            >
                                              <Edit3 className="w-4 h-4" /> Edit
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
                );
              })()}
            </div>

            {/* Footer Actions */}
            <div className="border-t p-6 bg-gray-50 rounded-b-2xl flex gap-3">
              <button
                onClick={closePreviewModal}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => alert("Save as Draft functionality coming soon!")}
                className="flex-1 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition"
              >
                Save as Draft
              </button>
              <button
                onClick={handleSaveQuiz}
                className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Publish Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}