import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAppContext } from "../appContext";
import { useCallback } from "react";
import { 
  Upload, FileSpreadsheet, Trash2, Check, 
  Award, ShieldCheck, Download, FileText,
  TrendingUp, Edit2, Search, X, ShieldAlert,
  User, Mail, Phone, Calendar, Eye, Layers,
  Briefcase, MessageSquare
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AdminDashboard() {
  const { token, API_URL, showToast } = useAppContext();
  const [activeTab, setActiveTab] = useState("excel");
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Excel Upload Refs
  const statsFileRef = useRef(null);
  const [statsFileName, setStatsFileName] = useState("");
  const placementFileRef = useRef(null);
  const [placementFileName, setPlacementFileName] = useState("");

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
      "Sr No",
      "PRN",
      "Branch",
      "First Name",
      "Middle Name",
      "Last Name",
      "Gender",
      "Company 1",
      "Salary (LPA)",
      "Company 2",
      "Salary (LPA)_1",
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
              className={`sidebar-item ${activeTab === "analytics" ? "active" : ""}`}
              onClick={() => setActiveTab("analytics")}
            >
              <TrendingUp size={16} /> Placement Analytics
            </li>
            <li 
              className={`sidebar-item ${activeTab === "students" ? "active" : ""}`}
              onClick={() => setActiveTab("students")}
            >
              <User size={16} /> Student Placements
            </li>
            <li 
              className={`sidebar-item ${activeTab === "companies" ? "active" : ""}`}
              onClick={() => setActiveTab("companies")}
            >
              <Briefcase size={16} /> Company Analytics
            </li>
            <li 
              className={`sidebar-item ${activeTab === "branches" ? "active" : ""}`}
              onClick={() => setActiveTab("branches")}
            >
              <Award size={16} /> Branch Analytics
            </li>
            <li 
              className={`sidebar-item ${activeTab === "internships" ? "active" : ""}`}
              onClick={() => setActiveTab("internships")}
            >
              <Calendar size={16} /> Internship Analytics
            </li>
            <li 
              className={`sidebar-item ${activeTab === "reports" ? "active" : ""}`}
              onClick={() => setActiveTab("reports")}
            >
              <FileText size={16} /> Reports Generator
            </li>
            <li 
              className={`sidebar-item ${activeTab === "quality" ? "active" : ""}`}
              onClick={() => setActiveTab("quality")}
            >
              <ShieldAlert size={16} /> Data Quality
            </li>
            <li 
              className={`sidebar-item ${activeTab === "experiences" ? "active" : ""}`}
              onClick={() => setActiveTab("experiences")}
            >
              <MessageSquare size={16} /> Review User Responses
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
              <div style={{ border: "1px solid var(--border-color)", padding: 24, borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.01)", marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, display: "flex", alignItems: "center", justifyItems: "center", gap: 8 }}>
                  <Award size={16} style={{ color: "var(--accent)" }} /> Bulk Import Yearly Placements Stats Summary
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
              </div>

              {/* Detailed Placement Records Import */}
              <div style={{ border: "1px solid var(--border-color)", padding: 24, borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.01)" }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, display: "flex", alignItems: "center", justifyItems: "center", gap: 8 }}>
                  <Award size={16} style={{ color: "var(--primary)" }} /> Bulk Import Detailed Student Placement Records
                </h3>
                
                <div 
                  className="excel-dropzone" 
                  onClick={() => placementFileRef.current?.click()}
                >
                  <Upload className="excel-dropzone-icon" size={32} style={{ color: "var(--primary)" }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                      {placementFileName || "Drag & Drop or Click to Select Student Records Excel/CSV"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                      Required columns match the download template (PRN, Branch, Name, salaries, status).
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={placementFileRef}
                    style={{ display: "none" }}
                    accept=".xlsx, .xls, .csv"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;

                      setPlacementFileName(file.name);

                      const formData = new FormData();
                      formData.append("file", file);

                      setLoading(true);
                      try {
                        const response = await axios.post(
                          `${API_URL}/admin/import-placement-excel`,
                          formData,
                          {
                            headers: {
                              "Content-Type": "multipart/form-data",
                              Authorization: `Bearer ${token}`
                            }
                          }
                        );

                        showToast("Spreadsheet upload processed successfully!", "success");
                        setImportResult(response.data);
                        setPlacementFileName("");
                        if (placementFileRef.current) placementFileRef.current.value = "";
                      } catch (err) {
                        console.error("Student records import error:", err);
                        showToast(err.response?.data?.message || "Failed to process student placement records file.", "error");
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
                  <Download size={14} style={{ marginRight: 6 }} /> Download Detailed Placement Records CSV Template
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PLACEMENT ANALYTICS */}
          {activeTab === "analytics" && (
            <AdminPlacementAnalytics />
          )}

          {/* TAB 3: STUDENT PLACEMENTS REGISTRY */}
          {activeTab === "students" && (
            <AdminStudentPlacements />
          )}

          {/* TAB 4: COMPANIES ANALYTICS */}
          {activeTab === "companies" && (
            <AdminCompanyAnalytics />
          )}

          {/* TAB 5: BRANCH ANALYTICS */}
          {activeTab === "branches" && (
            <AdminBranchAnalytics />
          )}

          {/* TAB 6: INTERNSHIP ANALYTICS */}
          {activeTab === "internships" && (
            <AdminInternshipAnalytics />
          )}

          {/* TAB 7: REPORTS GENERATOR */}
          {activeTab === "reports" && (
            <AdminReports />
          )}

          {/* TAB 8: DATA QUALITY AUDITOR */}
          {activeTab === "quality" && (
            <AdminDataQuality />
          )}

          {/* TAB 9: REVIEW INTERVIEW EXPERIENCES */}
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
                        <div style={{ marginBottom: 10 }}><strong>Role:</strong> {exp.roleOffered || "Not specified"}</div>
                        <div style={{ marginBottom: 10 }}>
                          <strong>Package:</strong> {exp.ctc ? `${exp.ctc} LPA` : "Not specified"}
                          {exp.stipend ? ` - Stipend: Rs. ${exp.stipend}` : ""}
                        </div>
                        <div style={{ marginBottom: 10 }}><strong>Rating:</strong> {exp.overallRating ? `${exp.overallRating}/5` : "Not rated"}</div>
                        <div style={{ marginBottom: 10 }}><strong>Rounds:</strong> {(exp.rounds || []).map(r => r.title).join(" -> ") || "None added"}</div>
                        <div style={{ marginBottom: 10 }}><strong>Tags:</strong> {(exp.tags || exp.technologies || []).join(", ") || "None"}</div>
                        <div><strong>Overall Experience:</strong> {exp.overallExperience || exp.prepTips || "None"}</div>
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

      {/* Import Summary Modal */}
      {importResult && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, color: "var(--success)" }}>Spreadsheet Import Summary</h3>
              <button 
                onClick={() => setImportResult(null)} 
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="wce-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 16 }}>
                <div className="wce-stat-card" style={{ padding: 12 }}>
                  <div className="wce-stat-info">
                    <h3 style={{ fontSize: 18 }}>{importResult.summary.totalRows}</h3>
                    <p style={{ fontSize: 11 }}>Total Rows</p>
                  </div>
                </div>
                <div className="wce-stat-card" style={{ padding: 12 }}>
                  <div className="wce-stat-info">
                    <h3 style={{ fontSize: 18, color: "var(--success)" }}>{importResult.summary.successfullyImported}</h3>
                    <p style={{ fontSize: 11 }}>Imported (New)</p>
                  </div>
                </div>
                <div className="wce-stat-card" style={{ padding: 12 }}>
                  <div className="wce-stat-info">
                    <h3 style={{ fontSize: 18, color: "var(--primary)" }}>{importResult.summary.updatedRecords}</h3>
                    <p style={{ fontSize: 11 }}>Updated</p>
                  </div>
                </div>
                <div className="wce-stat-card" style={{ padding: 12 }}>
                  <div className="wce-stat-info">
                    <h3 style={{ fontSize: 18, color: "var(--warning)" }}>{importResult.summary.duplicateRecords}</h3>
                    <p style={{ fontSize: 11 }}>Duplicate PRNs</p>
                  </div>
                </div>
                <div className="wce-stat-card" style={{ padding: 12 }}>
                  <div className="wce-stat-info">
                    <h3 style={{ fontSize: 18, color: "var(--danger)" }}>{importResult.summary.failedRecords}</h3>
                    <p style={{ fontSize: 11 }}>Failed Validation</p>
                  </div>
                </div>
              </div>

              {importResult.failedRows && importResult.failedRows.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                  <h4 style={{ fontSize: 14, color: "var(--danger)", marginBottom: 12 }}>Skipped/Failed Row Details ({importResult.failedRows.length})</h4>
                  <div className="table-container" style={{ maxHeight: 250, overflowY: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: 80 }}>Row No</th>
                          <th style={{ width: 140 }}>Field</th>
                          <th>Error Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.failedRows.map((errRow, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600, color: "var(--text-muted)" }}>{errRow.rowNumber}</td>
                            <td style={{ color: "var(--accent)" }}>{errRow.field}</td>
                            <td style={{ color: "var(--danger)", fontSize: 12 }}>{errRow.errorReason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button 
                  onClick={() => setImportResult(null)}
                  className="btn btn-primary"
                  style={{ padding: "8px 24px" }}
                >
                  Dismiss Summary
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function AdminPlacementAnalytics() {
  const { token, API_URL, showToast } = useAppContext();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedInternship, setSelectedInternship] = useState("");
  const [selectedPackageRange, setSelectedPackageRange] = useState("");

  // Pagination states
  const [companiesPage, setCompaniesPage] = useState(1);
  const [placementsPage, setPlacementsPage] = useState(1);
  const itemsPerPage = 5;

  // Edit Modal student record state
  const [editStudent, setEditStudent] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      
      const res = await axios.get(`${API_URL}/admin/students`, {
        headers: authHeaders.headers,
        params: { limit: 100000 }
      });
      setStudents(res.data.students || []);
    } catch (err) {
      console.error("Error loading placement registry:", err);
      showToast("Failed to fetch placement registry details", "error");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract filter options dynamically
  const branches = [...new Set(students.map(s => s.branch).filter(Boolean))].sort();
  const genders = [...new Set(students.map(s => s.gender).filter(Boolean))].sort();
  
  const companyNamesSet = new Set();
  students.forEach(s => {
    s.offers?.forEach(o => { if (o.companyName) companyNamesSet.add(o.companyName); });
    s.internships?.forEach(i => { if (i.companyName) companyNamesSet.add(i.companyName); });
  });
  const companies = [...companyNamesSet].sort();

  const handleFilterReset = () => {
    setSearchTerm("");
    setSelectedBranch("");
    setSelectedGender("");
    setSelectedCompany("");
    setSelectedStatus("");
    setSelectedInternship("");
    setSelectedPackageRange("");
    setCompaniesPage(1);
    setPlacementsPage(1);
  };

  const deleteRecord = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student placement record?")) return;
    try {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/admin/students/${id}`, authHeaders);
      showToast("Student placement record deleted successfully!");
      loadData();
    } catch (err) {
      console.error("Error deleting student:", err);
      showToast("Failed to delete student record", "error");
    }
  };

  const clearAllRecords = async () => {
    if (!window.confirm("WARNING: This will permanently delete ALL student placement records from the database. This action cannot be undone. Are you sure you want to proceed?")) {
      return;
    }
    try {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/placement-records`, authHeaders);
      showToast("All student records cleared successfully!");
      loadData();
    } catch (err) {
      console.error("Error clearing records:", err);
      showToast("Failed to clear records", "error");
    }
  };

  const handleEditClick = (student) => {
    const primaryOffer = student.offers?.find(o => o.offerType === "PRIMARY") || student.offers?.[0] || {};
    const secondaryOffer = student.offers?.find(o => o.offerType === "SECONDARY") || student.offers?.[1] || {};
    const internship = student.internships?.[0] || {};

    setEditStudent({
      _id: student._id,
      prn: student.prn,
      name: student.name,
      branch: student.branch,
      gender: student.gender,
      personalEmail: student.personalEmail || "",
      collegeEmail: student.collegeEmail || "",
      phone: student.phone || "",
      
      company1: primaryOffer.companyName || "",
      salary1: primaryOffer.packageLpa !== undefined ? primaryOffer.packageLpa : "",
      company1Status: primaryOffer.placementStatus || "Placed",
      
      company2: secondaryOffer.companyName || "",
      salary2: secondaryOffer.packageLpa !== undefined ? secondaryOffer.packageLpa : "",
      company2Status: secondaryOffer.placementStatus || "Placed",
      
      internshipOffered: student.internships && student.internships.length > 0 ? "Yes" : "No",
      internshipCompany: internship.companyName || "",
      stipend: internship.stipend !== undefined ? internship.stipend : "",
      ppo: internship.ppo || "No",
      internshipStatus: internship.status || "Active"
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editStudent.name || !editStudent.prn || !editStudent.branch || !editStudent.gender) {
      showToast("Please fill all required fields", "error");
      return;
    }
    setEditLoading(true);
    try {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      
      const offers = [];
      if (editStudent.company1) {
        offers.push({
          companyName: editStudent.company1,
          packageLpa: editStudent.salary1 !== "" ? Number(editStudent.salary1) : undefined,
          offerType: "PRIMARY",
          placementStatus: editStudent.company1Status || "Placed"
        });
      }
      if (editStudent.company2) {
        offers.push({
          companyName: editStudent.company2,
          packageLpa: editStudent.salary2 !== "" ? Number(editStudent.salary2) : undefined,
          offerType: "SECONDARY",
          placementStatus: editStudent.company2Status || "Placed"
        });
      }

      const internships = [];
      if (editStudent.internshipOffered === "Yes" && editStudent.internshipCompany) {
        internships.push({
          companyName: editStudent.internshipCompany,
          stipend: editStudent.stipend !== "" ? Number(editStudent.stipend) : undefined,
          ppo: editStudent.ppo || "No",
          status: editStudent.internshipStatus || "Active"
        });
      }

      const payload = {
        name: editStudent.name,
        branch: editStudent.branch,
        gender: editStudent.gender,
        personalEmail: editStudent.personalEmail,
        collegeEmail: editStudent.collegeEmail,
        phone: editStudent.phone,
        offers,
        internships
      };

      await axios.put(`${API_URL}/admin/students/${editStudent._id}`, payload, authHeaders);
      showToast("Student record updated successfully!");
      setEditStudent(null);
      loadData();
    } catch (err) {
      console.error("Error updating record:", err);
      showToast(err.response?.data?.message || "Failed to update student record", "error");
    } finally {
      setEditLoading(false);
    }
  };

  // Perform dynamic filtering in-memory
  const filteredStudents = students.filter(student => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const nameMatch = student.name?.toLowerCase().includes(term);
      const prnMatch = student.prn?.toLowerCase().includes(term);
      const compMatch = student.offers?.some(o => o.companyName?.toLowerCase().includes(term)) ||
                        student.internships?.some(i => i.companyName?.toLowerCase().includes(term));
      if (!nameMatch && !prnMatch && !compMatch) return false;
    }

    if (selectedBranch && student.branch !== selectedBranch) return false;
    if (selectedGender && student.gender !== selectedGender) return false;

    if (selectedCompany) {
      const hasComp = student.offers?.some(o => o.companyName === selectedCompany) ||
                      student.internships?.some(i => i.companyName === selectedCompany);
      if (!hasComp) return false;
    }

    if (selectedStatus) {
      const isPlaced = student.offers && student.offers.length > 0;
      if (selectedStatus === "Placed" && !isPlaced) return false;
      if (selectedStatus === "Unplaced" && isPlaced) return false;
    }

    if (selectedInternship) {
      const hasIntern = student.internships && student.internships.length > 0;
      if (selectedInternship === "Yes" && !hasIntern) return false;
      if (selectedInternship === "No" && hasIntern) return false;
    }

    if (selectedPackageRange) {
      const maxPackage = student.offers && student.offers.length > 0 
        ? Math.max(...student.offers.map(o => o.packageLpa).filter(p => typeof p === 'number'))
        : 0;
      if (selectedPackageRange === "< 5" && (maxPackage === 0 || maxPackage >= 5)) return false;
      if (selectedPackageRange === "5-10" && (maxPackage < 5 || maxPackage >= 10)) return false;
      if (selectedPackageRange === "10-15" && (maxPackage < 10 || maxPackage >= 15)) return false;
      if (selectedPackageRange === "> 15" && maxPackage < 15) return false;
    }

    return true;
  });

  // Calculate Metrics
  const totalStudents = filteredStudents.length;
  const placedStudentsList = filteredStudents.filter(s => s.offers && s.offers.length > 0);
  const placedStudents = placedStudentsList.length;
  const placementRate = totalStudents > 0 ? parseFloat(((placedStudents / totalStudents) * 100).toFixed(2)) : 0;

  const uniqueComps = new Set();
  filteredStudents.forEach(s => s.offers?.forEach(o => { if (o.companyName) uniqueComps.add(o.companyName); }));
  const totalCompanies = uniqueComps.size;

  const packagesList = [];
  filteredStudents.forEach(s => s.offers?.forEach(o => { if (typeof o.packageLpa === "number") packagesList.push(o.packageLpa); }));
  
  const averagePackage = packagesList.length > 0 ? (packagesList.reduce((sum, p) => sum + p, 0) / packagesList.length) : null;
  
  const calculateMedian = (arr) => {
    if (!arr || arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  };
  const medianPackage = calculateMedian(packagesList);
  const highestPackage = packagesList.length > 0 ? Math.max(...packagesList) : null;
  const lowestPackage = packagesList.length > 0 ? Math.min(...packagesList) : null;

  const internshipPpoCount = filteredStudents.filter(s => s.internships?.some(i => i.ppo === "Yes")).length;
  const multipleOffersCount = filteredStudents.filter(s => s.offers && s.offers.length > 1).length;

  const hasData = totalStudents > 0;

  const formatLPA = (val) => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return `${parseFloat(Number(val).toFixed(2))} LPA`;
  };

  // Setup options for ChartJS
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#475569",
          font: { family: "Inter", size: 11, weight: 500 }
        }
      },
      tooltip: {
        backgroundColor: "#2f3192",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        padding: 10,
        cornerRadius: 6
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748b", font: { family: "Inter" } }
      },
      y: {
        grid: { color: "rgba(47, 49, 146, 0.05)" },
        ticks: { color: "#64748b", font: { family: "Inter" } }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "#475569",
          font: { family: "Inter", size: 11, weight: 500 }
        }
      },
      tooltip: {
        backgroundColor: "#2f3192",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        padding: 10,
        cornerRadius: 6
      }
    }
  };

  // Charts datasets
  const placementRateData = hasData ? {
    labels: ["Placed", "Unplaced"],
    datasets: [
      {
        data: [placedStudents, totalStudents - placedStudents],
        backgroundColor: ["rgba(16, 185, 129, 0.75)", "rgba(239, 68, 68, 0.75)"],
        borderColor: ["#10b981", "#ef4444"],
        borderWidth: 1
      }
    ]
  } : null;

  let distUnder5 = 0;
  let dist5to10 = 0;
  let dist10to15 = 0;
  let distOver15 = 0;
  packagesList.forEach(p => {
    if (p < 5) distUnder5++;
    else if (p >= 5 && p < 10) dist5to10++;
    else if (p >= 10 && p < 15) dist10to15++;
    else distOver15++;
  });

  const salaryDistributionData = hasData ? {
    labels: ["< 5 LPA", "5-10 LPA", "10-15 LPA", "> 15 LPA"],
    datasets: [
      {
        data: [distUnder5, dist5to10, dist10to15, distOver15],
        backgroundColor: [
          "rgba(138, 63, 252, 0.75)",
          "rgba(6, 182, 212, 0.75)",
          "rgba(245, 158, 11, 0.75)",
          "rgba(16, 185, 129, 0.75)"
        ],
        borderColor: ["#8a3ffc", "#06b6d4", "#f59e0b", "#10b981"],
        borderWidth: 1
      }
    ]
  } : null;

  const branchMap = {};
  filteredStudents.forEach(s => {
    if (!branchMap[s.branch]) {
      branchMap[s.branch] = { total: 0, placed: 0 };
    }
    branchMap[s.branch].total++;
    if (s.offers && s.offers.length > 0) {
      branchMap[s.branch].placed++;
    }
  });
  const branchLabels = Object.keys(branchMap).sort();
  const branchPlacementData = hasData ? {
    labels: branchLabels,
    datasets: [
      {
        label: "Students Placed",
        data: branchLabels.map(b => branchMap[b].placed),
        backgroundColor: "rgba(47, 49, 146, 0.75)",
        borderColor: "#2f3192",
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: "Students Unplaced",
        data: branchLabels.map(b => branchMap[b].total - branchMap[b].placed),
        backgroundColor: "rgba(245, 158, 11, 0.75)",
        borderColor: "#f59e0b",
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  } : null;

  const companyPlacementsMap = {};
  filteredStudents.forEach(s => {
    s.offers?.forEach(o => {
      if (o.companyName) {
        companyPlacementsMap[o.companyName] = (companyPlacementsMap[o.companyName] || 0) + 1;
      }
    });
  });
  const topCompaniesForChart = Object.keys(companyPlacementsMap)
    .map(name => ({ name, count: companyPlacementsMap[name] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const companyPlacementChartData = hasData ? {
    labels: topCompaniesForChart.map(c => c.name),
    datasets: [
      {
        label: "Students Placed",
        data: topCompaniesForChart.map(c => c.count),
        backgroundColor: "rgba(6, 182, 212, 0.75)",
        borderColor: "#06b6d4",
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  } : null;

  // Companies stats aggregation
  const companyStatsMap = {};
  filteredStudents.forEach(s => {
    s.offers?.forEach(o => {
      if (o.companyName) {
        if (!companyStatsMap[o.companyName]) {
          companyStatsMap[o.companyName] = { name: o.companyName, packages: [], students: new Set(), internships: 0, ppos: 0 };
        }
        companyStatsMap[o.companyName].students.add(s._id);
        if (typeof o.packageLpa === "number") {
          companyStatsMap[o.companyName].packages.push(o.packageLpa);
        }
      }
    });
    s.internships?.forEach(i => {
      if (i.companyName) {
        if (!companyStatsMap[i.companyName]) {
          companyStatsMap[i.companyName] = { name: i.companyName, packages: [], students: new Set(), internships: 0, ppos: 0 };
        }
        companyStatsMap[i.companyName].internships++;
        if (i.ppo === "Yes") {
          companyStatsMap[i.companyName].ppos++;
        }
      }
    });
  });

  const recruitingCompaniesList = Object.keys(companyStatsMap).map(name => {
    const entry = companyStatsMap[name];
    const pkgs = entry.packages;
    const avgPkg = pkgs.length > 0 ? (pkgs.reduce((a, b) => a + b, 0) / pkgs.length) : null;
    const maxPkg = pkgs.length > 0 ? Math.max(...pkgs) : null;
    const minPkg = pkgs.length > 0 ? Math.min(...pkgs) : null;

    return {
      companyName: name,
      studentsCount: entry.students.size,
      averagePackage: avgPkg,
      highestPackage: maxPkg,
      lowestPackage: minPkg,
      internshipCount: entry.internships,
      ppoCount: entry.ppos
    };
  }).sort((a, b) => b.studentsCount - a.studentsCount);

  // Recent placements list aggregation
  const recentPlacementsList = [];
  filteredStudents.forEach(s => {
    const primaryOffer = s.offers?.find(o => o.offerType === "PRIMARY") || s.offers?.[0];
    const secondaryOffer = s.offers?.find(o => o.offerType === "SECONDARY") || s.offers?.[1];
    
    if (primaryOffer) {
      recentPlacementsList.push({
        _id: s._id,
        rawStudent: s,
        studentName: s.name,
        prn: s.prn,
        branch: s.branch,
        gender: s.gender,
        companyName: primaryOffer.companyName,
        packageLpa: primaryOffer.packageLpa,
        status: primaryOffer.placementStatus || "Placed"
      });
      if (secondaryOffer) {
        recentPlacementsList.push({
          _id: `${s._id}_2`,
          rawStudent: s,
          studentName: s.name,
          prn: s.prn,
          branch: s.branch,
          gender: s.gender,
          companyName: secondaryOffer.companyName,
          packageLpa: secondaryOffer.packageLpa,
          status: secondaryOffer.placementStatus || "Placed"
        });
      }
    } else {
      recentPlacementsList.push({
        _id: s._id,
        rawStudent: s,
        studentName: s.name,
        prn: s.prn,
        branch: s.branch,
        gender: s.gender,
        companyName: "—",
        packageLpa: null,
        status: "Unplaced"
      });
    }
  });

  const totalCompaniesCount = recruitingCompaniesList.length;
  const companiesPages = Math.ceil(totalCompaniesCount / itemsPerPage);
  const paginatedCompanies = recruitingCompaniesList.slice((companiesPage - 1) * itemsPerPage, companiesPage * itemsPerPage);

  const totalPlacementsCount = recentPlacementsList.length;
  const placementsPages = Math.ceil(totalPlacementsCount / itemsPerPage);
  const paginatedPlacements = recentPlacementsList.slice((placementsPage - 1) * itemsPerPage, placementsPage * itemsPerPage);

  const downloadRegistryExcel = async () => {
    try {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/admin/export-placement-excel`, {
        headers: authHeaders.headers,
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "student_placements_registry.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error exporting Excel:", err);
      showToast("Failed to download registry Excel file", "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      
      {/* Filters Bar */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <h3 style={{ fontSize: 18 }}>Dashboard Query Filters</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              onClick={downloadRegistryExcel}
              className="btn btn-secondary" 
              style={{ padding: "8px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
              disabled={!hasData}
            >
              <Download size={14} /> Export to Excel
            </button>
            <button 
              onClick={clearAllRecords}
              className="btn btn-danger" 
              style={{ padding: "8px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
              disabled={!hasData}
            >
              <Trash2 size={14} /> Clear All Records
            </button>
          </div>
        </div>

        <div className="filter-bar" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, margin: 0, padding: 0, border: "none", background: "none" }}>
          
          <div className="form-group">
            <label>Search Placements</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Name, PRN, company..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPlacementsPage(1); setCompaniesPage(1); }}
                style={{ paddingLeft: 32, height: 38 }}
              />
              <Search size={12} style={{ position: "absolute", left: 10, top: 13, color: "var(--text-muted)" }} />
            </div>
          </div>

          <div className="form-group">
            <label>Academic Year</label>
            <select
              className="form-control"
              value={selectedGender ? "2025" : ""}
              style={{ height: 38 }}
              onChange={() => {}}
            >
              <option value="">All Years</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>

          <div className="form-group">
            <label>Branch</label>
            <select
              className="form-control"
              value={selectedBranch}
              onChange={(e) => { setSelectedBranch(e.target.value); setPlacementsPage(1); setCompaniesPage(1); }}
              style={{ height: 38 }}
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Gender</label>
            <select
              className="form-control"
              value={selectedGender}
              onChange={(e) => { setSelectedGender(e.target.value); setPlacementsPage(1); setCompaniesPage(1); }}
              style={{ height: 38 }}
            >
              <option value="">All Genders</option>
              {genders.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Company</label>
            <select
              className="form-control"
              value={selectedCompany}
              onChange={(e) => { setSelectedCompany(e.target.value); setPlacementsPage(1); setCompaniesPage(1); }}
              style={{ height: 38 }}
            >
              <option value="">All Companies</option>
              {companies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Placement Status</label>
            <select
              className="form-control"
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPlacementsPage(1); setCompaniesPage(1); }}
              style={{ height: 38 }}
            >
              <option value="">All Statuses</option>
              <option value="Placed">Placed</option>
              <option value="Unplaced">Unplaced</option>
            </select>
          </div>

          <div className="form-group">
            <label>Internship Offered</label>
            <select
              className="form-control"
              value={selectedInternship}
              onChange={(e) => { setSelectedInternship(e.target.value); setPlacementsPage(1); setCompaniesPage(1); }}
              style={{ height: 38 }}
            >
              <option value="">All Internships</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          <div className="form-group">
            <label>Package Range</label>
            <select
              className="form-control"
              value={selectedPackageRange}
              onChange={(e) => { setSelectedPackageRange(e.target.value); setPlacementsPage(1); setCompaniesPage(1); }}
              style={{ height: 38 }}
            >
              <option value="">All Packages</option>
              <option value="< 5">&lt; 5 LPA</option>
              <option value="5-10">5 - 10 LPA</option>
              <option value="10-15">10 - 15 LPA</option>
              <option value="> 15">&gt; 15 LPA</option>
            </select>
          </div>
        </div>

        {(searchTerm || selectedBranch || selectedGender || selectedCompany || selectedStatus || selectedInternship || selectedPackageRange) && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button 
              className="btn btn-secondary" 
              onClick={handleFilterReset}
              style={{ padding: "6px 16px", fontSize: 12 }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* KPI Overview Cards */}
      {hasData && (
        <div className="wce-stats-grid" style={{ margin: 0, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--primary)", background: "var(--primary-glow)" }}>
              <User size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{totalStudents}</h3>
              <p>Total Students</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--success)", background: "rgba(16, 185, 129, 0.08)" }}>
              <Award size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{placedStudents}</h3>
              <p>Placed Students</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--accent)", background: "var(--accent-glow)" }}>
              <TrendingUp size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{placementRate}%</h3>
              <p>Placement Percentage</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--secondary)", background: "rgba(138, 63, 252, 0.08)" }}>
              <FileSpreadsheet size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{totalCompanies}</h3>
              <p>Total Companies</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--primary)", background: "var(--primary-glow)" }}>
              <Award size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{formatLPA(averagePackage)}</h3>
              <p>Average Package</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--success)", background: "rgba(16, 185, 129, 0.08)" }}>
              <Award size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{formatLPA(medianPackage)}</h3>
              <p>Median Package</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--accent)", background: "var(--accent-glow)" }}>
              <Award size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{formatLPA(highestPackage)}</h3>
              <p>Highest Package</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--secondary)", background: "rgba(138, 63, 252, 0.08)" }}>
              <Award size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{formatLPA(lowestPackage)}</h3>
              <p>Lowest Package</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--primary)", background: "var(--primary-glow)" }}>
              <FileText size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{internshipPpoCount}</h3>
              <p>Internship + PPO</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--success)", background: "rgba(16, 185, 129, 0.08)" }}>
              <Award size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{multipleOffersCount}</h3>
              <p>Multiple Offers</p>
            </div>
          </div>
        </div>
      )}

      {/* Visual Charts */}
      {!hasData ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 40px" }}>
          <ShieldAlert size={48} style={{ color: "var(--warning)", marginBottom: 16 }} />
          <h3>No Student Placement Records Match Selected Filters</h3>
          <p style={{ color: "var(--text-secondary)", marginTop: 8, maxWidth: 500, margin: "8px auto 20px", fontSize: 14 }}>
            Try resetting your search query or filters above, or upload a detailed placement spreadsheet in the **Excel Bulk Imports** workspace to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 30 }}>
          
          <div className="card" style={{ height: 350, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 15, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>Overall Placement Ratio</h3>
            <div style={{ flex: 1, position: "relative" }}>
              <Doughnut data={placementRateData} options={doughnutOptions} />
            </div>
          </div>

          <div className="card" style={{ height: 350, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 15, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>Salary Package Categories</h3>
            <div style={{ flex: 1, position: "relative" }}>
              <Doughnut data={salaryDistributionData} options={doughnutOptions} />
            </div>
          </div>

          <div className="card" style={{ height: 350, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 15, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>Branch-wise Placement Statistics</h3>
            <div style={{ flex: 1, position: "relative" }}>
              <Bar data={branchPlacementData} options={chartOptions} />
            </div>
          </div>

          <div className="card" style={{ height: 350, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 15, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>Company-wise Placements (Top 5)</h3>
            <div style={{ flex: 1, position: "relative" }}>
              {companyPlacementChartData.labels.length > 0 ? (
                <Bar data={companyPlacementChartData} options={chartOptions} />
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60 }}>No companies with placement offers.</div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Recruiting Tables */}
      {hasData && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: 30 }}>
          
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ fontSize: 18, borderBottom: "1px solid var(--border-color)", paddingBottom: 12, margin: 0 }}>Top Recruiting Companies</h3>
            
            {paginatedCompanies.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40 }}>No recruiter statistics available.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                <div className="table-container" style={{ flex: 1 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th style={{ textAlign: "center" }}>Students</th>
                        <th>Avg Package</th>
                        <th>Highest Pkg</th>
                        <th>Lowest Pkg</th>
                        <th style={{ textAlign: "center" }}>Internships</th>
                        <th style={{ textAlign: "center" }}>PPOs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCompanies.map((c, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{c.companyName}</td>
                          <td style={{ textAlign: "center", fontWeight: 600 }}>{c.studentsCount}</td>
                          <td>{formatLPA(c.averagePackage)}</td>
                          <td>{formatLPA(c.highestPackage)}</td>
                          <td>{formatLPA(c.lowestPackage)}</td>
                          <td style={{ textAlign: "center" }}>{c.internshipCount}</td>
                          <td style={{ textAlign: "center", fontWeight: 600, color: c.ppoCount > 0 ? "var(--success)" : "var(--text-muted)" }}>{c.ppoCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {companiesPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
                    <button 
                      disabled={companiesPage === 1}
                      onClick={() => setCompaniesPage(p => Math.max(1, p - 1))}
                      className="btn btn-secondary"
                      style={{ padding: "4px 10px", fontSize: 11 }}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      Page <strong>{companiesPage}</strong> of {companiesPages}
                    </span>
                    <button 
                      disabled={companiesPage === companiesPages}
                      onClick={() => setCompaniesPage(p => Math.min(companiesPages, p + 1))}
                      className="btn btn-secondary"
                      style={{ padding: "4px 10px", fontSize: 11 }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ fontSize: 18, borderBottom: "1px solid var(--border-color)", paddingBottom: 12, margin: 0 }}>Recent Placements</h3>
            
            {paginatedPlacements.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40 }}>No placement records found matching the filters.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                <div className="table-container" style={{ flex: 1 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>PRN</th>
                        <th>Branch</th>
                        <th>Company</th>
                        <th>Package</th>
                        <th>Status</th>
                        <th style={{ textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPlacements.map((p, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{p.studentName}</td>
                          <td>{p.prn}</td>
                          <td>{p.branch}</td>
                          <td style={{ fontWeight: 600 }}>{p.companyName}</td>
                          <td style={{ fontWeight: 600, color: p.packageLpa ? "var(--primary)" : "var(--text-muted)" }}>{formatLPA(p.packageLpa)}</td>
                          <td>
                            <span className="tag" style={{ 
                              background: p.status.toLowerCase().includes("placed") ? "rgba(16, 185, 129, 0.12)" : "rgba(71, 85, 105, 0.1)",
                              color: p.status.toLowerCase().includes("placed") ? "var(--success)" : "var(--text-secondary)",
                              border: "none",
                              fontWeight: 600
                            }}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              <button 
                                onClick={() => handleEditClick(p.rawStudent)}
                                className="btn btn-secondary" 
                                style={{ padding: "4px 8px", fontSize: 11, height: 26 }}
                                title="Edit Student placement details"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button 
                                onClick={() => deleteRecord(p.rawStudent._id)}
                                className="btn btn-danger" 
                                style={{ padding: "4px 8px", fontSize: 11, height: 26 }}
                                title="Delete record"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {placementsPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
                    <button 
                      disabled={placementsPage === 1}
                      onClick={() => setPlacementsPage(p => Math.max(1, p - 1))}
                      className="btn btn-secondary"
                      style={{ padding: "4px 10px", fontSize: 11 }}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      Page <strong>{placementsPage}</strong> of {placementsPages}
                    </span>
                    <button 
                      disabled={placementsPage === placementsPages}
                      onClick={() => setPlacementsPage(p => Math.min(placementsPages, p + 1))}
                      className="btn btn-secondary"
                      style={{ padding: "4px 10px", fontSize: 11 }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Edit Student Modal */}
      {editStudent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18 }}>Edit Student Placement Record</h3>
              <button 
                onClick={() => setEditStudent(null)} 
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="form-row-2col">
                <div className="form-group">
                  <label>Full Name <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={editStudent.name}
                    onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>PRN <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={editStudent.prn}
                    onChange={(e) => setEditStudent({ ...editStudent, prn: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label>Branch <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={editStudent.branch}
                    onChange={(e) => setEditStudent({ ...editStudent, branch: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Gender <span style={{ color: "var(--danger)" }}>*</span></label>
                  <select
                    className="form-control"
                    value={editStudent.gender}
                    onChange={(e) => setEditStudent({ ...editStudent, gender: e.target.value })}
                    required
                    style={{ height: 38 }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                <h4 style={{ fontSize: 14, marginBottom: 12, color: "var(--primary)" }}>Placement Offers</h4>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Company 1 (Primary)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStudent.company1}
                      onChange={(e) => setEditStudent({ ...editStudent, company1: e.target.value })}
                      placeholder="e.g. Seagate"
                    />
                  </div>
                  <div className="form-group">
                    <label>Salary Package 1 (LPA)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={editStudent.salary1}
                      onChange={(e) => setEditStudent({ ...editStudent, salary1: e.target.value })}
                      placeholder="e.g. 12"
                    />
                  </div>
                </div>
                <div className="form-row-2col" style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label>Company 2 (Secondary)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStudent.company2}
                      onChange={(e) => setEditStudent({ ...editStudent, company2: e.target.value })}
                      placeholder="e.g. Google"
                    />
                  </div>
                  <div className="form-group">
                    <label>Salary Package 2 (LPA)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={editStudent.salary2}
                      onChange={(e) => setEditStudent({ ...editStudent, salary2: e.target.value })}
                      placeholder="e.g. 30"
                    />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                <h4 style={{ fontSize: 14, marginBottom: 12, color: "var(--primary)" }}>Internship Details</h4>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Internship Offered</label>
                    <select
                      className="form-control"
                      value={editStudent.internshipOffered}
                      onChange={(e) => setEditStudent({ ...editStudent, internshipOffered: e.target.value })}
                      style={{ height: 38 }}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Internship Company</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStudent.internshipCompany}
                      onChange={(e) => setEditStudent({ ...editStudent, internshipCompany: e.target.value })}
                      placeholder="e.g. Seagate"
                    />
                  </div>
                </div>
                <div className="form-row-2col" style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label>Internship Stipend (₹/month)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editStudent.stipend}
                      onChange={(e) => setEditStudent({ ...editStudent, stipend: e.target.value })}
                      placeholder="e.g. 35000"
                    />
                  </div>
                  <div className="form-group">
                    <label>PPO Status</label>
                    <select
                      className="form-control"
                      value={editStudent.ppo}
                      onChange={(e) => setEditStudent({ ...editStudent, ppo: e.target.value })}
                      style={{ height: 38 }}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                <h4 style={{ fontSize: 14, marginBottom: 12, color: "var(--primary)" }}>Contact Information</h4>
                <div className="form-row-3col">
                  <div className="form-group">
                    <label>Personal Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editStudent.personalEmail}
                      onChange={(e) => setEditStudent({ ...editStudent, personalEmail: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>College Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editStudent.collegeEmail}
                      onChange={(e) => setEditStudent({ ...editStudent, collegeEmail: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStudent.phone}
                      onChange={(e) => setEditStudent({ ...editStudent, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
                <button 
                  type="button" 
                  onClick={() => setEditStudent(null)}
                  className="btn btn-secondary"
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={editLoading}
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function AdminCompanyAnalytics() {
  const { token, API_URL, showToast } = useAppContext();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected company detail state
  const [selectedCompany, setSelectedCompany] = useState(null);
  
  // Table search and filters
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Student list pagination for detailed view
  const [detailStudentPage, setDetailStudentPage] = useState(1);
  const detailItemsPerPage = 5;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/admin/students`, {
        headers: authHeaders.headers,
        params: { limit: 100000 }
      });
      setStudents(res.data.students || []);
    } catch (err) {
      console.error("Error loading company analytics:", err);
      showToast("Failed to fetch students list", "error");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate stats dynamically
  const calculateMedian = (arr) => {
    if (!arr || arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  };

  const companyMap = {};
  students.forEach(s => {
    s.offers?.forEach(o => {
      if (!o.companyName) return;
      const name = o.companyName.trim();
      if (!companyMap[name]) {
        companyMap[name] = {
          name,
          packages: [],
          studentsSet: new Set(),
          primaryOffers: 0,
          secondaryOffers: 0,
          internships: 0,
          ppos: 0,
          branchBreakdown: {},
          studentList: []
        };
      }
      const comp = companyMap[name];
      comp.studentsSet.add(s._id);
      if (typeof o.packageLpa === "number") {
        comp.packages.push(o.packageLpa);
      }
      if (o.offerType === "PRIMARY") {
        comp.primaryOffers++;
      } else if (o.offerType === "SECONDARY") {
        comp.secondaryOffers++;
      }
      
      comp.branchBreakdown[s.branch] = (comp.branchBreakdown[s.branch] || 0) + 1;
      
      let existing = comp.studentList.find(x => x.prn === s.prn);
      if (!existing) {
        existing = {
          _id: s._id,
          name: s.name,
          prn: s.prn,
          branch: s.branch,
          gender: s.gender,
          offers: [],
          internships: []
        };
        comp.studentList.push(existing);
      }
      existing.offers.push(o);
    });

    s.internships?.forEach(i => {
      if (!i.companyName) return;
      const name = i.companyName.trim();
      if (!companyMap[name]) {
        companyMap[name] = {
          name,
          packages: [],
          studentsSet: new Set(),
          primaryOffers: 0,
          secondaryOffers: 0,
          internships: 0,
          ppos: 0,
          branchBreakdown: {},
          studentList: []
        };
      }
      const comp = companyMap[name];
      comp.studentsSet.add(s._id);
      comp.internships++;
      if (i.ppo === "Yes") {
        comp.ppos++;
      }
      
      let existing = comp.studentList.find(x => x.prn === s.prn);
      if (!existing) {
        existing = {
          _id: s._id,
          name: s.name,
          prn: s.prn,
          branch: s.branch,
          gender: s.gender,
          offers: [],
          internships: []
        };
        comp.studentList.push(existing);
      }
      existing.internships.push(i);
      
      const hasOffer = s.offers?.some(o => o.companyName.trim() === name);
      if (!hasOffer) {
        comp.branchBreakdown[s.branch] = (comp.branchBreakdown[s.branch] || 0) + 1;
      }
    });
  });

  const companyStatsList = Object.keys(companyMap).map(name => {
    const comp = companyMap[name];
    const pkgs = comp.packages;
    const avgPkg = pkgs.length > 0 ? (pkgs.reduce((a, b) => a + b, 0) / pkgs.length) : null;
    const maxPkg = pkgs.length > 0 ? Math.max(...pkgs) : null;
    const minPkg = pkgs.length > 0 ? Math.min(...pkgs) : null;
    const medianPkg = calculateMedian(pkgs);

    return {
      companyName: name,
      totalStudents: comp.studentsSet.size,
      averagePackage: avgPkg,
      medianPackage: medianPkg,
      highestPackage: maxPkg,
      lowestPackage: minPkg,
      internshipCount: comp.internships,
      ppoCount: comp.ppos,
      primaryOffers: comp.primaryOffers,
      secondaryOffers: comp.secondaryOffers,
      raw: comp
    };
  }).sort((a, b) => b.totalStudents - a.totalStudents);

  const formatLPA = (val) => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return `${parseFloat(Number(val).toFixed(2))} LPA`;
  };

  const filteredCompanies = companyStatsList.filter(c => 
    c.companyName.toLowerCase().includes(search.toLowerCase())
  );

  const total = filteredCompanies.length;
  const pages = Math.ceil(total / itemsPerPage);
  const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>Loading company analytics...</div>;
  }

  // --- RENDER SELECTED COMPANY DETAIL PAGE ---
  if (selectedCompany) {
    const comp = selectedCompany;
    const raw = comp.raw;

    let distUnder5 = 0;
    let dist5to10 = 0;
    let dist10to15 = 0;
    let distOver15 = 0;
    raw.packages.forEach(p => {
      if (p < 5) distUnder5++;
      else if (p >= 5 && p < 10) dist5to10++;
      else if (p >= 10 && p < 15) dist10to15++;
      else distOver15++;
    });

    const distData = {
      labels: ["< 5 LPA", "5-10 LPA", "10-15 LPA", "> 15 LPA"],
      datasets: [
        {
          data: [distUnder5, dist5to10, dist10to15, distOver15],
          backgroundColor: [
            "rgba(138, 63, 252, 0.75)",
            "rgba(6, 182, 212, 0.75)",
            "rgba(245, 158, 11, 0.75)",
            "rgba(16, 185, 129, 0.75)"
          ],
          borderColor: ["#8a3ffc", "#06b6d4", "#f59e0b", "#10b981"],
          borderWidth: 1
        }
      ]
    };

    const branchLabels = Object.keys(raw.branchBreakdown).sort();
    const branchData = {
      labels: branchLabels,
      datasets: [
        {
          label: "Students Recruited",
          data: branchLabels.map(b => raw.branchBreakdown[b]),
          backgroundColor: "rgba(47, 49, 146, 0.75)",
          borderColor: "#2f3192",
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    };

    const detailTotal = raw.studentList.length;
    const detailPages = Math.ceil(detailTotal / detailItemsPerPage);
    const paginatedDetailStudents = raw.studentList.slice(
      (detailStudentPage - 1) * detailItemsPerPage,
      detailStudentPage * detailItemsPerPage
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        
        <div>
          <button 
            onClick={() => { setSelectedCompany(null); setDetailStudentPage(1); }}
            className="btn btn-secondary"
            style={{ padding: "6px 12px", fontSize: 12, marginBottom: 12 }}
          >
            ← Back to Companies List
          </button>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--primary)" }}>{comp.companyName} Analytics</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            Detailed placement performance, package breakdowns, and student lists for {comp.companyName}.
          </p>
        </div>

        {/* Overview KPIs */}
        <div className="wce-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, margin: 0 }}>
          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--primary)", background: "var(--primary-glow)" }}>
              <User size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{comp.totalStudents}</h3>
              <p>Students Placed</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--success)", background: "rgba(16, 185, 129, 0.08)" }}>
              <Award size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{formatLPA(comp.averagePackage)}</h3>
              <p>Average Package</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--accent)", background: "var(--accent-glow)" }}>
              <Award size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{formatLPA(comp.medianPackage)}</h3>
              <p>Median Package</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--secondary)", background: "rgba(138, 63, 252, 0.08)" }}>
              <Award size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{formatLPA(comp.highestPackage)}</h3>
              <p>Highest Package</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--primary)", background: "var(--primary-glow)" }}>
              <Award size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{formatLPA(comp.lowestPackage)}</h3>
              <p>Lowest Package</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--success)", background: "rgba(16, 185, 129, 0.08)" }}>
              <FileSpreadsheet size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{comp.internshipCount}</h3>
              <p>Internships</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--accent)", background: "var(--accent-glow)" }}>
              <Check size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{comp.ppoCount}</h3>
              <p>PPOs Awarded</p>
            </div>
          </div>
        </div>

        {/* Visual Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 30 }}>
          
          <div className="card" style={{ height: 320, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 15, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>Package Distribution</h3>
            <div style={{ flex: 1, position: "relative" }}>
              {raw.packages.length > 0 ? (
                <Doughnut 
                  data={distData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "right", labels: { color: "#475569", font: { family: "Inter", size: 11 } } } }
                  }} 
                />
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60 }}>No packages recorded for chart.</div>
              )}
            </div>
          </div>

          <div className="card" style={{ height: 320, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 15, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>Branch Recruitment Breakdown</h3>
            <div style={{ flex: 1, position: "relative" }}>
              {branchLabels.length > 0 ? (
                <Bar 
                  data={branchData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { display: false }, ticks: { color: "#64748b" } },
                      y: { grid: { color: "rgba(47, 49, 146, 0.05)" }, ticks: { color: "#64748b" } }
                    }
                  }} 
                />
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60 }}>No branch recruitment data available.</div>
              )}
            </div>
          </div>
        </div>

        {/* Internship & PPO Details Card */}
        <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
          <div>
            <h4 style={{ fontSize: 14, color: "var(--primary)", borderBottom: "1px solid var(--border-color)", paddingBottom: 6, marginBottom: 12 }}>Internship Statistics</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div>Total Internships Offered: <strong>{comp.internshipCount}</strong></div>
              <div>PPO Conversion: <strong>{comp.ppoCount}</strong></div>
              <div>Non-PPO Internships: <strong>{comp.internshipCount - comp.ppoCount}</strong></div>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 14, color: "var(--primary)", borderBottom: "1px solid var(--border-color)", paddingBottom: 6, marginBottom: 12 }}>Offer Types Breakdown</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div>Primary (PRIMARY) Offers: <strong>{comp.primaryOffers}</strong></div>
              <div>Secondary (SECONDARY) Offers: <strong>{comp.secondaryOffers}</strong></div>
              <div>Total Placements Offers: <strong>{comp.primaryOffers + comp.secondaryOffers}</strong></div>
            </div>
          </div>
        </div>

        {/* Student Placements Table */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: 18, borderBottom: "1px solid var(--border-color)", paddingBottom: 12, margin: 0 }}>Student Placements & Interns</h3>
          
          {paginatedDetailStudents.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 20 }}>No students found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>PRN</th>
                      <th>Branch</th>
                      <th>Gender</th>
                      <th>Placement Offers</th>
                      <th>Internship Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDetailStudents.map(student => {
                      return (
                        <tr key={student._id}>
                          <td style={{ fontWeight: 600 }}>{student.name}</td>
                          <td>{student.prn}</td>
                          <td>{student.branch}</td>
                          <td>{student.gender}</td>
                          <td>
                            {student.offers && student.offers.length > 0 ? (
                              student.offers.map((o, oIdx) => (
                                <div key={oIdx} style={{ marginBottom: 4 }}>
                                  <strong>{o.offerType} Offer</strong>: {formatLPA(o.packageLpa)}
                                </div>
                              ))
                            ) : "—"}
                          </td>
                          <td>
                            {student.internships && student.internships.length > 0 ? (
                              student.internships.map((i, iIdx) => (
                                <div key={iIdx}>
                                  <strong>Intern</strong>: {i.stipend ? `₹${i.stipend.toLocaleString()}/mo` : "Yes"} (PPO: {i.ppo})
                                </div>
                              ))
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {detailPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
                  <button 
                    disabled={detailStudentPage === 1}
                    onClick={() => setDetailStudentPage(p => Math.max(1, p - 1))}
                    className="btn btn-secondary"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    Page <strong>{detailStudentPage}</strong> of {detailPages}
                  </span>
                  <button 
                    disabled={detailStudentPage === detailPages}
                    onClick={() => setDetailStudentPage(p => Math.min(detailPages, p + 1))}
                    className="btn btn-secondary"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    );
  }

  // --- RENDER MAIN COMPANIES LIST TABLE ---
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: 12 }}>
        <h2 style={{ fontSize: 20 }}>Companies Placement Analytics</h2>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Unique Recruiting Companies: <strong>{total}</strong>
        </span>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search company name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: 32, height: 38 }}
          />
          <Search size={12} style={{ position: "absolute", left: 10, top: 13, color: "var(--text-muted)" }} />
        </div>
      </div>

      {paginatedCompanies.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40 }}>
          No recruiting companies found matching your search.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th style={{ textAlign: "center" }}>Total Students</th>
                  <th>Average Package</th>
                  <th>Median Package</th>
                  <th>Highest Package</th>
                  <th>Lowest Package</th>
                  <th style={{ textAlign: "center" }}>Internship Count</th>
                  <th style={{ textAlign: "center" }}>PPO Count</th>
                  <th style={{ textAlign: "center" }}>Primary Offers</th>
                  <th style={{ textAlign: "center" }}>Secondary Offers</th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCompanies.map((c, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{c.companyName}</td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{c.totalStudents}</td>
                    <td style={{ fontWeight: 600, color: "var(--primary)" }}>{formatLPA(c.averagePackage)}</td>
                    <td>{formatLPA(c.medianPackage)}</td>
                    <td>{formatLPA(c.highestPackage)}</td>
                    <td>{formatLPA(c.lowestPackage)}</td>
                    <td style={{ textAlign: "center" }}>{c.internshipCount}</td>
                    <td style={{ textAlign: "center", fontWeight: 600, color: c.ppoCount > 0 ? "var(--success)" : "var(--text-muted)" }}>{c.ppoCount}</td>
                    <td style={{ textAlign: "center" }}>{c.primaryOffers}</td>
                    <td style={{ textAlign: "center" }}>{c.secondaryOffers}</td>
                    <td style={{ textAlign: "center" }}>
                      <button 
                        onClick={() => setSelectedCompany(c)}
                        className="btn btn-secondary"
                        style={{ padding: "4px 10px", fontSize: 11, height: 28 }}
                      >
                        Analyze Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 10 }}>
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                Previous
              </button>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Page <strong>{currentPage}</strong> of {pages}
              </span>
              <button 
                disabled={currentPage === pages}
                onClick={() => setCurrentPage(p => Math.min(pages, p + 1))}
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminBranchAnalytics() {
  const { token, API_URL, showToast } = useAppContext();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/admin/students`, {
        headers: authHeaders.headers,
        params: { limit: 100000 }
      });
      setStudents(res.data.students || []);
    } catch (err) {
      console.error("Error loading branch analytics:", err);
      showToast("Failed to fetch student placements", "error");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate branch stats dynamically
  const calculateMedian = (arr) => {
    if (!arr || arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  };

  const branchMap = {};
  students.forEach(s => {
    const branchName = s.branch || "Unknown";
    if (!branchMap[branchName]) {
      branchMap[branchName] = {
        name: branchName,
        totalStudents: 0,
        placedStudents: 0,
        packages: [],
        internships: 0,
        ppos: 0,
        multipleOffers: 0,
        companiesSet: new Set()
      };
    }
    const b = branchMap[branchName];
    b.totalStudents++;
    
    if (s.offers && s.offers.length > 0) {
      b.placedStudents++;
      if (s.offers.length > 1) {
        b.multipleOffers++;
      }
      s.offers.forEach(o => {
        if (typeof o.packageLpa === "number") {
          b.packages.push(o.packageLpa);
        }
        if (o.companyName) {
          b.companiesSet.add(o.companyName);
        }
      });
    }

    s.internships?.forEach(i => {
      b.internships++;
      if (i.ppo === "Yes") {
        b.ppos++;
      }
      if (i.companyName) {
        b.companiesSet.add(i.companyName);
      }
    });
  });

  const branchStatsList = Object.keys(branchMap).map(name => {
    const b = branchMap[name];
    const pkgs = b.packages;
    const avgPkg = pkgs.length > 0 ? (pkgs.reduce((x, y) => x + y, 0) / pkgs.length) : null;
    const maxPkg = pkgs.length > 0 ? Math.max(...pkgs) : null;
    const minPkg = pkgs.length > 0 ? Math.min(...pkgs) : null;
    const medianPkg = calculateMedian(pkgs);
    const placementPct = b.totalStudents > 0 ? parseFloat(((b.placedStudents / b.totalStudents) * 100).toFixed(2)) : 0;

    return {
      branchName: name,
      totalStudents: b.totalStudents,
      placedStudents: b.placedStudents,
      placementPercentage: placementPct,
      averagePackage: avgPkg,
      medianPackage: medianPkg,
      highestPackage: maxPkg,
      lowestPackage: minPkg,
      internshipCount: b.internships,
      ppoCount: b.ppos,
      multipleOfferCount: b.multipleOffers,
      companyCount: b.companiesSet.size,
      companiesList: [...b.companiesSet].sort()
    };
  }).sort((a, b) => b.totalStudents - a.totalStudents);

  const formatLPA = (val) => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return `${parseFloat(Number(val).toFixed(2))} LPA`;
  };

  const hasData = branchStatsList.length > 0;

  // Chart 1: Package Comparison Chart (Average vs Highest Package)
  const packageComparisonData = hasData ? {
    labels: branchStatsList.map(b => b.branchName),
    datasets: [
      {
        label: "Average Package (LPA)",
        data: branchStatsList.map(b => b.averagePackage || 0),
        backgroundColor: "rgba(6, 182, 212, 0.75)",
        borderColor: "#06b6d4",
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: "Highest Package (LPA)",
        data: branchStatsList.map(b => b.highestPackage || 0),
        backgroundColor: "rgba(47, 49, 146, 0.75)",
        borderColor: "#2f3192",
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  } : null;

  // Chart 2: Placement Percentage Chart
  const placementPercentageData = hasData ? {
    labels: branchStatsList.map(b => b.branchName),
    datasets: [
      {
        label: "Placement Rate (%)",
        data: branchStatsList.map(b => b.placementPercentage),
        backgroundColor: "rgba(16, 185, 129, 0.75)",
        borderColor: "#10b981",
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  } : null;

  // Chart 3: Company Distribution (Unique Recruiter count per branch)
  const companyDistributionData = hasData ? {
    labels: branchStatsList.map(b => b.branchName),
    datasets: [
      {
        label: "Recruiting Companies Visited",
        data: branchStatsList.map(b => b.companyCount),
        backgroundColor: "rgba(138, 63, 252, 0.75)",
        borderColor: "#8a3ffc",
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#475569",
          font: { family: "Inter", size: 11, weight: 500 }
        }
      },
      tooltip: {
        backgroundColor: "#2f3192",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        padding: 10,
        cornerRadius: 6
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748b", font: { family: "Inter" } }
      },
      y: {
        grid: { color: "rgba(47, 49, 146, 0.05)" },
        ticks: { color: "#64748b", font: { family: "Inter" } }
      }
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>Loading branch statistics...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      
      {/* Table Comparison Card */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: 12 }}>
          <h2 style={{ fontSize: 20 }}>Branch Comparison Placement Table</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            Overview metrics across all academic departments.
          </p>
        </div>

        {!hasData ? (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40 }}>No branch recruitment data available.</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th style={{ textAlign: "center" }}>Total Students</th>
                  <th style={{ textAlign: "center" }}>Placed Students</th>
                  <th style={{ textAlign: "center" }}>Placement Rate</th>
                  <th>Average Package</th>
                  <th>Median Package</th>
                  <th>Highest Package</th>
                  <th>Lowest Package</th>
                  <th style={{ textAlign: "center" }}>Internship Count</th>
                  <th style={{ textAlign: "center" }}>PPO Count</th>
                  <th style={{ textAlign: "center" }}>Multiple Offers</th>
                </tr>
              </thead>
              <tbody>
                {branchStatsList.map((b, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{b.branchName}</td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{b.totalStudents}</td>
                    <td style={{ textAlign: "center" }}>{b.placedStudents}</td>
                    <td style={{ textAlign: "center", fontWeight: 600, color: "var(--accent)" }}>{b.placementPercentage}%</td>
                    <td style={{ fontWeight: 600, color: "var(--primary)" }}>{formatLPA(b.averagePackage)}</td>
                    <td>{formatLPA(b.medianPackage)}</td>
                    <td>{formatLPA(b.highestPackage)}</td>
                    <td>{formatLPA(b.lowestPackage)}</td>
                    <td style={{ textAlign: "center" }}>{b.internshipCount}</td>
                    <td style={{ textAlign: "center", fontWeight: 600, color: b.ppoCount > 0 ? "var(--success)" : "var(--text-muted)" }}>{b.ppoCount}</td>
                    <td style={{ textAlign: "center" }}>{b.multipleOfferCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visual Comparison Charts */}
      {hasData && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 30 }}>
          
          {/* Package Comparison Chart */}
          <div className="card" style={{ height: 320, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 15, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>Salary Package Comparison</h3>
            <div style={{ flex: 1, position: "relative" }}>
              <Bar data={packageComparisonData} options={chartOptions} />
            </div>
          </div>

          {/* Placement Percentage Chart */}
          <div className="card" style={{ height: 320, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 15, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>Placement Rates (%) by Branch</h3>
            <div style={{ flex: 1, position: "relative" }}>
              <Bar data={placementPercentageData} options={chartOptions} />
            </div>
          </div>

          {/* Company Distribution Chart */}
          <div className="card" style={{ height: 320, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 15, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>Unique Recruiters by Branch</h3>
            <div style={{ flex: 1, position: "relative" }}>
              <Bar data={companyDistributionData} options={chartOptions} />
            </div>
          </div>

          {/* Recruiter Names by Branch details block */}
          <div className="card" style={{ minHeight: 320, display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ fontSize: 15, borderBottom: "1px solid var(--border-color)", paddingBottom: 10, margin: 0 }}>Company Recruitment Breakdown</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 }}>
              {branchStatsList.map((b, idx) => (
                <div key={idx} style={{ padding: "8px 12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.01)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <strong>{b.branchName}</strong>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {b.companyCount} Recruiter(s)
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
                    {b.companiesList.length > 0 ? b.companiesList.join(", ") : "No recruiters recorded"}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

function AdminInternshipAnalytics() {
  const { token, API_URL, showToast } = useAppContext();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [internshipsPage, setInternshipsPage] = useState(1);
  const [companiesPage, setCompaniesPage] = useState(1);
  const itemsPerPage = 5;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/admin/students`, {
        headers: authHeaders.headers,
        params: { limit: 100000 }
      });
      setStudents(res.data.students || []);
    } catch (err) {
      console.error("Error loading internship analytics:", err);
      showToast("Failed to fetch internship records", "error");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate internship stats dynamically
  const internshipList = [];
  const stipendList = [];
  const companyInternMap = {};
  let ppoCount = 0;

  students.forEach(s => {
    s.internships?.forEach(i => {
      internshipList.push({
        studentName: s.name,
        branch: s.branch,
        companyName: i.companyName || "—",
        startDate: i.startDate || null,
        endDate: i.endDate || null,
        stipend: i.stipend !== undefined && i.stipend !== null ? i.stipend : null,
        ppo: i.ppo || "No",
        status: i.status || "Active"
      });

      if (typeof i.stipend === "number") {
        stipendList.push(i.stipend);
      }

      if (i.ppo === "Yes") {
        ppoCount++;
      }

      const company = (i.companyName || "Unknown").trim();
      if (!companyInternMap[company]) {
        companyInternMap[company] = {
          name: company,
          internsCount: 0,
          stipends: [],
          ppoCount: 0
        };
      }
      const comp = companyInternMap[company];
      comp.internsCount++;
      if (typeof i.stipend === "number") {
        comp.stipends.push(i.stipend);
      }
      if (i.ppo === "Yes") {
        comp.ppoCount++;
      }
    });
  });

  const totalInternships = internshipList.length;
  const averageStipend = stipendList.length > 0 ? (stipendList.reduce((a, b) => a + b, 0) / stipendList.length) : null;
  const highestStipend = stipendList.length > 0 ? Math.max(...stipendList) : null;
  const uniqueCompaniesCount = Object.keys(companyInternMap).length;

  const companyAnalyticsList = Object.keys(companyInternMap).map(name => {
    const comp = companyInternMap[name];
    const avg = comp.stipends.length > 0 ? (comp.stipends.reduce((a,b) => a+b, 0) / comp.stipends.length) : null;
    const max = comp.stipends.length > 0 ? Math.max(...comp.stipends) : null;
    return {
      companyName: name,
      internsCount: comp.internsCount,
      averageStipend: avg,
      highestStipend: max,
      ppoCount: comp.ppoCount
    };
  }).sort((a, b) => b.internsCount - a.internsCount);

  // Formatting helpers
  const formatStipend = (val) => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return `₹${parseFloat(Number(val).toFixed(2)).toLocaleString()}/mo`;
  };

  const formatDate = (val) => {
    if (!val) return "—";
    return new Date(val).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  // Paginated lists
  const intPages = Math.ceil(totalInternships / itemsPerPage);
  const paginatedInternships = internshipList.slice((internshipsPage - 1) * itemsPerPage, internshipsPage * itemsPerPage);

  const compTotal = companyAnalyticsList.length;
  const compPages = Math.ceil(compTotal / itemsPerPage);
  const paginatedCompanies = companyAnalyticsList.slice((companiesPage - 1) * itemsPerPage, companiesPage * itemsPerPage);

  if (loading) {
    return <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>Loading internship analytics...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      
      {/* KPIs Grid */}
      <div className="wce-stats-grid" style={{ margin: 0, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <div className="wce-stat-card">
          <div className="wce-stat-icon-wrapper" style={{ color: "var(--primary)", background: "var(--primary-glow)" }}>
            <FileText size={20} />
          </div>
          <div className="wce-stat-info">
            <h3>{totalInternships}</h3>
            <p>Total Internships</p>
          </div>
        </div>

        <div className="wce-stat-card">
          <div className="wce-stat-icon-wrapper" style={{ color: "var(--success)", background: "rgba(16, 185, 129, 0.08)" }}>
            <Award size={20} />
          </div>
          <div className="wce-stat-info">
            <h3>{formatStipend(averageStipend)}</h3>
            <p>Average Stipend</p>
          </div>
        </div>

        <div className="wce-stat-card">
          <div className="wce-stat-icon-wrapper" style={{ color: "var(--accent)", background: "var(--accent-glow)" }}>
            <TrendingUp size={20} />
          </div>
          <div className="wce-stat-info">
            <h3>{formatStipend(highestStipend)}</h3>
            <p>Highest Stipend</p>
          </div>
        </div>

        <div className="wce-stat-card">
          <div className="wce-stat-icon-wrapper" style={{ color: "var(--secondary)", background: "rgba(138, 63, 252, 0.08)" }}>
            <Briefcase size={20} />
          </div>
          <div className="wce-stat-info">
            <h3>{uniqueCompaniesCount}</h3>
            <p>Internship Companies</p>
          </div>
        </div>

        <div className="wce-stat-card">
          <div className="wce-stat-icon-wrapper" style={{ color: "var(--success)", background: "rgba(16, 185, 129, 0.08)" }}>
            <Check size={20} />
          </div>
          <div className="wce-stat-info">
            <h3>{ppoCount}</h3>
            <p>PPO Count</p>
          </div>
        </div>

        <div className="wce-stat-card">
          <div className="wce-stat-icon-wrapper" style={{ color: "var(--accent)", background: "var(--accent-glow)" }}>
            <Check size={20} />
          </div>
          <div className="wce-stat-info">
            <h3>{ppoCount}</h3>
            <p>Internship + PPO Count</p>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: 30 }}>
        
        {/* Internships Registry Table */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: 18, borderBottom: "1px solid var(--border-color)", paddingBottom: 12, margin: 0 }}>Internships Registry</h3>
          
          {paginatedInternships.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40 }}>No internship records found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
              <div className="table-container" style={{ flex: 1 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Branch</th>
                      <th>Company</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Stipend</th>
                      <th>PPO</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInternships.map((int, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{int.studentName}</td>
                        <td>{int.branch}</td>
                        <td style={{ fontWeight: 600 }}>{int.companyName}</td>
                        <td>{formatDate(int.startDate)}</td>
                        <td>{formatDate(int.endDate)}</td>
                        <td style={{ fontWeight: 600, color: "var(--primary)" }}>{formatStipend(int.stipend)}</td>
                        <td style={{ fontWeight: 600, color: int.ppo === "Yes" ? "var(--success)" : "var(--text-secondary)" }}>{int.ppo}</td>
                        <td>
                          <span className="tag" style={{ 
                            background: int.status === "Active" ? "rgba(16, 185, 129, 0.12)" : "rgba(71, 85, 105, 0.1)",
                            color: int.status === "Active" ? "var(--success)" : "var(--text-secondary)",
                            border: "none",
                            fontWeight: 600
                          }}>
                            {int.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {intPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
                  <button 
                    disabled={internshipsPage === 1}
                    onClick={() => setInternshipsPage(p => Math.max(1, p - 1))}
                    className="btn btn-secondary"
                    style={{ padding: "4px 10px", fontSize: 11 }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Page <strong>{internshipsPage}</strong> of {intPages}
                  </span>
                  <button 
                    disabled={internshipsPage === intPages}
                    onClick={() => setInternshipsPage(p => Math.min(intPages, p + 1))}
                    className="btn btn-secondary"
                    style={{ padding: "4px 10px", fontSize: 11 }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Company Analytics Table */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: 18, borderBottom: "1px solid var(--border-color)", paddingBottom: 12, margin: 0 }}>Company Recruiter Intern Stats</h3>
          
          {paginatedCompanies.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40 }}>No recruiter intern stats available.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
              <div className="table-container" style={{ flex: 1 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company Name</th>
                      <th style={{ textAlign: "center" }}>Interns</th>
                      <th>Average Stipend</th>
                      <th>Highest Stipend</th>
                      <th style={{ textAlign: "center" }}>PPO Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCompanies.map((c, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{c.companyName}</td>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>{c.internsCount}</td>
                        <td style={{ fontWeight: 600, color: "var(--primary)" }}>{formatStipend(c.averageStipend)}</td>
                        <td>{formatStipend(c.highestStipend)}</td>
                        <td style={{ textAlign: "center", fontWeight: 600, color: c.ppoCount > 0 ? "var(--success)" : "var(--text-muted)" }}>{c.ppoCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {compPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
                  <button 
                    disabled={companiesPage === 1}
                    onClick={() => setCompaniesPage(p => Math.max(1, p - 1))}
                    className="btn btn-secondary"
                    style={{ padding: "4px 10px", fontSize: 11 }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Page <strong>{companiesPage}</strong> of {compPages}
                  </span>
                  <button 
                    disabled={companiesPage === compPages}
                    onClick={() => setCompaniesPage(p => Math.min(compPages, p + 1))}
                    className="btn btn-secondary"
                    style={{ padding: "4px 10px", fontSize: 11 }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

function AdminStudentPlacements() {
  const { token, API_URL, showToast } = useAppContext();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & sorting & filters
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedInternship, setSelectedInternship] = useState("");
  const [selectedPackageRange, setSelectedPackageRange] = useState("");
  
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected student details & offers modals
  const [detailStudent, setDetailStudent] = useState(null);
  const [offersStudent, setOffersStudent] = useState(null);
  
  // Edit student record state
  const [editStudent, setEditStudent] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/admin/students`, {
        headers: authHeaders.headers,
        params: { limit: 100000 }
      });
      setStudents(res.data.students || []);
    } catch (err) {
      console.error("Error loading student placements list:", err);
      showToast("Failed to fetch students list", "error");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract filter options dynamically
  const branches = [...new Set(students.map(s => s.branch).filter(Boolean))].sort();
  const companyNamesSet = new Set();
  students.forEach(s => {
    s.offers?.forEach(o => { if (o.companyName) companyNamesSet.add(o.companyName); });
    s.internships?.forEach(i => { if (i.companyName) companyNamesSet.add(i.companyName); });
  });
  const companies = [...companyNamesSet].sort();

  const handleEditClick = (student) => {
    const primaryOffer = student.offers?.find(o => o.offerType === "PRIMARY") || student.offers?.[0] || {};
    const secondaryOffer = student.offers?.find(o => o.offerType === "SECONDARY") || student.offers?.[1] || {};
    const internship = student.internships?.[0] || {};

    setEditStudent({
      _id: student._id,
      prn: student.prn,
      name: student.name,
      branch: student.branch,
      gender: student.gender,
      personalEmail: student.personalEmail || "",
      collegeEmail: student.collegeEmail || "",
      phone: student.phone || "",
      
      company1: primaryOffer.companyName || "",
      salary1: primaryOffer.packageLpa !== undefined ? primaryOffer.packageLpa : "",
      company1Status: primaryOffer.placementStatus || "Placed",
      
      company2: secondaryOffer.companyName || "",
      salary2: secondaryOffer.packageLpa !== undefined ? secondaryOffer.packageLpa : "",
      company2Status: secondaryOffer.placementStatus || "Placed",
      
      internshipOffered: student.internships && student.internships.length > 0 ? "Yes" : "No",
      internshipCompany: internship.companyName || "",
      stipend: internship.stipend !== undefined ? internship.stipend : "",
      ppo: internship.ppo || "No",
      internshipStatus: internship.status || "Active"
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editStudent.name || !editStudent.prn || !editStudent.branch || !editStudent.gender) {
      showToast("Please fill all required fields", "error");
      return;
    }
    setEditLoading(true);
    try {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      
      const offers = [];
      if (editStudent.company1) {
        offers.push({
          companyName: editStudent.company1,
          packageLpa: editStudent.salary1 !== "" ? Number(editStudent.salary1) : undefined,
          offerType: "PRIMARY",
          placementStatus: editStudent.company1Status || "Placed"
        });
      }
      if (editStudent.company2) {
        offers.push({
          companyName: editStudent.company2,
          packageLpa: editStudent.salary2 !== "" ? Number(editStudent.salary2) : undefined,
          offerType: "SECONDARY",
          placementStatus: editStudent.company2Status || "Placed"
        });
      }

      const internships = [];
      if (editStudent.internshipOffered === "Yes" && editStudent.internshipCompany) {
        internships.push({
          companyName: editStudent.internshipCompany,
          stipend: editStudent.stipend !== "" ? Number(editStudent.stipend) : undefined,
          ppo: editStudent.ppo || "No",
          status: editStudent.internshipStatus || "Active"
        });
      }

      const payload = {
        name: editStudent.name,
        branch: editStudent.branch,
        gender: editStudent.gender,
        personalEmail: editStudent.personalEmail,
        collegeEmail: editStudent.collegeEmail,
        phone: editStudent.phone,
        offers,
        internships
      };

      await axios.put(`${API_URL}/admin/students/${editStudent._id}`, payload, authHeaders);
      showToast("Student placement record updated successfully!");
      setEditStudent(null);
      loadData();
    } catch (err) {
      console.error("Error updating student record:", err);
      showToast(err.response?.data?.message || "Failed to update record", "error");
    } finally {
      setEditLoading(false);
    }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student placement record?")) return;
    try {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/admin/students/${id}`, authHeaders);
      showToast("Student record deleted successfully!");
      loadData();
    } catch (err) {
      console.error("Error deleting student:", err);
      showToast("Failed to delete student record", "error");
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(order => order === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Perform dynamic filtering in-memory
  const filteredStudents = students.filter(student => {
    if (search.trim()) {
      const term = search.toLowerCase();
      const nameMatch = student.name?.toLowerCase().includes(term);
      const prnMatch = student.prn?.toLowerCase().includes(term);
      const compMatch = student.offers?.some(o => o.companyName?.toLowerCase().includes(term)) ||
                        student.internships?.some(i => i.companyName?.toLowerCase().includes(term));
      if (!nameMatch && !prnMatch && !compMatch) return false;
    }

    if (selectedBranch && student.branch !== selectedBranch) return false;

    if (selectedCompany) {
      const hasComp = student.offers?.some(o => o.companyName === selectedCompany) ||
                      student.internships?.some(i => i.companyName === selectedCompany);
      if (!hasComp) return false;
    }

    if (selectedStatus) {
      const isPlaced = student.offers && student.offers.length > 0;
      if (selectedStatus === "Placed" && !isPlaced) return false;
      if (selectedStatus === "Unplaced" && isPlaced) return false;
    }

    if (selectedInternship) {
      const hasIntern = student.internships && student.internships.length > 0;
      if (selectedInternship === "Yes" && !hasIntern) return false;
      if (selectedInternship === "No" && hasIntern) return false;
    }

    if (selectedPackageRange) {
      const maxPackage = student.offers && student.offers.length > 0 
        ? Math.max(...student.offers.map(o => o.packageLpa).filter(p => typeof p === 'number'))
        : 0;
      if (selectedPackageRange === "< 5" && (maxPackage === 0 || maxPackage >= 5)) return false;
      if (selectedPackageRange === "5-10" && (maxPackage < 5 || maxPackage >= 10)) return false;
      if (selectedPackageRange === "10-15" && (maxPackage < 10 || maxPackage >= 15)) return false;
      if (selectedPackageRange === "> 15" && maxPackage < 15) return false;
    }

    return true;
  });

  // Perform dynamic sorting in-memory
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === "primaryPackage") {
      const primaryA = a.offers?.find(o => o.offerType === "PRIMARY") || a.offers?.[0];
      const primaryB = b.offers?.find(o => o.offerType === "PRIMARY") || b.offers?.[0];
      aVal = primaryA ? (primaryA.packageLpa !== undefined ? primaryA.packageLpa : -1) : -1;
      bVal = primaryB ? (primaryB.packageLpa !== undefined ? primaryB.packageLpa : -1) : -1;
    } 
    else if (sortField === "secondaryPackage") {
      const secondaryA = a.offers?.find(o => o.offerType === "SECONDARY") || a.offers?.[1];
      const secondaryB = b.offers?.find(o => o.offerType === "SECONDARY") || b.offers?.[1];
      aVal = secondaryA ? (secondaryA.packageLpa !== undefined ? secondaryA.packageLpa : -1) : -1;
      bVal = secondaryB ? (secondaryB.packageLpa !== undefined ? secondaryB.packageLpa : -1) : -1;
    }

    if (aVal === undefined || aVal === null) aVal = "";
    if (bVal === undefined || bVal === null) bVal = "";

    if (typeof aVal === "string") {
      return sortOrder === "asc" 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    } else {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }
  });

  const total = sortedStudents.length;
  const pages = Math.ceil(total / itemsPerPage);
  const paginatedStudents = sortedStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatLPA = (val) => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return `${parseFloat(Number(val).toFixed(2))} LPA`;
  };

  const formatDate = (val) => {
    if (!val) return "—";
    return new Date(val).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedBranch("");
    setSelectedCompany("");
    setSelectedStatus("");
    setSelectedInternship("");
    setSelectedPackageRange("");
    setCurrentPage(1);
  };

  if (loading) {
    return <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>Loading student placements list...</div>;
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: 12 }}>
        <h2 style={{ fontSize: 20 }}>Student Placements Registry</h2>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Matched Students Count: <strong>{total}</strong>
        </span>
      </div>

      {/* Query Filter panel */}
      <div className="filter-bar" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, margin: 0, padding: 0, border: "none", background: "none" }}>
        
        <div className="form-group">
          <label>Search Student Name / PRN</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search registry..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: 32, height: 38 }}
            />
            <Search size={12} style={{ position: "absolute", left: 10, top: 13, color: "var(--text-muted)" }} />
          </div>
        </div>

        <div className="form-group">
          <label>Filter Branch</label>
          <select
            className="form-control"
            value={selectedBranch}
            onChange={(e) => { setSelectedBranch(e.target.value); setCurrentPage(1); }}
            style={{ height: 38 }}
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Filter Company</label>
          <select
            className="form-control"
            value={selectedCompany}
            onChange={(e) => { setSelectedCompany(e.target.value); setCurrentPage(1); }}
            style={{ height: 38 }}
          >
            <option value="">All Companies</option>
            {companies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Placement Status</label>
          <select
            className="form-control"
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            style={{ height: 38 }}
          >
            <option value="">All Statuses</option>
            <option value="Placed">Placed</option>
            <option value="Unplaced">Unplaced</option>
          </select>
        </div>

        <div className="form-group">
          <label>Internship Offered</label>
          <select
            className="form-control"
            value={selectedInternship}
            onChange={(e) => { setSelectedInternship(e.target.value); setCurrentPage(1); }}
            style={{ height: 38 }}
          >
            <option value="">All Internships</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>

        <div className="form-group">
          <label>Package Range</label>
          <select
            className="form-control"
            value={selectedPackageRange}
            onChange={(e) => { setSelectedPackageRange(e.target.value); setCurrentPage(1); }}
            style={{ height: 38 }}
          >
            <option value="">All Packages</option>
            <option value="< 5">&lt; 5 LPA</option>
            <option value="5-10">5 - 10 LPA</option>
            <option value="10-15">10 - 15 LPA</option>
            <option value="> 15">&gt; 15 LPA</option>
          </select>
        </div>

      </div>

      {(search || selectedBranch || selectedCompany || selectedStatus || selectedInternship || selectedPackageRange) && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleResetFilters}
            style={{ padding: "6px 16px", fontSize: 12 }}
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Main Student Placement Grid */}
      {paginatedStudents.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40 }}>
          No student placement records found in database registry matching filters.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("name")}>
                    Student Name {sortField === "name" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("prn")}>
                    PRN {sortField === "prn" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("branch")}>
                    Branch {sortField === "branch" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th>Gender</th>
                  <th>Primary Company</th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("primaryPackage")}>
                    Primary Package {sortField === "primaryPackage" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th>Secondary Company</th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("secondaryPackage")}>
                    Secondary Package {sortField === "secondaryPackage" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th style={{ textAlign: "center" }}>Internship</th>
                  <th>Placement Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((student, idx) => {
                  const primaryOffer = student.offers?.find(o => o.offerType === "PRIMARY") || student.offers?.[0] || {};
                  const secondaryOffer = student.offers?.find(o => o.offerType === "SECONDARY") || student.offers?.[1] || {};
                  const isPlaced = student.offers && student.offers.length > 0;
                  const hasIntern = student.internships && student.internships.length > 0;

                  return (
                    <tr key={student._id}>
                      <td style={{ fontWeight: 600 }}>{student.name}</td>
                      <td style={{ fontWeight: 500 }}>{student.prn}</td>
                      <td>{student.branch}</td>
                      <td>{student.gender}</td>
                      
                      {/* Primary Company & Package */}
                      <td style={{ fontWeight: 600 }}>{primaryOffer.companyName || "—"}</td>
                      <td style={{ fontWeight: 600, color: primaryOffer.packageLpa ? "var(--primary)" : "var(--text-secondary)" }}>{formatLPA(primaryOffer.packageLpa)}</td>
                      
                      {/* Secondary Company & Package */}
                      <td style={{ fontWeight: 600 }}>{secondaryOffer.companyName || "—"}</td>
                      <td style={{ fontWeight: 600, color: secondaryOffer.packageLpa ? "var(--primary)" : "var(--text-secondary)" }}>{formatLPA(secondaryOffer.packageLpa)}</td>
                      
                      {/* Internship Offered flag */}
                      <td style={{ textAlign: "center", fontWeight: 600, color: hasIntern ? "var(--success)" : "var(--text-secondary)" }}>
                        {hasIntern ? "Yes" : "No"}
                      </td>
                      
                      {/* Placement status badge */}
                      <td>
                        <span className="tag" style={{ 
                          background: isPlaced ? "rgba(16, 185, 129, 0.12)" : "rgba(71, 85, 105, 0.1)",
                          color: isPlaced ? "var(--success)" : "var(--text-secondary)",
                          border: "none",
                          fontWeight: 600
                        }}>
                          {isPlaced ? "Placed" : "Unplaced"}
                        </span>
                      </td>
                      
                      {/* Actions */}
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button 
                            onClick={() => setDetailStudent(student)}
                            className="btn btn-secondary" 
                            style={{ padding: "4px 8px", fontSize: 11, height: 26 }}
                            title="View Personal/Placement details"
                          >
                            <Eye size={11} />
                          </button>
                          <button 
                            onClick={() => handleEditClick(student)}
                            className="btn btn-secondary" 
                            style={{ padding: "4px 8px", fontSize: 11, height: 26 }}
                            title="Edit student record"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button 
                            onClick={() => setOffersStudent(student)}
                            className="btn btn-secondary" 
                            style={{ padding: "4px 8px", fontSize: 11, height: 26 }}
                            title="View job offers list"
                          >
                            <Award size={11} />
                          </button>
                          <button 
                            onClick={() => deleteRecord(student._id)}
                            className="btn btn-danger" 
                            style={{ padding: "4px 8px", fontSize: 11, height: 26 }}
                            title="Delete student placement"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 10 }}>
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                Previous
              </button>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Page <strong>{currentPage}</strong> of {pages}
              </span>
              <button 
                disabled={currentPage === pages}
                onClick={() => setCurrentPage(p => Math.min(pages, p + 1))}
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit Student Modal Overlay */}
      {editStudent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18 }}>Edit Student Placement Record</h3>
              <button 
                onClick={() => setEditStudent(null)} 
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="form-row-2col">
                <div className="form-group">
                  <label>Full Name <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={editStudent.name}
                    onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>PRN <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={editStudent.prn}
                    onChange={(e) => setEditStudent({ ...editStudent, prn: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label>Branch <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={editStudent.branch}
                    onChange={(e) => setEditStudent({ ...editStudent, branch: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Gender <span style={{ color: "var(--danger)" }}>*</span></label>
                  <select
                    className="form-control"
                    value={editStudent.gender}
                    onChange={(e) => setEditStudent({ ...editStudent, gender: e.target.value })}
                    required
                    style={{ height: 38 }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                <h4 style={{ fontSize: 14, marginBottom: 12, color: "var(--primary)" }}>Placement Offers</h4>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Company 1 (Primary)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStudent.company1}
                      onChange={(e) => setEditStudent({ ...editStudent, company1: e.target.value })}
                      placeholder="e.g. Seagate"
                    />
                  </div>
                  <div className="form-group">
                    <label>Salary Package 1 (LPA)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={editStudent.salary1}
                      onChange={(e) => setEditStudent({ ...editStudent, salary1: e.target.value })}
                      placeholder="e.g. 12"
                    />
                  </div>
                </div>
                <div className="form-row-2col" style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label>Company 2 (Secondary)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStudent.company2}
                      onChange={(e) => setEditStudent({ ...editStudent, company2: e.target.value })}
                      placeholder="e.g. Google"
                    />
                  </div>
                  <div className="form-group">
                    <label>Salary Package 2 (LPA)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={editStudent.salary2}
                      onChange={(e) => setEditStudent({ ...editStudent, salary2: e.target.value })}
                      placeholder="e.g. 30"
                    />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                <h4 style={{ fontSize: 14, marginBottom: 12, color: "var(--primary)" }}>Internship Details</h4>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Internship Offered</label>
                    <select
                      className="form-control"
                      value={editStudent.internshipOffered}
                      onChange={(e) => setEditStudent({ ...editStudent, internshipOffered: e.target.value })}
                      style={{ height: 38 }}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Internship Company</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStudent.internshipCompany}
                      onChange={(e) => setEditStudent({ ...editStudent, internshipCompany: e.target.value })}
                      placeholder="e.g. Seagate"
                    />
                  </div>
                </div>
                <div className="form-row-2col" style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label>Internship Stipend (₹/month)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editStudent.stipend}
                      onChange={(e) => setEditStudent({ ...editStudent, stipend: e.target.value })}
                      placeholder="e.g. 35000"
                    />
                  </div>
                  <div className="form-group">
                    <label>PPO Status</label>
                    <select
                      className="form-control"
                      value={editStudent.ppo}
                      onChange={(e) => setEditStudent({ ...editStudent, ppo: e.target.value })}
                      style={{ height: 38 }}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                <h4 style={{ fontSize: 14, marginBottom: 12, color: "var(--primary)" }}>Contact Information</h4>
                <div className="form-row-3col">
                  <div className="form-group">
                    <label>Personal Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editStudent.personalEmail}
                      onChange={(e) => setEditStudent({ ...editStudent, personalEmail: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>College Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editStudent.collegeEmail}
                      onChange={(e) => setEditStudent({ ...editStudent, collegeEmail: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStudent.phone}
                      onChange={(e) => setEditStudent({ ...editStudent, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
                <button 
                  type="button" 
                  onClick={() => setEditStudent(null)}
                  className="btn btn-secondary"
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={editLoading}
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detailed Info Modal */}
      {detailStudent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18 }}>Student Placement Profile</h3>
              <button 
                onClick={() => setDetailStudent(null)} 
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Personal Info */}
              <div>
                <h4 style={{ fontSize: 14, color: "var(--primary)", borderBottom: "1px solid var(--border-color)", paddingBottom: 6, marginBottom: 10 }}>
                  Personal Information
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                  <div>Name: <strong>{detailStudent.name}</strong></div>
                  <div>PRN: <strong>{detailStudent.prn}</strong></div>
                  <div>Branch: <strong>{detailStudent.branch}</strong></div>
                  <div>Gender: <strong>{detailStudent.gender}</strong></div>
                  <div>Personal Mail: <strong>{detailStudent.personalEmail || "—"}</strong></div>
                  <div>College Mail: <strong>{detailStudent.collegeEmail || "—"}</strong></div>
                  <div>Phone No: <strong>{detailStudent.phone || "—"}</strong></div>
                </div>
              </div>

              {/* Active Offers */}
              <div>
                <h4 style={{ fontSize: 14, color: "var(--primary)", borderBottom: "1px solid var(--border-color)", paddingBottom: 6, marginBottom: 10 }}>
                  Active Job Offers ({detailStudent.offers?.length || 0})
                </h4>
                {detailStudent.offers && detailStudent.offers.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {detailStudent.offers.map((offer, idx) => (
                      <div key={idx} style={{ padding: 10, background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-color)", borderRadius: 6, fontSize: 13 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <strong>{offer.companyName}</strong>
                          <span style={{ fontWeight: 600, color: "var(--accent)" }}>{offer.offerType} OFFER</span>
                        </div>
                        <div>Salary Package: <strong>{formatLPA(offer.packageLpa)}</strong></div>
                        <div>Status: <span style={{ fontWeight: 600, color: "var(--success)" }}>{offer.placementStatus || "Placed"}</span></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No job placement offers recorded.</div>
                )}
              </div>

              {/* Internship/PPO Info */}
              <div>
                <h4 style={{ fontSize: 14, color: "var(--primary)", borderBottom: "1px solid var(--border-color)", paddingBottom: 6, marginBottom: 10 }}>
                  Internship & PPO Information
                </h4>
                {detailStudent.internships && detailStudent.internships.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {detailStudent.internships.map((intern, idx) => (
                      <div key={idx} style={{ padding: 10, background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-color)", borderRadius: 6, fontSize: 13 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <strong>{intern.companyName}</strong>
                          <span style={{ fontWeight: 600, color: intern.status === "Active" ? "var(--success)" : "var(--text-muted)" }}>
                            {intern.status || "Active"}
                          </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                          <div>Stipend: <strong>{intern.stipend ? `₹${intern.stipend.toLocaleString()}/month` : "—"}</strong></div>
                          <div>PPO Status: <strong>{intern.ppo || "No"}</strong></div>
                          <div>Start Date: <strong>{formatDate(intern.startDate)}</strong></div>
                          <div>End Date: <strong>{formatDate(intern.endDate)}</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No internship records found.</div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button 
                  onClick={() => setDetailStudent(null)}
                  className="btn btn-primary"
                  style={{ padding: "8px 24px" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offers Modal Overlay */}
      {offersStudent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18 }}>Job Placement Offers List</h3>
              <button 
                onClick={() => setOffersStudent(null)} 
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>
                All active offers registered for: <strong>{offersStudent.name}</strong> (PRN: {offersStudent.prn})
              </div>
              
              {offersStudent.offers && offersStudent.offers.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {offersStudent.offers.map((offer, oIdx) => (
                    <div key={oIdx} style={{ border: "1px solid var(--border-color)", padding: 12, borderRadius: 6, background: "rgba(255,255,255,0.01)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{offer.companyName}</span>
                        <span className="tag" style={{ background: "var(--primary-glow)", color: "var(--primary)", border: "none", fontSize: 11, fontWeight: 700 }}>
                          {offer.offerType} OFFER
                        </span>
                      </div>
                      <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div>Salary Package: <strong>{formatLPA(offer.packageLpa)}</strong></div>
                        <div>Offer Date: {offer.offerDate ? formatDate(offer.offerDate) : "—"}</div>
                        <div>Status: <strong style={{ color: "var(--success)" }}>{offer.placementStatus || "Placed"}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
                  No placement offers found for this student.
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button 
                  onClick={() => setOffersStudent(null)}
                  className="btn btn-primary"
                  style={{ padding: "8px 24px" }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function AdminReports() {
  const { token, API_URL, showToast } = useAppContext();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Report selection
  const [reportType, setReportType] = useState("overall");

  // Filters state
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/admin/students`, {
        headers: authHeaders.headers,
        params: { limit: 100000 }
      });
      setStudents(res.data.students || []);
    } catch (err) {
      console.error("Error loading reports data:", err);
      showToast("Failed to fetch placement records", "error");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract filter options dynamically
  const branches = [...new Set(students.map(s => s.branch).filter(Boolean))].sort();
  const genders = [...new Set(students.map(s => s.gender).filter(Boolean))].sort();
  
  const companyNamesSet = new Set();
  students.forEach(s => {
    s.offers?.forEach(o => { if (o.companyName) companyNamesSet.add(o.companyName); });
    s.internships?.forEach(i => { if (i.companyName) companyNamesSet.add(i.companyName); });
  });
  const companies = [...companyNamesSet].sort();

  // Helper for median
  const calculateMedian = (arr) => {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  };

  // Filter dataset
  const filteredStudents = students.filter(student => {
    if (selectedBranch && student.branch !== selectedBranch) return false;
    if (selectedGender && student.gender !== selectedGender) return false;
    if (selectedCompany) {
      const hasComp = student.offers?.some(o => o.companyName === selectedCompany) ||
                      student.internships?.some(i => i.companyName === selectedCompany);
      if (!hasComp) return false;
    }
    return true;
  });

  // Calculate reports data dynamically
  let reportData = [];
  let reportHeaders = [];
  let exportFileName = "";

  if (reportType === "overall") {
    exportFileName = "overall_placement_report";
    reportHeaders = ["Metric", "Value"];
    
    const total = filteredStudents.length;
    const placed = filteredStudents.filter(s => s.offers && s.offers.length > 0).length;
    const rate = total > 0 ? ((placed / total) * 100).toFixed(2) : 0;
    
    const pkgs = [];
    filteredStudents.forEach(s => s.offers?.forEach(o => { if (typeof o.packageLpa === "number") pkgs.push(o.packageLpa); }));
    const avg = pkgs.length > 0 ? (pkgs.reduce((a,b)=>a+b, 0)/pkgs.length).toFixed(2) : "—";
    const medianVal = pkgs.length > 0 ? calculateMedian(pkgs).toFixed(2) : "—";
    const highest = pkgs.length > 0 ? Math.max(...pkgs).toFixed(2) : "—";
    const lowest = pkgs.length > 0 ? Math.min(...pkgs).toFixed(2) : "—";
    
    const internshipsCount = filteredStudents.reduce((acc, s) => acc + (s.internships?.length || 0), 0);
    const ppoCount = filteredStudents.filter(s => s.internships?.some(i => i.ppo === "Yes")).length;
    const multipleOffers = filteredStudents.filter(s => s.offers && s.offers.length > 1).length;

    reportData = [
      { metric: "Total Students", value: total },
      { metric: "Placed Students", value: placed },
      { metric: "Placement Percentage", value: `${rate}%` },
      { metric: "Average Package", value: avg !== "—" ? `${avg} LPA` : "—" },
      { metric: "Median Package", value: medianVal !== "—" ? `${medianVal} LPA` : "—" },
      { metric: "Highest Package", value: highest !== "—" ? `${highest} LPA` : "—" },
      { metric: "Lowest Package", value: lowest !== "—" ? `${lowest} LPA` : "—" },
      { metric: "Total Internships", value: internshipsCount },
      { metric: "PPO Conversions", value: ppoCount },
      { metric: "Students with Multiple Offers", value: multipleOffers }
    ];
  }

  else if (reportType === "company") {
    exportFileName = "company_wise_placement_report";
    reportHeaders = ["Company Name", "Total Placed", "Average Package", "Median Package", "Highest Package", "Lowest Package", "Internships", "PPOs"];
    
    const companyMap = {};
    filteredStudents.forEach(s => {
      s.offers?.forEach(o => {
        if (!o.companyName) return;
        const name = o.companyName.trim();
        if (!companyMap[name]) {
          companyMap[name] = { name, studentsSet: new Set(), packages: [], internships: 0, ppos: 0 };
        }
        companyMap[name].studentsSet.add(s._id);
        if (typeof o.packageLpa === "number") {
          companyMap[name].packages.push(o.packageLpa);
        }
      });
      s.internships?.forEach(i => {
        if (!i.companyName) return;
        const name = i.companyName.trim();
        if (!companyMap[name]) {
          companyMap[name] = { name, studentsSet: new Set(), packages: [], internships: 0, ppos: 0 };
        }
        companyMap[name].studentsSet.add(s._id);
        companyMap[name].internships++;
        if (i.ppo === "Yes") {
          companyMap[name].ppos++;
        }
      });
    });

    reportData = Object.keys(companyMap).map(name => {
      const c = companyMap[name];
      const avg = c.packages.length > 0 ? (c.packages.reduce((a,b)=>a+b,0)/c.packages.length).toFixed(2) : null;
      const max = c.packages.length > 0 ? Math.max(...c.packages).toFixed(2) : null;
      const min = c.packages.length > 0 ? Math.min(...c.packages).toFixed(2) : null;
      const med = c.packages.length > 0 ? calculateMedian(c.packages).toFixed(2) : null;
      
      return {
        companyName: name,
        placedCount: c.studentsSet.size,
        averagePackage: avg !== null ? `${avg} LPA` : "—",
        medianPackage: med !== null ? `${med} LPA` : "—",
        highestPackage: max !== null ? `${max} LPA` : "—",
        lowestPackage: min !== null ? `${min} LPA` : "—",
        internshipsCount: c.internships,
        ppoCount: c.ppos
      };
    }).sort((a, b) => b.placedCount - a.placedCount);
  }

  else if (reportType === "branch") {
    exportFileName = "branch_wise_placement_report";
    reportHeaders = ["Branch", "Total Students", "Placed Students", "Placement %", "Average Package", "Median Package", "Highest Package", "Lowest Package", "Internships", "PPOs", "Multiple Offers"];
    
    const branchMap = {};
    filteredStudents.forEach(s => {
      const name = s.branch || "Unknown";
      if (!branchMap[name]) {
        branchMap[name] = { name, total: 0, placed: 0, packages: [], internships: 0, ppos: 0, multiple: 0 };
      }
      const b = branchMap[name];
      b.total++;
      const isPlaced = s.offers && s.offers.length > 0;
      if (isPlaced) {
        b.placed++;
        if (s.offers.length > 1) b.multiple++;
        s.offers.forEach(o => {
          if (typeof o.packageLpa === "number") b.packages.push(o.packageLpa);
        });
      }
      s.internships?.forEach(i => {
        b.internships++;
        if (i.ppo === "Yes") b.ppos++;
      });
    });

    reportData = Object.keys(branchMap).map(name => {
      const b = branchMap[name];
      const pct = b.total > 0 ? ((b.placed / b.total) * 100).toFixed(2) : 0;
      const avg = b.packages.length > 0 ? (b.packages.reduce((a,b)=>a+b,0)/b.packages.length).toFixed(2) : null;
      const max = b.packages.length > 0 ? Math.max(...b.packages).toFixed(2) : null;
      const min = b.packages.length > 0 ? Math.min(...b.packages).toFixed(2) : null;
      const med = b.packages.length > 0 ? calculateMedian(b.packages).toFixed(2) : null;
      
      return {
        branchName: name,
        totalStudents: b.total,
        placedStudents: b.placed,
        placementPercentage: `${pct}%`,
        averagePackage: avg !== null ? `${avg} LPA` : "—",
        medianPackage: med !== null ? `${med} LPA` : "—",
        highestPackage: max !== null ? `${max} LPA` : "—",
        lowestPackage: min !== null ? `${min} LPA` : "—",
        internshipCount: b.internships,
        ppoCount: b.ppos,
        multipleOffers: b.multiple
      };
    }).sort((a, b) => b.totalStudents - a.totalStudents);
  }

  else if (reportType === "student") {
    exportFileName = "student_placement_report";
    reportHeaders = ["Student Name", "PRN", "Branch", "Gender", "Primary Company", "Primary Package", "Secondary Company", "Secondary Package", "Internship", "Placement Status"];
    
    reportData = filteredStudents.map(s => {
      const primary = s.offers?.find(o => o.offerType === "PRIMARY") || s.offers?.[0] || {};
      const secondary = s.offers?.find(o => o.offerType === "SECONDARY") || s.offers?.[1] || {};
      return {
        name: s.name,
        prn: s.prn,
        branch: s.branch,
        gender: s.gender,
        primaryCompany: primary.companyName || "—",
        primaryPackage: primary.packageLpa !== undefined ? `${primary.packageLpa} LPA` : "—",
        secondaryCompany: secondary.companyName || "—",
        secondaryPackage: secondary.packageLpa !== undefined ? `${secondary.packageLpa} LPA` : "—",
        internship: s.internships && s.internships.length > 0 ? "Yes" : "No",
        status: s.offers && s.offers.length > 0 ? "Placed" : "Unplaced"
      };
    });
  }

  else if (reportType === "internship") {
    exportFileName = "student_internships_report";
    reportHeaders = ["Student Name", "Branch", "Internship Company", "Start Date", "End Date", "Stipend", "PPO Status", "Internship Status"];
    
    filteredStudents.forEach(s => {
      s.internships?.forEach(i => {
        reportData.push({
          name: s.name,
          branch: s.branch,
          companyName: i.companyName || "—",
          startDate: i.startDate ? new Date(i.startDate).toLocaleDateString() : "—",
          endDate: i.endDate ? new Date(i.endDate).toLocaleDateString() : "—",
          stipend: i.stipend !== undefined && i.stipend !== null ? `₹${i.stipend.toLocaleString()}/mo` : "—",
          ppo: i.ppo || "No",
          status: i.status || "Active"
        });
      });
    });
  }

  else if (reportType === "package") {
    exportFileName = "salary_packages_report";
    reportHeaders = ["Student Name", "PRN", "Branch", "Company Name", "Salary Package", "Offer Type", "Placement Status"];
    
    filteredStudents.forEach(s => {
      s.offers?.forEach(o => {
        reportData.push({
          name: s.name,
          prn: s.prn,
          branch: s.branch,
          companyName: o.companyName || "—",
          packageLpa: o.packageLpa !== undefined ? o.packageLpa : null,
          offerType: o.offerType || "PRIMARY",
          status: o.placementStatus || "Placed"
        });
      });
    });

    reportData.sort((a, b) => {
      if (a.packageLpa === null) return 1;
      if (b.packageLpa === null) return -1;
      return b.packageLpa - a.packageLpa;
    });

    // Format package fields on screen
    reportData = reportData.map(r => ({
      ...r,
      packageLpa: r.packageLpa !== null ? `${r.packageLpa} LPA` : "—"
    }));
  }

  else if (reportType === "multiple") {
    exportFileName = "multiple_offers_report";
    reportHeaders = ["Student Name", "PRN", "Branch", "Primary Company", "Primary Package", "Secondary Company", "Secondary Package", "Total Offers"];
    
    reportData = filteredStudents.filter(s => s.offers && s.offers.length > 1).map(s => {
      const primary = s.offers?.find(o => o.offerType === "PRIMARY") || s.offers?.[0] || {};
      const secondary = s.offers?.find(o => o.offerType === "SECONDARY") || s.offers?.[1] || {};
      return {
        name: s.name,
        prn: s.prn,
        branch: s.branch,
        primaryCompany: primary.companyName || "—",
        primaryPackage: primary.packageLpa !== undefined ? `${primary.packageLpa} LPA` : "—",
        secondaryCompany: secondary.companyName || "—",
        secondaryPackage: secondary.packageLpa !== undefined ? `${secondary.packageLpa} LPA` : "—",
        totalOffers: s.offers.length
      };
    });
  }

  // Handle local export downloads
  const handleExport = (format) => {
    if (reportData.length === 0) {
      showToast("No report data available to export", "error");
      return;
    }

    const csvRows = [];
    csvRows.push(reportHeaders.join(","));

    reportData.forEach(row => {
      const values = Object.values(row).map(val => {
        const escaped = ("" + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blobContent = format === "excel" ? "\uFEFF" + csvContent : csvContent;
    const mime = format === "excel" ? "text/csv;charset=utf-8;" : "text/csv;charset=utf-8;";
    
    const blob = new Blob([blobContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${exportFileName}.${format === "excel" ? "csv" : "csv"}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Report exported successfully as ${format.toUpperCase()}!`);
  };

  if (loading) {
    return <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>Loading Reports Workspace...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      
      {/* Control panel & Selection */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 20 }}>Placement Management Reports Generator</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            Generate and export custom analytics reports from unified student records.
          </p>
        </div>

        <div className="filter-bar" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, margin: 0, padding: 0, border: "none", background: "none" }}>
          
          <div className="form-group">
            <label>Select Report Type</label>
            <select
              className="form-control"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={{ height: 38, fontWeight: 600 }}
            >
              <option value="overall">Overall Placement Report</option>
              <option value="company">Company-wise Placement Report</option>
              <option value="branch">Branch-wise Placement Report</option>
              <option value="student">Student Placement Report</option>
              <option value="internship">Internship Report</option>
              <option value="package">Package Report (Salary Listing)</option>
              <option value="multiple">Multiple Offer Report</option>
            </select>
          </div>

          <div className="form-group">
            <label>Branch Filter</label>
            <select
              className="form-control"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{ height: 38 }}
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Gender Filter</label>
            <select
              className="form-control"
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              style={{ height: 38 }}
            >
              <option value="">All Genders</option>
              {genders.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Company Filter</label>
            <select
              className="form-control"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              style={{ height: 38 }}
            >
              <option value="">All Companies</option>
              {companies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => handleExport("csv")}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
            disabled={reportData.length === 0}
          >
            <Download size={14} /> Export CSV
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => handleExport("excel")}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
            disabled={reportData.length === 0}
          >
            <FileSpreadsheet size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* Screen view card */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h3 style={{ fontSize: 18, borderBottom: "1px solid var(--border-color)", paddingBottom: 12, margin: 0 }}>Report View: {reportHeaders.join(" / ")}</h3>
        
        {reportData.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40 }}>
            No records matched report criteria.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {reportHeaders.map((hdr, hIdx) => (
                    <th key={hIdx}>{hdr}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, rIdx) => {
                  const cells = Object.values(row);
                  return (
                    <tr key={rIdx}>
                      {cells.map((cell, cIdx) => (
                        <td key={cIdx} style={cIdx === 0 ? { fontWeight: 600 } : {}}>
                          {cell !== null && cell !== undefined ? "" + cell : "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

function AdminDataQuality() {
  const { token, API_URL, showToast } = useAppContext();
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals for manual correction
  const [editStudent, setEditStudent] = useState(null);
  const [editCompany, setEditCompany] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      
      const [stuRes, compRes] = await Promise.all([
        axios.get(`${API_URL}/admin/students`, {
          headers: authHeaders.headers,
          params: { limit: 100000 }
        }),
        axios.get(`${API_URL}/companies`)
      ]);
      
      setStudents(stuRes.data.students || []);
      setCompanies(compRes.data || []);
    } catch (err) {
      console.error("Error loading quality data:", err);
      showToast("Failed to fetch data quality components", "error");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Run audits dynamically
  const issues = [];
  const prnMap = {};
  const nameBranchMap = {};

  students.forEach(s => {
    // 1. Missing branch
    if (!s.branch || s.branch.trim() === "") {
      issues.push({
        recordType: "Student",
        recordName: s.name,
        field: "Branch",
        problem: "Branch field is empty or blank",
        action: "Edit student and specify the department branch name",
        raw: s
      });
    }

    // 2. Missing placement status
    const isPlaced = s.offers && s.offers.length > 0;
    if (isPlaced) {
      s.offers.forEach((o, oIdx) => {
        if (!o.placementStatus || o.placementStatus.trim() === "") {
          issues.push({
            recordType: "Placement Offer",
            recordName: `${s.name} (${o.companyName || "Unknown"})`,
            field: "Placement Status",
            problem: "Placement Offer is missing status description",
            action: "Set status to 'Placed' or 'Selected'",
            raw: s
          });
        }

        // 3. Offers missing package
        if (o.packageLpa === undefined || o.packageLpa === null || isNaN(o.packageLpa)) {
          issues.push({
            recordType: "Placement Offer",
            recordName: `${s.name} at ${o.companyName || "Unknown"}`,
            field: "Package LPA",
            problem: "Salary package value is empty or not defined",
            action: "Specify package in LPA (e.g. 10 LPA)",
            raw: s
          });
        }

        // 4. Invalid packages
        if (typeof o.packageLpa === "number" && (o.packageLpa < 0 || o.packageLpa > 150)) {
          issues.push({
            recordType: "Placement Offer",
            recordName: `${s.name} at ${o.companyName || "Unknown"}`,
            field: "Package LPA",
            problem: `Salary package value (${o.packageLpa} LPA) is negative or excessively high (>150 LPA)`,
            action: "Correct salary package LPA value",
            raw: s
          });
        }

        // 5. Offers missing company
        if (!o.companyName || o.companyName.trim() === "") {
          issues.push({
            recordType: "Placement Offer",
            recordName: s.name,
            field: "Company Name",
            problem: "Offer has no assigned company name",
            action: "Edit student offer and assign a recruiter company name",
            raw: s
          });
        }
      });
    }

    s.internships?.forEach((i, iIdx) => {
      // 6. Internships missing dates
      if (!i.startDate || !i.endDate) {
        issues.push({
          recordType: "Internship",
          recordName: `${s.name} at ${i.companyName || "Unknown"}`,
          field: "Start/End Dates",
          problem: "Internship is missing start or end dates",
          action: "Edit student and specify both start and end dates",
          raw: s
        });
      }

      // 7. Invalid dates
      if (i.startDate && i.endDate && new Date(i.startDate) > new Date(i.endDate)) {
        issues.push({
          recordType: "Internship",
          recordName: `${s.name} at ${i.companyName || "Unknown"}`,
          field: "Start/End Dates",
          problem: "Start date is scheduled after the end date",
          action: "Adjust dates so that start date precedes end date",
          raw: s
        });
      }

      // 8. Internships missing stipend
      if (i.stipend === undefined || i.stipend === null || isNaN(i.stipend)) {
        issues.push({
          recordType: "Internship",
          recordName: `${s.name} at ${i.companyName || "Unknown"}`,
          field: "Stipend",
          problem: "Monthly stipend value is empty or not defined",
          action: "Edit student and enter stipend value (or 0 if unpaid)",
          raw: s
        });
      }
    });

    // 9. Duplicate PRNs
    const prn = (s.prn || "").trim();
    if (prn) {
      if (!prnMap[prn]) prnMap[prn] = [];
      prnMap[prn].push(s);
    }

    // 10. Duplicate student names
    const nameBranchKey = `${s.name.trim().toLowerCase()}_${(s.branch || "").trim().toLowerCase()}`;
    if (!nameBranchMap[nameBranchKey]) nameBranchMap[nameBranchKey] = [];
    nameBranchMap[nameBranchKey].push(s);
  });

  // Duplicate PRNs
  Object.keys(prnMap).forEach(prn => {
    if (prnMap[prn].length > 1) {
      prnMap[prn].forEach(s => {
        issues.push({
          recordType: "Student",
          recordName: s.name,
          field: "PRN",
          problem: `Duplicate PRN value '${prn}' is shared with another student`,
          action: "Edit student to specify a unique PRN",
          raw: s
        });
      });
    }
  });

  // Duplicate student names
  Object.keys(nameBranchMap).forEach(key => {
    if (nameBranchMap[key].length > 1) {
      nameBranchMap[key].forEach(s => {
        issues.push({
          recordType: "Student",
          recordName: `${s.name} (${s.branch})`,
          field: "Student Record",
          problem: "Identical student name and branch recorded multiple times in registry",
          action: "Merge placement data or delete duplicate student record",
          raw: s
        });
      });
    }
  });

  // 11. Companies with incomplete information
  companies.forEach(c => {
    const missingIndustry = !c.industry || c.industry.trim() === "";
    const missingLocation = !c.location || c.location.trim() === "";
    if (missingIndustry || missingLocation) {
      issues.push({
        recordType: "Company",
        recordName: c.name,
        field: missingIndustry && missingLocation ? "Industry & Location" : missingIndustry ? "Industry" : "Location",
        problem: `Company is missing ${missingIndustry && missingLocation ? "both industry and location" : missingIndustry ? "industry segment" : "headquarters location"} information`,
        action: "Edit company details to add missing fields",
        raw: c
      });
    }
  });

  const handleCorrectData = (issue) => {
    if (issue.recordType === "Company") {
      setEditCompany({
        _id: issue.raw._id,
        name: issue.raw.name,
        industry: issue.raw.industry || "",
        location: issue.raw.location || ""
      });
    } else {
      const student = issue.raw;
      const primaryOffer = student.offers?.find(o => o.offerType === "PRIMARY") || student.offers?.[0] || {};
      const secondaryOffer = student.offers?.find(o => o.offerType === "SECONDARY") || student.offers?.[1] || {};
      const internship = student.internships?.[0] || {};

      setEditStudent({
        _id: student._id,
        prn: student.prn,
        name: student.name,
        branch: student.branch,
        gender: student.gender,
        personalEmail: student.personalEmail || "",
        collegeEmail: student.collegeEmail || "",
        phone: student.phone || "",
        
        company1: primaryOffer.companyName || "",
        salary1: primaryOffer.packageLpa !== undefined ? primaryOffer.packageLpa : "",
        company1Status: primaryOffer.placementStatus || "Placed",
        
        company2: secondaryOffer.companyName || "",
        salary2: secondaryOffer.packageLpa !== undefined ? secondaryOffer.packageLpa : "",
        company2Status: secondaryOffer.placementStatus || "Placed",
        
        internshipOffered: student.internships && student.internships.length > 0 ? "Yes" : "No",
        internshipCompany: internship.companyName || "",
        stipend: internship.stipend !== undefined ? internship.stipend : "",
        ppo: internship.ppo || "No",
        internshipStatus: internship.status || "Active"
      });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editStudent.name || !editStudent.prn || !editStudent.branch || !editStudent.gender) {
      showToast("Please fill all required fields", "error");
      return;
    }
    setEditLoading(true);
    try {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      
      const offers = [];
      if (editStudent.company1) {
        offers.push({
          companyName: editStudent.company1,
          packageLpa: editStudent.salary1 !== "" ? Number(editStudent.salary1) : undefined,
          offerType: "PRIMARY",
          placementStatus: editStudent.company1Status || "Placed"
        });
      }
      if (editStudent.company2) {
        offers.push({
          companyName: editStudent.company2,
          packageLpa: editStudent.salary2 !== "" ? Number(editStudent.salary2) : undefined,
          offerType: "SECONDARY",
          placementStatus: editStudent.company2Status || "Placed"
        });
      }

      const internships = [];
      if (editStudent.internshipOffered === "Yes" && editStudent.internshipCompany) {
        internships.push({
          companyName: editStudent.internshipCompany,
          stipend: editStudent.stipend !== "" ? Number(editStudent.stipend) : undefined,
          ppo: editStudent.ppo || "No",
          status: editStudent.internshipStatus || "Active"
        });
      }

      const payload = {
        name: editStudent.name,
        branch: editStudent.branch,
        gender: editStudent.gender,
        personalEmail: editStudent.personalEmail,
        collegeEmail: editStudent.collegeEmail,
        phone: editStudent.phone,
        offers,
        internships
      };

      await axios.put(`${API_URL}/admin/students/${editStudent._id}`, payload, authHeaders);
      showToast("Student details corrected successfully!");
      setEditStudent(null);
      loadData();
    } catch (err) {
      console.error("Error saving student corrections:", err);
      showToast("Failed to correct student placement", "error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditCompanySubmit = async (e) => {
    e.preventDefault();
    if (!editCompany.name) {
      showToast("Company name is required", "error");
      return;
    }
    setEditLoading(true);
    try {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_URL}/companies/${editCompany._id}`, {
        name: editCompany.name,
        industry: editCompany.industry,
        location: editCompany.location
      }, authHeaders);
      showToast("Company details corrected successfully!");
      setEditCompany(null);
      loadData();
    } catch (err) {
      console.error("Error correcting company:", err);
      showToast("Failed to correct company information", "error");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      
      {/* Overview stats */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 20 }}>Data Quality Audits for Placement Data</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            Overview of registry verification, integrity anomalies, and incomplete fields.
          </p>
        </div>

        <div className="wce-stats-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 20, margin: 0 }}>
          <div className="wce-stat-card" style={{ borderLeft: "4px solid var(--primary)" }}>
            <div className="wce-stat-info">
              <h3>{students.length}</h3>
              <p>Total Student Records Checked</p>
            </div>
          </div>
          <div className="wce-stat-card" style={{ borderLeft: "4px solid var(--secondary)" }}>
            <div className="wce-stat-info">
              <h3>{companies.length}</h3>
              <p>Total Company Profiles Checked</p>
            </div>
          </div>
          <div className="wce-stat-card" style={{ borderLeft: issues.length > 0 ? "4px solid var(--danger)" : "4px solid var(--success)" }}>
            <div className="wce-stat-info">
              <h3 style={{ color: issues.length > 0 ? "var(--danger)" : "var(--success)" }}>{issues.length}</h3>
              <p>Data Quality Issues Found</p>
            </div>
          </div>
        </div>
      </div>

      {/* Issues Table */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h3 style={{ fontSize: 18, borderBottom: "1px solid var(--border-color)", paddingBottom: 12, margin: 0 }}>
          Audited Anomalies Listing ({issues.length})
        </h3>

        {issues.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--success)", padding: "40px 20px" }}>
            <Check size={48} style={{ marginBottom: 16 }} />
            <h4>All Data Quality Checks Passed!</h4>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 8 }}>
              No missing branches, stipend fields, duplicate PRNs, or invalid package entries found.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Record Type</th>
                  <th style={{ width: 180 }}>Record</th>
                  <th style={{ width: 150 }}>Field</th>
                  <th>Problem / Anomaly Description</th>
                  <th>Suggested Corrective Action</th>
                  <th style={{ width: 120, textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="tag" style={{
                        background: issue.recordType === "Company" ? "rgba(138, 63, 252, 0.12)" : "rgba(6, 182, 212, 0.12)",
                        color: issue.recordType === "Company" ? "var(--secondary)" : "var(--primary)",
                        fontWeight: 600, border: "none"
                      }}>
                        {issue.recordType}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{issue.recordName}</td>
                    <td style={{ fontWeight: 600, color: "var(--accent)" }}>{issue.field}</td>
                    <td style={{ color: "var(--danger)" }}>{issue.problem}</td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{issue.action}</td>
                    <td style={{ textAlign: "center" }}>
                      <button 
                        onClick={() => handleCorrectData(issue)}
                        className="btn btn-primary"
                        style={{ padding: "4px 10px", fontSize: 11, height: 28 }}
                      >
                        Correct Data
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Student Modal Overlay */}
      {editStudent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18 }}>Correct Student Placement Record</h3>
              <button 
                onClick={() => setEditStudent(null)} 
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="form-row-2col">
                <div className="form-group">
                  <label>Full Name <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={editStudent.name}
                    onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>PRN <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={editStudent.prn}
                    onChange={(e) => setEditStudent({ ...editStudent, prn: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label>Branch <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={editStudent.branch}
                    onChange={(e) => setEditStudent({ ...editStudent, branch: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Gender <span style={{ color: "var(--danger)" }}>*</span></label>
                  <select
                    className="form-control"
                    value={editStudent.gender}
                    onChange={(e) => setEditStudent({ ...editStudent, gender: e.target.value })}
                    required
                    style={{ height: 38 }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                <h4 style={{ fontSize: 14, marginBottom: 12, color: "var(--primary)" }}>Placement Offers</h4>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Company 1 (Primary)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStudent.company1}
                      onChange={(e) => setEditStudent({ ...editStudent, company1: e.target.value })}
                      placeholder="e.g. Seagate"
                    />
                  </div>
                  <div className="form-group">
                    <label>Salary Package 1 (LPA)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={editStudent.salary1}
                      onChange={(e) => setEditStudent({ ...editStudent, salary1: e.target.value })}
                      placeholder="e.g. 12"
                    />
                  </div>
                </div>
                <div className="form-row-2col" style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label>Company 2 (Secondary)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStudent.company2}
                      onChange={(e) => setEditStudent({ ...editStudent, company2: e.target.value })}
                      placeholder="e.g. Google"
                    />
                  </div>
                  <div className="form-group">
                    <label>Salary Package 2 (LPA)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={editStudent.salary2}
                      onChange={(e) => setEditStudent({ ...editStudent, salary2: e.target.value })}
                      placeholder="e.g. 30"
                    />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                <h4 style={{ fontSize: 14, marginBottom: 12, color: "var(--primary)" }}>Internship Details</h4>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Internship Offered</label>
                    <select
                      className="form-control"
                      value={editStudent.internshipOffered}
                      onChange={(e) => setEditStudent({ ...editStudent, internshipOffered: e.target.value })}
                      style={{ height: 38 }}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Internship Company</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStudent.internshipCompany}
                      onChange={(e) => setEditStudent({ ...editStudent, internshipCompany: e.target.value })}
                      placeholder="e.g. Seagate"
                    />
                  </div>
                </div>
                <div className="form-row-2col" style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label>Internship Stipend (₹/month)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editStudent.stipend}
                      onChange={(e) => setEditStudent({ ...editStudent, stipend: e.target.value })}
                      placeholder="e.g. 35000"
                    />
                  </div>
                  <div className="form-group">
                    <label>PPO Status</label>
                    <select
                      className="form-control"
                      value={editStudent.ppo}
                      onChange={(e) => setEditStudent({ ...editStudent, ppo: e.target.value })}
                      style={{ height: 38 }}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                <h4 style={{ fontSize: 14, marginBottom: 12, color: "var(--primary)" }}>Contact Information</h4>
                <div className="form-row-3col">
                  <div className="form-group">
                    <label>Personal Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editStudent.personalEmail}
                      onChange={(e) => setEditStudent({ ...editStudent, personalEmail: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>College Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editStudent.collegeEmail}
                      onChange={(e) => setEditStudent({ ...editStudent, collegeEmail: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStudent.phone}
                      onChange={(e) => setEditStudent({ ...editStudent, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
                <button 
                  type="button" 
                  onClick={() => setEditStudent(null)}
                  className="btn btn-secondary"
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={editLoading}
                >
                  {editLoading ? "Correcting..." : "Save Corrections"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Modal Overlay */}
      {editCompany && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18 }}>Correct Company Details</h3>
              <button 
                onClick={() => setEditCompany(null)} 
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditCompanySubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="form-group">
                <label>Company Name <span style={{ color: "var(--danger)" }}>*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={editCompany.name}
                  onChange={(e) => setEditCompany({ ...editCompany, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Industry Segment</label>
                <input
                  type="text"
                  className="form-control"
                  value={editCompany.industry}
                  onChange={(e) => setEditCompany({ ...editCompany, industry: e.target.value })}
                  placeholder="e.g. Technology, Finance, Core Engineering"
                />
              </div>

              <div className="form-group">
                <label>Headquarters Location</label>
                <input
                  type="text"
                  className="form-control"
                  value={editCompany.location}
                  onChange={(e) => setEditCompany({ ...editCompany, location: e.target.value })}
                  placeholder="e.g. Pune, Bangalore, Mumbai"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
                <button 
                  type="button" 
                  onClick={() => setEditCompany(null)}
                  className="btn btn-secondary"
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={editLoading}
                >
                  {editLoading ? "Correcting..." : "Save Corrections"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
