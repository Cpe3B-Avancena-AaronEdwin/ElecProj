import React, { useState } from "react";
import { updateUserProfile } from "./UserService";

export default function UserInfoForm({ setMessage }) {
  const [profile, setProfile] = useState({
    fullName: "",
    username: "",
    photoURL: "",
  });

  const handleUpdate = async () => {
    try {
      await updateUserProfile({
        displayName: profile.fullName,
        photoURL: profile.photoURL,
      });

      setMessage({
        type: "success",
        text: "Profile updated successfully.",
      });
    } catch {
      setMessage({
        type: "error",
        text: "Failed to update profile.",
      });
    }
  };

  return (
    <div className="form-group">

      <div className="input-group">
        <label>Full Name</label>
        <div className="input-wrapper">
          <input
            className="settings-input"
            value={profile.fullName}
            placeholder="Enter full name"
            onChange={(e) =>
              setProfile({ ...profile, fullName: e.target.value })
            }
          />
        </div>
      </div>

      <div className="input-group">
        <label>Username</label>
        <div className="input-wrapper">
          <input
            className="settings-input"
            value={profile.username}
            placeholder="Enter username"
            onChange={(e) =>
              setProfile({ ...profile, username: e.target.value })
            }
          />
        </div>
      </div>

      <div className="input-group">
        <label>Photo URL</label>
        <div className="input-wrapper">
          <input
            className="settings-input"
            value={profile.photoURL}
            placeholder="Enter photo URL"
            onChange={(e) =>
              setProfile({ ...profile, photoURL: e.target.value })
            }
          />
        </div>
      </div>

      <div className="form-actions">
        <button className="settings-button primary" onClick={handleUpdate}>
          Update Profile
        </button>
      </div>

    </div>
  );
}