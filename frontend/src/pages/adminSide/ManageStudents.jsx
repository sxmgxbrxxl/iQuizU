import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { Loader2 } from "lucide-react";

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);

  const fetchStudents = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "student"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStudents(list);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching students:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleResetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset link sent to: " + email);
    } catch (error) {
      console.error(error);
      alert("Failed to send reset email.");
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), { status: "Inactive" });
      fetchStudents();
    } catch (error) {
      console.error(error);
    }
  };

  const handleActivate = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), { status: "Active" });
      fetchStudents();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      fetchStudents();
    } catch (error) {
      console.error(error);
    }
  };

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudents(filteredStudents.map((s) => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  // Handle individual checkbox
  const handleSelectStudent = (id) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(selectedStudents.filter((sid) => sid !== id));
    } else {
      setSelectedStudents([...selectedStudents, id]);
    }
  };

  // Bulk delete selected students
  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) {
      alert("Please select students to delete.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedStudents.length} student(s)?`)) {
      return;
    }

    try {
      const batch = writeBatch(db);
      selectedStudents.forEach((id) => {
        const studentRef = doc(db, "users", id);
        batch.delete(studentRef);
      });

      await batch.commit();
      setSelectedStudents([]);
      fetchStudents();
      alert("Selected students deleted successfully.");
    } catch (error) {
      console.error("Error deleting students:", error);
      alert("Failed to delete selected students.");
    }
  };

  const filteredStudents = students.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Check if all filtered students are selected
  const isAllSelected = filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length;

  return (
    <div className="py-6 px-2 md:p-8 font-Outfit animate-fadeIn">
      <h1 className="text-2xl text-title font-bold">Manage Students</h1>
      <p className="text-md md:text-xl text-subtext">All your student details, accessible and easy to manage.</p>

      <div className="flex flex-col sm:flex-row gap-3 mt-4 mb-4">
        <input
          type="text"
          placeholder="Search student by name..."
          className="border p-2 flex-1 max-w-sm rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {selectedStudents.length > 0 && (
          <button
            className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700 transition"
            onClick={handleBulkDelete}
          >
            Delete Selected ({selectedStudents.length})
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-row items-center justify-center gap-3 mt-10">
          <Loader2 className="text-blue-500 animate-spin" />
          <p className="text-subtext">Loading students...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border items-start text-left rounded-lg overflow-hidden shadow-lg animate-slideIn">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3 border">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="p-3 border">Name</th>
                <th className="p-3 border">Email</th>
                <th className="p-3 border">Status</th>
                <th className="p-3 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="border hover:bg-gray-50">
                    <td className="p-3 border">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleSelectStudent(student.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 border">{student.name}</td>
                    <td className="p-3 border">{student.emailAddress}</td>
                    <td
                      className={`p-3 border font-bold ${student.status === "Active" || !student.status
                        ? "text-green-600"
                        : "text-red-600"
                        }`}
                    >
                      {student.status || "Active"}
                    </td>
                    <td className="p-3 border space-x-2">
                      <button
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                        onClick={() => handleResetPassword(student.emailAddress)}
                      >
                        Reset Password
                      </button>

                      {student.status === "Active" || !student.status ? (
                        <button
                          className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
                          onClick={() => handleDeactivate(student.id)}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition"
                          onClick={() => handleActivate(student.id)}
                        >
                          Activate
                        </button>
                      )}

                      <button
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                        onClick={() => handleDelete(student.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-3 text-center border" colSpan={5}>
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageStudents;