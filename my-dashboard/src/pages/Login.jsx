import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loginUser, signInWithGoogle } from "../firebase/auth";
import Input from "../components/input";
import Button from "../components/button";
import SiteFooter from "../components/SiteFooter";
import "../styles/auth.css";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") || "");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const urlError = searchParams.get("error") || "";
    if (urlError) {
      setError(urlError);
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginUser(identifier, password);
  window.location.assign("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError("");
    setGoogleLoading(true);
    signInWithGoogle();
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="login-brand">
          <div className="brand-mark" aria-hidden="true">
            <img src="/logo.jpeg" alt="CityBloop Logo" />
          </div>
          <div className="brand-copy">
            <h1 className="brand-name">CityBloop</h1>
            <p className="brand-subtitle">
              Smart Public Transportation Analytics
            </p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleLogin} noValidate>
          <Input
            id="identifier"
            label="Email or Username"
            type="text"
            placeholder="mail@email.com or MyUsername"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />

          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <Button
            type="button"
            className="btn--google"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                width: "100%",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  fill="#FFC107"
                  d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.3 14.7l6.6 4.8C14.7 15.3 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.4 5.5-6.5 6.9l6.2 5.2C38.6 36.8 44 31 44 24c0-1.3-.1-2.4-.4-3.5z"
                />
              </svg>

              {googleLoading
                ? "Connecting to Google..."
                : "Continue with Google"}
            </span>
          </Button>

          <Button
            type="button"
            className="btn--secondary"
            onClick={() => navigate("/signup")}
            disabled={loading || googleLoading}
          >
            Sign Up
          </Button>

          <p className="login-hint">
            Sign in using your email or username. Google login is handled by the backend.
          </p>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}