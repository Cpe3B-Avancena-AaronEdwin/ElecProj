import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function UserPasswordForm() {
  const { changePassword } = useAuth();
  const [newPassword, setNewPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await changePassword(newPassword);
    alert("Password updated successfully!");
    setNewPassword("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Change Password</h3>
      <label>New Password</label>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <button type="submit">Update Password</button>
    </form>
  );
}