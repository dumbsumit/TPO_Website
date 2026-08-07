import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAppContext } from "../App";
import { 
  Upload, Database, FileSpreadsheet, Plus, Edit2, Trash2, Check, X, 
  Settings, Award, ShieldCheck, Download, Users, Briefcase, FileText 
} from "lucide-react";

export default function AdminDashboard() {
  const { token, API_URL, showToast } = useAppContext();
  const [activeTab, setActiveTab] = useState("excel");

  // State management
  const [companies, setCompanies] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [globalStats, setGlobalStats] = useState({
    totalCompanies: 0,
    totalPlaced: 0,
    highestPackage: 0,
    averagePackage: 0
  });

  const [loading, setLoading] = useState(false);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

  // Excel Upload Refs
  const compFileRef = useRef(null);
  const statsFileRef = useRef(null);
  const [compFileName, setCompFileName] = useState("");
  const [statsFileName, setStatsFileName] = useState("");

  // Company Form State
  const [compForm, setCompForm] = useState({
    name: "",
    visitYear: new Date().getFullYear(),
    role: "",
    package: "",
    selectedCount: "",
    eligibility: "",
    technologies: "",
    hiringProcess: ""
  });

  // Fetch dashboard data
  const loadDashboardData = async () => {
    try {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      
      const compRes = await axios.get(`${API_URL}/companies`);
      setCompanies(compRes.data || []);

      const expRes = await axios.get(`${API_URL}/experiences/admin`, authHeaders);
      setExperiences(expRes.data || []);

      const statsRes = await axios.get(`${API_URL}/statistics`);
      if (statsRes.data) {
        setGlobalStats({
          totalCompanies: statsRes.data.totalCompanies || 0,
          totalPlaced: statsRes.data.totalPlaced || 0,
          highestPackage: statsRes.data.highestPackage || 0,
          averagePackage: statsRes.data.averagePackage || 0
        });
      }
    } catch (err) {
      console.error("Dashboard fetching error:", err);
      showToast("Failed to fetch dashboard updates", "error");
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [API_URL, token]);

  // Handle Excel upload
  const handleExcelUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === "companies") {
      setCompFileName(file.name);
    } else {
      setStatsFileName(file.name);
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const endpoint = type === "companies" ? "import-companies" : "import-stats";
      const response = await axios.post(
        `${API_URL}/admin/${endpoint}`, 
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
      
      // Reset input fields
      if (type === "companies") {
        setCompFileName("");
        if (compFileRef.current) compFileRef.current.value = "";
      } else {
        setStatsFileName("");
        if (statsFileRef.current) statsFileRef.current.value = "";
      }
    } catch (err) {
      console.error("Import error:", err);
      showToast(err.response?.data?.message || "Failed to process spreadsheet file.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Helper to generate template download links
  const downloadTemplate = (type) => {
    let headers = [];
    if (type === "companies") {
      headers = [
        "Company Name", 
        "Visit Year", 
        "Offered Role", 
        "Package (CTC)", 
        "Selected Count", 
        "Eligibility Criteria", 
        "Technologies Asked", 
        "Hiring Process"
      ];
    } else {
      headers = [
        "Year", 
        "Total Companies Visited", 
        "Total Students Placed", 
        "Average Package"
      ];
    }
    
    const csvData = headers.join(",") + "\n";
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tpo_${type}_template.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- MANUAL COMPANY CRUD IMPLEMENTATIONS ---
  const openCompanyModal = (company = null) => {
    if (company) {
      setEditingCompany(company);
      setCompForm({
        name: company.name,
        visitYear: company.visitYear,
        role: company.role,
        package: company.package,
        selectedCount: company.selectedCount,
        eligibility: company.eligibility || "",
        technologies: (company.technologies || []).join(", "),
        hiringProcess: company.hiringProcess || ""
      });
    } else {
      setEditingCompany(null);
      setCompForm({
        name: "",
        visitYear: new Date().getFullYear(),
        role: "",
        package: "",
        selectedCount: "",
        eligibility: "",
        technologies: "",
        hiringProcess: ""
      });
    }
    setCompanyModalOpen(true);
  };

  const handleCompFormSubmit = async (e) => {
    e.preventDefault();
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    
    // Parse technologies list
    const techArray = compForm.technologies
      ? compForm.technologies.split(",").map(t => t.trim()).filter(Boolean)
      : [];

    const payload = {
      ...compForm,
      package: Number(compForm.package) || 0,
      selectedCount: Number(compForm.selectedCount) || 0,
      technologies: techArray
    };

    try {
      if (editingCompany) {
        // Edit Mode
        await axios.put(`${API_URL}/companies/${editingCompany._id}`, payload, authHeaders);
        showToast("Company listing updated successfully.");
      } else {
        // Create Mode
        await axios.post(`${API_URL}/companies`, payload, authHeaders);
        showToast("New company drive listing added successfully.");
      }
      setCompanyModalOpen(false);
      loadDashboardData();
    } catch (err) {
      console.error("Manual company save error:", err);
      showToast("Failed to save company listing", "error");
    }
  };

  const deleteCompany = async (companyId) => {
    if (!window.confirm("Are you sure you want to delete this company? All associated experiences will be deleted as well.")) return;
    try {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/companies/${companyId}`, authHeaders);
      showToast("Company drive listing deleted.");
      loadDashboardData();
    } catch (err) {
      console.error("Company delete error:", err);
      showToast("Failed to delete company", "error");
    }
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

  // --- UPDATE AGGREGATE STATS ---
  const handleStatsSubmit = async (e) => {
    e.preventDefault();
    try {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_URL}/statistics`, {
        totalCompanies: Number(globalStats.totalCompanies),
        totalPlaced: Number(globalStats.totalPlaced),
        highestPackage: Number(globalStats.highestPackage),
        averagePackage: Number(globalStats.averagePackage)
      }, authHeaders);
      showToast("Core placement statistics values updated.");
      loadDashboardData();
    } catch (err) {
      console.error("Stats save error:", err);
      showToast("Failed to save statistics metrics", "error");
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
              className={`sidebar-item ${activeTab === "companies" ? "active" : ""}`}
              onClick={() => setActiveTab("companies")}
            >
              <Database size={16} /> Manage Companies
            </li>
            <li 
              className={`sidebar-item ${activeTab === "experiences" ? "active" : ""}`}
              onClick={() => setActiveTab("experiences")}
            >
              <FileText size={16} /> Review Experiences
            </li>
            <li 
              className={`sidebar-item ${activeTab === "stats" ? "active" : ""}`}
              onClick={() => setActiveTab("stats")}
            >
              <Settings size={16} /> Portal Statistics
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
                  Upload Excel or CSV file lists of companies or yearly placement figures. The database automatically parses fields and performs upserts based on matching primary keys (Name/Year).
                </p>
              </div>

              {/* Box 1: Companies Import */}
              <div style={{ border: "1px solid var(--border-color)", padding: 24, borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.01)" }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, display: "flex", alignItems: "center", justifyItems: "center", gap: 8 }}>
                  <Briefcase size={16} style={{ color: "var(--primary)" }} /> Bulk Import Companies Drive Records
                </h3>
                
                <div 
                  className="excel-dropzone" 
                  onClick={() => compFileRef.current?.click()}
                >
                  <Upload className="excel-dropzone-icon" size={32} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                      {compFileName || "Drag & Drop or Click to Select Companies Excel"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                      Supports standard columns: Company Name, Offered Role, CTC, Selected Students, etc.
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={compFileRef}
                    style={{ display: "none" }}
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => handleExcelUpload(e, "companies")}
                    disabled={loading}
                  />
                </div>
                
                <button 
                  type="button" 
                  onClick={() => downloadTemplate("companies")} 
                  className="btn btn-secondary" 
                  style={{ width: "100%", height: 38, fontSize: 13 }}
                >
                  <Download size={14} style={{ marginRight: 6 }} /> Download Companies CSV Template
                </button>
              </div>

              {/* Box 2: Stats Import */}
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
                    onChange={(e) => handleExcelUpload(e, "stats")}
                    disabled={loading}
                  />
                </div>
                
                <button 
                  type="button" 
                  onClick={() => downloadTemplate("stats")} 
                  className="btn btn-secondary" 
                  style={{ width: "100%", height: 38, fontSize: 13 }}
                >
                  <Download size={14} style={{ marginRight: 6 }} /> Download Statistics CSV Template
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE COMPANIES */}
          {activeTab === "companies" && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 20, marginBottom: 4 }}>Recruiter Drives Listings ({companies.length})</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Create, modify, or delete manual company directory listings.</p>
                </div>
                <button onClick={() => openCompanyModal()} className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>
                  <Plus size={14} style={{ marginRight: 4 }} /> Add Company listing
                </button>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Visit Year</th>
                      <th>Role</th>
                      <th>Package (CTC)</th>
                      <th>Placed</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map(comp => (
                      <tr key={comp._id}>
                        <td style={{ fontWeight: 600 }}>{comp.name}</td>
                        <td>{comp.visitYear}</td>
                        <td>{comp.role}</td>
                        <td>{comp.package} LPA</td>
                        <td>{comp.selectedCount} Students</td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button 
                              onClick={() => openCompanyModal(comp)} 
                              className="btn btn-secondary" 
                              style={{ padding: 6 }}
                              title="Edit Listing"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button 
                              onClick={() => deleteCompany(comp._id)} 
                              className="btn btn-danger" 
                              style={{ padding: 6 }}
                              title="Delete Listing"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: REVIEW INTERVIEW EXPERIENCES */}
          {activeTab === "experiences" && (
            <div className="card">
              <h2 style={{ fontSize: 20, marginBottom: 6 }}>Student Submission Approvals ({experiences.length})</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>
                Filter pending student submissions and approve formatted listings.
              </p>

              {experiences.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40 }}>
                  No interview experiences found in database.
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
                            {exp.status.toUpperCase()}
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
                            <Check size={12} style={{ marginRight: 4 }} /> Approve Review
                          </button>
                        )}
                        {exp.status === "approved" && (
                          <button 
                            onClick={() => updateExpStatus(exp._id, "pending")}
                            className="btn btn-secondary" 
                            style={{ padding: "6px 12px", fontSize: 12 }}
                          >
                            Revoke Approval
                          </button>
                        )}
                        <button 
                          onClick={() => deleteExperience(exp._id)}
                          className="btn btn-danger" 
                          style={{ padding: "6px 12px", fontSize: 12 }}
                        >
                          <Trash2 size={12} style={{ marginRight: 4 }} /> Delete Submission
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PORTAL STATISTICS EDIT */}
          {activeTab === "stats" && (
            <div className="card">
              <h2 style={{ fontSize: 20, marginBottom: 6 }}>Update Aggregate Portal Stats</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>
                Manually override the core summary stats displayed on the home page.
              </p>

              <form onSubmit={handleStatsSubmit} style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 500 }}>
                <div className="form-group">
                  <label>Total Recruiting Companies</label>
                  <input
                    type="number"
                    className="form-control"
                    value={globalStats.totalCompanies}
                    onChange={(e) => setGlobalStats(prev => ({ ...prev, totalCompanies: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Total Placed Students</label>
                  <input
                    type="number"
                    className="form-control"
                    value={globalStats.totalPlaced}
                    onChange={(e) => setGlobalStats(prev => ({ ...prev, totalPlaced: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Highest Drive Package (LPA)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={globalStats.highestPackage}
                    onChange={(e) => setGlobalStats(prev => ({ ...prev, highestPackage: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Average Batch Package (LPA)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={globalStats.averagePackage}
                    onChange={(e) => setGlobalStats(prev => ({ ...prev, averagePackage: e.target.value }))}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ height: 42 }}>
                  Save Stats Configurations
                </button>
              </form>
            </div>
          )}

        </div>

      </div>

      {/* MODAL: ADD/EDIT MANUAL COMPANY */}
      {companyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: 18 }}>{editingCompany ? "Edit Company Listing" : "Add New Recruitment Drive"}</h3>
              <button 
                onClick={() => setCompanyModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCompFormSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-group">
                <label>Company Name <span style={{ color: "var(--danger)" }}>*</span></label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Google"
                  value={compForm.name}
                  onChange={(e) => setCompForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label>Visit Year <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    value={compForm.visitYear}
                    onChange={(e) => setCompForm(prev => ({ ...prev, visitYear: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Offered Role <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. Software Engineer"
                    value={compForm.role}
                    onChange={(e) => setCompForm(prev => ({ ...prev, role: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label>Package (CTC in LPA) <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    required
                    placeholder="e.g. 15.5"
                    value={compForm.package}
                    onChange={(e) => setCompForm(prev => ({ ...prev, package: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Selected Students <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    placeholder="e.g. 4"
                    value={compForm.selectedCount}
                    onChange={(e) => setCompForm(prev => ({ ...prev, selectedCount: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Eligibility Criteria</label>
                <textarea
                  rows="2"
                  className="form-control"
                  placeholder="e.g. CGPA >= 8.0, CS/IT departments only."
                  value={compForm.eligibility}
                  onChange={(e) => setCompForm(prev => ({ ...prev, eligibility: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Technologies Asked (Comma-separated)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. C++, Java, OOPS, Networking"
                  value={compForm.technologies}
                  onChange={(e) => setCompForm(prev => ({ ...prev, technologies: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Hiring Process Details</label>
                <textarea
                  rows="3"
                  className="form-control"
                  placeholder="Describe the interview rounds timeline structure..."
                  value={compForm.hiringProcess}
                  onChange={(e) => setCompForm(prev => ({ ...prev, hiringProcess: e.target.value }))}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ height: 42, marginTop: 10 }}>
                {editingCompany ? "Update Listing" : "Save Listing"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
