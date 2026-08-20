import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Send, RefreshCw } from "lucide-react";
import { useAppContext } from "../appContext";

const ALLOWED_DOMAIN = "walchandsangli.ac.in";

const Spinner = () => (
  <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
);

export default function ForgotPassword() {
  const { API_URL } = useAppContext();

  const [email, setEmail]     = useState("");
  const [step, setStep]       = useState("form");   // "form" | "sent"
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
      setError(`Only @${ALLOWED_DOMAIN} email addresses are accepted`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Surface real errors (rate-limit, Google-only account etc.)
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }

      setStep("sent");
      setCooldown(120);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }
      setCooldown(120);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px 10px 38px",
    borderRadius: 8, border: "1px solid var(--border-color)",
    background: "var(--bg-primary)", color: "var(--text-primary)",
    fontSize: 14, boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{ maxWidth: 420, margin: "48px auto" }}>
      <div className="card" style={{ padding: "40px 36px" }}>

        {step === "form" && (
          <>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 38, marginBottom: 10 }}>🔑</div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>
                Forgot Password?
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                Enter your college email and we'll send a secure reset link.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ marginBottom: 18, fontSize: 13, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                ⚠️ {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ position: "relative" }}>
                <Mail size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  placeholder={`yourname@${ALLOWED_DOMAIN}`}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <button
                id="forgot-submit"
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: "11px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {loading ? <Spinner /> : <><Send size={16} /> Send Reset Link</>}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
                <ArrowLeft size={13} /> Back to Sign In
              </Link>
            </div>
          </>
        )}

        {step === "sent" && (
          <>
            {/* Success screen */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 12px" }}>
                Check Your Inbox
              </h1>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 8px" }}>
                We sent a password reset link to
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 20 }}>
                {email}
              </p>
              <div style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 10, padding: "14px 16px", marginBottom: 24, fontSize: 13, color: "var(--text-secondary)", textAlign: "left", lineHeight: 1.6 }}>
                <strong>Tip:</strong> The link expires in <strong>15 minutes</strong>. Check your spam folder if you don't see it within a few minutes.
              </div>

              {/* Error */}
              {error && (
                <div style={{ marginBottom: 16, fontSize: 13, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Resend */}
              <button
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: cooldown > 0 ? "default" : "pointer", color: cooldown > 0 ? "var(--text-muted)" : "var(--primary)", fontWeight: 600, fontSize: 13, marginBottom: 20 }}
              >
                <RefreshCw size={13} />
                {loading ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Reset Link"}
              </button>

              <div>
                <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
                  <ArrowLeft size={13} /> Back to Sign In
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
