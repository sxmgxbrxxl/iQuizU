import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Upload, Loader2, CircleCheck, AlertCircle, X, CheckCircle2, XCircle, AlertTriangle, Info, FileSpreadsheet, Download, FileText, HelpCircle } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { auth, db } from "../../firebase/firebaseConfig";
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

// ─── Semester normalization ───────────────────────────────────────────────────
// Accepts any reasonable variant from an uploaded file and maps it to one of
// the three canonical values used throughout the app.
const SEMESTER_CANONICAL = {
  // 1st Semester variants
  "1st semester": "1st Semester",
  "first semester": "1st Semester",
  "1st sem": "1st Semester",
  "sem 1": "1st Semester",
  "semester 1": "1st Semester",
  "1": "1st Semester",

  // 2nd Semester variants
  "2nd semester": "2nd Semester",
  "second semester": "2nd Semester",
  "2nd sem": "2nd Semester",
  "sem 2": "2nd Semester",
  "semester 2": "2nd Semester",
  "2": "2nd Semester",

  // Short Term Semester variants
  "short term semester": "Short Term Semester",
  "short term": "Short Term Semester",
  "shortterm": "Short Term Semester",
  "short term sem": "Short Term Semester",
  "summer": "Short Term Semester",
  "summer semester": "Short Term Semester",
  "summer sem": "Short Term Semester",
  "midyear": "Short Term Semester",
  "mid-year": "Short Term Semester",
  "midyear semester": "Short Term Semester",
  "short": "Short Term Semester",
};

/**
 * Normalize a raw semester string from an uploaded file to one of:
 *   "1st Semester" | "2nd Semester" | "Short Term Semester"
 * Returns the original trimmed string if no canonical match is found
 * (so partial / unknown values are still shown to the user).
 */
function normalizeSemester(raw) {
  if (!raw) return "";
  const key = raw.toString().trim().toLowerCase().replace(/\s+/g, " ");
  return SEMESTER_CANONICAL[key] ?? raw.toString().trim();
}

