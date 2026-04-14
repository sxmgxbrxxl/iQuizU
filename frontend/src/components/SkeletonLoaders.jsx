import { Trophy } from "lucide-react";

// ─── Reusable Skeleton Block ─────────────────────────────────────────────────
const shimmerStyle = {
    background: "linear-gradient(90deg, #e8eaed 25%, #f3f4f6 50%, #e8eaed 75%)",
    backgroundSize: "200% 100%",
    animation: "skeletonShimmer 1.5s ease-in-out infinite",
    borderRadius: "8px",
};

export function SkeletonBlock({ width = "100%", height = "16px", rounded = "8px", delay = 0, className = "" }) {
    return (
        <div
            className={className}
            style={{
                ...shimmerStyle,
                width,
                height,
                borderRadius: rounded,
                animationDelay: `${delay}s`,
            }}
        />
    );
}

// ─── Shared Keyframes (injected via <style>) ─────────────────────────────────
export function SkeletonKeyframes() {
    return (
        <style>{`
      @keyframes skeletonShimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ProfileSkeleton — used in TeacherProfile.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function ProfileSkeleton() {
    return (
        <div className="font-Poppins animate-pulse">
            <SkeletonKeyframes />

            {/* Banner */}
            <div className="rounded-2xl mx-3 md:mx-6 mt-4 px-6 py-8 md:py-10 overflow-hidden"
                style={{ background: "linear-gradient(90deg, #dbeafe 25%, #e0e7ff 50%, #dbeafe 75%)", backgroundSize: "200% 100%", animation: "skeletonShimmer 1.5s ease-in-out infinite", height: "120px", borderRadius: "16px" }}
            />

            {/* Avatar */}
            <div className="flex flex-col items-center mt-8 mb-2">
                <SkeletonBlock width="128px" height="128px" rounded="9999px" />
                <SkeletonBlock width="160px" height="20px" delay={0.1} className="mt-4" />
                <SkeletonBlock width="100px" height="14px" delay={0.15} className="mt-2" />
            </div>

            {/* Details Card */}
            <div className="mx-3 md:mx-6 mt-6 mb-6">
                <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <SkeletonBlock width="140px" height="20px" />
                        <SkeletonBlock width="70px" height="32px" rounded="12px" delay={0.1} />
                    </div>
                    <div className="p-6 space-y-5">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex flex-col sm:flex-row gap-1 sm:gap-4 sm:items-center">
                                <SkeletonBlock width="100px" height="14px" delay={i * 0.08} />
                                <SkeletonBlock width="200px" height="16px" delay={i * 0.08 + 0.04} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Security card */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden mt-4 border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <SkeletonBlock width="100px" height="20px" />
                    </div>
                    <div className="p-6">
                        <SkeletonBlock width="280px" height="14px" className="mb-4" />
                        <SkeletonBlock width="160px" height="40px" rounded="12px" delay={0.1} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AnalyticsSkeleton — used in ReportsAnalytics.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function AnalyticsSkeleton() {
    return (
        <div className="py-4 px-3 md:py-6 md:px-8 font-Poppins">
            <SkeletonKeyframes />

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <SkeletonBlock width="32px" height="32px" rounded="8px" />
                <div>
                    <SkeletonBlock width="200px" height="22px" className="mb-2" />
                    <SkeletonBlock width="300px" height="14px" delay={0.05} />
                </div>
            </div>

            {/* Class cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-white border-2 border-gray-100 rounded-2xl p-6 space-y-3">
                        <SkeletonBlock width="70%" height="20px" delay={i * 0.1} />
                        <SkeletonBlock width="40%" height="14px" delay={i * 0.1 + 0.05} />
                        <SkeletonBlock width="50%" height="12px" delay={i * 0.1 + 0.08} />
                        <SkeletonBlock width="55%" height="12px" delay={i * 0.1 + 0.1} />
                        <div className="flex justify-end pt-2">
                            <SkeletonBlock width="110px" height="16px" delay={i * 0.1 + 0.12} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ResultsTableSkeleton — used in QuizResults.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function ResultsTableSkeleton() {
    return (
        <div className="min-h-screen p-3 md:px-10 py-8 font-Poppins" >
            <SkeletonKeyframes />
            <div className="w-full">
                <div className="bg-components rounded-2xl md:rounded-3xl shadow-xl overflow-hidden mb-4 md:mb-6 animate-fadeIn">
                    <div className="bg-gradient-to-r from-green-700 to-green-500 p-4 md:p-8 text-white">
                        <div className="flex items-center gap-3 md:gap-4 mb-4">
                        <Trophy className="w-8 h-8 md:w-12 md:h-12 animate-bounceIn" />
                        <div>
                            <h1 className="text-2xl font-bold">Class Leaderboard</h1>
                            <p className="text-md font-light">Your Class Rankings & Performance</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>


        // <div className="p-8 font-Poppins max-w-7xl mx-auto">
        //     <SkeletonKeyframes />

        //     {/* Back button + header */}
        //     <div className="mb-8">
        //         <SkeletonBlock width="80px" height="16px" className="mb-4" />
        //         <div className="flex items-center justify-between">
        //             <div>
        //                 <SkeletonBlock width="300px" height="28px" className="mb-2" />
        //                 <SkeletonBlock width="200px" height="16px" delay={0.05} />
        //             </div>
        //             <SkeletonBlock width="160px" height="44px" rounded="8px" delay={0.1} />
        //         </div>
        //     </div>

        //     {/* Stat cards */}
        //     <div className="grid md:grid-cols-4 gap-4 mb-8">
        //         {[0, 1, 2, 3].map((i) => (
        //             <div key={i} className="bg-white rounded-lg p-6 border border-gray-100">
        //                 <div className="flex items-center gap-3 mb-2">
        //                     <SkeletonBlock width="24px" height="24px" rounded="6px" delay={i * 0.1} />
        //                     <SkeletonBlock width="90px" height="14px" delay={i * 0.1 + 0.05} />
        //                 </div>
        //                 <SkeletonBlock width="60px" height="28px" delay={i * 0.1 + 0.08} />
        //             </div>
        //         ))}
        //     </div>

        //     {/* Table */}
        //     <div className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden">
        //         {/* Table header */}
        //         <div className="flex gap-4 px-6 py-4" style={{ background: "linear-gradient(90deg, #dbeafe, #ede9fe)" }}>
        //             {[120, 160, 70, 80, 90, 70, 70, 80].map((w, i) => (
        //                 <SkeletonBlock key={i} width={`${w}px`} height="14px" delay={i * 0.04} />
        //             ))}
        //         </div>

        //         {/* Table rows */}
        //         {[0, 1, 2, 3, 4, 5, 6, 7].map((rowIdx) => (
        //             <div
        //                 key={rowIdx}
        //                 className="flex gap-4 px-6 py-4 border-t border-gray-50"
        //                 style={{ background: rowIdx % 2 === 0 ? "green-500" : "green-500" }}
        //             >
        //                 {[120, 160, 70, 80, 90, 70, 70, 80].map((w, colIdx) => (
        //                     <SkeletonBlock
        //                         key={colIdx}
        //                         width={`${w}px`}
        //                         height="12px"
        //                         delay={rowIdx * 0.06 + colIdx * 0.03}
        //                     />
        //                 ))}
        //             </div>
        //         ))}
        //     </div>
        // </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ClassPageSkeleton — used in ViewClassPage.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function ClassPageSkeleton() {
    return (
        <div className="px-2 py-6 md:p-8 font-Poppins">
            <SkeletonKeyframes />

            {/* Class Info Header */}
            <div className="mb-4 md:mb-6 bg-white border border-gray-200 rounded-xl p-3 md:p-4">
                <div className="mb-4 md:mb-6 pb-4 md:pb-6 border-b border-gray-200">
                    <SkeletonBlock width="240px" height="28px" className="mb-4" />
                    <div className="grid grid-cols-3 gap-2 md:gap-4 mt-3 md:mt-4">
                        {[0, 1, 2].map((i) => (
                            <div key={i}>
                                <SkeletonBlock width="70px" height="12px" delay={i * 0.08} className="mb-2" />
                                <SkeletonBlock width="50px" height="22px" delay={i * 0.08 + 0.04} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Buttons */}
            <div className="mb-4 md:mb-6 bg-white border border-gray-200 rounded-xl p-1.5 md:p-2 flex gap-1.5 md:gap-2">
                <SkeletonBlock width="50%" height="44px" rounded="8px" />
                <SkeletonBlock width="50%" height="44px" rounded="8px" delay={0.05} />
            </div>

            {/* Students Table Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Table header bar */}
                <div className="p-4 md:p-6 border-b border-gray-200" style={{ background: "linear-gradient(90deg, #ecfdf5, #eff6ff)" }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <SkeletonBlock width="130px" height="22px" />
                            <SkeletonBlock width="50px" height="18px" rounded="12px" delay={0.05} />
                        </div>
                    </div>
                </div>

                {/* Table rows */}
                <div className="hidden md:block">
                    {/* Table column headers */}
                    <div className="flex gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
                        {[100, 140, 180, 100, 80].map((w, i) => (
                            <SkeletonBlock key={i} width={`${w}px`} height="10px" delay={i * 0.04} />
                        ))}
                    </div>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((rowIdx) => (
                        <div
                            key={rowIdx}
                            className="flex gap-4 px-6 py-4 border-b border-gray-100"
                            style={{ background: rowIdx % 2 === 0 ? "#fff" : "rgba(249,250,251,0.5)" }}
                        >
                            {[100, 140, 180, 100, 80].map((w, colIdx) => (
                                <SkeletonBlock
                                    key={colIdx}
                                    width={`${w}px`}
                                    height="14px"
                                    delay={rowIdx * 0.05 + colIdx * 0.03}
                                />
                            ))}
                        </div>
                    ))}
                </div>

                {/* Mobile skeleton cards */}
                <div className="md:hidden divide-y divide-gray-100">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <SkeletonBlock width="140px" height="14px" delay={i * 0.06} className="mb-1.5" />
                                    <SkeletonBlock width="80px" height="10px" delay={i * 0.06 + 0.03} />
                                </div>
                                <SkeletonBlock width="60px" height="22px" rounded="9999px" delay={i * 0.06 + 0.05} />
                            </div>
                            <div className="mt-1.5 flex gap-3">
                                <SkeletonBlock width="120px" height="10px" delay={i * 0.06 + 0.07} />
                                <SkeletonBlock width="50px" height="10px" delay={i * 0.06 + 0.09} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom action buttons */}
                <div className="flex flex-col sm:flex-row justify-between gap-3 p-4 md:mx-8 md:my-4 md:mb-6">
                    <SkeletonBlock width="180px" height="44px" rounded="12px" />
                    <SkeletonBlock width="140px" height="44px" rounded="12px" delay={0.08} />
                </div>
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QuizGridSkeleton — used in ManageQuizzes.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function QuizGridSkeleton({ count = 6, hasButtons = false }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 animate-pulse font-Poppins">
            <SkeletonKeyframes />
            {[...Array(count)].map((_, i) => (
                <div
                    key={i}
                    className="border border-gray-100 rounded-xl p-3 md:p-5 shadow-sm bg-white"
                >
                    {/* Header: Title + Button */}
                    <div className="relative flex flex-row justify-between mb-3">
                        <div className="flex flex-col w-full pr-8 space-y-2">
                            <SkeletonBlock width="70%" height="20px" delay={i * 0.1} />
                            <SkeletonBlock width="40%" height="12px" delay={i * 0.1 + 0.05} />
                            <SkeletonBlock width="30%" height="12px" delay={i * 0.1 + 0.08} />
                        </div>
                        {/* Top-right delete/edit icon placeholder */}
                        <SkeletonBlock width="24px" height="24px" rounded="6px" className="absolute top-0 right-0" delay={i * 0.1} />
                    </div>

                    {/* Bottom Buttons (Optional) */}
                    {hasButtons && (
                        <div className="flex justify-between items-center gap-2 mt-3 md:mt-4 pt-3 border-t border-gray-50">
                            <SkeletonBlock width="100%" height="32px" rounded="8px" delay={i * 0.1 + 0.1} />
                            <SkeletonBlock width="100%" height="32px" rounded="8px" delay={i * 0.1 + 0.12} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EditQuizSkeleton — used in EditQuiz.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function EditQuizSkeleton() {
    return (
        <div className="px-2 py-6 md:p-8 font-Poppins">
            <SkeletonKeyframes />

            {/* Back button */}
            <div className="mb-6">
                <SkeletonBlock width="180px" height="16px" />
            </div>

            {/* Title banner */}
            <div
                className="p-4 md:p-6 rounded-3xl mb-6"
                style={{
                    background: "linear-gradient(90deg, #3b82f6 25%, #93c5fd 50%, #3b82f6 75%)",
                    backgroundSize: "200% 100%",
                    animation: "skeletonShimmer 1.5s ease-in-out infinite",
                }}
            >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex-1">
                        <SkeletonBlock width="60%" height="24px" className="mb-3" delay={0.05} />
                        <div className="flex items-center gap-4">
                            <SkeletonBlock width="100px" height="14px" delay={0.1} />
                            <SkeletonBlock width="80px" height="14px" delay={0.15} />
                        </div>
                    </div>
                    <SkeletonBlock width="110px" height="36px" rounded="8px" delay={0.1} />
                </div>
            </div>

            {/* Question sections */}
            {[0, 1].map((sectionIdx) => (
                <div key={sectionIdx} className="mb-8">
                    {/* Section header */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-3 md:gap-0 border-b-2 border-gray-200 pb-6 mb-4">
                        <div className="flex items-center gap-2">
                            <SkeletonBlock width="140px" height="22px" delay={sectionIdx * 0.2} />
                            <SkeletonBlock width="70px" height="22px" rounded="9999px" delay={sectionIdx * 0.2 + 0.05} />
                        </div>
                        <SkeletonBlock width="120px" height="36px" rounded="8px" delay={sectionIdx * 0.2 + 0.08} />
                    </div>

                    {/* Question cards */}
                    <div className="space-y-4">
                        {[0, 1].map((cardIdx) => {
                            const d = sectionIdx * 0.2 + cardIdx * 0.15;
                            return (
                                <div key={cardIdx} className="bg-gray-50 p-4 md:p-6 border-2 rounded-3xl border-gray-200">
                                    <div className="flex items-start gap-3 mb-4">
                                        {/* Number circle */}
                                        <SkeletonBlock width="32px" height="32px" rounded="9999px" delay={d} />
                                        <div className="flex-1">
                                            {/* Badge row */}
                                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                                <SkeletonBlock width="80px" height="20px" rounded="9999px" delay={d + 0.03} />
                                                <SkeletonBlock width="50px" height="20px" rounded="9999px" delay={d + 0.06} />
                                                <SkeletonBlock width="70px" height="20px" rounded="9999px" delay={d + 0.09} />
                                                <SkeletonBlock width="55px" height="20px" rounded="9999px" delay={d + 0.12} />
                                            </div>
                                            {/* Question text */}
                                            <SkeletonBlock width="90%" height="18px" delay={d + 0.15} className="mb-2" />
                                            <SkeletonBlock width="60%" height="18px" delay={d + 0.18} />
                                        </div>
                                    </div>

                                    {/* Answer area */}
                                    <div className="ml-6 md:ml-11 space-y-2">
                                        {sectionIdx === 0 ? (
                                            [0, 1, 2, 3].map((i) => (
                                                <div key={i} className="p-3 rounded-lg border-2 border-gray-200 bg-white">
                                                    <div className="flex items-center gap-2">
                                                        <SkeletonBlock width="18px" height="14px" delay={d + 0.2 + i * 0.03} />
                                                        <SkeletonBlock width={`${60 - i * 8}%`} height="14px" delay={d + 0.22 + i * 0.03} />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="bg-blue-50 border-2 border-gray-200 rounded-lg p-3">
                                                <div className="flex items-center gap-2">
                                                    <SkeletonBlock width="90px" height="14px" delay={d + 0.2} />
                                                    <SkeletonBlock width="60px" height="14px" delay={d + 0.23} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Bottom buttons */}
            <div className="mt-8 flex flex-col-reverse md:flex-row justify-end gap-3">
                <SkeletonBlock width="100px" height="44px" rounded="8px" />
                <SkeletonBlock width="140px" height="44px" rounded="8px" delay={0.08} />
            </div>
        </div>
    );
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QuizListSkeleton — used in StudentDashboard.jsx and StudentQuizzes.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function QuizListSkeleton({ count = 3 }) {
    return (
        <div className="space-y-4 font-Poppins animate-pulse">
            <SkeletonKeyframes />
            {[...Array(count)].map((_, i) => (
                <div
                    key={i}
                    className="border-2 border-gray-100 rounded-xl p-5 bg-white shadow-sm"
                >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            {/* Title & Badge */}
                            <div className="flex items-center gap-3 mb-3">
                                <SkeletonBlock width="60%" height="22px" delay={i * 0.1} />
                                <SkeletonBlock width="80px" height="24px" rounded="9999px" delay={i * 0.1 + 0.05} />
                            </div>

                            {/* Info lines */}
                            <div className="space-y-2 mb-2">
                                <SkeletonBlock width="40%" height="14px" delay={i * 0.1 + 0.1} />
                                <SkeletonBlock width="35%" height="14px" delay={i * 0.1 + 0.15} />
                                <SkeletonBlock width="50%" height="14px" delay={i * 0.1 + 0.2} />
                            </div>
                        </div>

                        {/* Button */}
                        <div className="w-full sm:w-auto mt-2 sm:mt-0">
                            <SkeletonBlock width="120px" height="40px" rounded="8px" delay={i * 0.1 + 0.25} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QuizControlPanelSkeleton — used in QuizControlPanel.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function QuizControlPanelSkeleton() {
    return (
        <div className="p-4 md:p-8 font-Poppins animate-pulse">
            <SkeletonKeyframes />

            {/* Header: Back Button & Title */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-2">
                <SkeletonBlock width="200px" height="24px" />
                <div className="flex items-center gap-2">
                    <SkeletonBlock width="24px" height="24px" rounded="6px" />
                    <SkeletonBlock width="150px" height="24px" />
                </div>
            </div>

            {/* Quiz Info Banner */}
            <div className="rounded-xl mb-6 p-4 md:p-6 overflow-hidden"
                style={{
                    background: "linear-gradient(90deg, #e8eaed 25%, #f3f4f6 50%, #e8eaed 75%)",
                    backgroundSize: "200% 100%",
                    animation: "skeletonShimmer 1.5s ease-in-out infinite",
                    height: "100px"
                }}
            >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 h-full">
                    <div className="flex flex-col justify-center space-y-2 w-full md:w-1/2">
                        <SkeletonBlock width="60%" height="28px" className="bg-white/50" />
                        <SkeletonBlock width="40%" height="16px" className="bg-white/50" />
                    </div>
                    <SkeletonBlock width="120px" height="40px" rounded="8px" className="bg-white/50" />
                </div>
            </div>

            {/* Quiz Code Section Placeholder */}
            <div className="mb-6 bg-white border-2 border-gray-100 rounded-xl p-4 md:p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <SkeletonBlock width="120px" height="16px" className="mb-2" />
                        <div className="flex items-center gap-3">
                            <SkeletonBlock width="180px" height="60px" rounded="8px" />
                            <SkeletonBlock width="140px" height="50px" rounded="8px" />
                        </div>
                    </div>
                    <div className="md:text-right">
                        <SkeletonBlock width="180px" height="14px" className="mb-1 ml-auto" />
                        <SkeletonBlock width="220px" height="12px" className="ml-auto" />
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <div className="mb-6">
                <SkeletonBlock width="100%" height="60px" rounded="12px" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white border border-gray-100 p-3 md:p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                            <SkeletonBlock width="32px" height="32px" rounded="8px" />
                            <div className="flex flex-col items-end gap-1">
                                <SkeletonBlock width="40px" height="28px" />
                                <SkeletonBlock width="60px" height="12px" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Student List Section */}
            <div className="border border-gray-200 rounded-xl p-4 md:p-6 bg-white">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
                    <SkeletonBlock width="220px" height="24px" />
                    <div className="flex gap-3">
                        <SkeletonBlock width="140px" height="20px" />
                        <SkeletonBlock width="140px" height="40px" rounded="8px" />
                    </div>
                </div>

                {/* Table Header */}
                <div className="hidden md:flex gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 mb-2">
                    {[150, 100, 100, 80, 80, 100, 100, 100].map((w, i) => (
                        <SkeletonBlock key={i} width={`${w}px`} height="16px" />
                    ))}
                </div>

                {/* Table Rows */}
                <div className="space-y-4">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col md:flex-row gap-4 px-4 md:px-6 py-3 border-b border-gray-50">
                            {/* Mobile View */}
                            <div className="md:hidden space-y-2 w-full">
                                <div className="flex justify-between">
                                    <SkeletonBlock width="120px" height="16px" />
                                    <SkeletonBlock width="80px" height="20px" rounded="12px" />
                                </div>
                                <div className="flex justify-between">
                                    <SkeletonBlock width="80px" height="12px" />
                                    <SkeletonBlock width="60px" height="12px" />
                                </div>
                            </div>

                            {/* Desktop View */}
                            <div className="hidden md:flex gap-4 w-full items-center">
                                {[150, 100, 100, 80, 80, 100, 100, 100].map((w, j) => (
                                    <SkeletonBlock key={j} width={`${w}px`} height="14px" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QuizResultsSkeleton — used in QuizResults.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function QuizResultsSkeleton() {
    return (
        <div className="p-4 md:p-8 font-Poppins animate-pulse max-w-7xl mx-auto">
            <SkeletonKeyframes />

            {/* Header: Back Button */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-2">
                <SkeletonBlock width="180px" height="24px" />
            </div>

            {/* Title Banner */}
            <div className="rounded-xl mb-6 p-4 md:p-6 overflow-hidden"
                style={{
                    background: "linear-gradient(90deg, #e8eaed 25%, #f3f4f6 50%, #e8eaed 75%)",
                    backgroundSize: "200% 100%",
                    animation: "skeletonShimmer 1.5s ease-in-out infinite",
                    height: "100px"
                }}
            >
                <div className="flex flex-col justify-center space-y-2 h-full">
                    <SkeletonBlock width="40%" height="28px" className="bg-white/50" />
                    <SkeletonBlock width="25%" height="16px" className="bg-white/50" />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-white border border-gray-100 p-3 md:p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                            <SkeletonBlock width="32px" height="32px" rounded="8px" />
                            <div className="flex flex-col items-end gap-1">
                                <SkeletonBlock width="40px" height="28px" />
                                <SkeletonBlock width="60px" height="12px" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Student Results Section */}
            <div className="border border-gray-200 rounded-xl p-4 md:p-6 bg-white">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                    <SkeletonBlock width="200px" height="24px" />
                    <SkeletonBlock width="160px" height="40px" rounded="8px" />
                </div>

                {/* Table Header */}
                <div className="hidden md:flex gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 mb-2 rounded-t-lg">
                    {[150, 200, 80, 80, 100, 100, 100, 100].map((w, i) => (
                        <SkeletonBlock key={i} width={`${w}px`} height="16px" />
                    ))}
                </div>

                {/* Table Rows */}
                <div className="space-y-4">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col md:flex-row gap-4 px-4 md:px-6 py-3 border-b border-gray-50 last:border-0">
                            {/* Mobile View */}
                            <div className="md:hidden space-y-2 w-full">
                                <div className="flex justify-between">
                                    <SkeletonBlock width="140px" height="18px" />
                                    <SkeletonBlock width="80px" height="20px" rounded="12px" />
                                </div>
                                <div className="flex justify-between">
                                    <SkeletonBlock width="100px" height="12px" />
                                    <SkeletonBlock width="60px" height="12px" />
                                </div>
                            </div>

                            {/* Desktop View */}
                            <div className="hidden md:flex gap-4 w-full items-center">
                                {[150, 200, 80, 80, 100, 100, 100, 100].map((w, j) => (
                                    <SkeletonBlock key={j} width={`${w}px`} height="14px" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AdminTableSkeleton — used in Admin side tables
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function AdminTableSkeleton() {
    return (
        <div className="w-full animate-pulse font-Poppins">
            <SkeletonKeyframes />
            
            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4"><SkeletonBlock width="40px" height="16px" delay={0.05} /></th>
                            <th className="p-4"><SkeletonBlock width="150px" height="16px" delay={0.1} /></th>
                            <th className="p-4"><SkeletonBlock width="200px" height="16px" delay={0.15} /></th>
                            <th className="p-4"><SkeletonBlock width="80px" height="16px" delay={0.2} /></th>
                            <th className="p-4 text-right pr-6"><SkeletonBlock width="100px" height="16px" delay={0.25} /></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {[0, 1, 2, 3, 4, 5].map((rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-slate-50/50">
                                <td className="p-4"><SkeletonBlock width="40px" height="14px" delay={rowIdx * 0.05} /></td>
                                <td className="p-4"><SkeletonBlock width="150px" height="14px" delay={rowIdx * 0.05 + 0.05} /></td>
                                <td className="p-4"><SkeletonBlock width="200px" height="14px" delay={rowIdx * 0.05 + 0.1} /></td>
                                <td className="p-4"><SkeletonBlock width="80px" height="14px" delay={rowIdx * 0.05 + 0.15} /></td>
                                <td className="p-4 flex justify-end"><SkeletonBlock width="100px" height="14px" delay={rowIdx * 0.05 + 0.2} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

