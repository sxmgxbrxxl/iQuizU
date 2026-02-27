import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * Reusable Confirm Dialog component.
 * Usage:
 *   const [confirm, setConfirm] = useState({ isOpen: false });
 *   <ConfirmDialog
 *     isOpen={confirm.isOpen}
 *     title="Delete Item?"
 *     message="This cannot be undone."
 *     confirmLabel="Delete"
 *     color="red"
 *     onConfirm={() => { handleDelete(); setConfirm({ isOpen: false }); }}
 *     onCancel={() => setConfirm({ isOpen: false })}
 *   />
 *
 * Colors: "red" | "orange" | "blue" | "green" | "yellow"
 */
export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    icon,
    color = "blue",
    loading = false,
    showCancel = true,
}) {
    useEffect(() => {
        if (!isOpen) return;
        const scrollableParent = document.querySelector(".overflow-y-auto");
        document.body.style.overflow = "hidden";
        if (scrollableParent) scrollableParent.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
            if (scrollableParent) scrollableParent.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const colorMap = {
        red: { btn: "bg-red-500 hover:bg-red-600", iconBg: "bg-red-100", iconColor: "text-red-600" },
        orange: { btn: "bg-orange-500 hover:bg-orange-600", iconBg: "bg-orange-100", iconColor: "text-orange-600" },
        blue: { btn: "bg-blue-500 hover:bg-blue-600", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
        green: { btn: "bg-green-500 hover:bg-green-600", iconBg: "bg-green-100", iconColor: "text-green-600" },
        yellow: { btn: "bg-yellow-500 hover:bg-yellow-600", iconBg: "bg-yellow-100", iconColor: "text-yellow-600" },
    };
    const c = colorMap[color] || colorMap.blue;

    return createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 font-Outfit animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slideUp">
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
                    {showCancel && (
                        <button
                            onClick={onCancel}
                            disabled={loading}
                            className="px-5 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition text-sm disabled:opacity-50"
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-5 py-2.5 ${c.btn} text-white rounded-xl font-semibold transition text-sm flex items-center gap-2 disabled:opacity-70`}
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
