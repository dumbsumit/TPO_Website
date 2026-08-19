import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { Shield, LogOut, CheckCircle, AlertTriangle, Info, Menu, X, User } from "lucide-react";
import { initGoogleAuth } from "./googleAuth";

// ── Pages ──────────────────────────────────────────────────────────────────────
import Home             from "./pages/Home";
import Companies        from "./pages/Companies";
import CompanyDetails   from "./pages/CompanyDetails";
import Statistics       from "./pages/Statistics";
import Experiences      from "./pages/Experiences";
import SubmitExperience from "./pages/SubmitExperience";
import AdminLogin       from "./pages/AdminLogin";
import AdminDashboard   from "./pages/AdminDashboard";
import StudentLogin     from "./pages/StudentLogin";
import StudentRegister  from "./pages/StudentRegister";
import OTPVerify        from "./pages/OTPVerify";
import AdminProfile     from "./pages/AdminProfile";
import StudentProfile   from "./pages/StudentProfile";
import { AppContext }   from "./appContext";

const API_URL = "/api";

export default function App() {
  // ── Auth state ─────────────────────────────────────────────────────────────
  const [adminUser,   setAdminUser]   = useState(null);  // { name, email, role }
  const [studentUser, setStudentUser] = useState(null);  // { name, email, role, isVerified, … }
  const [sessionLoading, setSessionLoading] = useState(true);

  const [toast,          setToast]          = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Restore sessions from httpOnly cookies on mount ────────────────────────
  useEffect(() => {
    const restoreSessions = async () => {
      // Init Google GSI once — before any auth page tries to render a button
      if (window.google?.accounts?.id) {
        initGoogleAuth();
      } else {
        const script = document.querySelector("script[src*='accounts.google.com/gsi/client']");
        script?.addEventListener("load", initGoogleAuth, { once: true });
      }

      try {
        const adminRes = await fetch(`${API_URL}/auth/admin/me`, { credentials: "include" });
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          setAdminUser(adminData);
          setSessionLoading(false);
          return;
        }
      } catch { /* ignore */ }

      try {
        const studentRes = await fetch(`${API_URL}/auth/student/me`, { credentials: "include" });
        if (studentRes.ok) {
          const studentData = await studentRes.json();
          setStudentUser(studentData);
        }
      } catch { /* ignore */ }

      setSessionLoading(false);
    };
    restoreSessions();
  }, []);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Admin auth ────────────────────────────────────────────────────────────
  const loginAdmin = (user) => {
    setAdminUser(user);
    showToast(`Welcome back, ${user.name || user.email}!`, "success");
  };

  const logoutAdmin = async () => {
    try {
      await fetch(`${API_URL}/auth/admin/logout`, {
        method: "POST", credentials: "include",
      });
    } catch { /* ignore */ }
    setAdminUser(null);
    showToast("Logged out successfully", "info");
  };

  // ── Student auth ──────────────────────────────────────────────────────────
  const loginStudent = (user) => {
    setStudentUser(user);
    showToast(`Welcome, ${user.name}!`, "success");
  };

  const logoutStudent = async () => {
    try {
      await fetch(`${API_URL}/auth/student/logout`, {
        method: "POST", credentials: "include",
      });
    } catch { /* ignore */ }
    setStudentUser(null);
    showToast("Logged out successfully", "info");
  };

  // ── Protected Route wrappers ──────────────────────────────────────────────
  const AdminRoute = ({ children }) => {
    if (sessionLoading) return null;
    return adminUser ? children : <Navigate to="/admin-login" replace />;
  };

  // Logged-in student only — guests redirected to home
  const StudentRoute = ({ children }) => {
    if (sessionLoading) return null;
    return studentUser ? children : <Navigate to="/" replace />;
  };

  // ── Context value ──────────────────────────────────────────────────────────
  const updateAdminUser  = (u) => setAdminUser(u);
  const updateStudentUser = (u) => setStudentUser(u);

  const ctx = {
    adminUser, studentUser, API_URL,
    showToast,
    loginAdmin, logoutAdmin,
    loginStudent, logoutStudent,
    updateAdminUser, updateStudentUser,
  };

  if (sessionLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg-primary)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid var(--border-color)", borderTop: "3px solid var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading session…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AppContext.Provider value={ctx}>
      <Router>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>

          {/* Top Contact Bar */}
          <div className="top-bar">
            <div className="container top-bar-container">
              <div className="top-bar-left">
                <span className="top-bar-item">📞 +91 233 2300383</span>
                <span className="top-bar-item">✉ info@walchandsangli.ac.in</span>
              </div>
              <div className="top-bar-right">
                <span>Online Services</span><span>•</span><span>Communication</span>
              </div>
            </div>
          </div>

          {/* Navbar */}
          <nav className="navbar">
            <div className="container nav-container">
              <Link to="/" className="nav-logo-block" onClick={() => setMobileMenuOpen(false)}>
                <img src="/wce_crest_logo.png" alt="WCE Crest Logo" style={{ width: 46, height: 46, objectFit: "contain" }} />
                <div className="nav-logo-text">
                  <div className="nav-logo-title">Walchand College of Engineering</div>
                  <div className="nav-logo-subtitle">(Government-Aided Autonomous Institute)</div>
                </div>
              </Link>

              <ul className={`nav-links ${mobileMenuOpen ? "mobile-open" : ""}`}>
                <li><NavLink to="/">Home</NavLink></li>
                <li><NavLink to="/companies">Companies</NavLink></li>

                {/* Statistics — admin only */}
                {adminUser && (
                  <li><NavLink to="/statistics">Statistics</NavLink></li>
                )}

                <li><NavLink to="/experiences">Experiences</NavLink></li>

                {/* Share experience — logged-in students only */}
                {studentUser && (
                  <li><NavLink to="/submit-experience">Share Experience</NavLink></li>
                )}

                {/* ── Admin controls ── */}
                {adminUser ? (
                  <>
                    <li>
                      <span className="nav-link" style={{ display: "flex", alignItems: "center", cursor: "default", opacity: 0.85 }}>
                        <Shield size={14} style={{ marginRight: 6 }} /> {adminUser.name?.split(" ")[0] || "Admin"}
                      </span>
                    </li>
                    <li>
                      <Link to="/admin-dashboard" className="nav-link btn-admin" onClick={() => setMobileMenuOpen(false)}>
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link to="/admin-profile" className="nav-link" onClick={() => setMobileMenuOpen(false)}
                        style={{ display: "flex", alignItems: "center" }}>
                        <User size={14} style={{ marginRight: 6 }} /> Profile
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={() => { logoutAdmin(); setMobileMenuOpen(false); }}
                        className="nav-link"
                        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                      >
                        <LogOut size={14} style={{ marginRight: 6 }} /> Logout
                      </button>
                    </li>
                  </>
                ) : studentUser ? (
                  /* ── Student controls ── */
                  <>
                    <li>
                      <Link to="/student-profile" className="nav-link" onClick={() => setMobileMenuOpen(false)}
                        style={{ display: "flex", alignItems: "center" }}>
                        <User size={14} style={{ marginRight: 6 }} /> {studentUser.name?.split(" ")[0]}
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={() => { logoutStudent(); setMobileMenuOpen(false); }}
                        className="nav-link"
                        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                      >
                        <LogOut size={14} style={{ marginRight: 6 }} /> Logout
                      </button>
                    </li>
                  </>
                ) : (
                  /* ── Guest controls ── */
                  <>
                    <li>
                      <Link to="/student-login" className="nav-link" onClick={() => setMobileMenuOpen(false)}
                        style={{ display: "flex", alignItems: "center" }}>
                        <User size={14} style={{ marginRight: 6 }} /> Student
                      </Link>
                    </li>
                    <li>
                      <Link to="/admin-login" className="nav-link btn-admin" onClick={() => setMobileMenuOpen(false)}>
                        <Shield size={14} style={{ marginRight: 6 }} /> Admin
                      </Link>
                    </li>
                  </>
                )}
              </ul>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="mobile-toggle"
                style={{ background: "none", border: "none", color: "#f8fafc", cursor: "pointer", display: "none" }}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </nav>

          {/* Main Content */}
          <main style={{ flex: 1, padding: "40px 0 60px" }}>
            <div className="container animate-fade-in">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/companies" element={<Companies />} />
                <Route path="/companies/:id" element={<CompanyDetails />} />
                <Route path="/experiences" element={<Experiences />} />
                <Route path="/submit-experience" element={<StudentRoute><SubmitExperience /></StudentRoute>} />

                {/* ── Admin routes ── */}
                <Route path="/admin-login" element={<AdminLogin onLogin={loginAdmin} />} />
                <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin-profile"   element={<AdminRoute><AdminProfile /></AdminRoute>} />
                <Route path="/statistics"      element={<AdminRoute><Statistics /></AdminRoute>} />

                {/* ── Student routes ── */}
                <Route path="/student-login"    element={<StudentLogin    onLogin={loginStudent} />} />
                <Route path="/student-register" element={<StudentRegister onLogin={loginStudent} />} />
                <Route path="/verify-otp"       element={<OTPVerify       onLogin={loginStudent} />} />
                <Route path="/student-profile"  element={<StudentProfile />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>

          {/* Footer */}
          <footer style={{ borderTop: "1px solid var(--border-color)", padding: "24px 0", backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: "14px", textAlign: "center" }}>
            <div className="container">
              <p>&copy; {new Date().getFullYear()} College Placement Cell &amp; Activity Portal. All rights reserved.</p>
              <p style={{ marginTop: 6, fontSize: "12px", color: "var(--text-muted)" }}>
                Built with MongoDB, Express, React, and Node.js. Developed for quick access and live metrics.
              </p>
            </div>
          </footer>

          {/* Toast */}
          {toast && (
            <div className={`toast ${toast.type}`}>
              {toast.type === "success" && <CheckCircle size={18} />}
              {toast.type === "error"   && <AlertTriangle size={18} />}
              {toast.type === "info"    && <Info size={18} />}
              <span>{toast.message}</span>
            </div>
          )}
        </div>
      </Router>

      <style>{`
        @media (max-width: 768px) {
          .mobile-toggle { display: block !important; }
          .nav-links {
            display: none !important;
            flex-direction: column;
            position: absolute;
            top: 70px; left: 0; right: 0;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border-color);
            padding: 20px; gap: 12px;
            box-shadow: 0 10px 15px rgba(0,0,0,0.4);
          }
          .nav-links.mobile-open { display: flex !important; }
          .nav-links li { width: 100%; }
          .nav-link { display: block; width: 100%; padding: 12px 16px; }
          .nav-link.active { border-bottom: none; border-left: 2px solid var(--primary); padding-left: 14px; }
        }
        .animate-fade-in { animation: pageFadeIn 0.3s ease-out; }
        @keyframes pageFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AppContext.Provider>
  );
}

function NavLink({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`nav-link ${isActive ? "active" : ""}`}>{children}</Link>
  );
}
