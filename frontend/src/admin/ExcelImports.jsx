import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useAppContext } from "../appContext";
import {
  Upload, FileSpreadsheet, Trash2, CheckCircle,
  Award, Download, X, Plus, Save, Layers, ShieldAlert
} from "lucide-react";

export default function ExcelImports() {
  const { API_URL, showToast } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [schemaError, setSchemaError] = useState(null);

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
  const [branchConfigs, setBranchConfigs] = useState([]);
  const [branchEdits, setBranchEdits] = useState({});
  const [branchSaving, setBranchSaving] = useState({});
  const [newBranch, setNewBranch] = useState("");
  const [newCount, setNewCount] = useState("");
  const [branchAdding, setBranchAdding] = useState(false);

  const loadBranchConfigs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/branch-config`, { withCredentials: true });
      const configs = res.data || [];
      setBranchConfigs(configs);
      const edits = {};
      configs.forEach(c => { edits[c.branch] = c.registeredCount; });
      setBranchEdits(edits);
    } catch {
      showToast("Failed to load branch configurations", "error");
    }
  }, [API_URL, showToast]);

  const saveBranchConfig = async (branch, count) => {
    const parsed = Number(count);
    if (!branch || isNaN(parsed) || parsed < 0) {
      showToast("Enter a valid branch name and a non-negative count", "error");
      return;
    }
    setBranchSaving(prev => ({ ...prev, [branch]: true }));
    try {
      await axios.post(`${API_URL}/admin/branch-config`, { branch, registeredCount: parsed }, { withCredentials: true });
      showToast(`Branch "${branch}" saved.`);
      loadBranchConfigs();
    } catch {
      showToast("Failed to save branch config", "error");
    } finally {
      setBranchSaving(prev => ({ ...prev, [branch]: false }));
    }
  };

  const deleteBranchConfig = async (branch) => {
    if (!window.confirm(`Delete branch config for "${branch}"?`)) return;
    try {
      await axios.delete(`${API_URL}/admin/branch-config/${encodeURIComponent(branch)}`, { withCredentials: true });
      showToast(`Branch "${branch}" deleted.`);
      loadBranchConfigs();
    } catch {
      showToast("Failed to delete branch config", "error");
    }
  };

  const handleAddBranch = async () => {
    const parsed = Number(newCount);
    if (!newBranch.trim() || isNaN(parsed) || parsed < 0) {
      showToast("Enter a valid branch name and non-negative count", "error");
      return;
    }
    setBranchAdding(true);
    try {
      await axios.post(`${API_URL}/admin/branch-config`, { branch: newBranch.trim(), registeredCount: parsed }, { withCredentials: true });
      showToast(`Branch "${newBranch.trim()}" added.`);
      setNewBranch("");
      setNewCount("");
      loadBranchConfigs();
    } catch {
      showToast("Failed to add branch", "error");
    } finally {
      setBranchAdding(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "Sr No", "PRN", "Branch", "First Name", "Middle Name", "Last Name", "Gender",
      "Company 1", "Salary (LPA)", "Placement Status",
      "Personal Mail", "College Mail", "Phone No"
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

  const validateFileSchema = (file) => {
    return new Promise((resolve) => {
      if (!file.name.endsWith('.csv')) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result || "";
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length === 0) {
          resolve("The selected CSV file is completely empty.");
          return;
        }
        const headerLine = lines[0].toLowerCase().replace(/[^a-z0-9,]/g, "");
        const hasPrn = headerLine.includes("prn") || headerLine.includes("roll");
        const hasBranch = headerLine.includes("branch") || headerLine.includes("department");
        const hasName = headerLine.includes("name");

        if (!hasPrn || !hasBranch || !hasName) {
          const missing = [];
          if (!hasPrn) missing.push("PRN / Roll No");
          if (!hasName) missing.push("First Name / Name");
          if (!hasBranch) missing.push("Branch");
          resolve(`Invalid CSV Format Schema: Missing required column(s): ${missing.join(", ")}. Please download and use our CSV template.`);
          return;
        }
        resolve(null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file.slice(0, 4096));
    });
  };

  const handleFileSelection = async (file) => {
    if (!file) return;
    setSchemaError(null);
    const err = await validateFileSchema(file);
    if (err) {
      setSchemaError(err);
      setSelectedExcelFile(null);
      showToast(err, "error");
      return;
    }
    setSelectedExcelFile(file);
  };

  // Submit and Ingest Excel File
  const uploadAndIngestFile = async (file) => {
    if (!file) {
      showToast("Please select an Excel file to submit.", "error");
      return;
    }
    setLoading(true);
    setSchemaError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadedName = file.name;

      const response = await axios.post(
        `${API_URL}/admin/import-placement-excel`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      setImportResult(response.data);
      setPlacementFileName(uploadedName);
      setSelectedExcelFile(null);
      if (placementFileRef.current) placementFileRef.current.value = "";

      await loadUploadLogs();
      showToast(`Excel file "${uploadedName}" imported & database updated successfully!`, "success");
    } catch (err) {
      console.error("Submission error:", err);
      const msg = err.response?.data?.message || "Failed to import Excel file. Schema mismatch or invalid format.";
      setSchemaError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranchConfigs();
    loadUploadLogs();
  }, [loadBranchConfigs, loadUploadLogs]);

  const activeFileName = latestUpload?.fileName || placementFileName;

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      <div>
        <h2 style={{ fontSize: 20, marginBottom: 6 }}>Excel Spreadsheets Recruiter Importers</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Upload Excel or CSV files for yearly placement figures. The database automatically parses rows and updates the portal statistics.
        </p>
      </div>

      {/* Detailed Placement Records Import */}
      <div style={{ border: "1px solid var(--border-color)", padding: 24, borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.01)" }}>
        <h3 style={{ fontSize: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Award size={18} style={{ color: "var(--primary)" }} /> Bulk Import Detailed Student Placement Records
        </h3>

        {/* Schema / Format Validation Error Banner */}
        {schemaError && (
          <div style={{
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "var(--radius-md)",
            padding: 16,
            background: "rgba(239, 68, 68, 0.08)",
            marginBottom: 16,
            color: "var(--danger)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <ShieldAlert size={22} style={{ color: "var(--danger)", flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: 14 }}>Invalid Excel Schema / Format Error</strong>
                <div style={{ fontSize: 13, marginTop: 2, color: "var(--text-primary)" }}>
                  {schemaError}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSchemaError(null)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Stage 1: Selected File Preview & Submit Action Card */}
        {selectedExcelFile ? (
          <div style={{ border: "2px solid var(--primary)", borderRadius: "var(--radius-md)", padding: 20, background: "rgba(99, 102, 241, 0.08)", marginBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(16, 185, 129, 0.18)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileSpreadsheet size={26} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Selected Sheet (Ready to Submit)
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>
                    {selectedExcelFile.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                    Size: {(selectedExcelFile.size / 1024).toFixed(1)} KB &bull; Type: {selectedExcelFile.name.split('.').pop().toUpperCase()} document
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => uploadAndIngestFile(selectedExcelFile)}
                  disabled={loading}
                  style={{ height: 40, padding: "0 22px", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}
                >
                  <CheckCircle size={18} />
                  {loading ? "Submitting & Parsing..." : "Submit & Process Excel Sheet"}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (placementFileRef.current) placementFileRef.current.value = "";
                    placementFileRef.current?.click();
                  }}
                  style={{ height: 40, padding: "0 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Upload size={14} /> Change File
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedExcelFile(null);
                    setSchemaError(null);
                    if (placementFileRef.current) placementFileRef.current.value = "";
                  }}
                  style={{ background: "rgba(239, 68, 68, 0.12)", border: "none", color: "var(--danger)", padding: "8px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
                >
                  <X size={16} /> Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Main Excel Dropzone Box */
          <div
            className="excel-dropzone"
            onClick={() => {
              if (placementFileRef.current) placementFileRef.current.value = "";
              placementFileRef.current?.click();
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFileSelection(file);
            }}
            style={{
              marginBottom: 16,
              cursor: loading ? "wait" : "pointer",
              padding: "32px 24px",
              textAlign: "center",
              border: activeFileName ? "2px solid var(--primary)" : "2px dashed var(--primary)",
              borderRadius: "var(--radius-md)",
              background: activeFileName ? "rgba(99, 102, 241, 0.08)" : "rgba(99, 102, 241, 0.03)",
              transition: "all 0.2s ease"
            }}
          >
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Upload className="animate-spin" size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "var(--primary)" }}>
                    Uploading &amp; Ingesting Excel File...
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                    Parsing rows and updating database records...
                  </div>
                </div>
              </div>
            ) : activeFileName ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}>
                  <FileSpreadsheet size={30} />
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Active Uploaded Excel Sheet
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginTop: 4, letterSpacing: "-0.01em" }}>
                    {activeFileName}
                  </div>
                  {latestUpload && (
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                      Uploaded on {new Date(latestUpload.createdAt).toLocaleString()} &bull; {latestUpload.totalRows} total rows ({latestUpload.successfullyImported} new, {latestUpload.updatedRecords} updated)
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (placementFileRef.current) placementFileRef.current.value = "";
                      placementFileRef.current?.click();
                    }}
                    style={{ height: 40, padding: "0 22px", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", boxShadow: "0 4px 12px rgba(99,102,241,0.25)" }}
                  >
                    <Upload size={16} /> Click to Select / Replace Sheet
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <Upload className="excel-dropzone-icon" size={40} style={{ color: "var(--primary)" }} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                    Drag &amp; Drop or Click to Select / Update Placement Excel Sheet
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                    Supports .xlsx, .xls, and .csv format matching required template headers.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          type="file"
          ref={placementFileRef}
          style={{ display: "none" }}
          accept=".xlsx, .xls, .csv"
          onClick={(e) => { e.target.value = null; }}
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) handleFileSelection(file);
          }}
          disabled={loading}
        />

        <button
          type="button"
          onClick={downloadTemplate}
          className="btn btn-secondary"
          style={{ width: "100%", height: 38, fontSize: 13 }}
        >
          <Download size={14} style={{ marginRight: 6 }} /> Download Detailed Placement Records CSV Template
        </button>

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 1. Upload Result Summary */}
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

          {/* 2. Branch Registered Students Count Config Editor */}
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




        </div>
      </div>
    </div>
  );
}
