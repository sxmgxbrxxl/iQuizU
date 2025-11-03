import { useState, useEffect, useRef } from "react";
import { Upload, Loader2, Eye, School, Trash } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { auth, db } from "../../firebase/firebaseConfig";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import ClassNameModal from './ClassNameModal';
import ViewClassModal from './ViewClassModal';
import PasswordConfirmModal from './PasswordConfirmModal';
import { setAccountCreationFlag } from "../../App";

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
  const [accountCreationProgress, setAccountCreationProgress] = useState("");
  const [showClassNameModal, setShowClassNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingUploadData, setPendingUploadData] = useState(null);
  
  const fetchingRef = useRef(false);
  const initialLoadRef = useRef(false);
  const authRef = useRef(null);
  const accountCreationInProgressRef = useRef(false);
  const adminUIDRef = useRef(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (accountCreationInProgressRef.current) {
        console.log("⚠️ Account creation in progress, ignoring auth state change");
        return;
      }

      if (user && !initialLoadRef.current) {
        console.log("✅ User logged in:", user.email);
        authRef.current = { email: user.email, uid: user.uid };
        adminUIDRef.current = user.uid;
        initialLoadRef.current = true;
        fetchClasses();
      } else if (!user && initialLoadRef.current) {
        console.log("⚠️ User logged out, redirecting...");
        window.location.href = "/login";
      } else if (!user) {
        console.log("ℹ️ No user logged in");
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
      
      const q = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("classIds", "array-contains", classId)
      );
      
      const querySnapshot = await getDocs(q);
      
      const students = [];
      querySnapshot.forEach((docSnapshot) => {
        students.push({
          id: docSnapshot.id,
          ...docSnapshot.data()
        });
      });

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

  const checkStudentExistsByEmail = async (emailAddress) => {
    if (!emailAddress || emailAddress.trim() === "") {
      return null;
    }

    try {
      const q = query(
        collection(db, "users"),
        where("emailAddress", "==", emailAddress.toLowerCase().trim())
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        return {
          id: existingDoc.id,
          name: existingDoc.data().name,
          classIds: existingDoc.data().classIds || [],
          hasAccount: existingDoc.data().hasAccount,
          authUID: existingDoc.data().authUID
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error checking student by email:", error);
      return null;
    }
  };

  const checkExistingAccountByEmail = async (email) => {
    try {
      const q = query(
        collection(db, "users"),
        where("emailAddress", "==", email.toLowerCase().trim()),
        where("hasAccount", "==", true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        return {
          exists: true,
          uid: existingDoc.data().authUID,
          studentId: existingDoc.id,
          name: existingDoc.data().name
        };
      }
      
      return { exists: false };
    } catch (error) {
      console.error("Error checking existing account:", error);
      throw error;
    }
  };

  const validateTeacherPassword = async (teacherEmail, teacherPassword) => {
    try {
      const result = await signInWithEmailAndPassword(auth, teacherEmail, teacherPassword);
      console.log("✅ Password validated, staying logged in");
      return { valid: true };
    } catch (error) {
      console.error("❌ Password validation failed:", error);
      return { valid: false, error: error.message };
    }
  };

  const createAccountInFirebase = async (studentData, teacherEmail, teacherPassword, teacherUID) => {
    try {
      const email = studentData.emailAddress?.toLowerCase().trim();
      
      if (!email || email === "") {
        throw new Error(`No email address found for ${studentData.name}`);
      }
      
      const existingCheck = await checkExistingAccountByEmail(email);
      
      if (existingCheck.exists) {
        console.log(`⚠️ Account already exists for ${email}`);
        return {
          status: "EXISTING_ACCOUNT",
          authUID: existingCheck.uid,
          message: `${existingCheck.name} already has an account`
        };
      }
      
      const password = "123456";

      await auth.signOut();
      await new Promise(resolve => setTimeout(resolve, 500));

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const authUID = userCredential.user.uid;

      console.log(`✅ Account created for ${studentData.name} with UID: ${authUID}`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let reAuthSuccess = false;
      let reAuthAttempts = 0;
      const maxAttempts = 3;
      
      while (!reAuthSuccess && reAuthAttempts < maxAttempts) {
        try {
          const teacherCredential = await signInWithEmailAndPassword(auth, teacherEmail, teacherPassword);
          
          if (teacherCredential.user.uid === teacherUID) {
            reAuthSuccess = true;
            console.log(`✅ Teacher re-authenticated successfully`);
          } else {
            console.warn(`⚠️ Auth UID mismatch - retrying`);
            reAuthAttempts++;
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (reAuthError) {
          console.error(`Re-authentication attempt ${reAuthAttempts + 1} failed:`, reAuthError);
          reAuthAttempts++;
          if (reAuthAttempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      if (!reAuthSuccess) {
        throw new Error("Failed to keep teacher logged in after account creation");
      }

      return {
        status: "NEW_ACCOUNT",
        authUID: authUID
      };
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️ Email already exists in Firebase Auth: ${studentData.emailAddress}`);
        
        const existingCheck = await checkExistingAccountByEmail(studentData.emailAddress);
        return {
          status: "EXISTING_AUTH",
          authUID: existingCheck.uid || null,
          message: `Email already in Firebase: ${studentData.emailAddress}`
        };
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

    setShowPasswordModal(true);
  };

  const handlePasswordConfirm = async (adminPassword) => {
    setShowPasswordModal(false);

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      alert("❌ Please log in first!");
      return;
    }

    console.log("🔒 Setting account creation flags...");
    accountCreationInProgressRef.current = true;
    setAccountCreationFlag(true);

    try {
      setAccountCreationProgress("Validating credentials...");
      const passwordValidation = await validateTeacherPassword(currentUser.email, adminPassword);
      
      if (!passwordValidation.valid) {
        alert("❌ Invalid password! Account creation cancelled.\n\nPlease try again with the correct password.");
        setAccountCreationProgress("");
        accountCreationInProgressRef.current = false;
        setAccountCreationFlag(false);
        return;
      }

      const teacherEmail = currentUser.email;
      const teacherUID = currentUser.uid;

      setCreatingAccounts(true);
      setAccountCreationProgress("Initializing account creation...");

      const studentsWithoutAccounts = studentsList.filter(s => !s.hasAccount);
      let successCount = 0;
      let existingCount = 0;
      let errorCount = 0;
      const errors = [];
      const skippedStudents = [];

      for (let i = 0; i < studentsWithoutAccounts.length; i++) {
        try {
          const student = studentsWithoutAccounts[i];
          setAccountCreationProgress(`Creating accounts: ${i + 1}/${studentsWithoutAccounts.length} - ${student.name}`);
          console.log(`📝 Processing: ${student.name} (${i + 1}/${studentsWithoutAccounts.length})`);
          
          const result = await createAccountInFirebase(student, teacherEmail, adminPassword, teacherUID);
          
          if (result.status === "NEW_ACCOUNT") {
            await updateDoc(doc(db, "users", student.id), {
              hasAccount: true,
              authUID: result.authUID
            });
            successCount++;
            console.log(`✅ New account: ${student.name}`);
            
          } else if (result.status === "EXISTING_ACCOUNT" || result.status === "EXISTING_AUTH") {
            if (!student.hasAccount) {
              await updateDoc(doc(db, "users", student.id), {
                hasAccount: true,
                authUID: result.authUID || student.authUID
              });
            }
            existingCount++;
            skippedStudents.push(student.name);
            console.log(`⚠️ Already exists: ${student.name}`);
          }
        } catch (error) {
          console.error("❌ Error creating account:", error);
          errorCount++;
          errors.push(`${studentsWithoutAccounts[i].name}: ${error.message}`);
        }
      }

      setAccountCreationProgress("Finalizing...");

      console.log("🔍 Final teacher verification...");
      const finalUser = auth.currentUser;
      
      if (!finalUser || finalUser.uid !== teacherUID) {
        console.warn(`⚠️ Final re-authentication needed...`);
        
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const finalAuth = await signInWithEmailAndPassword(auth, teacherEmail, adminPassword);
            if (finalAuth.user.uid === teacherUID) {
              console.log(`✅ Final verification successful`);
              break;
            }
          } catch (error) {
            console.error(`Final auth attempt ${attempt + 1} failed:`, error);
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      let message = `✅ Account Creation Complete!\n\n`;
      message += `✅ New accounts: ${successCount}\n`;
      message += `⚠️ Already had accounts: ${existingCount}\n`;
      
      if (successCount > 0) {
        message += `\n📧 Email: From Classlist`;
        message += `\n🔑 Default Password: 123456`;
      }
      
      if (existingCount > 0) {
        message += `\n\n⚠️ Already existing:\n${skippedStudents.slice(0, 5).join('\n')}`;
        if (skippedStudents.length > 5) {
          message += `\n... and ${skippedStudents.length - 5} more`;
        }
      }
      
      if (errorCount > 0) {
        message += `\n\n❌ Failed: ${errorCount} student(s)`;
        if (errors.length > 0) {
          message += `\n${errors.slice(0, 3).join('\n')}`;
          if (errors.length > 3) {
            message += `\n... and ${errors.length - 3} more`;
          }
        }
      }
      
      alert(message);

      await fetchStudentsByClass(viewingClass.id);
      
    } catch (error) {
      console.error("❌ Error creating accounts:", error);
      alert("❌ Failed to create accounts: " + error.message);
    } finally {
      setCreatingAccounts(false);
      setAccountCreationProgress("");
      
      console.log("🔓 Clearing account creation flags...");
      accountCreationInProgressRef.current = false;
      setAccountCreationFlag(false);
      
      await new Promise(resolve => setTimeout(resolve, 500));
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

      let newStudentCount = 0;
      let addedToExistingCount = 0;
      let errorCount = 0;

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
          const cleanEmail = emailAddress?.toString().trim().toLowerCase() || "";

          const existingStudent = await checkStudentExistsByEmail(cleanEmail);

          if (existingStudent) {
            const updatedClassIds = [...new Set([...existingStudent.classIds, classDoc.id])];
            
            await updateDoc(doc(db, "users", existingStudent.id), {
              classIds: updatedClassIds
            });
            
            addedToExistingCount++;
            console.log(`✅ Added ${name} to class ${className} (already exists)`);
          } else {
            await addDoc(collection(db, "users"), {
              studentNo: cleanStudentNo,
              name: name.toString().trim(),
              gender: gender?.toString().trim() || "",
              program: program?.toString().trim() || "",
              year: year?.toString().trim() || "",
              emailAddress: cleanEmail,
              contactNo: contactNo?.toString().trim() || "",
              classIds: [classDoc.id],
              role: "student",
              hasAccount: false,
              authUID: null,
              createdAt: new Date()
            });
            
            newStudentCount++;
            console.log(`✅ New student created: ${name}`);
          }
        } catch (studentError) {
          console.error("Error processing student:", validStudents[i], studentError);
          errorCount++;
        }
      }

      const totalCount = newStudentCount + addedToExistingCount;
      setUploadCount(totalCount);
      
      if (totalCount > 0) {
        let message = `✅ Upload Complete!\n\n`;
        message += `✨ New students: ${newStudentCount}\n`;
        message += `🔗 Added to existing: ${addedToExistingCount}\n`;
        
        if (errorCount > 0) {
          message += `❌ Errors: ${errorCount}`;
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
    if (!window.confirm("Are you sure you want to remove this class? Students will be removed from this class but their records will remain.")) {
      return;
    }

    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("classIds", "array-contains", classId)
      );
      
      const querySnapshot = await getDocs(q);
      
      const updatePromises = [];
      querySnapshot.forEach((docSnapshot) => {
        const student = docSnapshot.data();
        const updatedClassIds = student.classIds.filter(id => id !== classId);
        
        if (updatedClassIds.length > 0) {
          updatePromises.push(
            updateDoc(doc(db, "users", docSnapshot.id), {
              classIds: updatedClassIds
            })
          );
        } else {
          updatePromises.push(deleteDoc(doc(db, "users", docSnapshot.id)));
        }
      });
      
      await Promise.all(updatePromises);
      console.log(`Removed class ${classId} from students`);

      await deleteDoc(doc(db, "classes", classId));

      alert("✅ Class removed successfully!");
      await fetchClasses();
    } catch (error) {
      console.error("Error removing class:", error);
      alert("❌ Failed to remove class: " + error.message);
    }
  };

  return (
    <div className="px-2 py-6 md:p-8 font-Outfit">
      <div className="flex flex-row gap-3 items-center">
        <School className="w-8 h-8 text-accent mb-6" />
        <div className="flex flex-col mb-6">
          <h2 className="text-2xl font-bold text-title flex items-center gap-2">
          Manage Classes
          </h2>
          <p className="text-md font-light text-subtext">
            Add, edit, and organize class in a snap.
          </p>
        </div>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-3xl p-10">
        <div className="text-center">
          <Upload className="mx-auto text-gray-400 w-10 h-10 mb-3" />
          <p className="text-subtext mb-3">Upload your classlist (.csv or .xlsx)</p>
          <p className="text-sm text-subtext mb-3">
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
            className="inline-block px-6 py-3 bg-button text-white font-semibold rounded-lg cursor-pointer hover:bg-buttonHover transition disabled:opacity-50"
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
            <p className="text-sm text-subtext italic mt-3">Selected: {fileName}</p>
          )}

          {uploadProgress && uploading && (
            <p className="text-sm text-accent font-medium mt-3">
              {uploadProgress}
            </p>
          )}

          {accountCreationProgress && creatingAccounts && (
            <p className="text-sm text-accent font-medium mt-3">
              {accountCreationProgress}
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
            <p className="text-accent font-semibold text-center">
              ✅ Successfully processed {uploadCount} student(s)!
            </p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-xl text-title font-semibold mb-4">Your Classes</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="ml-3 text-subtext">Loading…</span>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-8 text-subtext">
            <p>No classes uploaded yet. Upload a file to get started.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="border rounded-xl p-5 shadow-sm hover:shadow-md transition bg-green-50"
              >
                <h4 className="text-lg font-bold text-title">{cls.name}</h4>
                {cls.subject && <p className="text-subtext">{cls.subject}</p>}
                <p className="text-sm text-subtext mb-2">
                  {cls.studentCount} students</p>
                <p className="text-xs text-subsubtext">
                  Teacher: {cls.teacherName}</p>
                <p className="text-xs text-subsubtext">
                  Uploaded: {cls.uploadedAt?.toDate().toLocaleDateString()}
                </p>
                <div className="mt-3 flex justify-between">
                  <button 
                    className="text-button font-semibold hover:underline flex items-center gap-1"
                    onClick={() => handleViewClass(cls)}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button 
                    className="text-red-500 hover:underline font-semibold flex items-center gap-1"
                    onClick={() => handleRemoveClass(cls.id)}
                  >
                    <Trash className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ClassNameModal
        isOpen={showClassNameModal}
        defaultName={pendingUploadData?.file.name.replace(/\.(csv|xlsx|xls)$/i, '')}
        onConfirm={confirmClassNameAndUpload}
        onCancel={cancelClassNameModal}
      />

      <PasswordConfirmModal
        isOpen={showPasswordModal}
        studentCount={studentsList.filter(s => !s.hasAccount).length}
        onConfirm={handlePasswordConfirm}
        onCancel={() => setShowPasswordModal(false)}
      />

      {viewingClass && (
        <ViewClassModal
          isOpen={true}
          classData={viewingClass}
          students={studentsList}
          loading={loadingStudents}
          creatingAccounts={creatingAccounts}
          accountCreationProgress={accountCreationProgress}
          onClose={closeModal}
          onCreateAccounts={handleCreateAccountForAll}
        />
      )}
    </div>
  );
}