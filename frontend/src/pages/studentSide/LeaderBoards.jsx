import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { Trophy, Medal, TrendingUp, Users, Search, Loader, Crown, Star, Zap, Radio, ChevronDown, Filter, X } from "lucide-react";

export default function Leaderboards({ user, userDoc }) {
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userClassIds, setUserClassIds] = useState([]);
  const [quizModeFilter, setQuizModeFilter] = useState("all");
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState(null);

  useEffect(() => {
    if (userDoc?.classIds && Array.isArray(userDoc.classIds)) {
      setUserClassIds(userDoc.classIds);
    }
  }, [userDoc]);

  useEffect(() => {
    if (userClassIds.length > 0) {
      fetchLeaderboardData();
    } else {
      setLoading(false);
    }
  }, [userClassIds, selectedSubject, timeFilter, quizModeFilter]);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const constraints = [];

      if (userClassIds.length > 0) {
        constraints.push(where("classId", "in", userClassIds));
      }

      let submissionsQuery;
      if (constraints.length > 0) {
        submissionsQuery = query(collection(db, "quizSubmissions"), ...constraints);
      } else {
        submissionsQuery = collection(db, "quizSubmissions");
      }

      const submissionsSnap = await getDocs(submissionsQuery);
      let submissions = submissionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (selectedSubject !== "all" && selectedSubject !== "") {
        submissions = submissions.filter(sub => sub.subject === selectedSubject);
      }

      if (quizModeFilter !== "all") {
        submissions = submissions.filter(sub => (sub.quizMode || "asynchronous") === quizModeFilter);
      }

      if (timeFilter !== "all") {
        const now = new Date();
        let startDate;
        
        if (timeFilter === "today") {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (timeFilter === "week") {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (timeFilter === "month") {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        
        if (startDate) {
          submissions = submissions.filter(sub => {
            if (!sub.submittedAt) return false;
            const submittedDate = sub.submittedAt.toDate ? sub.submittedAt.toDate() : new Date(sub.submittedAt);
            return submittedDate >= startDate;
          });
        }
      }

      const uniqueSubjects = [...new Set(submissions.map(s => s.subject).filter(Boolean))];
      setSubjects(uniqueSubjects);

      const studentScores = {};

      submissions.forEach(submission => {
        const studentId = submission.studentId;
        
        if (!studentId) return;

        const quizMode = submission.quizMode || "asynchronous";
        const score = parseInt(submission.base50ScorePercentage) || 0;
        const correctPts = parseInt(submission.correctPoints) || 0;

        if (!studentScores[studentId]) {
          studentScores[studentId] = {
            studentId: studentId,
            studentName: submission.studentName || "Unknown Student",
            studentNo: submission.studentNo || "",
            className: submission.className || "Unknown Class",
            synchronous: {
              bestScore: 0,
              avgScore: 0,
              totalQuizzes: 0,
              totalPoints: 0,
              scores: []
            },
            asynchronous: {
              bestScore: 0,
              avgScore: 0,
              totalQuizzes: 0,
              totalPoints: 0,
              scores: []
            }
          };
        }

        const modeData = studentScores[studentId][quizMode];
        modeData.scores.push(score);
        modeData.totalQuizzes += 1;
        modeData.totalPoints += correctPts;
        modeData.bestScore = Math.max(modeData.bestScore, score);
        modeData.avgScore = Math.round(modeData.scores.reduce((a, b) => a + b, 0) / modeData.totalQuizzes);
      });

      let leaderboard = Object.values(studentScores)
        .map(student => {
          const syncTotal = student.synchronous.totalQuizzes;
          const asyncTotal = student.asynchronous.totalQuizzes;
          const allScores = [...student.synchronous.scores, ...student.asynchronous.scores];

          return {
            ...student,
            overallBestScore: Math.max(
              student.synchronous.bestScore || 0,
              student.asynchronous.bestScore || 0
            ),
            overallAvgScore: allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0,
            totalSubmissions: syncTotal + asyncTotal,
            totalPoints: student.synchronous.totalPoints + student.asynchronous.totalPoints
          };
        })
        .filter(student => student.totalSubmissions > 0)
        .sort((a, b) => {
          if (b.overallBestScore !== a.overallBestScore) {
            return b.overallBestScore - a.overallBestScore;
          }
          return b.overallAvgScore - a.overallAvgScore;
        })
        .map((student, index) => ({
          ...student,
          rank: index + 1
        }));

      setLeaderboardData(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />;
    return <span className="text-sm md:text-lg font-bold text-gray-600">#{rank}</span>;
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg";
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500 text-white shadow-lg";
    if (rank === 3) return "bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-lg";
    return "bg-gray-100 text-gray-700";
  };

  const getScoreColor = (score) => {
    if (score >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 80) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 75) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const filteredLeaderboard = leaderboardData.filter(student => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      student.studentName?.toLowerCase().includes(search) ||
      student.studentNo?.toLowerCase().includes(search) ||
      student.className?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl animate-pulse">
          <Loader className="w-10 h-10 md:w-12 md:h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 text-sm md:text-base">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (userClassIds.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-md text-center animate-fade-in">
          <Users className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">No Class Enrolled</h2>
          <p className="text-sm md:text-base text-gray-600">You need to be enrolled in a class to view the leaderboard.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-md text-center">
          <p className="text-red-600 mb-4 text-sm md:text-base">Error: {error}</p>
          <button
            onClick={fetchLeaderboardData}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition transform hover:scale-105"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 p-3 md:p-6 font-Outfit">
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; opacity: 0; }
        .animate-slide-in { animation: slide-in 0.4s ease-out forwards; opacity: 0; }
        .animate-bounce-in { animation: bounce-in 0.6s ease-out forwards; opacity: 0; }
        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl overflow-hidden mb-4 md:mb-6 animate-fade-in">
          <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 p-4 md:p-8 text-white">
            <div className="flex items-center gap-3 md:gap-4 mb-4">
              <Trophy className="w-8 h-8 md:w-12 md:h-12 animate-bounce-in" />
              <div>
                <h1 className="text-2xl md:text-4xl font-bold">Class Leaderboard</h1>
                <p className="text-sm md:text-lg opacity-90 mt-1">Your Class Rankings & Performance</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mt-4 md:mt-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-3 md:p-4 animate-slide-in stagger-1 hover:bg-opacity-30 transition transform hover:scale-105">
                <div className="flex items-center gap-2 md:gap-3">
                  <Users className="w-6 h-6 md:w-8 md:h-8" />
                  <div>
                    <p className="text-xs md:text-sm opacity-90">Total Students</p>
                    <p className="text-xl md:text-2xl font-bold">{leaderboardData.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-3 md:p-4 animate-slide-in stagger-2 hover:bg-opacity-30 transition transform hover:scale-105">
                <div className="flex items-center gap-2 md:gap-3">
                  <TrendingUp className="w-6 h-6 md:w-8 md:h-8" />
                  <div>
                    <p className="text-xs md:text-sm opacity-90">Class Average</p>
                    <p className="text-xl md:text-2xl font-bold">
                      {leaderboardData.length > 0
                        ? Math.round(
                            leaderboardData.reduce((sum, s) => sum + s.overallAvgScore, 0) /
                            leaderboardData.length
                          )
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-3 md:p-4 animate-slide-in stagger-3 hover:bg-opacity-30 transition transform hover:scale-105">
                <div className="flex items-center gap-2 md:gap-3">
                  <Star className="w-6 h-6 md:w-8 md:h-8" />
                  <div>
                    <p className="text-xs md:text-sm opacity-90">Top Score</p>
                    <p className="text-xl md:text-2xl font-bold">
                      {leaderboardData.length > 0 ? leaderboardData[0]?.overallBestScore : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 md:p-6 bg-gray-50 border-b">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden w-full flex items-center justify-between bg-white p-3 rounded-lg shadow-sm mb-3 hover:shadow-md transition"
            >
              <span className="flex items-center gap-2 font-semibold text-gray-700">
                <Filter className="w-5 h-5" />
                Filters
              </span>
              {showFilters ? <X className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            <div className="relative mb-3 md:mb-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm md:text-base transition"
              />
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 md:mt-4 ${showFilters ? 'block' : 'hidden'} md:block`}>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm md:text-base transition hover:border-purple-300"
              >
                <option value="all">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject || "No Subject"}</option>
                ))}
              </select>

              <select
                value={quizModeFilter}
                onChange={(e) => setQuizModeFilter(e.target.value)}
                className="px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm md:text-base transition hover:border-purple-300"
              >
                <option value="all">All Quiz Types</option>
                <option value="synchronous">Live Quizzes</option>
                <option value="asynchronous">Self-Paced Quizzes</option>
              </select>

              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm md:text-base transition hover:border-purple-300"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl overflow-hidden animate-fade-in">
          <div className="p-4 md:p-6 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 text-white">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
              Full Rankings
            </h2>
          </div>

          {filteredLeaderboard.length === 0 ? (
            <div className="p-8 md:p-12 text-center">
              <Trophy className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-base md:text-lg">No quiz submissions yet</p>
              <p className="text-xs md:text-sm text-gray-500 mt-2">Complete quizzes to appear on the leaderboard!</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Class</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">
                        <div className="flex items-center justify-center gap-1">
                          <Radio className="w-4 h-4" />
                          Live Best
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">
                        <div className="flex items-center justify-center gap-1">
                          <Zap className="w-4 h-4" />
                          Self-Paced Best
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Overall Avg</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Live Quizzes</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Self-Paced</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Total Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLeaderboard.map((student, idx) => (
                      <tr
                        key={student.studentId}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                        className={`hover:bg-gray-50 transition-all duration-200 animate-fade-in ${
                          student.studentId === user?.uid ? "bg-purple-50 hover:bg-purple-100" : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className={`flex items-center justify-center w-12 h-12 rounded-full ${getRankBadge(student.rank)} transition transform hover:scale-110`}>
                            {getRankIcon(student.rank)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-800">
                              {student.studentName}
                              {student.studentId === user?.uid && (
                                <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-1 rounded-full animate-pulse">You</span>
                              )}
                            </p>
                            {student.studentNo && (
                              <p className="text-sm text-gray-500">{student.studentNo}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-700">{student.className}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-4 py-2 rounded-lg font-bold border transition transform hover:scale-105 ${
                            student.synchronous.bestScore > 0 
                              ? getScoreColor(student.synchronous.bestScore)
                              : "text-gray-400 bg-gray-50 border-gray-200"
                          }`}>
                            {student.synchronous.bestScore > 0 ? student.synchronous.bestScore + "%" : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-4 py-2 rounded-lg font-bold border transition transform hover:scale-105 ${
                            student.asynchronous.bestScore > 0
                              ? getScoreColor(student.asynchronous.bestScore)
                              : "text-gray-400 bg-gray-50 border-gray-200"
                          }`}>
                            {student.asynchronous.bestScore > 0 ? student.asynchronous.bestScore + "%" : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-gray-700 font-semibold">{student.overallAvgScore}%</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm text-gray-600">{student.synchronous.totalQuizzes}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm text-gray-600">{student.asynchronous.totalQuizzes}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-purple-700 font-bold">{student.totalPoints}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-gray-200">
                {filteredLeaderboard.map((student, idx) => (
                  <div
                    key={student.studentId}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                    className={`p-4 animate-fade-in ${
                      student.studentId === user?.uid ? "bg-purple-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full ${getRankBadge(student.rank)} transition transform hover:scale-110`}>
                        {getRankIcon(student.rank)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">
                          {student.studentName}
                          {student.studentId === user?.uid && (
                            <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">You</span>
                          )}
                        </p>
                        {student.studentNo && (
                          <p className="text-xs text-gray-500">{student.studentNo}</p>
                        )}
                        <p className="text-xs text-gray-600 mt-0.5">{student.className}</p>
                      </div>
                      <button
                        onClick={() => setExpandedStudent(expandedStudent === student.studentId ? null : student.studentId)}
                        className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition"
                      >
                        <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedStudent === student.studentId ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                          <Radio className="w-3 h-3" /> Live Best
                        </p>
                        <p className={`text-lg font-bold ${
                          student.synchronous.bestScore > 0 
                            ? student.synchronous.bestScore >= 90 ? "text-green-600" : student.synchronous.bestScore >= 75 ? "text-blue-600" : "text-yellow-600"
                            : "text-gray-400"
                        }`}>
                          {student.synchronous.bestScore > 0 ? student.synchronous.bestScore + "%" : "-"}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Self-Paced Best
                        </p>
                        <p className={`text-lg font-bold ${
                          student.asynchronous.bestScore > 0
                            ? student.asynchronous.bestScore >= 90 ? "text-green-600" : student.asynchronous.bestScore >= 75 ? "text-blue-600" : "text-yellow-600"
                            : "text-gray-400"
                        }`}>
                          {student.asynchronous.bestScore > 0 ? student.asynchronous.bestScore + "%" : "-"}
                        </p>
                      </div>
                    </div>

                    {expandedStudent === student.studentId && (
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200 animate-fade-in">
                        <div className="text-center p-2 bg-blue-50 rounded-lg">
                          <p className="text-xs text-gray-600">Overall Avg</p>
                          <p className="text-lg font-bold text-gray-800">{student.overallAvgScore}%</p>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded-lg">
                          <p className="text-xs text-gray-600">Total Points</p>
                          <p className="text-lg font-bold text-purple-700">{student.totalPoints}</p>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded-lg">
                          <p className="text-xs text-gray-600">Live Quizzes</p>
                          <p className="text-lg font-bold text-gray-800">{student.synchronous.totalQuizzes}</p>
                        </div>
                        <div className="text-center p-2 bg-yellow-50 rounded-lg">
                          <p className="text-xs text-gray-600">Self-Paced</p>
                          <p className="text-lg font-bold text-gray-800">{student.asynchronous.totalQuizzes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Tablet View */}
              <div className="hidden md:block lg:hidden overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Best Score</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Avg</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLeaderboard.map((student, idx) => (
                      <tr
                        key={student.studentId}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                        className={`hover:bg-gray-50 transition-all duration-200 animate-fade-in ${
                          student.studentId === user?.uid ? "bg-purple-50 hover:bg-purple-100" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${getRankBadge(student.rank)} transition transform hover:scale-110`}>
                            {getRankIcon(student.rank)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">
                              {student.studentName}
                              {student.studentId === user?.uid && (
                                <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">You</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">{student.className}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-3 py-1.5 rounded-lg font-bold text-sm border transition transform hover:scale-105 ${
                            getScoreColor(student.overallBestScore)
                          }`}>
                            {student.overallBestScore}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-gray-700 font-semibold text-sm">{student.overallAvgScore}%</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-purple-700 font-bold text-sm">{student.totalPoints}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}