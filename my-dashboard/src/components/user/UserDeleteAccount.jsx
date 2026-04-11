import React, { useState } from "react";
import { deleteUserAccount } from "./UserService";

export default function UserDeleteAccount({ setMessage }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");

  const handleDelete = async () => {
    if (confirm !== "DELETE") {
      setMessage({
        type: "error",
        text: 'Type "DELETE" to confirm.',
      });
      return;
    }

    try {
      await deleteUserAccount();

      setMessage({
        type: "success",
        text: "Account deleted successfully.",
      });

      setOpen(false);
      setConfirm("");
    } catch {
      setMessage({
        type: "error",
        text: "Failed to delete account.",
      });
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        className="settings-button-danger"
        onClick={() => setOpen(true)}
      >
        Delete Account
      </button>

      {/* MODAL */}
      {open && (
        <div className="modal-overlay">

          <div className="modal">

            <h3 className="modal-title">Delete Account</h3>

            <p className="delete-warning">
              This action is permanent. All your data will be removed.
            </p>

            <div className="input-group">
              <label>Type DELETE to confirm</label>
              <div className="input-wrapper">
                <input
                  className="settings-input"
                  placeholder="DELETE"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="settings-button-cancel"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>

              <button
                className="settings-button-danger"
                onClick={handleDelete}
              >
                Confirm Delete
              </button>
            </div>

          </div>

        </div>
      )}
    </>
  );
}