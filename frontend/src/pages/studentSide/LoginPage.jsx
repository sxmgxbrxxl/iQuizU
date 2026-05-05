import React, { useState } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "../../firebase/firebaseConfig";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ChevronLeft, X, Eye, EyeOff } from "lucide-react";
import LOGO from "../../assets/iQuizU.svg"

export default function LoginPage() {
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setRecoveryMessage("");
    setLoading(true);

    try {
      const input = loginInput.trim();
      let userEmail = "";
      let userRole = null;
      let userAuthUID = null;

      if (input.includes("@")) {
        const usersRef = collection(db, "users");
        let q = query(usersRef, where("email", "==", input.toLowerCase()));
        let snapshot = await getDocs(q);

        if (!snapshot.empty) {
          userEmail = snapshot.docs[0].data().email;
          userRole = snapshot.docs[0].data().role;
          userAuthUID = snapshot.docs[0].id;
        } else {
          q = query(usersRef, where("emailAddress", "==", input.toLowerCase()));
          snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const userData = snapshot.docs[0].data();
            userEmail = userData.emailAddress;
            userRole = userData.role;
            userAuthUID = userData.authUID || snapshot.docs[0].id;

            if (!userData.hasAccount) {
              setError("Your account hasn't been created yet. Please contact your teacher.");
              setLoading(false);
              return;
            }
          } else {
            setError("Account not found. Please check your email.");
            setLoading(false);
            return;
          }
        }
      } else {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentNo", "==", input));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("Student number not found. Please check your student number.");
          setLoading(false);
          return;
        }

        const userData = snapshot.docs[0].data();
        userEmail = userData.emailAddress;
        userRole = userData.role;
        userAuthUID = userData.authUID || snapshot.docs[0].id;

        if (!userEmail) {
          setError("No email address found for this student. Please contact your teacher.");
          setLoading(false);
          return;
        }

        if (!userData.hasAccount) {
          setError("Your account hasn't been created yet. Please contact your teacher.");
          setLoading(false);
          return;
        }
      }

      // ─── LOGIN TIME FRAME RESTRICTION FOR STUDENTS ───
      if (userRole === "student" && userAuthUID) {
        const assignedRef = collection(db, "assignedQuizzes");
        const q = query(assignedRef, where("studentId", "==", userAuthUID));
        const assignedSnap = await getDocs(q);

        const now = new Date();
        const EARLY_ACCESS_MINUTES = 10;
        const LATE_ENTRY_MINUTES = 15;

        let hasInProgressQuiz = false;
        let hasPendingQuizzes = false;
        let isBlockedByUpcomingQuiz = false;
        let hasQuizInWindow = false;
        let nextQuizTime = null;

        assignedSnap.forEach((docSnap) => {
          const data = docSnap.data();
          // Skip completed quizzes or synchronous quizzes that have been ended by the teacher
          if (data.completed || data.sessionStatus === "ended") return;

          hasPendingQuizzes = true;

          // If the student has already started a quiz, always allow login to resume
          if (data.status === "in_progress") {
            hasInProgressQuiz = true;
            return;
          }

          // Check if quiz has a startDate (use trim to catch empty strings)
          const hasStartDate = data.startDate && data.startDate.toString().trim() !== "";
          const hasDueDate = data.dueDate && data.dueDate.toString().trim() !== "";

          // Grace period controls late entry window after start time
          const gracePeriodMinutes = data.settings?.gracePeriod || 0;
          const lateEntryMinutes = gracePeriodMinutes > 0 ? gracePeriodMinutes : LATE_ENTRY_MINUTES;

          if (hasStartDate) {
            const startDate = new Date(data.startDate);
            const earlyAccessTime = new Date(startDate.getTime() - EARLY_ACCESS_MINUTES * 60000);
            const lateEntryTime = new Date(startDate.getTime() + lateEntryMinutes * 60000);

            if (now < earlyAccessTime) {
              // Quiz hasn't reached early access yet — BLOCK login
              isBlockedByUpcomingQuiz = true;
              if (!nextQuizTime || startDate < nextQuizTime) {
                nextQuizTime = startDate;
              }
            } else if (now >= earlyAccessTime && now <= lateEntryTime) {
              // Within the access window — allow
              hasQuizInWindow = true;
            }
            // else: past late entry — missed it, doesn't block or allow
          } else if (hasDueDate) {
            // Quiz has a due date but no start date — allow if not expired
            const dueDate = new Date(data.dueDate);
            if (now <= dueDate) {
              hasQuizInWindow = true;
            }
          } else {
            // No startDate AND no dueDate — allow (edge case)
            hasQuizInWindow = true;
          }
        });

        // Determine if student can login:
        // 1. If they have an in-progress quiz → always allow (to resume)
        // 2. If blocked by an upcoming quiz → DENY (even if other quizzes are accessible)
        // 3. If a quiz is in its access window and no blocking quiz → allow
        // 4. If no pending quizzes → allow (to check dashboard/records)
        let canLogin = false;

        if (hasInProgressQuiz) {
          canLogin = true;
        } else if (!hasPendingQuizzes) {
          canLogin = true;
        } else if (isBlockedByUpcomingQuiz) {
          canLogin = false;
        } else if (hasQuizInWindow) {
          canLogin = true;
        }

        if (!canLogin) {
          if (nextQuizTime) {
            const earlyTime = new Date(nextQuizTime.getTime() - EARLY_ACCESS_MINUTES * 60000);
            const isToday = nextQuizTime.toDateString() === now.toDateString();
            const dayString = isToday ? "today" : "on " + nextQuizTime.toLocaleDateString();
            
            setError(`You have an upcoming quiz scheduled ${dayString} at ${nextQuizTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. You can log in 10 minutes early (starting at ${earlyTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`);
          } else {
            setError("You don't have any available quizzes to take at this time. Please wait for your scheduled quiz window.");
          }
          setLoading(false);
          return;
        }
      }

      await signInWithEmailAndPassword(auth, userEmail, password);
    } catch (err) {
      console.error("Login error:", err);

      switch (err.code) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
          setError("Invalid password. Please try again.");
          break;
        case "auth/user-not-found":
          setError("Account not found.");
          break;
        case "auth/too-many-requests":
          setError("Too many attempts. Try again later or reset your password.");
          break;
        case "auth/user-disabled":
          setError("This account has been disabled.");
          break;
        case "auth/network-request-failed":
          setError("Network error. Please check your connection.");
          break;
        default:
          setError("Login failed. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleRecoverAccount = async () => {
    setError("");
    setRecoveryMessage("");

    const trimmedInput = recoveryEmail.trim();

    if (!trimmedInput) {
      setError("Please enter your email or student number first.");
      return;
    }

    setRecoveryLoading(true);

    try {
      let emailToSend = "";

      if (trimmedInput.includes("@")) {
        const usersRef = collection(db, "users");
        let q = query(usersRef, where("email", "==", trimmedInput.toLowerCase()));
        let snapshot = await getDocs(q);

        if (!snapshot.empty) {
          emailToSend = snapshot.docs[0].data().email;
        } else {
          q = query(usersRef, where("emailAddress", "==", trimmedInput.toLowerCase()));
          snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const userData = snapshot.docs[0].data();

            if (userData.hasAccount === false) {
              setError("Your account hasn't been created yet. Please contact your teacher.");
              setRecoveryLoading(false);
              return;
            }

            emailToSend = userData.emailAddress;
          } else {
            setError("No account found with this email.");
            setRecoveryLoading(false);
            return;
          }
        }
      } else {
        // Student number input
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("studentNo", "==", trimmedInput));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("No account found with this student number.");
          setRecoveryLoading(false);
          return;
        }

        const userData = snapshot.docs[0].data();
        emailToSend = userData.emailAddress;

        if (!emailToSend) {
          setError("No email address found for this account.");
          setRecoveryLoading(false);
          return;
        }

        if (userData.hasAccount === false) {
          setError("Your account hasn't been created yet. Please contact your teacher.");
          setRecoveryLoading(false);
          return;
        }
      }

      await sendPasswordResetEmail(auth, emailToSend);
      setRecoveryMessage(`✓ Password reset link sent to ${emailToSend}. Please check your spam/junk folder.`);
      setRecoveryEmail("");

      // Auto close modal after 5 seconds on success
      setTimeout(() => {
        handleCloseRecoveryModal();
      }, 5000);
    } catch (err) {
      console.error("Recovery error:", err);

      switch (err.code) {
        case "auth/user-not-found":
          setError("No account found.");
          break;
        case "auth/invalid-email":
          setError("Invalid email format.");
          break;
        case "auth/too-many-requests":
          setError("Too many requests. Please try again later.");
          break;
        default:
          setError("Failed to send recovery email. Please try again later.");
      }
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleOpenRecoveryModal = () => {
    setError("");
    setRecoveryMessage("");
    setRecoveryEmail("");
    setShowRecoveryModal(true);
  };

  const handleCloseRecoveryModal = () => {
    setShowRecoveryModal(false);
    setError("");
    setRecoveryMessage("");
    setRecoveryEmail("");
  };

  return (
    <div className="bg-gradient-to-b from-background via-background to-green-200 relative h-screen w-full flex items-center justify-center font-Poppins px-6">
      {/* Back button */}
      <Link
        to="/"
        className="flex flex-row items-center justify-center absolute top-6 left-4 md:top-10 md:left-10 text-black bg-components px-6 py-4 rounded-full shadow-md transition transform duration-200 ease-out hover:scale-105 active:scale-95 motion-reduce:transform-none hover:shadow-lg font-bold"
      >
        <ChevronLeft className="w-5 h-5 mr-2" />
        Back
      </Link>

      {/* Login Card */}
      <div className="bg-components p-10 rounded-3xl shadow-lg w-full max-w-md border-2 border-green-200">
        <form onSubmit={handleSubmit}>
          <img src={LOGO} alt="Logo" className="h-16 w-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-6 text-center">Log In to iQuizU</h2>

          {error && (
            <div className="mb-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {recoveryMessage && (
            <div className="mb-4 text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg p-3">
              {recoveryMessage}
            </div>
          )}

          {/* Login Identifier */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="loginInput">
              Student Number or Email
            </label>
            <input
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              type="text"
              id="loginInput"
              placeholder="Enter your student number or email"
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          {/* Password Field */}
          <div className="mb-2">
            <label className="block text-gray-700 mb-2" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter your password"
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right mb-4">
            <button
              type="button"
              onClick={handleOpenRecoveryModal}
              className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            className="w-full bg-button text-white py-2 rounded-lg hover:bg-secondary  duration-200 transform transition-transform ease-out hover:scale-105 active:scale-95 motion-reduce:transform-none font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Logging in...
              </>
            ) : (
              "Log In"
            )}
          </button>
        </form>
      </div>

      {/* Password Recovery Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4 overflow-y-auto" animate-overlayFade>
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl my-auto animate-popIn">
            {/* Close button */}
            <button
              onClick={handleCloseRecoveryModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              disabled={recoveryLoading}
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-bold mb-2">Recover Your Account</h3>
            <p className="text-sm text-gray-600 mb-6">
              Enter your email or student number and we'll send you a password reset link.
            </p>

            {error && (
              <div className="mb-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}

            {recoveryMessage && (
              <div className="mb-4 text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg p-3">
                {recoveryMessage}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Email or Student Number
              </label>
              <input
                type="text"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="e.g., 2024-001 or student@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                disabled={recoveryLoading}
                autoComplete="username"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleRecoverAccount}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 duration-200 font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                disabled={recoveryLoading || !recoveryEmail.trim()}
              >
                {recoveryLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
              <button
                onClick={handleCloseRecoveryModal}
                className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg hover:bg-gray-400 duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                disabled={recoveryLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}