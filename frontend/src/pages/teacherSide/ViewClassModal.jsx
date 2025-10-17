import { X, Loader2, UserPlus } from "lucide-react";

export default function ViewClassModal({ 
  isOpen, 
  classData, 
  students, 
  loading, 
  creatingAccounts,
  onClose, 
  onCreateAccounts 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-blue-600 text-white p-6 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">{classData?.name || "Loading..."}</h3>
            <p className="text-blue-100 text-sm">
              {classData?.studentCount || 0} student(s)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 rounded-lg p-2 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No students found in this class.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                      No
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                      Student No.
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                      Gender
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                      Program
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                      Year
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                      Email Address
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                      Contact No.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        {student.no || index + 1}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        {student.studentNo}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        {student.name}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        {student.gender || "—"}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        {student.program || "—"}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        {student.year || "—"}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        {student.emailAddress || "—"}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        {student.contactNo || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
          >
            Close
          </button>
          <button
            onClick={onCreateAccounts}
            disabled={creatingAccounts || students.every(s => s.hasAccount)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creatingAccounts ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create Account for All
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}