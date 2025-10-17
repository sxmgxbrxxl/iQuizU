import React, { useState } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "../../firebase/firebaseConfig";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function LoginPage() {
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");

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

    const trimmedInput = loginInput.trim();

    if (!trimmedInput) {
      setError("Please enter your email or student number first.");
      return;
    }

    setLoading(true);

    try {
      let emailToSend = "";

      if (trimmedInput.includes("@")) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", trimmedInput.toLowerCase()));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("No account found with this email.");
          setLoading(false);
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
          setLoading(false);
          return;
        }

        const userData = snapshot.docs[0].data();
        emailToSend = userData.emailAddress;

        if (!emailToSend) {
          setError("No email address found for this account.");
          setLoading(false);
          return;
        }
      }

      await sendPasswordResetEmail(auth, emailToSend);
      setRecoveryMessage(`Password reset link sent to ${emailToSend}`);
      setShowRecoveryModal(false);
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
      setLoading(false);
    }
  };

  const handleOpenRecoveryModal = () => {
    setError("");
    setRecoveryMessage("");
    setShowRecoveryModal(true);
  };

  const handleCloseRecoveryModal = () => {
    setShowRecoveryModal(false);
    setError("");
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center font-Quizzard bg-gradient-to-br from-secondary to-primary">
      {/* Back button */}
      <Link
        to="/"
        className="absolute top-10 left-10 text-black bg-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 font-bold"
      >
        Back
      </Link>

      {/* Login Card */}
      <div className="bg-white p-10 rounded-xl shadow-lg w-96">
        <form onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold mb-6 text-center">Log In to Quizzard</h2>

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
            className="w-full bg-primary text-white py-2 rounded-lg hover:bg-secondary transition-colors duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-xl w-80 shadow-xl">
            <h3 className="text-lg font-bold mb-3">Recover Account</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your email or student number. We'll send a password reset link to your registered email.
            </p>
            
            {error && (
              <div className="mb-3 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-2">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleRecoverAccount}
                className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-secondary transition-colors duration-200 font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Send Link"
                )}
              </button>
              <button
                onClick={handleCloseRecoveryModal}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400 transition-colors duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
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