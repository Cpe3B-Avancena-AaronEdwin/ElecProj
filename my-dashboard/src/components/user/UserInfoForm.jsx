import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function UserInfoForm() {
  const { user, updateProfileInfo } = useAuth();
  const [fullName, setFullName] = useState(user?.displayName || "");
  const [username, setUsername] = useState("");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateProfileInfo({ fullName, username, photoURL });
    alert("Profile updated successfully!");
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Profile Information</h3>
      <label>Full Name</label>
      <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <label>Username</label>
      <input value={username} onChange={(e) => setUsername(e.target.value)} />
      <label>Photo URL</label>
      <input value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} />
      <button type="submit">Update Profile</button>
    </form>
  );
}