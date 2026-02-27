import { useState } from "react";
import { AlertCircle } from "lucide-react";

export default function ClassNameModal({
  isOpen,
  defaultName,
  onConfirm,
  onCancel
}) {
  const [classNameInput, setClassNameInput] = useState(defaultName || "");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!classNameInput.trim()) {
      setError("Please enter a class name!");
      return;
    }
    setError("");
    onConfirm(classNameInput.trim());
  };

  return (
    <div className="font-Outfit fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 mx-4 animate-slideUp">
        <h3 className="text-xl font-bold text-title">Enter Class Name</h3>
        <p className="text-subtext mb-4">
          Please enter a name for this class:
        </p>
        <input
          type="text"
          value={classNameInput}
          onChange={(e) => {
            setClassNameInput(e.target.value);
            if (error) setError("");
          }}
          placeholder="e.g., CS101-A, Math 2024, English 101"
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 transition-colors ${error ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleConfirm();
            }
          }}
          autoFocus
        />

        {/* Custom Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm mb-4 animate-fadeIn">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}
        {!error && <div className="mb-4" />}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg active:scale-95 hover:scale-105 duration-200 hover:bg-gray-50 transition font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg active:scale-95 hover:scale-105 duration-200 hover:bg-blue-700 transition font-semibold"
          >
            Create Class
          </button>
        </div>
      </div>
    </div>
  );
}