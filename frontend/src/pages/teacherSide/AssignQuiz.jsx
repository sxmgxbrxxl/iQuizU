import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebase/firebaseConfig";
import ConfirmDialog from "../../components/ConfirmDialog";
import Toast from "../../components/Toast";
import {
  ArrowLeft,
  Users,
  Send,
  CheckCircle,
  Calendar,
  Timer,
  Zap,
  Settings as SettingsIcon,
  Shuffle,
  Trophy,
  Eye,
  AlertCircle,
  Loader2,
  School,
  Plus,
  X,
} from "lucide-react";

export default function AssignQuizToClass() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const isAssigningRef = useRef(false);

  const [quiz, setQuiz] = useState(null);
  const [allClasses, setAllClasses] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [classStudents, setClassStudents] = useState({});
  const [selectedStudentsByClass, setSelectedStudentsByClass] = useState({});
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [existingAssignments, setExistingAssignments] = useState({});
  const [generatedQuizCode, setGeneratedQuizCode] = useState(null);
  const [expandedClasses, setExpandedClasses] = useState({});

  // Toast state
  const [toast, setToast] = useState({ show: false, type: "", title: "", message: "" });
  const showToast = (type, title, message) => setToast({ show: true, type, title, message });

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  const [assignmentSettings, setAssignmentSettings] = useState({
    startDate: "",
    dueDate: "",
    instructions: "",
    mode: "asynchronous",
    timeLimit: null,
    deadline: null,
    shuffleQuestions: false,
    shuffleChoices: false,
    showResults: true,
    allowReview: true,
    showCorrectAnswers: true,
    passingScore: 60,
    maxAttempts: 1,
  });

  useEffect(() => {
    fetchQuizAndClasses();
  }, [quizId]);

  const fetchQuizAndClasses = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        showToast("error", "Authentication Required", "Please login first.");
        navigate("/login");
        return;
      }

      // Fetch Quiz
      const quizRef = doc(db, "quizzes", quizId);
      const quizSnap = await getDoc(quizRef);

      if (!quizSnap.exists()) {
        showToast("error", "Not Found", "Quiz not found!");
        navigate("/teacher/quizzes");
        return;
      }

      const quizData = { id: quizSnap.id, ...quizSnap.data() };

      if (quizData.teacherId !== currentUser.uid) {
        showToast("error", "Permission Denied", "You don't have permission to assign this quiz!");
        navigate("/teacher/quizzes");
        return;
      }

      quizData.title = quizData.title || "Untitled Quiz";
      quizData.code = quizData.code || `QZ${quizId.slice(-6).toUpperCase()}`;

      setQuiz(quizData);

      if (quizData.settings) {
        setAssignmentSettings((prev) => ({
          ...prev,
          mode: quizData.settings.mode || "asynchronous",
          timeLimit: quizData.settings.timeLimit || null,
          deadline: quizData.settings.deadline || null,
          passingScore: quizData.settings.passingScore || 60,
          maxAttempts: quizData.settings.maxAttempts || 1,
          shuffleQuestions: quizData.settings.shuffleQuestions || false,
          shuffleChoices: quizData.settings.shuffleChoices || false,
          showResults: quizData.settings.showResults !== false,
          allowReview: quizData.settings.allowReview !== false,
          showCorrectAnswers: quizData.settings.showCorrectAnswers !== false,
        }));
      }

      // Fetch all teacher's classes
      const classesRef = collection(db, "classes");
      const classesQuery = query(
        classesRef,
        where("teacherId", "==", currentUser.uid)
      );
      const classesSnap = await getDocs(classesQuery);

      const classesList = [];
      classesSnap.forEach((doc) => {
        classesList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      classesList.sort((a, b) => {
        const aName = a.classNo ? `Class ${a.classNo}` : a.name;
        const bName = b.classNo ? `Class ${b.classNo}` : b.name;
        return aName.localeCompare(bName);
      });
      setAllClasses(classesList);

      // Check existing assignments for all classes
      const existingMap = {};
      for (const classItem of classesList) {
        const existing = await checkExistingAssignment(classItem.id);
        if (existing.exists) {
          existingMap[classItem.id] = existing;
        }
      }
      setExistingAssignments(existingMap);

    } catch (error) {
      console.error("Error fetching data:", error);
      showToast("error", "Error", "Error loading data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsForClass = async (classId) => {
    try {
      const studentsRef = collection(db, "users");
      const q = query(
        studentsRef,
        where("role", "==", "student"),
        where("classIds", "array-contains", classId)
      );
      const studentsSnap = await getDocs(q);

      const studentsList = [];
      studentsSnap.forEach((doc) => {
        const data = doc.data();
        studentsList.push({
          id: doc.id,
          authUID: data.authUID || doc.id,
          name: data.name || "Unknown",
          email: data.emailAddress || "",
          studentNo: data.studentNo || "N/A",
          program: data.program || "",
          year: data.year || "",
          hasAccount: data.hasAccount || false,
        });
      });

      studentsList.sort((a, b) => a.name.localeCompare(b.name));

      setClassStudents((prev) => ({
        ...prev,
        [classId]: studentsList,
      }));

      // Auto-select all students
      setSelectedStudentsByClass((prev) => ({
        ...prev,
        [classId]: studentsList.map((s) => s.id),
      }));
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const checkExistingAssignment = async (classId) => {
    try {
      const assignmentsRef = collection(db, "assignedQuizzes");
      const q = query(
        assignmentsRef,
        where("quizId", "==", quizId),
        where("classId", "==", classId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.size > 0) {
        const firstDoc = snapshot.docs[0].data();
        return {
          exists: true,
          mode: firstDoc.quizMode || "asynchronous",
          dueDate: firstDoc.dueDate || "",
          instructions: firstDoc.instructions || "",
          settings: firstDoc.settings || {},
          assignmentDocs: snapshot.docs,
        };
      }

      return { exists: false };
    } catch (error) {
      console.error("Error checking existing assignment:", error);
      return { exists: false };
    }
  };

  const generateQuizCode = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setGeneratedQuizCode(code);
  };

  const handleBack = () => {
    navigate(`/teacher/quizzes`);
  };

  const handleAddClass = (classId) => {
    if (!selectedClasses.includes(classId)) {
      setSelectedClasses([...selectedClasses, classId]);
      setExpandedClasses({ ...expandedClasses, [classId]: true });
      fetchStudentsForClass(classId);
    }
  };

  const handleRemoveClass = (classId) => {
    setSelectedClasses(selectedClasses.filter((id) => id !== classId));
    setExpandedClasses({ ...expandedClasses, [classId]: false });

    // Clean up students data
    const newClassStudents = { ...classStudents };
    delete newClassStudents[classId];
    setClassStudents(newClassStudents);

    const newSelectedStudents = { ...selectedStudentsByClass };
    delete newSelectedStudents[classId];
    setSelectedStudentsByClass(newSelectedStudents);
  };

  const handleSelectAllStudents = (classId) => {
    const students = classStudents[classId] || [];
    const currentSelected = selectedStudentsByClass[classId] || [];

    if (currentSelected.length === students.length) {
      setSelectedStudentsByClass({
        ...selectedStudentsByClass,
        [classId]: [],
      });
    } else {
      setSelectedStudentsByClass({
        ...selectedStudentsByClass,
        [classId]: students.map((s) => s.id),
      });
    }
  };

  const handleStudentToggle = (classId, studentId) => {
    const currentSelected = selectedStudentsByClass[classId] || [];

    if (currentSelected.includes(studentId)) {
      setSelectedStudentsByClass({
        ...selectedStudentsByClass,
        [classId]: currentSelected.filter((id) => id !== studentId),
      });
    } else {
      setSelectedStudentsByClass({
        ...selectedStudentsByClass,
        [classId]: [...currentSelected, studentId],
      });
    }
  };

  const toggleClassExpansion = (classId) => {
    setExpandedClasses({
      ...expandedClasses,
      [classId]: !expandedClasses[classId],
    });
  };

  const createAssignmentsForClass = async (classId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return { success: false, error: "Not logged in" };

    const classItem = allClasses.find((c) => c.id === classId);
    const students = classStudents[classId] || [];
    const selectedStudents = selectedStudentsByClass[classId] || [];

    if (selectedStudents.length === 0) {
      return { success: false, error: "No students selected" };
    }

    const isSynchronous = assignmentSettings.mode === "synchronous";
    const teacherName =
      currentUser.displayName || currentUser.email?.split("@")[0] || "Teacher";
    const finalDueDate = isSynchronous
      ? assignmentSettings.deadline
      : assignmentSettings.dueDate;
    const initialStatus = isSynchronous ? "not_started" : "pending";
    const codeToUse = isSynchronous ? generatedQuizCode : null;

    const baseAssignment = {
      quizId: quizId,
      quizTitle: quiz.title || "Untitled Quiz",
      quizCode: codeToUse,
      classId: classId,
      className: classItem.name,
      subject: classItem.subject || "",
      startDate: !isSynchronous ? assignmentSettings.startDate : null,
      dueDate: finalDueDate,
      quizMode: assignmentSettings.mode,
      instructions: assignmentSettings.instructions || "",
      assignedAt: serverTimestamp(),
      assignedBy: currentUser.uid,
      teacherName: teacherName,
      teacherEmail: currentUser.email,
      sessionStatus: isSynchronous ? "not_started" : null,
      sessionStartedAt: null,
      sessionEndedAt: null,
      settings: {
        mode: assignmentSettings.mode,
        timeLimit: assignmentSettings.timeLimit ?? null,
        deadline: assignmentSettings.deadline ?? null,
        shuffleQuestions: !!assignmentSettings.shuffleQuestions,
        shuffleChoices: !!assignmentSettings.shuffleChoices,
        showResults: !!assignmentSettings.showResults,
        allowReview: !!assignmentSettings.allowReview,
        showCorrectAnswers: !!assignmentSettings.showCorrectAnswers,
        passingScore: Number(assignmentSettings.passingScore) || 60,
        maxAttempts: Number(assignmentSettings.maxAttempts) || 1,
      },
    };

    const assignmentPromises = selectedStudents.map((studentDocId) => {
      const student = students.find((s) => s.id === studentDocId);

      if (!student || !student.authUID) {
        return null;
      }

      const studentAssignment = {
        ...baseAssignment,
        studentId: student.authUID,
        studentDocId: studentDocId,
        studentName: student.name,
        studentNo: student.studentNo,
        status: initialStatus,
        completed: false,
        score: null,
        attempts: 0,
        startedAt: null,
        submittedAt: null,
      };

      return addDoc(collection(db, "assignedQuizzes"), studentAssignment);
    });

    const validPromises = assignmentPromises.filter((p) => p !== null);

    if (validPromises.length === 0) {
      return { success: false, error: "No valid students" };
    }

    try {
      await Promise.all(validPromises);
      return { success: true, count: validPromises.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Core assignment logic after all confirmations pass
  const executeAssignment = async (classesWithExisting = []) => {
    // Delete existing assignments if needed
    for (const classId of classesWithExisting) {
      const existing = existingAssignments[classId];
      if (existing?.assignmentDocs) {
        const deletePromises = existing.assignmentDocs.map((doc) =>
          deleteDoc(doc.ref)
        );
        await Promise.all(deletePromises);
      }
    }
    if (isAssigningRef.current) return;
    isAssigningRef.current = true;
    setAssigning(true);

    try {
      const results = [];

      for (const classId of selectedClasses) {
        const result = await createAssignmentsForClass(classId);
        const classItem = allClasses.find((c) => c.id === classId);
        results.push({
          className: classItem?.classNo ? `Class ${classItem.classNo}` : (classItem?.name || "Unknown"),
          ...result,
        });
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (successCount > 0) {
        const totalStudents = results
          .filter((r) => r.success)
          .reduce((sum, r) => sum + r.count, 0);
        showToast("success", "Quiz Assigned!", `Successfully assigned to ${successCount} class(es), ${totalStudents} student(s) total.`);
      }
      if (failCount > 0) {
        showToast("error", "Partial Failure", `Failed for ${failCount} class(es).`);
      }

      setTimeout(() => navigate("/teacher/quizzes"), 1500);
    } catch (error) {
      console.error("Error assigning quiz:", error);
      showToast("error", "Assignment Failed", "Error assigning quiz. Please try again.");
    } finally {
      isAssigningRef.current = false;
      setAssigning(false);
    }
  };

  const handleAssignQuiz = async () => {
    if (selectedClasses.length === 0) {
      showToast("warning", "No Class Selected", "Please select at least one class.");
      return;
    }

    const isSynchronous = assignmentSettings.mode === "synchronous";

    if (!isSynchronous) {
      if (!assignmentSettings.startDate || !assignmentSettings.dueDate) {
        showToast("warning", "Dates Required", "Please set both start and due dates for this assignment.");
        return;
      }
      if (new Date(assignmentSettings.startDate) >= new Date(assignmentSettings.dueDate)) {
        showToast("warning", "Invalid Dates", "Start date must be before the due date.");
        return;
      }
    }

    if (isSynchronous && !assignmentSettings.deadline) {
      showToast("warning", "Deadline Required", "Please set an expiration deadline for synchronous mode.");
      return;
    }

    if (isSynchronous && !generatedQuizCode) {
      showToast("warning", "Quiz Code Required", "Please generate a quiz code for synchronous mode.");
      return;
    }

    // Check if any selected class has no students selected
    for (const classId of selectedClasses) {
      const selected = selectedStudentsByClass[classId] || [];
      if (selected.length === 0) {
        const classItem = allClasses.find((c) => c.id === classId);
        showToast("warning", "No Students Selected", `Please select at least one student in ${classItem?.classNo ? `Class ${classItem.classNo}` : (classItem?.name || "the class")}.`);
        return;
      }
    }

    // Check for existing assignments
    const classesWithExisting = selectedClasses.filter(
      (classId) => existingAssignments[classId]?.exists
    );

    // Check for students without accounts
    let totalSkipped = 0;
    let totalValid = 0;
    const skippedDetails = [];

    selectedClasses.forEach(classId => {
      const students = classStudents[classId] || [];
      const selected = selectedStudentsByClass[classId] || [];
      const classItem = allClasses.find(c => c.id === classId);

      let classSkipped = 0;
      selected.forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        if (student && !student.authUID) {
          classSkipped++;
          totalSkipped++;
        } else {
          totalValid++;
        }
      });

      if (classSkipped > 0) {
        const dName = classItem.classNo ? `Class ${classItem.classNo}` : classItem.name;
        skippedDetails.push(`${dName}: ${classSkipped} student(s)`);
      }
    });

    // If existing assignments found, show confirm dialog first
    if (classesWithExisting.length > 0) {
      const classNames = classesWithExisting
        .map((id) => {
          const c = allClasses.find((c) => c.id === id);
          return c?.classNo ? `Class ${c.classNo}` : c?.name;
        })
        .join(", ");

      setConfirmDialog({
        isOpen: true,
        title: "Replace Existing Assignments?",
        message: `The following classes already have this quiz assigned: ${classNames}. Do you want to REPLACE the existing assignments?`,
        confirmLabel: "Replace",
        color: "orange",
        onConfirm: () => {
          setConfirmDialog({ isOpen: false });
          // After confirming replacement, check for skipped students
          if (totalSkipped > 0) {
            setConfirmDialog({
              isOpen: true,
              title: "Students Without Accounts",
              message: `${totalSkipped} student(s) do not have registered accounts and will be skipped (${skippedDetails.join(", ")}). Only ${totalValid} student(s) will receive the assignment. Continue anyway?`,
              confirmLabel: "Continue",
              color: "orange",
              onConfirm: () => {
                setConfirmDialog({ isOpen: false });
                executeAssignment(classesWithExisting);
              },
              onCancel: () => setConfirmDialog({ isOpen: false }),
            });
          } else {
            executeAssignment(classesWithExisting);
          }
        },
        onCancel: () => setConfirmDialog({ isOpen: false }),
      });
      return;
    }

    // No existing assignments but has skipped students
    if (totalSkipped > 0) {
      setConfirmDialog({
        isOpen: true,
        title: "Students Without Accounts",
        message: `${totalSkipped} student(s) do not have registered accounts and will be skipped (${skippedDetails.join(", ")}). Only ${totalValid} student(s) will receive the assignment. Continue anyway?`,
        confirmLabel: "Continue",
        color: "orange",
        onConfirm: () => {
          setConfirmDialog({ isOpen: false });
          executeAssignment();
        },
        onCancel: () => setConfirmDialog({ isOpen: false }),
      });
      return;
    }

    // No issues, proceed directly
    executeAssignment();
  };

  const getTotalSelectedStudents = () => {
    return Object.values(selectedStudentsByClass).reduce(
      (sum, students) => sum + students.length,
      0
    );
  };

  const isSynchronous = assignmentSettings.mode === "synchronous";

  if (loading) {
    return (
      <div className="w-full font-Poppins animate-fadeIn">
        {/* Back button & stepper skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-5 w-36 bg-gray-200 rounded-lg animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-7 w-28 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-7 w-32 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Header banner skeleton */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-xl mb-6 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg" />
            <div>
              <div className="h-6 w-72 bg-white/20 rounded-lg mb-2" />
              <div className="h-4 w-48 bg-white/20 rounded-lg mb-2" />
              <div className="h-3 w-40 bg-white/20 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Settings panel skeleton */}
          <div className="lg:col-span-1 space-y-6">
            <div className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50 animate-pulse">
              <div className="h-5 w-32 bg-gray-200 rounded-lg mb-4" />
              <div className="space-y-4">
                <div><div className="h-4 w-24 bg-gray-200 rounded mb-2" /><div className="h-10 w-full bg-gray-200 rounded-lg" /></div>
                <div><div className="h-4 w-32 bg-gray-200 rounded mb-2" /><div className="h-10 w-full bg-gray-200 rounded-lg" /></div>
                <div><div className="h-4 w-28 bg-gray-200 rounded mb-2" /><div className="h-10 w-full bg-gray-200 rounded-lg" /></div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-5 w-full bg-gray-200 rounded" />
                  <div className="h-5 w-full bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Class list skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <div className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50 animate-pulse">
              <div className="h-5 w-40 bg-gray-200 rounded-lg mb-4" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                      <div>
                        <div className="h-4 w-32 bg-gray-200 rounded mb-1.5" />
                        <div className="h-3 w-20 bg-gray-100 rounded" />
                      </div>
                    </div>
                    <div className="h-8 w-20 bg-gray-200 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>

            {/* Assign button skeleton */}
            <div className="h-12 w-full bg-gray-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return null;
  }

  return (
    <div className="w-full font-Poppins">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-subtext hover:text-subsubtext"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Quizzes
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 rounded-full bg-blue-500 text-white">
            Select Classes
          </span>
          <span className="text-gray-400">→</span>
          <span className="px-3 py-1 rounded-full bg-blue-400 text-white">
            Configure & Assign
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-xl mb-6">
        <div className="flex items-center gap-3">
          <School className="w-8 h-8" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Assign Quiz to Multiple Classes</h2>
            <p className="text-white text-sm mt-1">{quiz.title}</p>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-white text-xs">
                Code: {quiz.code} • {quiz.questions?.length || 0} questions
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-blue-600" />
              Quiz Settings
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Quiz Mode *
                </label>
                <select
                  value={assignmentSettings.mode}
                  onChange={(e) => {
                    setAssignmentSettings({
                      ...assignmentSettings,
                      mode: e.target.value,
                    });
                    setGeneratedQuizCode(null);
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="asynchronous">
                    Asynchronous (Self-Paced)
                  </option>
                  <option value="synchronous">
                    Synchronous (Live/Controlled)
                  </option>
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  {isSynchronous
                    ? "You control when students can access the quiz"
                    : "Students can take quiz anytime before due date"}
                </p>
              </div>

              {isSynchronous && (
                <div className="p-4 bg-purple-100 border border-purple-300 rounded-lg">
                  <label className="block text-sm font-semibold mb-3 text-purple-900">
                    Generate Unique Quiz Code
                  </label>
                  <div className="flex gap-2">
                    {generatedQuizCode ? (
                      <div className="flex-1 px-4 py-2 bg-white border-2 border-purple-500 rounded-lg font-bold text-lg text-purple-700 text-center">
                        {generatedQuizCode}
                      </div>
                    ) : (
                      <div className="flex-1 px-4 py-2 bg-white border-2 border-dashed border-purple-300 rounded-lg text-gray-500 text-center">
                        Code will appear here
                      </div>
                    )}
                    <button
                      onClick={generateQuizCode}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
                    >
                      {generatedQuizCode ? "Regenerate" : "Generate"}
                    </button>
                  </div>
                  <p className="text-xs text-purple-800 mt-2">
                    Same code will be used for all selected classes
                  </p>
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <Timer className="w-4 h-4 text-blue-600" />
                  Time Limit (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={assignmentSettings.timeLimit || ""}
                  onChange={(e) =>
                    setAssignmentSettings({
                      ...assignmentSettings,
                      timeLimit: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  placeholder="No Time Limit"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-600 mt-1">
                  {assignmentSettings.timeLimit === null ||
                    assignmentSettings.timeLimit === 0
                    ? "No time limit"
                    : `${assignmentSettings.timeLimit} minute${assignmentSettings.timeLimit > 1 ? "s" : ""
                    } limit`}
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Shuffle className="w-4 h-4 text-blue-600" />
                  Shuffle Options
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignmentSettings.shuffleQuestions}
                    onChange={(e) =>
                      setAssignmentSettings({
                        ...assignmentSettings,
                        shuffleQuestions: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Shuffle Questions</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignmentSettings.shuffleChoices}
                    onChange={(e) =>
                      setAssignmentSettings({
                        ...assignmentSettings,
                        shuffleChoices: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Shuffle Answer Choices</span>
                </label>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Eye className="w-4 h-4 text-blue-600" />
                  After Submission
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignmentSettings.showResults}
                    onChange={(e) =>
                      setAssignmentSettings({
                        ...assignmentSettings,
                        showResults: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Show Results Immediately</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignmentSettings.showCorrectAnswers}
                    onChange={(e) =>
                      setAssignmentSettings({
                        ...assignmentSettings,
                        showCorrectAnswers: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Show Correct Answers</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignmentSettings.allowReview}
                    onChange={(e) =>
                      setAssignmentSettings({
                        ...assignmentSettings,
                        allowReview: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Allow Review of Answers</span>
                </label>
              </div>

              <div className="space-y-3 pt-3 border-t">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Trophy className="w-4 h-4 text-blue-600" />
                  Scoring & Attempts
                </label>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={assignmentSettings.passingScore}
                    onChange={(e) =>
                      setAssignmentSettings({
                        ...assignmentSettings,
                        passingScore: parseInt(e.target.value) || 60,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Maximum Attempts
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={assignmentSettings.maxAttempts}
                    onChange={(e) =>
                      setAssignmentSettings({
                        ...assignmentSettings,
                        maxAttempts: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-2 border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Assignment Details
            </h3>

            <div className="space-y-4">

              {!isSynchronous ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Start Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={assignmentSettings.startDate}
                      onChange={(e) =>
                        setAssignmentSettings({
                          ...assignmentSettings,
                          startDate: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Students can start taking this quiz from this date and time
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Due Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={assignmentSettings.dueDate}
                      onChange={(e) =>
                        setAssignmentSettings({
                          ...assignmentSettings,
                          dueDate: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min={assignmentSettings.startDate || new Date().toISOString().slice(0, 16)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Students must complete this quiz before this date and time
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Expiration Deadline *
                  </label>
                  <input
                    type="datetime-local"
                    value={assignmentSettings.deadline || ""}
                    onChange={(e) =>
                      setAssignmentSettings({
                        ...assignmentSettings,
                        deadline: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Assignment expires if not started before this time
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Instructions (Optional)
                </label>
                <textarea
                  value={assignmentSettings.instructions}
                  onChange={(e) =>
                    setAssignmentSettings({
                      ...assignmentSettings,
                      instructions: e.target.value,
                    })
                  }
                  placeholder="Add instructions for all classes..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                />
              </div>
            </div>
          </div>

          <div
            className={`border-2 rounded-xl p-6 ${isSynchronous
              ? "border-purple-200 bg-purple-50"
              : "border-blue-200 bg-blue-50"
              }`}
          >
            <h3
              className={`text-lg font-bold mb-2 ${isSynchronous ? "text-purple-800" : "text-blue-800"
                }`}
            >
              Summary
            </h3>
            <p className="text-sm text-gray-600">
              {selectedClasses.length} class(es) selected
            </p>
            <p className="text-sm text-gray-600">
              {getTotalSelectedStudents()} total student(s) selected
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="border-2 border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">Select Classes</h3>

            <div className="mb-4">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value === "SELECT_ALL") {
                    const unselectedClassIds = allClasses
                      .filter((c) => !selectedClasses.includes(c.id))
                      .map((c) => c.id);
                    if (unselectedClassIds.length > 0) {
                      setSelectedClasses([...selectedClasses, ...unselectedClassIds]);
                      const newExpanded = { ...expandedClasses };
                      unselectedClassIds.forEach(id => {
                        newExpanded[id] = true;
                        fetchStudentsForClass(id);
                      });
                      setExpandedClasses(newExpanded);
                    }
                  } else if (e.target.value) {
                    handleAddClass(e.target.value);
                  }
                }}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">+ Add a class...</option>
                {allClasses.filter((c) => !selectedClasses.includes(c.id)).length > 0 && (
                  <option value="SELECT_ALL" className="font-bold text-blue-600">
                    + Select All Classes
                  </option>
                )}
                {allClasses
                  .filter((c) => !selectedClasses.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.classNo ? `Class ${c.classNo}` : c.name} {c.subject ? `- ${c.subject}` : ""}
                      {existingAssignments[c.id]?.exists ? " (Already Assigned)" : ""}
                    </option>
                  ))}
              </select>
            </div>

            {selectedClasses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <School className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No classes selected yet</p>
                <p className="text-sm">Use the dropdown above to add classes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedClasses.map((classId) => {
                  const classItem = allClasses.find((c) => c.id === classId);
                  const students = classStudents[classId] || [];
                  const selectedStudents = selectedStudentsByClass[classId] || [];
                  const isExpanded = expandedClasses[classId];
                  const hasExisting = existingAssignments[classId]?.exists;

                  return (
                    <div
                      key={classId}
                      className="border-2 border-gray-200 rounded-xl overflow-hidden"
                    >
                      <div className="bg-gray-50 p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-lg">
                              {classItem?.classNo ? `Class ${classItem.classNo}` : (classItem?.name || "Unknown Class")}
                            </h4>
                            {hasExisting && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                Already Assigned
                              </span>
                            )}
                          </div>
                          {classItem?.subject && (
                            <p className="text-sm text-gray-600">
                              Subject: {classItem.subject}
                            </p>
                          )}
                          <p className="text-sm text-blue-600 font-semibold">
                            {selectedStudents.length} of {students.length}{" "}
                            student(s) selected
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleClassExpansion(classId)}
                            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-100 rounded"
                          >
                            {isExpanded ? "Hide Students" : "Show Students"}
                          </button>
                          <button
                            onClick={() => handleRemoveClass(classId)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 bg-white">
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-semibold">Students</h5>
                            <button
                              onClick={() => handleSelectAllStudents(classId)}
                              className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                            >
                              {selectedStudents.length === students.length
                                ? "Deselect All"
                                : "Select All"}
                            </button>
                          </div>

                          {students.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">
                              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm">No students in this class</p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {students.map((student) => (
                                <label
                                  key={student.id}
                                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${selectedStudents.includes(student.id)
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-blue-300"
                                    }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedStudents.includes(
                                      student.id
                                    )}
                                    onChange={() =>
                                      handleStudentToggle(classId, student.id)
                                    }
                                    className="w-5 h-5 text-blue-600"
                                  />
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-800">
                                      {student.name}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      Student #: {student.studentNo}
                                    </div>
                                    {student.program && (
                                      <div className="text-xs text-gray-500">
                                        {student.program}{" "}
                                        {student.year &&
                                          `- Year ${student.year}`}
                                      </div>
                                    )}
                                  </div>
                                  {selectedStudents.includes(student.id) && (
                                    <CheckCircle className="w-5 h-5 text-blue-600" />
                                  )}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={handleBack}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={handleAssignQuiz}
          disabled={
            assigning ||
            selectedClasses.length === 0 ||
            getTotalSelectedStudents() === 0 ||
            (!isSynchronous && (!assignmentSettings.startDate || !assignmentSettings.dueDate)) ||
            (isSynchronous && !assignmentSettings.deadline) ||
            (isSynchronous && !generatedQuizCode)
          }
          className={`px-6 py-3 font-semibold rounded-lg flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed ${isSynchronous
            ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            : "bg-purple-600 hover:bg-purple-700 text-white"
            }`}
        >
          {assigning ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Assigning...
            </>
          ) : (
            <>
              {isSynchronous ? (
                <Zap className="w-5 h-5" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              Assign to {selectedClasses.length} Class(es), {getTotalSelectedStudents()} Student(s)
            </>
          )}
        </button>
      </div>

      {/* Custom Dialog & Toast */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        color={confirmDialog.color}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel || (() => setConfirmDialog({ isOpen: false }))}
      />
      <Toast {...toast} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
    </div>
  );
}