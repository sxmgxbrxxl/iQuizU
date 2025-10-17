import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

export default function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("student"); // default student
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      // Save user profile to Firestore 'users' collection
      await setDoc(doc(db, "users", uid), {
        email,
        displayName,
        role,
        createdAt: new Date().toISOString(),
      });

      // Redirect based on role
      if (role === "teacher") navigate("/teacherdashboard");
      else navigate("/studentdashboard");
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Create an account</h2>

        {error && <div className="mb-4 text-red-600">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1">Full name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded"
              placeholder="Juan Dela Cruz"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              className="w-full px-3 py-2 border rounded"
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              className="w-full px-3 py-2 border rounded"
              placeholder="Choose a strong password"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          <button className="w-full bg-primary text-white py-2 rounded font-bold" type="submit">Sign up</button>
        </form>

        <p className="mt-4 text-center">
          Already have an account? <Link to="/login" className="text-primary font-bold">Log in</Link>
        </p>
      </div>
    </div>
  );
}
