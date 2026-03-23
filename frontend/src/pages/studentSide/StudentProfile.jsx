import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
    Loader2,
    KeyRound,
    CheckCircle,
    XCircle,
    AlertTriangle,
    X,
    Mail,
    IdCard,
    Pencil,
    CircleUserRound
} from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/firebaseConfig";
import { ProfileSkeleton } from "../../components/SkeletonLoaders";

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
    const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
    const fileInputRef = useRef(null);

    // Toast state
    const [toast, setToast] = useState(null);
    const showToast = useCallback((type, message) => {
        setToast({ type, message });
    }, []);
    const clearToast = useCallback(() => setToast(null), []);

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

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

    // readonly info
    const displayName = userDoc?.name || user?.displayName || "Student";
    const userInitial = (displayName && displayName.charAt(0).toUpperCase()) || "S";
    const userDocId = userDoc?.id || user?.uid || null;

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

        if (!file.type.startsWith('image/')) {
            showToast("warning", "Please select an image file");
            return;
        }

        if (file.size > 500 * 1024) {
            showToast("warning", "File size must be less than 500KB");
            return;
        }

        if (!userDocId) {
            showToast("error", "User document not found");
            return;
        }

        try {
            setUploading(true);
            const base64String = await convertToBase64(file);
            const userDocRef = doc(db, "users", userDocId);
            const docSnap = await getDoc(userDocRef);

            if (!docSnap.exists()) {
                throw new Error("User document not found");
            }

            await updateDoc(userDocRef, { photoURL: base64String });
            setPhotoURL(base64String);
            showToast("success", "Profile photo updated successfully!");
        } catch (error) {
            console.error("Error uploading photo:", error);
            showToast("error", "Failed to upload photo");
        } finally {
            setUploading(false);
        }
    };

    // Handle profile save
    const handleSaveProfile = async () => {
        if (!userDocId) {
            showToast("error", "User document not found");
            return;
        }

        try {
            setSaving(true);
            const userDocRef = doc(db, "users", userDocId);
            const docSnap = await getDoc(userDocRef);

            if (!docSnap.exists()) {
                throw new Error("User document not found");
            }

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

            showToast("success", "Profile updated successfully!");
            setEditing(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
            console.error("Error updating profile:", error);
            showToast("error", "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    // Handle password reset email logic
    const handleChangePassword = () => {
        const email = user?.email || emailAddr;

        if (!email) {
            showToast("error", "No email address found");
            return;
        }

        setConfirmDialog({
            isOpen: true,
            title: "Reset Password",
            message: `A password reset link will be sent to ${email}. Please check your inbox and spam folder after confirming.`,
            confirmLabel: "Send Reset Link",
            cancelLabel: "Cancel",
            color: "orange",
            icon: <KeyRound className="w-6 h-6 text-orange-600" />,
            onConfirm: async () => {
                setConfirmDialog({ isOpen: false });
                try {
                    setSendingPasswordReset(true);
                    await sendPasswordResetEmail(auth, email);
                    showToast("success", `Password reset email sent to ${email}`);
                } catch (error) {
                    console.error("Error sending password reset:", error);
                    showToast("error", "Failed to send password reset email");
                } finally {
                    setSendingPasswordReset(false);
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

            {/* ─── Header Card (Green Theme) ─── */}
            <div className="relative bg-green-600 rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_6px_25px_rgb(0,0,0,0.15)] transition-all overflow-hidden mx-1 md:mx-2 mt-2 px-5 py-6 md:p-6 group text-white border border-green-500">
                {/* Background blob */}
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
                        <img
                            src={photoURL}
                            alt="Profile"
                            className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover shadow-xl ring-4 ring-white"
                        />
                    ) : (
                        <div className="w-32 h-32 md:w-40 md:h-40 text-4xl md:text-6xl bg-gradient-to-br from-green-300 to-green-600 rounded-full flex items-center justify-center text-white font-bold shadow-xl ring-4 ring-white">
                            {userInitial}
                        </div>
                    )}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute bottom-1 right-1 w-10 h-10 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 ring-3 ring-white disabled:opacity-50"
                    >
                        {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Pencil className="w-4 h-4 text-white" />}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoChange}
                        accept="image/*"
                        className="hidden"
                    />
                </div>
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mt-4">{fullName || displayName}</h2>
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
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-green-600 bg-green-50 hover:bg-green-100 rounded-xl transition"
                            >
                                <Pencil className="w-4 h-4" />
                                Edit
                            </button>
                        )}
                    </div>

                    <div className="p-6">
                        {editing ? (
                            <div className="space-y-5">
                                {/* Student No (Read-only) */}
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-gray-500 text-sm font-medium">Student No</label>
                                    <input
                                        type="text"
                                        value={studentNo}
                                        disabled
                                        className="border border-gray-200 p-2.5 rounded-xl w-full bg-gray-50 text-gray-500 cursor-not-allowed"
                                        title="Student number cannot be changed"
                                    />
                                </div>

                                {/* Full Name */}
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-gray-500 text-sm font-medium">Full Name</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="border border-gray-200 p-2.5 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition"
                                    />
                                </div>

                                {/* Program */}
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-gray-500 text-sm font-medium">Program</label>
                                    <input
                                        type="text"
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        className="border border-gray-200 p-2.5 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition"
                                    />
                                </div>

                                {/* Year Level */}
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-gray-500 text-sm font-medium">Year Level</label>
                                    <select
                                        value={year}
                                        onChange={(e) => setYear(e.target.value)}
                                        className="border border-gray-200 p-2.5 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition"
                                    >
                                        <option value="">Select Year</option>
                                        <option value="1">1st Year</option>
                                        <option value="2">2nd Year</option>
                                        <option value="3">3rd Year</option>
                                        <option value="4">4th Year</option>
                                        <option value="5">5th Year</option>
                                    </select>
                                </div>

                                {/* Gender */}
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-gray-500 text-sm font-medium">Gender</label>
                                    <select
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="border border-gray-200 p-2.5 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </select>
                                </div>

                                {/* Email */}
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-gray-500 text-sm font-medium">Email Address</label>
                                    <input
                                        type="email"
                                        value={emailAddr}
                                        onChange={(e) => setEmailAddr(e.target.value)}
                                        className="border border-gray-200 p-2.5 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition"
                                    />
                                </div>

                                {/* Phone */}
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-gray-500 text-sm font-medium">Phone</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, "");
                                            if (value.length <= 11) setPhone(value);
                                        }}
                                        maxLength={11}
                                        className="border border-gray-200 p-2.5 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition"
                                    />
                                </div>

                                {/* Save / Cancel buttons */}
                                <div className="flex gap-3 pt-3 border-t border-gray-100">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={saving}
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
                                            // Reset values
                                            setFullName(userDoc?.name || user?.displayName || "");
                                            setDepartment(userDoc?.program || "");
                                            setEmailAddr(userDoc?.emailAddress || user?.email || "");
                                            setPhone(userDoc?.contactNo || "");
                                            setBio(userDoc?.bio || "");
                                            setYear(normalizeYear(userDoc?.year) || "");
                                            setGender(userDoc?.gender || "");
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

                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                    <span className="sm:w-40 text-gray-500 text-sm font-medium">Email Address</span>
                                    <span className="font-semibold text-gray-800 break-all sm:break-normal">{emailAddr || "-"}</span>
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
                        <p className="text-gray-500 text-sm mb-4">Send a password reset link to your registered email address.</p>
                        <button
                            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleChangePassword}
                            disabled={sendingPasswordReset}
                        >
                            {sendingPasswordReset ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <KeyRound className="w-4 h-4" />
                                    Change Password
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}