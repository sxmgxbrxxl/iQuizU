import { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

/**
 * Reusable Toast notification component.
 * Usage:
 *   const [toast, setToast] = useState({ show: false, type: "", title: "", message: "" });
 *   const showToast = (type, title, message) => { setToast({ show: true, type, title, message }); };
 *   <Toast {...toast} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
 *
 * Types: "success" | "error" | "warning" | "info"
 */
export default function Toast({ show, type = "info", title, message, onClose, duration = 4000 }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!show) return;
        const timer = setTimeout(() => { onClose?.(); }, duration);
        return () => clearTimeout(timer);
    }, [show, duration, onClose]);

    if (!mounted || !show) return null;

    const config = {
        success: {
            border: "#bbf7d0",
            gradient: "linear-gradient(135deg, #22c55e, #16a34a)",
            bar: "linear-gradient(90deg, #22c55e, #16a34a)",
            titleColor: "#15803d",
            Icon: CheckCircle,
        },
        error: {
            border: "#fecaca",
            gradient: "linear-gradient(135deg, #ef4444, #dc2626)",
            bar: "linear-gradient(90deg, #ef4444, #dc2626)",
            titleColor: "#dc2626",
            Icon: XCircle,
        },
        warning: {
            border: "#fde68a",
            gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
            bar: "linear-gradient(90deg, #f59e0b, #d97706)",
            titleColor: "#b45309",
            Icon: AlertTriangle,
        },
        info: {
            border: "#bfdbfe",
            gradient: "linear-gradient(135deg, #3b82f6, #2563eb)",
            bar: "linear-gradient(90deg, #3b82f6, #2563eb)",
            titleColor: "#1d4ed8",
            Icon: Info,
        },
    };

    const c = config[type] || config.info;

    return createPortal(
        <div
            className="fixed top-6 right-6 z-[60] animate-slideIn font-Outfit"
            style={{ maxWidth: "420px", minWidth: "320px" }}
        >
            <div
                className="rounded-2xl shadow-2xl overflow-hidden border"
                style={{ background: "white", borderColor: c.border }}
            >
                <div className="px-5 py-4 flex items-start gap-4">
                    <div
                        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5"
                        style={{ background: c.gradient }}
                    >
                        <c.Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base mb-0.5" style={{ color: c.titleColor }}>
                            {title}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
                {/* Progress bar */}
                <div className="h-1 w-full" style={{ background: "#f3f4f6" }}>
                    <div
                        className="h-full rounded-full"
                        style={{
                            background: c.bar,
                            animation: `shrinkWidth ${duration}ms linear forwards`,
                        }}
                    />
                </div>
            </div>
            <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
        </div>,
        document.body
    );
}
