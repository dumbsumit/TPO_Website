import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAppContext } from "../appContext";
import { Download, FileSpreadsheet } from "lucide-react";

export default function Reports() {
  const { token, API_URL, showToast } = useAppContext();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [reportType, setReportType] = useState("overall");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/admin/students`, { headers: authHeaders.headers, params: { limit: 100000 } });
      setStudents(res.data.students || []);
    } catch (err) {
      console.error("Error loading reports data:", err);
      showToast("Failed to fetch placement records", "error");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const branches = [...new Set(students.map(s => s.branch).filter(Boolean))].sort();
  const genders = [...new Set(students.map(s => s.gender).filter(Boolean))].sort();
  const companyNamesSet = new Set();
  students.forEach(s => {
    s.offers?.forEach(o => { if (o.companyName) companyNamesSet.add(o.companyName); });
    s.internships?.forEach(i => { if (i.companyName) companyNamesSet.add(i.companyName); });
  });
  const companies = [...companyNamesSet].sort();

  const calculateMedian = (arr) => {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  };

  const filteredStudents = students.filter(student => {
    if (selectedBranch && student.branch !== selectedBranch) return false;
    if (selectedGender && student.gender !== selectedGender) return false;
    if (selectedCompany) {
      const hasComp = student.offers?.some(o => o.companyName === selectedCompany) || student.internships?.some(i => i.companyName === selectedCompany);
      if (!hasComp) return false;
    }
    return true;
  });

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
    const avg = pkgs.length > 0 ? (pkgs.reduce((a, b) => a + b, 0) / pkgs.length).toFixed(2) : "—";
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
  } else if (reportType === "company") {
    exportFileName = "company_wise_placement_report";
    reportHeaders = ["Company Name", "Total Placed", "Average Package", "Median Package", "Highest Package", "Lowest Package", "Internships", "PPOs"];
    const companyMap = {};
    filteredStudents.forEach(s => {
      s.offers?.forEach(o => {
        if (!o.companyName) return;
        const name = o.companyName.trim();
        if (!companyMap[name]) companyMap[name] = { name, studentsSet: new Set(), packages: [], internships: 0, ppos: 0 };
        companyMap[name].studentsSet.add(s._id);
        if (typeof o.packageLpa === "number") companyMap[name].packages.push(o.packageLpa);
      });
      s.internships?.forEach(i => {
        if (!i.companyName) return;
        const name = i.companyName.trim();
        if (!companyMap[name]) companyMap[name] = { name, studentsSet: new Set(), packages: [], internships: 0, ppos: 0 };
        companyMap[name].studentsSet.add(s._id);
        companyMap[name].internships++;
        if (i.ppo === "Yes") companyMap[name].ppos++;
      });
    });
    reportData = Object.keys(companyMap).map(name => {
      const c = companyMap[name];
      const avg = c.packages.length > 0 ? (c.packages.reduce((a, b) => a + b, 0) / c.packages.length).toFixed(2) : null;
      const max = c.packages.length > 0 ? Math.max(...c.packages).toFixed(2) : null;
      const min = c.packages.length > 0 ? Math.min(...c.packages).toFixed(2) : null;
      const med = c.packages.length > 0 ? calculateMedian(c.packages).toFixed(2) : null;
      return { companyName: name, placedCount: c.studentsSet.size, averagePackage: avg !== null ? `${avg} LPA` : "—", medianPackage: med !== null ? `${med} LPA` : "—", highestPackage: max !== null ? `${max} LPA` : "—", lowestPackage: min !== null ? `${min} LPA` : "—", internshipsCount: c.internships, ppoCount: c.ppos };
    }).sort((a, b) => b.placedCount - a.placedCount);
  } else if (reportType === "branch") {
    exportFileName = "branch_wise_placement_report";
    reportHeaders = ["Branch", "Total Students", "Placed Students", "Placement %", "Average Package", "Median Package", "Highest Package", "Lowest Package", "Internships", "PPOs", "Multiple Offers"];
    const branchMap = {};
    filteredStudents.forEach(s => {
      const name = s.branch || "Unknown";
      if (!branchMap[name]) branchMap[name] = { name, total: 0, placed: 0, packages: [], internships: 0, ppos: 0, multiple: 0 };
      const b = branchMap[name];
      b.total++;
      const isPlaced = s.offers && s.offers.length > 0;
      if (isPlaced) {
        b.placed++;
        if (s.offers.length > 1) b.multiple++;
        s.offers.forEach(o => { if (typeof o.packageLpa === "number") b.packages.push(o.packageLpa); });
      }
      s.internships?.forEach(i => { b.internships++; if (i.ppo === "Yes") b.ppos++; });
    });
    reportData = Object.keys(branchMap).map(name => {
      const b = branchMap[name];
      const pct = b.total > 0 ? ((b.placed / b.total) * 100).toFixed(2) : 0;
      const avg = b.packages.length > 0 ? (b.packages.reduce((a, b) => a + b, 0) / b.packages.length).toFixed(2) : null;
      const max = b.packages.length > 0 ? Math.max(...b.packages).toFixed(2) : null;
      const min = b.packages.length > 0 ? Math.min(...b.packages).toFixed(2) : null;
      const med = b.packages.length > 0 ? calculateMedian(b.packages).toFixed(2) : null;
      return { branchName: name, totalStudents: b.total, placedStudents: b.placed, placementPercentage: `${pct}%`, averagePackage: avg !== null ? `${avg} LPA` : "—", medianPackage: med !== null ? `${med} LPA` : "—", highestPackage: max !== null ? `${max} LPA` : "—", lowestPackage: min !== null ? `${min} LPA` : "—", internshipCount: b.internships, ppoCount: b.ppos, multipleOffers: b.multiple };
    }).sort((a, b) => b.totalStudents - a.totalStudents);
  } else if (reportType === "student") {
    exportFileName = "student_placement_report";
    reportHeaders = ["Student Name", "PRN", "Branch", "Gender", "Primary Company", "Primary Package", "Secondary Company", "Secondary Package", "Internship", "Placement Status"];
    reportData = filteredStudents.map(s => {
      const primary = s.offers?.find(o => o.offerType === "PRIMARY") || s.offers?.[0] || {};
      const secondary = s.offers?.find(o => o.offerType === "SECONDARY") || s.offers?.[1] || {};
      return { name: s.name, prn: s.prn, branch: s.branch, gender: s.gender, primaryCompany: primary.companyName || "—", primaryPackage: primary.packageLpa !== undefined ? `${primary.packageLpa} LPA` : "—", secondaryCompany: secondary.companyName || "—", secondaryPackage: secondary.packageLpa !== undefined ? `${secondary.packageLpa} LPA` : "—", internship: s.internships && s.internships.length > 0 ? "Yes" : "No", status: s.offers && s.offers.length > 0 ? "Placed" : "Unplaced" };
    });
  } else if (reportType === "internship") {
    exportFileName = "student_internships_report";
    reportHeaders = ["Student Name", "Branch", "Internship Company", "Start Date", "End Date", "Stipend", "PPO Status", "Internship Status"];
    filteredStudents.forEach(s => {
      s.internships?.forEach(i => {
        reportData.push({ name: s.name, branch: s.branch, companyName: i.companyName || "—", startDate: i.startDate ? new Date(i.startDate).toLocaleDateString() : "—", endDate: i.endDate ? new Date(i.endDate).toLocaleDateString() : "—", stipend: i.stipend !== undefined && i.stipend !== null ? `₹${i.stipend.toLocaleString()}/mo` : "—", ppo: i.ppo || "No", status: i.status || "Active" });
      });
    });
  } else if (reportType === "package") {
    exportFileName = "salary_packages_report";
    reportHeaders = ["Student Name", "PRN", "Branch", "Company Name", "Salary Package", "Offer Type", "Placement Status"];
    filteredStudents.forEach(s => {
      s.offers?.forEach(o => {
        reportData.push({ name: s.name, prn: s.prn, branch: s.branch, companyName: o.companyName || "—", packageLpa: o.packageLpa !== undefined ? o.packageLpa : null, offerType: o.offerType || "PRIMARY", status: o.placementStatus || "Placed" });
      });
    });
    reportData.sort((a, b) => { if (a.packageLpa === null) return 1; if (b.packageLpa === null) return -1; return b.packageLpa - a.packageLpa; });
    reportData = reportData.map(r => ({ ...r, packageLpa: r.packageLpa !== null ? `${r.packageLpa} LPA` : "—" }));
  } else if (reportType === "multiple") {
    exportFileName = "multiple_offers_report";
    reportHeaders = ["Student Name", "PRN", "Branch", "Primary Company", "Primary Package", "Secondary Company", "Secondary Package", "Total Offers"];
    reportData = filteredStudents.filter(s => s.offers && s.offers.length > 1).map(s => {
      const primary = s.offers?.find(o => o.offerType === "PRIMARY") || s.offers?.[0] || {};
      const secondary = s.offers?.find(o => o.offerType === "SECONDARY") || s.offers?.[1] || {};
      return { name: s.name, prn: s.prn, branch: s.branch, primaryCompany: primary.companyName || "—", primaryPackage: primary.packageLpa !== undefined ? `${primary.packageLpa} LPA` : "—", secondaryCompany: secondary.companyName || "—", secondaryPackage: secondary.packageLpa !== undefined ? `${secondary.packageLpa} LPA` : "—", totalOffers: s.offers.length };
    });
  }

  const handleExport = (format) => {
    if (reportData.length === 0) { showToast("No report data available to export", "error"); return; }
    const csvRows = [];
    csvRows.push(reportHeaders.join(","));
    reportData.forEach(row => {
      const values = Object.values(row).map(val => { const escaped = ("" + val).replace(/"/g, '""'); return `"${escaped}"`; });
      csvRows.push(values.join(","));
    });
    const csvContent = csvRows.join("\n");
    const blobContent = format === "excel" ? "\uFEFF" + csvContent : csvContent;
    const blob = new Blob([blobContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${exportFileName}.csv`);
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
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 20 }}>Placement Management Reports Generator</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>Generate and export custom analytics reports from unified student records.</p>
        </div>

        <div className="filter-bar" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, margin: 0, padding: 0, border: "none", background: "none" }}>
          <div className="form-group">
            <label>Select Report Type</label>
            <select className="form-control" value={reportType} onChange={(e) => setReportType(e.target.value)} style={{ height: 38, fontWeight: 600 }}>
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
            <select className="form-control" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} style={{ height: 38 }}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Gender Filter</label>
            <select className="form-control" value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} style={{ height: 38 }}>
              <option value="">All Genders</option>
              {genders.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Company Filter</label>
            <select className="form-control" value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} style={{ height: 38 }}>
              <option value="">All Companies</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => handleExport("csv")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }} disabled={reportData.length === 0}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => handleExport("excel")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }} disabled={reportData.length === 0}>
            <FileSpreadsheet size={14} /> Export Excel
          </button>
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h3 style={{ fontSize: 18, borderBottom: "1px solid var(--border-color)", paddingBottom: 12, margin: 0 }}>Report View: {reportHeaders.join(" / ")}</h3>
        {reportData.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40 }}>No records matched report criteria.</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>{reportHeaders.map((hdr, hIdx) => <th key={hIdx}>{hdr}</th>)}</tr>
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
