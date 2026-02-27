import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Loader2, KeyRound, CheckCircle, XCircle, AlertTriangle, X, Mail, IdCard, Pencil } from "lucide-react";
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

// ─── Main Component ──────────────────────────────────────────────────────────
export default function TeacherProfile({ user, userDoc }) {
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sendingPasswordReset, setSendingPasswordReset] = useState(false);

    // Toast state
    const [toast, setToast] = useState(null);
    const showToast = useCallback((type, message) => {
        setToast({ type, message });
    }, []);
    const clearToast = useCallback(() => setToast(null), []);

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

    // form state (initialized from user / userDoc)
    const [fullName, setFullName] = useState("");
    const [department, setDepartment] = useState("");
    const [emailAddr, setEmailAddr] = useState("");
    const [phone, setPhone] = useState("");
    const [bio, setBio] = useState("");

    // readonly info
    const displayName = userDoc?.firstName || user?.displayName || "Teacher";
    const userInitial = (displayName && displayName.charAt(0).toUpperCase()) || "T";
    const userDocId = userDoc?.id || user?.uid || null;

    useEffect(() => {
        setFullName(userDoc?.firstName || user?.displayName || "");
        setDepartment(userDoc?.department || "");
        setEmailAddr(userDoc?.email || user?.email || "");
        setPhone(userDoc?.phone || "");
        setBio(userDoc?.bio || "");
        setLoading(false);
    }, [user, userDoc]);

    // Handle password reset email
    const handleChangePassword = () => {
        const email = user?.email || emailAddr;

        if (!email) {
            showToast("error", "No email address found. Please add an email to your profile first.");
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
                    console.error("Error sending password reset email:", error);
                    let errorMsg = "Failed to send password reset email. ";
                    if (error.code === "auth/user-not-found") {
                        errorMsg += "No account found with this email.";
                    } else if (error.code === "auth/invalid-email") {
                        errorMsg += "Invalid email address.";
                    } else if (error.code === "auth/too-many-requests") {
                        errorMsg += "Too many requests. Please try again later.";
                    } else {
                        errorMsg += error.message;
                    }
                    showToast("error", errorMsg);
                } finally {
                    setSendingPasswordReset(false);
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

        try {
            setSaving(true);
            const userDocRef = doc(db, "users", userDocId);

            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists()) {
                throw new Error("User document not found");
            }

            await updateDoc(userDocRef, {
                firstName: fullName,
                department: department,
                email: emailAddr,
                phone: phone,
                bio: bio,
            });

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
        <div className="font-Outfit animate-fadeIn">
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
            <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 rounded-2xl mx-3 md:mx-6 mt-4 px-6 py-8 md:py-10 overflow-hidden shadow-lg">
                {/* Decorative circles */}
                <div className="absolute top-[-30px] right-[-30px] w-40 h-40 bg-white/10 rounded-full" />
                <div className="absolute bottom-[-20px] right-[80px] w-24 h-24 bg-white/5 rounded-full" />

                <div className="relative flex items-center gap-3">
                    <IdCard className="w-8 h-8 md:w-10 md:h-10 text-white/90" />
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">My Profile</h1>
                </div>
                <p className="relative text-blue-100 text-sm md:text-base mt-1 ml-11 md:ml-[52px]">
                    Your personal teaching profile and academic details.
                </p>
            </div>

            {/* ─── Profile Photo Section ─── */}
            <div className="flex flex-col items-center mt-8 mb-2">
                <div className="relative group">
                    <div className="w-32 h-32 md:w-40 md:h-40 text-5xl md:text-7xl bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-xl ring-4 ring-white">
                        {userInitial}
                    </div>
                    <button className="absolute bottom-1 right-1 w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 ring-3 ring-white">
                        <Pencil className="w-4 h-4 text-white" />
                    </button>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-title mt-4">{fullName || displayName}</h2>
                <p className="text-subtext text-sm">{department || "Teacher"}</p>
            </div>

            {/* ─── Personal Details Card ─── */}
            <div className="mx-3 md:mx-6 mt-6 mb-6">
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
                                        value={fullName || displayName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="border border-gray-200 p-2.5 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-subtext text-sm font-medium">Department</label>
                                    <input
                                        type="text"
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        className="border border-gray-200 p-2.5 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4 sm:items-center">
                                    <label className="sm:w-40 text-subtext text-sm font-medium">Email Address</label>
                                    <input
                                        type="email"
                                        value={emailAddr}
                                        onChange={(e) => setEmailAddr(e.target.value)}
                                        className="border border-gray-200 p-2.5 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
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
                                            setFullName(userDoc?.firstName || user?.displayName || "");
                                            setDepartment(userDoc?.department || "");
                                            setEmailAddr(userDoc?.email || user?.email || "");
                                            setPhone(userDoc?.phone || "");
                                            setBio(userDoc?.bio || "");
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
                                    <span className="font-semibold text-title">{fullName || displayName}</span>
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
                        <p className="text-subtext text-sm mb-4">Send a password reset link to your registered email address.</p>
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