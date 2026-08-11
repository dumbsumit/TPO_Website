import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAppContext } from "../appContext";
import { KeyRound, AlertTriangle } from "lucide-react";

export default function AdminLogin() {
  const { token, API_URL, loginAdmin } = useAppContext();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      navigate("/admin-dashboard");
    }
  }, [token, navigate]);

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      setError("Please complete all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const loginUrl = `${API_URL.replace(/\/$/, "")}/auth/login`;
      const response = await axios.post(loginUrl, formData);
      if (response.data && response.data.token) {
        loginAdmin(response.data.token, response.data.username);
        navigate("/admin-dashboard");
      } else {
        setError("Invalid response payload from server.");
      }
    } catch (err) {
      console.error("Login failure:", err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Network connection issue or API server offline.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: "0 10px" }}>
      <div className="card" style={{ padding: 36 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img 
            src="/wce_crest_logo.png" 
            alt="WCE Crest Logo" 
            style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 16 }} 
          />
          <h2 style={{ fontSize: 24, marginBottom: 6 }}>TPO Administrative Login</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            Authentication required to modify databases and review submissions.
          </p>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 10, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: 12, borderRadius: 6, color: "var(--danger)", fontSize: 13, marginBottom: 20 }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              className="form-control"
              placeholder="Enter admin username"
              required
              value={formData.username}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              className="form-control"
              placeholder="••••••••"
              required
              value={formData.password}
              onChange={handleInputChange}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="btn btn-primary" 
            style={{ width: "100%", height: 42, fontSize: 14, marginTop: 6 }}
          >
            <KeyRound size={16} style={{ marginRight: 8 }} /> {loading ? "Verifying..." : "Authenticate"}
          </button>
        </form>

        <div style={{ marginTop: 24, fontSize: 12, color: "var(--text-muted)", textAlign: "center", borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
          <span>Demo Credentials: <strong>admin</strong> / <strong>admin123</strong></span>
        </div>
      </div>
    </div>
  );
}
