// src/components/user/UserSettings.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import UserPasswordForm from "./UserPasswordForm";
import UserDeleteAccount from "./UserDeleteAccount";
import UserSessions from "./UserSessions";
import { updateUserProfile } from "./UserService";
import "./UserSettings.css";

export default function UserSettings() {
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);

  const initialUser = {
    fullName: "Operator",
    email: "operator@traffic.gov",
    role: "Admin",
  };

  const [user, setUser] = useState(initialUser);

  const handleUpdateInfo = async () => {
    try {
      await updateUserProfile({
        displayName: user.fullName,
        email: user.email,
      });

      setMessage({
        type: "success",
        text: "Account information updated successfully.",
      });
    } catch {
      setMessage({
        type: "error",
        text: "Failed to update account information.",
      });
    }
  };

  return (
    <div className="user-settings-container">

     {/* HEADER */}
        <header className="settings-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>
            ← Back
        </button>
        <div className="header-text">
            <h2 className="page-title">User Information Settings</h2>
            <p className="sub-title">
            Manage your account details, password, and security
            </p>
        </div>
        </header>

      {/* MESSAGE */}
      {message && (
        <div className={`banner ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* ACCOUNT INFO */}
      <section className="settings-section">
        <h3 className="section-title">Account Information</h3>

        <div className="form-group">
          <div className="input-group">
            <label>Full Name</label>
            <div className="input-wrapper">
              <input
                className="settings-input"
                value={user.fullName}
                onChange={(e) =>
                  setUser({ ...user, fullName: e.target.value })
                }
              />
            </div>
          </div>

          <div className="input-group">
            <label>Email</label>
            <div className="input-wrapper">
              <input
                className="settings-input"
                value={user.email}
                onChange={(e) =>
                  setUser({ ...user, email: e.target.value })
                }
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              className="settings-button primary"
              onClick={handleUpdateInfo}
            >
              Save Changes
            </button>
          </div>
        </div>
      </section>

      {/* PASSWORD */}
      <section className="settings-section">
        <h3 className="section-title">Change Password</h3>
        <UserPasswordForm setMessage={setMessage} />
      </section>

      {/* SESSIONS */}
      <section className="settings-section">
        <h3 className="section-title">Active Sessions</h3>
        <UserSessions setMessage={setMessage} />
      </section>

      {/* DELETE */}
      <section className="settings-section danger">
        <h3 className="section-title">Delete Account</h3>
        <UserDeleteAccount setMessage={setMessage} />
      </section>

    </div>
  );
}