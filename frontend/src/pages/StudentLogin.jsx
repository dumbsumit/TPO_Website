import React, { useState, useEffect, useId } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, Mail, Lock, UserPlus } from "lucide-react";
import { subscribeGoogleCallback, renderGoogleButton, isGoogleConfigured } from "../googleAuth";

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const ALLOWED_DOMAIN = "walchandsangli.ac.in";

export default function StudentLogin({ onLogin }) {
  const navigate    = useNavigate();
  const googleBtnId = "student-login-google-btn-" + useId().replace(/:/g, "");

  const [form, setForm]       = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // ── Subscribe to shared GSI callback ─────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeGoogleCallback(handleGoogleResponse);
    renderGoogleButton(googleBtnId, "signin_with");
    return unsub;
  }, [googleBtnId]);

  // ── Google callback ───────────────────────────────────────────────────────
  const handleGoogleResponse = async (response) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/student/google", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ token: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Google sign-in failed");
      onLogin(data.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Email/Password submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
      setError(`Only @${ALLOWED_DOMAIN} email addresses are allowed`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/student/login", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresVerification) {
          navigate("/verify-otp", { state: { email: data.email } });
          return;
        }
        throw new Error(data.message || "Login failed");
      }

      onLogin(data.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "60px auto" }}>
      <div className="card" style={{ padding: "40px 36px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>
            Student Login
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Use your <strong>@{ALLOWED_DOMAIN}</strong> college email
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 20, fontSize: 13, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              <Mail size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />Email
            </label>
            <input
              id="student-login-email"
              type="email"
              required
              placeholder={`yourname@${ALLOWED_DOMAIN}`}
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              <Lock size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />Password
            </label>
            <input
              id="student-login-password"
              type="password"
              required
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <button
            id="student-login-submit"
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ marginTop: 4, padding: "11px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {loading ? <Spinner /> : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>

        {/* Divider */}
        <Divider />

        {/* Google Sign-In */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          {isGoogleConfigured() ? (
            <div id={googleBtnId} />
          ) : (
            <DisabledGoogleBtn label="Google Sign-In (configure VITE_GOOGLE_CLIENT_ID)" />
          )}
        </div>

        {/* Register + Admin links */}
        <div style={{ textAlign: "center", marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Don&apos;t have an account?{" "}
            <Link to="/student-register" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>
              <UserPlus size={13} style={{ marginRight: 3, verticalAlign: "middle" }} />Register
            </Link>
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            TPO Staff?{" "}
            <Link to="/admin-login" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
              Admin Login →
            </Link>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const Spinner = () => (
  <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
);

const Divider = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0", color: "var(--text-muted)", fontSize: 12 }}>
    <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
    <span>or continue with</span>
    <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
  </div>
);

const DisabledGoogleBtn = ({ label }) => (
  <button disabled style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-muted)", fontSize: 13, cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
    <GoogleIcon /> {label}
  </button>
);
