import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "../firebase/config";
import {
  getCurrentUserProviders,
  linkGoogleToCurrentUser,
  linkPasswordToCurrentUser,
} from "../firebase/auth";
import { useAuth } from "../context/AuthContext";
import Input from "../components/input";
import Button from "../components/button";
import SiteFooter from "../components/SiteFooter";

export default function Profile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    user,
    updateProfileInfo,
    changePassword,
    loading: authLoading,
  } = useAuth();

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
      const refreshed = await getCurrentUserProviders();
      setProviders(refreshed);
    } catch (err) {
      console.error("Failed to refresh providers:", err);
      setProviders(
        Array.isArray(auth.currentUser?.providerData)
          ? auth.currentUser.providerData.map((provider) => provider.providerId)
          : []
      );
    }
  };

  useEffect(() => {
    refreshProviders();
  }, [user]);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      setLoginMessage(success);
    }

    if (error) {
      setLoginError(error);
    }
  }, [searchParams]);

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
      await updateProfileInfo({
        fullName,
        displayName: fullName,
        username,
        photoURL,
        email: user?.email || "",
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
    linkGoogleToCurrentUser();
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
      setLoginError(err.message || "Failed to add password login.");
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
      await changePassword(newPassword, currentPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordMessage("Password changed successfully.");
    } catch (err) {
      console.error("Change password error:", err);
      setPasswordError(err.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  if (authLoading) {
    return <div style={{ padding: "2rem" }}>Loading profile...</div>;
  }

  if (!user) {
    return (
      <div style={{ padding: "2rem" }}>
        <p>You are not logged in.</p>
        <Button onClick={() => navigate("/login")}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: 720 }}>
        <div className="login-brand">
          <div className="brand-mark" aria-hidden="true">
            <img src="/logo.jpeg" alt="CityBloop Logo" />
          </div>
          <div className="brand-copy">
            <h1 className="brand-name">Profile</h1>
            <p className="brand-subtitle">
              Manage your profile and login methods.
            </p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSaveProfile} noValidate>
          <Input
            id="fullName"
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            id="username"
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <Input
            id="photoURL"
            label="Photo URL"
            type="text"
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
          />

          {profileError && <div className="form-error">{profileError}</div>}
          {profileMessage && <div className="form-success">{profileMessage}</div>}

          <Button type="submit" className="btn--primary" disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save Profile"}
          </Button>
        </form>

        <div className="auth-divider">
          <span>Login Methods</span>
        </div>

        <div className="auth-form">
          <p className="login-hint">
            Connected methods:
            {" "}
            <strong>
              {providers.length ? providers.join(", ") : "none"}
            </strong>
          </p>

          {loginError && <div className="form-error">{loginError}</div>}
          {loginMessage && <div className="form-success">{loginMessage}</div>}

          <Button
            type="button"
            className="btn--google"
            onClick={handleLinkGoogle}
            disabled={linkingGoogle || hasGoogleProvider}
          >
            {hasGoogleProvider
              ? "Google Already Linked"
              : linkingGoogle
              ? "Redirecting..."
              : "Link Google Account"}
          </Button>

          {!hasPasswordProvider && (
            <form className="auth-form" onSubmit={handleAddPassword} noValidate>
              <Input
                id="linkEmail"
                label="Email for Password Login"
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
                className="btn--secondary"
                disabled={linkingPassword}
              >
                {linkingPassword ? "Saving..." : "Add Password Login"}
              </Button>
            </form>
          )}
        </div>

        {hasPasswordProvider && (
          <>
            <div className="auth-divider">
              <span>Change Password</span>
            </div>

            <form className="auth-form" onSubmit={handleChangePassword} noValidate>
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

              {passwordError && <div className="form-error">{passwordError}</div>}
              {passwordMessage && (
                <div className="form-success">{passwordMessage}</div>
              )}

              <Button
                type="submit"
                className="btn--primary"
                disabled={changingPassword}
              >
                {changingPassword ? "Updating..." : "Change Password"}
              </Button>
            </form>
          </>
        )}

        <div style={{ marginTop: "1rem" }}>
          <Button
            type="button"
            className="btn--secondary"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}