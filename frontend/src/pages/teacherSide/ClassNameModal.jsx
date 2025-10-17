import { useState } from "react";

export default function ClassNameModal({ 
  isOpen, 
  defaultName, 
  onConfirm, 
  onCancel 
}) {
  const [classNameInput, setClassNameInput] = useState(defaultName || "");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!classNameInput.trim()) {
      alert("❌ Please enter a class name!");
      return;
    }
    onConfirm(classNameInput.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Enter Class Name</h3>
        <p className="text-gray-600 mb-4">
          Please enter a name for this class:
        </p>
        <input
          type="text"
          value={classNameInput}
          onChange={(e) => setClassNameInput(e.target.value)}
          placeholder="e.g., CS101-A, Math 2024, English 101"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleConfirm();
            }
          }}
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Create Class
          </button>
        </div>
      </div>
    </div>
  );
}