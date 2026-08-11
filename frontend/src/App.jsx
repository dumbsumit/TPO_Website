import React, { useState } from "react";
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { Shield, LogOut, CheckCircle, AlertTriangle, Info, Menu, X } from "lucide-react";

// Import Pages
import Home from "./pages/Home";
import Companies from "./pages/Companies";
import CompanyDetails from "./pages/CompanyDetails";
import Statistics from "./pages/Statistics";
import Experiences from "./pages/Experiences";
import SubmitExperience from "./pages/SubmitExperience";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { AppContext } from "./appContext";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("tpo_admin_token") || "");
  const [adminUser, setAdminUser] = useState(localStorage.getItem("tpo_admin_user") || "");
  const [toast, setToast] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Set default API URL
  const API_URL = "http://localhost:5001/api";

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const loginAdmin = (newToken, username) => {
    localStorage.setItem("tpo_admin_token", newToken);
    localStorage.setItem("tpo_admin_user", username);
    setToken(newToken);
    setAdminUser(username);
    showToast(`Logged in successfully as ${username}`, "success");
  };

  const logoutAdmin = () => {
    localStorage.removeItem("tpo_admin_token");
    localStorage.removeItem("tpo_admin_user");
    setToken("");
    setAdminUser("");
    showToast("Logged out successfully", "info");
  };

  // Protected Route component
  const ProtectedRoute = ({ children }) => {
    if (!token) {
      return <Navigate to="/admin-login" replace />;
    }
    return children;
  };

  return (
    <AppContext.Provider value={{ token, adminUser, API_URL, showToast, loginAdmin, logoutAdmin }}>
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
                <span>Online Services</span>
                <span>•</span>
                <span>Communication</span>
              </div>
            </div>
          </div>

          {/* Header & Navbar */}
          <nav className="navbar">
            <div className="container nav-container">
              <Link to="/" className="nav-logo-block" onClick={() => setMobileMenuOpen(false)}>
                <img 
                  src="/wce_crest_logo.png" 
                  alt="WCE Crest Logo" 
                  style={{ width: 46, height: 46, objectFit: "contain" }} 
                />
                <div className="nav-logo-text">
                  <div className="nav-logo-title">Walchand College of Engineering</div>
                  <div className="nav-logo-subtitle">(Government-Aided Autonomous Institute)</div>
                </div>
              </Link>

              {/* Navigation links */}
              <ul className={`nav-links ${mobileMenuOpen ? "mobile-open" : ""}`}>
                <li>
                  <NavLink to="/">Home</NavLink>
                </li>
                <li>
                  <NavLink to="/companies">Companies</NavLink>
                </li>
                {token && (
                  <li>
                    <NavLink to="/statistics">Statistics</NavLink>
                  </li>
                )}
                <li>
                  <NavLink to="/experiences">Experiences</NavLink>
                </li>
                {!token && (
                  <li>
                    <NavLink to="/submit-experience">Share Experience</NavLink>
                  </li>
                )}
                {token ? (
                  <>
                    <li>
                      <Link to="/admin-dashboard" className="nav-link btn-admin" onClick={() => setMobileMenuOpen(false)}>
                        <Shield size={14} style={{ marginRight: 6 }} /> Dashboard
                      </Link>
                    </li>
                    <li>
                      <button onClick={() => { logoutAdmin(); setMobileMenuOpen(false); }} className="nav-link" style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
                        <LogOut size={14} style={{ marginRight: 6 }} /> Logout
                      </button>
                    </li>
                  </>
                ) : (
                  <li>
                    <Link to="/admin-login" className="nav-link btn-admin" onClick={() => setMobileMenuOpen(false)}>
                      <Shield size={14} style={{ marginRight: 6 }} /> Admin
                    </Link>
                  </li>
                )}
              </ul>

              {/* Mobile menu toggle */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                className="mobile-toggle"
                style={{ background: "none", border: "none", color: "#f8fafc", cursor: "pointer", display: "none" }}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </nav>

          {/* Main Content Area */}
          <main style={{ flex: 1, padding: "40px 0 60px" }}>
            <div className="container animate-fade-in">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/companies" element={<Companies />} />
                <Route path="/companies/:id" element={<CompanyDetails />} />
                <Route 
                  path="/statistics" 
                  element={
                    <ProtectedRoute>
                      <Statistics />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/experiences" element={<Experiences />} />
                <Route path="/submit-experience" element={<SubmitExperience />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route 
                  path="/admin-dashboard" 
                  element={
                    <ProtectedRoute>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />
                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>

          {/* Footer */}
          <footer style={{ borderTop: "1px solid var(--border-color)", padding: "24px 0", backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: "14px", textAlign: "center" }}>
            <div className="container">
              <p>&copy; {new Date().getFullYear()} College Placement Cell & Activity Portal. All rights reserved.</p>
              <p style={{ marginTop: 6, fontSize: "12px", color: "var(--text-muted)" }}>
                Built with MongoDB, Express, React, and Node.js. Developed for quick access and live metrics.
              </p>
            </div>
          </footer>

          {/* Global toast notification system */}
          {toast && (
            <div className={`toast ${toast.type}`}>
              {toast.type === "success" && <CheckCircle size={18} />}
              {toast.type === "error" && <AlertTriangle size={18} />}
              {toast.type === "info" && <Info size={18} />}
              <span>{toast.message}</span>
            </div>
          )}
          
        </div>
      </Router>
      
      {/* Mobile nav custom styles injecting */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-toggle {
            display: block !important;
          }
          .nav-links {
            display: none !important;
            flex-direction: column;
            position: absolute;
            top: 70px;
            left: 0;
            right: 0;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border-color);
            padding: 20px;
            gap: 12px;
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.4);
          }
          .nav-links.mobile-open {
            display: flex !important;
          }
          .nav-links li {
            width: 100%;
          }
          .nav-link {
            display: block;
            width: 100%;
            padding: 12px 16px;
          }
          .nav-link.active {
            border-bottom: none;
            border-left: 2px solid var(--primary);
            padding-left: 14px;
          }
        }
        
        .animate-fade-in {
          animation: pageFadeIn 0.3s ease-out;
        }
        @keyframes pageFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AppContext.Provider>
  );
}

// Custom NavLink component that marks active links based on location
function NavLink({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`nav-link ${isActive ? "active" : ""}`}>
      {children}
    </Link>
  );
}
