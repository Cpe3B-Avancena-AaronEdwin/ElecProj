import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser, signInWithGoogle } from "../firebase/auth";
import Input from "../components/input";
import Button from "../components/button";
import SiteFooter from "../components/SiteFooter";
import "../styles/auth.css";

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }

    if (username.trim().includes("@")) {
      setError("Username cannot contain @.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await registerUser(fullName, username, email, password);
      navigate("/dashboard");
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message || "Sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      navigate("/dashboard");
    } catch (err) {
      console.error("Google signup error:", err);
      setError(err.message || "Google sign-up failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="login-brand">
          <div className="brand-mark" aria-hidden="true">
            <img src="/logo.jpeg" alt="CityBloop Logo" />
          </div>
          <div className="brand-copy">
            <h1 className="brand-name">Create Account</h1>
            <p className="brand-subtitle">
              Set up your CityBloop access in Firebase.
            </p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSignup} noValidate>
          <Input
            id="fullName"
            label="Full Name"
            type="text"
            placeholder="Juan Dela Cruz"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            id="username"
            label="Username"
            type="text"
            placeholder="juan23"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="name@citybloop.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Input
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && (
            <div role="alert" className="form-error">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="btn--primary"
            disabled={loading || googleLoading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </Button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <Button
            type="button"
            className="btn--google"
            onClick={handleGoogleSignup}
            disabled={loading || googleLoading}
          >
            {googleLoading ? "Connecting to Google..." : "Sign Up with Google"}
          </Button>

          <Button
            type="button"
            className="btn--secondary"
            onClick={() => navigate("/login")}
            disabled={loading || googleLoading}
          >
            Back to Login
          </Button>

          <p className="login-hint">
            Usernames are unique and are saved in lowercase. Google signup still
            works, but Google users can set their username later in Profile.
          </p>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}