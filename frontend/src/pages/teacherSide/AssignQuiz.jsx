import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from "firebase/firestore";
import { db, auth } from "../../firebase/firebaseConfig";
import { ArrowLeft, Users, Send, CheckCircle, Calendar, GraduationCap, Clock, AlertCircle, Zap } from "lucide-react";

export default function AssignQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  
  const [assignmentSettings, setAssignmentSettings] = useState({
    dueDate: "",
    instructions: ""
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
        alert("❌ You don't have permission to assign this quiz!");
        navigate("/teacher/quizzes");
        return;
      }

      setQuiz(quizData);

      const classesRef = collection(db, "classes");
      const q = query(classesRef, where("teacherId", "==", currentUser.uid));
      const classesSnap = await getDocs(q);
      
      const classesList = [];
      classesSnap.forEach((doc) => {
        classesList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setClasses(classesList);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = async (classItem) => {
    setSelectedClass(classItem);
    setLoading(true);
    
    try {
      const studentsRef = collection(db, "users");
      const q = query(
        studentsRef,
        where("role", "==", "student"),
        where("classId", "==", classItem.id)
      );
      const studentsSnap = await getDocs(q);
      
      const studentsList = [];
      studentsSnap.forEach((doc) => {
        const data = doc.data();
        studentsList.push({
          id: doc.id,
          name: data.name || "Unknown",
          email: data.emailAddress || "",
          studentNo: data.studentNo || "N/A",
          program: data.program || "",
          year: data.year || ""
        });
      });
      
      studentsList.sort((a, b) => a.name.localeCompare(b.name));
      
      setStudents(studentsList);
      setSelectedStudents(studentsList.map(s => s.id));
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
    } else {
      navigate("/teacher/quizzes");
    }
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  const handleStudentToggle = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const handleAssignQuiz = async () => {
    if (selectedStudents.length === 0) {
      alert("Please select at least one student");
      return;
    }

    const isSynchronous = quiz?.settings?.mode === "synchronous";
    
    if (!isSynchronous && !assignmentSettings.dueDate) {
      alert("Please set a due date for this assignment");
      return;
    }

    setAssigning(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("❌ Please log in first!");
        return;
      }

      const teacherName = currentUser.displayName || currentUser.email?.split('@')[0] || "Teacher";
      
      const finalDueDate = isSynchronous ? (quiz?.settings?.deadline || null) : assignmentSettings.dueDate;

      const assignmentData = {
        quizId: quizId,
        quizTitle: quiz.title,
        quizCode: quiz.code,
        classId: selectedClass.id,
        className: selectedClass.name,
        subject: selectedClass.subject || "",
        dueDate: finalDueDate,
        quizMode: quiz?.settings?.mode || "asynchronous",
        instructions: assignmentSettings.instructions,
        assignedAt: new Date(),
        assignedBy: currentUser.uid,
        teacherName: teacherName,
        teacherEmail: currentUser.email,
        status: "pending",
        completed: false,
        score: null
      };

      for (const studentId of selectedStudents) {
        const studentRef = doc(db, "users", studentId);
        await updateDoc(studentRef, {
          assignedQuizzes: arrayUnion(assignmentData)
        });
      }

      // Initialize session for synchronous quiz
      const quizRef = doc(db, "quizzes", quizId);
      const updateData = {
        [`assignments.${selectedClass.id}`]: {
          classId: selectedClass.id,
          className: selectedClass.name,
          subject: selectedClass.subject || "",
          studentIds: selectedStudents,
          studentCount: selectedStudents.length,
          dueDate: finalDueDate,
          instructions: assignmentSettings.instructions,
          assignedAt: new Date(),
          quizMode: quiz?.settings?.mode || "asynchronous"
        },
        updatedAt: new Date()
      };

      // CRITICAL: Initialize session as "not_started" for synchronous quizzes
      if (isSynchronous) {
        updateData[`sessions.${selectedClass.id}`] = {
          status: "not_started",
          startedAt: null,
          pausedAt: null,
          endedAt: null
        };
      }

      await updateDoc(quizRef, updateData);

      alert(`✅ Quiz assigned to ${selectedStudents.length} student(s) in ${selectedClass.name} successfully!`);
      
      if (isSynchronous) {
        navigate(`/teacher/quiz-control/${quizId}/${selectedClass.id}`);
      } else {
        navigate("/teacher/quizzes");
      }
    } catch (error) {
      console.error("Error assigning quiz:", error);
      alert("❌ Error assigning quiz. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const isSynchronous = quiz?.settings?.mode === "synchronous";
  const quizDeadline = quiz?.settings?.deadline;

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
    <div className="bg-white p-8 rounded-2xl shadow-md max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          {!selectedClass ? "Back to Manage Quizzes" : "Back to Classes"}
        </button>
        
        <div className="flex items-center gap-2 text-sm">
          <span className={`px-3 py-1 rounded-full ${!selectedClass ? 'bg-purple-600 text-white' : 'bg-green-500 text-white'}`}>
            {!selectedClass ? '1' : '✓'} Select Class
          </span>
          <span className="text-gray-400">→</span>
          <span className={`px-3 py-1 rounded-full ${selectedClass ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            2. Assign to Students
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
              <p className="text-purple-200 text-xs">Code: {quiz.code} • {quiz.questions?.length || 0} questions</p>
              {isSynchronous && (
                <span className="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  LIVE MODE
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isSynchronous && (
        <div className="mb-6 p-5 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-200 rounded-lg">
              <Zap className="w-6 h-6 text-orange-700" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-orange-900 text-lg">Synchronous (Live) Quiz Mode</h4>
              <p className="text-sm text-orange-800 mt-1">
                Students CANNOT access this quiz until you START it from the Quiz Control Dashboard.
              </p>
              {quizDeadline && (
                <div className="mt-3 p-3 bg-white border border-orange-200 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">⏰ Expiration Deadline:</p>
                  <p className="text-base font-bold text-orange-900">
                    {new Date(quizDeadline).toLocaleString('en-PH', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Assignment expires if not started before this time
                  </p>
                </div>
              )}
              <div className="mt-3 p-3 bg-purple-100 border border-purple-300 rounded-lg">
                <p className="text-xs font-semibold text-purple-900 mb-1">
                  🎯 After Assignment:
                </p>
                <p className="text-xs text-purple-800">
                  You'll be redirected to the <strong>Quiz Control Dashboard</strong> where you can START the quiz and monitor students in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <p className="text-sm mt-2">Please upload a classlist first in Manage Classes.</p>
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
                      <h4 className="font-bold text-lg text-gray-800">{classItem.name}</h4>
                      {classItem.subject && (
                        <p className="text-sm text-gray-600 mt-1">Subject: {classItem.subject}</p>
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
            <p className="font-bold text-purple-800 text-lg">{selectedClass.name}</p>
            {selectedClass.subject && (
              <p className="text-sm text-gray-600">Subject: {selectedClass.subject}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="border-2 border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Assignment Details
                </h3>
                
                <div className="space-y-4">
                  {!isSynchronous && (
                    <div>
                      <label className="block text-sm font-semibold mb-2">Due Date *</label>
                      <input
                        type="date"
                        value={assignmentSettings.dueDate}
                        onChange={(e) => setAssignmentSettings({ ...assignmentSettings, dueDate: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Students can take this quiz anytime before 11:59 PM on this date
                      </p>
                    </div>
                  )}

                  {isSynchronous && quizDeadline && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-4">
                      <p className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Expiration Deadline (Optional)
                      </p>
                      <p className="text-lg font-bold text-blue-900">
                        {new Date(quizDeadline).toLocaleString('en-PH', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-gray-600 mt-2">
                        Assignment will expire if not started before this time
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold mb-2">Instructions (Optional)</label>
                    <textarea
                      value={assignmentSettings.instructions}
                      onChange={(e) => setAssignmentSettings({ ...assignmentSettings, instructions: e.target.value })}
                      placeholder="Add any special instructions for this class..."
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="4"
                    />
                  </div>

                  <div className={`border-2 rounded-lg p-4 ${isSynchronous ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'}`}>
                    <p className={`text-sm font-semibold mb-1 ${isSynchronous ? 'text-purple-800' : 'text-blue-800'}`}>
                      ℹ️ {isSynchronous ? 'Live Mode Active' : 'Note'}
                    </p>
                    <p className="text-xs text-gray-700">
                      {isSynchronous 
                        ? 'You will control when students can start and submit this quiz from the Quiz Control Dashboard.'
                        : 'Time limit, shuffle settings, and quiz mode are configured in Quiz Settings.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className={`border-2 rounded-xl p-6 ${isSynchronous ? 'border-purple-200 bg-purple-50' : 'border-blue-200 bg-blue-50'}`}>
                <h3 className={`text-lg font-bold mb-2 ${isSynchronous ? 'text-purple-800' : 'text-blue-800'}`}>
                  Selected: {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedStudents.length === 0 
                    ? "No students selected" 
                    : `Quiz will be assigned to ${selectedStudents.length} out of ${students.length} student${students.length !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
            </div>

            <div className="border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Select Students</h3>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                  {selectedStudents.length === students.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              {students.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No students found in this class</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
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
                        <div className="font-semibold text-gray-800">{student.name}</div>
                        <div className="text-xs text-gray-600">
                          Student #: {student.studentNo}
                        </div>
                        {student.program && (
                          <div className="text-xs text-gray-500">
                            {student.program} {student.year && `- Year ${student.year}`}
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
                (!isSynchronous && !assignmentSettings.dueDate)
              }
              className={`px-6 py-3 font-semibold rounded-lg flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed ${
                isSynchronous 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {assigning ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Assigning...
                </>
              ) : (
                <>
                  {isSynchronous ? <Zap className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                  {isSynchronous 
                    ? `Assign & Go to Control Dashboard`
                    : `Assign Quiz to ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`
                  }
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}