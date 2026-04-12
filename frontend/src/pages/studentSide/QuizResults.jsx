// QuizResults.jsx - Updated with Firestore saving
import { Award, TrendingUp, BookOpen, Loader, Sparkles, Brain, Target, Flame, ChevronRight, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, addDoc, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/firebaseConfig";

export default function QuizResults({ quiz = { title: "Sample Quiz" }, assignment = { subject: "General", className: "Class A" }, quizResults = { correctPoints: 45, totalPoints: 50, base50ScorePercentage: 95, rawScorePercentage: 90, totalQuestions: 50 }, questions = [], answers = [], onNavigate = () => { } }) {
  const navigate = useNavigate();
  const { assignmentId } = useParams();
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [savingResults, setSavingResults] = useState(false);

  useEffect(() => {
    generateRecommendations();
    setTimeout(() => setShowStats(true), 300);
    setTimeout(() => setShowRecommendations(true), 600);
  }, []);

  useEffect(() => {
    // Save results after recommendations are generated (even if empty, after loading finishes)
    if (!loadingRecommendations) {
      saveResultsToFirestore();
    }
  }, [loadingRecommendations]);

  const saveResultsToFirestore = async () => {
    setSavingResults(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error("❌ No logged-in user");
        return;
      }

      const quizSubmissionData = {
        studentId: currentUser.uid,
        studentEmail: currentUser.email,
        assignmentId: assignmentId || "",
        quizId: quiz.id || "",
        quizTitle: quiz.title || "Untitled Quiz",
        className: assignment.className || "Unknown Class",
        subject: assignment.subject || "",
        correctPoints: quizResults.correctPoints || 0,
        totalPoints: quizResults.totalPoints || 50,
        base50ScorePercentage: quizResults.base50ScorePercentage || 0,
        rawScorePercentage: quizResults.rawScorePercentage || 0,
        totalQuestions: quizResults.totalQuestions || questions.length,
        quizMode: assignment.quizMode || "asynchronous",
        submittedAt: serverTimestamp(),
        questionsAndAnswers: questions.map((q, idx) => ({
          questionId: q.id || idx,
          question: q.question,
          type: q.type,
          correctAnswer: getCorrectAnswer(q),
          studentAnswer: answers[idx] || "Not answered",
          isCorrect: checkAnswer(q, answers[idx]),
          explanation: q.explanation || ""
        })),
        recommendations: recommendations,
        remark: getGradeRemark(quizResults.base50ScorePercentage || 75).text,
        feedbackMetadata: {
          totalRecommendations: recommendations.length,
          scoreLevel: getScoreLevel(),
          generatedAt: serverTimestamp(),
          analysisType: "AI Generated"
        }
      };

      // Check if submission already exists
      const submissionsRef = collection(db, "quizSubmissions");
      const q = query(
        submissionsRef,
        where("studentId", "==", currentUser.uid),
        where("assignmentId", "==", assignmentId)
      );

      const existingDocs = await getDocs(q);

      if (existingDocs.empty) {
        // Create new submission
        const docRef = await addDoc(submissionsRef, quizSubmissionData);
        console.log("✅ Quiz submission saved with ID:", docRef.id);

        // Update assignedQuizzes with completion status
        if (assignmentId) {
          const assignmentRef = doc(db, "assignedQuizzes", assignmentId);
          await updateDoc(assignmentRef, {
            completed: true,
            status: "submitted",
            submittedAt: serverTimestamp(),
            score: quizResults.base50ScorePercentage,
            base50ScorePercentage: quizResults.base50ScorePercentage,
            attempts: (assignment.attempts || 0) + 1
          });
        }
      } else {
        // Update existing submission (retry scenario)
        const existingDocId = existingDocs.docs[0].id;
        const submissionRef = doc(db, "quizSubmissions", existingDocId);
        await updateDoc(submissionRef, {
          ...quizSubmissionData,
          updatedAt: serverTimestamp()
        });
        console.log("✅ Quiz submission updated");
      }
    } catch (error) {
      console.error("❌ Error saving quiz results:", error);
    } finally {
      setSavingResults(false);
    }
  };

  const getGradeRemark = (base50ScorePercentage) => {
    if (base50ScorePercentage >= 90) return { text: "Excellent!", color: "text-green-600" };
    if (base50ScorePercentage >= 85) return { text: "Very Good!", color: "text-green-600" };
    if (base50ScorePercentage >= 80) return { text: "Good!", color: "text-indigo-600" };
    if (base50ScorePercentage >= 75) return { text: "Passed", color: "text-yellow-600" };
    return { text: "Needs Improvement", color: "text-red-600" };
  };

  const generateRecommendations = async () => {
    setLoadingRecommendations(true);

    try {
      const analysis = analyzeAllQuestions();

      const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

      if (!GEMINI_API_KEY) {
        console.warn("REACT_APP_GEMINI_API_KEY not found. Using fallback recommendations.");
        const fallbackRecs = generateFallbackRecommendations(analysis);
        setRecommendations(fallbackRecs);
        setLoadingRecommendations(false);
        return;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: createRecommendationsPrompt(analysis)
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1500,
              topP: 0.95,
              topK: 40
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`API Error ${response.status}:`, errorData);
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const aiResponse = data.candidates[0].content.parts[0].text;
        const parsed = parseRecommendations(aiResponse);
        setRecommendations(parsed.length > 0 ? parsed : generateFallbackRecommendations(analysis));
      } else {
        throw new Error("Invalid API response format");
      }

    } catch (error) {
      console.error("Error generating recommendations:", error);
      const analysis = analyzeAllQuestions();
      const fallbackRecs = generateFallbackRecommendations(analysis);
      setRecommendations(fallbackRecs);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const analyzeAllQuestions = () => {
    const analysis = {
      allQuestions: [],
      correctAnswers: 0,
      incorrectAnswers: 0,
      scorePercentage: quizResults.rawScorePercentage || 0
    };

    if (questions.length === 0) {
      analysis.allQuestions = [
        { question: "What is the capital of France?", correctAnswer: "Paris", studentAnswer: "Paris", isCorrect: true, type: "identification" },
        { question: "Is the Earth flat?", correctAnswer: "False", studentAnswer: "True", isCorrect: false, type: "true_false" },
        { question: "Which is the largest planet?", correctAnswer: "Jupiter", studentAnswer: "Saturn", isCorrect: false, type: "multiple_choice" }
      ];
      analysis.correctAnswers = 1;
      analysis.incorrectAnswers = 2;
      return analysis;
    }

    questions.forEach((question, index) => {
      const studentAnswer = answers[index];
      const isCorrect = checkAnswer(question, studentAnswer);

      analysis.allQuestions.push({
        question: question.question,
        correctAnswer: getCorrectAnswer(question),
        studentAnswer: studentAnswer || "Not answered",
        isCorrect: isCorrect,
        type: question.type
      });

      if (isCorrect) {
        analysis.correctAnswers++;
      } else {
        analysis.incorrectAnswers++;
      }
    });

    return analysis;
  };

  const checkAnswer = (question, studentAnswer) => {
    if (!studentAnswer) return false;

    if (question.type === "multiple_choice") {
      const correctChoice = question.choices?.find(c => c.is_correct);
      return correctChoice && studentAnswer === correctChoice.text;
    } else if (question.type === "true_false") {
      return studentAnswer.toLowerCase() === question.correct_answer.toLowerCase();
    } else if (question.type === "identification") {
      return studentAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
    }
    return false;
  };

  const getCorrectAnswer = (question) => {
    if (question.type === "multiple_choice") {
      const correctChoice = question.choices?.find(c => c.is_correct);
      return correctChoice?.text || "N/A";
    }
    return question.correct_answer || "N/A";
  };

  const createRecommendationsPrompt = (analysis) => {
    return `You are an educational AI assistant. Analyze this quiz performance and provide SPECIFIC, actionable study recommendations.

Quiz: ${quiz.title}
Subject: ${assignment.subject || "General"}
Score: ${analysis.scorePercentage}% (${analysis.correctAnswers}/${analysis.allQuestions.length} correct)

STUDENT'S QUIZ PERFORMANCE:
${analysis.allQuestions.map((q, i) =>
      `Question ${i + 1}: "${q.question}"
Correct Answer: "${q.correctAnswer}"
Student's Answer: "${q.studentAnswer}"
Result: ${q.isCorrect ? "✓ CORRECT" : "✗ INCORRECT"}`
    ).join('\n\n')}

TASK: Generate 5-8 SPECIFIC study recommendations based on the questions above.

REQUIREMENTS:
1. Each recommendation must reference actual topics/concepts from the quiz
2. Focus on topics the student got WRONG
3. Also include 1-2 recommendations to reinforce topics they got RIGHT
4. Make recommendations actionable and specific
5. Include study methods (e.g., "memorize", "practice", "understand the process of", etc.)

Format: Provide ONLY a numbered list with no extra text. Each line should be exactly:
1. [Specific recommendation about actual content from the quiz]
2. [Next recommendation]
etc.

Example format:
1. Review the definition and characteristics of photosynthesis, focusing on light-dependent reactions
2. Practice identifying capital cities, starting with European countries
3. Study the process of cell division (mitosis vs meiosis) with diagrams
4. Memorize the periodic table elements with atomic numbers 1-20
5. Understand the causes and effects of the French Revolution

Now generate recommendations for this student:`;
  };

  const parseRecommendations = (aiResponse) => {
    const lines = aiResponse.split('\n').filter(line => line.trim());
    const recs = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      const match = trimmed.match(/^(\d+\.|[-•])\s+(.+)/);

      if (match && match[2]) {
        const text = match[2].trim();
        if (text.length > 15) {
          recs.push(text);
        }
      }
    });

    return recs;
  };

  const generateFallbackRecommendations = (analysis) => {
    const recs = [];
    const incorrectQuestions = analysis.allQuestions.filter(q => !q.isCorrect);
    const correctQuestions = analysis.allQuestions.filter(q => q.isCorrect);

    incorrectQuestions.slice(0, 4).forEach((q, idx) => {
      if (q.correctAnswer !== "Not answered") {
        recs.push(`Study "${q.correctAnswer}" - understand why this is the correct answer to: "${q.question}"`);
      }
    });

    if (correctQuestions.length > 0) {
      correctQuestions.slice(0, 2).forEach(q => {
        if (q.correctAnswer) {
          recs.push(`Continue mastering "${q.correctAnswer}" - you answered this correctly, deepen your understanding`);
        }
      });
    }

    if (analysis.incorrectAnswers > 3) {
      recs.push("Review all topics covered in this quiz systematically");
      recs.push("Create a summary sheet of key concepts and definitions");
      recs.push("Practice similar questions to reinforce your learning");
    }

    return recs.slice(0, 10);
  };

  const getScoreLevel = () => {
    const score = quizResults.base50ScorePercentage || 75;
    if (score >= 90) return { level: "Master", color: "from-yellow-400 to-yellow-600", icon: "🏆", bg: "bg-yellow-50", border: "border-yellow-300" };
    if (score >= 80) return { level: "Expert", color: "from-green-400 to-green-600", icon: "⭐", bg: "bg-green-50", border: "border-green-300" };
    if (score >= 70) return { level: "Proficient", color: "from-green-400 to-green-600", icon: "✓", bg: "bg-green-50", border: "border-green-300" };
    if (score >= 60) return { level: "Developing", color: "from-green-400 to-green-600", icon: "📚", bg: "bg-green-50", border: "border-green-300" };
    return { level: "Beginner", color: "from-orange-400 to-orange-600", icon: "💡", bg: "bg-orange-50", border: "border-orange-300" };
  };

  const scoreLevel = getScoreLevel();
  const remark = getGradeRemark(quizResults.base50ScorePercentage || 75);

  return (
    <div className="min-h-screen px-2 py-6 md:p-16 font-Poppins bg-gradient-to-br from-background via-background to-green-200">
      <div className="max-w-6xl mx-auto">

        {/* Header Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-4 sm:mb-6 animate-fadeInDown">
          <div className={`bg-gradient-to-r ${scoreLevel.color} p-6 sm:p-8 md:p-10 text-white relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-white opacity-10 rounded-full -mr-16 -mt-16 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-40 sm:h-40 bg-white opacity-10 rounded-full -ml-12 -mb-12 animate-pulse delay-300"></div>

            <div className="text-center relative z-10">
              <div className="text-5xl sm:text-6xl md:text-7xl mb-3 sm:mb-4 animate-bounceIn">{scoreLevel.icon}</div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 animate-slideInUp">Quiz Complete!</h1>
              <p className="text-base sm:text-lg md:text-xl opacity-90 mb-3 animate-slideInUp delay-100">{quiz.title}</p>
              <div className="mt-4 inline-block px-4 sm:px-6 py-2 bg-white bg-opacity-20 rounded-full backdrop-blur-sm animate-slideInUp delay-200">
                <span className="text-xs sm:text-sm font-semibold">{assignment.className}</span>
              </div>
            </div>
          </div>

          {/* Score Display */}
          <div className="p-4 sm:p-6 md:p-8">
            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6 transition-all duration-700 ${showStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {/* Main Score */}
              <div className={`${scoreLevel.bg} border-2 ${scoreLevel.border} rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:col-span-2 transform hover:scale-105 transition-transform duration-300`}>
                <div className="text-center space-y-4">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 font-semibold mb-2">Your Examination Score</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-3xl sm:text-4xl font-bold text-gray-800">
                        {quizResults.correctPoints || 0}
                      </span>
                      <span className="text-2xl sm:text-3xl text-gray-500">/</span>
                      <span className="text-3xl sm:text-4xl font-bold text-gray-800">
                        {quizResults.totalPoints || 50}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 pt-3">
                    <p className="text-4xl sm:text-5xl font-bold text-gray-800 mb-2">
                      {(quizResults.base50ScorePercentage || 75).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600 font-semibold mb-1">Equivalent Grade</p>
                    <p className="text-lg sm:text-xl font-bold">
                      Mark: <span className={remark.color}>{remark.text}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Raw Score */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 transform hover:scale-105 transition-transform duration-300">
                <p className="text-xs sm:text-sm text-gray-600 font-semibold mb-1">Raw Score</p>
                <p className="text-3xl sm:text-4xl font-bold text-gray-800 mb-1 animate-countUp">
                  {quizResults.rawScorePercentage || 75}%
                </p>
                <p className="text-xs text-gray-500">Before transmutation</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className={`grid grid-cols-3 gap-2 sm:gap-4 transition-all duration-700 delay-300 ${showStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl transform hover:scale-110 transition-transform duration-300">
                <div className="text-2xl sm:text-3xl font-bold text-gray-800">{quizResults.totalQuestions || 50}</div>
                <div className="text-xs text-gray-600 font-medium mt-1">Questions</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg sm:rounded-xl transform hover:scale-110 transition-transform duration-300">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <div className="text-2xl sm:text-3xl font-bold text-green-600">{quizResults.correctPoints || 0}</div>
                </div>
                <div className="text-xs text-gray-600 font-medium">Correct</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg sm:rounded-xl transform hover:scale-110 transition-transform duration-300">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  <div className="text-2xl sm:text-3xl font-bold text-red-600">
                    {(quizResults.totalPoints || 50) - (quizResults.correctPoints || 0)}
                  </div>
                </div>
                <div className="text-xs text-gray-600 font-medium">Incorrect</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations Section */}
        <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden mb-4 sm:mb-6 transition-all duration-700 ${showRecommendations ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-gradient-to-r from-indigo-600 to-green-600 p-4 sm:p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white opacity-10 rounded-full -mr-12 -mt-12 animate-pulse"></div>
            <div className="flex items-center gap-2 sm:gap-3 relative z-10">
              <Brain className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Study Recommendations</h2>
                <p className="text-xs sm:text-sm opacity-90">Based on your quiz performance</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            {loadingRecommendations ? (
              <div className="text-center py-8 sm:py-12">
                <Loader className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-indigo-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium text-sm sm:text-base">Analyzing your answers...</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-2">Generating personalized recommendations</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {recommendations.length > 0 ? (
                  recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 sm:gap-4 p-3 sm:p-5 bg-gradient-to-r from-indigo-50 to-green-50 border-2 border-indigo-200 rounded-lg sm:rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300 animate-slideInRight"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-indigo-600 to-green-600 text-white rounded-full flex items-center justify-center font-bold text-xs sm:text-sm flex-none">
                        {index + 1}
                      </div>
                      <div className="flex-1 pt-0.5 sm:pt-1 min-w-0">
                        <p className="text-gray-800 leading-relaxed text-sm sm:text-base break-words">{rec}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <Target className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-sm sm:text-base">No specific recommendations available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info Note */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 animate-fadeIn">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center flex-none">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-800 mb-1 text-sm sm:text-base">About Your Grade</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Your raw score of <strong>{quizResults.rawScorePercentage || 75}%</strong> has been transmuted to a Base-50 grade of <strong>{(quizResults.base50ScorePercentage || 75).toFixed(1)}%</strong> using the formula: Grade = 50 + (Raw Score ÷ 2)
              </p>
            </div>
          </div>
        </div>

        {/* Saving Indicator */}
        {savingResults && (
          <div className="flex items-center justify-center gap-2 text-indigo-600 font-semibold mb-4 animate-pulse">
            <Loader className="w-4 h-4 animate-spin" />
            Saving your results...
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => navigate("/student")}
          className="w-full bg-gradient-to-r from-indigo-600 to-green-600 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:from-indigo-700 hover:to-green-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] animate-fadeIn flex items-center justify-center gap-2"
        >
          Back to Dashboard
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <style>{`
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes countUp { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeInDown { animation: fadeInDown 0.6s ease-out; }
        .animate-slideInUp { animation: slideInUp 0.6s ease-out; }
        .animate-bounceIn { animation: bounceIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
        .animate-slideInRight { animation: slideInRight 0.5s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out; }
        .animate-countUp { animation: countUp 0.8s ease-out; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
      `}</style>
    </div>
  );
}