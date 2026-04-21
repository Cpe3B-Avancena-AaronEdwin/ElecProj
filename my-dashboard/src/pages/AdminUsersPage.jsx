// src/pages/AdminUsersPage.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import SiteFooter from "../components/SiteFooter";
import {
  updateUserProfile,
  deleteUserAccount,
} from "../components/user/UserService";
import "../styles/adminusers.css";

export default function AdminUsersPage() {
  const { role, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    email: "",
    displayName: "",
    role: "viewer",
  });
  const [editingUser, setEditingUser] = useState(null);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      setError("");
      const usersQuery = query(collection(db, "users"), orderBy("displayName"));
      const snapshot = await getDocs(usersQuery);
      const data = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError(err.message || "Failed to load users.");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showTempMessage = (text, isError = false) => {
    if (isError) {
      setError(text);
      setTimeout(() => setError(""), 3000);
      return;
    }

    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  };

  const handleCreate = async () => {
    if (!newUser.email.trim() || !newUser.displayName.trim()) {
      showTempMessage("Please fill in email and display name.", true);
      return;
    }

    try {
      await addDoc(collection(db, "users"), {
        email: newUser.email.trim(),
        displayName: newUser.displayName.trim(),
        role: newUser.role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setNewUser({
        email: "",
        displayName: "",
        role: "viewer",
      });

      showTempMessage("User added successfully.");
      fetchUsers();
    } catch (err) {
      console.error("Failed to create user:", err);
      showTempMessage(err.message || "Failed to create user.", true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser?.id) return;

    try {
      setSavingId(editingUser.id);

      await updateUserProfile({
        userId: editingUser.id,
        displayName: editingUser.displayName,
        email: editingUser.email,
        role: editingUser.role,
      });

      setEditingUser(null);
      showTempMessage("User role updated successfully.");
      await fetchUsers();
    } catch (err) {
      console.error("Failed to update user:", err);
      showTempMessage(err.message || "Could not save changes.", true);
    } finally {
      setSavingId("");
    }
  };

  const handleDelete = async (targetUser) => {
    if (!targetUser?.id) return;

    if (targetUser.id === user?.uid) {
      showTempMessage("You cannot delete your own admin account here.", true);
      return;
    }

    const confirmed = window.confirm(
      `Delete ${targetUser.displayName || targetUser.email}?`
    );
    if (!confirmed) return;

    try {
      await deleteUserAccount(targetUser.id);
      showTempMessage("User deleted successfully.");
      await fetchUsers();
    } catch (err) {
      console.error("Failed to delete user:", err);
      showTempMessage(err.message || "Could not delete user.", true);
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

        <button className="back-btn" onClick={() => navigate("/dashboard")}>
          ← Back
        </button>
      </div>

      {(message || error) && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "12px 14px",
            borderRadius: "12px",
            background: error
              ? "rgba(239, 68, 68, 0.14)"
              : "rgba(34, 197, 94, 0.14)",
            color: error ? "#fca5a5" : "#86efac",
            border: error
              ? "1px solid rgba(239,68,68,0.35)"
              : "1px solid rgba(34,197,94,0.35)",
          }}
        >
          {error || message}
        </div>
      )}

      <div
        style={{
          background: "rgba(6, 182, 212, 0.08)",
          border: "1px solid rgba(6,182,212,0.25)",
          borderRadius: "16px",
          padding: "16px",
          marginBottom: "18px",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "12px" }}>Create Firestore User Entry</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) =>
              setNewUser((prev) => ({ ...prev, email: e.target.value }))
            }
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(148,163,184,0.25)",
              background: "#0f172a",
              color: "#e5e7eb",
            }}
          />

          <input
            type="text"
            placeholder="Display Name"
            value={newUser.displayName}
            onChange={(e) =>
              setNewUser((prev) => ({ ...prev, displayName: e.target.value }))
            }
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(148,163,184,0.25)",
              background: "#0f172a",
              color: "#e5e7eb",
            }}
          />

          <select
            value={newUser.role}
            onChange={(e) =>
              setNewUser((prev) => ({ ...prev, role: e.target.value }))
            }
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(148,163,184,0.25)",
              background: "#0f172a",
              color: "#e5e7eb",
            }}
          >
            <option value="viewer">Viewer</option>
            <option value="operator">Operator</option>
            <option value="admin">Admin</option>
          </select>

          <button
            onClick={handleCreate}
            style={{
              border: "none",
              borderRadius: "10px",
              padding: "12px 16px",
              background: "#06b6d4",
              color: "#fff",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Add User
          </button>
        </div>
      </div>

      <div>
        {users.map((u) => (
          <div
            key={u.id}
            style={{
              background: "rgba(6, 182, 212, 0.15)",
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
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#06b6d4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: "1.2rem",
                }}
              >
                {u.displayName?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div>
                <div style={{ fontWeight: "700", fontSize: "15px" }}>
                  {u.displayName || "Unnamed User"}
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "11px",
                      background: "rgba(34,197,94,0.2)",
                      color: "#22c55e",
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    active
                  </span>
                </div>

                <div style={{ fontSize: "13px", color: "#cbd5f5" }}>
                  {u.email || "No email"}
                </div>

                <div style={{ marginTop: "4px" }}>
                  {editingUser?.id === u.id ? (
                    <select
                      value={editingUser.role || "viewer"}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          role: e.target.value,
                        })
                      }
                    >
                      <option value="viewer">Viewer</option>
                      <option value="operator">Operator</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span style={{ color: "#e0f2fe", fontSize: "13px" }}>
                      {u.role || "viewer"}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: "6px", display: "flex", gap: "6px" }}>
                  {u.role === "admin" && <span style={tagStyle}>full access</span>}
                  {u.role === "operator" && <span style={tagStyle}>limited write</span>}
                  {u.role === "viewer" && <span style={tagStyle}>view only</span>}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {editingUser?.id === u.id ? (
                <>
                  <button
                    className="action-btn save-btn"
                    onClick={handleSaveEdit}
                    disabled={savingId === u.id}
                  >
                    {savingId === u.id ? "Saving..." : "Save"}
                  </button>

                  <button
                    className="action-btn cancel-btn"
                    onClick={() => setEditingUser(null)}
                    disabled={savingId === u.id}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="action-btn"
                    onClick={() => setEditingUser({ ...u })}
                  >
                    Change Role
                  </button>

                  <button
                    className="action-btn cancel-btn"
                    onClick={() => handleDelete(u)}
                    disabled={u.id === user?.uid}
                    title={u.id === user?.uid ? "You cannot delete your own account here." : "Delete user"}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}