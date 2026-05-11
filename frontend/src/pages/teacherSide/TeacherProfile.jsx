import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2, KeyRound, CheckCircle, XCircle, AlertTriangle, X, Mail, IdCard, Pencil, Trash2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, updateDoc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
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
        // Lock scroll on body and the main scrollable container
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
    };
    const c = colorMap[color] || colorMap.blue;

    return createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-overlayFade">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-popIn font-Poppins">
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

// ─── Main Component ──────────────────────────────────────────────────────────
export default function TeacherProfile({ user, userDoc }) {
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

    // Saved profile state — keeps the latest saved values so we don't depend on stale props
    const [savedProfile, setSavedProfile] = useState(null);

    // Department options from admin-maintained Firestore collection
    const [departmentsList, setDepartmentsList] = useState([]);

    // form state (initialized from user / userDoc)
    const [fullName, setFullName] = useState("");
    const [department, setDepartment] = useState("");
    const [emailAddr, setEmailAddr] = useState("");
    const [phone, setPhone] = useState("");
    const [bio, setBio] = useState("");
    const [photoURL, setPhotoURL] = useState("");

    // readonly info — prefer savedProfile over stale userDoc prop
    const profile = savedProfile || userDoc;
    const displayName = profile?.name || profile?.firstName || user?.displayName || "Teacher";
    const userInitial = (displayName && displayName.charAt(0).toUpperCase()) || "T";
    const userDocId = profile?.id || userDoc?.id || user?.uid || null;

    // Fetch admin-maintained department list
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const q = query(collection(db, "departments"), orderBy("name", "asc"));
                const snapshot = await getDocs(q);
                const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                setDepartmentsList(list);
            } catch (error) {
                console.error("Error fetching departments:", error);
            }
        };
        fetchDepartments();
    }, []);

    useEffect(() => {
        // Only initialize from userDoc if we haven't saved locally yet
        if (!savedProfile) {
            setFullName(userDoc?.name || userDoc?.firstName || user?.displayName || "");
            setDepartment(userDoc?.department || "");
            setEmailAddr(userDoc?.email || user?.email || "");
            setPhone(userDoc?.phone || "");
            setBio(userDoc?.bio || "");
            setPhotoURL(userDoc?.photoURL || "");
        }
        setLoading(false);
    }, [user, userDoc, savedProfile]);

    // Handle profile photo upload to Firebase Storage
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

            // Upload to Firebase Storage
            const fileExtension = file.name.split('.').pop();
            const storageRef = ref(storage, `profileImages/${userDocId}.${fileExtension}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Update Firestore with the download URL
            const userDocRef = doc(db, "users", userDocId);
            const docSnap = await getDoc(userDocRef);

            if (!docSnap.exists()) {
                throw new Error("User document not found");
            }

            // Add cache-buster so browser forces image refresh
            const uniqueURL = `${downloadURL}&t=${Date.now()}`;

            await updateDoc(userDocRef, { photoURL: uniqueURL });
            setPhotoURL(uniqueURL);

            // Notify App.js to refresh userDoc so sidebar + other components update
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

    // Handle inline password change with Firebase reauthentication
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

    // Handle profile save to Firestore
    const handleSaveProfile = async () => {
        if (!userDocId) {
            showToast("error", "User document not found. Please refresh the page.");
            return;
        }

        if (!fullName.trim() || !emailAddr.trim()) {
            showToast("warning", "Full Name and Email Address cannot be empty.");
            return;
        }

        if (fullName.length > 70) {
            showToast("warning", "Full Name exceeds the maximum character limit.");
            return;
        }
        if (/\d/.test(fullName)) {
            showToast("warning", "Full Name must not contain numbers.");
            return;
        }

        if (/[^a-zA-Z\s\-'.ÑñÁáÉéÍíÓóÚú]/.test(fullName)) {
            showToast("warning", "Full Name contains invalid characters.");
            return;
        }

        try {
            setSaving(true);
            const userDocRef = doc(db, "users", userDocId);

            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists()) {
                throw new Error("User document not found");
            }

            const updatedData = {
                name: fullName,
                department: department,
                email: emailAddr,
                phone: phone,
                bio: bio,
            };

            await updateDoc(userDocRef, updatedData);

            // Update local saved profile so UI reflects the new values
            // and doesn't revert to stale userDoc prop
            setSavedProfile({
                ...docSnap.data(),
                ...updatedData,
                id: userDocId,
            });

            // Notify App.js to refresh userDoc so sidebar + other components update
            window.dispatchEvent(new Event('refreshUserDoc'));

            showToast("success", "Profile updated successfully!");
            setEditing(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
            console.error("Error updating profile:", error);
            let errorMsg = "Failed to update profile. ";
            if (error.code === "permission-denied") {
                errorMsg += "Permission denied. Check Firestore rules.";
            } else {
                errorMsg += error.message;
            }
            showToast("error", errorMsg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <ProfileSkeleton />;
    }

    return (
        <div className="font-Poppins animate-fadeIn">
            {/* Toast Notification */}
            <Toast toast={toast} onClose={clearToast} />

            {/* Confirm Dialog */}
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

            {/* ─── Gradient Banner Header ─── */}
            <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 rounded-2xl w-full mt-4 px-6 py-8 md:py-10 overflow-hidden shadow-lg">
                {/* Decorative circles */}
                <div className="absolute top-[-30px] right-[-30px] w-40 h-40 bg-white/10 rounded-full" />
                <div className="absolute bottom-[-20px] right-[80px] w-24 h-24 bg-white/5 rounded-full" />

                <div className="relative flex items-center gap-3">
                    <IdCard className="w-8 h-8 md:w-10 md:h-10 text-white/90" />
                    <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">My Profile</h1>
                </div>
                <p className="relative text-blue-100 text-sm md:text-base mt-1 ml-11 md:ml-[52px]">
                    Your personal teaching profile and academic details.
                </p>
            </div>

            {/* ─── Profile Photo Section ─── */}
            <div className="flex flex-col items-center mt-8 mb-2">
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
                        <div className="w-32 h-32 md:w-40 md:h-40 text-4xl md:text-6xl bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-xl ring-4 ring-white">
                            {userInitial}
                        </div>
                    )}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute bottom-1 right-1 w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 ring-3 ring-white disabled:opacity-50"
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
                <h2 className="text-lg md:text-xl font-bold text-title mt-4">{fullName || displayName}</h2>
                <p className="text-subtext text-sm">{department || "Teacher"}</p>
            </div>

            {/* ─── Personal Details Card ─── */}
            <div className="w-full mt-6 mb-6">
                <div className="bg-components rounded-2xl shadow-md overflow-hidden">
                    {/* Card header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h3 className="text-lg md:text-xl font-bold text-blue-600">Personal Details</h3>
                        {!editing && (
                            <button
                                onClick={() => setEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
                            >
                                <Pencil className="w-4 h-4" />
                                Edit
                            </button>
                        )}
                    </div>

                    {/* Card content */}
                    <div className="p-6">
                        {editing ? (
                            <div className="space-y-5">
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-subtext text-sm font-medium">Full Name</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value.replace(/[^a-zA-Z\s\-'.ÑñÁáÉéÍíÓóÚú]/g, ""))}
                                        className="border border-gray-200 p-2.5 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                                        maxLength={70}
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-subtext text-sm font-medium">Department</label>
                                    <select
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        className="border border-gray-200 p-2.5 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition bg-white"
                                    >
                                        <option value="">— Select Department —</option>
                                        {departmentsList.map((dept) => (
                                            <option key={dept.id} value={dept.name}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-subtext text-sm font-medium">Email Address</label>
                                    <input
                                        type="email"
                                        value={emailAddr}
                                        disabled
                                        className="border border-gray-200 p-2.5 rounded-xl w-full bg-gray-50 text-gray-500 cursor-not-allowed"
                                        title="Email address cannot be changed directly"
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-subtext text-sm font-medium">Phone</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, "");
                                            if (value.length <= 11) setPhone(value);
                                        }}
                                        maxLength={11}
                                        className="border border-gray-200 p-2.5 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                                    />
                                </div>

                                {/* Save / Cancel buttons */}
                                <div className="flex gap-3 pt-3 border-t border-gray-100">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                                            // Revert to savedProfile (latest saved) or original userDoc
                                            const src = savedProfile || userDoc;
                                            setFullName(src?.name || src?.firstName || user?.displayName || "");
                                            setDepartment(src?.department || "");
                                            setEmailAddr(src?.email || user?.email || "");
                                            setPhone(src?.phone || "");
                                            setBio(src?.bio || "");
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
                                    <span className="sm:w-40 text-subtext text-sm font-medium">Full Name</span>
                                    <span className="font-semibold text-title">{fullName || displayName || "-"}</span>
                                </div>
                                <div className="border-b border-gray-50" />
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                    <span className="sm:w-40 text-subtext text-sm font-medium">Department</span>
                                    <span className="font-semibold text-title">{department || "-"}</span>
                                </div>
                                <div className="border-b border-gray-50" />
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                    <span className="sm:w-40 text-subtext text-sm font-medium">Email Address</span>
                                    <span className="font-semibold text-title break-all sm:break-normal">{emailAddr || "-"}</span>
                                </div>
                                <div className="border-b border-gray-50" />
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                    <span className="sm:w-40 text-subtext text-sm font-medium">Phone</span>
                                    <span className="font-semibold text-title">{phone || "-"}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Change Password Card ─── */}
                <div className="bg-components rounded-2xl shadow-md overflow-hidden mt-4">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h3 className="text-lg md:text-xl font-bold text-orange-500">Security</h3>
                    </div>
                    <div className="p-6">
                        {!showPasswordForm ? (
                            <>
                                <p className="text-subtext text-sm mb-4">Update your password to keep your account secure.</p>
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
                                    <label className="text-subtext text-sm font-medium block mb-1.5">Current Password</label>
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
                                    <label className="text-subtext text-sm font-medium block mb-1.5">New Password</label>
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
                                    <label className="text-subtext text-sm font-medium block mb-1.5">Confirm New Password</label>
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