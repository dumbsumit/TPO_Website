import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAppContext } from "../appContext";
import {
  Award, FileSpreadsheet, User, Check, Search,
  Building2, Briefcase, TrendingUp, Filter,
  ArrowUpDown, SlidersHorizontal, ArrowUpRight,
  Users, ChevronRight, X, RotateCcw, LayoutGrid, Table as TableIcon
} from "lucide-react";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, ArcElement, Title, Tooltip, Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function CompanyAnalytics() {
  const { token, API_URL, showToast } = useAppContext();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCompany, setSelectedCompany] = useState(null);

  // Search, filter, and sort state
  const [search, setSearch] = useState("");
  const [selectedPackageRange, setSelectedPackageRange] = useState("");
  const [selectedHasPpo, setSelectedHasPpo] = useState("");
  const [selectedHasInternship, setSelectedHasInternship] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");

  const [sortField, setSortField] = useState("totalStudents");
  const [sortOrder, setSortOrder] = useState("desc");

  // View Mode Toggle ('table' or 'grid')
  const [viewMode, setViewMode] = useState("auto");

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

  useEffect(() => { loadData(); }, [loadData]);

  const calculateMedian = (arr) => {
    if (!arr || arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
    return sorted[mid];
  };

  const companyMap = {};
  students.forEach(s => {
    // Process ONLY PRIMARY (Company 1) offers for all stats
    s.offers?.forEach(o => {
      if (!o.companyName) return;
      if (o.offerType !== "PRIMARY") return; // STRICTLY ONLY COMPANY 1 DATA

      const name = o.companyName.trim();
      const statusStr = String(o.placementStatus || "").toLowerCase();
      const isPpoInStatus = statusStr.includes("ppo");
      const isInternInStatus = statusStr.includes("intern") || statusStr.includes("inter");

      if (!companyMap[name]) {
        companyMap[name] = { name, packages: [], studentsSet: new Set(), primaryOffers: 0, secondaryOffers: 0, internships: 0, ppos: 0, branchBreakdown: {}, studentList: [] };
      }
      const comp = companyMap[name];
      comp.studentsSet.add(s._id);
      if (typeof o.packageLpa === "number") comp.packages.push(o.packageLpa);
      comp.primaryOffers++;
      
      if (isPpoInStatus) comp.ppos++;
      if (isInternInStatus) comp.internships++;

      comp.branchBreakdown[s.branch] = (comp.branchBreakdown[s.branch] || 0) + 1;
      let existing = comp.studentList.find(x => x.prn === s.prn);
      if (!existing) {
        existing = { _id: s._id, name: s.name, prn: s.prn, branch: s.branch, gender: s.gender, offers: [], internships: [] };
        comp.studentList.push(existing);
      }
      existing.offers.push(o);
    });

    s.internships?.forEach(i => {
      if (!i.companyName) return;
      const name = i.companyName.trim();
      const ppoStr = String(i.ppo || "").toLowerCase();
      const statusStr = String(i.status || "").toLowerCase();
      const isPpo = ppoStr === "yes" || statusStr.includes("ppo");

      if (!companyMap[name]) {
        companyMap[name] = { name, packages: [], studentsSet: new Set(), primaryOffers: 0, secondaryOffers: 0, internships: 0, ppos: 0, branchBreakdown: {}, studentList: [] };
      }
      const comp = companyMap[name];
      
      const hasOffer = s.offers?.some(o => o.offerType === "PRIMARY" && o.companyName.trim() === name);
      if (!hasOffer) {
        comp.studentsSet.add(s._id);
        comp.internships++;
        if (isPpo) comp.ppos++;
        comp.branchBreakdown[s.branch] = (comp.branchBreakdown[s.branch] || 0) + 1;
      }

      let existing = comp.studentList.find(x => x.prn === s.prn);
      if (!existing) {
        existing = { _id: s._id, name: s.name, prn: s.prn, branch: s.branch, gender: s.gender, offers: [], internships: [] };
        comp.studentList.push(existing);
      }
      existing.internships.push(i);
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
  });

  const formatLPA = (val) => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return `${parseFloat(Number(val).toFixed(2))} LPA`;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(order => order === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Summary Metrics Across All Companies (Strictly Company 1 Data)
  const totalCompaniesCount = companyStatsList.length;
  const uniquePlacedStudentsCount = new Set(students.filter(s => s.offers?.some(o => o.offerType === "PRIMARY" && o.companyName)).map(s => s._id)).size;
  const totalJobOffersCount = companyStatsList.reduce((acc, c) => acc + c.primaryOffers, 0);
  const highestPackageEver = companyStatsList.reduce((max, c) => (c.highestPackage && c.highestPackage > max ? c.highestPackage : max), 0);
  const totalPposCount = companyStatsList.reduce((acc, c) => acc + c.ppoCount, 0);

  const filteredCompanies = companyStatsList.filter(c => {
    if (search.trim()) {
      if (!c.companyName.toLowerCase().includes(search.toLowerCase())) return false;
    }
    if (selectedPackageRange) {
      const avg = c.averagePackage || 0;
      if (selectedPackageRange === "< 5" && (avg === 0 || avg >= 5)) return false;
      if (selectedPackageRange === "5-10" && (avg < 5 || avg >= 10)) return false;
      if (selectedPackageRange === "10-15" && (avg < 10 || avg >= 15)) return false;
      if (selectedPackageRange === "> 15" && avg < 15) return false;
    }
    if (selectedHasPpo) {
      if (selectedHasPpo === "Yes" && c.ppoCount <= 0) return false;
      if (selectedHasPpo === "No" && c.ppoCount > 0) return false;
    }
    if (selectedHasInternship) {
      if (selectedHasInternship === "Yes" && c.internshipCount <= 0) return false;
      if (selectedHasInternship === "No" && c.internshipCount > 0) return false;
    }

    if (quickFilter === "topRecruiters" && c.totalStudents < 3) return false;
    if (quickFilter === "highPackage" && (c.highestPackage || 0) < 10) return false;
    if (quickFilter === "ppos" && c.ppoCount <= 0) return false;

    return true;
  });

  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (aVal === null || aVal === undefined) aVal = typeof bVal === "number" ? -1 : "";
    if (bVal === null || bVal === undefined) bVal = typeof aVal === "number" ? -1 : "";

    if (typeof aVal === "string") {
      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    } else {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }
  });

  const total = sortedCompanies.length;

  const handleResetFilters = () => {
    setSearch("");
    setSelectedPackageRange("");
    setSelectedHasPpo("");
    setSelectedHasInternship("");
    setQuickFilter("all");
    setSortField("totalStudents");
    setSortOrder("desc");
  };

  if (loading) {
    return <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>Loading company analytics...</div>;
  }

  // --- RENDER SELECTED COMPANY DETAILED ANALYTICS PAGE ---
  if (selectedCompany) {
    const comp = selectedCompany;
    const raw = comp.raw;

    const branchLabels = Object.keys(raw.branchBreakdown).sort();
    const branchData = {
      labels: branchLabels,
      datasets: [{
        label: "Students Recruited",
        data: branchLabels.map(b => raw.branchBreakdown[b]),
        backgroundColor: "rgba(99, 102, 241, 0.8)",
        borderColor: "#6366f1",
        borderWidth: 1,
        borderRadius: 6
      }]
    };

    const detailTotal = raw.studentList.length;
    const detailPages = Math.ceil(detailTotal / detailItemsPerPage);
    const paginatedDetailStudents = raw.studentList.slice(
      (detailStudentPage - 1) * detailItemsPerPage,
      detailStudentPage * detailItemsPerPage
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
        <div>
          <button
            onClick={() => { setSelectedCompany(null); setDetailStudentPage(1); }}
            className="btn btn-secondary"
            style={{ padding: "6px 14px", fontSize: 13, marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8 }}
          >
            ← Back to Companies List
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--primary-glow)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{comp.companyName} Analytics</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2, margin: 0 }}>
                Detailed placement performance, package breakdowns, and student lists for {comp.companyName}.
              </p>
            </div>
          </div>
        </div>

        {/* Clean Stat Grid */}
        <div className="wce-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, margin: 0, width: "100%", boxSizing: "border-box" }}>
          {[
            { icon: <User size={18} />, val: comp.totalStudents, label: "Students Placed", color: "var(--primary)", bg: "var(--primary-glow)" },
            { icon: <Award size={18} />, val: formatLPA(comp.averagePackage), label: "Average Package", color: "var(--success)", bg: "rgba(16, 185, 129, 0.1)" },
            { icon: <Award size={18} />, val: formatLPA(comp.medianPackage), label: "Median Package", color: "var(--accent)", bg: "var(--accent-glow)" },
            { icon: <Award size={18} />, val: formatLPA(comp.highestPackage), label: "Highest Package", color: "var(--secondary)", bg: "rgba(138, 63, 252, 0.1)" },
            { icon: <Award size={18} />, val: formatLPA(comp.lowestPackage), label: "Lowest Package", color: "var(--primary)", bg: "var(--primary-glow)" },
            { icon: <FileSpreadsheet size={18} />, val: comp.internshipCount, label: "Internships", color: "var(--success)", bg: "rgba(16, 185, 129, 0.1)" },
            { icon: <Check size={18} />, val: comp.ppoCount, label: "PPOs Awarded", color: "var(--accent)", bg: "var(--accent-glow)" },
          ].map((item, idx) => (
            <div key={idx} className="wce-stat-card" style={{ padding: 14, borderRadius: 10 }}>
              <div className="wce-stat-icon-wrapper" style={{ color: item.color, background: item.bg }}>{item.icon}</div>
              <div className="wce-stat-info"><h3 style={{ fontSize: 17, fontWeight: 700 }}>{item.val}</h3><p style={{ fontSize: 11 }}>{item.label}</p></div>
            </div>
          ))}
        </div>

        {/* Branch Recruitment Breakdown Chart */}
        <div style={{ width: "100%", boxSizing: "border-box" }}>
          <div className="card" style={{ height: 320, display: "flex", flexDirection: "column", padding: 20, borderRadius: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, borderBottom: "1px solid var(--border-color)", paddingBottom: 8, margin: "0 0 14px 0" }}>Branch Recruitment Breakdown</h3>
            <div style={{ flex: 1, position: "relative" }}>
              {branchLabels.length > 0 ? (
                <Bar data={branchData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: "#64748b" } }, y: { grid: { color: "rgba(99, 102, 241, 0.06)" }, ticks: { color: "#64748b" } } } }} />
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60 }}>No branch recruitment data available.</div>
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, padding: 20, borderRadius: 12, width: "100%", boxSizing: "border-box" }}>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)", borderBottom: "1px solid var(--border-color)", paddingBottom: 6, marginBottom: 10, margin: "0 0 10px 0" }}>Internship Statistics</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div>Total Internships Offered: <strong>{comp.internshipCount}</strong></div>
              <div>PPO Conversion: <strong>{comp.ppoCount}</strong></div>
              <div>Non-PPO Internships: <strong>{comp.internshipCount - comp.ppoCount}</strong></div>
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)", borderBottom: "1px solid var(--border-color)", paddingBottom: 6, marginBottom: 10, margin: "0 0 10px 0" }}>Placement Offers</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div>Total Placements Offers: <strong>{comp.primaryOffers}</strong></div>
              <div>PPO Conversion: <strong>{comp.ppoCount}</strong></div>
            </div>
          </div>
        </div>

        {/* Student Placements Table */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20, borderRadius: 12, width: "100%", boxSizing: "border-box" }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: 10, margin: 0 }}>Student Placements &amp; Interns</h3>
          {paginatedDetailStudents.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 20 }}>No students found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="table-container" style={{ overflowX: "auto", width: "100%" }}>
                <table className="data-table" style={{ width: "100%", minWidth: 600 }}>
                  <thead>
                    <tr>
                      <th>Student Name</th><th>PRN</th><th>Branch</th><th>Gender</th><th>Placement Offers</th><th>Internship Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDetailStudents.map(student => (
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
                    ))}
                  </tbody>
                </table>
              </div>
              {detailPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
                  <button disabled={detailStudentPage === 1} onClick={() => setDetailStudentPage(p => Math.max(1, p - 1))} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }}>Previous</button>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Page <strong>{detailStudentPage}</strong> of {detailPages}</span>
                  <button disabled={detailStudentPage === detailPages} onClick={() => setDetailStudentPage(p => Math.min(detailPages, p + 1))} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }}>Next</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      {/* Header Banner */}
      <div className="card" style={{ padding: 20, borderRadius: 12, display: "flex", flexDirection: "column", gap: 16, width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: "1 1 240px" }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", color: "var(--text-primary)" }}>
              <Building2 size={24} style={{ color: "var(--primary)" }} /> Companies Placement Analytics
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4, margin: "4px 0 0" }}>
              Comprehensive performance breakdown, average salaries, and recruiting statistics for all companies.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "rgba(99,102,241,0.12)", color: "var(--primary)", fontWeight: 700, border: "1px solid rgba(99,102,241,0.2)", whiteSpace: "nowrap" }}>
              {total} Recruiting Companies
            </span>
          </div>
        </div>

        {/* Overview KPI Cards */}
        <div className="wce-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginTop: 4, width: "100%", boxSizing: "border-box" }}>
          <div className="wce-stat-card" style={{ padding: 14, borderRadius: 10 }}>
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--primary)", background: "var(--primary-glow)" }}>
              <Building2 size={18} />
            </div>
            <div className="wce-stat-info">
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{totalCompaniesCount}</h3>
              <p style={{ fontSize: 11 }}>Total Companies</p>
            </div>
          </div>
          <div className="wce-stat-card" style={{ padding: 14, borderRadius: 10 }}>
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--success)", background: "rgba(16, 185, 129, 0.1)" }}>
              <Users size={18} />
            </div>
            <div className="wce-stat-info">
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{uniquePlacedStudentsCount}</h3>
              <p style={{ fontSize: 11 }}>Placed Students ({totalJobOffersCount} Offers)</p>
            </div>
          </div>
          <div className="wce-stat-card" style={{ padding: 14, borderRadius: 10 }}>
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--secondary)", background: "rgba(138, 63, 252, 0.1)" }}>
              <Award size={18} />
            </div>
            <div className="wce-stat-info">
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{formatLPA(highestPackageEver)}</h3>
              <p style={{ fontSize: 11 }}>Highest Package Offer</p>
            </div>
          </div>
          <div className="wce-stat-card" style={{ padding: 14, borderRadius: 10 }}>
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--accent)", background: "var(--accent-glow)" }}>
              <Check size={18} />
            </div>
            <div className="wce-stat-info">
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{totalPposCount}</h3>
              <p style={{ fontSize: 11 }}>PPOs Converted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Center Card */}
      <div className="card" style={{ padding: 20, borderRadius: 12, display: "flex", flexDirection: "column", gap: 16, width: "100%", boxSizing: "border-box" }}>
        {/* Quick Filter Chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <Filter size={13} /> Quick Filter:
          </span>
          {[
            { id: "all", label: "All Companies" },
            { id: "topRecruiters", label: "Top Recruiters (3+ Placements)" },
            { id: "highPackage", label: "High Package (≥10 LPA)" },
            { id: "ppos", label: "Companies with PPOs" }
          ].map(badge => (
            <button
              key={badge.id}
              type="button"
              onClick={() => setQuickFilter(badge.id)}
              style={{
                padding: "5px 12px",
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                transition: "all 0.15s ease",
                background: quickFilter === badge.id ? "var(--primary)" : "var(--bg-secondary)",
                color: quickFilter === badge.id ? "#fff" : "var(--text-secondary)"
              }}
            >
              {badge.label}
            </button>
          ))}
        </div>

        {/* Detailed Controls Flex Wrap Grid */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, width: "100%", boxSizing: "border-box" }}>
          
          {/* Search Box */}
          <div style={{ flex: "1 1 160px", minWidth: 150 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Search Company</label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Type company name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 34, height: 38, fontSize: 13, width: "100%", borderRadius: 8, boxSizing: "border-box" }}
              />
              <Search size={14} style={{ position: "absolute", left: 11, top: 12, color: "var(--text-muted)" }} />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{ position: "absolute", right: 10, top: 10, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Sort Field Selector */}
          <div style={{ flex: "1 1 150px", minWidth: 140 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Sort Field</label>
            <select
              className="form-control"
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              style={{ height: 38, fontSize: 13, fontWeight: 600, borderRadius: 8, width: "100%", boxSizing: "border-box" }}
            >
              <option value="totalStudents">Total Students Placed</option>
              <option value="companyName">Company Name (A-Z)</option>
              <option value="averagePackage">Average Package (LPA)</option>
              <option value="highestPackage">Highest Package (LPA)</option>
              <option value="ppoCount">PPO Offers Count</option>
              <option value="internshipCount">Internships Count</option>
            </select>
          </div>

          {/* Sort Direction Toggle */}
          <div style={{ flex: "1 1 140px", minWidth: 130 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Sort Order</label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSortOrder(order => order === "asc" ? "desc" : "asc")}
              style={{ height: 38, width: "100%", fontSize: 13, fontWeight: 600, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxSizing: "border-box" }}
            >
              <ArrowUpDown size={14} />
              {sortOrder === "desc" ? "High to Low (Desc)" : "Low to High (Asc)"}
            </button>
          </div>

          {/* Package Filter */}
          <div style={{ flex: "1 1 130px", minWidth: 120 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Avg Package Range</label>
            <select className="form-control" value={selectedPackageRange} onChange={(e) => setSelectedPackageRange(e.target.value)} style={{ height: 38, fontSize: 13, borderRadius: 8, width: "100%", boxSizing: "border-box" }}>
              <option value="">All Avg Packages</option>
              <option value="< 5">&lt; 5 LPA</option>
              <option value="5-10">5 - 10 LPA</option>
              <option value="10-15">10 - 15 LPA</option>
              <option value="> 15">&gt; 15 LPA</option>
            </select>
          </div>

          {/* PPO Filter */}
          <div style={{ flex: "1 1 120px", minWidth: 110 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>PPO Offered</label>
            <select className="form-control" value={selectedHasPpo} onChange={(e) => setSelectedHasPpo(e.target.value)} style={{ height: 38, fontSize: 13, borderRadius: 8, width: "100%", boxSizing: "border-box" }}>
              <option value="">All Companies</option>
              <option value="Yes">Has PPO Offers</option>
              <option value="No">No PPO Offers</option>
            </select>
          </div>

          {/* Internship Filter */}
          <div style={{ flex: "1 1 130px", minWidth: 120 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Internships Offered</label>
            <select className="form-control" value={selectedHasInternship} onChange={(e) => setSelectedHasInternship(e.target.value)} style={{ height: 38, fontSize: 13, borderRadius: 8, width: "100%", boxSizing: "border-box" }}>
              <option value="">All Companies</option>
              <option value="Yes">Has Internships</option>
              <option value="No">No Internships</option>
            </select>
          </div>
        </div>

        {/* Action bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border-color)", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Showing <strong>{sortedCompanies.length}</strong> of {companyStatsList.length} companies
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", background: "var(--bg-secondary)", borderRadius: 8, padding: 2, gap: 2 }}>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                style={{
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: viewMode === "table" ? "var(--primary)" : "transparent",
                  color: viewMode === "table" ? "#fff" : "var(--text-secondary)"
                }}
                title="Desktop Table View"
              >
                <TableIcon size={13} /> Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                style={{
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: viewMode === "grid" ? "var(--primary)" : "transparent",
                  color: viewMode === "grid" ? "#fff" : "var(--text-secondary)"
                }}
                title="Mobile Cards Grid View"
              >
                <LayoutGrid size={13} /> Mobile Cards
              </button>
            </div>

            {(search || selectedPackageRange || selectedHasPpo || selectedHasInternship || quickFilter !== "all") && (
              <button
                className="btn btn-secondary"
                onClick={handleResetFilters}
                style={{ padding: "5px 12px", fontSize: 12, borderRadius: 8, display: "flex", alignItems: "center", gap: 4 }}
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Companies Display Area */}
      {sortedCompanies.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40, borderRadius: 12, width: "100%", boxSizing: "border-box" }}>
          No recruiting companies found matching your filters.
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
          {/* MOBILE CENTRIC CARDS GRID VIEW */}
          {(viewMode === "grid" || viewMode === "auto") && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
                gap: 16,
                width: "100%",
                boxSizing: "border-box",
                marginBottom: viewMode === "auto" ? 24 : 0
              }}
            >
              {sortedCompanies.map((c, idx) => (
                <div
                  key={idx}
                  className="card"
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 14,
                    border: "1px solid var(--border-color)",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    cursor: "pointer",
                    boxSizing: "border-box"
                  }}
                  onClick={() => setSelectedCompany(c)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--primary-glow)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Building2 size={20} />
                      </div>
                      <div style={{ overflow: "hidden" }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.companyName}
                        </h3>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                          Primary: {c.primaryOffers} &bull; Sec: {c.secondaryOffers}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 12, background: "rgba(16, 185, 129, 0.15)", color: "var(--success)", fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" }}>
                      {c.totalStudents} Placed
                    </span>
                  </div>

                  {/* Metrics Pill Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "var(--bg-secondary)", padding: 10, borderRadius: 8, fontSize: 12 }}>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Avg Package</div>
                      <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: 12, marginTop: 2 }}>
                        {formatLPA(c.averagePackage)}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Highest Package</div>
                      <div style={{ fontWeight: 700, color: "var(--secondary)", fontSize: 12, marginTop: 2 }}>
                        {formatLPA(c.highestPackage)}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>PPOs Awarded</div>
                      <div style={{ fontWeight: 700, color: c.ppoCount > 0 ? "var(--success)" : "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
                        {c.ppoCount}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Internships</div>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 12, marginTop: 2 }}>
                        {c.internshipCount}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCompany(c);
                    }}
                    style={{ width: "100%", height: 34, fontSize: 12, fontWeight: 600, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    Analyze Details <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* DESKTOP STICKY DATA TABLE VIEW */}
          {(viewMode === "table" || viewMode === "auto") && (
            <div className="card" style={{ padding: 16, borderRadius: 12, width: "100%", boxSizing: "border-box" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <TableIcon size={14} /> Full Metrics Spreadsheet View:
              </div>
              <div className="table-container" style={{ maxHeight: "520px", overflowY: "auto", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", width: "100%", boxSizing: "border-box" }}>
                <table className="data-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", cursor: "pointer" }} onClick={() => handleSort("companyName")}>
                        Company Name {sortField === "companyName" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", textAlign: "center", cursor: "pointer" }} onClick={() => handleSort("totalStudents")}>
                        Total Students {sortField === "totalStudents" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", cursor: "pointer" }} onClick={() => handleSort("averagePackage")}>
                        Average Package {sortField === "averagePackage" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", cursor: "pointer" }} onClick={() => handleSort("medianPackage")}>
                        Median Package {sortField === "medianPackage" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", cursor: "pointer" }} onClick={() => handleSort("highestPackage")}>
                        Highest Package {sortField === "highestPackage" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", cursor: "pointer" }} onClick={() => handleSort("lowestPackage")}>
                        Lowest Package {sortField === "lowestPackage" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", textAlign: "center", cursor: "pointer" }} onClick={() => handleSort("internshipCount")}>
                        Internships {sortField === "internshipCount" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", textAlign: "center", cursor: "pointer" }} onClick={() => handleSort("ppoCount")}>
                        PPO Count {sortField === "ppoCount" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", textAlign: "center", cursor: "pointer" }} onClick={() => handleSort("primaryOffers")}>
                        Primary {sortField === "primaryOffers" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", textAlign: "center", cursor: "pointer" }} onClick={() => handleSort("secondaryOffers")}>
                        Secondary {sortField === "secondaryOffers" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", textAlign: "center" }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCompanies.map((c, idx) => (
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
                          <button onClick={() => setSelectedCompany(c)} className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 11, height: 28, borderRadius: 6 }}>
                            Analyze Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
