import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
    Loader2,
    KeyRound,
    CheckCircle,
    XCircle,
    AlertTriangle,
    X,
    Mail,
    Pencil,
    Trash2,
    Eye,
    EyeOff,
    ShieldCheck,
} from "lucide-react";
import {
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
} from "firebase/auth";
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../../firebase/firebaseConfig";
import { ProfileSkeleton } from "../../components/SkeletonLoaders";

// ─── Password Validation Helper ──────────────────────────────────────────────
const validatePassword = (password) => ({
    length: password.length >= 7 && password.length <= 16,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
    startsWithUppercase: /^[A-Z]/.test(password),
});

const isPasswordValid = (password) => {
    const v = validatePassword(password);
    return v.length && v.hasLetter && v.hasNumber && v.hasSymbol && v.startsWithUppercase;
};

// ─── Email Validation Helper ──────────────────────────────────────────────────
const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,6}$/.test(email.trim());

// ─── Custom Toast Notification ───────────────────────────────────────────────
function Toast({ toast, onClose }) {
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => onClose(), 3500);
        return () => clearTimeout(timer);
    }, [toast, onClose]);

    if (!toast) return null;

    const styles = {
        success: {
            bg: "bg-green-50 border-green-200",
            icon: <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />,
            text: "text-green-800",
        },
        error: {
            bg: "bg-red-50 border-red-200",
            icon: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
            text: "text-red-800",
        },
        warning: {
            bg: "bg-yellow-50 border-yellow-200",
            icon: <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />,
            text: "text-yellow-800",
        },
        info: {
            bg: "bg-blue-50 border-blue-200",
            icon: <Mail className="w-5 h-5 text-blue-500 flex-shrink-0" />,
            text: "text-blue-800",
        },
    };

    const s = styles[toast.type] || styles.info;

    return createPortal(
        <div className="fixed top-20 right-6 z-[9999] animate-slideIn max-w-sm w-full">
            <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${s.bg}`}>
                {s.icon}
                <p className={`text-sm font-medium flex-1 ${s.text}`}>{toast.message}</p>
                <button onClick={onClose} className="p-0.5 hover:bg-black/5 rounded-lg transition">
                    <X className="w-4 h-4 text-gray-400" />
                </button>
            </div>
        </div>,
        document.body
    );
}

// ─── Custom Confirm Dialog ───────────────────────────────────────────────────
function ConfirmDialog({ isOpen, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, icon, color }) {
    useEffect(() => {
        if (!isOpen) return;
        const scrollableParent = document.querySelector('.overflow-y-auto');
        document.body.style.overflow = 'hidden';
        if (scrollableParent) scrollableParent.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
            if (scrollableParent) scrollableParent.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const colorMap = {
        orange: { btn: "bg-orange-500 hover:bg-orange-600", iconBg: "bg-orange-100", iconColor: "text-orange-600" },
        red: { btn: "bg-red-500 hover:bg-red-600", iconBg: "bg-red-100", iconColor: "text-red-600" },
        blue: { btn: "bg-blue-500 hover:bg-blue-600", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
        green: { btn: "bg-green-600 hover:bg-green-700", iconBg: "bg-green-100", iconColor: "text-green-600" },
    };
    const c = colorMap[color] || colorMap.blue;

    return createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-full ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
                            {icon || <AlertTriangle className={`w-6 h-6 ${c.iconColor}`} />}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed ml-16">{message}</p>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end border-t border-gray-100">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition text-sm"
                    >
                        {cancelLabel || "Cancel"}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-5 py-2.5 ${c.btn} text-white rounded-xl font-semibold transition text-sm`}
                    >
                        {confirmLabel || "Confirm"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}


// Helper functions for year handling
const normalizeYear = (yearValue) => {
    if (!yearValue) return "";
    const match = yearValue.toString().match(/^(\d+)/);
    return match ? match[1] : yearValue;
};

