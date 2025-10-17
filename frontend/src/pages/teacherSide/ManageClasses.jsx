import { useState, useEffect, useRef } from "react";
import { Upload, Loader2, Eye } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { auth, db } from "../../firebase/firebaseConfig";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import ClassNameModal from './ClassNameModal';
import ViewClassModal from './ViewClassModal';

export default function ManageClasses() {
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [viewingClass, setViewingClass] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [creatingAccounts, setCreatingAccounts] = useState(false);
  const [showClassNameModal, setShowClassNameModal] = useState(false);
  const [pendingUploadData, setPendingUploadData] = useState(null);
  
  const fetchingRef = useRef(false);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && !initialLoadRef.current) {
        console.log("User logged in:", user.email);
        initialLoadRef.current = true;
        fetchClasses();
      } else if (!user) {
        console.log("No user logged in");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchClasses = async () => {
    if (fetchingRef.current) {
      console.log("Already fetching, skipping...");
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "classes"),
        where("teacherId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      
      const classList = [];
      querySnapshot.forEach((docSnapshot) => {
        classList.push({ id: docSnapshot.id, ...docSnapshot.data() });
      });

      setClasses(classList);
    } catch (error) {
      console.error("Error fetching classes:", error);
      setErrorMessage("Failed to fetch classes: " + error.message);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const fetchStudentsByClass = async (classId) => {
    try {
      setLoadingStudents(true);
      
      // Query users collection where role = "student" and classId matches
      const q = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("classId", "==", classId)
      );
      
      const querySnapshot = await getDocs(q);
      
      const students = [];
      querySnapshot.forEach((docSnapshot) => {
        students.push({
          id: docSnapshot.id,
          ...docSnapshot.data()
        });
      });

      // Sort by name
      students.sort((a, b) => {
        const aName = a.name || "";
        const bName = b.name || "";
        return aName.localeCompare(bName);
      });
      
      setStudentsList(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      alert("Failed to fetch students: " + error.message);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleViewClass = async (cls) => {
    setViewingClass(cls);
    await fetchStudentsByClass(cls.id);
  };

  const closeModal = () => {
    setViewingClass(null);
    setStudentsList([]);
  };

  const createAccountInFirebase = async (studentData) => {
    try {
      // Use email address from classlist for Firebase Authentication
      const email = studentData.emailAddress;
      
      // Check if email exists
      if (!email || email.trim() === "") {
        throw new Error(`No email address found for ${studentData.name}`);
      }
      
      // Default password for all accounts
      const password = "123456";

      // Create user in Firebase Authentication
      await createUserWithEmailAndPassword(auth, email, password);

      console.log(`Account created for ${studentData.name} (${studentData.studentNo}) with email: ${email}`);
      return true;
    } catch (error) {
      // Handle specific error for existing account
      if (error.code === 'auth/email-already-in-use') {
        console.log(`Account already exists for email: ${studentData.emailAddress}`);
        return true; // Consider it success since account exists
      }
      console.error("Error creating account:", error);
      throw error;
    }
  };

  const handleCreateAccountForAll = async () => {
    const studentsWithoutAccounts = studentsList.filter(s => !s.hasAccount);

    if (studentsWithoutAccounts.length === 0) {
      alert("All students already have accounts!");
      return;
    }

    if (!window.confirm(`Create accounts for ${studentsWithoutAccounts.length} student(s) in Firebase Authentication?\n\nEmail: From Classlist\nDefault Password: 123456\n\nStudents will login using their Student Number.`)) {
      return;
    }

    setCreatingAccounts(true);

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 0; i < studentsWithoutAccounts.length; i++) {
        try {
          const student = studentsWithoutAccounts[i];
          console.log(`Creating account for: ${student.name} (${i + 1}/${studentsWithoutAccounts.length})`);
          
          // Create the account in Firebase Authentication
          await createAccountInFirebase(student);
          
          // Update hasAccount status in Firestore
          await updateAccountStatus(student.id, true);
          
          successCount++;
        } catch (error) {
          console.error("Error creating account:", error);
          errorCount++;
          errors.push(`${studentsWithoutAccounts[i].name}: ${error.message}`);
        }
      }

      let message = `✅ Successfully created ${successCount} account(s) in Firebase Authentication!`;
      message += `\n\n📧 Email: From Classlist`;
      message += `\n🔑 Default Password: 123456`;
      message += `\n\n⚠️ Students will login using their STUDENT NUMBER`;
      message += `\nThe system will check Firestore for their email.`;
      
      if (errorCount > 0) {
        message += `\n\n⚠️ ${errorCount} account(s) failed to create.`;
        if (errors.length > 0) {
          message += `\n\nErrors:\n${errors.slice(0, 5).join('\n')}`;
          if (errors.length > 5) {
            message += `\n... and ${errors.length - 5} more`;
          }
        }
      }
      
      alert(message);

      // Refresh the student list to show updated hasAccount status
      await fetchStudentsByClass(viewingClass.id);
    } catch (error) {
      console.error("Error creating accounts:", error);
      alert("❌ Failed to create accounts: " + error.message);
    } finally {
      setCreatingAccounts(false);
    }
  };

  const updateAccountStatus = async (studentDocId, hasAccount) => {
    try {
      const studentDocRef = doc(db, "users", studentDocId);
      
      await updateDoc(studentDocRef, {
        hasAccount: hasAccount
      });
      
      console.log(`Updated student ${studentDocId} account status to ${hasAccount}`);
    } catch (error) {
      console.error("Error updating account status:", error);
      throw error;
    }
  };

  const normalizeHeaders = (data) => {
    return data.map(row => {
      const normalized = {};
      Object.keys(row).forEach(key => {
        const trimmedKey = key.trim().replace(/\s+/g, ' ');
        const lowerKey = trimmedKey.toLowerCase();
        
        if (lowerKey === "no" || lowerKey === "no.") {
          normalized["No"] = row[key];
        } else if (lowerKey === "student no." || lowerKey === "student no" || lowerKey === "student number") {
          normalized["Student No."] = row[key];
        } else if (lowerKey === "name") {
          normalized["Name"] = row[key];
        } else if (lowerKey === "gender") {
          normalized["Gender"] = row[key];
        } else if (lowerKey === "program") {
          normalized["Program"] = row[key];
        } else if (lowerKey === "year") {
          normalized["Year"] = row[key];
        } else if (lowerKey === "email address" || lowerKey === "email") {
          normalized["Email Address"] = row[key];
        } else if (lowerKey === "contact no." || lowerKey === "contact no" || lowerKey === "contact number") {
          normalized["Contact No."] = row[key];
        } else {
          normalized[trimmedKey] = row[key];
        }
      });
      return normalized;
    });
  };

  const processStudentData = async (students, headers, file) => {
    console.log("Parsed data:", students);
    console.log("Total rows:", students.length);
    console.log("First row:", students[0]);
    console.log("Headers:", headers);
    
    const user = auth.currentUser;
    if (!user) {
      alert("❌ Please log in first!");
      return;
    }

    const normalizedStudents = normalizeHeaders(students);
    console.log("Normalized first row:", normalizedStudents[0]);

    const requiredHeaders = ["Student No.", "Name"];
    const firstRow = normalizedStudents[0] || {};
    const availableHeaders = Object.keys(firstRow);
    
    console.log("Available headers:", availableHeaders);
    console.log("Required headers:", requiredHeaders);
    
    const missingHeaders = requiredHeaders.filter(h => !availableHeaders.includes(h));
    
    if (missingHeaders.length > 0) {
      alert(`❌ Missing columns: ${missingHeaders.join(", ")}\n\nAvailable columns: ${availableHeaders.join(", ")}\n\nPlease check your file format.`);
      return;
    }

    const validStudents = normalizedStudents.filter(s => 
      s["Student No."] && s["Name"]
    );

    if (validStudents.length === 0) {
      alert("❌ No valid student data found in file");
      return;
    }

    console.log("Valid students:", validStudents.length);

    const defaultClassName = file.name.replace(/\.(csv|xlsx|xls)$/i, '');
    
    setPendingUploadData({
      validStudents,
      file
    });
    setShowClassNameModal(true);
  };

  const confirmClassNameAndUpload = async (className) => {
    setShowClassNameModal(false);
    setUploading(true);
    setUploadProgress("Starting upload...");

    try {
      const user = auth.currentUser;
      if (!user) {
        alert("❌ Please log in first!");
        return;
      }

      const { validStudents, file } = pendingUploadData;
      const teacherName = user.displayName || user.email?.split('@')[0] || "Teacher";
      
      setUploadProgress(`Creating class: ${className}`);
      
      const classDoc = await addDoc(collection(db, "classes"), {
        name: className,
        subject: "",
        studentCount: validStudents.length,
        teacherId: user.uid,
        teacherEmail: user.email,
        teacherName: teacherName,
        uploadedAt: new Date(),
        fileName: file.name
      });

      console.log(`Created class document: ${classDoc.id}`);

      let totalCount = 0;
      let errorCount = 0;

      // Create individual documents for each student in the users collection
      for (let i = 0; i < validStudents.length; i++) {
        try {
          const student = validStudents[i];
          setUploadProgress(`Processing student ${i + 1}/${validStudents.length}`);

          const {
            "No": no,
            "Student No.": studentNo,
            "Name": name,
            "Gender": gender,
            "Program": program,
            "Year": year,
            "Email Address": emailAddress,
            "Contact No.": contactNo
          } = student;

          if (!studentNo || !name) {
            console.error("Missing required fields:", student);
            errorCount++;
            continue;
          }

          const cleanStudentNo = studentNo.toString().trim();

          // Create individual document with random ID for each student
          await addDoc(collection(db, "users"), {
            studentNo: cleanStudentNo,
            name: name.toString().trim(),
            gender: gender?.toString().trim() || "",
            program: program?.toString().trim() || "",
            year: year?.toString().trim() || "",
            emailAddress: emailAddress?.toString().trim() || "",
            contactNo: contactNo?.toString().trim() || "",
            classId: classDoc.id,
            role: "student",
            hasAccount: false,
            createdAt: new Date()
          });

          totalCount++;
        } catch (studentError) {
          console.error("Error processing student:", validStudents[i], studentError);
          errorCount++;
        }
      }

      setUploadCount(totalCount);
      
      if (totalCount > 0) {
        let message = `✅ Successfully uploaded ${totalCount} student(s)!\n`;
        
        if (errorCount > 0) {
          message += `⚠️ ${errorCount} student(s) failed to upload.`;
        }
        
        alert(message);
      } else {
        throw new Error("No students were uploaded successfully");
      }
      
      await fetchClasses();
      
      setFileName("");
      setUploadProgress("");
      setPendingUploadData(null);
    } catch (error) {
      console.error("Error saving to Firestore:", error);
      setErrorMessage(error.message);
      alert("❌ Failed to upload data: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  const cancelClassNameModal = () => {
    setShowClassNameModal(false);
    setPendingUploadData(null);
    setFileName("");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setFileName(file.name);
    setErrorMessage("");
    setUploadCount(0);

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transformHeader: (header) => header.trim(),
        complete: async function (results) {
          await processStudentData(results.data, results.meta.fields || [], file);
          e.target.value = "";
        },
        error: function(error) {
          console.error("CSV parsing error:", error);
          setErrorMessage("Failed to parse CSV file: " + error.message);
          alert("❌ Failed to parse CSV file. Please check the file format.");
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const allData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            raw: false,
            defval: ""
          });
          
          console.log("First 15 rows:", allData.slice(0, 15));
          
          let headerRowIndex = -1;
          for (let i = 0; i < allData.length; i++) {
            const row = allData[i];
            const rowStr = row.join('|').toLowerCase();
            if (rowStr.includes('student no') || (rowStr.includes('no') && rowStr.includes('name'))) {
              headerRowIndex = i;
              console.log("Found header row at index:", i, "Row:", row);
              break;
            }
          }
          
          if (headerRowIndex === -1) {
            throw new Error("Could not find header row with 'Student No.' and 'Name' columns");
          }
          
          const range = XLSX.utils.decode_range(worksheet['!ref']);
          range.s.r = headerRowIndex;
          const newRange = XLSX.utils.encode_range(range);
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            raw: false,
            defval: "",
            range: newRange
          });
          
          console.log("Parsed data from header row:", jsonData.slice(0, 3));
          
          const headers = Object.keys(jsonData[0] || {});
          
          await processStudentData(jsonData, headers, file);
          e.target.value = "";
        } catch (error) {
          console.error("XLSX parsing error:", error);
          setErrorMessage("Failed to parse Excel file: " + error.message);
          alert("❌ Failed to parse Excel file. Please check the file format.");
        }
      };
      
      reader.onerror = (error) => {
        console.error("File reading error:", error);
        setErrorMessage("Failed to read file");
        alert("❌ Failed to read file");
      };
      
      reader.readAsArrayBuffer(file);
    } else {
      setErrorMessage("Unsupported file format. Please upload CSV or XLSX files only.");
      alert("❌ Unsupported file format. Please upload CSV or XLSX files only.");
      e.target.value = "";
    }
  };

  const handleRemoveClass = async (classId) => {
    if (!window.confirm("Are you sure you want to remove this class? This will also remove all students in this class from the database.")) {
      return;
    }

    try {
      // Query and delete all student documents in this class
      const q = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("classId", "==", classId)
      );
      
      const querySnapshot = await getDocs(q);
      
      const deletePromises = [];
      querySnapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(doc(db, "users", docSnapshot.id)));
      });
      
      await Promise.all(deletePromises);
      console.log(`Removed ${deletePromises.length} students from class ${classId}`);

      // Delete the class document
      await deleteDoc(doc(db, "classes", classId));

      alert("✅ Class removed successfully!");
      await fetchClasses();
    } catch (error) {
      console.error("Error removing class:", error);
      alert("❌ Failed to remove class: " + error.message);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        🏫 Manage Classes
      </h2>

      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6">
        <div className="text-center">
          <Upload className="mx-auto text-gray-400 w-10 h-10 mb-3" />
          <p className="text-gray-600 mb-3">Upload your classlist (.csv or .xlsx)</p>
          <p className="text-sm text-gray-500 mb-3">
            Required columns: No, Student No., Name, Gender, Program, Year, Email Address, Contact No.
          </p>

          <input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          
          <label
            htmlFor="file-upload"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg cursor-pointer hover:bg-blue-700 transition disabled:opacity-50"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </span>
            ) : (
              "Choose File"
            )}
          </label>

          {fileName && !uploading && !showClassNameModal && (
            <p className="text-sm text-gray-500 italic mt-3">Selected: {fileName}</p>
          )}

          {uploadProgress && uploading && (
            <p className="text-sm text-blue-600 font-medium mt-3">
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
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 font-semibold text-center">
              ✅ Successfully uploaded {uploadCount} student(s)!
            </p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Your Classes</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No classes uploaded yet. Upload a file to get started.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="border rounded-xl p-5 shadow-sm hover:shadow-md transition bg-blue-50"
              >
                <h4 className="text-lg font-bold text-gray-800">{cls.name}</h4>
                {cls.subject && <p className="text-gray-600">{cls.subject}</p>}
                <p className="text-sm text-gray-500">{cls.studentCount} students</p>
                <p className="text-xs text-gray-400">Teacher: {cls.teacherName}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Uploaded: {cls.uploadedAt?.toDate().toLocaleDateString()}
                </p>
                <div className="mt-3 flex justify-between">
                  <button 
                    className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                    onClick={() => handleViewClass(cls)}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button 
                    className="text-red-500 hover:underline font-semibold"
                    onClick={() => handleRemoveClass(cls.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ClassNameModal
        isOpen={showClassNameModal}
        defaultName={pendingUploadData?.file.name.replace(/\.(csv|xlsx|xls)$/i, '')}
        onConfirm={confirmClassNameAndUpload}
        onCancel={cancelClassNameModal}
      />

      {viewingClass && (
        <ViewClassModal
          isOpen={true}
          classData={viewingClass}
          students={studentsList}
          loading={loadingStudents}
          creatingAccounts={creatingAccounts}
          onClose={closeModal}
          onCreateAccounts={handleCreateAccountForAll}
        />
      )}
    </div>
  );
}