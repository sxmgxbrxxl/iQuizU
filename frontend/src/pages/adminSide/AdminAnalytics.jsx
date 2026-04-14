import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Award,
  Activity,
  Target,
  Download,
  Loader2,
  Calendar
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { db } from '../../firebase/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { SkeletonBlock, SkeletonKeyframes } from '../../components/SkeletonLoaders';
// Colors for the charts
const COLORS = {
  primary: '#3b82f6', // blue-500
  secondary: '#64748b', // slate-500
  success: '#10b981', // green-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  info: '#8b5cf6', // violet-500
  chart: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']
};

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(true);

  // State for analytics data
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    activeQuizzes: 0,
    activeClasses: 0,
    avgScore: 0,
    completionRate: 0,
  });

  const [charts, setCharts] = useState({
    quizPerformance: [],
    studentActivity: [],
    programDistribution: [],
    subjectDistribution: [],
    teacherPerformance: [],
    engagementTrend: []
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [
        userCounts,
        quizCount,
        classCount,
        averageScore,
        compRate,
        perfTrend,
        stuActivity,
        progDist,
        subDist,
        teachPerf,
        engageTrend
      ] = await Promise.all([
        fetchUserCounts(),
        fetchQuizCount(),
        fetchClassCount(),
        fetchAverageScore(),
        fetchCompletionRate(),
        fetchQuizPerformanceTrend(),
        fetchStudentActivity(),
        fetchProgramDistribution(),
        fetchSubjectDistribution(),
        fetchTeacherPerformance(),
        fetchEngagementTrend()
      ]);

      setMetrics({
        totalStudents: userCounts.students,
        totalTeachers: userCounts.teachers,
        activeQuizzes: quizCount,
        activeClasses: classCount,
        avgScore: averageScore,
        completionRate: compRate
      });

      setCharts({
        quizPerformance: perfTrend,
        studentActivity: stuActivity,
        programDistribution: progDist,
        subjectDistribution: subDist,
        teacherPerformance: teachPerf,
        engagementTrend: engageTrend
      });

    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
    setLoading(false);
  };

  // Helper functions for data fetching (extracted for clarity)
  const fetchUserCounts = async () => {
    const usersSnapshot = await getDocs(collection(db, "users"));
    let students = 0;
    let teachers = 0;
    usersSnapshot.forEach(doc => {
      const role = doc.data().role;
      if (role === "student") students++;
      if (role === "teacher") teachers++;
    });
    return { students, teachers };
  };

  const fetchQuizCount = async () => {
    const quizzesSnapshot = await getDocs(collection(db, "quizzes"));
    let activeCount = 0;
    quizzesSnapshot.forEach(doc => {
      const status = doc.data().status;
      if (status === "published" || status === "active") activeCount++;
    });
    return activeCount;
  };

  const fetchClassCount = async () => {
    const classesSnapshot = await getDocs(collection(db, "classes"));
    let activeCount = 0;
    classesSnapshot.forEach(doc => {
      if (doc.data().status === "active") activeCount++;
    });
    return activeCount;
  };

  const fetchAverageScore = async () => {
    const submissionsSnapshot = await getDocs(collection(db, "quizSubmissions"));
    let totalScore = 0;
    let count = 0;
    submissionsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.score !== undefined && data.score !== null) {
        totalScore += data.score;
        count++;
      }
    });
    return count > 0 ? (totalScore / count).toFixed(1) : 0;
  };

  const fetchCompletionRate = async () => {
    const assignedSnapshot = await getDocs(collection(db, "assignedQuizzes"));
    let completed = 0;
    let total = assignedSnapshot.size;
    assignedSnapshot.forEach(doc => {
      if (doc.data().status === "completed") completed++;
    });
    return total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
  };

  const fetchQuizPerformanceTrend = async () => {
    const submissionsSnapshot = await getDocs(collection(db, "quizSubmissions"));
    const monthlyData = {};
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('en', { month: 'short' });
      months.push(monthKey);
      monthlyData[monthKey] = { totalScore: 0, count: 0, quizzesTaken: 0 };
    }

    submissionsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.submittedAt) {
        const submissionDate = data.submittedAt.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt);
        const monthKey = submissionDate.toLocaleString('en', { month: 'short' });

        if (monthlyData[monthKey]) {
          monthlyData[monthKey].quizzesTaken++;
          const scoreValue = data.rawScorePercentage !== undefined ? data.rawScorePercentage : data.base50ScorePercentage;
          if (scoreValue !== undefined) {
            monthlyData[monthKey].totalScore += scoreValue;
            monthlyData[monthKey].count++;
          }
        }
      }
    });

    return months.map(month => ({
      month,
      avgScore: monthlyData[month].count > 0
        ? Math.round(monthlyData[month].totalScore / monthlyData[month].count)
        : 0,
    }));
  };

  const fetchStudentActivity = async () => {
    const submissionsSnapshot = await getDocs(collection(db, "quizSubmissions"));
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const activityByDay = {};
    daysOfWeek.forEach(day => activityByDay[day] = new Set());

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    submissionsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.submittedAt) {
        const date = data.submittedAt.toDate();
        if (date >= oneWeekAgo) {
          const dayName = date.toLocaleString('en', { weekday: 'short' });
          if (activityByDay[dayName]) {
            activityByDay[dayName].add(data.studentId || data.userId);
          }
        }
      }
    });

    return daysOfWeek.map(day => ({
      day,
      active: activityByDay[day].size,
    }));
  };

  const fetchProgramDistribution = async () => {
    const studentsSnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
    const programCount = {};
    studentsSnapshot.forEach(doc => {
      const program = doc.data().program || "Others";
      programCount[program] = (programCount[program] || 0) + 1;
    });

    return Object.entries(programCount).map(([program, value], idx) => ({
      subject: program,
      value,
      color: COLORS.chart[idx % COLORS.chart.length]
    }));
  };

  const fetchSubjectDistribution = async () => {
    const classesSnapshot = await getDocs(collection(db, "classes"));
    const subjectCount = {};
    classesSnapshot.forEach(doc => {
      const subject = doc.data().subject || "Others";
      subjectCount[subject] = (subjectCount[subject] || 0) + 1;
    });

    return Object.entries(subjectCount).map(([subject, value], idx) => ({
      subject,
      value,
      color: COLORS.chart[idx % COLORS.chart.length]
    }));
  };

  const fetchTeacherPerformance = async () => {
    const submissionsSnapshot = await getDocs(collection(db, "quizSubmissions"));
    const teacherMap = {};

    submissionsSnapshot.forEach(doc => {
      const data = doc.data();
      const teacherEmail = data.teacherEmail;

      if (teacherEmail) {
        if (!teacherMap[teacherEmail]) {
          teacherMap[teacherEmail] = {
            email: teacherEmail,
            scores: [],
            quizzes: new Set(),
            students: new Set()
          };
        }

        const scoreValue = data.rawScorePercentage !== undefined ? data.rawScorePercentage : data.base50ScorePercentage;
        if (scoreValue !== undefined && scoreValue !== null) {
          teacherMap[teacherEmail].scores.push(scoreValue);
        }
        if (data.quizId) teacherMap[teacherEmail].quizzes.add(data.quizId);
        if (data.studentId) teacherMap[teacherEmail].students.add(data.studentId);
      }
    });

    return Object.values(teacherMap).map(teacher => ({
      email: teacher.email,
      quizzes: teacher.quizzes.size,
      avgScore: teacher.scores.length > 0
        ? Math.round(teacher.scores.reduce((a, b) => a + b, 0) / teacher.scores.length)
        : 0,
      students: teacher.students.size
    }));
  };

  const fetchEngagementTrend = async () => {
    // Placeholder similar logic to existing one, can be expanded if needed
    return [];
  };


  const StatCard = ({ icon: Icon, title, value, change, color, bgColor }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1 font-Poppins uppercase tracking-wide">{title}</p>
          <h3 className="text-3xl font-bold text-slate-800 font-Poppins">{value}</h3>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className={`${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`} size={16} />
              <span className={`text-sm font-semibold ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
              <span className="text-slate-400 text-xs ml-1">vs last {timeRange}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon size={24} className={color} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen font-Poppins animate-fadeIn">
      <SkeletonKeyframes />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center border border-violet-200">
                  <BarChart3 size={28} />
                </div>
                Analytics Overview
              </h1>
              <p className="text-gray-600 ml-1">Monitor system performance and user engagement</p>
            </div>

          <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {/* Time Range Selector */}
            {['week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === range
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button
              onClick={() => window.print()}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
              title="Export Report"
            >
              <Download size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          <>
            <SkeletonBlock height="120px" rounded="16px" delay={0.0} />
            <SkeletonBlock height="120px" rounded="16px" delay={0.1} />
            <SkeletonBlock height="120px" rounded="16px" delay={0.2} />
            <SkeletonBlock height="120px" rounded="16px" delay={0.3} />
          </>
        ) : (
          <>
            <StatCard
              icon={Users}
              title="Total Students"
              value={metrics.totalStudents.toLocaleString()}
              change={2.4}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <StatCard
              icon={Users}
              title="Total Teachers"
              value={metrics.totalTeachers}
              change={1.2}
              color="text-violet-600"
              bgColor="bg-violet-50"
            />
            <StatCard
              icon={BookOpen}
              title="Active Quizzes"
              value={metrics.activeQuizzes}
              change={5.3}
              color="text-emerald-600"
              bgColor="bg-emerald-50"
            />
            <StatCard
              icon={Activity}
              title="Completion Rate"
              value={`${metrics.completionRate}%`}
              change={-0.5}
              color="text-amber-600"
              bgColor="bg-amber-50"
            />
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Main Chart: Performance Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Performance Trend</h3>
              <p className="text-sm text-slate-500">Average scores over the last 6 months</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <TrendingUp size={20} className="text-slate-400" />
            </div>
          </div>

          <div className="h-[300px] w-full mt-4">
            {loading ? (
              <SkeletonBlock height="100%" rounded="12px" delay={0.4} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.quizPerformance} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAvgScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#3b82f6', fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgScore"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorAvgScore)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Side Chart: Student Activity */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Weekly Activity</h3>
              <p className="text-sm text-slate-500">Active students by day</p>
            </div>
            <Calendar size={20} className="text-slate-400" />
          </div>
          <div className="h-[300px] w-full mt-4">
            {loading ? (
              <SkeletonBlock height="100%" rounded="12px" delay={0.5} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.studentActivity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="active" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Pie Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Program Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Student Demographics</h3>
          {loading ? (
             <SkeletonBlock height="200px" rounded="12px" delay={0.6} />
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <div className="w-[200px] h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.programDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {charts.programDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {charts.programDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-600 font-medium">{item.subject}</span>
                    <span className="text-slate-900 font-bold ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Subject Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Subject Distribution</h3>
          {loading ? (
             <SkeletonBlock height="200px" rounded="12px" delay={0.7} />
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <div className="w-[200px] h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.subjectDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {charts.subjectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {charts.subjectDistribution.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-600 font-medium">{item.subject}</span>
                    <span className="text-slate-900 font-bold ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Teacher Performance Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Teacher Performance</h3>
            <p className="text-sm text-slate-500">Contribution overview</p>
          </div>
          <button className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors">View All</button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-6">
                <SkeletonBlock height="250px" rounded="12px" delay={0.8} />
             </div>
          ) : (
             <table className="w-full text-left">
               <thead className="bg-slate-50/50">
                 <tr>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Teacher</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Quizzes</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Students</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Avg Score</th>
                   <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Rating</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {charts.teacherPerformance.slice(0, 5).map((teacher, idx) => (
                   <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                     <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                           {teacher.email.charAt(0).toUpperCase()}
                         </div>
                         <span className="text-sm font-medium text-slate-700">{teacher.email}</span>
                       </div>
                     </td>
                     <td className="px-6 py-4 text-center">
                       <span className="text-slate-800 font-medium">{teacher.quizzes}</span>
                     </td>
                     <td className="px-6 py-4 text-center">
                       <span className="text-slate-800 font-medium">{teacher.students || '—'}</span>
                     </td>
                     <td className="px-6 py-4 text-center">
                       <span className="text-slate-800 font-medium">{teacher.avgScore ? `${teacher.avgScore}%` : '—'}</span>
                     </td>
                     <td className="px-6 py-4 text-center">
                       <div className="flex items-center justify-center gap-1">
                         <span className="text-slate-800 font-medium">{teacher.rating || 0}</span>
                         <span className="text-amber-400 text-lg">★</span>
                       </div>
                     </td>
                   </tr>
                 ))}
                 {charts.teacherPerformance.length === 0 && (
                   <tr>
                     <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                       No teacher data available
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}