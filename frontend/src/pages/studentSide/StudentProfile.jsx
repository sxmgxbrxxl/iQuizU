import { useState, useEffect, useRef } from "react";
import { Loader2, CircleUserRound } from "lucide-react";
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

// Helper functions for year handling
const normalizeYear = (yearValue) => {
    if (!yearValue) return "";
    // Convert "1st", "2nd", "3rd", "4th", "5th" to "1", "2", "3", "4", "5"
    const match = yearValue.toString().match(/^(\d+)/);
    return match ? match[1] : yearValue;
};

const displayYear = (yearValue) => {
    if (!yearValue) return "-";
    const num = normalizeYear(yearValue);
    const suffixes = { "1": "1st", "2": "2nd", "3": "3rd" };
    return suffixes[num] ? `${suffixes[num]} Year` : `${num}th Year`;
};

export default function StudentProfile({ user, userDoc }) {
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // form state
    const [fullName, setFullName] = useState("");
    const [department, setDepartment] = useState("");
    const [emailAddr, setEmailAddr] = useState("");
    const [phone, setPhone] = useState("");
    const [bio, setBio] = useState("");
    const [photoURL, setPhotoURL] = useState("");
    
    // ✅ NEW: Add state for year, gender, studentNo
    const [year, setYear] = useState("");
    const [gender, setGender] = useState("");
    const [studentNo, setStudentNo] = useState("");

    // readonly info
    const displayName = userDoc?.name || user?.displayName || "Student";
    const userInitial = (displayName && displayName.charAt(0).toUpperCase()) || "S";

    // Get the correct document ID from userDoc
    const userDocId = userDoc?.id || null;

    useEffect(() => {
        console.log("=== STUDENT PROFILE DEBUG ===");
        console.log("Auth UID:", user?.uid);
        console.log("UserDoc ID:", userDocId);
        console.log("UserDoc data:", userDoc);
        console.log("Year:", userDoc?.year);
        console.log("Gender:", userDoc?.gender);
        console.log("Student No:", userDoc?.studentNo);
        console.log("============================");

        setFullName(userDoc?.name || user?.displayName || "");
        setDepartment(userDoc?.program || "");
        setEmailAddr(userDoc?.emailAddress || user?.email || "");
        setPhone(userDoc?.contactNo || "");
        setBio(userDoc?.bio || "");
        setPhotoURL(userDoc?.photoURL || "");
        
        // ✅ FIXED: Normalize year from "1st" format to "1" format
        setYear(normalizeYear(userDoc?.year) || "");
        setGender(userDoc?.gender || "");
        setStudentNo(userDoc?.studentNo || "");
        
        setLoading(false);
    }, [user, userDoc, userDocId]);

    // Convert image to Base64
    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    // Handle profile photo upload
    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 500KB for Firestore - be safe!)
        if (file.size > 500 * 1024) {
            alert('File size must be less than 500KB. Please use a smaller image.');
            return;
        }

        // Check if we have userDocId
        if (!userDocId) {
            alert('❌ User document not found. Please refresh the page.');
            return;
        }

        try {
            setUploading(true);

            console.log("Starting upload...");
            console.log("Using Document ID:", userDocId);
            console.log("File size:", file.size, "bytes");

            // Convert image to Base64
            const base64String = await convertToBase64(file);
            console.log("Base64 conversion success, length:", base64String.length);

            // Reference to user document using the CORRECT document ID
            const userDocRef = doc(db, "users", userDocId);
            
            // Check if document exists
            const docSnap = await getDoc(userDocRef);
            
            if (!docSnap.exists()) {
                console.error("Document does not exist!");
                throw new Error("User document not found");
            }

            console.log("Updating existing document...");
            // Update existing document
            await updateDoc(userDocRef, {
                photoURL: base64String
            });

            console.log("Firestore update success!");

            // Update local state
            setPhotoURL(base64String);
            
            alert('Profile photo updated successfully!');
        } catch (error) {
            console.error("FULL ERROR:", error);
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);
            
            let errorMsg = 'Failed to upload photo. ';
            if (error.code === 'permission-denied') {
                errorMsg += 'Permission denied. Check Firestore rules.';
            } else if (error.message.includes('not found')) {
                errorMsg += 'User document not found.';
            } else {
                errorMsg += error.message;
            }
            
            alert(errorMsg);
        } finally {
            setUploading(false);
        }
    };

    // Handle profile save
    const handleSaveProfile = async () => {
        // Check if we have userDocId
        if (!userDocId) {
            alert('❌ User document not found. Please refresh the page.');
            return;
        }

        try {
            const userDocRef = doc(db, "users", userDocId);
            
            // Check if document exists
            const docSnap = await getDoc(userDocRef);
            
            if (!docSnap.exists()) {
                console.error("Document does not exist!");
                throw new Error("User document not found");
            }

            // ✅ UPDATED: Include year, gender, studentNo in update
            await updateDoc(userDocRef, {
                name: fullName,
                program: department,
                emailAddress: emailAddr,
                contactNo: phone,
                bio: bio,
                year: year,
                gender: gender,
                studentNo: studentNo
            });
            
            alert('Profile updated successfully!');
            setEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert('Failed to update profile. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center font-Outfit">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-subtext">Loading…</span>
            </div>
        );
    }

    // Show error if no userDoc found
    if (!userDocId) {
        return (
            <div className="min-h-screen flex items-center justify-center font-Outfit">
                <div className="text-center">
                    <p className="text-red-500 font-semibold mb-4">❌ User document not found</p>
                    <p className="text-subtext">Please contact your administrator or try logging in again.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="py-6 px-2 md:p-8 font-Outfit">
            <div className="flex flex-row gap-3 items-center">
                <CircleUserRound className="w-8 h-8 text-blue-500 mb-6" />
                <div className="flex flex-col mb-6">
                    <h2 className="text-2xl font-bold text-title flex items-center gap-2">
                        Profile
                    </h2>
                    <p className="text-md font-light text-subtext">
                        Your personal profile and academic details.
                    </p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 mt-2">
                <div className="bg-components p-6 rounded-2xl shadow-md w-full">
                    <h2 className="text-xl md:text-2xl text-title font-semibold">User Information</h2>
                    {editing ? (
                        <div className="mt-4 space-y-4">
                            {/* ✅ NEW: Student Number - Read-only */}
                            <div className="flex flex-row gap-4 mt-4 items-center">
                                <label className="w-36 text-subtext">Student No:</label>
                                <input
                                    type="text"
                                    value={studentNo}
                                    disabled
                                    className="border p-2 rounded-xl w-full bg-gray-100 cursor-not-allowed"
                                    title="Student number cannot be changed"
                                />
                            </div>
                            
                            <div className="flex flex-row gap-4 mt-4 items-center">
                                <label className="w-36 text-subtext">Full Name:</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="border p-2 rounded-xl w-full"
                                />
                            </div>
                            
                            <div className="flex flex-row gap-4 mt-4 items-center">
                                <label className="w-36 text-subtext">Program:</label>
                                <input
                                    type="text"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    className="border p-2 rounded-xl w-full"
                                />
                            </div>
                            
                            {/* ✅ NEW: Year Level */}
                            <div className="flex flex-row gap-4 mt-4 items-center">
                                <label className="w-36 text-subtext">Year Level:</label>
                                <select
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    className="border p-2 rounded-xl w-full"
                                >
                                    <option value="">Select Year</option>
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                    <option value="5">5th Year</option>
                                </select>
                            </div>
                            
                            {/* ✅ NEW: Gender */}
                            <div className="flex flex-row gap-4 mt-4 items-center">
                                <label className="w-36 text-subtext">Gender:</label>
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="border p-2 rounded-xl w-full"
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                    <option value="Prefer not to say">Prefer not to say</option>
                                </select>
                            </div>
                            
                            <div className="flex flex-row gap-4 mt-4 items-center">
                                <label className="w-36 text-subtext">Email Address:</label>
                                <input
                                    type="email"
                                    value={emailAddr}
                                    onChange={(e) => setEmailAddr(e.target.value)}
                                    className="border p-2 rounded-xl w-full"
                                />
                            </div>
                            
                            <div className="flex flex-row gap-4 mt-4 items-center">
                                <label className="w-36 text-subtext">Phone:</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="border p-2 rounded-xl w-full"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 space-y-6">
                            {/* ✅ NEW: Display Student Number */}
                            <div className="flex items-center gap-4">
                                <span className="w-36 text-subtext">Student No:</span>
                                <span className="font-medium">{studentNo || "-"}</span>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <span className="w-36 text-subtext">Full Name:</span>
                                <span className="font-medium">{fullName || displayName}</span>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <span className="w-36 text-subtext">Program:</span>
                                <span className="font-medium">{department || "-"}</span>
                            </div>
                            
                            {/* ✅ FIXED: Display Year with proper formatting */}
                            <div className="flex items-center gap-4">
                                <span className="w-36 text-subtext">Year Level:</span>
                                <span className="font-medium">{displayYear(year)}</span>
                            </div>
                            
                            {/* ✅ NEW: Display Gender */}
                            <div className="flex items-center gap-4">
                                <span className="w-36 text-subtext">Gender:</span>
                                <span className="font-medium">{gender || "-"}</span>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <span className="w-36 text-subtext">Email Address:</span>
                                <span className="font-medium">{emailAddr || "-"}</span>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <span className="w-36 text-subtext">Phone:</span>
                                <span className="font-medium">{phone || "-"}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col p-10 gap-4 items-center rounded-3xl bg-components shadow-md">
                    {photoURL ? (
                        <img
                            src={photoURL}
                            alt="Profile"
                            className="w-52 h-52 rounded-full object-cover shadow-lg ring-2 ring-white/20"
                        />
                    ) : (
                        <div className="w-52 h-52 text-8xl bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/20">
                            {userInitial}
                        </div>
                    )}
                    
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoChange}
                        accept="image/*"
                        className="hidden"
                    />
                    
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="bg-button px-6 py-4 rounded-xl text-base text-white font-semibold hover:bg-buttonHover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            'Change Profile Photo'
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-components rounded-3xl shadow-md p-6 mt-4">
                <h1 className="text-xl md:text-2xl font-semibold text-title">
                    Educational Background
                </h1>
                <div className="flex flex-row items-center justify-between mt-4">
                    <p className="text-subtext">No educational background added yet.</p>
                    <button className="mt-4 bg-accent px-4 py-2 rounded-lg text-white font-semibold hover:bg-accentHover transition">
                        Add Educational Background
                    </button>
                </div>
            </div>

            <div className="bg-components rounded-3xl shadow-md p-6 mt-4">
                <h1 className="text-xl md:text-2xl font-semibold text-title">
                    About
                </h1>
                <div className="flex flex-row items-start gap-4 mt-4">
                    <label className="w-36 text-subtext">Bio:</label>
                    {editing ? (
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="border p-2 rounded-xl w-full"
                            rows={3}
                        />
                    ) : (
                        <span className="font-medium">{bio || "-"}</span>
                    )}
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    className="bg-accent px-4 py-2 rounded-lg text-white font-semibold hover:bg-accentHover transition mt-4"
                    onClick={() => {
                        if (editing) {
                            handleSaveProfile();
                        } else {
                            setEditing(true);
                        }
                    }}
                >
                    {editing ? "Save Changes" : "Edit Profile"}
                </button>
                
                {editing && (
                    <button
                        className="bg-gray-300 px-4 py-2 rounded-lg text-gray-700 font-semibold hover:bg-gray-400 transition mt-4"
                        onClick={() => {
                            setEditing(false);
                            // Reset to original values
                            setFullName(userDoc?.name || user?.displayName || "");
                            setDepartment(userDoc?.program || "");
                            setEmailAddr(userDoc?.emailAddress || user?.email || "");
                            setPhone(userDoc?.contactNo || "");
                            setBio(userDoc?.bio || "");
                            setYear(normalizeYear(userDoc?.year) || "");
                            setGender(userDoc?.gender || "");
                            setStudentNo(userDoc?.studentNo || "");
                        }}
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}