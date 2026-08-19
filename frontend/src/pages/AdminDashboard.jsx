import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAppContext } from "../appContext";
import { useCallback } from "react";
import { 
  Upload, FileSpreadsheet, Trash2, Check, 
  Award, ShieldCheck, ShieldAlert, Download, FileText,
  TrendingUp, Edit2, Search, X, Plus, Save, CheckCircle,
  User, Mail, Phone, Eye, Layers,
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
  const placementFileRef = useRef(null);
  const [placementFileName, setPlacementFileName] = useState("");
  const [selectedExcelFile, setSelectedExcelFile] = useState(null);

  // Excel Upload Logs state
  const [uploadLogs, setUploadLogs] = useState([]);
  const [latestUpload, setLatestUpload] = useState(null);

  const loadUploadLogs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/upload-logs`, { withCredentials: true });
      setUploadLogs(res.data?.logs || []);
      setLatestUpload(res.data?.latest || null);
    } catch (err) {
      console.error("Failed to load upload logs:", err);
    }
  }, [API_URL]);

  // Branch Config state
  const [branchConfigs, setBranchConfigs] = useState([]);      // [{branch, registeredCount, _id}]
  const [branchEdits, setBranchEdits]   = useState({});        // {_id|branch -> editedCount}
  const [branchSaving, setBranchSaving] = useState({});        // {branch -> bool}
  const [newBranch, setNewBranch]       = useState("");         // dynamic input/select value
  const [newCount, setNewCount]         = useState("");
  const [branchAdding, setBranchAdding] = useState(false);


  // Fetch dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      const expRes = await axios.get(`${API_URL}/experiences/admin`, { withCredentials: true });
      setExperiences(expRes.data || []);
    } catch (err) {
      console.error("Dashboard fetching error:", err);
      showToast("Failed to fetch dashboard updates", "error");
    }
  }, [API_URL, showToast]);

  // Load branch configs
  const loadBranchConfigs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/branch-config`, {
        withCredentials: true
      });
      const configs = res.data || [];
      setBranchConfigs(configs);
      const edits = {};
      configs.forEach(c => { edits[c.branch] = c.registeredCount; });
      setBranchEdits(edits);
    } catch {
      showToast("Failed to load branch configurations", "error");
    }
  }, [API_URL, showToast]);

  // Save (upsert) one branch config
  const saveBranchConfig = async (branch, count) => {
    const parsed = Number(count);
    if (!branch || isNaN(parsed) || parsed < 0) {
      showToast("Enter a valid branch name and a non-negative count", "error");
      return;
    }
    setBranchSaving(prev => ({ ...prev, [branch]: true }));
    try {
      await axios.post(
        `${API_URL}/admin/branch-config`,
        { branch, registeredCount: parsed },
        { withCredentials: true }
      );
      showToast(`Saved: ${branch} → ${parsed} registered`, "success");
      await loadBranchConfigs();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save branch config", "error");
    } finally {
      setBranchSaving(prev => ({ ...prev, [branch]: false }));
    }
  };

  // Delete one branch config
  const deleteBranchConfig = async (branch) => {
    if (!window.confirm(`Delete branch config for "${branch}"?`)) return;
    try {
      await axios.delete(
        `${API_URL}/admin/branch-config/${encodeURIComponent(branch)}`,
        { withCredentials: true }
      );
      showToast(`Deleted config for ${branch}`, "success");
      await loadBranchConfigs();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete branch config", "error");
    }
  };

  // Add new branch
  const handleAddBranch = async () => {
    const branchName = newBranch.trim();
    if (!branchName) { showToast("Please select or enter a branch name", "error"); return; }
    const parsed = Number(newCount);
    if (isNaN(parsed) || parsed < 0) { showToast("Enter a valid non-negative count", "error"); return; }
    // Check duplicate
    if (branchConfigs.some(c => c.branch.toLowerCase() === branchName.toLowerCase())) {
      showToast(`Branch "${branchName}" already exists in table. Edit its count directly in the table above.`, "error");
      return;
    }
    setBranchAdding(true);
    try {
      await axios.post(
        `${API_URL}/admin/branch-config`,
        { branch: branchName, registeredCount: parsed },
        { withCredentials: true }
      );
      showToast(`Added: ${branchName} → ${parsed} registered`, "success");
      setNewBranch(""); setNewCount("");
      await loadBranchConfigs();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to add branch", "error");
    } finally {
      setBranchAdding(false);
    }
  };

  // Finalize & Verify submission
  const handleFinalizeSubmission = async () => {
    setLoading(true);
    try {
      if (selectedExcelFile) {
        const formData = new FormData();
        formData.append("file", selectedExcelFile);

        const response = await axios.post(
          `${API_URL}/admin/import-placement-excel`,
          formData,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "multipart/form-data"
            }
          }
        );
        setImportResult(response.data);
        setSelectedExcelFile(null);
        if (placementFileRef.current) placementFileRef.current.value = "";
      }

      for (const cfg of branchConfigs) {
        const edited = branchEdits[cfg.branch];
        if (edited !== undefined && Number(edited) !== cfg.registeredCount) {
          await axios.post(
            `${API_URL}/admin/branch-config`,
            { branch: cfg.branch, registeredCount: Number(edited) },
            { withCredentials: true }
          );
        }
      }
      await loadBranchConfigs();
      await loadDashboardData();
      await loadUploadLogs();
      showToast("Spreadsheet data & branch registered counts verified and saved! Analysis complete.", "success");
    } catch (err) {
      console.error("Submission error:", err);
      showToast(err.response?.data?.message || "Failed to complete data verification.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadBranchConfigs();
    loadUploadLogs();
  }, [loadDashboardData, loadBranchConfigs, loadUploadLogs]);

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
      await axios.patch(`${API_URL}/experiences/${expId}/status`, { status }, { withCredentials: true });
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
      await axios.delete(`${API_URL}/experiences/${expId}`, { withCredentials: true });
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
              className={`sidebar-item ${activeTab === "reports" ? "active" : ""}`}
              onClick={() => setActiveTab("reports")}
            >
              <FileText size={16} /> Reports Generator
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

              {/* Detailed Placement Records Import */}
              <div style={{ border: "1px solid var(--border-color)", padding: 24, borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.01)" }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, display: "flex", alignItems: "center", justifyItems: "center", gap: 8 }}>
                  <Award size={16} style={{ color: "var(--primary)" }} /> Bulk Import Detailed Student Placement Records
                </h3>

                {/* Active Uploaded Excel File Banner */}
                {latestUpload && (
                  <div style={{ 
                    border: "1px solid rgba(99, 102, 241, 0.3)", 
                    borderRadius: "var(--radius-md)", 
                    padding: 16, 
                    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(79, 70, 229, 0.04) 100%)", 
                    marginBottom: 18 
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                          <FileSpreadsheet size={22} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Active Uploaded Excel File
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 2, display: "flex", alignItems: "center", gap: 10 }}>
                            {latestUpload.fileName}
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "rgba(16, 185, 129, 0.15)", color: "var(--success)", fontWeight: 600 }}>
                              Ingested & Live
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
                            Uploaded on {new Date(latestUpload.createdAt).toLocaleString()} &bull; {latestUpload.totalRows} total rows ({latestUpload.successfullyImported} new, {latestUpload.updatedRecords} updated)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Excel File Dropzone / Selected File Preview */}
                {selectedExcelFile ? (
                  <div 
                    className="excel-dropzone" 
                    style={{ borderStyle: "solid", borderColor: "var(--primary)", background: "rgba(99, 102, 241, 0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <FileSpreadsheet size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                          Selected File: {selectedExcelFile.name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          Size: {(selectedExcelFile.size / 1024).toFixed(1)} KB &bull; Ready to process. Review branch counts below and click 'Verify & Submit'.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExcelFile(null);
                        setPlacementFileName("");
                        if (placementFileRef.current) placementFileRef.current.value = "";
                      }}
                      style={{ background: "rgba(239, 68, 68, 0.12)", border: "none", color: "var(--danger)", padding: 6, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      title="Clear selected file"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div 
                    className="excel-dropzone" 
                    onClick={() => placementFileRef.current?.click()}
                    style={{ marginBottom: 14 }}
                  >
                    <Upload className="excel-dropzone-icon" size={32} style={{ color: "var(--primary)" }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                        Drag & Drop or Click to Select Student Records Excel/CSV
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
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        setSelectedExcelFile(file);
                        setPlacementFileName(file.name);
                        showToast(`File "${file.name}" selected. Review branch counts below and click 'Verify & Submit'.`, "info");
                      }}
                      disabled={loading}
                    />
                  </div>
                )}
                
                <button 
                  type="button" 
                  onClick={downloadTemplate} 
                  className="btn btn-secondary" 
                  style={{ width: "100%", height: 38, fontSize: 13 }}
                >
                  <Download size={14} style={{ marginRight: 6 }} /> Download Detailed Placement Records CSV Template
                </button>

                <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* 1. Upload Result Summary (shown when a file was uploaded in this session) */}
                  {importResult && (
                    <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: 20, background: "rgba(16,185,129,0.04)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <CheckCircle size={18} style={{ color: "var(--success)" }} />
                          <div>
                            <h4 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Spreadsheet Ingestion Summary</h4>
                            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                              <FileSpreadsheet size={14} style={{ color: "var(--primary)" }} />
                              <strong>Uploaded File:</strong> {importResult.fileName || importResult.summary?.fileName || latestUpload?.fileName || "Placement Spreadsheet"}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 12, background: "rgba(16,185,129,0.15)", color: "var(--success)", fontWeight: 600 }}>
                          Sheet Uploaded Successfully
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                        <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Rows</div>
                          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{importResult.summary?.totalRows || 0}</div>
                        </div>
                        <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>New Records</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--success)", marginTop: 2 }}>{importResult.summary?.successfullyImported || 0}</div>
                        </div>
                        <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Updated Records</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", marginTop: 2 }}>{importResult.summary?.updatedRecords || 0}</div>
                        </div>
                        <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Duplicates</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--warning)", marginTop: 2 }}>{importResult.summary?.duplicateRecords || 0}</div>
                        </div>
                        {importResult.summary?.failedRecords > 0 && (
                          <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Failed Rows</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--danger)", marginTop: 2 }}>{importResult.summary?.failedRecords}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2. Branch Registered Students Count Config Editor (Always visible) */}
                  <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--bg-secondary)" }}>
                    <div style={{ padding: "14px 20px", background: "rgba(99,102,241,0.08)", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 10 }}>
                      <Layers size={16} style={{ color: "var(--accent)" }} />
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Set / Edit Branch Registered Students Count</h3>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                          Set total registered students per branch for placement % calculations. Add new branches if needed.
                        </p>
                      </div>
                    </div>

                    {/* Existing entries table */}
                    <div style={{ padding: "0 20px" }}>
                      {branchConfigs.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "18px 0", textAlign: "center" }}>
                          No branch configurations yet. Add one below.
                        </p>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14 }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                              <th style={{ textAlign: "left", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, padding: "8px 0", textTransform: "uppercase", letterSpacing: "0.06em", width: "40%" }}>Branch</th>
                              <th style={{ textAlign: "left", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, padding: "8px 0", textTransform: "uppercase", letterSpacing: "0.06em", width: "35%" }}>Registered Count</th>
                              <th style={{ width: "25%" }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {branchConfigs.map(cfg => (
                              <tr key={cfg.branch} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <td style={{ padding: "9px 0", fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                                  {cfg.branch}
                                </td>
                                <td style={{ padding: "9px 8px 9px 0" }}>
                                  <input
                                    type="number" min="0"
                                    className="form-input"
                                    style={{ width: 110, height: 32, fontSize: 13, padding: "4px 10px" }}
                                    value={branchEdits[cfg.branch] ?? cfg.registeredCount}
                                    onChange={e => setBranchEdits(prev => ({ ...prev, [cfg.branch]: e.target.value }))}
                                  />
                                </td>
                                <td style={{ padding: "9px 0", textAlign: "right" }}>
                                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      style={{ height: 30, fontSize: 12, padding: "0 10px", display: "flex", alignItems: "center", gap: 4 }}
                                      disabled={branchSaving[cfg.branch]}
                                      onClick={() => saveBranchConfig(cfg.branch, branchEdits[cfg.branch] ?? cfg.registeredCount)}
                                    >
                                      <Save size={11} />
                                      {branchSaving[cfg.branch] ? "Saving…" : "Save"}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-danger"
                                      style={{ height: 30, fontSize: 12, padding: "0 8px", display: "flex", alignItems: "center", gap: 4 }}
                                      onClick={() => deleteBranchConfig(cfg.branch)}
                                    >
                                      <Trash2 size={11} /> Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Add new branch */}
                    <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border-color)", background: "rgba(0,0,0,0.1)" }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Add New Branch</p>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Branch Name</label>
                          <input
                            type="text"
                            list="uploaded-branches-list"
                            className="form-input"
                            placeholder="Type or select branch..."
                            style={{ height: 34, fontSize: 13, minWidth: 180 }}
                            value={newBranch}
                            onChange={e => setNewBranch(e.target.value)}
                          />
                          <datalist id="uploaded-branches-list">
                            {branchConfigs.map(c => <option key={c.branch} value={c.branch} />)}
                          </datalist>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Registered Count</label>
                          <input type="number" min="0" className="form-input" placeholder="e.g. 120"
                            style={{ height: 34, fontSize: 13, width: 110 }}
                            value={newCount} onChange={e => setNewCount(e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ height: 34, fontSize: 13, padding: "0 14px", display: "flex", alignItems: "center", gap: 6 }}
                          disabled={branchAdding || !newBranch.trim() || newCount === ""}
                          onClick={handleAddBranch}
                        >
                          <Plus size={13} />
                          {branchAdding ? "Adding…" : "Add Branch"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3. Submit & Verify Button */}
                  <div style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ height: 44, fontSize: 14, padding: "0 24px", display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", fontWeight: 600, boxShadow: "0 4px 12px rgba(99,102,241,0.25)" }}
                      onClick={handleFinalizeSubmission}
                      disabled={loading}
                    >
                      <CheckCircle size={18} />
                      Verify & Submit Data for Placement Analysis
                    </button>
                  </div>

                  {/* 4. Uploaded Excel Files History Log Table */}
                  {uploadLogs.length > 0 && (
                    <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--bg-secondary)", marginTop: 10 }}>
                      <div style={{ padding: "14px 20px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <FileSpreadsheet size={16} style={{ color: "var(--primary)" }} />
                          <div>
                            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Uploaded Excel Files History Log</h3>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                              Record of all Excel and CSV files uploaded and processed by the admin.
                            </p>
                          </div>
                        </div>
                        <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 10, background: "rgba(99,102,241,0.15)", color: "var(--accent)", fontWeight: 600 }}>
                          {uploadLogs.length} File{uploadLogs.length > 1 ? "s" : ""} Ingested
                        </span>
                      </div>

                      <div style={{ padding: "0 20px", overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", margin: "10px 0" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                              <th style={{ textAlign: "left", fontSize: 11, color: "var(--text-muted)", padding: "8px 0", textTransform: "uppercase" }}>File Name</th>
                              <th style={{ textAlign: "left", fontSize: 11, color: "var(--text-muted)", padding: "8px 0", textTransform: "uppercase" }}>Uploaded On</th>
                              <th style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", padding: "8px 0", textTransform: "uppercase" }}>Total Rows</th>
                              <th style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", padding: "8px 0", textTransform: "uppercase" }}>New Records</th>
                              <th style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", padding: "8px 0", textTransform: "uppercase" }}>Updated Records</th>
                              <th style={{ textAlign: "right", fontSize: 11, color: "var(--text-muted)", padding: "8px 0", textTransform: "uppercase" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {uploadLogs.map(log => (
                              <tr key={log._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <td style={{ padding: "10px 0", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <FileSpreadsheet size={15} style={{ color: "var(--success)" }} />
                                    {log.fileName}
                                  </div>
                                </td>
                                <td style={{ padding: "10px 0", fontSize: 12, color: "var(--text-secondary)" }}>
                                  {new Date(log.createdAt).toLocaleString()}
                                </td>
                                <td style={{ padding: "10px 0", fontSize: 13, textAlign: "center", fontWeight: 600 }}>
                                  {log.totalRows}
                                </td>
                                <td style={{ padding: "10px 0", fontSize: 13, textAlign: "center", fontWeight: 600, color: "var(--success)" }}>
                                  {log.successfullyImported}
                                </td>
                                <td style={{ padding: "10px 0", fontSize: 13, textAlign: "center", fontWeight: 600, color: "var(--accent)" }}>
                                  {log.updatedRecords}
                                </td>
                                <td style={{ padding: "10px 0", textAlign: "right" }}>
                                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "rgba(16, 185, 129, 0.15)", color: "var(--success)", fontWeight: 600 }}>
                                    Ingested
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}





          {/* TAB 4: COMPANIES ANALYTICS */}
          {activeTab === "companies" && (
            <AdminCompanyAnalytics />
          )}

          {/* TAB 5: BRANCH ANALYTICS */}
          {activeTab === "branches" && (
            <AdminBranchAnalytics />
          )}

          {/* TAB 6: REPORTS GENERATOR */}
          {activeTab === "reports" && (
            <AdminReports />
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
              <div>
                <h3 style={{ fontSize: 18, color: "var(--success)", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                  <CheckCircle size={20} /> Spreadsheet Import Summary
                </h3>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <FileSpreadsheet size={15} style={{ color: "var(--primary)" }} />
                  <strong>Uploaded File:</strong> {importResult.fileName || importResult.summary?.fileName || latestUpload?.fileName || "Spreadsheet"}
                </div>
              </div>
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
  return null;
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
    if (val === null || val === undefined || isNaN(val)) return "â€”";
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
            â† Back to Companies List
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
                            ) : "â€”"}
                          </td>
                          <td>
                            {student.internships && student.internships.length > 0 ? (
                              student.internships.map((i, iIdx) => (
                                <div key={iIdx}>
                                  <strong>Intern</strong>: {i.stipend ? `â‚¹${i.stipend.toLocaleString()}/mo` : "Yes"} (PPO: {i.ppo})
                                </div>
                              ))
                            ) : "â€”"}
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
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
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
  const [branchConfigs, setBranchConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      const [resStudents, resConfigs] = await Promise.all([
        axios.get(`${API_URL}/admin/students`, {
          headers: authHeaders.headers,
          params: { limit: 100000 }
        }),
        axios.get(`${API_URL}/admin/branch-config`, { withCredentials: true })
      ]);
      setStudents(resStudents.data.students || []);
      setBranchConfigs(resConfigs.data || []);
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

  const configMap = {};
  branchConfigs.forEach(c => { if (c.branch) configMap[c.branch.trim().toLowerCase()] = c.registeredCount; });

  const branchStatsList = Object.keys(branchMap).map(name => {
    const b = branchMap[name];
    const pkgs = b.packages;
    const avgPkg = pkgs.length > 0 ? (pkgs.reduce((x, y) => x + y, 0) / pkgs.length) : null;
    const maxPkg = pkgs.length > 0 ? Math.max(...pkgs) : null;
    const minPkg = pkgs.length > 0 ? Math.min(...pkgs) : null;
    const medianPkg = calculateMedian(pkgs);

    const cfgCount = configMap[name.trim().toLowerCase()];
    const registeredCount = (cfgCount !== undefined && cfgCount > 0) ? cfgCount : b.totalStudents;
    const placementPct = registeredCount > 0 ? parseFloat(((b.placedStudents / registeredCount) * 100).toFixed(2)) : 0;

    return {
      branchName: name,
      totalStudents: registeredCount,
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
    if (val === null || val === undefined || isNaN(val)) return "â€”";
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

function AdminStudentPlacements() {
  return null;
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
    const avg = pkgs.length > 0 ? (pkgs.reduce((a,b)=>a+b, 0)/pkgs.length).toFixed(2) : "ΓÇö";
    const medianVal = pkgs.length > 0 ? calculateMedian(pkgs).toFixed(2) : "ΓÇö";
    const highest = pkgs.length > 0 ? Math.max(...pkgs).toFixed(2) : "ΓÇö";
    const lowest = pkgs.length > 0 ? Math.min(...pkgs).toFixed(2) : "ΓÇö";
    
    const internshipsCount = filteredStudents.reduce((acc, s) => acc + (s.internships?.length || 0), 0);
    const ppoCount = filteredStudents.filter(s => s.internships?.some(i => i.ppo === "Yes")).length;
    const multipleOffers = filteredStudents.filter(s => s.offers && s.offers.length > 1).length;

    reportData = [
      { metric: "Total Students", value: total },
      { metric: "Placed Students", value: placed },
      { metric: "Placement Percentage", value: `${rate}%` },
      { metric: "Average Package", value: avg !== "ΓÇö" ? `${avg} LPA` : "ΓÇö" },
      { metric: "Median Package", value: medianVal !== "ΓÇö" ? `${medianVal} LPA` : "ΓÇö" },
      { metric: "Highest Package", value: highest !== "ΓÇö" ? `${highest} LPA` : "ΓÇö" },
      { metric: "Lowest Package", value: lowest !== "ΓÇö" ? `${lowest} LPA` : "ΓÇö" },
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
        averagePackage: avg !== null ? `${avg} LPA` : "ΓÇö",
        medianPackage: med !== null ? `${med} LPA` : "ΓÇö",
        highestPackage: max !== null ? `${max} LPA` : "ΓÇö",
        lowestPackage: min !== null ? `${min} LPA` : "ΓÇö",
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
        averagePackage: avg !== null ? `${avg} LPA` : "ΓÇö",
        medianPackage: med !== null ? `${med} LPA` : "ΓÇö",
        highestPackage: max !== null ? `${max} LPA` : "ΓÇö",
        lowestPackage: min !== null ? `${min} LPA` : "ΓÇö",
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
        primaryCompany: primary.companyName || "ΓÇö",
        primaryPackage: primary.packageLpa !== undefined ? `${primary.packageLpa} LPA` : "ΓÇö",
        secondaryCompany: secondary.companyName || "ΓÇö",
        secondaryPackage: secondary.packageLpa !== undefined ? `${secondary.packageLpa} LPA` : "ΓÇö",
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
          companyName: i.companyName || "ΓÇö",
          startDate: i.startDate ? new Date(i.startDate).toLocaleDateString() : "ΓÇö",
          endDate: i.endDate ? new Date(i.endDate).toLocaleDateString() : "ΓÇö",
          stipend: i.stipend !== undefined && i.stipend !== null ? `Γé╣${i.stipend.toLocaleString()}/mo` : "ΓÇö",
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
          companyName: o.companyName || "ΓÇö",
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
      packageLpa: r.packageLpa !== null ? `${r.packageLpa} LPA` : "ΓÇö"
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
        primaryCompany: primary.companyName || "ΓÇö",
        primaryPackage: primary.packageLpa !== undefined ? `${primary.packageLpa} LPA` : "ΓÇö",
        secondaryCompany: secondary.companyName || "ΓÇö",
        secondaryPackage: secondary.packageLpa !== undefined ? `${secondary.packageLpa} LPA` : "ΓÇö",
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
                          {cell !== null && cell !== undefined ? "" + cell : "ΓÇö"}
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

