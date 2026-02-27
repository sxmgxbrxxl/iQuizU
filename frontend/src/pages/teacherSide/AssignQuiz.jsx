import { useState, useEffect } from "react";
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

  const [assignmentSettings, setAssignmentSettings] = useState({
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
        alert("Please login first");
        navigate("/login");
        return;
      }

      // Fetch Quiz
      const quizRef = doc(db, "quizzes", quizId);
      const quizSnap = await getDoc(quizRef);

      if (!quizSnap.exists()) {
        alert("Quiz not found!");
        navigate("/teacher/quizzes");
        return;
      }

      const quizData = { id: quizSnap.id, ...quizSnap.data() };

      if (quizData.teacherId !== currentUser.uid) {
        alert("You don't have permission to assign this quiz!");
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

      classesList.sort((a, b) => a.name.localeCompare(b.name));
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
      alert("Error loading data");
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
          authUID: data.authUID || null,
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

  const handleAssignQuiz = async () => {
    if (selectedClasses.length === 0) {
      alert("Please select at least one class");
      return;
    }

    const isSynchronous = assignmentSettings.mode === "synchronous";

    if (!isSynchronous && !assignmentSettings.dueDate) {
      alert("Please set a due date for this assignment");
      return;
    }

    if (isSynchronous && !assignmentSettings.deadline) {
      alert("Please set an expiration deadline for synchronous mode");
      return;
    }

    if (isSynchronous && !generatedQuizCode) {
      alert("Please generate a quiz code for synchronous mode");
      return;
    }

    // Check if any selected class has no students selected
    for (const classId of selectedClasses) {
      const selected = selectedStudentsByClass[classId] || [];
      if (selected.length === 0) {
        const classItem = allClasses.find((c) => c.id === classId);
        alert(`Please select at least one student in ${classItem?.name || "the class"}`);
        return;
      }
    }

    // Check for existing assignments
    const classesWithExisting = selectedClasses.filter(
      (classId) => existingAssignments[classId]?.exists
    );

    if (classesWithExisting.length > 0) {
      const classNames = classesWithExisting
        .map((id) => allClasses.find((c) => c.id === id)?.name)
        .join(", ");

      if (!window.confirm(
        `The following classes already have this quiz assigned:\n${classNames}\n\nDo you want to REPLACE the existing assignments?`
      )) {
        return;
      }

      // Delete existing assignments
      for (const classId of classesWithExisting) {
        const existing = existingAssignments[classId];
        if (existing?.assignmentDocs) {
          const deletePromises = existing.assignmentDocs.map((doc) =>
            deleteDoc(doc.ref)
          );
          await Promise.all(deletePromises);
        }
      }
    }

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
        skippedDetails.push(`${classItem.name}: ${classSkipped} student(s)`);
      }
    });

    if (totalSkipped > 0) {
      const message = `⚠️ WARNING: ${totalSkipped} student(s) do not have registered accounts yet and WILL BE SKIPPED.\n\n` +
        `Details:\n${skippedDetails.join('\n')}\n\n` +
        `Only ${totalValid} student(s) will receive the assignment.\n\n` +
        `Continue anyway?`;

      if (!window.confirm(message)) {
        return;
      }
    }

    setAssigning(true);

    try {
      const results = [];

      for (const classId of selectedClasses) {
        const result = await createAssignmentsForClass(classId);
        const classItem = allClasses.find((c) => c.id === classId);
        results.push({
          className: classItem?.name || "Unknown",
          ...result,
        });
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      let message = "";
      if (successCount > 0) {
        const totalStudents = results
          .filter((r) => r.success)
          .reduce((sum, r) => sum + r.count, 0);
        message += `✓ Successfully assigned to ${successCount} class(es), ${totalStudents} student(s) total\n`;
      }
      if (failCount > 0) {
        message += `\n✗ Failed for ${failCount} class(es)`;
      }

      alert(message);
      navigate("/teacher/quizzes");
    } catch (error) {
      console.error("Error assigning quiz:", error);
      alert("Error assigning quiz. Please try again.");
    } finally {
      setAssigning(false);
    }
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
      <div className="p-8 items-center justify-center">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600"></Loader2>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return null;
  }

  return (
    <div className="p-8 font-Outfit">
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
            <h2 className="text-2xl font-bold">Assign Quiz to Multiple Classes</h2>
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
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Students can take this quiz anytime before this date and time
                  </p>
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
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddClass(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">+ Add a class...</option>
                {allClasses
                  .filter((c) => !selectedClasses.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.subject ? `- ${c.subject}` : ""}
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
                              {classItem?.name || "Unknown Class"}
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
            (!isSynchronous && !assignmentSettings.dueDate) ||
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
    </div>
  );
}