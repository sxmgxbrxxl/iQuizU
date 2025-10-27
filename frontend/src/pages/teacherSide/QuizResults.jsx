import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

export default function QuizResults() {
  const navigate = useNavigate();
  const { quizId, classId } = useParams();

  const [quiz, setQuiz] = useState(null);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAnswers, setStudentAnswers] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [quizId, classId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("🔍 Fetching data...");
      console.log("  - quizId:", quizId);
      console.log("  - classId:", classId);

      // 1. Fetch Quiz Details
      const quizDoc = await getDoc(doc(db, "quizzes", quizId));
      if (!quizDoc.exists()) {
        console.error("❌ Quiz not found");
        setError("Quiz not found");
        return;
      }

      const quizData = { id: quizDoc.id, ...quizDoc.data() };
      setQuiz(quizData);
      console.log("✅ Quiz loaded:", quizData.title);

      // 2. Fetch ALL students in this class FIRST
      const studentsQuery = query(
        collection(db, "users"),
        where("classIds", "array-contains", classId),
        where("role", "==", "student")
      );
      const studentSnapshot = await getDocs(studentsQuery);
      
      const allStudents = [];
      studentSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // ✅ USE authUID as the primary ID to match with submissions
        allStudents.push({
          id: data.authUID || docSnap.id,  // Use authUID first, fallback to doc ID
          docId: docSnap.id,  // Keep original doc ID if needed
          firstName: data.name?.split(" ")[0] || "",
          lastName: data.name?.split(" ").slice(1).join(" ") || "",
          email: data.emailAddress || "",
          name: data.name || "Unknown",
        });
      });

      console.log(`✅ Found ${allStudents.length} students in class`);
      console.log("📋 All student IDs:", allStudents.map(s => `${s.name} = ${s.id}`));
      setStudents(allStudents);

      // 3. Fetch assignments for this quiz+class to get the assignmentIds
      const assignmentsQuery = query(
        collection(db, "assignedQuizzes"),
        where("quizId", "==", quizId),
        where("classId", "==", classId),
        where("quizMode", "==", "asynchronous")
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      
      console.log(`📋 Found ${assignmentsSnapshot.size} async assignments for this quiz+class`);

      // Get all assignmentIds for this quiz-class combination
      const assignmentIds = [];
      const studentAssignmentMap = new Map(); // studentId -> assignmentId
      
      assignmentsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        assignmentIds.push(docSnap.id);
        studentAssignmentMap.set(data.studentId, docSnap.id);
      });

      if (assignmentIds.length === 0) {
        console.log(`⚠️ No async assignments found for this quiz-class combination`);
        setResults([]);
        return;
      }

      // 4. Fetch ONLY submissions that match these assignmentIds (ensures quiz+class match)
      const submissionsData = [];
      
      // Firestore 'in' queries are limited to 10 items, so batch if needed
      const batchSize = 10;
      for (let i = 0; i < assignmentIds.length; i += batchSize) {
        const batch = assignmentIds.slice(i, i + batchSize);
        
        const submissionsQuery = query(
          collection(db, "quizSubmissions"),
          where("assignmentId", "in", batch),
          where("quizMode", "==", "asynchronous")
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        
        console.log(`📊 Found ${submissionsSnapshot.size} submissions for assignment batch ${i / batchSize + 1}`);

        submissionsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const studentInClass = allStudents.find(s => s.id === data.studentId);
          
          console.log(`  ✅ Submission from: ${data.studentName} (${data.studentId})`);
          console.log(`     🔍 Student found in class list?`, studentInClass ? `YES - ${studentInClass.name}` : "❌ NO MATCH!");
          console.log(`     Assignment: ${data.assignmentId}`);
          console.log(`     Score: ${data.correctPoints}/${data.totalPoints}`);
          console.log(`     Base-50: ${data.base50ScorePercentage}%`);
          
          submissionsData.push({
            id: docSnap.id,
            studentId: data.studentId,
            studentName: data.studentName || studentInClass?.name || "Unknown",
            correctPoints: data.correctPoints || 0,
            totalPoints: data.totalPoints || quizData.totalPoints || 0,
            rawScorePercentage: data.rawScorePercentage || 0,
            base50ScorePercentage: data.base50ScorePercentage || 0,
            submittedAt: data.submittedAt,
            answers: data.answers || {},
          });
        });
      }

      console.log(`✅ Total: ${submissionsData.length} asynchronous submissions for this quiz-class combination`);
      setResults(submissionsData);

    } catch (e) {
      console.error("❌ Error fetching data:", e);
      setError("Error loading results. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStudentResult = (studentId) => {
    return results.find((r) => r.studentId === studentId);
  };

  const handleViewDetails = (studentId) => {
    const result = getStudentResult(studentId);
    if (!result) {
      alert("No submission found for this student");
      return;
    }

    setStudentAnswers(result);
    setSelectedStudent(studentId);
    setShowDetailModal(true);
  };

  const calculateStats = () => {
    if (results.length === 0) {
      return { completed: 0, notStarted: 0 };
    }

    return {
      completed: results.length,
      notStarted: students.length - results.length,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading results...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-blue-600 hover:text-blue-800 font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="p-8 font-Outfit max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Quiz Results (Asynchronous)</h1>
        <p className="text-gray-600">
          {quiz?.title} • {quiz?.totalPoints || 0} points
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span className="text-gray-600 text-sm font-semibold">Total Assigned</span>
          </div>
          <p className="text-3xl font-bold text-blue-700">{students.length}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-gray-600" />
            <span className="text-gray-600 text-sm font-semibold">Not Started</span>
          </div>
          <p className="text-3xl font-bold text-gray-700">{stats.notStarted}</p>
        </div>

        <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <span className="text-gray-600 text-sm font-semibold">In Progress</span>
          </div>
          <p className="text-3xl font-bold text-yellow-700">0</p>
        </div>

        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <span className="text-gray-600 text-sm font-semibold">Completed</span>
          </div>
          <p className="text-3xl font-bold text-green-700">{stats.completed}</p>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-bold">Student</th>
                <th className="px-6 py-4 text-left font-bold">Email</th>
                <th className="px-6 py-4 text-center font-bold">Raw Score</th>
                <th className="px-6 py-4 text-center font-bold">Base-50 Grade</th>
                <th className="px-6 py-4 text-center font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No students in this class
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => {
                  const result = getStudentResult(student.id);
                  const submitted = !!result;

                  return (
                    <tr
                      key={student.id}
                      className={`border-b transition ${
                        submitted ? "cursor-pointer" : ""
                      } ${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } ${submitted ? "hover:bg-blue-50" : ""}`}
                      onClick={() => submitted && handleViewDetails(student.id)}
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800">
                          {student.firstName} {student.lastName}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{student.email}</td>
                      <td className="px-6 py-4 text-center">
                        {submitted ? (
                          <span className="font-bold text-lg text-blue-600">
                            {result.rawScorePercentage.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {submitted ? (
                          <span className="font-bold text-lg text-green-600">
                            {result.base50ScorePercentage.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {submitted ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            Completed
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && studentAnswers && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-700 text-white p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">
                    {students.find((s) => s.id === selectedStudent)?.name || "Student"}
                  </h3>
                  <p className="text-blue-100 mt-1">
                    Raw Score: {studentAnswers.rawScorePercentage?.toFixed(0)}%
                  </p>
                  <p className="text-blue-100">
                    Base-50 Grade: {studentAnswers.base50ScorePercentage?.toFixed(0)}%
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-white hover:bg-blue-800 rounded-lg p-2 transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {studentAnswers.answers && Object.keys(studentAnswers.answers).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(studentAnswers.answers).map(([questionIndex, studentAnswer]) => {
                    const question = quiz?.questions?.[parseInt(questionIndex)];
                    if (!question) {
                      console.warn(`Question not found at index ${questionIndex}`);
                      return null;
                    }

                    let isCorrect = false;
                    let correctAnswer = "";

                    if (question.type === "multiple_choice") {
                      const correctChoice = question.choices?.find((c) => c.is_correct);
                      correctAnswer = correctChoice?.text || "";
                      isCorrect = studentAnswer === correctAnswer;
                    } else if (question.type === "true_false") {
                      correctAnswer = question.correct_answer;
                      isCorrect = studentAnswer?.toLowerCase() === correctAnswer?.toLowerCase();
                    } else if (question.type === "identification") {
                      correctAnswer = question.correct_answer;
                      isCorrect = studentAnswer?.toLowerCase().trim() === correctAnswer?.toLowerCase().trim();
                    }

                    return (
                      <div
                        key={questionIndex}
                        className={`border-2 rounded-lg p-4 ${
                          isCorrect
                            ? "bg-green-50 border-green-300"
                            : "bg-red-50 border-red-300"
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <span className="font-bold text-lg text-gray-700">
                            {parseInt(questionIndex) + 1}.
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">
                              {question.question}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Points: {question.points || 1}
                            </p>
                          </div>
                          {isCorrect ? (
                            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                          )}
                        </div>

                        <div className="ml-10 mt-3 space-y-2">
                          <p className="text-sm">
                            <span className="font-semibold text-gray-700">
                              Student's Answer:{" "}
                            </span>
                            <span
                              className={`${
                                isCorrect
                                  ? "text-green-700 font-bold"
                                  : "text-red-700 font-bold"
                              }`}
                            >
                              {studentAnswer || "No answer"}
                            </span>
                          </p>
                          {!isCorrect && (
                            <p className="text-sm">
                              <span className="font-semibold text-gray-700">
                                Correct Answer:{" "}
                              </span>
                              <span className="text-green-700 font-bold">
                                {correctAnswer}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500">No answers recorded</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}