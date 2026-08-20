import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  User, Mail, BookOpen, GraduationCap, Lock, Save,
  Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle,
  KeyRound, Send, RefreshCw,
} from "lucide-react";
import { useAppContext } from "../appContext";

const BRANCHES = ["Computer Science", "Information Technology", "Electronics", "Electrical", "Mechanical", "Civil", "Production", "Chemical", "Other"];
const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS   = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + i);

export default function StudentProfile() {
  const { studentUser, API_URL, showToast, updateStudentUser, loginStudent } = useAppContext();
  const navigate = useNavigate();

  // Redirect to login if not logged in
  if (!studentUser) return <Navigate to="/student-login" replace />;

  // ── Account info state ────────────────────────────────────────────────────
  const [name, setName]       = useState(studentUser.name || "");
  const [branch, setBranch]   = useState(studentUser.branch || "");
  const [gradYear, setGradYear] = useState(studentUser.graduationYear || "");
  const [saving, setSaving]   = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  // ── Password change state ─────────────────────────────────────────────────
  const [newPwd, setNewPwd]         = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showNew, setShowNew]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // OTP flow: "form" → "otp"
  const [pwdStep, setPwdStep]       = useState("form");
  const [otp, setOtp]               = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpSubmitting, setOtpSubmitting] = useState(false);

  // Countdown timer
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);


  const startCountdown = (seconds = 120) => {
    setCountdown(seconds);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(countdownRef.current), []);

  const fmtCountdown = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Save account info ─────────────────────────────────────────────────────
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!name.trim()) return showToast("Name cannot be empty", "error");
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/student/me`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, branch, graduationYear: gradYear ? Number(gradYear) : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (updateStudentUser) updateStudentUser(data.user);
      else if (loginStudent) loginStudent(data.user);
      showToast("Profile updated successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Step 1: Request OTP ───────────────────────────────────────────────────
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!newPwd || !confirmPwd) return showToast("Please fill in both password fields", "error");
    if (newPwd !== confirmPwd)  return showToast("Passwords do not match", "error");
    if (newPwd.length < 8)      return showToast("Password must be at least 8 characters", "error");

    setOtpSending(true);
    try {
      const res = await fetch(`${API_URL}/auth/student/request-password-otp`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPwdStep("otp");
      startCountdown(120);
      showToast("OTP sent to your email!", "success");
    } catch (err) {
      showToast(err.message || "Failed to send OTP", "error");
    } finally {
      setOtpSending(false);
    }
  };

  // ── Step 2: Verify OTP + update password ─────────────────────────────────
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return showToast("Please enter the OTP", "error");
    setOtpSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/auth/student/me`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otp.trim(), newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setNewPwd(""); setConfirmPwd(""); setOtp("");
      setPwdStep("form");
      clearInterval(countdownRef.current);
      setCountdown(0);
      showToast("Password changed successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to change password", "error");
    } finally {
      setOtpSubmitting(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setOtpSending(true);
    try {
      const res = await fetch(`${API_URL}/auth/student/request-password-otp`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      startCountdown(120);
      setOtp("");
      showToast("New OTP sent to your email!", "success");
    } catch (err) {
      showToast(err.message || "Failed to resend OTP", "error");
    } finally {
      setOtpSending(false);
    }
  };

  // Avatar initials
  const initials = (studentUser.name || "S").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: 8, padding: "6px 12px", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>My Profile</h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>Manage your account information</p>
        </div>
      </div>

      {/* Avatar Card */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)", borderRadius: 16, padding: "28px 32px", display: "flex", alignItems: "center", gap: 24, marginBottom: 28 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "3px solid rgba(255,255,255,0.4)", fontSize: 26, fontWeight: 700, color: "#fff" }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{studentUser.name}</div>
          <div style={{ fontSize: 14, color: "#bfdbfe", marginTop: 4 }}>{studentUser.email}</div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {studentUser.isVerified ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)", borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "#86efac" }}>
                <CheckCircle size={12} /> Verified
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "#fca5a5" }}>
                <AlertCircle size={12} /> Unverified
              </span>
            )}
            {studentUser.branch && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "#e0f2fe" }}>
                <BookOpen size={12} /> {studentUser.branch}
              </span>
            )}
            {studentUser.graduationYear && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "#e0f2fe" }}>
                <GraduationCap size={12} /> Class of {studentUser.graduationYear}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, background: "var(--bg-secondary)", borderRadius: 10, padding: 4, border: "1px solid var(--border-color)" }}>
        {[["info", User, "Account Info"], ["password", Lock, "Change Password"]].map(([key, Icon, label]) => (
          <button key={key} onClick={() => { setActiveTab(key); setPwdStep("form"); setOtp(""); }}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, transition: "all 0.2s",
              background: activeTab === key ? "var(--primary)" : "transparent",
              color: activeTab === key ? "#fff" : "var(--text-secondary)" }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {activeTab === "info" && (
        <form onSubmit={handleSaveInfo} style={{ background: "var(--bg-secondary)", borderRadius: 14, padding: 28, border: "1px solid var(--border-color)" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Personal Information</h3>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
              <User size={13} style={{ marginRight: 6, verticalAlign: "middle" }} /> Full Name
            </label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
              <Mail size={13} style={{ marginRight: 6, verticalAlign: "middle" }} /> Email Address
            </label>
            <input value={studentUser.email || ""} readOnly
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14, boxSizing: "border-box", cursor: "not-allowed", opacity: 0.7 }} />
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Email cannot be changed.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                <BookOpen size={13} style={{ marginRight: 6, verticalAlign: "middle" }} /> Branch
              </label>
              <select value={branch} onChange={e => setBranch(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box" }}>
                <option value="">-- Select Branch --</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                <GraduationCap size={13} style={{ marginRight: 6, verticalAlign: "middle" }} /> Graduation Year
              </label>
              <select value={gradYear} onChange={e => setGradYear(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box" }}>
                <option value="">-- Select Year --</option>
                {GRAD_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            <Save size={16} /> {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      )}

      {/* Password Tab */}
      {activeTab === "password" && (
        <div style={{ background: "var(--bg-secondary)", borderRadius: 14, padding: 28, border: "1px solid var(--border-color)" }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Change Password</h3>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-muted)" }}>
            An OTP will be sent to your registered email address to confirm the change.
          </p>

          <>
              {/* ── Step 1: Enter new passwords ───────────────────────── */}
              {pwdStep === "form" && (
                <form onSubmit={handleRequestOTP}>
                  {/* New Password */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>New Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showNew ? "text" : "password"}
                        value={newPwd}
                        onChange={e => setNewPwd(e.target.value)}
                        placeholder="New Password"
                        style={{ width: "100%", padding: "10px 40px 10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box" }}
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Confirm New Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPwd}
                        onChange={e => setConfirmPwd(e.target.value)}
                        placeholder="Confirm New Password"
                        style={{ width: "100%", padding: "10px 40px 10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box" }}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={otpSending}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: 14, cursor: otpSending ? "not-allowed" : "pointer", opacity: otpSending ? 0.7 : 1 }}>
                    <Send size={16} /> {otpSending ? "Sending OTP…" : "Send OTP to Email"}
                  </button>
                </form>
              )}

              {/* ── Step 2: Enter OTP ──────────────────────────────────── */}
              {pwdStep === "otp" && (
                <form onSubmit={handleVerifyOTP}>
                  {/* Info box */}
                  <div style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.3)", borderRadius: 10, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <KeyRound size={18} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>OTP Sent!</p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                        A 6-digit code was sent to <strong>{studentUser.email}</strong>. Enter it below to confirm your password change.
                      </p>
                    </div>
                  </div>

                  {/* OTP input */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                      Enter OTP
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      autoFocus
                      style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "2px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 22, fontWeight: 700, letterSpacing: 10, textAlign: "center", boxSizing: "border-box", transition: "border-color 0.2s" }}
                    />
                  </div>

                  {/* Timer + Resend */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {countdown > 0
                        ? <>Code expires in <strong style={{ color: "var(--primary)" }}>{fmtCountdown(countdown)}</strong></>
                        : <span style={{ color: "#ef4444" }}>OTP may have expired</span>
                      }
                    </span>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={countdown > 0 || otpSending}
                      style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", fontSize: 13, color: countdown > 0 ? "var(--text-muted)" : "var(--primary)", cursor: countdown > 0 ? "not-allowed" : "pointer", fontWeight: 600 }}
                    >
                      <RefreshCw size={13} /> Resend OTP
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    <button type="button" onClick={() => { setPwdStep("form"); setOtp(""); clearInterval(countdownRef.current); setCountdown(0); }}
                      style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-secondary)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                      ← Back
                    </button>
                    <button type="submit" disabled={otpSubmitting || otp.length !== 6}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 24px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontWeight: 600, fontSize: 14, cursor: (otpSubmitting || otp.length !== 6) ? "not-allowed" : "pointer", opacity: (otpSubmitting || otp.length !== 6) ? 0.7 : 1 }}>
                      <Lock size={16} /> {otpSubmitting ? "Updating Password…" : "Confirm Password Change"}
                    </button>
                  </div>
                </form>
              )}
            </>
        </div>
      )}
    </div>
  );
}
