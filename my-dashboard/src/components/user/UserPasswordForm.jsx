// src/components/user/UserPasswordForm.jsx
import React, { useState } from "react";
import { updatePassword } from "./UserService";

export default function UserPasswordForm({ setMessage }) {
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [show, setShow] = useState(false);

  const handleUpdate = async () => {
    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    if (form.newPassword.length < 6) {
      setMessage({ type: "error", text: "Minimum 6 characters." });
      return;
    }

    try {
      await updatePassword(form.newPassword);
      setMessage({ type: "success", text: "Password updated." });

      setForm({ newPassword: "", confirmPassword: "" });
    } catch {
      setMessage({ type: "error", text: "Failed to update password." });
    }
  };

  return (
    <div className="form-group">

      <div className="input-group">
        <label>New Password</label>
        <div className="input-wrapper">
          <input
            type={show ? "text" : "password"}
            className="settings-input"
            value={form.newPassword}
            onChange={(e) =>
              setForm({ ...form, newPassword: e.target.value })
            }
          />
          <span className="toggle" onClick={() => setShow(!show)}>
            {show ? "🙈" : "👁️"}
          </span>
        </div>
      </div>

      <div className="input-group">
        <label>Confirm Password</label>
        <div className="input-wrapper">
          <input
            type={show ? "text" : "password"}
            className="settings-input"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
          />
        </div>
      </div>

      <div className="form-actions">
        <button className="settings-button primary" onClick={handleUpdate}>
          Update Password
        </button>
      </div>

    </div>
  );
}