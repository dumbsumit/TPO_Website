import React, { useState, useEffect, useId } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, Mail, Lock, User, BookOpen, Calendar } from "lucide-react";
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

const BRANCHES = [
  "Civil Engineering", "Computer Engineering", "Electronics Engineering",
  "Electrical Engineering", "Mechanical Engineering",
  "Production Engineering", "Information Technology",
];

export default function StudentRegister({ onLogin }) {
  const navigate    = useNavigate();
  const googleBtnId = "student-register-google-btn-" + useId().replace(/:/g, "");

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear + i);

  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    branch: "", graduationYear: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  // ── Subscribe to shared GSI callback ─────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeGoogleCallback(handleGoogleResponse);
    renderGoogleButton(googleBtnId, "signup_with");
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
      if (!res.ok) throw new Error(data.message || "Google sign-up failed");
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
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/student/register", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name:           form.name,
          email:          form.email,
          password:       form.password,
          branch:         form.branch,
          graduationYear: form.graduationYear ? Number(form.graduationYear) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      navigate("/verify-otp", { state: { email: form.email } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "1px solid var(--border-color)", background: "var(--bg-primary)",
    color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block", fontSize: 13, fontWeight: 600,
    color: "var(--text-secondary)", marginBottom: 6,
  };

  return (
    <div style={{ maxWidth: 480, margin: "40px auto" }}>
      <div className="card" style={{ padding: "40px 36px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>
            Student Registration
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Only <strong>@{ALLOWED_DOMAIN}</strong> email addresses are accepted
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 20, fontSize: 13, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Google Sign-Up */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          {isGoogleConfigured() ? (
            <div id={googleBtnId} />
          ) : (
            <button disabled style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-muted)", fontSize: 13, cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <GoogleIcon /> Sign up with Google (configure VITE_GOOGLE_CLIENT_ID)
            </button>
          )}
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, color: "var(--text-muted)", fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
          <span>or register with email</span>
          <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}><User size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />Full Name</label>
            <input id="reg-name" type="text" required placeholder="Your full name" value={form.name} onChange={set("name")} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}><Mail size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />College Email</label>
            <input id="reg-email" type="email" required placeholder={`yourname@${ALLOWED_DOMAIN}`} value={form.email} onChange={set("email")} style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}><BookOpen size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />Branch</label>
              <select id="reg-branch" value={form.branch} onChange={set("branch")} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Select branch</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}><Calendar size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />Grad. Year</label>
              <select id="reg-year" value={form.graduationYear} onChange={set("graduationYear")} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Select year</option>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}><Lock size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />Password</label>
            <input id="reg-password" type="password" required placeholder="Min. 8 characters" value={form.password} onChange={set("password")} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}><Lock size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />Confirm Password</label>
            <input id="reg-confirm-password" type="password" required placeholder="Repeat password" value={form.confirmPassword} onChange={set("confirmPassword")} style={inputStyle} />
          </div>

          <button
            id="reg-submit"
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ marginTop: 4, padding: "11px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {loading
              ? <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
              : <><UserPlus size={16} /> Create Account &amp; Send OTP</>}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link to="/student-login" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