// ─── Class Confirmation Modal ─────────────────────────────────────────────────
function ClassConfirmationModal({ isOpen, classInfo, students, onConfirm, onCancel }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { setCurrentPage(1); }, [students]);

  if (!isOpen) return null;

  const totalPages   = Math.ceil(students.length / itemsPerPage);
  const startIndex   = (currentPage - 1) * itemsPerPage;
  const currentStudents = students.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    await onConfirm();
    setIsConfirming(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-overlayFade font-Poppins">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-popIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="text-xl font-bold text-gray-800">Confirm Class Information</h3>
          <button onClick={onCancel} disabled={isConfirming} className="p-2 hover:bg-gray-200 rounded-lg transition">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Class Information */}
          <div className="mb-4 bg-blue-50/50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-bold text-base text-blue-900 mb-2 flex items-center gap-2">
              📚 Class Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-blue-700 font-semibold mb-0.5">Class No.</p>
                <p className="text-sm text-gray-800 font-medium">{classInfo.classNo || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-blue-700 font-semibold mb-0.5">Code</p>
                <p className="text-sm text-gray-800 font-medium">{classInfo.code || "N/A"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-blue-700 font-semibold mb-0.5">Description</p>
                <p className="text-sm text-gray-800 font-medium truncate" title={classInfo.description}>
                  {classInfo.description || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-700 font-semibold mb-0.5">Semester</p>
                {/* Show normalized value + badge when it differs from raw */}
                <p className="text-sm text-gray-800 font-medium flex items-center gap-1.5">
                  {classInfo.semester || "N/A"}
                  {classInfo.semesterRaw && classInfo.semesterRaw !== classInfo.semester && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold leading-none">
                      normalized
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-700 font-semibold mb-0.5">Academic Year</p>
                <p className="text-sm text-gray-800 font-medium">{classInfo.academicYear || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Student List */}
          <div className="mb-4">
            <h4 className="font-bold text-lg text-gray-800 mb-3">👥 Students ({students.length})</h4>
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
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
                    {currentStudents.map((student, index) => (
                      <tr key={startIndex + index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{student.No || startIndex + index + 1}</td>
                        <td className="px-4 py-3 text-gray-700">{student["Student No."]}</td>
                        <td className="px-4 py-3 text-gray-700 font-medium">{student.Name}</td>
                        <td className="px-4 py-3 text-gray-700">{student.Gender}</td>
                        <td className="px-4 py-3 text-gray-700">{student.Program}</td>
                        <td className="px-4 py-3 text-gray-700">{student.Year}</td>
                        <td className="px-4 py-3 text-gray-700 text-xs">{student["Email Address"]}</td>
                      </tr>
                    ))}
                    {currentStudents.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No students found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, students.length)} of {students.length} entries
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
                      .map((page, index, array) => {
                        const prevPage = array[index - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;
                        return (
                          <div key={page} className="flex items-center">
                            {showEllipsis && <span className="mr-1 text-gray-400">...</span>}
                            <button
                              onClick={() => handlePageChange(page)}
                              className={`w-8 h-8 flex items-center justify-center rounded-md text-sm ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                            >
                              {page}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
              <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
            ) : (
              "Confirm & Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ManageClasses() {
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingUploadData, setPendingUploadData] = useState(null);
  const [classCount, setClassCount] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  const authRef = useRef(null);
  const MAX_CLASSES = 8;

  const [alertDialog, setAlertDialog] = useState({
    isOpen: false, type: "info", title: "", message: "", onClose: null,
  });

  const [updateConfirmDialog, setUpdateConfirmDialog] = useState({
    isOpen: false, duplicate: null, validStudents: null, file: null, classInfo: null
  });

  const showAlert = (type, title, message, onClose = null) => {
    setAlertDialog({ isOpen: true, type, title, message, onClose });
  };

  const closeAlert = () => {
    const cb = alertDialog.onClose;
    setAlertDialog({ isOpen: false, type: "info", title: "", message: "", onClose: null });
    if (cb) cb();
  };

  const handleCancelUpdate = () => {
    setUpdateConfirmDialog({ isOpen: false, duplicate: null, validStudents: null, file: null, classInfo: null });
    setFileName("");
  };

  const handleConfirmUpdate = () => {
    const { duplicate, validStudents, file, classInfo } = updateConfirmDialog;
    setUpdateConfirmDialog({ isOpen: false, duplicate: null, validStudents: null, file: null, classInfo: null });
    setPendingUploadData({ validStudents, file, classInfo, isUpdate: true, existingClassId: duplicate.id, existingClassName: duplicate.name });
    setShowConfirmationModal(true);
  };

  useEffect(() => { checkClassLimit(); }, []);
  useEffect(() => { setMounted(true); }, []);

  const checkClassLimit = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const q = query(collection(db, "classes"), where("teacherId", "==", user.uid));
      const snap = await getDocs(q);
      const count = snap.size;
      setClassCount(count);
      setIsLimitReached(count >= MAX_CLASSES);
    } catch (error) {
      console.error("Error checking class limit:", error);
    }
  };

  const checkStudentExistsByEmail = async (emailAddress) => {
    if (!emailAddress?.trim()) return null;
    try {
      const q = query(collection(db, "users"), where("emailAddress", "==", emailAddress.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      const data = d.data();
      if (!data) return null;
      return { id: d.id, name: data.name || "", classIds: data.classIds || [], hasAccount: data.hasAccount || false, authUID: data.authUID || null };
    } catch (error) {
      console.error("Error checking student by email:", error);
      return null;
    }
  };

  const normalizeHeaders = (data) => {
    return data.map(row => {
      const normalized = {};
      Object.keys(row).forEach(key => {
        const trimmedKey = key.trim().replace(/\s+/g, ' ');
        const lowerKey = trimmedKey.toLowerCase();
        if (lowerKey === "no" || lowerKey === "no.") normalized["No"] = row[key];
        else if (["student no.", "student no", "student number"].includes(lowerKey)) normalized["Student No."] = row[key];
        else if (lowerKey === "name") normalized["Name"] = row[key];
        else if (lowerKey === "gender") normalized["Gender"] = row[key];
        else if (lowerKey === "program") normalized["Program"] = row[key];
        else if (lowerKey === "year") normalized["Year"] = row[key];
        else if (["email address", "email"].includes(lowerKey)) normalized["Email Address"] = row[key];
        else if (["contact no.", "contact no", "contact number"].includes(lowerKey)) normalized["Contact No."] = row[key];
        else normalized[trimmedKey] = row[key];
      });
      return normalized;
    });
  };

  const extractClassInfo = (allData) => {
    let classNo = "", code = "", description = "", semesterRaw = "", academicYear = "";

    for (let i = 0; i < Math.min(15, allData.length); i++) {
      const row = allData[i];
      if (!row || row.length === 0) continue;
      const rowStr = Array.isArray(row) ? row.join('|').toLowerCase() : '';

      if (rowStr.includes('semester')) {
        const idx = row.findIndex(c => c && c.toString().toLowerCase().includes('semester'));
        if (idx !== -1) {
          const cell = row[idx].toString().trim();
          if (cell.toLowerCase().replace(/[:\s]/g, '') === 'semester' && row[idx + 1]) {
            semesterRaw = row[idx + 1].toString().trim();
          } else if (cell.toLowerCase() !== 'semester' && cell.toLowerCase() !== 'semester:') {
            semesterRaw = cell.replace(/^semester[:\s]*/i, '').trim();
          } else if (row[idx + 1]) {
            semesterRaw = row[idx + 1].toString().trim();
          }
        }
      }

      if (rowStr.includes('academic year')) {
        const idx = row.findIndex(c => c && c.toString().toLowerCase().includes('academic year'));
        if (idx !== -1) {
          const cell = row[idx].toString().trim();
          if (cell.toLowerCase().replace(/[:\s]/g, '') === 'academicyear' && row[idx + 1]) {
            academicYear = row[idx + 1].toString().trim();
          } else if (cell.toLowerCase() !== 'academic year' && cell.toLowerCase() !== 'academic year:') {
            academicYear = cell.replace(/^academic\s*year[:\s]*/i, '').trim();
          } else if (row[idx + 1]) {
            academicYear = row[idx + 1].toString().trim();
          }
        }
      }

      if (rowStr.includes('class no')) {
        const idx = row.findIndex(c => c && c.toString().toLowerCase().includes('class no'));
        if (idx !== -1 && row[idx + 1]) classNo = row[idx + 1].toString().trim();
      }

      if (rowStr.includes('code:') || (rowStr.includes('code') && !rowStr.includes('postal'))) {
        const idx = row.findIndex(c => c && c.toString().toLowerCase() === 'code:');
        if (idx !== -1 && row[idx + 1]) code = row[idx + 1].toString().trim();
      }

      if (rowStr.includes('description')) {
        const idx = row.findIndex(c => c && c.toString().toLowerCase().includes('description'));
        if (idx !== -1 && row[idx + 1]) description = row[idx + 1].toString().trim();
      }
    }

    // Normalize semester to canonical value, keep raw for display
    const semester = normalizeSemester(semesterRaw);
    console.log("Extracted class info:", { classNo, code, description, semesterRaw, semester, academicYear });
    return { classNo, code, description, semesterRaw, semester, academicYear };
  };

  /**
   * Check if the same semester + academic year already exists
   * in active OR archived classes for this teacher.
   * Uses normalized semester values for comparison so "Short Term",
   * "short term semester", "summer", etc. all match "Short Term Semester".
   */
  const checkSemesterAcademicYearDuplicate = async (classInfo) => {
    const user = auth.currentUser;
    if (!user) return null;

    const semester    = classInfo.semester?.trim() || "";      // already normalized
    const academicYear = classInfo.academicYear?.trim() || "";

    if (!semester || !academicYear) return null;

    try {
      // Check active classes
      const activeSnap = await getDocs(query(collection(db, "classes"), where("teacherId", "==", user.uid)));
      for (const d of activeSnap.docs) {
        const data = d.data();
        const existingSem = normalizeSemester(data.semester);   // normalize stored value too
        const existingAY  = data.academicYear?.trim() || "";
        if (
          existingSem.toLowerCase() === semester.toLowerCase() &&
          existingAY.toLowerCase() === academicYear.toLowerCase()
        ) {
          return { source: "active", classId: d.id, className: data.name || data.code || "Unnamed Class", semester: existingSem, academicYear: existingAY };
        }
      }

      // Check archived classes
      const archivedSnap = await getDocs(query(collection(db, "archivedClasses"), where("teacherId", "==", user.uid)));
      for (const d of archivedSnap.docs) {
        const data = d.data();
        const existingSem = normalizeSemester(data.semester);
        const existingAY  = data.academicYear?.trim() || "";
        if (
          existingSem.toLowerCase() === semester.toLowerCase() &&
          existingAY.toLowerCase() === academicYear.toLowerCase()
        ) {
          return { source: "archived", classId: d.id, className: data.name || data.code || "Unnamed Class", semester: existingSem, academicYear: existingAY };
        }
      }

      return null;
    } catch (error) {
      console.error("Error checking semester/academic year duplicate:", error);
      return null;
    }
  };

  const checkDuplicateClass = async (classInfo, validStudents, file) => {
    try {
      const user = auth.currentUser;
      if (!user) return null;
      const snap = await getDocs(query(collection(db, "classes"), where("teacherId", "==", user.uid)));
      for (const d of snap.docs) {
        const data = { id: d.id, ...d.data() };
        if (classInfo.classNo?.trim() && data.classNo === classInfo.classNo.trim())
          return { type: "Class No.", value: classInfo.classNo.trim(), id: data.id, name: data.name };
        if (data.fileName === file.name)
          return { type: "File Name", value: file.name, id: data.id, name: data.name };
        if (classInfo.code?.trim() && data.code === classInfo.code.trim() && data.studentCount === validStudents.length)
          return { type: "Content Match", value: `Course ${classInfo.code} with ${validStudents.length} students`, id: data.id, name: data.name };
      }
      return null;
    } catch (error) {
      console.error("Error checking for duplicate class:", error);
      return null;
    }
  };

  const processStudentData = async (students, headers, file, allData = []) => {
    const user = auth.currentUser;
    if (!user) { showAlert("error", "Not Logged In", "Please log in first!"); return; }

    if (isLimitReached) {
      showAlert("warning", "Class Limit Reached", `You have reached the maximum limit of ${MAX_CLASSES} classes.\n\nPlease delete an existing class before adding a new one.`);
      return;
    }

    const normalizedStudents = normalizeHeaders(students);
    const firstRow = normalizedStudents[0] || {};
    const missingHeaders = ["Student No.", "Name"].filter(h => !Object.keys(firstRow).includes(h));
    if (missingHeaders.length > 0) {
      showAlert("error", "Missing Columns", `Missing columns: ${missingHeaders.join(", ")}\n\nAvailable columns: ${Object.keys(firstRow).join(", ")}\n\nPlease check your file format.`);
      return;
    }

    const validStudents = normalizedStudents.filter(s => s["Student No."] && s["Name"]);
    if (validStudents.length === 0) { showAlert("error", "No Valid Data", "No valid student data found in file."); return; }

    const classInfo = extractClassInfo(allData);

    // ── Warn if semester wasn't recognized ────────────────────────────────────
    if (classInfo.semesterRaw && !classInfo.semester) {
      showAlert("warning", "Unrecognized Semester",
        `The semester value "${classInfo.semesterRaw}" could not be matched to a known semester.\n\nValid options: 1st Semester, 2nd Semester, Short Term Semester\n\nPlease correct your file and re-upload.`
      );
      setFileName("");
      return;
    }

    // ── Semester + Academic Year duplicate check ───────────────────────────────
    setUploadProgress("Checking semester and academic year...");
    const semAYDuplicate = await checkSemesterAcademicYearDuplicate(classInfo);

    if (semAYDuplicate) {
      setUploadProgress("");
      const sourceLabel = semAYDuplicate.source === "archived" ? "your archived classes" : "your active classes";

      // Friendly label per semester
      const VALID_SEMESTERS = ["1st Semester", "2nd Semester", "Short Term Semester"];
      showAlert(
        "error",
        "Duplicate Semester & Academic Year",
        `A class with the same Semester and Academic Year already exists in ${sourceLabel}.\n\n` +
        `Semester: ${semAYDuplicate.semester}\n` +
        `Academic Year: ${semAYDuplicate.academicYear}\n\n` +
        `Existing class: "${semAYDuplicate.className}"\n\n` +
        (semAYDuplicate.source === "archived"
          ? "Please restore or permanently delete the archived class before adding a new one with the same semester and academic year."
          : "Each semester and academic year combination must be unique. Please update the existing class instead.")
      );
      setFileName("");
      return;
    }

    // ── Standard duplicate check ───────────────────────────────────────────────
    setUploadProgress("Validating class information...");
    const duplicate = await checkDuplicateClass(classInfo, validStudents, file);
    setUploadProgress("");

    if (duplicate) {
      setUpdateConfirmDialog({ isOpen: true, duplicate, validStudents, file, classInfo });
      return;
    }

    setPendingUploadData({ validStudents, file, classInfo });
    setShowConfirmationModal(true);
  };

  const confirmAndUpload = async () => {
    setShowConfirmationModal(false);
    setUploading(true);
    setUploadProgress("Starting upload...");

    try {
      const user = auth.currentUser;
      if (!user) { showAlert("error", "Not Logged In", "Please log in first!"); return; }
      if (isLimitReached) {
        showAlert("warning", "Class Limit Reached", `You have reached the maximum limit of ${MAX_CLASSES} classes.`);
        setUploading(false); setUploadProgress(""); return;
      }

      const { validStudents, file, classInfo, isUpdate, existingClassId, existingClassName } = pendingUploadData;
      const teacherName = user.displayName || user.email?.split('@')[0] || "Teacher";

      // ── Teacher email in student list check ───────────────────────────────────
      const teacherEmail = user.email?.toLowerCase().trim() || "";
      const teacherInList = validStudents.find(
        s => s["Email Address"]?.toString().trim().toLowerCase() === teacherEmail
      );
      if (teacherInList) {
        showAlert(
          "error",
          "Invalid Student List",
          `Your own email address (${user.email}) was found in the student list.\n\nPlease remove it from the file and re-upload.`
        );
        setUploading(false);
        setUploadProgress("");
        return;
      }
      // ─────────────────────────────────────────────────────────────────────────

      setUploadProgress(`${isUpdate ? 'Updating' : 'Creating'} class: ${classInfo.description || file.name}`);

      let classDocId;

      if (isUpdate) {
        classDocId = existingClassId;
        await updateDoc(doc(db, "classes", classDocId), {
          name: classInfo.description || existingClassName || file.name.replace(/\.(csv|xlsx|xls)$/i, ''),
          classNo: classInfo.classNo || "",
          code: classInfo.code || "",
          semester: classInfo.semester || "",         // normalized value saved
          academicYear: classInfo.academicYear || "",
          studentCount: validStudents.length,
          uploadedAt: new Date(),
          fileName: file.name
        });
      } else {
        const classDoc = await addDoc(collection(db, "classes"), {
          name: classInfo.description || file.name.replace(/\.(csv|xlsx|xls)$/i, ''),
          classNo: classInfo.classNo || "",
          code: classInfo.code || "",
          subject: "",
          semester: classInfo.semester || "",         // normalized value saved
          academicYear: classInfo.academicYear || "",
          studentCount: validStudents.length,
          teacherId: user.uid,
          teacherEmail: user.email,
          teacherName: teacherName,
          uploadedAt: new Date(),
          fileName: file.name
        });
        classDocId = classDoc.id;
      }

      let newStudentCount = 0, addedToExistingCount = 0, errorCount = 0;

      for (let i = 0; i < validStudents.length; i++) {
        try {
          const student = validStudents[i];
          setUploadProgress(`Processing student ${i + 1}/${validStudents.length}`);
          const { "Student No.": studentNo, "Name": name, "Gender": gender, "Program": program, "Year": year, "Email Address": emailAddress, "Contact No.": contactNo } = student;
          if (!studentNo || !name) { errorCount++; continue; }

          const cleanStudentNo = studentNo.toString().trim();
          const cleanEmail = emailAddress?.toString().trim().toLowerCase() || "";
          const existing = await checkStudentExistsByEmail(cleanEmail);

          if (existing) {
            const ids = [...new Set([...existing.classIds, classDocId])];
            await updateDoc(doc(db, "users", existing.id), { classIds: ids });
            addedToExistingCount++;
          } else {
            await addDoc(collection(db, "users"), {
              studentNo: cleanStudentNo,
              name: name.toString().trim(),
              gender: gender?.toString().trim() || "",
              program: program?.toString().trim() || "",
              year: year?.toString().trim() || "",
              emailAddress: cleanEmail,
              contactNo: contactNo?.toString().trim() || "",
              classIds: [classDocId],
              role: "student",
              hasAccount: false,
              authUID: null,
              createdAt: new Date()
            });
            newStudentCount++;
          }
        } catch (e) {
          console.error("Error processing student:", validStudents[i], e);
          errorCount++;
        }
      }

      let removedCount = 0;
      if (isUpdate) {
        setUploadProgress("Cleaning up unenrolled students...");
        try {
          const studSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student"), where("classIds", "array-contains", classDocId)));
          const validNos = validStudents.map(s => s["Student No."]?.toString().trim());
          for (const d of studSnap.docs) {
            const data = d.data();
            if (!validNos.includes(data.studentNo)) {
              await updateDoc(doc(db, "users", d.id), { classIds: (data.classIds || []).filter(id => id !== classDocId) });
              removedCount++;
            }
          }
        } catch (e) { console.error("Error cleaning up unenrolled students:", e); }
      }

      const totalCount = newStudentCount + addedToExistingCount;
      setUploadCount(totalCount);

      if (totalCount > 0 || isUpdate) {
        let message = `New students added: ${newStudentCount}\nUpdated existing: ${addedToExistingCount}`;
        if (isUpdate) message += `\nStudents unenrolled: ${removedCount}`;
        if (errorCount > 0) message += `\nErrors: ${errorCount}`;
        showAlert("success", isUpdate ? "Class Updated!" : "Upload Complete!", message, () => navigate(`/teacher/class/${classDocId}`));
        await checkClassLimit();
        window.dispatchEvent(new Event('classesUpdated'));
      } else {
        throw new Error("No students were uploaded successfully");
      }

      setFileName(""); setUploadProgress(""); setPendingUploadData(null);
      window.dispatchEvent(new Event('classesUpdated'));
    } catch (error) {
      console.error("Error saving to Firestore:", error);
      setErrorMessage(error.message);
      showAlert("error", "Upload Failed", "Failed to upload data: " + error.message);
    } finally {
      setUploading(false); setUploadProgress("");
    }
  };

  const cancelConfirmation = () => { setShowConfirmationModal(false); setPendingUploadData(null); setFileName(""); };

  const handleFileUpload = (e) => {
    if (isLimitReached) {
      showAlert("warning", "Class Limit Reached", `You have reached the maximum limit of ${MAX_CLASSES} classes.\n\nPlease delete an existing class before adding a new one.`);
      e.target.value = ""; return;
    }

    const file = e.target.files[0];
    if (!file) return;

    setUploading(true); setUploadProgress("Parsing file...");
    setFileName(file.name); setErrorMessage(""); setUploadCount(0);

    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true, skipEmptyLines: true, dynamicTyping: false,
        transformHeader: h => h.trim(),
        complete: async (results) => {
          await processStudentData(results.data, results.meta.fields || [], file, []);
          setUploading(false); setUploadProgress(""); e.target.value = "";
        },
        error: (err) => {
          setErrorMessage("Failed to parse CSV file: " + err.message);
          showAlert("error", "CSV Parse Error", "Failed to parse CSV file. Please check the file format.");
          setUploading(false); setUploadProgress(""); e.target.value = "";
        }
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const allData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });

          let headerRowIndex = -1;
          for (let i = 0; i < allData.length; i++) {
            const rowStr = allData[i].join('|').toLowerCase();
            if (rowStr.includes('student no') || (rowStr.includes('no') && rowStr.includes('name'))) {
              headerRowIndex = i; break;
            }
          }
          if (headerRowIndex === -1) throw new Error("Could not find header row with 'Student No.' and 'Name' columns");

          const range = XLSX.utils.decode_range(ws['!ref']);
          range.s.r = headerRowIndex;
          const jsonData = XLSX.utils.sheet_to_json(ws, { raw: false, defval: "", range: XLSX.utils.encode_range(range) });
          await processStudentData(jsonData, Object.keys(jsonData[0] || {}), file, allData);
        } catch (err) {
          setErrorMessage("Failed to parse Excel file: " + err.message);
          showAlert("error", "Excel Parse Error", "Failed to parse Excel file. Please check the file format.");
        } finally {
          setUploading(false); setUploadProgress(""); e.target.value = "";
        }
      };
      reader.onerror = () => {
        setErrorMessage("Failed to read file");
        showAlert("error", "File Read Error", "Failed to read the file. Please try again.");
        setUploading(false); setUploadProgress(""); e.target.value = "";
      };
      reader.readAsArrayBuffer(file);
    } else {
      setErrorMessage("Unsupported file format. Please upload CSV or XLSX files only.");
      showAlert("error", "Unsupported Format", "Unsupported file format. Please upload CSV or XLSX files only.");
      setUploading(false); setUploadProgress(""); e.target.value = "";
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full font-Poppins animate-fadeIn">
      <div className="relative bg-blue-600 rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_6px_25px_rgb(0,0,0,0.15)] transition-all overflow-hidden p-6 md:p-8 group text-white border border-blue-500 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white rounded-full opacity-10 transition-transform group-hover:scale-110 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-3">Add New Class</h2>
          <p className="text-sm md:text-base text-blue-100 mt-2">
            Upload a classlist to create a new class ({classCount}/{MAX_CLASSES} classes)
          </p>
        </div>
      </div>

      {/* Limit warnings */}
      {isLimitReached && (
        <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-orange-800 font-semibold">Class Limit Reached</p>
            <p className="text-orange-700 text-sm mt-1">You have reached the maximum limit of {MAX_CLASSES} classes. Please delete an existing class before adding a new one.</p>
          </div>
        </div>
      )}
      {!isLimitReached && classCount >= MAX_CLASSES - 2 && (
        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-yellow-800 font-semibold">Approaching Class Limit</p>
            <p className="text-yellow-700 text-sm mt-1">You have {classCount} out of {MAX_CLASSES} classes. You can add {MAX_CLASSES - classCount} more class{MAX_CLASSES - classCount !== 1 ? 'es' : ''}.</p>
          </div>
        </div>
      )}

      {/* Valid semesters info */}
      <div className="mb-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>Valid semesters in your file:</strong> 1st Semester, 2nd Semester, Short Term Semester
          &nbsp;(variants like "Short Term", "Summer", "2nd Sem", etc. are auto-normalized)
        </span>
      </div>

      {/* Upload area */}
      <div className={`border-2 border-dashed rounded-3xl p-5 ${isLimitReached ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-300'}`}>
        <div className="text-center">
          <Upload className={`mx-auto w-10 h-10 mb-2 ${isLimitReached ? 'text-gray-300' : 'text-gray-400'}`} />
          <p className={`mb-2 ${isLimitReached ? 'text-gray-400' : 'text-subtext'}`}>
            {isLimitReached ? 'Class limit reached - Delete a class to add new ones' : 'Upload your classlist (.csv or .xlsx)'}
          </p>
          <p className={`text-sm mb-4 ${isLimitReached ? 'text-gray-400' : 'text-subtext'}`}>
            Required columns: No, Student No., Name, Gender, Program, Year, Email Address, Contact No.
          </p>

          <input id="file-upload" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" disabled={uploading || isLimitReached} />
          <label
            htmlFor="file-upload"
            className={`inline-block px-8 py-3.5 font-bold rounded-xl transition shadow-lg hover:shadow-xl transform active:scale-95 ${uploading || isLimitReached ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white cursor-pointer hover:from-blue-700 hover:to-indigo-700'}`}
          >
            {uploading ? (
              <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Uploading...</span>
            ) : isLimitReached ? "Limit Reached" : "Choose File"}
          </label>

          {fileName && !uploading && !showConfirmationModal && (
            <div className="mt-3">
              <p className="text-sm text-subtext italic font-medium bg-blue-50 inline-block px-4 py-1 rounded-full border border-blue-100">Selected: {fileName}</p>
            </div>
          )}
          {uploadProgress && uploading && (
            <p className="text-sm text-blue-600 font-bold mt-3 animate-pulse">{uploadProgress}</p>
          )}
        </div>

        {errorMessage && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-semibold text-center">❌ {errorMessage}</p>
          </div>
        )}
        {uploadCount > 0 && !uploading && !errorMessage && (
          <div className="flex items-center justify-center mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="flex flex-row gap-2 text-base items-center text-blue-500 font-semibold text-center">
              <CircleCheck className="w-4 h-4 text-blue-500" /> Successfully processed {uploadCount} student(s)!
            </p>
          </div>
        )}
      </div>

      {/* Download template */}
      {!isLimitReached && (
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              const csv = "No,Student No.,Name,Gender,Program,Year,Email Address,Contact No.\n1,2024-0001,Dela Cruz Juan,Male,BSIT,1st,juan@example.com,09123456789";
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = "class_template.csv";
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              showAlert("info", "Template Downloaded", "The class list template has been downloaded.");
            }}
            className="text-sm text-gray-400 hover:text-blue-600 font-medium transition-colors flex items-center justify-center gap-2 mx-auto py-2 px-4 rounded-lg hover:bg-gray-50 bg-white border border-gray-100 shadow-sm"
          >
            <Download size={14} />
            Download Sample Reference
          </button>
        </div>
      )}

      {/* ── Portals ── */}
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

      {alertDialog.isOpen && createPortal(
        <div className="font-Poppins fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-slideUp">
            <div className="flex flex-col items-center text-center">
              <div className={`p-4 rounded-full flex items-center justify-center mb-4 ${alertDialog.type === "success" ? "bg-green-100" : alertDialog.type === "error" ? "bg-red-100" : alertDialog.type === "warning" ? "bg-orange-100" : "bg-blue-100"}`}>
                {alertDialog.type === "success" && <CheckCircle2 className="text-green-600" size={32} />}
                {alertDialog.type === "error"   && <XCircle      className="text-red-600"   size={32} />}
                {alertDialog.type === "warning" && <AlertTriangle className="text-orange-600" size={32} />}
                {alertDialog.type === "info"    && <Info          className="text-blue-600"  size={32} />}
              </div>
              <h3 className="text-xl font-bold text-title mb-2">{alertDialog.title}</h3>
              <p className="text-subtext text-sm whitespace-pre-line leading-relaxed px-2">{alertDialog.message}</p>
              <button
                onClick={closeAlert}
                className={`w-full mt-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide active:scale-95 hover:scale-105 duration-200 transition shadow-lg ${alertDialog.type === "success" ? "bg-green-600 text-white hover:bg-green-700 shadow-green-200" : alertDialog.type === "error" ? "bg-red-600 text-white hover:bg-red-700 shadow-red-200" : alertDialog.type === "warning" ? "bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"}`}
              >
                Okay
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {updateConfirmDialog.isOpen && createPortal(
        <div className="font-Poppins fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-fadeIn p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full animate-slideUp">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 rounded-full flex items-center justify-center mb-4 bg-amber-100">
                <AlertTriangle className="text-amber-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Class Already Exists</h3>
              <p className="text-gray-600 text-sm leading-relaxed px-2 mb-4">A class matching this file already exists in your records.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 w-full mb-6 text-left">
                <p className="text-sm font-semibold text-amber-800 mb-1">Existing Class:</p>
                <p className="text-amber-900 font-bold">{updateConfirmDialog.duplicate?.name || "Unnamed Class"}</p>
                <p className="text-xs text-amber-700 mt-1">Match Reason: {updateConfirmDialog.duplicate?.type} ({updateConfirmDialog.duplicate?.value})</p>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Would you like to <strong>update</strong> the existing class with this new list?
                <span className="text-xs text-gray-500 block mt-2">(New students will be added, and students no longer in the list will be unenrolled.)</span>
              </p>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={handleCancelUpdate} className="flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wide bg-gray-100 text-gray-700 hover:bg-gray-200 transition duration-200 active:scale-95">Cancel</button>
                <button onClick={handleConfirmUpdate} className="flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wide bg-amber-500 text-white hover:bg-amber-600 transition duration-200 active:scale-95 shadow-lg shadow-amber-200">Update Class</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}