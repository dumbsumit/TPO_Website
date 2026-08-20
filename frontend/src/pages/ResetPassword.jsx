import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";
import { useAppContext } from "../appContext";

const Spinner = () => (
  <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
);

export default function ResetPassword() {
  const { API_URL } = useAppContext();
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  // Token validation state
  const [tokenState, setTokenState] = useState("checking"); // "checking" | "valid" | "invalid"
  const [tokenEmail, setTokenEmail] = useState("");

  // Form state
  const [newPwd, setNewPwd]         = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showNew, setShowNew]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [done, setDone]             = useState(false);

  // Validate the token as soon as the page loads
  useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      return;
    }

    const validate = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/reset/validate?token=${encodeURIComponent(token)}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok && data.valid) {
          setTokenState("valid");
          setTokenEmail(data.email || "");
        } else {
          setTokenState("invalid");
          setError(data.message || "This reset link is invalid or has expired.");
        }
      } catch {
        setTokenState("invalid");
        setError("Could not verify reset link. Please check your connection.");
      }
    };

    validate();
  }, [token, API_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPwd.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset/confirm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: newPwd }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Password reset failed. Please try again.");
        if (data.message?.includes("expired") || data.message?.includes("invalid")) {
          setTokenState("invalid");
        }
        return;
      }

      setDone(true);
      // Redirect to login with success flag after 2 seconds
      setTimeout(() => navigate("/login?reset=success", { replace: true }), 2000);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 40px 10px 14px",
    borderRadius: 8, border: "1px solid var(--border-color)",
    background: "var(--bg-primary)", color: "var(--text-primary)",
    fontSize: 14, boxSizing: "border-box", outline: "none",
  };

  const eyeBtn = {
    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer",
    color: "var(--text-muted)", display: "flex", alignItems: "center", padding: 0,
  };

  // ── Loading / checking ──────────────────────────────────────────
  if (tokenState === "checking") {
    return (
      <div style={{ maxWidth: 420, margin: "48px auto", textAlign: "center", padding: 40 }}>
        <div style={{ width: 36, height: 36, border: "3px solid var(--border-color)", borderTop: "3px solid var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Verifying reset link…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Invalid / expired token ─────────────────────────────────────
  if (tokenState === "invalid") {
    return (
      <div style={{ maxWidth: 420, margin: "48px auto" }}>
        <div className="card" style={{ padding: "40px 36px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⛔</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 12px" }}>
            Invalid Reset Link
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 24 }}>
            {error || "This password reset link is invalid or has expired."}
            <br />Reset links are valid for <strong>15 minutes</strong>.
          </p>
          <Link to="/forgot-password" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 24px", fontSize: 14, textDecoration: "none" }}>
            Request a New Link
          </Link>
          <div style={{ marginTop: 16 }}>
            <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
              <ArrowLeft size={13} /> Back to Sign In
            </Link>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ maxWidth: 420, margin: "48px auto" }}>
        <div className="card" style={{ padding: "40px 36px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 12px" }}>
            Password Reset!
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7 }}>
            Your password has been updated. Redirecting you to the sign-in page…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Reset form ──────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 420, margin: "48px auto" }}>
      <div className="card" style={{ padding: "40px 36px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🔐</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>
            Set New Password
          </h1>
          {tokenEmail && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              For <strong style={{ color: "var(--text-secondary)" }}>{tokenEmail}</strong>
            </p>
          )}
        </div>

        {/* Security note */}
        <div style={{ background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.18)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          🔒 After resetting, all active sessions will be signed out for security.
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 18, fontSize: 13, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* New password */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              <Lock size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
              New Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="reset-new-password"
                type={showNew ? "text" : "password"}
                required
                placeholder="Min. 8 characters"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                style={inputStyle}
              />
              <button type="button" onClick={() => setShowNew(v => !v)} style={eyeBtn} aria-label={showNew ? "Hide password" : "Show password"}>
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              <Lock size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
              Confirm New Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="reset-confirm-password"
                type={showConfirm ? "text" : "password"}
                required
                placeholder="Repeat new password"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                style={inputStyle}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} style={eyeBtn} aria-label={showConfirm ? "Hide password" : "Show password"}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Inline match hint */}
            {confirmPwd && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: newPwd === confirmPwd ? "#4ade80" : "#f87171" }}>
                {newPwd === confirmPwd ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}
          </div>

          <button
            id="reset-submit"
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ marginTop: 4, padding: "11px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {loading ? <Spinner /> : <><ShieldCheck size={16} /> Reset Password</>}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
            <ArrowLeft size={13} /> Back to Sign In
          </Link>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
