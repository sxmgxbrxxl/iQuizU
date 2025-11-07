import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  GraduationCap,
  Timer,
  Zap,
  Settings as SettingsIcon,
  Shuffle,
  Trophy,
  Eye,
  AlertCircle,
} from "lucide-react";

export default function AssignQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [quiz, setQuiz] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [existingAssignment, setExistingAssignment] = useState(null);
  const [generatedQuizCode, setGeneratedQuizCode] = useState(null);

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

      const classesRef = collection(db, "classes");
      const q = query(classesRef, where("teacherId", "==", currentUser.uid));
      const classesSnap = await getDocs(q);

      const classesList = [];
      classesSnap.forEach((doc) => {
        classesList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setClasses(classesList);

      // NEW: Check if classId is in URL and auto-select that class
      const classIdFromUrl = searchParams.get("classId");
      if (classIdFromUrl) {
        const targetClass = classesList.find(c => c.id === classIdFromUrl);
        if (targetClass) {
          // Auto-select this class
          await handleClassSelect(targetClass);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Error loading data");
    } finally {
      setLoading(false);
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

  const handleClassSelect = async (classItem) => {
    setSelectedClass(classItem);
    setLoading(true);
    setGeneratedQuizCode(null);

    try {
      const existingCheck = await checkExistingAssignment(classItem.id);

      if (existingCheck.exists) {
        setExistingAssignment(existingCheck);
        
        // Load existing settings
        setAssignmentSettings((prev) => ({
          ...prev,
          mode: existingCheck.mode,
          dueDate: existingCheck.dueDate || "",
          instructions: existingCheck.instructions || "",
          timeLimit: existingCheck.settings.timeLimit || null,
          deadline: existingCheck.settings.deadline || null,
          shuffleQuestions: existingCheck.settings.shuffleQuestions || false,
          shuffleChoices: existingCheck.settings.shuffleChoices || false,
          showResults: existingCheck.settings.showResults !== false,
          allowReview: existingCheck.settings.allowReview !== false,
          showCorrectAnswers: existingCheck.settings.showCorrectAnswers !== false,
          passingScore: existingCheck.settings.passingScore || 60,
          maxAttempts: existingCheck.settings.maxAttempts || 1,
        }));
      } else {
        setExistingAssignment(null);
      }

      const studentsRef = collection(db, "users");
      const q = query(
        studentsRef,
        where("role", "==", "student"),
        where("classIds", "array-contains", classItem.id)
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
      setStudents(studentsList);
      setSelectedStudents(studentsList.map((s) => s.id));
    } catch (error) {
      console.error("Error fetching students:", error);
      alert("Error loading students");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (selectedClass) {
      setSelectedClass(null);
      setStudents([]);
      setSelectedStudents([]);
      setExistingAssignment(null);
      setGeneratedQuizCode(null);
    } else {
      navigate("/teacher/quizzes");
    }
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.id));
    }
  };

  const handleStudentToggle = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleReassignQuiz = async () => {
    if (!existingAssignment || !existingAssignment.exists) return;

    const oldMode = existingAssignment.mode;
    const newMode = assignmentSettings.mode;
    const modeChanged = oldMode !== newMode;

    let confirmMessage = `This quiz is already assigned to this class.\n\n`;
    
    if (modeChanged) {
      confirmMessage += `⚠️ MODE CHANGE DETECTED:\n`;
      confirmMessage += `From: ${oldMode === "synchronous" ? "SYNCHRONOUS (Live)" : "ASYNCHRONOUS (Self-Paced)"}\n`;
      confirmMessage += `To: ${newMode === "synchronous" ? "SYNCHRONOUS (Live)" : "ASYNCHRONOUS (Self-Paced)"}\n\n`;
    }
    
    confirmMessage += `Do you want to REPLACE the existing assignment with the new settings?`;

    if (!window.confirm(confirmMessage)) return;

    setAssigning(true);

    try {
      const deletePromises = existingAssignment.assignmentDocs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      await createNewAssignments();
    } catch (error) {
      console.error("Error reassigning quiz:", error);
      alert("Error reassigning quiz. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const createNewAssignments = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("Please log in first!");
      return;
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
      classId: selectedClass.id,
      className: selectedClass.name,
      subject: selectedClass.subject || "",
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
      const student = students.find(s => s.id === studentDocId);
      
      if (!student) {
        console.error(`⚠️ Student not found: ${studentDocId}`);
        return null;
      }

      if (!student.authUID) {
        console.error(`⚠️ No authUID for student: ${student.name} (${studentDocId})`);
        console.log(`   Please create an account for this student first!`);
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

    const validPromises = assignmentPromises.filter(p => p !== null);
    
    if (validPromises.length === 0) {
      alert("❌ No students with accounts selected! Please create accounts first.");
      return;
    }

    if (validPromises.length < selectedStudents.length) {
      const studentsWithoutAccounts = selectedStudents.length - validPromises.length;
      if (!window.confirm(`⚠️ ${studentsWithoutAccounts} student(s) don't have accounts yet and will be skipped.\n\nContinue assigning to ${validPromises.length} student(s)?`)) {
        return;
      }
    }

    await Promise.all(validPromises);

    alert(
      `Quiz ${existingAssignment?.exists ? 'reassigned' : 'assigned'} to ${validPromises.length} student(s) in ${selectedClass.name} successfully!`
    );

    if (isSynchronous) {
      navigate(`/teacher/quiz-control/${quizId}/${selectedClass.id}`);
    } else {
      navigate("/teacher/quizzes");
    }
  };

  const handleAssignQuiz = async () => {
    if (selectedStudents.length === 0) {
      alert("Please select at least one student");
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

    if (existingAssignment?.exists) {
      await handleReassignQuiz();
      return;
    }

    setAssigning(true);

    try {
      await createNewAssignments();
    } catch (error) {
      console.error("Error assigning quiz:", error);
      alert("Error assigning quiz. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const isSynchronous = assignmentSettings.mode === "synchronous";

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-md">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return null;
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-md max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          {!selectedClass ? "Back to Manage Quizzes" : "Back to Classes"}
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span
            className={`px-3 py-1 rounded-full ${
              !selectedClass ? "bg-purple-600 text-white" : "bg-green-500 text-white"
            }`}
          >
            {!selectedClass ? "1" : "✓"} Select Class
          </span>
          <span className="text-gray-400">→</span>
          <span
            className={`px-3 py-1 rounded-full ${
              selectedClass
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            2. Configure & Assign
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-xl mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">Assign Quiz to Students</h2>
            <p className="text-purple-100 text-sm mt-1">{quiz.title}</p>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-purple-200 text-xs">
                Code: {quiz.code} • {quiz.questions?.length || 0} questions
              </p>
            </div>
          </div>
        </div>
      </div>

      {!selectedClass && (
        <div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            Select a Class
          </h3>

          {classes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No classes found</p>
              <p className="text-sm mt-2">
                Please upload a classlist first in Manage Classes.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {classes.map((classItem) => (
                <button
                  key={classItem.id}
                  onClick={() => handleClassSelect(classItem)}
                  className="p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-purple-100 transition">
                      <GraduationCap className="w-6 h-6 text-blue-600 group-hover:text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-800">
                        {classItem.name}
                      </h4>
                      {classItem.subject && (
                        <p className="text-sm text-gray-600 mt-1">
                          Subject: {classItem.subject}
                        </p>
                      )}
                      <p className="text-sm text-blue-600 mt-2 font-semibold">
                        {classItem.studentCount || 0} students enrolled
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Teacher: {classItem.teacherName}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedClass && (
        <div>
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
            <p className="text-sm text-gray-600">Selected Class:</p>
            <p className="font-bold text-purple-800 text-lg">
              {selectedClass.name}
            </p>
            {selectedClass.subject && (
              <p className="text-sm text-gray-600">
                Subject: {selectedClass.subject}
              </p>
            )}
          </div>

          {existingAssignment?.exists && (
            <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-yellow-900 mb-2">
                    Quiz Already Assigned
                  </h4>
                  <p className="text-sm text-yellow-800 mb-2">
                    This quiz is already assigned to this class in{" "}
                    <span className="font-bold">
                      {existingAssignment.mode === "synchronous" ? "SYNCHRONOUS (Live)" : "ASYNCHRONOUS (Self-Paced)"}
                    </span>{" "}
                    mode.
                  </p>
                  <p className="text-sm text-yellow-800">
                    You can modify the settings below (including the mode) and click "Reassign Quiz" to replace the existing assignment.
                  </p>
                </div>
              </div>
            </div>
          )}

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
                    {existingAssignment?.exists && existingAssignment.mode !== assignmentSettings.mode && (
                      <p className="text-xs text-orange-700 font-semibold mt-2 bg-orange-100 p-2 rounded">
                        ⚠️ Mode will change from {existingAssignment.mode === "synchronous" ? "LIVE" : "SELF-PACED"} to {assignmentSettings.mode === "synchronous" ? "LIVE" : "SELF-PACED"}
                      </p>
                    )}
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
                        Share this code with students to access the live quiz session
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
                    min="1"
                    value={assignmentSettings.timeLimit || ""}
                    onChange={(e) =>
                      setAssignmentSettings({
                        ...assignmentSettings,
                        timeLimit: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    placeholder={isSynchronous ? "No limit" : "No limit (fixed for async)"}
                    disabled={!isSynchronous}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !isSynchronous ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""
                    }`}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {isSynchronous 
                      ? "Leave empty for no time limit" 
                      : "Time limit is disabled for self-paced quizzes"}
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
                        Due Date *
                      </label>
                      <input
                        type="date"
                        value={assignmentSettings.dueDate}
                        onChange={(e) =>
                          setAssignmentSettings({
                            ...assignmentSettings,
                            dueDate: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={new Date().toISOString().split("T")[0]}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Students can take this quiz anytime before 11:59 PM on
                        this date
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
                      placeholder="Add any special instructions for this class..."
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="4"
                    />
                  </div>
                </div>
              </div>

              <div
                className={`border-2 rounded-xl p-6 ${
                  isSynchronous
                    ? "border-purple-200 bg-purple-50"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <h3
                  className={`text-lg font-bold mb-2 ${
                    isSynchronous ? "text-purple-800" : "text-blue-800"
                  }`}
                >
                  Selected: {selectedStudents.length} student
                  {selectedStudents.length !== 1 ? "s" : ""}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedStudents.length === 0
                    ? "No students selected"
                    : `Quiz will be ${existingAssignment?.exists ? 'reassigned' : 'assigned'} to ${selectedStudents.length} out of ${students.length} student${students.length !== 1 ? "s" : ""}`}
                </p>
                {isSynchronous && (
                  <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-xs text-yellow-900 font-semibold">
                      After assignment, you'll be redirected to Quiz Control
                      Dashboard
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Select Students</h3>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                  {selectedStudents.length === students.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              {students.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No students found in this class</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {students.map((student) => (
                    <label
                      key={student.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                        selectedStudents.includes(student.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleStudentToggle(student.id)}
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
                            {student.year && `- Year ${student.year}`}
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
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              onClick={handleBack}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100"
            >
              Back
            </button>
            <button
              onClick={handleAssignQuiz}
              disabled={
                assigning ||
                selectedStudents.length === 0 ||
                (!isSynchronous && !assignmentSettings.dueDate) ||
                (isSynchronous && !assignmentSettings.deadline) ||
                (isSynchronous && !generatedQuizCode)
              }
              className={`px-6 py-3 font-semibold rounded-lg flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed ${
                isSynchronous
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              }`}
            >
              {assigning ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {existingAssignment?.exists ? "Reassigning..." : "Assigning..."}
                </>
              ) : (
                <>
                  {isSynchronous ? (
                    <Zap className="w-5 h-5" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  {existingAssignment?.exists ? (
                    `Reassign Quiz to ${selectedStudents.length} Student${
                      selectedStudents.length !== 1 ? "s" : ""
                    }`
                  ) : isSynchronous ? (
                    `Assign & Go to Control Dashboard`
                  ) : (
                    `Assign Quiz to ${selectedStudents.length} Student${
                      selectedStudents.length !== 1 ? "s" : ""
                    }`
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}