import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAppContext } from "../appContext";
import { useCallback } from "react";
import { 
  Upload, FileSpreadsheet, Trash2, Check, 
  Award, ShieldCheck, Download, FileText 
} from "lucide-react";

export default function AdminDashboard() {
  const { token, API_URL, showToast } = useAppContext();
  const [activeTab, setActiveTab] = useState("excel");

  const [experiences, setExperiences] = useState([]);

  const [loading, setLoading] = useState(false);

  // Excel Upload Refs
  const statsFileRef = useRef(null);
  const [statsFileName, setStatsFileName] = useState("");

  // Fetch dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

      const expRes = await axios.get(`${API_URL}/experiences/admin`, authHeaders);
      setExperiences(expRes.data || []);
    } catch (err) {
      console.error("Dashboard fetching error:", err);
      showToast("Failed to fetch dashboard updates", "error");
    }
  }, [API_URL, token, showToast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Helper to generate template download links
  const downloadTemplate = () => {
    const headers = [
      "Sr.No",
      "PRN",
      "Branch",
      "First Name",
      "Middle Name",
      "Last Name",
      "Gender",
      "Company 1",
      "Salary (LPA)",
      "Company 2",
      "Salary (LPA)",
      "Internship Offered",
      "Internship Company",
      "Internship Start Date",
      "Internship End Date",
      "Stipend",
      "Personal Mail",
      "College Mail",
      "Phone No",
      "Placement Status"
    ];
    
    const csvData = headers.join(",") + "\n";
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tpo_placement_records_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- REVIEW EXPERIENCES IMPLEMENTATIONS ---
  const updateExpStatus = async (expId, status) => {
    try {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      await axios.patch(`${API_URL}/experiences/${expId}/status`, { status }, authHeaders);
      showToast(`Experience updated to: ${status.toUpperCase()}`);
      loadDashboardData();
    } catch (err) {
      console.error("Experience status update failed:", err);
      showToast("Failed to update experience status", "error");
    }
  };

  const deleteExperience = async (expId) => {
    if (!window.confirm("Are you sure you want to delete this submission?")) return;
    try {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/experiences/${expId}`, authHeaders);
      showToast("Submission deleted.");
      loadDashboardData();
    } catch (err) {
      console.error("Experience delete error:", err);
      showToast("Failed to delete experience", "error");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30, borderBottom: "1px solid var(--border-color)", paddingBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 36, display: "flex", alignItems: "center", gap: 12 }}>
            <ShieldCheck size={36} style={{ color: "var(--success)" }} /> TPO Administrative Panel
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
            Control portal content, upload spreadsheets, and moderate reviews.
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        
        {/* Sidebar Nav */}
        <aside className="sidebar">
          <ul className="sidebar-menu">
            <li 
              className={`sidebar-item ${activeTab === "excel" ? "active" : ""}`}
              onClick={() => setActiveTab("excel")}
            >
              <FileSpreadsheet size={16} /> Excel Bulk Imports
            </li>
            <li 
              className={`sidebar-item ${activeTab === "experiences" ? "active" : ""}`}
              onClick={() => setActiveTab("experiences")}
            >
              <FileText size={16} /> Review User Responses
            </li>
          </ul>
        </aside>

        {/* Workspace views */}
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>

          {/* TAB 1: EXCEL BULK IMPORTS */}
          {activeTab === "excel" && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 30 }}>
              <div>
                <h2 style={{ fontSize: 20, marginBottom: 6 }}>Excel Spreadsheets Recruiter Importers</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                  Upload Excel or CSV files for yearly placement figures. The database automatically parses rows and updates the portal statistics.
                </p>
              </div>

              {/* Stats Import */}
              <div style={{ border: "1px solid var(--border-color)", padding: 24, borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.01)" }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, display: "flex", alignItems: "center", justifyItems: "center", gap: 8 }}>
                  <Award size={16} style={{ color: "var(--accent)" }} /> Bulk Import Yearly Placements Stats
                </h3>
                
                <div 
                  className="excel-dropzone" 
                  onClick={() => statsFileRef.current?.click()}
                >
                  <Upload className="excel-dropzone-icon" size={32} style={{ color: "var(--accent)" }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                      {statsFileName || "Drag & Drop or Click to Select Statistics Excel"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                      Supports columns: Year, Total Companies Visited, Total Placed, Average Package.
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={statsFileRef}
                    style={{ display: "none" }}
                    accept=".xlsx, .xls, .csv"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;

                      setStatsFileName(file.name);

                      const formData = new FormData();
                      formData.append("file", file);

                      setLoading(true);
                      try {
                        const response = await axios.post(
                          `${API_URL}/admin/import-stats`,
                          formData,
                          {
                            headers: {
                              "Content-Type": "multipart/form-data",
                              Authorization: `Bearer ${token}`
                            }
                          }
                        );

                        showToast(response.data.message || "File imported successfully", "success");
                        loadDashboardData();
                        setStatsFileName("");
                        if (statsFileRef.current) statsFileRef.current.value = "";
                      } catch (err) {
                        console.error("Import error:", err);
                        showToast(err.response?.data?.message || "Failed to process spreadsheet file.", "error");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  />
                </div>
                
                <button 
                  type="button" 
                  onClick={downloadTemplate} 
                  className="btn btn-secondary" 
                  style={{ width: "100%", height: 38, fontSize: 13 }}
                >
                  <Download size={14} style={{ marginRight: 6 }} /> Download Placement Records CSV Template
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: REVIEW INTERVIEW EXPERIENCES */}
          {activeTab === "experiences" && (
            <div className="card">
              <h2 style={{ fontSize: 20, marginBottom: 6 }}>Student Submissions ({experiences.length})</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>
                Review every response received from users, publish approved submissions to the home page, or delete anything inappropriate.
              </p>

              {experiences.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40 }}>
                  No student submissions found in database.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {experiences.map(exp => (
                    <div key={exp._id} style={{ border: "1px solid var(--border-color)", padding: 20, borderRadius: "var(--radius-sm)", background: exp.status === "pending" ? "rgba(99, 102, 241, 0.02)" : "transparent" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                        <div>
                          <h4 style={{ fontSize: 16 }}>{exp.studentName} at <strong>{exp.companyName}</strong></h4>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                            {exp.branch} &bull; Class of {exp.graduationYear}
                          </span>
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className={`tag`} style={{ 
                            background: exp.status === "approved" ? "rgba(16, 185, 129, 0.15)" : exp.status === "pending" ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: exp.status === "approved" ? "var(--success)" : exp.status === "pending" ? "var(--warning)" : "var(--danger)",
                            border: "none",
                            fontWeight: 600
                          }}>
                            {exp.status === "approved" ? "VISIBLE ON HOME" : exp.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div style={{ background: "rgba(255,255,255,0.01)", padding: 14, borderRadius: 6, fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                        <div style={{ marginBottom: 10 }}><strong>Rounds:</strong> {exp.rounds.map(r => r.title).join(" -> ")}</div>
                        <div style={{ marginBottom: 10 }}><strong>Tech Evaluated:</strong> {(exp.technologies || []).join(", ") || "None"}</div>
                        <div><strong>Advice:</strong> {exp.prepTips || "None"}</div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        {exp.status === "pending" && (
                          <button 
                            onClick={() => updateExpStatus(exp._id, "approved")}
                            className="btn btn-primary" 
                            style={{ padding: "6px 12px", fontSize: 12, background: "var(--success)" }}
                          >
                            <Check size={12} style={{ marginRight: 4 }} /> Publish to Home
                          </button>
                        )}
                        {exp.status === "approved" && (
                          <button 
                            onClick={() => updateExpStatus(exp._id, "pending")}
                            className="btn btn-secondary" 
                            style={{ padding: "6px 12px", fontSize: 12 }}
                          >
                            Remove from Home
                          </button>
                        )}
                        <button 
                          onClick={() => deleteExperience(exp._id)}
                          className="btn btn-danger" 
                          style={{ padding: "6px 12px", fontSize: 12 }}
                        >
                          <Trash2 size={12} style={{ marginRight: 4 }} /> Delete Response
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
