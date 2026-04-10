// src/pages/AdminUsersPage.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";

export default function AdminUsersPage() {
  const { role } = useAuth();
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ email: "", displayName: "" });

  // Load all users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    };
    fetchUsers();
  }, []);

  // Create new user document (for demo — you may want to use Firebase Auth createUserWithEmailAndPassword)
  const handleCreate = async () => {
    if (!newUser.email) return;
    await addDoc(collection(db, "users"), {
      email: newUser.email,
      displayName: newUser.displayName,
      createdAt: new Date(),
    });
    setNewUser({ email: "", displayName: "" });
    const snapshot = await getDocs(collection(db, "users"));
    setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  // Edit user (update Firestore doc)
  const handleEdit = async (id, updatedUser) => {
    const userRef = doc(db, "users", id);
    await updateDoc(userRef, updatedUser);
    const snapshot = await getDocs(collection(db, "users"));
    setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  // Delete user (remove Firestore doc)
  const handleDelete = async (id) => {
    const userRef = doc(db, "users", id);
    await deleteDoc(userRef);
    const snapshot = await getDocs(collection(db, "users"));
    setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  if (role !== "admin") {
    return <p>Access denied. Admins only.</p>;
  }

  return (
    <div className="admin-users-page">
      <h2>Manage Users</h2>

      {/* Create new user */}
      <div className="create-user-form">
        <input
          type="text"
          placeholder="Display Name"
          value={newUser.displayName}
          onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
        />
        <button onClick={handleCreate}>Create User</button>
      </div>

      {/* Users list */}
      <table className="users-table">
        <thead>
          <tr>
            <th>Display Name</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.displayName}</td>
              <td>{u.email}</td>
              <td>
                <button
                  onClick={() =>
                    handleEdit(u.id, { displayName: "Updated Name" })
                  }
                >
                  Edit
                </button>
                <button
                  className="danger"
                  onClick={() => handleDelete(u.id)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}