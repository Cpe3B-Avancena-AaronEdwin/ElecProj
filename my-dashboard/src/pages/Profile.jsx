import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/config";
import {
  linkGoogleToCurrentUser,
  linkPasswordToCurrentUser,
  updateUserProfile,
} from "../firebase/auth";
import { useAuth } from "../context/AuthContext";
import Input from "../components/input";
import Button from "../components/button";
import SiteFooter from "../components/SiteFooter";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [photoURL, setPhotoURL] = useState("");

  const [linkEmail, setLinkEmail] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [confirmLinkPassword, setConfirmLinkPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [linkingPassword, setLinkingPassword] = useState(false);

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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSavingProfile(true);

    try {
      await updateUserProfile({
        fullName,
        username,
        photoURL,
      });

      setMessage("Profile updated successfully.");
    } catch (err) {
      console.error("Profile update error:", err);
      setError(err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLinkGoogle = async () => {
    setError("");
    setMessage("");
    setLinkingGoogle(true);

    try {
      await linkGoogleToCurrentUser();
      await refreshProviders();
      setMessage("Google account linked successfully.");
    } catch (err) {
      console.error("Link Google error:", err);
      setError(err.message || "Failed to link Google account.");
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleAddPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!linkEmail.trim()) {
      setError("Email is required.");
      return;
    }

    if (linkPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (linkPassword !== confirmLinkPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLinkingPassword(true);

    try {
      await linkPasswordToCurrentUser(linkEmail, linkPassword);
      await refreshProviders();
      setLinkPassword("");
      setConfirmLinkPassword("");
      setMessage("Password login added successfully.");
    } catch (err) {
      console.error("Add password error:", err);
      setError(err.message || "Failed to add password login.");
    } finally {
      setLinkingPassword(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: "24px", color: "#fff" }}>
        No user is currently signed in.
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          background: "#ffffff",
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

        {(error || message) && (
          <div
            style={{
              marginBottom: "20px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: error ? "#fef2f2" : "#f0fdf4",
              color: error ? "#dc2626" : "#166534",
              border: error ? "1px solid #fecaca" : "1px solid #bbf7d0",
            }}
          >
            {error || message}
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
              }}
            >
              This account already has both Password and Google linked. You can
              use either login method.
            </div>
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

      <SiteFooter />
    </div>
  );
}