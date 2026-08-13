import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, User, Mail, Lock, Save, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { useAppContext } from "../appContext";

export default function AdminProfile() {
  const { adminUser, API_URL, showToast, updateAdminUser } = useAppContext();
  const navigate = useNavigate();

  const [name, setName]               = useState(adminUser?.name || "");
  const [currentPwd, setCurrentPwd]   = useState("");
  const [newPwd, setNewPwd]           = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [activeTab, setActiveTab]     = useState("info"); // "info" | "password"

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!name.trim()) return showToast("Name cannot be empty", "error");
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/admin/me`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      updateAdminUser(data.user);
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
    if (newPwd.length < 8)      return showToast("Password must be at least 8 characters", "error");
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/admin/me`, {
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

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: 8, padding: "6px 12px", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>Admin Profile</h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>Manage your account details</p>
        </div>
      </div>

      {/* Avatar Card */}
      <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", borderRadius: 16, padding: "28px 32px", display: "flex", alignItems: "center", gap: 24, marginBottom: 28 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "3px solid rgba(255,255,255,0.4)" }}>
          <Shield size={34} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{adminUser?.name}</div>
          <div style={{ fontSize: 14, color: "#bfdbfe", marginTop: 4 }}>{adminUser?.email}</div>
          <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "#e0f2fe" }}>
            <CheckCircle size={12} /> TPO Administrator
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
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Account Information</h3>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
              <User size={13} style={{ marginRight: 6, verticalAlign: "middle" }} /> Display Name
            </label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
              <Mail size={13} style={{ marginRight: 6, verticalAlign: "middle" }} /> Email Address
            </label>
            <input value={adminUser?.email || ""} readOnly
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14, boxSizing: "border-box", cursor: "not-allowed", opacity: 0.7 }} />
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Email cannot be changed.</p>
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
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Change Password</h3>

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
