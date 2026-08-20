import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { User, Mail, BookOpen, GraduationCap, Lock, Save, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useAppContext } from "../appContext";

const BRANCHES = ["Computer Science", "Information Technology", "Electronics", "Electrical", "Mechanical", "Civil", "Production", "Chemical", "Other"];
const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS   = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + i);

export default function StudentProfile() {
  const { studentUser, API_URL, showToast, updateStudentUser, loginStudent } = useAppContext();
  const navigate = useNavigate();

  const [name, setName]               = useState(studentUser?.name || "");
  const [branch, setBranch]           = useState(studentUser?.branch || "");
  const [gradYear, setGradYear]       = useState(studentUser?.graduationYear || "");
  const [currentPwd, setCurrentPwd]   = useState("");
  const [newPwd, setNewPwd]           = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [activeTab, setActiveTab]     = useState("info");

  // Redirect to login if not logged in
  if (!studentUser) return <Navigate to="/student-login" replace />;

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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) return showToast("Passwords do not match", "error");
    if (newPwd.length < 8)     return showToast("Password must be at least 8 characters", "error");
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/student/me`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      showToast("Password changed successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to change password", "error");
    } finally {
      setSaving(false);
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
          <button key={key} onClick={() => setActiveTab(key)}
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
        <form onSubmit={handleChangePassword} style={{ background: "var(--bg-secondary)", borderRadius: 14, padding: 28, border: "1px solid var(--border-color)" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Change Password</h3>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-muted)" }}>
            {studentUser.googleId && !studentUser.password ? "Your account uses Google Sign-In — password change is not available." : "Use a strong password with at least 8 characters."}
          </p>

          {[
            ["Current Password", currentPwd, setCurrentPwd, showCurrent, setShowCurrent],
            ["New Password",     newPwd,     setNewPwd,     showNew,     setShowNew],
            ["Confirm New Password", confirmPwd, setConfirmPwd, showConfirm, setShowConfirm],
          ].map(([label, val, setter, show, setShow]) => (
            <div key={label} style={{ marginBottom: 18 }}>
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{label}</label>
              <div style={{ position: "relative" }}>
                <input type={show ? "text" : "password"} value={val} onChange={e => setter(e.target.value)} placeholder={label}
                  style={{ width: "100%", padding: "10px 40px 10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box" }} />
                <button type="button" onClick={() => setShow(!show)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}

          <button type="submit" disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontWeight: 600, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            <Lock size={16} /> {saving ? "Updating…" : "Update Password"}
          </button>
        </form>
      )}
    </div>
  );
}
