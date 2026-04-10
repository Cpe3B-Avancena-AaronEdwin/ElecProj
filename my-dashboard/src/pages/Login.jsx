import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../firebase/auth";
import Input from "../components/input";
import Button from "../components/button";
import "../styles/auth.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginUser(email, password);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="login-brand">
          <div className="brand-mark" aria-hidden="true">
            🚍
          </div>
          <div className="brand-copy">
            <h1 className="brand-name">MoveMint</h1>
            <p className="brand-subtitle">Smart Public Transportation Analytics</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleLogin} noValidate>
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="operator@movemint.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

          {error && <div role="alert" className="form-error">{error}</div>}

          <Button type="submit" className="btn--primary" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <p className="login-hint">Demo: Use any email and password to sign in</p>
        </form>
      </div>
    </div>
  );
}
