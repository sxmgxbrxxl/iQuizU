import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Upload, Loader2, CircleCheck, AlertCircle, X, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

// Class Confirmation Modal Component
function ClassConfirmationModal({ isOpen, classInfo, students, onConfirm, onCancel }) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsConfirming(true);
    await onConfirm();
    setIsConfirming(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="text-xl font-bold text-gray-800">Confirm Class Information</h3>
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Class Information */}
          <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
            <h4 className="font-bold text-lg text-blue-900 mb-4">📚 Class Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-blue-700 font-semibold mb-1">Class No.</p>
                <p className="text-base text-gray-800 font-medium">{classInfo.classNo || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-blue-700 font-semibold mb-1">Code</p>
                <p className="text-base text-gray-800 font-medium">{classInfo.code || "N/A"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-blue-700 font-semibold mb-1">Description</p>
                <p className="text-base text-gray-800 font-medium">{classInfo.description || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Student List */}
          <div className="mb-4">
            <h4 className="font-bold text-lg text-gray-800 mb-3">
              👥 Students ({students.length})
            </h4>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">No</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Student No.</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Gender</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Program</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Year</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.slice(0, 10).map((student, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{student.No || index + 1}</td>
                        <td className="px-4 py-3 text-gray-700">{student["Student No."]}</td>
                        <td className="px-4 py-3 text-gray-700 font-medium">{student.Name}</td>
                        <td className="px-4 py-3 text-gray-700">{student.Gender}</td>
                        <td className="px-4 py-3 text-gray-700">{student.Program}</td>
                        <td className="px-4 py-3 text-gray-700">{student.Year}</td>
                        <td className="px-4 py-3 text-gray-700 text-xs">{student["Email Address"]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {students.length > 10 && (
                <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 text-center">
                  ... and {students.length - 10} more students
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end bg-gray-50">
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="px-6 py-2.5 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Confirm & Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManageClasses() {
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingUploadData, setPendingUploadData] = useState(null);
  const [classCount, setClassCount] = useState(2); // Demo value
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Custom Alert Dialog state
  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    onClose: null,
  });

  const showAlert = (type, title, message, onClose = null) => {
    setAlertDialog({ isOpen: true, type, title, message, onClose });
  };

  const closeAlert = () => {
    const cb = alertDialog.onClose;
    setAlertDialog({ isOpen: false, type: "info", title: "", message: "", onClose: null });
    if (cb) cb();
  };

  const MAX_CLASSES = 8;

  useEffect(() => {
    setMounted(true);
  }, []);

  const extractClassInfo = (allData) => {
    let classNo = "";
    let code = "";
    let description = "";

    // Search through the first 15 rows for class information
    for (let i = 0; i < Math.min(15, allData.length); i++) {
      const row = allData[i];
      if (!row || row.length === 0) continue;

      // Convert row to string for searching
      const rowStr = Array.isArray(row) ? row.join('|').toLowerCase() : '';

      // Look for Class No
      if (rowStr.includes('class no')) {
        const classNoIndex = row.findIndex(cell =>
          cell && cell.toString().toLowerCase().includes('class no')
        );
        if (classNoIndex !== -1 && row[classNoIndex + 1]) {
          classNo = row[classNoIndex + 1].toString().trim();
        }
      }

      // Look for Code
      if (rowStr.includes('code:') || (rowStr.includes('code') && !rowStr.includes('postal'))) {
        const codeIndex = row.findIndex(cell =>
          cell && cell.toString().toLowerCase() === 'code:'
        );
        if (codeIndex !== -1 && row[codeIndex + 1]) {
          code = row[codeIndex + 1].toString().trim();
        }
      }

      // Look for Description
      if (rowStr.includes('description')) {
        const descIndex = row.findIndex(cell =>
          cell && cell.toString().toLowerCase().includes('description')
        );
        if (descIndex !== -1 && row[descIndex + 1]) {
          description = row[descIndex + 1].toString().trim();
        }
      }
    }

    console.log("Extracted class info:", { classNo, code, description });
    return { classNo, code, description };
  };

  const handleDemoUpload = () => {
    // Demo data simulating the uploaded Excel file
    const demoStudents = [
      {
        "No": "1",
        "Student No.": "251-1234",
        "Name": "DELA CRUZ, JOA ANDREW FEDERIS",
        "Gender": "Male",
        "Program": "BSIT-BA",
        "Year": "1st",
        "Email Address": "sample@gmail.com",
        "Contact No.": "946502456"
      }
    ];

    const demoAllData = [
      ["", "", "LAGUNA UNIVERSITY"],
      ["", "", "Laguna Sports Complex, Bubukal, Santa Cruz, Laguna"],
      ["", "", "CLASS LIST"],
      ["Semester:", "1st Semester", "", "", "", "Date Downloaded:", "September 17, 2025 @ 8:29 am"],
      ["Academic Year:", "2025-2026", "", "", "", "Units:", "3"],
      ["Class No:", "574", "", "", "", "Day:", "Saturday / Wednesday"],
      ["Code:", "CC 1101", "", "", "", "Time:", "1:00-4:00 / 12:00-2:00"],
      ["Description:", "Computer Programming 1 (Fundamentals of Programming)", "", "", "", "Room:", "NB 307 / AV 407b"],
      ["Instructor:", "Bea May Belarmino"],
      [],
      ["No", "Student No.", "Name", "Gender", "Program", "Year", "Email Address", "Contact No."],
      ["1", "251-1234", "DELA CRUZ, JOA ANDREW FEDERIS", "Male", "BSIT-BA", "1st", "sample@gmail.com", "946502456"]
    ];

    const classInfo = extractClassInfo(demoAllData);

    setPendingUploadData({
      validStudents: demoStudents,
      file: { name: "Class 1 - Sample.xlsx" },
      classInfo
    });
    setShowConfirmationModal(true);
  };

  const confirmAndUpload = async () => {
    setShowConfirmationModal(false);
    setUploading(true);
    setUploadProgress("Starting upload...");

    try {
      const { validStudents, classInfo } = pendingUploadData;

      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUploadProgress(`Creating class: ${classInfo.description}`);

      await new Promise(resolve => setTimeout(resolve, 1000));
      setUploadProgress(`Processing students...`);

      await new Promise(resolve => setTimeout(resolve, 1500));

      setUploadCount(validStudents.length);

      showAlert("success", "Upload Complete!", `Class created successfully!\nClass No: ${classInfo.classNo}\nCode: ${classInfo.code}\nStudents: ${validStudents.length}`);

      setFileName("");
      setUploadProgress("");
      setPendingUploadData(null);
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage(error.message);
      showAlert("error", "Upload Failed", "Failed to upload data: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  const cancelConfirmation = () => {
    setShowConfirmationModal(false);
    setPendingUploadData(null);
    setFileName("");
  };

  return (
    <div className="px-2 py-6 md:p-8 font-sans animate-fadeIn min-h-screen bg-gray-50">
      <div className="flex flex-col mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          Add New Class
        </h2>
        <p className="text-md font-light text-gray-600">
          Upload a classlist to create a new class ({classCount}/{MAX_CLASSES} classes)
        </p>
      </div>

      {!isLimitReached && classCount >= MAX_CLASSES - 2 && (
        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-yellow-800 font-semibold">Approaching Class Limit</p>
            <p className="text-yellow-700 text-sm mt-1">
              You have {classCount} out of {MAX_CLASSES} classes. You can add {MAX_CLASSES - classCount} more class{MAX_CLASSES - classCount !== 1 ? 'es' : ''}.
            </p>
          </div>
        </div>
      )}

      <div className="border-2 border-dashed rounded-3xl p-10 border-gray-300 bg-white">
        <div className="text-center">
          <Upload className="mx-auto w-10 h-10 mb-3 text-gray-400" />
          <p className="mb-3 text-gray-600">
            Upload your classlist (.csv or .xlsx)
          </p>
          <p className="text-sm mb-3 text-gray-600">
            The system will automatically extract: Class No., Code, and Description
          </p>
          <p className="text-xs mb-5 text-gray-500">
            Required columns: No, Student No., Name, Gender, Program, Year, Email Address, Contact No.
          </p>

          <button
            onClick={handleDemoUpload}
            disabled={uploading}
            className={`px-6 py-3 font-semibold rounded-lg transition ${uploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700 hover:scale-105 active:scale-95'
              }`}
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </span>
            ) : (
              "Try Demo Upload"
            )}
          </button>

          {uploadProgress && uploading && (
            <p className="text-sm text-blue-500 font-medium mt-3">
              {uploadProgress}
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-semibold text-center">
              ❌ {errorMessage}
            </p>
          </div>
        )}

        {uploadCount > 0 && !uploading && !errorMessage && (
          <div className="flex items-center justify-center mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="flex flex-row gap-2 text-base items-center text-green-600 font-semibold text-center">
              <CircleCheck className="w-4 h-4 text-green-600" /> Successfully processed {uploadCount} student(s)!
            </p>
          </div>
        )}
      </div>

      {mounted && createPortal(
        <ClassConfirmationModal
          isOpen={showConfirmationModal}
          classInfo={pendingUploadData?.classInfo || {}}
          students={pendingUploadData?.validStudents || []}
          onConfirm={confirmAndUpload}
          onCancel={cancelConfirmation}
        />,
        document.body
      )}

      {/* Custom Alert Dialog */}
      {alertDialog.isOpen && (
        <div className="font-Outfit fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-slideUp">
            <div className="flex flex-col items-center text-center">
              <div className={`p-4 rounded-full flex items-center justify-center mb-4 ${alertDialog.type === "success" ? "bg-green-100" :
                alertDialog.type === "error" ? "bg-red-100" :
                  alertDialog.type === "warning" ? "bg-orange-100" :
                    "bg-blue-100"
                }`}>
                {alertDialog.type === "success" && <CheckCircle2 className="text-green-600" size={32} />}
                {alertDialog.type === "error" && <XCircle className="text-red-600" size={32} />}
                {alertDialog.type === "warning" && <AlertTriangle className="text-orange-600" size={32} />}
                {alertDialog.type === "info" && <Info className="text-blue-600" size={32} />}
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-2">{alertDialog.title}</h3>
              <p className="text-gray-500 text-sm whitespace-pre-line leading-relaxed px-2">
                {alertDialog.message}
              </p>

              <button
                onClick={closeAlert}
                className={`w-full mt-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide active:scale-95 hover:scale-105 duration-200 transition shadow-lg ${alertDialog.type === "success" ? "bg-green-600 text-white hover:bg-green-700 shadow-green-200" :
                  alertDialog.type === "error" ? "bg-red-600 text-white hover:bg-red-700 shadow-red-200" :
                    alertDialog.type === "warning" ? "bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200" :
                      "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                  }`}
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}