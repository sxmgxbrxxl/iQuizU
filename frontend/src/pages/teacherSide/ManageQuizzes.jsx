import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileUp,
  Pen,
  PlusCircle,
  X,
  Loader2,
  CheckCircle,
  Trash2,
  Brain,
  Users,
  NotebookPen,
  Zap,
  Eye,
  Copy,
} from "lucide-react";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../../firebase/firebaseConfig";


export default function ManageQuizzes() {
  const navigate = useNavigate();
  const [publishedQuizzes, setPublishedQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false); 
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
  const [publishing, setPublishing] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [deletingAssignment, setDeletingAssignment] = useState(null);
  
  // Classification Filter State
  const [classificationFilter, setClassificationFilter] = useState("ALL");

  // Assigned Quizzes State
  const [assignedQuizzes, setAssignedQuizzes] = useState([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);

  // Synchronous Quizzes State
  const [synchronousQuizzes, setSynchronousQuizzes] = useState([]);
  const [loadingSynchronous, setLoadingSynchronous] = useState(false);

  // Manual Quiz Creation State
  const [manualQuizTitle, setManualQuizTitle] = useState("");
  const [manualQuestions, setManualQuestions] = useState([]);
  const [currentQuestionType, setCurrentQuestionType] = useState("multiple_choice");

  // -----------------------------------------------------------------
  // FETCH QUIZZES
  // -----------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchQuizzes();
        fetchAssignedQuizzes();
        fetchSynchronousQuizzes();
      } else {
        setLoadingQuizzes(false);
        setLoadingAssigned(false);
        setLoadingSynchronous(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchQuizzes = async () => {
    setLoadingQuizzes(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "quizzes"),
        where("teacherId", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const quizzes = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title,
          mode: d.mode || "Published",
          totalPoints: d.totalPoints,
          questionCount: d.questions?.length || 0,
        };
      });
      setPublishedQuizzes(quizzes);
    } catch (e) {
      console.error(e);
      alert("Error loading quizzes.");
    } finally {
      setLoadingQuizzes(false);
    }
  };

  // -----------------------------------------------------------------
  // FETCH ASSIGNED QUIZZES (ASYNCHRONOUS ONLY)
  // -----------------------------------------------------------------
  const fetchAssignedQuizzes = async () => {
    setLoadingAssigned(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "assignedQuizzes"),
        where("assignedBy", "==", user.uid),
        where("quizMode", "==", "asynchronous")
      );
      const snapshot = await getDocs(q);

      const assignmentMap = new Map();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const key = `${data.quizId}-${data.classId}`;

        if (!assignmentMap.has(key)) {
          assignmentMap.set(key, {
            quizId: data.quizId,
            classId: data.classId,
            quizTitle: data.quizTitle,
            className: data.className,
            subject: data.subject || "",
            quizMode: data.quizMode || "asynchronous",
            dueDate: data.dueDate,
            assignedAt: data.assignedAt,
            studentIds: [],
            docIds: [],
          });
        }

        const assignment = assignmentMap.get(key);
        if (!assignment.studentIds.includes(data.studentId)) {
          assignment.studentIds.push(data.studentId);
        }
        assignment.docIds.push(doc.id);
      });

      const assigned = Array.from(assignmentMap.values()).map((a) => ({
        id: a.quizId,
        quizId: a.quizId,
        classId: a.classId,
        title: a.quizTitle,
        className: a.className,
        subject: a.subject,
        studentCount: a.studentIds.length,
        dueDate: a.dueDate,
        assignedAt: a.assignedAt,
        quizMode: a.quizMode,
        docIds: a.docIds,
      }));

      assigned.sort(
        (a, b) => (b.assignedAt?.seconds || 0) - (a.assignedAt?.seconds || 0)
      );
      setAssignedQuizzes(assigned);
    } catch (e) {
      console.error(e);
      alert("Error loading assigned quizzes.");
    } finally {
      setLoadingAssigned(false);
    }
  };

  // -----------------------------------------------------------------
  // FETCH SYNCHRONOUS QUIZZES (SYNCHRONOUS ONLY)
  // -----------------------------------------------------------------
  const fetchSynchronousQuizzes = async () => {
    setLoadingSynchronous(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "assignedQuizzes"),
        where("assignedBy", "==", user.uid),
        where("quizMode", "==", "synchronous")
      );
      const snapshot = await getDocs(q);

      const assignmentMap = new Map();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const key = `${data.quizId}-${data.classId}`;

        if (!assignmentMap.has(key)) {
          assignmentMap.set(key, {
            quizId: data.quizId,
            classId: data.classId,
            quizTitle: data.quizTitle,
            className: data.className,
            subject: data.subject || "",
            quizMode: data.quizMode || "synchronous",
            dueDate: data.dueDate,
            assignedAt: data.assignedAt,
            quizCode: data.quizCode || null,
            studentIds: [],
            sessionStatus: data.sessionStatus || "not_started",
            docIds: [],
          });
        }

        const assignment = assignmentMap.get(key);
        if (!assignment.studentIds.includes(data.studentId)) {
          assignment.studentIds.push(data.studentId);
        }
        assignment.docIds.push(doc.id);
      });

      const synchronous = Array.from(assignmentMap.values()).map((a) => ({
        id: a.quizId,
        quizId: a.quizId,
        classId: a.classId,
        title: a.quizTitle,
        className: a.className,
        subject: a.subject,
        studentCount: a.studentIds.length,
        dueDate: a.dueDate,
        assignedAt: a.assignedAt,
        quizMode: a.quizMode,
        quizCode: a.quizCode,
        sessionStatus: a.sessionStatus,
        docIds: a.docIds,
      }));

      synchronous.sort(
        (a, b) => (b.assignedAt?.seconds || 0) - (a.assignedAt?.seconds || 0)
      );
      setSynchronousQuizzes(synchronous);
    } catch (e) {
      console.error(e);
      alert("Error loading synchronous quizzes.");
    } finally {
      setLoadingSynchronous(false);
    }
  };

  // -----------------------------------------------------------------
  // DELETE ASSIGNMENT
  // -----------------------------------------------------------------
  const handleDeleteAssignment = async (assignment, isSync = false) => {
    const confirmMsg = `Are you sure you want to delete this assignment?\n\nQuiz: ${assignment.title}\nClass: ${assignment.className}\n\nThis will remove the quiz from all ${assignment.studentCount} students and delete all related data. This action cannot be undone.`;
    
    if (!window.confirm(confirmMsg)) return;

    setDeletingAssignment(`${assignment.quizId}-${assignment.classId}`);

    try {
      const deletePromises = assignment.docIds.map((docId) =>
        deleteDoc(doc(db, "assignedQuizzes", docId))
      );

      await Promise.all(deletePromises);

      if (isSync) {
        await fetchSynchronousQuizzes();
        alert("Live quiz assignment deleted successfully!");
      } else {
        await fetchAssignedQuizzes();
        alert("Quiz assignment deleted successfully!");
      }
    } catch (e) {
      console.error("Error deleting assignment:", e);
      alert("Error deleting assignment. Please try again.");
    } finally {
      setDeletingAssignment(null);
    }
  };

  // -----------------------------------------------------------------
  // COPY CODE TO CLIPBOARD
  // -----------------------------------------------------------------
  const handleCopyCode = (code, codeId) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(codeId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // -----------------------------------------------------------------
  // MANUAL QUIZ CREATION
  // -----------------------------------------------------------------
  const openManualModal = () => {
    setManualQuizTitle("");
    setManualQuestions([]);
    setCurrentQuestionType("multiple_choice");
    setShowManualModal(true);
  };

  const closeManualModal = () => {
    setShowManualModal(false);
    setManualQuizTitle("");
    setManualQuestions([]);
  };

  const addManualQuestion = () => {
    const newQuestion = {
      type: currentQuestionType,
      question: "",
      points: 1,
      correct_answer: currentQuestionType === "true_false" ? "True" : "",
      choices: currentQuestionType === "multiple_choice" 
        ? [
            { text: "", is_correct: false },
            { text: "", is_correct: false },
            { text: "", is_correct: false },
            { text: "", is_correct: false },
          ]
        : null,
      bloom_classification: "LOTS",
      classification_confidence: 0,
    };
    setManualQuestions([...manualQuestions, newQuestion]);
  };

  const updateManualQuestion = (index, field, value) => {
    const updated = [...manualQuestions];
    updated[index][field] = value;
    setManualQuestions(updated);
  };

  const updateManualChoice = (qIndex, cIndex, field, value) => {
    const updated = [...manualQuestions];
    if (field === "is_correct") {
      // Uncheck all other choices
      updated[qIndex].choices.forEach((c, i) => {
        c.is_correct = i === cIndex;
      });
    } else {
      updated[qIndex].choices[cIndex][field] = value;
    }
    setManualQuestions(updated);
  };

  const deleteManualQuestion = (index) => {
    if (window.confirm("Delete this question?")) {
      setManualQuestions(manualQuestions.filter((_, i) => i !== index));
    }
  };

  const handleCreateManualQuiz = () => {
    if (!manualQuizTitle.trim()) {
      alert("Please enter a quiz title");
      return;
    }

    if (manualQuestions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    // Validate all questions
    for (let i = 0; i < manualQuestions.length; i++) {
      const q = manualQuestions[i];
      
      if (!q.question.trim()) {
        alert(`Question ${i + 1} is empty`);
        return;
      }

      if (q.type === "multiple_choice") {
        if (!q.choices.some(c => c.text.trim())) {
          alert(`Question ${i + 1}: Please add at least one choice`);
          return;
        }
        if (!q.choices.some(c => c.is_correct)) {
          alert(`Question ${i + 1}: Please mark the correct answer`);
          return;
        }
      } else if (!q.correct_answer.trim()) {
        alert(`Question ${i + 1}: Please provide the correct answer`);
        return;
      }
    }

    // Calculate classification stats
    const hotsCount = manualQuestions.filter(q => q.bloom_classification === "HOTS").length;
    const lotsCount = manualQuestions.filter(q => q.bloom_classification === "LOTS").length;
    const totalQuestions = manualQuestions.length;

    const quiz = {
      title: manualQuizTitle,
      questions: manualQuestions,
      total_points: manualQuestions.reduce((sum, q) => sum + q.points, 0),
      classification_stats: {
        hots_count: hotsCount,
        lots_count: lotsCount,
        hots_percentage: ((hotsCount / totalQuestions) * 100).toFixed(1),
        lots_percentage: ((lotsCount / totalQuestions) * 100).toFixed(1),
      }
    };

    setGeneratedQuiz(quiz);
    setShowManualModal(false);
    setShowPreviewModal(true);
  };

  // -----------------------------------------------------------------
  // PDF → QUIZ GENERATION
  // -----------------------------------------------------------------
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") setSelectedFile(file);
    else alert("Please select a PDF file");
  };

  const handleGenerateQuiz = async () => {
    if (!selectedFile) return alert("Please select a PDF file");
    setLoading(true);
    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("num_multiple_choice", numMC);
    fd.append("num_true_false", numTF);
    fd.append("num_identification", numID);
    fd.append("title", quizTitle || "Generated Quiz");

    try {
      const res = await fetch(
        "http://localhost:8000/api/quiz/generate-from-pdf",
        {
          method: "POST",
          body: fd,
        }
      );
      const data = await res.json();
      if (data.success) {
        setGeneratedQuiz(data.quiz);
        setShowPdfModal(false);
        setShowPreviewModal(true);
      } else alert("Failed: " + data.message);
    } catch (e) {
      console.error(e);
      alert("Generation error – check backend.");
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
    setClassificationFilter("ALL");
  };

  // -----------------------------------------------------------------
  // TITLE EDIT
  // -----------------------------------------------------------------
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

  // -----------------------------------------------------------------
  // QUESTION EDIT / ADD / DELETE
  // -----------------------------------------------------------------
  const handleQuestionEdit = (idx, q) => {
    setEditingQuestion(idx);
    setEditForm({
      question: q.question,
      type: q.type,
      points: q.points,
      correct_answer: q.correct_answer || "",
      choices: q.choices ? [...q.choices] : null,
      bloom_classification: q.bloom_classification || "LOTS",
    });
  };

  const handleQuestionSave = (idx) => {
    if (!editForm.question.trim()) return alert("Question cannot be empty");
    if (editForm.type === "multiple_choice") {
      if (!editForm.choices || editForm.choices.length < 2)
        return alert("Need at least 2 choices");
      if (!editForm.choices.some((c) => c.is_correct))
        return alert("Mark one correct choice");
      if (editForm.choices.some((c) => !c.text.trim()))
        return alert("All choices need text");
    } else if (!editForm.correct_answer.trim())
      return alert("Correct answer required");

    const updated = [...generatedQuiz.questions];
    updated[idx] = {
      ...updated[idx],
      question: editForm.question,
      points: editForm.points,
      correct_answer: editForm.correct_answer,
      choices: editForm.choices,
      bloom_classification: editForm.bloom_classification,
    };
    setGeneratedQuiz({ ...generatedQuiz, questions: updated });
    setEditingQuestion(null);
  };

  const handleAddQuestion = (type) => {
    const newQ = {
      type,
      question: "",
      points: 1,
      correct_answer: type === "true_false" ? "True" : "",
      choices:
        type === "multiple_choice"
          ? [
              { text: "", is_correct: false },
              { text: "", is_correct: false },
            ]
          : null,
      bloom_classification: "LOTS",
      classification_confidence: 0,
    };
    setGeneratedQuiz({
      ...generatedQuiz,
      questions: [...generatedQuiz.questions, newQ],
    });
    setEditingQuestion(generatedQuiz.questions.length);
    setEditForm({
      question: "",
      type,
      points: 1,
      correct_answer: type === "true_false" ? "True" : "",
      choices:
        type === "multiple_choice"
          ? [
              { text: "", is_correct: false },
              { text: "", is_correct: false },
            ]
          : null,
      bloom_classification: "LOTS",
    });
  };

  const handleDeleteQuestion = (idx) => {
    if (window.confirm("Delete this question?")) {
      setGeneratedQuiz({
        ...generatedQuiz,
        questions: generatedQuiz.questions.filter((_, i) => i !== idx),
      });
      setEditingQuestion(null);
    }
  };

  const groupQuestionsByType = (questions) => {
    const filteredQuestions = classificationFilter === "ALL" 
      ? questions 
      : questions.filter(q => q.bloom_classification === classificationFilter);
    
    const g = { multiple_choice: [], true_false: [], identification: [] };
    filteredQuestions.forEach((q, i) => {
      const originalIndex = questions.indexOf(q);
      g[q.type].push({ ...q, originalIndex });
    });
    return g;
  };

  // -----------------------------------------------------------------
  // PUBLISH QUIZ
  // -----------------------------------------------------------------
  const handleSaveQuiz = async () => {
    if (!generatedQuiz) return;
    const user = auth.currentUser;
    if (!user) return alert("Please log in first!");

    setPublishing(true);
    try {
      const totalPoints = generatedQuiz.questions.reduce(
        (s, q) => s + q.points,
        0
      );
      const teacherName =
        user.displayName || user.email?.split("@")[0] || "Teacher";

      const quizData = {
        title: generatedQuiz.title,
        mode: "Published",
        questions: generatedQuiz.questions,
        totalPoints,
        classificationStats: generatedQuiz.classification_stats || {
          hots_count: generatedQuiz.questions.filter(
            (q) => q.bloom_classification === "HOTS"
          ).length,
          lots_count: generatedQuiz.questions.filter(
            (q) => q.bloom_classification === "LOTS"
          ).length,
          hots_percentage: (
            (generatedQuiz.questions.filter(
              (q) => q.bloom_classification === "HOTS"
            ).length /
              generatedQuiz.questions.length) *
            100
          ).toFixed(1),
          lots_percentage: (
            (generatedQuiz.questions.filter(
              (q) => q.bloom_classification === "LOTS"
            ).length /
              generatedQuiz.questions.length) *
            100
          ).toFixed(1),
        },
        teacherId: user.uid,
        teacherEmail: user.email,
        teacherName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "published",
      };

      await addDoc(collection(db, "quizzes"), quizData);
      setShowPreviewModal(false);
      setGeneratedQuiz(null);
      await fetchQuizzes();
      alert("Quiz published successfully!");
    } catch (e) {
      console.error(e);
      alert("Publish error.");
    } finally {
      setPublishing(false);
    }
  };

  // -----------------------------------------------------------------
  // BADGE
  // -----------------------------------------------------------------
  const getClassificationBadge = (cls, conf) => {
    const isHOTS = cls === "HOTS";
    const bg = isHOTS ? "bg-purple-100" : "bg-blue-100";
    const txt = isHOTS ? "text-purple-700" : "text-blue-700";
    const brd = isHOTS ? "border-purple-300" : "border-blue-300";

    return (
      <div className="flex items-center gap-2">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${bg} ${txt} ${brd}`}
        >
          {cls}
        </span>
        {conf && (
          <span className="text-xs text-gray-500">
            {(conf * 100).toFixed(1)}%
          </span>
        )}
      </div>
    );
  };

  // -----------------------------------------------------------------
  // RENDER
  // -----------------------------------------------------------------
  return (
    <div className="px-2 py-6 md:p-8 font-Outfit">
      {/* Header */}
      <div className="flex flex-row gap-3 items-center">
        <NotebookPen className="w-8 h-8 text-accent mb-6" />
        <div className="flex flex-col mb-6">
          <h2 className="text-2xl font-bold text-title flex items-center gap-2">
            Manage Quizzes
          </h2>
          <p className="text-md font-light text-subtext">
            Create, edit, and organize your quizzes with ease.
          </p>
        </div>
      </div>

      {/* Create New Quiz */}
      <div className="bg-green-50 p-8 rounded-3xl border-2 border-green-200 mb-8">
        <h3 className="text-xl text-title font-semibold mb-3">
          Create New Quiz
        </h3> 
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <FileUp className="w-5 h-5" /> Upload PDF (AI Generate)
          </button>
          <button 
            onClick={openManualModal}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          > 
            <PlusCircle className="w-5 h-5" /> Manual Quiz Creation
          </button>
        </div>
      </div>

      {/* Published Quizzes */}
      <div className="border-2 border-gray-300 border-dashed rounded-3xl p-8 mb-8">
        <h3 className="text-xl text-title font-semibold mb-4">
          Your Published Quizzes
        </h3>

        {loadingQuizzes ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="ml-3 text-subtext">Loading…</span>
          </div>
        ) : publishedQuizzes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-gray-500 text-lg">No published quizzes yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {publishedQuizzes.map((q) => (
              <div
                key={q.id}
                className="border rounded-2xl p-5 shadow-sm hover:shadow-md transition bg-green-50"
              >
                <div className="relative flex flex-row">
                  <div className="flex flex-col">
                    <h4 className="text-lg font-bold text-title">{q.title}</h4>
                    <p className="text-gray-500 text-sm">
                      Questions: {q.questionCount}
                    </p>
                    <p className="text-gray-500 text-sm">
                      Total Points: {q.totalPoints}
                    </p>
                  </div>
                  <button 
                    className="absolute top-2 right-1 w-4 h-4 text-red-600 transition-all active:scale-95 hover:scale-105 duration-200">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-between items-center gap-2 mt-4">
                  <button
                    onClick={() => navigate(`/teacher/edit-quiz/${q.id}`)}
                    className="text-blue-600 rounded-xl bg-blue-100 px-3 py-2 font-semibold flex items-center gap-1 transform-all active:scale-95 hover:scale-105 duration-200"
                  >
                    <Pen className="w-4 h-4" /> <span className="hidden md:block">Edit</span>
                  </button>
                  <button
                    onClick={() => navigate(`/teacher/assign-quiz/${q.id}`)}
                    className="text-purple-600 bg-purple-100 px-3 py-2 rounded-xl font-semibold flex items-center gap-1 transform-all active:scale-95 hover:scale-105 duration-200"
                  >
                    <Users className="w-4 h-4" /> <span className="hidden md:block">Assign</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Synchronous Quizzes Section */}
      <div className="mb-8 bg-yellow-50 rounded-3xl border-2 border-yellow-200 p-6">
        <h3 className="text-xl text-title font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-600" /> Live Quizzes
          {synchronousQuizzes.length > 0 && (
            <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-sm font-bold ml-2">
              {synchronousQuizzes.length}
            </span>
          )}
        </h3>

        {loadingSynchronous ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-600" />
            <span className="ml-3 text-gray-600">Loading…</span>
          </div>
        ) : synchronousQuizzes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-yellow-300">
            <Zap className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
            <p className="text-gray-500 text-lg">
              No live quizzes assigned yet
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {synchronousQuizzes.map((a) => (
              <div
                key={`${a.quizId}-${a.classId}`}
                className="border-2 border-yellow-200 rounded-xl p-5 shadow-sm hover:shadow-md transition bg-white"
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-lg font-bold text-title flex-1">
                    {a.title}
                  </h4>
                  <span className="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" /> LIVE
                  </span>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <p className="text-yellow-700 font-semibold">
                    Class: {a.className}
                  </p>
                  {a.subject && (
                    <p className="text-gray-600">Subject: {a.subject}</p>
                  )}
                  <p className="text-gray-600">Students: {a.studentCount}</p>
                  {a.dueDate && (
                    <p className="text-gray-600">
                      Due:{" "}
                      {new Date(a.dueDate).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}

                  {a.quizCode && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded-lg">
                      <p className="text-xs text-gray-700 font-semibold mb-1">
                        Quiz Code:
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-lg font-bold text-purple-700 tracking-widest">
                          {a.quizCode}
                        </span>
                        <button
                          onClick={() =>
                            handleCopyCode(
                              a.quizCode,
                              `${a.quizId}-${a.classId}`
                            )
                          }
                          className={`p-2 rounded-lg transition ${
                            copiedCodeId === `${a.quizId}-${a.classId}`
                              ? "bg-green-500 text-white"
                              : "bg-white hover:bg-purple-200 text-purple-600"
                          }`}
                          title="Copy code to clipboard"
                        >
                          {copiedCodeId === `${a.quizId}-${a.classId}` ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-gray-500 text-xs">
                    Assigned:{" "}
                    {a.assignedAt
                      ? new Date(
                          a.assignedAt.seconds * 1000
                        ).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "N/A"}
                  </p>

                  <div className="pt-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        a.sessionStatus === "active"
                          ? "bg-green-100 text-green-800"
                          : a.sessionStatus === "ended"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {a.sessionStatus === "active"
                        ? "Active"
                        : a.sessionStatus === "ended"
                        ? "Ended"
                        : "Not Started"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-3 border-t border-yellow-200">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        navigate(
                          `/teacher/quiz-control/${a.quizId}/${a.classId}`
                        )
                      }
                      className="flex-1 text-yellow-600 font-semibold hover:underline flex items-center justify-center gap-1 text-sm"
                    >
                      <Zap className="w-4 h-4" /> Control
                    </button>

                    <button
                      onClick={() => navigate(`/teacher/assign-quiz/${a.quizId}?classId=${a.classId}`)}
                      className="flex-1 text-gray-700 font-semibold hover:underline flex items-center justify-center gap-1 text-sm"
                    >
                      <Pen className="w-4 h-4" /> Reassign
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteAssignment(a, true)}
                    disabled={deletingAssignment === `${a.quizId}-${a.classId}`}
                    className="w-full bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 text-sm font-semibold disabled:bg-gray-400"
                  >
                    {deletingAssignment === `${a.quizId}-${a.classId}` ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Assignment
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned Quizzes Section */}
      <div className="mb-8 bg-purple-50 rounded-3xl border-2 border-purple-200 p-6">
        <h3 className="text-xl text-title font-semibold mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-600" /> Assigned Quizzes
          {assignedQuizzes.length > 0 && (
            <span className="bg-purple-400 text-purple-900 px-2 py-0.5 rounded-full text-sm font-bold ml-2">
              {assignedQuizzes.length}
            </span>
          )}
        </h3>

        {loadingAssigned ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <span className="ml-3 text-gray-600">Loading…</span>
          </div>
        ) : assignedQuizzes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-purple-300">
            <Users className="w-16 h-16 mx-auto mb-4 text-purple-300" />
            <p className="text-gray-500 text-lg">No quizzes assigned yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assignedQuizzes.map((a) => (
              <div
                key={`${a.quizId}-${a.classId}`}
                className="border-2 border-purple-200 rounded-xl p-5 shadow-sm hover:shadow-md transition bg-white"
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-lg font-bold text-title flex-1">
                    {a.title}
                  </h4>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <p className="text-purple-700 font-semibold">
                    Class: {a.className}
                  </p>
                  {a.subject && (
                    <p className="text-gray-600">Subject: {a.subject}</p>
                  )}
                  <p className="text-gray-600">Students: {a.studentCount}</p>
                  {a.dueDate && (
                    <p className="text-gray-600">
                      Due:{" "}
                      {new Date(a.dueDate).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs">
                    Assigned:{" "}
                    {a.assignedAt
                      ? new Date(
                          a.assignedAt.seconds * 1000
                        ).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "N/A"}
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-3 border-t border-purple-200">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        navigate(
                          `/teacher/quiz-results/${a.quizId}/${a.classId}`
                        )
                      }
                      className="flex-1 text-blue-600 font-semibold hover:underline flex items-center justify-center gap-1 text-sm"
                    >
                      <Eye className="w-4 h-4" /> Results
                    </button>

                    <button
                      onClick={() => navigate(`/teacher/assign-quiz/${a.quizId}?classId=${a.classId}`)}
                      className="flex-1 text-gray-700 font-semibold hover:underline flex items-center justify-center gap-1 text-sm"
                    >
                      <Pen className="w-4 h-4" /> Reassign
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteAssignment(a, false)}
                    disabled={deletingAssignment === `${a.quizId}-${a.classId}`}
                    className="w-full bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 text-sm font-semibold disabled:bg-gray-400"
                  >
                    {deletingAssignment === `${a.quizId}-${a.classId}` ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Assignment
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Quiz Creation Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-green-600 to-teal-700 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <PlusCircle className="w-8 h-8" />
                <div>
                  <h3 className="text-2xl font-bold">Manual Quiz Creation</h3>
                  <p className="text-sm text-green-100">Create your quiz from scratch</p>
                </div>
              </div>
              <button
                onClick={closeManualModal}
                className="text-white hover:bg-green-800 rounded-lg p-2 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Quiz Title */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  value={manualQuizTitle}
                  onChange={(e) => setManualQuizTitle(e.target.value)}
                  placeholder="e.g., Chapter 5 Quiz"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Question Type Selector */}
              <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                <label className="block text-sm font-bold mb-3 text-gray-700">
                  Add Question Type
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setCurrentQuestionType("multiple_choice");
                      addManualQuestion();
                    }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    <PlusCircle className="w-5 h-5" /> Multiple Choice
                  </button>
                  <button
                    onClick={() => {
                      setCurrentQuestionType("true_false");
                      addManualQuestion();
                    }}
                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                  >
                    <PlusCircle className="w-5 h-5" /> True/False
                  </button>
                  <button
                    onClick={() => {
                      setCurrentQuestionType("identification");
                      addManualQuestion();
                    }}
                    className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
                  >
                    <PlusCircle className="w-5 h-5" /> Identification
                  </button>
                </div>
              </div>

              {/* Questions List */}
              {manualQuestions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg">No questions added yet</p>
                  <p className="text-gray-400 text-sm mt-2">Click the buttons above to add questions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {manualQuestions.map((q, qIndex) => (
                    <div
                      key={qIndex}
                      className="bg-white border-2 border-gray-300 rounded-xl p-5 hover:border-green-400 transition"
                    >
                      {/* Question Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                          {qIndex + 1}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          {q.type.replace("_", " ").toUpperCase()}
                        </span>
                        <button
                          onClick={() => deleteManualQuestion(qIndex)}
                          className="ml-auto text-red-600 hover:text-red-700 flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>

                      {/* Question Text */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                          Question *
                        </label>
                        <textarea
                          value={q.question}
                          onChange={(e) =>
                            updateManualQuestion(qIndex, "question", e.target.value)
                          }
                          placeholder="Enter your question here..."
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          rows="2"
                        />
                      </div>

                      {/* Points and Classification */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-700">
                            Points
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={q.points}
                            onChange={(e) =>
                              updateManualQuestion(
                                qIndex,
                                "points",
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-700">
                            Bloom's Classification
                          </label>
                          <select
                            value={q.bloom_classification}
                            onChange={(e) =>
                              updateManualQuestion(
                                qIndex,
                                "bloom_classification",
                                e.target.value
                              )
                            }
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="LOTS">LOTS (Lower Order)</option>
                            <option value="HOTS">HOTS (Higher Order)</option>
                          </select>
                        </div>
                      </div>

                      {/* Multiple Choice Options */}
                      {q.type === "multiple_choice" && (
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-700">
                            Choices * (Check the correct answer)
                          </label>
                          <div className="space-y-2">
                            {q.choices.map((choice, cIndex) => (
                              <div
                                key={cIndex}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                                  choice.is_correct
                                    ? "bg-green-50 border-green-400"
                                    : "bg-gray-50 border-gray-300"
                                }`}
                              >
                                <input
                                  type="radio"
                                  checked={choice.is_correct}
                                  onChange={() =>
                                    updateManualChoice(
                                      qIndex,
                                      cIndex,
                                      "is_correct",
                                      true
                                    )
                                  }
                                  className="w-5 h-5 text-green-600"
                                />
                                <span className="font-semibold text-gray-700 w-6">
                                  {String.fromCharCode(65 + cIndex)}.
                                </span>
                                <input
                                  type="text"
                                  value={choice.text}
                                  onChange={(e) =>
                                    updateManualChoice(
                                      qIndex,
                                      cIndex,
                                      "text",
                                      e.target.value
                                    )
                                  }
                                  placeholder={`Choice ${String.fromCharCode(65 + cIndex)}`}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* True/False Answer */}
                      {q.type === "true_false" && (
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-700">
                            Correct Answer *
                          </label>
                          <div className="flex gap-3">
                            <button
                              onClick={() =>
                                updateManualQuestion(qIndex, "correct_answer", "True")
                              }
                              className={`flex-1 py-3 rounded-lg border-2 font-semibold transition ${
                                q.correct_answer === "True"
                                  ? "bg-green-600 text-white border-green-600"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              True
                            </button>
                            <button
                              onClick={() =>
                                updateManualQuestion(qIndex, "correct_answer", "False")
                              }
                              className={`flex-1 py-3 rounded-lg border-2 font-semibold transition ${
                                q.correct_answer === "False"
                                  ? "bg-green-600 text-white border-green-600"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              False
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Identification Answer */}
                      {q.type === "identification" && (
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-700">
                            Correct Answer *
                          </label>
                          <input
                            type="text"
                            value={q.correct_answer}
                            onChange={(e) =>
                              updateManualQuestion(
                                qIndex,
                                "correct_answer",
                                e.target.value
                              )
                            }
                            placeholder="Enter the correct answer"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {manualQuestions.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
                  <h4 className="font-bold text-gray-800 mb-2">Quiz Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Questions</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {manualQuestions.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Points</p>
                      <p className="text-2xl font-bold text-green-600">
                        {manualQuestions.reduce((sum, q) => sum + q.points, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">HOTS</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {manualQuestions.filter(q => q.bloom_classification === "HOTS").length}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">LOTS</p>
                      <p className="text-2xl font-bold text-teal-600">
                        {manualQuestions.filter(q => q.bloom_classification === "LOTS").length}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t p-6 bg-gray-50 rounded-b-2xl flex gap-3">
              <button
                onClick={closeManualModal}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateManualQuiz}
                disabled={!manualQuizTitle.trim() || manualQuestions.length === 0}
                className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-5 h-5" />
                Preview & Publish Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-title">
                Generate Quiz from PDF
              </h3>
              <button
                onClick={closePdfModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-title text-sm font-semibold mb-2">
                  Quiz Title
                </label>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="e.g., Midterm Exam"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Upload PDF
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                {selectedFile && (
                  <p className="text-sm text-accent mt-2">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Multiple Choice
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={numMC}
                    onChange={(e) => setNumMC(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    True/False
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={numTF}
                    onChange={(e) => setNumTF(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Identification
                  </label>
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
                className="w-full bg-button text-white py-3 rounded-lg font-semibold hover:bg-buttonHover transition disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating…
                  </>
                ) : (
                  "Generate Quiz"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
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
                      <h3 className="text-2xl font-bold">
                        {generatedQuiz.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-blue-100 mt-1">
                        <span>Questions: {generatedQuiz.questions.length}</span>
                        <span>
                          •{" "}
                          {generatedQuiz.total_points ||
                            generatedQuiz.questions.reduce(
                              (s, q) => s + q.points,
                              0
                            )}{" "}
                          points
                        </span>
                        {generatedQuiz.classification_stats && (
                          <>
                            <span className="font-semibold">
                              HOTS:{" "}
                              {generatedQuiz.classification_stats.hots_count} (
                              {
                                generatedQuiz.classification_stats
                                  .hots_percentage
                              }
                              %)
                            </span>
                            <span className="font-semibold">
                              LOTS:{" "}
                              {generatedQuiz.classification_stats.lots_count} (
                              {
                                generatedQuiz.classification_stats
                                  .lots_percentage
                              }
                              %)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleTitleEdit}
                      className="bg-blue-800 hover:bg-blue-900 rounded-lg px-3 py-1 text-sm flex items-center gap-1 ml-auto"
                    >
                      <Pen className="w-4 h-4" /> Edit
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

            {/* Classification Filter Tabs */}
            <div className="px-6 pt-6 pb-4 bg-gray-50 border-b">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700 mr-2">Filter by:</span>
                <button
                  onClick={() => setClassificationFilter("ALL")}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                    classificationFilter === "ALL"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  All Questions ({generatedQuiz.questions.length})
                </button>
                <button
                  onClick={() => setClassificationFilter("HOTS")}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${
                    classificationFilter === "HOTS"
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-white text-purple-700 border-2 border-purple-300 hover:bg-purple-50"
                  }`}
                >
                  <Brain className="w-4 h-4" />
                  HOTS ({generatedQuiz.questions.filter(q => q.bloom_classification === "HOTS").length})
                </button>
                <button
                  onClick={() => setClassificationFilter("LOTS")}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                    classificationFilter === "LOTS"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white text-blue-700 border-2 border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  LOTS ({generatedQuiz.questions.filter(q => q.bloom_classification === "LOTS").length})
                </button>
              </div>
            </div>

            {/* Questions */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const grouped = groupQuestionsByType(generatedQuiz.questions);
                const labels = {
                  multiple_choice: "Multiple Choice",
                  true_false: "True/False",
                  identification: "Identification",
                };
                
                const totalFilteredQuestions = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
                
                if (totalFilteredQuestions === 0) {
                  return (
                    <div className="text-center py-12">
                      <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 text-lg">
                        No {classificationFilter} questions found
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        Try selecting a different filter
                      </p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-8">
                    {Object.entries(grouped).map(([type, qs]) => {
                      if (qs.length === 0) return null;
                      return (
                        <div key={type} className="space-y-4">
                          <div className="flex items-center justify-between border-b-2 border-blue-600 pb-2">
                            <h4 className="text-xl font-bold text-blue-700 flex items-center gap-2">
                              {labels[type]}
                              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {qs.length}{" "}
                                {qs.length === 1 ? "question" : "questions"}
                              </span>
                            </h4>
                            <button
                              onClick={() => handleAddQuestion(type)}
                              className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition text-sm"
                            >
                              <PlusCircle className="w-4 h-4" /> Add Question
                            </button>
                          </div>

                          <div className="space-y-4">
                            {qs.map((q) => {
                              const editing =
                                editingQuestion === q.originalIndex;
                              return (
                                <div
                                  key={q.originalIndex}
                                  className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 hover:border-blue-300 transition"
                                >
                                  {editing ? (
                                    /* EDIT FORM */
                                    <div className="space-y-4">
                                      <div>
                                        <label className="block text-sm font-semibold mb-2">
                                          Question
                                        </label>
                                        <textarea
                                          value={editForm.question}
                                          onChange={(e) =>
                                            setEditForm({
                                              ...editForm,
                                              question: e.target.value,
                                            })
                                          }
                                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                          rows="3"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-sm font-semibold mb-2">
                                            Points
                                          </label>
                                          <input
                                            type="number"
                                            min="1"
                                            value={editForm.points}
                                            onChange={(e) =>
                                              setEditForm({
                                                ...editForm,
                                                points:
                                                  parseInt(e.target.value) || 1,
                                              })
                                            }
                                            className="w-full px-3 py-2 border rounded-lg"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-semibold mb-2">
                                            Classification
                                          </label>
                                          <select
                                            value={
                                              editForm.bloom_classification
                                            }
                                            onChange={(e) =>
                                              setEditForm({
                                                ...editForm,
                                                bloom_classification:
                                                  e.target.value,
                                              })
                                            }
                                            className="w-full px-3 py-2 border rounded-lg"
                                          >
                                            <option value="HOTS">HOTS</option>
                                            <option value="LOTS">LOTS</option>
                                          </select>
                                        </div>
                                      </div>

                                      {editForm.type === "multiple_choice" && (
                                        <div>
                                          <label className="block text-sm font-semibold mb-2">
                                            Choices
                                          </label>
                                          <div className="space-y-2">
                                            {editForm.choices?.map(
                                              (choice, i) => (
                                                <div
                                                  key={i}
                                                  className="flex items-center gap-2"
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={choice.is_correct}
                                                    onChange={(e) => {
                                                      const updated = [
                                                        ...editForm.choices,
                                                      ];
                                                      updated[i].is_correct =
                                                        e.target.checked;
                                                      setEditForm({
                                                        ...editForm,
                                                        choices: updated,
                                                      });
                                                    }}
                                                    className="w-4 h-4"
                                                  />
                                                  <input
                                                    type="text"
                                                    value={choice.text}
                                                    onChange={(e) => {
                                                      const updated = [
                                                        ...editForm.choices,
                                                      ];
                                                      updated[i].text =
                                                        e.target.value;
                                                      setEditForm({
                                                        ...editForm,
                                                        choices: updated,
                                                      });
                                                    }}
                                                    placeholder="Choice text"
                                                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                                  />
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {editForm.type !== "multiple_choice" && (
                                        <div>
                                          <label className="block text-sm font-semibold mb-2">
                                            Correct Answer
                                          </label>
                                          <input
                                            type="text"
                                            value={editForm.correct_answer}
                                            onChange={(e) =>
                                              setEditForm({
                                                ...editForm,
                                                correct_answer: e.target.value,
                                              })
                                            }
                                            className="w-full px-3 py-2 border rounded-lg"
                                          />
                                        </div>
                                      )}

                                      <div className="flex gap-2">
                                        <button
                                          onClick={() =>
                                            handleQuestionSave(q.originalIndex)
                                          }
                                          className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm font-semibold"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() =>
                                            setEditingQuestion(null)
                                          }
                                          className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm font-semibold"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleDeleteQuestion(
                                              q.originalIndex
                                            )
                                          }
                                          className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm font-semibold flex items-center justify-center gap-1"
                                        >
                                          <Trash2 className="w-4 h-4" /> Delete
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* DISPLAY */
                                    <>
                                      <div className="flex items-start gap-3 mb-4">
                                        <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                          {q.originalIndex + 1}
                                        </span>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                              {q.type
                                                .replace("_", " ")
                                                .toUpperCase()}
                                            </span>
                                            <span className="text-sm text-gray-600">
                                              {q.points}{" "}
                                              {q.points === 1
                                                ? "point"
                                                : "points"}
                                            </span>
                                            {getClassificationBadge(
                                              q.bloom_classification,
                                              q.classification_confidence
                                            )}
                                            <button
                                              onClick={() =>
                                                handleQuestionEdit(
                                                  q.originalIndex,
                                                  q
                                                )
                                              }
                                              className="ml-auto text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                                            >
                                              <Pen className="w-4 h-4" /> Edit
                                            </button>
                                          </div>
                                          <p className="text-lg font-semibold text-gray-800">
                                            {q.question}
                                          </p>
                                        </div>
                                      </div>

                                      {q.choices && (
                                        <div className="ml-11 space-y-2">
                                          {q.choices.map((c, i) => (
                                            <div
                                              key={i}
                                              className={`p-3 rounded-lg border-2 ${
                                                c.is_correct
                                                  ? "bg-green-50 border-green-400"
                                                  : "bg-white border-gray-200"
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-700">
                                                  {String.fromCharCode(65 + i)}
                                                  .
                                                </span>
                                                <span
                                                  className={
                                                    c.is_correct
                                                      ? "text-green-700 font-semibold"
                                                      : "text-gray-700"
                                                  }
                                                >
                                                  {c.text}
                                                </span>
                                                {c.is_correct && (
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
                                            <span className="text-sm text-gray-600 font-semibold">
                                              Correct Answer:{" "}
                                            </span>
                                            <span className="text-green-700 font-bold">
                                              {q.correct_answer}
                                            </span>
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

            {/* Footer */}
            <div className="border-t p-6 bg-gray-50 rounded-b-2xl flex gap-3">
              <button
                onClick={closePreviewModal}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => alert("Save as Draft coming soon!")}
                className="flex-1 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition"
              >
                Save as Draft
              </button>
              <button
                onClick={handleSaveQuiz}
                disabled={publishing}
                className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Publish Quiz
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}