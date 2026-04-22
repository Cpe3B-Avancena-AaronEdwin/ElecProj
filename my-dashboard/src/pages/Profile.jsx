import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/config";
import {
  linkGoogleToCurrentUser,
  linkPasswordToCurrentUser,
  updateUserProfile,
  updateUserPassword,
} from "../firebase/auth";
import { useAuth } from "../context/AuthContext";
import Input from "../components/input";
import Button from "../components/button";
import Layout from "../components/Layout";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [photoURL, setPhotoURL] = useState("");

  const [linkEmail, setLinkEmail] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [confirmLinkPassword, setConfirmLinkPassword] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [loginMessage, setLoginMessage] = useState("");
  const [loginError, setLoginError] = useState("");

  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [linkingPassword, setLinkingPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [providers, setProviders] = useState([]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.displayName || "");
      setUsername(user.username || "");
      setPhotoURL(user.photoURL || "");
      setLinkEmail(user.email || "");
    }
  }, [user]);

  const refreshProviders = async () => {
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        const refreshed = auth.currentUser.providerData.map(
          (provider) => provider.providerId
        );
        setProviders(refreshed);
      } else {
        setProviders([]);
      }
    } catch (err) {
      console.error("Failed to refresh providers:", err);
    }
  };

  useEffect(() => {
    refreshProviders();
  }, [user]);

  const hasPasswordProvider = useMemo(
    () => providers.includes("password"),
    [providers]
  );

  const hasGoogleProvider = useMemo(
    () => providers.includes("google.com"),
    [providers]
  );

  const clearAllMessages = () => {
    setProfileMessage("");
    setProfileError("");
    setLoginMessage("");
    setLoginError("");
    setPasswordMessage("");
    setPasswordError("");
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    clearAllMessages();
    setSavingProfile(true);

    try {
      await updateUserProfile({
        fullName,
        username,
        photoURL,
      });

      setProfileMessage("Profile updated successfully.");
    } catch (err) {
      console.error("Profile update error:", err);
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLinkGoogle = async () => {
    clearAllMessages();
    setLinkingGoogle(true);

    try {
      await linkGoogleToCurrentUser();
      await refreshProviders();
      setLoginMessage("Google account linked successfully.");
    } catch (err) {
      console.error("Link Google error:", err);

      let errorMessage = "Failed to link Google account.";

      if (err.code === "auth/credential-already-in-use") {
        errorMessage = "This Google account is already linked to another user.";
      } else if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "Google sign-in was cancelled.";
      } else if (err.code === "auth/popup-blocked") {
        errorMessage =
          "Pop-up was blocked by your browser. Please allow pop-ups and try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setLoginError(errorMessage);
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleAddPassword = async (e) => {
    e.preventDefault();
    clearAllMessages();

    if (!linkEmail.trim()) {
      setLoginError("Email is required.");
      return;
    }

    if (linkPassword.length < 6) {
      setLoginError("Password must be at least 6 characters.");
      return;
    }

    if (linkPassword !== confirmLinkPassword) {
      setLoginError("Passwords do not match.");
      return;
    }

    setLinkingPassword(true);

    try {
      await linkPasswordToCurrentUser(linkEmail, linkPassword);
      await refreshProviders();
      setLinkPassword("");
      setConfirmLinkPassword("");
      setLoginMessage("Password login added successfully.");
    } catch (err) {
      console.error("Add password error:", err);

      let errorMessage = "Failed to add password login.";

      if (err.code === "auth/weak-password") {
        errorMessage =
          "Password is too weak. Please choose a stronger password.";
      } else if (err.code === "auth/email-already-in-use") {
        errorMessage = "This email is already associated with another account.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setLoginError(errorMessage);
    } finally {
      setLinkingPassword(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    clearAllMessages();

    if (!currentPassword.trim()) {
      setPasswordError("Current password is required.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setChangingPassword(true);

    try {
      await updateUserPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordMessage("Password changed successfully.");
    } catch (err) {
      console.error("Change password error:", err);

      let errorMessage = "Failed to change password.";

      if (err.code === "auth/wrong-password") {
        errorMessage =
          "Current password is incorrect. Please enter your correct current password.";
      } else if (err.code === "auth/invalid-credential") {
        errorMessage =
          "Current password is incorrect. Please enter your correct current password.";
      } else if (err.code === "auth/weak-password") {
        errorMessage =
          "New password is too weak. Please choose a stronger password.";
      } else if (err.code === "auth/requires-recent-login") {
        errorMessage =
          "For security reasons, please log out and log back in before changing your password.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setPasswordError(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="dashboard-container" style={{ paddingTop: "24px" }}>
          <div style={{ color: "#fff" }}>
            No user is currently signed in.
          </div>
        </div>
      </Layout>
    );
  }

  const infoBoxStyle = {
    marginBottom: "20px",
    padding: "12px 14px",
    borderRadius: "12px",
  };

  return (
    <Layout>
      <div className="dashboard-container">
        <div
          style={{
            maxWidth: "720px",
            width: "100%",
            margin: "0 auto",
            background: "var(--bg-card)",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 24px 80px rgba(15, 23, 42, 0.18)",
          }}
        >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ marginTop: 0, marginBottom: "6px", color: "#0f172a" }}>
              Profile
            </h1>
            <p style={{ color: "#64748b", margin: 0 }}>
              Manage your profile and linked sign-in methods.
            </p>
          </div>

          <Button
            type="button"
            className="btn--secondary"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <div style={{ marginBottom: "8px", color: "#334155" }}>
            <strong>Email:</strong> {user.email || "No email"}
          </div>
          <div style={{ marginBottom: "8px", color: "#334155" }}>
            <strong>Current providers:</strong>{" "}
            {providers.length ? providers.join(", ") : "None"}
          </div>
          <div style={{ color: "#334155" }}>
            <strong>UID:</strong> {user.uid}
          </div>
        </div>

        {(profileError || profileMessage) && (
          <div
            style={{
              ...infoBoxStyle,
              background: profileError ? "#fef2f2" : "#f0fdf4",
              color: profileError ? "#dc2626" : "#166534",
              border: profileError
                ? "1px solid #fecaca"
                : "1px solid #bbf7d0",
            }}
          >
            {profileError || profileMessage}
          </div>
        )}

        <form
          onSubmit={handleSaveProfile}
          style={{
            display: "grid",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <Input
            id="fullName"
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <Input
            id="username"
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <Input
            id="photoURL"
            label="Photo URL"
            type="text"
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
          />

          <Button
            type="submit"
            className="btn--primary"
            disabled={savingProfile}
          >
            {savingProfile ? "Saving..." : "Save Profile"}
          </Button>
        </form>

        <div
          style={{
            borderTop: "1px solid #e2e8f0",
            paddingTop: "24px",
          }}
        >
          <h2 style={{ marginTop: 0, color: "#0f172a" }}>Login Methods</h2>

          {(loginError || loginMessage) && (
            <div
              style={{
                ...infoBoxStyle,
                background: loginError ? "#fef2f2" : "#f0fdf4",
                color: loginError ? "#dc2626" : "#166534",
                border: loginError
                  ? "1px solid #fecaca"
                  : "1px solid #bbf7d0",
              }}
            >
              {loginError || loginMessage}
            </div>
          )}

          {hasPasswordProvider && !hasGoogleProvider && (
            <div
              style={{
                display: "grid",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <p style={{ margin: 0, color: "#475569" }}>
                Your account currently uses password login. Link Google so you
                can sign in with either password or Google on the same account.
              </p>

              <Button
                type="button"
                className="btn--google"
                onClick={handleLinkGoogle}
                disabled={linkingGoogle}
              >
                {linkingGoogle ? "Linking Google..." : "Link Google"}
              </Button>
            </div>
          )}

          {!hasPasswordProvider && hasGoogleProvider && (
            <form
              onSubmit={handleAddPassword}
              style={{
                display: "grid",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <p style={{ margin: 0, color: "#475569" }}>
                Your account currently uses Google only. Add a password so you
                can also log in using email and password.
              </p>

              <Input
                id="linkEmail"
                label="Email"
                type="email"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                required
              />

              <Input
                id="linkPassword"
                label="New Password"
                type="password"
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                required
              />

              <Input
                id="confirmLinkPassword"
                label="Confirm New Password"
                type="password"
                value={confirmLinkPassword}
                onChange={(e) => setConfirmLinkPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                className="btn--primary"
                disabled={linkingPassword}
              >
                {linkingPassword ? "Adding Password..." : "Add Password"}
              </Button>
            </form>
          )}

          {hasPasswordProvider && hasGoogleProvider && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                padding: "14px",
                borderRadius: "12px",
                marginBottom: "20px",
              }}
            >
              This account already has both Password and Google linked. You can
              use either login method.
            </div>
          )}

          {hasPasswordProvider && (
            <form
              onSubmit={handleChangePassword}
              style={{
                display: "grid",
                gap: "16px",
                marginBottom: "20px",
                padding: "16px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
              }}
            >
              <h3 style={{ margin: 0, color: "#0f172a" }}>Change Password</h3>
              <p style={{ margin: 0, color: "#475569" }}>
                Enter your current password and choose a new one.
              </p>

              {(passwordError || passwordMessage) && (
                <div
                  style={{
                    ...infoBoxStyle,
                    marginBottom: 0,
                    background: passwordError ? "#fef2f2" : "#f0fdf4",
                    color: passwordError ? "#dc2626" : "#166534",
                    border: passwordError
                      ? "1px solid #fecaca"
                      : "1px solid #bbf7d0",
                  }}
                >
                  {passwordError || passwordMessage}
                </div>
              )}

              <Input
                id="currentPassword"
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <Input
                id="newPassword"
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <Input
                id="confirmNewPassword"
                label="Confirm New Password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                className="btn--primary"
                disabled={changingPassword}
              >
                {changingPassword ? "Changing Password..." : "Change Password"}
              </Button>
            </form>
          )}

          {!hasPasswordProvider && !hasGoogleProvider && (
            <div
              style={{
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#9a3412",
                padding: "14px",
                borderRadius: "12px",
              }}
            >
              No supported login methods were detected on this account.
            </div>
          )}
        </div>
      </div>

      </div>
    </Layout>
  );
}