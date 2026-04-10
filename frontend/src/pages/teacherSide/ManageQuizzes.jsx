import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
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
  Snowflake,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Archive,
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
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebase/firebaseConfig";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";


import { QuizGridSkeleton } from "../../components/SkeletonLoaders";

const ITEMS_PER_PAGE = 6;

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
  const [selectedSyncQuiz, setSelectedSyncQuiz] = useState(null);
  const [selectedAsyncQuiz, setSelectedAsyncQuiz] = useState(null);
  const [selectedPublishedQuiz, setSelectedPublishedQuiz] = useState(null);
  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Custom Toast & Confirm Dialog state
  const [toast, setToast] = useState({ show: false, type: "", title: "", message: "" });
  const showToast = useCallback((type, title, message) => {
    setToast({ show: true, type, title, message });
  }, []);
  const [confirmDialogState, setConfirmDialogState] = useState({ isOpen: false });

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

  // Pagination State
  const [publishedPage, setPublishedPage] = useState(1);
  const [syncPage, setSyncPage] = useState(1);
  const [asyncPage, setAsyncPage] = useState(1);

  const [activeTab, setActiveTab] = useState("multiple_choice");
  const tabContent = [
    { id: "multiple_choice", label: "Multiple Choice", icon: <Users className="w-4 h-4" /> },
    { id: "true_false", label: "True/False", icon: <CheckCircle className="w-4 h-4" /> },
    { id: "identification", label: "Identification", icon: <Pen className="w-4 h-4" /> },
  ];



  useEffect(() => {
    setMounted(true);
  }, []);

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
          questions: d.questions || [],
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          classificationStats: d.classificationStats,
        };
      });
      setPublishedQuizzes(quizzes);
    } catch (e) {
      console.error(e);
      showToast("error", "Error", "Error loading quizzes.");
    } finally {
      setLoadingQuizzes(false);
    }
  };

  // -----------------------------------------------------------------
  // DELETE QUIZ
  // -----------------------------------------------------------------
  const [deletingQuiz, setDeletingQuiz] = useState(null);

  const handleDeleteQuiz = (quizId, quizTitle) => {
    setConfirmDialogState({
      isOpen: true,
      title: "Archive Quiz?",
      message: `Are you sure you want to archive "${quizTitle}"?\n\nThis will move the quiz to your archives.\n\nNote: Assigned quizzes can still be accessed by students.`,
      confirmLabel: "Archive",
      color: "red",
      onConfirm: async () => {
        setConfirmDialogState({ isOpen: false });
        setDeletingQuiz(quizId);

        try {
          // Get quiz data before archiving
          const quizDoc = await getDoc(doc(db, "quizzes", quizId));

          if (quizDoc.exists()) {
            const quizData = quizDoc.data();

            // Save to archivedQuizzes with metadata
            const archivedData = {
              ...quizData,
              originalQuizId: quizId,
              archivedAt: new Date(),
              archivedBy: auth.currentUser.uid,
              status: "archived"
            };

            await setDoc(doc(db, "archivedQuizzes", quizId), archivedData);
            console.log(`Quiz archived: ${quizId}`);
          }

          // Delete from active quizzes
          await deleteDoc(doc(db, "quizzes", quizId));

          await fetchQuizzes();
          showToast("success", "Archived!", "Quiz archived successfully!");
        } catch (e) {
          console.error("Error archiving quiz:", e);
          showToast("error", "Error", "Error archiving quiz. Please try again.");
        } finally {
          setDeletingQuiz(null);
        }
      },
      onCancel: () => setConfirmDialogState({ isOpen: false }),
    });
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
      showToast("error", "Error", "Error loading assigned quizzes.");
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
      showToast("error", "Error", "Error loading synchronous quizzes.");
    } finally {
      setLoadingSynchronous(false);
    }
  };

  // -----------------------------------------------------------------
  // DELETE ASSIGNMENT
  // -----------------------------------------------------------------
  const handleDeleteAssignment = (assignment, isSync = false) => {
    setConfirmDialogState({
      isOpen: true,
      title: "Delete Assignment?",
      message: `Are you sure you want to delete this assignment?\n\nQuiz: ${assignment.title}\nClass: ${assignment.className}\n\nThis will remove the quiz from all ${assignment.studentCount} students and delete all related data. This action cannot be undone.`,
      confirmLabel: "Delete",
      color: "red",
      onConfirm: async () => {
        setConfirmDialogState({ isOpen: false });
        setDeletingAssignment(`${assignment.quizId}-${assignment.classId}`);

        try {
          const deletePromises = assignment.docIds.map((docId) =>
            deleteDoc(doc(db, "assignedQuizzes", docId))
          );

          await Promise.all(deletePromises);

          if (isSync) {
            await fetchSynchronousQuizzes();
            showToast("success", "Deleted!", "Live quiz assignment deleted successfully!");
          } else {
            await fetchAssignedQuizzes();
            showToast("success", "Deleted!", "Quiz assignment deleted successfully!");
          }
        } catch (e) {
          console.error("Error deleting assignment:", e);
          showToast("error", "Error", "Error deleting assignment. Please try again.");
        } finally {
          setDeletingAssignment(null);
        }
      },
      onCancel: () => setConfirmDialogState({ isOpen: false }),
    });
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
    setShowManualModal(true);
  };

  const closeManualModal = () => {
    setShowManualModal(false);
    setManualQuizTitle("");
    setManualQuestions([]);
  };

  const addManualQuestion = (type) => {
    const newQuestion = {
      type: type, // Use the passed type directly
      question: "",
      points: 1,
      correct_answer: type === "true_false" ? "True" : "",
      choices: type === "multiple_choice"
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
    setConfirmDialogState({
      isOpen: true,
      title: "Delete Question?",
      message: "Are you sure you want to delete this question?",
      confirmLabel: "Delete",
      color: "red",
      onConfirm: () => {
        setManualQuestions(manualQuestions.filter((_, i) => i !== index));
        setConfirmDialogState({ isOpen: false });
      },
      onCancel: () => setConfirmDialogState({ isOpen: false }),
    });
  };

  const handleCreateManualQuiz = async () => {
    if (!manualQuizTitle.trim()) {
      showToast("warning", "Missing Title", "Please enter a quiz title");
      return;
    }

    if (manualQuestions.length === 0) {
      showToast("warning", "Empty Quiz", "Please add at least one question");
      return;
    }

    // Validate all questions
    for (let i = 0; i < manualQuestions.length; i++) {
      const q = manualQuestions[i];

      if (!q.question.trim()) {
        showToast("warning", "Incomplete Question", `Question ${i + 1} is empty`);
        return;
      }

      if (q.type === "multiple_choice") {
        if (!q.choices.some(c => c.text.trim())) {
          showToast("warning", "Incomplete Choices", `Question ${i + 1}: Please add at least one choice`);
          return;
        }
        if (!q.choices.some(c => c.is_correct)) {
          showToast("warning", "Missing Answer", `Question ${i + 1}: Please mark the correct answer`);
          return;
        }
      } else if (!q.correct_answer.trim()) {
        showToast("warning", "Missing Answer", `Question ${i + 1}: Please provide the correct answer`);
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

    const success = await publishQuizToFirestore(quiz);
    if (success) {
      setShowManualModal(false);
      fetchQuizzes();
    }
  };

  // -----------------------------------------------------------------
  // PDF → QUIZ GENERATION
  // -----------------------------------------------------------------
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") setSelectedFile(file);
    else showToast("error", "Invalid File", "Please select a PDF file");
  };

  const handleGenerateQuiz = async () => {
    if (!selectedFile) return showToast("warning", "Missing File", "Please select a PDF file");
    if (!quizTitle.trim()) return showToast("warning", "Missing Title", "Please enter a quiz title");

    const mc = numMC === "" ? 0 : numMC;
    const tf = numTF === "" ? 0 : numTF;
    const id = numID === "" ? 0 : numID;

    if (mc === 0 && tf === 0 && id === 0) {
      return showToast("warning", "Invalid Questions", "Please enter at least one question count");
    }

    setLoading(true);
    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("num_multiple_choice", numMC === "" ? 0 : numMC);
    fd.append("num_true_false", numTF === "" ? 0 : numTF);
    fd.append("num_identification", numID === "" ? 0 : numID);
    fd.append("title", quizTitle || "Generated Quiz");

    try {
      const res = await fetch(
        "https://iquizu-backend-production-3336.up.railway.app/api/quiz/generate-from-pdf",
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
      } else showToast("error", "Generation Failed", data.message);
    } catch (e) {
      console.error(e);
      showToast("error", "Error", "Generation error – check backend.");
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
      cognitive_level: q.cognitive_level || "remembering",
      difficulty: q.difficulty || "easy",
    });
  };

  const handleQuestionSave = (idx) => {
    if (!editForm.question.trim()) return showToast("warning", "Validation", "Question cannot be empty");
    if (editForm.type === "multiple_choice") {
      if (!editForm.choices || editForm.choices.length < 2)
        return showToast("warning", "Validation", "Need at least 2 choices");
      if (!editForm.choices.some((c) => c.is_correct))
        return showToast("warning", "Validation", "Mark one correct choice");
      if (editForm.choices.some((c) => !c.text.trim()))
        return showToast("warning", "Validation", "All choices need text");
    } else if (!editForm.correct_answer.trim())
      return showToast("warning", "Validation", "Correct answer required");

    const updated = [...generatedQuiz.questions];
    updated[idx] = {
      ...updated[idx],
      question: editForm.question,
      points: editForm.points,
      correct_answer: editForm.correct_answer,
      choices: editForm.choices,
      bloom_classification: editForm.bloom_classification,
      cognitive_level: editForm.cognitive_level,        // ADD THIS
      difficulty: editForm.difficulty,
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
            { text: "", is_correct: false },
            { text: "", is_correct: false },
          ]
          : null,
      bloom_classification: "LOTS",
      classification_confidence: 0,
    });
    setActiveTab(type);
  };

  const handleDeleteQuestion = (idx) => {
    setConfirmDialogState({
      isOpen: true,
      title: "Delete Question?",
      message: "Are you sure you want to delete this question?",
      confirmLabel: "Delete",
      color: "red",
      onConfirm: () => {
        setGeneratedQuiz({
          ...generatedQuiz,
          questions: generatedQuiz.questions.filter((_, i) => i !== idx),
        });
        setEditingQuestion(null);
        setConfirmDialogState({ isOpen: false });
      },
      onCancel: () => setConfirmDialogState({ isOpen: false }),
    });
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
  // PUBLISH QUIZ HELPER
  // -----------------------------------------------------------------
  const publishQuizToFirestore = async (quizObj) => {
    if (!quizObj) return;
    const user = auth.currentUser;
    if (!user) return showToast("error", "Auth Required", "Please log in first!");

    setPublishing(true);
    try {
      const totalPoints = quizObj.questions.reduce(
        (s, q) => s + q.points,
        0
      );
      const teacherName =
        user.displayName || user.email?.split("@")[0] || "Teacher";

      const quizData = {
        title: quizObj.title,
        mode: "Published",
        questions: quizObj.questions,
        totalPoints,
        classificationStats: quizObj.classification_stats || {
          hots_count: quizObj.questions.filter(
            (q) => q.bloom_classification === "HOTS"
          ).length,
          lots_count: quizObj.questions.filter(
            (q) => q.bloom_classification === "LOTS"
          ).length,
          hots_percentage: (
            (quizObj.questions.filter(
              (q) => q.bloom_classification === "HOTS"
            ).length /
              quizObj.questions.length) *
            100
          ).toFixed(1),
          lots_percentage: (
            (quizObj.questions.filter(
              (q) => q.bloom_classification === "LOTS"
            ).length /
              quizObj.questions.length) *
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
      showToast("success", "Published!", "Quiz published successfully!");
      return true;
    } catch (e) {
      console.error(e);
      showToast("error", "Error", "Publish error.");
      return false;
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveQuiz = async () => {
    const success = await publishQuizToFirestore(generatedQuiz);
    if (success) {
      setShowPreviewModal(false);
      setGeneratedQuiz(null);
      fetchQuizzes();
    }
  };

  // -----------------------------------------------------------------
  // BADGE
  // -----------------------------------------------------------------
  // Around line 900+ - UPDATE THIS FUNCTION
  const getClassificationBadge = (cls, conf, cognitiveLevel, difficulty) => {
    const isHOTS = cls === "HOTS";
    const bg = isHOTS ? "bg-purple-100" : "bg-blue-100";
    const txt = isHOTS ? "text-purple-700" : "text-blue-700";
    const brd = isHOTS ? "border-purple-300" : "border-blue-300";

    // Difficulty colors
    const difficultyColors = {
      easy: "bg-green-100 text-green-700 border-green-300",
      average: "bg-yellow-100 text-yellow-700 border-yellow-300",
      difficult: "bg-red-100 text-red-700 border-red-300"
    };

    // Cognitive level colors
    const cognitiveColors = {
      remembering: "bg-blue-50 text-blue-600",
      understanding: "bg-cyan-50 text-cyan-600",
      application: "bg-teal-50 text-teal-600",
      analysis: "bg-purple-50 text-purple-600",
      evaluation: "bg-pink-50 text-pink-600",
      creating: "bg-red-50 text-red-600"
    };

    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* LOTS/HOTS Badge */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${bg} ${txt} ${brd}`}
        >
          {cls}
        </span>

        {/* Cognitive Level Badge */}
        {cognitiveLevel && (
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${cognitiveColors[cognitiveLevel] || 'bg-gray-100 text-gray-700'}`}>
            {cognitiveLevel.charAt(0).toUpperCase() + cognitiveLevel.slice(1)}
          </span>
        )}

        {/* Difficulty Badge */}
        {difficulty && (
          <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${difficultyColors[difficulty] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </span>
        )}

        {/* Confidence Score */}
        {conf && (
          <span className="text-xs text-gray-500">
            {(conf * 100).toFixed(1)}%
          </span>
        )}
      </div>
    );
  };

  // -----------------------------------------------------------------
  // PAGINATION COMPONENT
  // -----------------------------------------------------------------
  const Pagination = ({ currentPage, totalItems, onPageChange, accentColor = "blue" }) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      let end = Math.min(totalPages, start + maxVisible - 1);
      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }
      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push("...");
      }
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push("...");
        pages.push(totalPages);
      }
      return pages;
    };

    const colorMap = {
      blue: { active: "bg-blue-600 text-white", hover: "hover:bg-blue-50 text-gray-600", arrow: "text-gray-500 hover:bg-blue-50", disabled: "text-gray-300" },
      yellow: { active: "bg-amber-500 text-white", hover: "hover:bg-amber-50 text-gray-600", arrow: "text-gray-500 hover:bg-amber-50", disabled: "text-gray-300" },
      purple: { active: "bg-violet-500 text-white", hover: "hover:bg-violet-50 text-gray-600", arrow: "text-gray-500 hover:bg-violet-50", disabled: "text-gray-300" },
    };
    const c = colorMap[accentColor] || colorMap.blue;

    return (
      <div className="flex items-center justify-center gap-1 mt-6">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-2 rounded-lg transition ${currentPage === 1 ? c.disabled + " cursor-not-allowed" : c.arrow}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        {getPageNumbers().map((page, i) =>
          page === "..." ? (
            <span key={`dot-${i}`} className="px-2 text-gray-400 text-sm">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-9 h-9 rounded-lg text-sm font-semibold transition ${currentPage === page ? c.active : c.hover
                }`}
            >
              {page}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg transition ${currentPage === totalPages ? c.disabled + " cursor-not-allowed" : c.arrow}`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  // -----------------------------------------------------------------
  // RENDER
  // -----------------------------------------------------------------
  return (
    <div className="w-full font-Poppins animate-fadeIn">
      {/* Header */}
      <div className="relative group flex flex-col md:flex-row gap-3 items-start md:items-center mb-6 bg-blue-600 p-10 rounded-3xl">
        {/*BLOBBBB */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white rounded-full opacity-10 transition-transform group-hover:scale-110 pointer-events-none" />

        <div className="flex flex-col z-10">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            Manage Quizzes
          </h2>
          <p className="text-md md:text-md font-light text-white">
            Create, edit, and organize your quizzes with ease.
          </p>
        </div>
      </div>

      {/* Create New Quiz */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-blue-500 shadow-sm mb-8 animate-slideIn">
        <h3 className="text-xl text-title font-semibold mb-3">
          Create New Quiz
        </h3>
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-blue-700 transition w-full md:w-auto"
          >
            <FileUp className="w-5 h-5" /> Upload PDF (AI Generate)
          </button>
          <button
            onClick={openManualModal}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-green-700 transition w-full md:w-auto"
          >
            <PlusCircle className="w-5 h-5" /> Manual Quiz Creation
          </button>
        </div>
      </div>

      {/* Published Quizzes */}
      <div className="bg-white rounded-2xl border border-blue-500 p-6 md:p-8 mb-8">
        <h3 className="text-lg md:text-xl text-slate-900 font-bold mb-8 text-left">
          Your Published Quizzes
        </h3>

        {loadingQuizzes ? (
          <QuizGridSkeleton count={3} hasButtons={true} />
        ) : publishedQuizzes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-gray-500 text-lg">No published quizzes yet</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
              {publishedQuizzes
                .slice((publishedPage - 1) * ITEMS_PER_PAGE, publishedPage * ITEMS_PER_PAGE)
                .map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setSelectedPublishedQuiz(q)}
                    className="w-full text-left bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group flex flex-col"
                  >
                    {/* Header with gradient */}
                    <div className="w-full bg-gradient-to-r from-blue-600 to-blue-400 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <NotebookPen className="w-5 h-5 text-white flex-shrink-0" />
                        <h3 className="text-lg font-bold text-white truncate flex-1 leading-tight">
                          {q.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/20 text-white border border-white/30 truncate">
                          Published
                        </span>
                      </div>
                    </div>

                    {/* Quiz Details */}
                    <div className="w-full p-4 space-y-3 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <NotebookPen className="w-4 h-4 flex-shrink-0" />
                        <span>{q.questionCount || 0} questions totaling {q.totalPoints || 0} points</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>Created: {q.createdAt?.seconds ? new Date(q.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}</span>
                      </div>

                      {/* Bottom indicator */}
                      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-end text-blue-600 group-hover:text-blue-700 font-semibold text-sm w-full">
                        View Details
                        <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>
                ))}
            </div>
            <Pagination currentPage={publishedPage} totalItems={publishedQuizzes.length} onPageChange={setPublishedPage} accentColor="blue" />
          </>
        )}
      </div>

      {/* Published Quiz Detail Dialog */}
      {mounted && selectedPublishedQuiz && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-Poppins animate-fadeIn" onClick={() => setSelectedPublishedQuiz(null)}>
          <div className="bg-white rounded-2xl w-[95%] md:w-full max-w-md shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-blue-50/50">
              <div className="flex items-center gap-2">
                <NotebookPen className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-bold text-title">{selectedPublishedQuiz.title}</h3>
              </div>
              <button onClick={() => setSelectedPublishedQuiz(null)} className="hover:bg-blue-100 rounded-lg p-1.5 transition text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-5 space-y-3.5">
              {/* Stats & Dates Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Total Stats */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Quiz Stats</p>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-xl font-black text-slate-800 leading-none">{selectedPublishedQuiz.questionCount}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wide">Questions</p>
                    </div>
                    <div className="w-px h-6 bg-slate-200"></div>
                    <div>
                      <p className="text-xl font-black text-slate-800 leading-none">{selectedPublishedQuiz.totalPoints}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wide">Points</p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Timeline</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <p className="text-[11px] text-slate-600 truncate"><span className="font-semibold text-slate-700">Created:</span> {selectedPublishedQuiz.createdAt?.seconds ? new Date(selectedPublishedQuiz.createdAt.seconds * 1000).toLocaleDateString("en-PH") : "N/A"}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <p className="text-[11px] text-slate-600 truncate"><span className="font-semibold text-slate-700">Updated:</span> {selectedPublishedQuiz.updatedAt?.seconds ? new Date(selectedPublishedQuiz.updatedAt.seconds * 1000).toLocaleDateString("en-PH") : "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Breakdowns */}
              {selectedPublishedQuiz.questions && selectedPublishedQuiz.questions.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {/* Types */}
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 flex items-center gap-1.5 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>Multiple Choice</span>
                        <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md">{selectedPublishedQuiz.questions.filter(q => q.type === 'multiple_choice').length}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 flex items-center gap-1.5 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>True/False</span>
                        <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md">{selectedPublishedQuiz.questions.filter(q => q.type === 'true_false').length}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 flex items-center gap-1.5 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>Identification</span>
                        <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md">{selectedPublishedQuiz.questions.filter(q => q.type === 'identification').length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 flex items-center gap-1.5 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Easy</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">{selectedPublishedQuiz.questions.filter(q => q.difficulty === 'easy').length}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 flex items-center gap-1.5 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>Average</span>
                        <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">{selectedPublishedQuiz.questions.filter(q => q.difficulty === 'average').length}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 flex items-center gap-1.5 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>Difficult</span>
                        <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md">{selectedPublishedQuiz.questions.filter(q => q.difficulty === 'difficult').length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedPublishedQuiz.classificationStats && (
                <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/50">
                  <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest mb-2 flex items-center gap-1.5"><Brain className="w-3.5 h-3.5" /> Bloom's Taxonomy</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white border border-purple-100 shadow-sm rounded-lg p-2 flex items-center justify-between">
                      <span className="text-[11px] font-black text-purple-700 tracking-wide">HOTS</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md">{selectedPublishedQuiz.classificationStats.hots_count}</span>
                        <span className="text-[10px] font-medium text-purple-400">({selectedPublishedQuiz.classificationStats.hots_percentage}%)</span>
                      </div>
                    </div>
                    <div className="flex-1 bg-white border border-blue-100 shadow-sm rounded-lg p-2 flex items-center justify-between">
                      <span className="text-[11px] font-black text-blue-700 tracking-wide">LOTS</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md">{selectedPublishedQuiz.classificationStats.lots_count}</span>
                        <span className="text-[10px] font-medium text-blue-400">({selectedPublishedQuiz.classificationStats.lots_percentage}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    setSelectedPublishedQuiz(null);
                    navigate(`/teacher/edit-quiz/${selectedPublishedQuiz.id}`);
                  }}
                  className="bg-white border text-blue-600 hover:bg-blue-50 border-blue-200 font-bold rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 text-sm transition-all shadow-sm"
                >
                  <Pen className="w-4 h-4" /> Edit Quiz
                </button>
                <button
                  onClick={() => {
                    setSelectedPublishedQuiz(null);
                    navigate(`/teacher/assign-quiz/${selectedPublishedQuiz.id}`);
                  }}
                  className="bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 text-sm shadow-sm transition-all"
                >
                  <Users className="w-4 h-4" /> Assign Quiz
                </button>
                <button
                  onClick={() => {
                    setSelectedPublishedQuiz(null);
                    handleDeleteQuiz(selectedPublishedQuiz.id, selectedPublishedQuiz.title);
                  }}
                  className="col-span-2 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm font-bold shadow-sm"
                >
                  <Trash2 className="w-4 h-4" /> Archive Quiz
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}



      {/* Synchronous Quizzes Section */}
      <div className="bg-white rounded-2xl border border-blue-500 p-6 md:p-8 mb-8">
        <h3 className="text-lg md:text-xl text-slate-900 font-bold mb-8 flex items-center justify-start gap-2 text-left">
          Synchronous Quizzes
          {synchronousQuizzes.length > 0 && (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold ml-2">
              {synchronousQuizzes.length}
            </span>
          )}
        </h3>

        {loadingSynchronous ? (
          <QuizGridSkeleton count={3} hasButtons={false} />
        ) : synchronousQuizzes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Zap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg">
              No live quizzes assigned yet
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
              {synchronousQuizzes
                .slice((syncPage - 1) * ITEMS_PER_PAGE, syncPage * ITEMS_PER_PAGE)
                .map((a) => (
                  <button
                    key={`${a.quizId}-${a.classId}`}
                    onClick={() => setSelectedSyncQuiz(a)}
                    className="w-full text-left bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group flex flex-col"
                  >
                    {/* Header with gradient */}
                    <div className="w-full bg-gradient-to-r from-amber-500 to-amber-400 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-white flex-shrink-0" />
                        <h3 className="text-lg font-bold text-white truncate flex-1 leading-tight">
                          {a.title}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/20 text-white border border-white/30 truncate flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                          LIVE
                        </span>
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/20 text-white border border-white/30 truncate">
                          Synchronous
                        </span>
                      </div>
                    </div>

                    {/* Quiz Details */}
                    <div className="w-full p-4 space-y-3 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4 flex-shrink-0" />
                        <span>Assigned to {a.className} • {a.studentCount} Students</span>
                      </div>

                      {a.dueDate && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>Due: {new Date(a.dueDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      )}

                      {/* Bottom indicator */}
                      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-end text-amber-600 group-hover:text-amber-700 font-semibold text-sm w-full">
                        View Details
                        <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>
                ))}
            </div>
            <Pagination currentPage={syncPage} totalItems={synchronousQuizzes.length} onPageChange={setSyncPage} accentColor="yellow" />
          </>
        )}
      </div>

      {/* Sync Quiz Detail Dialog */}
      {mounted && selectedSyncQuiz && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-Poppins animate-fadeIn" onClick={() => setSelectedSyncQuiz(null)}>
          <div className="bg-white rounded-2xl w-[95%] md:w-full max-w-md shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-amber-50/50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-title">{selectedSyncQuiz.title}</h3>
              </div>
              <button onClick={() => setSelectedSyncQuiz(null)} className="hover:bg-amber-100 rounded-lg p-1.5 transition text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-5 space-y-3.5">
              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Status */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1.5">Session Status</p>
                  <div>
                    <span
                      className={`inline-flex px-2 py-1 rounded-md text-[11px] font-black uppercase tracking-wide ${selectedSyncQuiz.sessionStatus === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : selectedSyncQuiz.sessionStatus === "ended"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-slate-200 text-slate-700"
                        }`}
                    >
                      {selectedSyncQuiz.sessionStatus === "active"
                        ? "Active"
                        : selectedSyncQuiz.sessionStatus === "ended"
                          ? "Ended"
                          : "Not Started"}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1.5">Timeline</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <p className="text-[11px] text-slate-600 truncate"><span className="font-semibold text-slate-700">Assigned:</span> {selectedSyncQuiz.assignedAt ? new Date(selectedSyncQuiz.assignedAt.seconds * 1000).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quiz Code */}
              {selectedSyncQuiz.quizCode && (
                <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100/50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-amber-500 tracking-widest mb-0.5">Live Quiz Code</p>
                    <p className="text-2xl font-black text-amber-700 tracking-widest">{selectedSyncQuiz.quizCode}</p>
                  </div>
                  <button
                    onClick={() => handleCopyCode(selectedSyncQuiz.quizCode, `${selectedSyncQuiz.quizId}-${selectedSyncQuiz.classId}`)}
                    className={`p-2 rounded-lg transition-all shadow-sm ${copiedCodeId === `${selectedSyncQuiz.quizId}-${selectedSyncQuiz.classId}`
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-white border border-amber-200 hover:bg-amber-50 text-amber-600"
                      }`}
                    title="Copy code to clipboard"
                  >
                    {copiedCodeId === `${selectedSyncQuiz.quizId}-${selectedSyncQuiz.classId}` ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  onClick={() => {
                    setSelectedSyncQuiz(null);
                    navigate(`/teacher/quiz-control/${selectedSyncQuiz.quizId}/${selectedSyncQuiz.classId}`);
                  }}
                  className="w-full bg-amber-500 text-white hover:bg-amber-600 font-bold rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 text-sm shadow-sm transition-all"
                >
                  <Zap className="w-4 h-4" /> Open Control Panel
                </button>
                <button
                  onClick={() => {
                    setSelectedSyncQuiz(null);
                    handleDeleteAssignment(selectedSyncQuiz, true);
                  }}
                  disabled={deletingAssignment === `${selectedSyncQuiz.quizId}-${selectedSyncQuiz.classId}`}
                  className="w-full bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm font-bold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {deletingAssignment === `${selectedSyncQuiz.quizId}-${selectedSyncQuiz.classId}` ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Remove Assignment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )
      }

      <div className="bg-white rounded-2xl border border-blue-500 p-6 md:p-8 mb-8">
        <h3 className="text-lg md:text-xl text-slate-900 font-bold mb-8 flex items-center justify-start gap-2 text-left">
          Asynchronous Quizzes
          {assignedQuizzes.length > 0 && (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold ml-2">
              {assignedQuizzes.length}
            </span>
          )}
        </h3>

        {loadingAssigned ? (
          <QuizGridSkeleton count={3} hasButtons={false} />
        ) : assignedQuizzes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg">No quizzes assigned yet</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
              {assignedQuizzes
                .slice((asyncPage - 1) * ITEMS_PER_PAGE, asyncPage * ITEMS_PER_PAGE)
                .map((a) => (
                  <button
                    key={`${a.quizId}-${a.classId}`}
                    onClick={() => setSelectedAsyncQuiz(a)}
                    className="w-full text-left bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group flex flex-col"
                  >
                    {/* Header with gradient */}
                    <div className="w-full bg-gradient-to-r from-purple-600 to-purple-400 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-white flex-shrink-0" />
                        <h3 className="text-lg font-bold text-white truncate flex-1 leading-tight">
                          {a.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/20 text-white border border-white/30 truncate">
                          Asynchronous
                        </span>
                      </div>
                    </div>

                    {/* Quiz Details */}
                    <div className="w-full p-4 space-y-3 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4 flex-shrink-0" />
                        <span>Assigned to {a.className} • {a.studentCount} Students</span>
                      </div>

                      {a.dueDate && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>Due: {new Date(a.dueDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      )}

                      {/* Bottom indicator */}
                      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-end text-purple-600 group-hover:text-purple-700 font-semibold text-sm w-full">
                        View Details
                        <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>
                ))}
            </div>
            <Pagination currentPage={asyncPage} totalItems={assignedQuizzes.length} onPageChange={setAsyncPage} accentColor="purple" />
          </>
        )}
      </div>

      {/* Async Quiz Detail Dialog */}
      {
        mounted && selectedAsyncQuiz && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-Poppins animate-fadeIn" onClick={() => setSelectedAsyncQuiz(null)}>
            <div className="bg-white rounded-2xl w-[95%] md:w-full max-w-md shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
              {/* Dialog Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-violet-50/50 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-violet-500" />
                  <h3 className="text-lg font-bold text-title">{selectedAsyncQuiz.title}</h3>
                </div>
                <button onClick={() => setSelectedAsyncQuiz(null)} className="hover:bg-violet-100 rounded-lg p-1.5 transition text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Dialog Body */}
              <div className="p-5 space-y-3.5">
                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Details */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Assignment</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center">
                          <Users className="w-3 h-3" />
                        </div>
                        <span className="font-semibold text-slate-800">{selectedAsyncQuiz.className}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-semibold text-slate-500 ml-7">{selectedAsyncQuiz.studentCount} Students</span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Timeline</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <p className="text-[11px] text-slate-600"><span className="font-semibold text-slate-700">Assigned:</span> {selectedAsyncQuiz.assignedAt ? new Date(selectedAsyncQuiz.assignedAt.seconds * 1000).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : "N/A"}</p>
                      </div>
                      {selectedAsyncQuiz.dueDate && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <p className="text-[11px] text-slate-600"><span className="font-semibold text-slate-700">Due:</span> {new Date(selectedAsyncQuiz.dueDate).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2.5 pt-1">
                  <button
                    onClick={() => {
                      setSelectedAsyncQuiz(null);
                      navigate(`/teacher/quiz-results/${selectedAsyncQuiz.quizId}/${selectedAsyncQuiz.classId}`);
                    }}
                    className="w-full bg-violet-600 text-white hover:bg-violet-700 font-bold rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 text-sm shadow-sm transition-all"
                  >
                    <Eye className="w-4 h-4" /> View Results
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAsyncQuiz(null);
                      handleDeleteAssignment(selectedAsyncQuiz, false);
                    }}
                    disabled={deletingAssignment === `${selectedAsyncQuiz.quizId}-${selectedAsyncQuiz.classId}`}
                    className="w-full bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm font-bold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {deletingAssignment === `${selectedAsyncQuiz.quizId}-${selectedAsyncQuiz.classId}` ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Remove Assignment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Manual Quiz Creation Modal */}
      {
        mounted && showManualModal && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4 font-Poppins animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] flex flex-col animate-slideUp">
              {/* Header */}
              <div className="flex justify-between items-center p-4 md:p-6 border-b bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <PlusCircle className="w-8 h-8" />
                  <div>
                    <h3 className="text-xl font-bold">Manual Quiz Creation</h3>
                    <p className="text-sm text-green-100">Create your quiz from scratch</p>
                  </div>
                </div>
                <button
                  onClick={closeManualModal}
                  className="text-white hover:bg-blue-500 rounded-lg p-2 transition"
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Question Type Selector */}
                <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                  <label className="block text-sm font-bold mb-3 text-gray-700">
                    Add Question Type
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => addManualQuestion("multiple_choice")}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      <PlusCircle className="w-5 h-5" /> Multiple Choice
                    </button>
                    <button
                      onClick={() => addManualQuestion("true_false")}
                      className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                    >
                      <PlusCircle className="w-5 h-5" /> True/False
                    </button>
                    <button
                      onClick={() => addManualQuestion("identification")}
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
                        className="bg-white border-2 border-gray-300 rounded-xl p-5 hover:border-blue-400 transition"
                      >
                        {/* Question Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
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
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="2"
                          />
                        </div>

                        {/* Points and Classification */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                  points: parseInt(e.target.value) || 1,
                                })
                              }
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold mb-2">
                              LOTS/HOTS
                            </label>
                            <select
                              value={editForm.bloom_classification}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  bloom_classification: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border rounded-lg"
                            >
                              <option value="HOTS">HOTS</option>
                              <option value="LOTS">LOTS</option>
                            </select>
                          </div>

                          {/* ADD THESE TWO NEW DROPDOWNS */}
                          <div>
                            <label className="block text-sm font-semibold mb-2">
                              Cognitive Level
                            </label>
                            <select
                              value={editForm.cognitive_level}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  cognitive_level: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border rounded-lg text-sm"
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
                            <label className="block text-sm font-semibold mb-2">
                              Difficulty
                            </label>
                            <select
                              value={editForm.difficulty}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  difficulty: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border rounded-lg"
                            >
                              <option value="easy">Easy</option>
                              <option value="average">Average</option>
                              <option value="difficult">Difficult</option>
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
                                  className={`flex items-center gap-3 p-3 rounded-lg border-2 ${choice.is_correct
                                    ? "bg-green-50 border-blue-400"
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
                                    className="w-5 h-5 text-blue-600"
                                  />
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
                                    placeholder={`Enter choice ${cIndex + 1}`}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className={`flex-1 py-3 rounded-lg border-2 font-semibold transition ${q.correct_answer === "True"
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                  }`}
                              >
                                True
                              </button>
                              <button
                                onClick={() =>
                                  updateManualQuestion(qIndex, "correct_answer", "False")
                                }
                                className={`flex-1 py-3 rounded-lg border-2 font-semibold transition ${q.correct_answer === "False"
                                  ? "bg-blue-600 text-white border-blue-600"
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
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        <p className="text-xl font-bold text-blue-600">
                          {manualQuestions.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Points</p>
                        <p className="text-xl font-bold text-green-600">
                          {manualQuestions.reduce((sum, q) => sum + q.points, 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">HOTS</p>
                        <p className="text-xl font-bold text-purple-600">
                          {manualQuestions.filter(q => q.bloom_classification === "HOTS").length}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">LOTS</p>
                        <p className="text-xl font-bold text-teal-600">
                          {manualQuestions.filter(q => q.bloom_classification === "LOTS").length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t p-4 md:p-6 bg-gray-50 rounded-b-2xl flex flex-col-reverse md:flex-row gap-3">
                <button
                  onClick={closeManualModal}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition w-full md:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateManualQuiz}
                  disabled={!manualQuizTitle.trim() || manualQuestions.length === 0 || publishing}
                  className="flex-1 px-6 py-3 bg-button text-white font-semibold rounded-lg hover:bg-buttonHover transition flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed w-full md:w-auto"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Publish Quiz
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* PDF Modal */}
      {
        mounted && showPdfModal && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-Poppins animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-slideUp">
              <div className="flex justify-between items-center p-4 md:p-6 border-b bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <FileUp className="w-8 h-8" />
                  <div>
                    <h3 className="text-xl font-bold">Upload PDF</h3>
                    <p className="text-sm text-green-100">Create your quiz using artificial intelligence</p>
                  </div>
                </div>
                <button
                  onClick={closePdfModal}
                  className="text-white hover:bg-blue-600 rounded-lg p-2 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <label className="block text-title text-sm font-semibold mb-2">
                    Quiz Title
                  </label>
                  <input
                    type="text"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder="e.g., Midterm Exam"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <p className="text-sm text-blue mt-2">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Multiple Choice
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={numMC.toString()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") setNumMC("");
                        else if (/^\d*$/.test(val)) {
                          setNumMC(parseInt(val, 10));
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      True/False
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={numTF.toString()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") setNumTF("");
                        else if (/^\d*$/.test(val)) {
                          setNumTF(parseInt(val, 10));
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Identification
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={numID.toString()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") setNumID("");
                        else if (/^\d*$/.test(val)) {
                          setNumID(parseInt(val, 10));
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGenerateQuiz}
                  disabled={loading}
                  className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
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
          </div>,
          document.body
        )
      }

      {/* Preview Modal */}
      {
        mounted && showPreviewModal && generatedQuiz && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 md:p-4 font-Poppins animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] md:max-h-[90vh] flex flex-col animate-slideUp">
              {/* Header */}
              <div className="flex justify-between items-center p-4 md:p-6 border-b bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-t-2xl">
                <div className="flex-1">
                  {isEditingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="text-lg md:text-xl font-bold bg-white text-gray-800 px-3 py-1 rounded"
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
                        <h3 className="text-xl font-bold">
                          {generatedQuiz.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-white mt-1">
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
                        className="bg-blue-700 hover:bg-blue-800 rounded-lg mr-2 px-3 py-1 text-sm flex items-center gap-1 ml-auto"
                      >
                        <Pen className="w-4 h-4" /> Edit
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={closePreviewModal}
                  className="text-white hover:bg-blue-600 rounded-lg p-2 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>



              // ... (inside Preview Modal JSX)

              {/* Classification Filter Tabs & Question Type Tabs */}
              <div className="px-4 pt-4 pb-0 md:px-6 md:pt-6 bg-gray-50 border-b flex flex-col gap-4">
                {/* Bloom's Classification Filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <span className="text-sm font-semibold text-gray-700 mr-2 whitespace-nowrap">Filter by:</span>
                  <button
                    onClick={() => setClassificationFilter("ALL")}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition whitespace-nowrap ${classificationFilter === "ALL"
                      ? "bg-slate-700 text-white shadow-md"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                      }`}
                  >
                    All ({generatedQuiz.questions.length})
                  </button>
                  <button
                    onClick={() => setClassificationFilter("HOTS")}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition flex items-center gap-1 whitespace-nowrap ${classificationFilter === "HOTS"
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-50"
                      }`}
                  >
                    <Brain className="w-3 h-3" />
                    HOTS ({generatedQuiz.questions.filter(q => q.bloom_classification === "HOTS").length})
                  </button>
                  <button
                    onClick={() => setClassificationFilter("LOTS")}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition flex items-center gap-1 whitespace-nowrap ${classificationFilter === "LOTS"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                      }`}
                  >
                    <Snowflake className="w-3 h-3" />
                    LOTS ({generatedQuiz.questions.filter(q => q.bloom_classification === "LOTS").length})
                  </button>
                </div>

                {/* Question Type Tabs (Shadcn Style) */}
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                  {tabContent.map((tab) => {
                    const count = generatedQuiz.questions.filter(q => q.type === tab.id).length;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all rounded-lg
                          ${activeTab === tab.id
                            ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                          }
                        `}
                      >
                        <span className={`${activeTab === tab.id ? "text-blue-600" : "text-slate-400"}`}>
                          {tab.icon}
                        </span>
                        {tab.label}
                        <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-200 text-slate-600"
                          }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Questions Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                {(() => {
                  // Filter by Bloom's first
                  const bloomFiltered = generatedQuiz.questions.filter(q =>
                    classificationFilter === "ALL" || q.bloom_classification === classificationFilter
                  );

                  // Then filter by active tab
                  const currentTabQuestions = bloomFiltered.filter(q => q.type === activeTab);

                  // Group them just to maintain the map structure logic if needed, or just map directly
                  // Since we are showing only one type, we can just map the list

                  if (currentTabQuestions.length === 0) {
                    return (
                      <div className="text-center py-12 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
                          {tabContent.find(t => t.id === activeTab)?.icon}
                        </div>
                        <p className="text-gray-500 text-lg font-medium">
                          No {tabContent.find(t => t.id === activeTab)?.label} questions
                        </p>
                        <p className="text-gray-400 text-sm mt-1 max-w-xs mx-auto">
                          {classificationFilter !== "ALL"
                            ? `No questions found with ${classificationFilter} classification in this category.`
                            : "Add a question to get started with this category."}
                        </p>
                        <button
                          onClick={() => handleAddQuestion(activeTab)}
                          className="mt-6 flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium"
                        >
                          <PlusCircle className="w-4 h-4 text-blue-600" />
                          Add {tabContent.find(t => t.id === activeTab)?.label} Question
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                          Question List
                        </h4>
                        <button
                          onClick={() => handleAddQuestion(activeTab)}
                          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-xs font-bold shadow-sm"
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> Add Question
                        </button>
                      </div>

                      {currentTabQuestions.map((q) => {
                        // Find the original index in the main array to ensure updates work correctly
                        const originalIndex = generatedQuiz.questions.indexOf(q);
                        const editing = editingQuestion === originalIndex;

                        return (
                          <div
                            key={originalIndex}
                            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all duration-200 group relative"
                          >
                            {editing ? (
                              // ... EDITING FORM (Same as existing) ...
                              /* EDIT FORM - keeping logic same but ensuring context */
                              <div className="space-y-4">
                                {/* ... (Copy existing edit form JSX here or reference internal block) ... */}
                                {/* Since I can't easily reference "internal block", I will rewrite the edit form logic here briefly or just rely on the fact that I'm inside the map function. 
                                            Wait, I need to provide the FULL content for the replacement.
                                            I will copy the edit form JSX from the previous file content. 
                                        */}
                                <div>
                                  <label className="block text-sm font-bold mb-1.5 text-gray-700">
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
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-bold mb-1.5 text-gray-700">
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
                                    <label className="block text-sm font-bold mb-1.5 text-gray-700">
                                      Classification
                                    </label>
                                    <select
                                      value={editForm.bloom_classification}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          bloom_classification: e.target.value,
                                        })
                                      }
                                      className="w-full px-3 py-2 border rounded-lg"
                                    >
                                      <option value="HOTS">HOTS</option>
                                      <option value="LOTS">LOTS</option>
                                    </select>
                                  </div>
                                  {/* COGNITIVE LEVEL */}
                                  <div>
                                    <label className="block text-sm font-bold mb-1.5 text-gray-700">
                                      Cognitive Level
                                    </label>
                                    <select
                                      value={editForm.cognitive_level || "remembering"}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          cognitive_level: e.target.value,
                                        })
                                      }
                                      className="w-full px-3 py-2 border rounded-lg capitalize"
                                    >
                                      {["remembering", "understanding", "application", "analysis", "evaluation", "creating"].map(level => (
                                        <option key={level} value={level}>{level}</option>
                                      ))}
                                    </select>
                                  </div>
                                  {/* DIFFICULTY */}
                                  <div>
                                    <label className="block text-sm font-bold mb-1.5 text-gray-700">
                                      Difficulty
                                    </label>
                                    <select
                                      value={editForm.difficulty || "easy"}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          difficulty: e.target.value,
                                        })
                                      }
                                      className="w-full px-3 py-2 border rounded-lg capitalize"
                                    >
                                      {["easy", "average", "difficult"].map(diff => (
                                        <option key={diff} value={diff}>{diff}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {editForm.type === "multiple_choice" && (
                                  <div>
                                    <label className="block text-sm font-bold mb-2 text-gray-700">
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
                                                // For multiple choice single answer, usually we uncheck others, but let's stick to current logic
                                                // Assuming single answer for now based on radio button behavior in manual creation
                                                updated.forEach((c, idx) => c.is_correct = idx === i);

                                                // Toggle currently selected
                                                updated[i].is_correct = e.target.checked;

                                                setEditForm({
                                                  ...editForm,
                                                  choices: updated,
                                                });
                                              }}
                                              className="w-4 h-4 accent-blue-600"
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
                                              placeholder={`Choice ${i + 1}`}
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
                                    <label className="block text-sm font-bold mb-2 text-gray-700">
                                      Correct Answer
                                    </label>
                                    {editForm.type === "true_false" ? (
                                      <div className="flex gap-2">
                                        {["True", "False"].map(val => (
                                          <button
                                            key={val}
                                            onClick={() => setEditForm({ ...editForm, correct_answer: val })}
                                            className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition ${editForm.correct_answer === val ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}
                                          >
                                            {val}
                                          </button>
                                        ))}
                                      </div>
                                    ) : (
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
                                    )}
                                  </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                  <button
                                    onClick={() =>
                                      handleQuestionSave(originalIndex)
                                    }
                                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm font-bold"
                                  >
                                    Save Changes
                                  </button>
                                  <button
                                    onClick={() =>
                                      setEditingQuestion(null)
                                    }
                                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-bold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* DISPLAY CARD */
                              <>
                                <div className="flex items-start gap-4 mb-3">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm border border-slate-200">
                                    {originalIndex + 1}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${q.type === 'multiple_choice' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                        q.type === 'true_false' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                          'bg-teal-50 text-teal-600 border-teal-100'
                                        }`}>
                                        {q.type.replace("_", " ")}
                                      </span>
                                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        {q.points} pts
                                      </span>
                                      {getClassificationBadge(
                                        q.bloom_classification,
                                        q.classification_confidence,
                                        q.cognitive_level,
                                        q.difficulty
                                      )}
                                    </div>

                                    <p className="text-base font-medium text-gray-800 leading-relaxed">
                                      {q.question}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleQuestionEdit(originalIndex, q)}
                                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                      title="Edit Question"
                                    >
                                      <Pen className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteQuestion(originalIndex)}
                                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                      title="Delete Question"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* ANSWERS DISPLAY */}
                                <div className="pl-12">
                                  {q.type === "multiple_choice" && q.choices && (
                                    <div className="grid gap-2">
                                      {q.choices.map((c, i) => (
                                        <div
                                          key={i}
                                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm border ${c.is_correct
                                            ? "bg-green-50 border-green-200 text-green-800"
                                            : "bg-white border-gray-100 text-gray-600"
                                            }`}
                                        >
                                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${c.is_correct ? "border-green-500 bg-green-500" : "border-gray-300"
                                            }`}>
                                            {c.is_correct && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                          </div>
                                          <span className={c.is_correct ? "font-medium" : ""}>{c.text}</span>
                                          {c.is_correct && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {(q.type === "true_false" || q.type === "identification") && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-xs font-bold text-gray-500 uppercase">Correct Answer:</span>
                                      <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-md border border-green-100">
                                        {q.correct_answer}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="border-t p-4 md:p-6 bg-gray-50 rounded-b-2xl flex flex-col md:flex-row gap-3">
                <button
                  onClick={closePreviewModal}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition w-full md:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfirmDialogState({
                      isOpen: true,
                      title: "Regenerate Quiz?",
                      message: "Regenerate quiz? This will replace the current quiz with a new one.",
                      confirmLabel: "Regenerate",
                      color: "orange",
                      onConfirm: async () => {
                        setConfirmDialogState({ isOpen: false });
                        if (!selectedFile) {
                          showToast("warning", "Missing File", "No PDF file found. Please upload again.");
                          setShowPreviewModal(false);
                          setShowPdfModal(true);
                          return;
                        }

                        setLoading(true);
                        const fd = new FormData();
                        fd.append("file", selectedFile);
                        fd.append("num_multiple_choice", numMC);
                        fd.append("num_true_false", numTF);
                        fd.append("num_identification", numID);
                        fd.append("title", generatedQuiz.title || "Generated Quiz");

                        try {
                          const res = await fetch(
                            "https://iquizu-backend-production-3336.up.railway.app/api/quiz/generate-from-pdf",
                            {
                              method: "POST",
                              body: fd,
                            }
                          );
                          const data = await res.json();
                          if (data.success) {
                            setGeneratedQuiz(data.quiz);
                            setEditingQuestion(null);
                            setClassificationFilter("ALL");
                            showToast("success", "Regenerated!", "Quiz regenerated successfully!");
                          } else {
                            showToast("error", "Failed", data.message);
                          }
                        } catch (e) {
                          console.error(e);
                          showToast("error", "Error", "Generation error – check backend.");
                        } finally {
                          setLoading(false);
                        }
                      },
                      onCancel: () => setConfirmDialogState({ isOpen: false }),
                    });
                  }}
                  disabled={loading}
                  className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400 w-full md:w-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      Regenerate Quiz
                    </>
                  )}
                </button>
                <button
                  onClick={handleSaveQuiz}
                  disabled={publishing}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400 w-full md:w-auto"
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
          </div>,
          document.body
        )
      }

      {/* Archive/Delete Loading Overlay */}
      {mounted && (deletingQuiz || deletingAssignment) && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] font-Poppins animate-fadeIn">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 animate-slideUp max-w-xs w-full mx-4">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-800">
                {deletingQuiz ? "Archiving Quiz..." : "Deleting Assignment..."}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {deletingQuiz ? "Moving quiz to archives" : "Removing assignment data"}
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-rose-500 h-1.5 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <Toast {...toast} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
      <ConfirmDialog {...confirmDialogState} />
    </div >
  );
}