import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ShieldCheck, RefreshCw } from "lucide-react";

export default function OTPVerify({ onLogin }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const email     = location.state?.email || "";

  const [otp, setOtp]         = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0);  // seconds before resend allowed

  const inputRefs = useRef([]);

  // Redirect to register if no email in state
  useEffect(() => {
    if (!email) navigate("/student-register", { replace: true });
  }, [email, navigate]);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // ── Handle individual OTP digit input ─────────────────────────────────────
  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;        // digits only
    const next = [...otp];
    next[index] = value.slice(-1);           // single digit
    setOtp(next);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/student/verify-otp", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "OTP verification failed");
      onLogin(data.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/student/resend-otp", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to resend OTP");
      setSuccess("A new OTP has been sent to your email.");
      setCooldown(120);  // 2-minute cooldown
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const boxStyle = (filled) => ({
    width: 48, height: 56,
    textAlign: "center",
    fontSize: 24,
    fontWeight: 700,
    borderRadius: 10,
    border: `2px solid ${filled ? "var(--primary)" : "var(--border-color)"}`,
    background: filled ? "rgba(37, 99, 235, 0.08)" : "var(--bg-primary)",
    color: "var(--text-primary)",
    outline: "none",
    transition: "border-color 0.2s, background 0.2s",
  });

  return (
    <div style={{ maxWidth: 420, margin: "60px auto" }}>
      <div className="card" style={{ padding: "40px 36px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>
            Verify Your Email
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
            We sent a 6-digit code to<br />
            <strong style={{ color: "var(--text-secondary)" }}>{email}</strong>
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
            Code expires in <strong>10 minutes</strong>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 20, fontSize: 13, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div style={{ marginBottom: 20, fontSize: 13, padding: "10px 14px", borderRadius: 8, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac" }}>
            ✅ {success}
          </div>
        )}

        {/* OTP Boxes */}
        <form onSubmit={handleVerify}>
          <div
            style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 28 }}
            onPaste={handlePaste}
          >
            {otp.map((digit, i) => (
              <input
                key={i}
                id={`otp-digit-${i}`}
                ref={el => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={boxStyle(!!digit)}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button
            id="otp-verify-btn"
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", padding: "12px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {loading
              ? <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
              : <><ShieldCheck size={16} /> Verify &amp; Sign In</>}
          </button>
        </form>

        {/* Resend */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
            Didn&apos;t receive the code?
          </p>
          <button
            id="otp-resend-btn"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            style={{
              background: "none", border: "none", cursor: cooldown > 0 ? "default" : "pointer",
              color: cooldown > 0 ? "var(--text-muted)" : "var(--primary)",
              fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <RefreshCw size={13} />
            {resending
              ? "Sending..."
              : cooldown > 0
              ? `Resend OTP in ${cooldown}s`
              : "Resend OTP"}
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--text-muted)" }}>
          Wrong email?{" "}
          <Link to="/student-register" style={{ color: "var(--primary)", textDecoration: "none" }}>
            Go back to Register
          </Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
