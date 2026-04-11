// src/pages/AdminUsersPage.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { collection, getDocs, addDoc, doc, serverTimestamp } from "firebase/firestore";
import "../styles/adminusers.css";
import { useNavigate } from "react-router-dom";

// ✅ Correct path to your UserService.jsx
import { updateUserProfile, deleteUserAccount } from "../components/user/UserService";

export default function AdminUsersPage() {
  const { role } = useAuth();
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ email: "", displayName: "", role: "viewer" });
  const [editingUser, setEditingUser] = useState(null);

  const navigate = useNavigate(); // ✅ initialize navigate

  // Load all users
  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Create new user (Firestore only)
  const handleCreate = async () => {
    if (!newUser.email || !newUser.displayName) return;
    await addDoc(collection(db, "users"), {
      email: newUser.email,
      displayName: newUser.displayName,
      role: newUser.role,
      createdAt: serverTimestamp(),
    });
    setNewUser({ email: "", displayName: "", role: "viewer" });
    fetchUsers();
  };

  // Save edits using UserService
  const handleSaveEdit = async () => {
    if (!editingUser || !editingUser.id) return;
    try {
      await updateUserProfile({
        displayName: editingUser.displayName,
        email: editingUser.email,
        role: editingUser.role,
      });
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error("Failed to update user:", err);
      alert("Could not save changes.");
    }
  };

  // Delete using UserService
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUserAccount(); // removes from Auth + Firestore
      fetchUsers();
    } catch (err) {
      console.error("Failed to delete user:", err);
      alert("Could not delete user.");
    }
  };

  if (role !== "admin") {
    return <p style={{ color: "#f87171" }}>Access denied. Admins only.</p>;
  }

  const tagStyle = {
    background: "rgba(15, 23, 42, 0.6)",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    color: "#e0f2fe",
  };

  return (
    <div
      style={{
        padding: "1.5rem",
        color: "#e5e7eb",
        background: "#0f172a",
        minHeight: "100vh",
      }}
    >
     {/* Header row */}
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "2rem",
    borderBottom: "1px solid rgba(148,163,184,0.2)",
    paddingBottom: "0.75rem",
  }}
>
  <div>
    <h2
      style={{
        fontFamily: "Inter, sans-serif",
        fontSize: "32px",
        fontWeight: "700",
        letterSpacing: "-0.5px",
        color: "#f1f5f9",
        margin: 0,
      }}
    >
      User Management
    </h2>
    <p
      style={{
        fontFamily: "Inter, sans-serif",
        fontSize: "15px",
        fontWeight: "400",
        color: "#94a3b8",
        marginTop: "4px",
      }}
    >
      Manage system access and permissions
    </p>
  </div>
  {/* Back button → Dashboard */}
  <button className="back-btn" onClick={() => navigate("/dashboard")}>
    ← Back
  </button>
</div>

      {/* Users list */}
      <div>
        {users.map((u) => (
          <div
            key={u.id}
            style={{
              background: "rgba(6, 182, 212, 0.15)", // ✅ cyan transparent
              border: "1px solid rgba(6, 182, 212, 0.4)",
              backdropFilter: "blur(10px)",
              borderRadius: "14px",
              padding: "16px",
              marginBottom: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* LEFT SIDE */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {/* Avatar */}
              <div
                style={{
                  width: "45px",
                  height: "45px",
                  borderRadius: "50%",
                  background: "#06b6d4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: "600",
                }}
              >
                {u.displayName?.charAt(0).toUpperCase()}
              </div>

              {/* USER INFO */}
              <div>
                <div style={{ fontWeight: "600", fontSize: "15px" }}>
                  {u.displayName}
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "11px",
                      background: "rgba(34,197,94,0.2)",
                      color: "#22c55e",
                      padding: "2px 6px",
                      borderRadius: "999px",
                    }}
                  >
                    active
                  </span>
                </div>

                <div style={{ fontSize: "13px", color: "#cbd5f5" }}>
                  {u.email}
                </div>

                {/* ROLE (Admin / Viewer only) */}
                <div style={{ marginTop: "4px" }}>
                  {editingUser?.id === u.id ? (
                    <select
                      value={editingUser.role}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          role: e.target.value,
                        })
                      }
                    >
                      <option value="viewer">Viewer</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span style={{ color: "#e0f2fe", fontSize: "13px" }}>
                      {u.role}
                    </span>
                  )}
                </div>

                {/* TAGS */}
                <div style={{ marginTop: "6px", display: "flex", gap: "6px" }}>
                  {u.role === "admin" && <span style={tagStyle}>full access</span>}
                  {u.role === "viewer" && <span style={tagStyle}>view only</span>}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE ACTION */}
            <div>
              {editingUser?.id === u.id ? (
                <>
                  <button
                    className="action-btn save-btn"
                    onClick={handleSaveEdit}
                  >
                    Save
                  </button>
                  <button
                    className="action-btn cancel-btn"
                    onClick={() => setEditingUser(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="action-btn"
                  onClick={() => setEditingUser({ ...u })}
                >
                  Change Role
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}