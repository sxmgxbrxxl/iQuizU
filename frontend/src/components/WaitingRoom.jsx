import { Zap, AlertCircle, Loader } from "lucide-react";

export default function WaitingRoom({ quiz, assignment, questions, onNavigate }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl max-w-2xl w-full transform transition-all duration-500 hover:shadow-3xl animate-fadeIn">
        <div className="text-center">
          {/* Header Section */}
          <div className="mb-6 sm:mb-8">
            <div className="relative inline-block mb-4">
              <Zap className="w-16 h-16 sm:w-20 sm:h-20 text-purple-600 mx-auto animate-pulse" />
              <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-purple-300 rounded-full blur-xl opacity-50 animate-ping" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2 animate-slideDown">
              Waiting Room
            </h2>
            <p className="text-base sm:text-lg text-gray-600 animate-slideDown animation-delay-100">
              Your teacher hasn't started the quiz yet
            </p>
          </div>

          {/* Quiz Details Card */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 transform transition-all duration-300 hover:scale-105 hover:shadow-lg animate-slideUp">
            <h3 className="text-lg sm:text-xl font-bold text-purple-900 mb-3 sm:mb-4">
              Quiz Details
            </h3>
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700">
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1 sm:gap-2 p-2 bg-white rounded-lg transition-all hover:bg-purple-100">
                <strong className="text-purple-800">Quiz:</strong>
                <span className="text-gray-900">{quiz?.title || "Loading..."}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1 sm:gap-2 p-2 bg-white rounded-lg transition-all hover:bg-purple-100">
                <strong className="text-purple-800">Class:</strong>
                <span className="text-gray-900">{assignment?.className || "Loading..."}</span>
              </div>
              {assignment?.subject && (
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1 sm:gap-2 p-2 bg-white rounded-lg transition-all hover:bg-purple-100">
                  <strong className="text-purple-800">Subject:</strong>
                  <span className="text-gray-900">{assignment.subject}</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1 sm:gap-2 p-2 bg-white rounded-lg transition-all hover:bg-purple-100">
                <strong className="text-purple-800">Questions:</strong>
                <span className="text-gray-900">{questions?.length || 0}</span>
              </div>
              {assignment?.settings?.timeLimit && (
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1 sm:gap-2 p-2 bg-white rounded-lg transition-all hover:bg-purple-100">
                  <strong className="text-purple-800">Time Limit:</strong>
                  <span className="text-gray-900">{assignment.settings.timeLimit} minutes</span>
                </div>
              )}
            </div>
          </div>

          {/* Alert Box */}
          <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg mb-4 sm:mb-6 animate-slideUp animation-delay-200 transition-all hover:shadow-md">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0 mt-0.5 animate-bounce" />
            <div className="flex-1 text-left">
              <p className="font-semibold text-yellow-900 mb-1 text-sm sm:text-base">
                Please Wait for Instructions
              </p>
              <p className="text-xs sm:text-sm text-yellow-800 leading-relaxed">
                Your teacher will start the quiz session shortly. Stay on this page 
                and wait for the quiz to become active. Do not refresh or close this page.
              </p>
            </div>
          </div>

          {/* Loading Status */}
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-4 sm:mb-6 animate-pulse">
            <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            <span className="text-xs sm:text-sm md:text-base">Waiting for teacher to start the quiz...</span>
          </div>

          {/* Back Button */}
          <button
            onClick={() => onNavigate("/student")}
            className="w-full bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold hover:from-gray-300 hover:to-gray-400 transition-all duration-300 transform hover:scale-105 active:scale-95 text-sm sm:text-base shadow-md hover:shadow-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-slideDown {
          animation: slideDown 0.5s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.5s ease-out;
        }

        .animation-delay-100 {
          animation-delay: 0.1s;
          animation-fill-mode: backwards;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
          animation-fill-mode: backwards;
        }
      `}</style>
    </div>
  );
}