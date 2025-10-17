import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebaseConfig"; // adjust mo path kung iba folder mo

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [quizCode, setQuizCode] = useState("");

  // 🔹 Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth); // Firebase logout
      navigate("/login"); // redirect to Login page
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  const handleJoinQuiz = () => {
    if (quizCode.trim() !== "") {
      alert(`Joining quiz with code: ${quizCode}`);
      // navigate(`/quiz/${quizCode}`);  // later when backend ready
    } else {
      alert("Please enter a quiz code.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-Quizzard">
      {/* NAVIGATION BAR */}
      <nav className="flex items-center justify-between px-8 py-4 bg-white shadow">
        <h1 className="text-2xl font-bold text-indigo-600">🎓 Student Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200"
        >
          Logout
        </button>
      </nav>

      {/* MAIN CONTENT */}
      <main className="p-8 space-y-8">
        {/* WELCOME SECTION */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Welcome back, Student!</h2>
          <p className="text-gray-600">Track your quizzes, progress, and leaderboard standings.</p>
        </section>

        {/* QUIZ ACTIONS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Join Quiz */}
          <div className="bg-white p-6 rounded-2xl shadow">
            <h3 className="text-lg font-bold mb-3 text-indigo-600">Join a Quiz</h3>
            <p className="text-sm text-gray-500 mb-4">Enter a quiz code shared by your teacher.</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter quiz code (e.g., QZ1234)"
                className="border border-gray-300 rounded-lg p-2 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={quizCode}
                onChange={(e) => setQuizCode(e.target.value)}
              />
              <button
                onClick={handleJoinQuiz}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Join
              </button>
            </div>
          </div>

          {/* My Quizzes */}
          <div className="bg-white p-6 rounded-2xl shadow">
            <h3 className="text-lg font-bold mb-3 text-indigo-600">My Quizzes</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex justify-between border-b pb-2">
                <span>Math Basics</span>
                <span className="text-green-600 font-semibold">92%</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span>Science Trivia</span>
                <span className="text-yellow-600 font-semibold">85%</span>
              </li>
              <li className="flex justify-between">
                <span>History Challenge</span>
                <span className="text-red-500 font-semibold">78%</span>
              </li>
            </ul>
          </div>

          {/* Leaderboard */}
          <div className="bg-white p-6 rounded-2xl shadow">
            <h3 className="text-lg font-bold mb-3 text-indigo-600">Leaderboard 🏆</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex justify-between border-b pb-2">
                <span>1. Jane Doe</span>
                <span className="text-green-600 font-semibold">95%</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span>2. John Smith</span>
                <span className="text-yellow-600 font-semibold">91%</span>
              </li>
              <li className="flex justify-between">
                <span>3. You</span>
                <span className="text-blue-600 font-semibold">87%</span>
              </li>
            </ul>
          </div>
        </section>

        {/* PROGRESS & ANALYTICS */}
        <section className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-lg font-bold mb-3 text-indigo-600">Progress Tracking 📊</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <span className="text-3xl font-bold text-indigo-600">18</span>
              <p className="text-gray-600">Total Quizzes Taken</p>
            </div>
            <div>
              <span className="text-3xl font-bold text-indigo-600">87%</span>
              <p className="text-gray-600">Average Score</p>
            </div>
            <div>
              <span className="text-3xl font-bold text-indigo-600">5</span>
              <p className="text-gray-600">Badges Earned</p>
            </div>
          </div>
        </section>

        {/* FEEDBACK SECTION */}
        <section className="bg-white p-6 rounded-2xl shadow">
          <h3 className="text-lg font-bold mb-3 text-indigo-600">Results & Feedback 💡</h3>
          <p className="text-gray-600 mb-4">
            Here’s what you can improve based on your past quizzes:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>Focus on improving “HOTS” type questions in Math.</li>
            <li>Review Science chapters on “Force & Motion.”</li>
            <li>Continue your great performance in General Knowledge!</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
