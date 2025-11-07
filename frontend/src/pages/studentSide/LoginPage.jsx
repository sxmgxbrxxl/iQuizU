import React, { useState } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "../../firebase/firebaseConfig";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ChevronLeft, X } from "lucide-react";
import LOGO from "../../assets/iQuizU.svg"

export default function LoginPage() {
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
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

      if (input.includes("@")) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", input.toLowerCase()));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("Account not found. Please check your email.");
          setLoading(false);
          return;
        }

        userEmail = snapshot.docs[0].data().email;
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
        const q = query(usersRef, where("email", "==", trimmedInput.toLowerCase()));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("No account found with this email.");
          setRecoveryLoading(false);
          return;
        }

        emailToSend = snapshot.docs[0].data().email;
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
      }

      await sendPasswordResetEmail(auth, emailToSend);
      setRecoveryMessage(`✓ Password reset link sent to ${emailToSend}`);
      setRecoveryEmail("");
      
      // Auto close modal after 3 seconds on success
      setTimeout(() => {
        handleCloseRecoveryModal();
      }, 3000);
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
    <div className="bg-background relative h-screen w-full flex items-center justify-center font-Outfit">
      {/* Back button */}
      <Link
        to="/"
        className="flex flex-row items-center justify-center absolute top-10 left-10 text-black bg-components px-6 py-4 rounded-full shadow-md transition transform duration-200 ease-out hover:scale-105 active:scale-95 motion-reduce:transform-none hover:shadow-lg font-bold"
      >
        <ChevronLeft className="w-5 h-5 mr-2"/>
        Back
      </Link>

      {/* Login Card */}
      <div className="bg-components p-10 rounded-3xl shadow-lg w-96">
        <form onSubmit={handleSubmit}>
          <img src={LOGO} alt="Logo" className="h-16 w-16 mx-auto mb-4 rounded-full outline-dotted outline-accent"/>
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
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              type="password"
              id="password"
              placeholder="Enter your password"
              required
              disabled={loading}
              autoComplete="current-password"
            />
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
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4 overflow-y-auto">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl my-auto">
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
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 duration-200 font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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