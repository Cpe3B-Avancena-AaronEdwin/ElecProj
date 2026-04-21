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
    return (
      <p style={{ color: "#f87171", padding: "1.5rem" }}>
        Access denied. Admins only.
      </p>
    );
  }

  const roleTagLabel = (userRole) => {
    if (userRole === "admin") return "full access";
    if (userRole === "operator") return "limited write";
    return "view only";
  };

  return (
    <div className="admin-users-page">
      <div className="admin-users-container">
        <div className="admin-users-header">
          <div className="admin-users-header-copy">
            <h2>User Management</h2>
            <p>Manage system access and permissions</p>
          </div>

          <button className="back-btn" onClick={() => navigate("/dashboard")}>
            ← Back
          </button>
        </div>

        {(message || error) && (
          <div className={`admin-users-alert ${error ? "error" : "success"}`}>
            {error || message}
          </div>
        )}

        <div className="create-user-card">
          <h3>Create Firestore User Entry</h3>

          <div className="create-user-grid">
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) =>
                setNewUser((prev) => ({ ...prev, email: e.target.value }))
              }
              className="create-user-input"
            />

            <input
              type="text"
              placeholder="Display Name"
              value={newUser.displayName}
              onChange={(e) =>
                setNewUser((prev) => ({
                  ...prev,
                  displayName: e.target.value,
                }))
              }
              className="create-user-input"
            />

            <select
              value={newUser.role}
              onChange={(e) =>
                setNewUser((prev) => ({ ...prev, role: e.target.value }))
              }
              className="create-user-input"
            >
              <option value="viewer">Viewer</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>

            <button onClick={handleCreate} className="create-user-button">
              Add User
            </button>
          </div>
        </div>

        <div className="user-list">
          {users.map((u) => (
            <div key={u.id} className="user-card">
              <div className="user-main">
                <div className="avatar">
                  {u.displayName?.charAt(0)?.toUpperCase() || "U"}
                </div>

                <div className="user-details">
                  <div className="user-name-row">
                    <span className="user-name">
                      {u.displayName || "Unnamed User"}
                    </span>
                    <span className="status">active</span>
                  </div>

                  <div className="user-email">{u.email || "No email"}</div>

                  <div className="user-role-row">
                    {editingUser?.id === u.id ? (
                      <select
                        value={editingUser.role || "viewer"}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            role: e.target.value,
                          })
                        }
                        className="role-select"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="operator">Operator</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className="role-text">{u.role || "viewer"}</span>
                    )}
                  </div>

                  <div className="tags">
                    <span className="tag">{roleTagLabel(u.role)}</span>
                  </div>
                </div>
              </div>

              <div className="user-actions">
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
                      title={
                        u.id === user?.uid
                          ? "You cannot delete your own account here."
                          : "Delete user"
                      }
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
    </div>
  );
}