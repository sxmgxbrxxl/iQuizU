import { useState } from "react";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function PasswordConfirmModal({ 
  isOpen, 
  studentCount, 
  onConfirm, 
  onCancel 
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }
    setError("");
    onConfirm(password);
  };

  const handleCancel = () => {
    setPassword("");
    setError("");
    setShowPassword(false);
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] font-Outfit">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-6 h-6" />
            <h2 className="text-xl font-bold">Confirm Account Creation</h2>
          </div>
          <p className="text-green-50 text-sm">
            Create accounts for {studentCount} student{studentCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              Account Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">📧 Email:</span>
                <span className="font-medium text-gray-800">From Classlist</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">🔑 Default Password:</span>
                <span className="font-mono font-semibold text-gray-800">123456</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">👤 Login Method:</span>
                <span className="font-medium text-gray-800">Student Number</span>
              </div>
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Enter Your Password to Continue
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Enter your teacher password"
                className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition ${
                  error 
                    ? "border-red-300 focus:border-red-500" 
                    : "border-gray-300 focus:border-green-500"
                }`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {error && (
              <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-teal-600 transition shadow-lg hover:shadow-xl"
            >
              Create Accounts
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}