const displayYear = (yearValue) => {
    if (!yearValue) return "-";
    const num = normalizeYear(yearValue);
    const suffixes = { "1": "1st", "2": "2nd", "3": "3rd" };
    return suffixes[num] ? `${suffixes[num]} Year` : `${num}th Year`;
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function StudentProfile({ user, userDoc }) {
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [checkingEmail, setCheckingEmail] = useState(false);



    const emailCheckTimer = useRef(null);
    const fileInputRef = useRef(null);

    const pwValidation = validatePassword(newPassword);
    const allPwValid = isPasswordValid(newPassword);
    const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

    const resetPasswordForm = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowCurrentPw(false);
        setShowNewPw(false);
        setShowConfirmPw(false);
        setShowPasswordForm(false);
    };

    // Toast state
    const [toast, setToast] = useState(null);
    const showToast = useCallback((type, message) => {
        setToast({ type, message });
    }, []);
    const clearToast = useCallback(() => setToast(null), []);

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

    // readonly info
    const displayName = userDoc?.name || user?.displayName || "Student";
    const userInitial = (displayName && displayName.charAt(0).toUpperCase()) || "S";
    const userDocId = userDoc?.id || user?.uid || null;

    // The original email from Firestore
    const originalEmail = useMemo(
        () => (userDoc?.emailAddress || user?.email || "").toLowerCase().trim(),
        [userDoc, user]
    );

    // ─── Email Duplicate Checker (debounced) ─────────────────────────────────
    const checkEmailExists = useCallback(async (email) => {
        const trimmed = email.toLowerCase().trim();

        if (!trimmed) {
            setEmailError("Email Address cannot be empty.");
            setCheckingEmail(false);
            return;
        }

        if (!isValidEmail(trimmed)) {
            setEmailError("Please enter a valid email address.");
            setCheckingEmail(false);
            return;
        }

        if (trimmed === originalEmail) {
            setEmailError("");
            setCheckingEmail(false);
            return;
        }

        try {
            setCheckingEmail(true);
            const q = query(
                collection(db, "users"),
                where("emailAddress", "==", trimmed)
            );
            const snap = await getDocs(q);
            const taken = snap.docs.some((d) => d.id !== userDocId);
            setEmailError(taken ? "This email is already in use by another account." : "");
        } catch (err) {
            console.error("Error checking email:", err);
            setEmailError("");
        } finally {
            setCheckingEmail(false);
        }
    }, [originalEmail, userDocId]);

    const handleEmailChange = useCallback((value) => {
        setEmailAddr(value);
        setEmailError("");
        if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
        emailCheckTimer.current = setTimeout(() => {
            checkEmailExists(value);
        }, 500);
    }, [checkEmailExists]);

    // form state
    const [fullName, setFullName] = useState("");
    const [department, setDepartment] = useState("");
    const [emailAddr, setEmailAddr] = useState("");
    const [phone, setPhone] = useState("");
    const [bio, setBio] = useState("");
    const [photoURL, setPhotoURL] = useState("");
    const [year, setYear] = useState("");
    const [gender, setGender] = useState("");
    const [studentNo, setStudentNo] = useState("");

    useEffect(() => {
        setFullName(userDoc?.name || user?.displayName || "");
        setDepartment(userDoc?.program || "");
        setEmailAddr(userDoc?.emailAddress || user?.email || "");
        setPhone(userDoc?.contactNo || "");
        setBio(userDoc?.bio || "");
        setPhotoURL(userDoc?.photoURL || "");
        setYear(normalizeYear(userDoc?.year) || "");
        setGender(userDoc?.gender || "");
        setStudentNo(userDoc?.studentNo || "");
        setLoading(false);
    }, [user, userDoc]);

    // Handle profile photo upload
    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast("warning", "Please select an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast("warning", "File size must be less than 5MB");
            return;
        }

        if (!userDocId) {
            showToast("error", "User document not found");
            return;
        }

        try {
            setUploading(true);
            const fileExtension = file.name.split('.').pop();
            const storageRef = ref(storage, `profileImages/${userDocId}.${fileExtension}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const userDocRef = doc(db, "users", userDocId);
            const docSnap = await getDoc(userDocRef);

            if (!docSnap.exists()) throw new Error("User document not found");

            const uniqueURL = `${downloadURL}&t=${Date.now()}`;
            await updateDoc(userDocRef, { photoURL: uniqueURL });
            setPhotoURL(uniqueURL);

            window.dispatchEvent(new Event('refreshUserDoc'));
            showToast("success", "Profile photo updated successfully!");
        } catch (error) {
            console.error("Error uploading photo:", error);
            showToast("error", "Failed to upload photo. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    // Handle profile photo removal
    const handleRemovePhoto = async () => {
        if (!userDocId) return;
        setConfirmDialog({
            isOpen: true,
            title: "Remove Profile Photo",
            message: "Are you sure you want to remove your profile photo?",
            confirmLabel: "Remove",
            color: "red",
            icon: <Trash2 className="w-6 h-6 text-red-600" />,
            onConfirm: async () => {
                setConfirmDialog({ isOpen: false });
                try {
                    setUploading(true);
                    const userDocRef = doc(db, "users", userDocId);
                    await updateDoc(userDocRef, { photoURL: "" });
                    setPhotoURL("");
                    window.dispatchEvent(new Event('refreshUserDoc'));
                    showToast("success", "Profile photo removed successfully!");
                } catch (error) {
                    console.error("Error removing photo:", error);
                    showToast("error", "Failed to remove photo.");
                } finally {
                    setUploading(false);
                }
            },
            onCancel: () => setConfirmDialog({ isOpen: false }),
        });
    };

    // ─── Core email save logic ────────────────────────────────────────────────
    // We ONLY update the Firestore emailAddress field. We do NOT touch
    // Firebase Auth email — it stays as the original forever and is used
    // solely for authentication via signInWithEmailAndPassword.
    // This completely avoids the Auth ↔ Firestore email mismatch bug.
    const performEmailUpdate = useCallback(async (trimmedEmail) => {
        try {
            const currentAuthEmail = auth.currentUser?.email || originalEmail;
            const userDocRef = doc(db, "users", userDocId);
            await updateDoc(userDocRef, {
                emailAddress: trimmedEmail,
                // Store the original Auth email so the login page can always
                // authenticate using it, regardless of emailAddress changes.
                authEmail: currentAuthEmail,
            });

            window.dispatchEvent(new Event('refreshUserDoc'));
            showToast("success", "Email updated successfully!");
            setEditing(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
            console.error("Error updating email:", error);
            throw error;
        }
    }, [userDocId, showToast, originalEmail]);

    // ─── Handle profile save ──────────────────────────────────────────────────
    const handleSaveProfile = async () => {
        if (!userDocId) {
            showToast("error", "User document not found");
            return;
        }

        if (!emailAddr.trim()) {
            showToast("warning", "Email Address cannot be empty.");
            return;
        }

        if (!isValidEmail(emailAddr)) {
            showToast("warning", "Please enter a valid email address.");
            return;
        }

        if (emailError) {
            showToast("warning", emailError);
            return;
        }

        if (checkingEmail) {
            showToast("info", "Please wait while we verify your email.");
            return;
        }

        const trimmedEmail = emailAddr.toLowerCase().trim();

        // No change — nothing to do
        if (trimmedEmail === originalEmail) {
            setEditing(false);
            return;
        }

        // Final duplicate check
        try {
            const q = query(
                collection(db, "users"),
                where("emailAddress", "==", trimmedEmail)
            );
            const snap = await getDocs(q);
            const taken = snap.docs.some((d) => d.id !== userDocId);
            if (taken) {
                showToast("warning", "This email is already in use by another account.");
                setEmailError("This email is already in use by another account.");
                return;
            }
        } catch (err) {
            console.error("Error in final email check:", err);
        }

        try {
            setSaving(true);
            await performEmailUpdate(trimmedEmail);
        } catch (error) {
            showToast("error", "Failed to update email. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // ─── Handle password change ───────────────────────────────────────────────
    const handleChangePassword = async () => {
        if (!currentPassword) {
            showToast("warning", "Please enter your current password.");
            return;
        }
        if (!allPwValid) {
            showToast("warning", "New password does not meet all requirements.");
            return;
        }
        if (!passwordsMatch) {
            showToast("warning", "New passwords do not match.");
            return;
        }

        setConfirmDialog({
            isOpen: true,
            title: "Change Password",
            message: "Are you sure you want to change your password? You will remain logged in after the change.",
            confirmLabel: "Change Password",
            cancelLabel: "Cancel",
            color: "orange",
            icon: <ShieldCheck className="w-6 h-6 text-orange-600" />,
            onConfirm: async () => {
                setConfirmDialog({ isOpen: false });
                try {
                    setChangingPassword(true);
                    const credential = EmailAuthProvider.credential(user.email, currentPassword);
                    await reauthenticateWithCredential(auth.currentUser, credential);
                    await updatePassword(auth.currentUser, newPassword);
                    showToast("success", "Password changed successfully!");
                    resetPasswordForm();
                } catch (error) {
                    console.error("Error changing password:", error);
                    if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                        showToast("error", "Current password is incorrect.");
                    } else if (error.code === "auth/too-many-requests") {
                        showToast("error", "Too many attempts. Please try again later.");
                    } else {
                        showToast("error", "Failed to change password. Please try again.");
                    }
                } finally {
                    setChangingPassword(false);
                }
            },
            onCancel: () => setConfirmDialog({ isOpen: false }),
        });
    };

    if (loading) {
        return <ProfileSkeleton />;
    }

    return (
        <div className="font-Poppins animate-fadeIn mb-12">
            <Toast toast={toast} onClose={clearToast} />
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                cancelLabel={confirmDialog.cancelLabel}
                onConfirm={confirmDialog.onConfirm}
                onCancel={confirmDialog.onCancel}
                icon={confirmDialog.icon}
                color={confirmDialog.color}
            />


            {/* ─── Header Card ─── */}
            <div className="relative bg-green-600 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_6px_25px_rgb(0,0,0,0.15)] transition-all overflow-hidden mx-1 md:mx-2 mt-2 px-5 py-6 md:p-6 group text-white border border-green-500">
                <div className="absolute -top-16 -right-16 w-64 h-64 bg-white rounded-full opacity-10 transition-transform group-hover:scale-110 pointer-events-none" />
                <div className="relative z-10">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">My Profile</h1>
                    <p className="text-green-100 text-xs md:text-sm mt-1">
                        Your personal profile and academic details.
                    </p>
                </div>
            </div>

            {/* ─── Profile Photo Section ─── */}
            <div className="flex flex-col items-center mt-5 mb-2">
                <div className="relative group">
                    {photoURL ? (
                        <>
                            <img
                                src={photoURL}
                                alt="Profile"
                                className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover shadow-xl ring-4 ring-white"
                            />
                            <button
                                onClick={handleRemovePhoto}
                                disabled={uploading}
                                className="absolute bottom-1 left-1 w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 ring-3 ring-white disabled:opacity-50"
                                title="Remove Photo"
                            >
                                <Trash2 className="w-4 h-4 text-white" />
                            </button>
                        </>
                    ) : (
                        <div className="w-32 h-32 md:w-40 md:h-40 text-4xl md:text-6xl bg-gradient-to-br from-green-300 to-green-600 rounded-full flex items-center justify-center text-white font-bold shadow-xl ring-4 ring-white">
                            {userInitial}
                        </div>
                    )}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute bottom-1 right-1 w-10 h-10 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 ring-3 ring-white disabled:opacity-50"
                        title={photoURL ? "Change Photo" : "Upload Photo"}
                    >
                        {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Pencil className="w-4 h-4 text-white" />}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoChange}
                        accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                    />
                </div>
                <h2 className="text-lg md:text-xl font-bold text-center text-gray-800 mt-4">{fullName || displayName}</h2>
                <p className="text-gray-500 text-sm">{department || "Student"}</p>
            </div>

            {/* ─── Personal Details Card ─── */}
            <div className="mx-1 md:mx-2 mt-4 mb-4">
                <div className="bg-white rounded-2xl overflow-hidden border border-green-500">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h3 className="text-base md:text-lg font-bold text-green-600">Personal Details</h3>
                        {!editing && (
                            <button
                                onClick={() => setEditing(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-xl transition text-sm"
                            >
                                <Mail className="w-4 h-4" />
                                Edit Email
                            </button>
                        )}
                    </div>

                    <div className="p-6">
                        {editing ? (
                            <div className="space-y-5">
                                {/* Student No (Read-only) */}
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-gray-500 text-sm font-medium">Student No</label>
                                    <input type="text" value={studentNo} disabled className="border border-gray-200 p-2.5 rounded-xl w-full bg-gray-50 text-gray-400 cursor-not-allowed" />
                                </div>

                                {/* Full Name (Read-only) */}
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-gray-500 text-sm font-medium">Full Name</label>
                                    <input type="text" value={fullName} disabled className="border border-gray-200 p-2.5 rounded-xl w-full bg-gray-50 text-gray-400 cursor-not-allowed" />
                                </div>

                                {/* Program (Read-only) */}
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-gray-500 text-sm font-medium">Program</label>
                                    <input type="text" value={department} disabled className="border border-gray-200 p-2.5 rounded-xl w-full bg-gray-50 text-gray-400 cursor-not-allowed" />
                                </div>

                                {/* Year Level (Read-only) */}
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-gray-500 text-sm font-medium">Year Level</label>
                                    <input type="text" value={displayYear(year)} disabled className="border border-gray-200 p-2.5 rounded-xl w-full bg-gray-50 text-gray-400 cursor-not-allowed" />
                                </div>

                                {/* Gender (Read-only) */}
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-gray-500 text-sm font-medium">Gender</label>
                                    <input type="text" value={gender || "-"} disabled className="border border-gray-200 p-2.5 rounded-xl w-full bg-gray-50 text-gray-400 cursor-not-allowed" />
                                </div>

                                {/* Email (Editable) */}
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-start">
                                    <label className="sm:w-40 text-gray-500 text-sm font-medium sm:pt-3">
                                        Email Address
                                        <span className="ml-1.5 text-xs text-green-600 font-semibold">(editable)</span>
                                    </label>
                                    <div className="w-full">
                                        <div className="relative">
                                            <input
                                                type="email"
                                                value={emailAddr}
                                                onChange={(e) => handleEmailChange(e.target.value)}
                                                className={`border p-2.5 pr-10 rounded-xl w-full focus:outline-none focus:ring-2 transition ${emailError
                                                    ? "border-red-300 focus:ring-red-500/30 focus:border-red-400"
                                                    : emailAddr.toLowerCase().trim() !== originalEmail && emailAddr.trim() && !checkingEmail
                                                        ? "border-green-300 focus:ring-green-500/30 focus:border-green-400"
                                                        : "border-gray-200 focus:ring-green-500/30 focus:border-green-400"
                                                    }`}
                                                placeholder="Enter email address"
                                            />
                                            {checkingEmail && (
                                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                                            )}
                                            {!checkingEmail && emailAddr.trim() && !emailError && emailAddr.toLowerCase().trim() !== originalEmail && (
                                                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                                            )}
                                            {!checkingEmail && emailError && (
                                                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                                            )}
                                        </div>
                                        {emailError && (
                                            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                                                <XCircle className="w-3 h-3 flex-shrink-0" /> {emailError}
                                            </p>
                                        )}
                                        {!emailError && emailAddr.toLowerCase().trim() !== originalEmail && emailAddr.trim() && !checkingEmail && (
                                            <p className="text-green-600 text-xs mt-1.5 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3 flex-shrink-0" /> Email is available
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Phone (Read-only) */}
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-gray-500 text-sm font-medium">Phone</label>
                                    <input type="text" value={phone || "-"} disabled className="border border-gray-200 p-2.5 rounded-xl w-full bg-gray-50 text-gray-400 cursor-not-allowed" />
                                </div>

                                {/* Save / Cancel buttons */}
                                <div className="flex gap-3 pt-3 border-t border-gray-100">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={saving || !!emailError || checkingEmail}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            "Save Changes"
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditing(false);
                                            setEmailError("");
                                            setEmailAddr(userDoc?.emailAddress || user?.email || "");
                                        }}
                                        className="px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                    <span className="sm:w-40 text-gray-500 text-sm font-medium">Student No</span>
                                    <span className="font-semibold text-gray-800">{studentNo || "-"}</span>
                                </div>
                                <div className="border-b border-gray-50" />

                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                    <span className="sm:w-40 text-gray-500 text-sm font-medium">Full Name</span>
                                    <span className="font-semibold text-gray-800">{fullName || displayName}</span>
                                </div>
                                <div className="border-b border-gray-50" />

                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                    <span className="sm:w-40 text-gray-500 text-sm font-medium">Program</span>
                                    <span className="font-semibold text-gray-800">{department || "-"}</span>
                                </div>
                                <div className="border-b border-gray-50" />

                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                    <span className="sm:w-40 text-gray-500 text-sm font-medium">Year Level</span>
                                    <span className="font-semibold text-gray-800">{displayYear(year)}</span>
                                </div>
                                <div className="border-b border-gray-50" />

                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                    <span className="sm:w-40 text-gray-500 text-sm font-medium">Gender</span>
                                    <span className="font-semibold text-gray-800">{gender || "-"}</span>
                                </div>
                                <div className="border-b border-gray-50" />

                                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                                    <span className="sm:w-40 text-gray-500 text-sm font-medium sm:pt-0.5">Email Address</span>
                                    <div>
                                        <span className="font-semibold text-gray-800 break-all sm:break-normal">{emailAddr || "-"}</span>
                                        {userDoc?.pendingEmail && (
                                            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                                <Mail className="w-3 h-3 flex-shrink-0" />
                                                Pending change to <span className="font-semibold">{userDoc.pendingEmail}</span> — check your inbox to verify.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="border-b border-gray-50" />

                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                    <span className="sm:w-40 text-gray-500 text-sm font-medium">Phone</span>
                                    <span className="font-semibold text-gray-800">{phone || "-"}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Security Card ─── */}
                <div className="bg-white rounded-2xl overflow-hidden mt-4 border border-green-500">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h3 className="text-base md:text-lg font-bold text-orange-500">Security</h3>
                    </div>
                    <div className="p-6">
                        {!showPasswordForm ? (
                            <>
                                <p className="text-gray-500 text-sm mb-4">Update your password to keep your account secure.</p>
                                <button
                                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-sm"
                                    onClick={() => setShowPasswordForm(true)}
                                >
                                    <KeyRound className="w-4 h-4" />
                                    Change Password
                                </button>
                            </>
                        ) : (
                            <div className="space-y-4">
                                {/* Current Password */}
                                <div>
                                    <label className="text-gray-500 text-sm font-medium block mb-1.5">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPw ? "text" : "password"}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="border border-gray-200 p-2.5 pr-10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
                                            placeholder="Enter current password"
                                        />
                                        <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                                            {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* New Password */}
                                <div>
                                    <label className="text-gray-500 text-sm font-medium block mb-1.5">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPw ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            maxLength={16}
                                            className="border border-gray-200 p-2.5 pr-10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
                                            placeholder="Enter new password"
                                        />
                                        <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                                            {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Password Validation Checklist */}
                                {newPassword.length > 0 && (
                                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password Requirements</p>
                                        {[
                                            { key: "length", label: "7–16 characters", met: pwValidation.length },
                                            { key: "upper", label: "Starts with an uppercase letter", met: pwValidation.startsWithUppercase },
                                            { key: "letter", label: "Contains letters", met: pwValidation.hasLetter },
                                            { key: "number", label: "Contains numbers", met: pwValidation.hasNumber },
                                            { key: "symbol", label: "Contains a symbol (!@#$%...)", met: pwValidation.hasSymbol },
                                        ].map((rule) => (
                                            <div key={rule.key} className="flex items-center gap-2">
                                                {rule.met ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                                )}
                                                <span className={`text-sm ${rule.met ? "text-green-700" : "text-red-500"}`}>{rule.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Confirm Password */}
                                <div>
                                    <label className="text-gray-500 text-sm font-medium block mb-1.5">Confirm New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPw ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            maxLength={16}
                                            className={`border p-2.5 pr-10 rounded-xl w-full focus:outline-none focus:ring-2 transition ${confirmPassword.length > 0
                                                ? passwordsMatch
                                                    ? "border-green-300 focus:ring-green-500/30 focus:border-green-400"
                                                    : "border-red-300 focus:ring-red-500/30 focus:border-red-400"
                                                : "border-gray-200 focus:ring-orange-500/30 focus:border-orange-400"
                                                }`}
                                            placeholder="Re-enter new password"
                                        />
                                        <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                                            {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {confirmPassword.length > 0 && !passwordsMatch && (
                                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                                            <XCircle className="w-3 h-3" /> Passwords do not match
                                        </p>
                                    )}
                                    {passwordsMatch && (
                                        <p className="text-green-600 text-xs mt-1.5 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> Passwords match
                                        </p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-3 border-t border-gray-100">
                                    <button
                                        onClick={handleChangePassword}
                                        disabled={changingPassword || !allPwValid || !passwordsMatch || !currentPassword}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {changingPassword ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Changing...
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck className="w-4 h-4" />
                                                Update Password
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={resetPasswordForm}
                                        disabled={changingPassword}
                                        className="px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}