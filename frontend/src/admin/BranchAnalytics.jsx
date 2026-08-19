import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAppContext } from "../appContext";
import {
  Award, FileSpreadsheet, User, Check, Search,
  Building2, TrendingUp, Filter, ArrowUpDown, X,
  RotateCcw, LayoutGrid, Table as TableIcon,
  GraduationCap, Users, Percent, ChevronRight, ChevronDown
} from "lucide-react";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function BranchAnalytics() {
  const { token, API_URL, showToast } = useAppContext();
  const [students, setStudents] = useState([]);
  const [branchConfigs, setBranchConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, filter & sort state
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("placementPercentage");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewMode, setViewMode] = useState("auto"); // 'auto', 'table', 'grid'
  const [expandedCompanies, setExpandedCompanies] = useState({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      const [resStudents, resConfigs] = await Promise.all([
        axios.get(`${API_URL}/admin/students`, { headers: authHeaders.headers, params: { limit: 100000 } }),
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

  useEffect(() => { loadData(); }, [loadData]);

  const calculateMedian = (arr) => {
    if (!arr || arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
    return sorted[mid];
  };

  const branchMap = {};
  students.forEach(s => {
    const branchName = s.branch || "Unknown";
    if (!branchMap[branchName]) {
      branchMap[branchName] = { name: branchName, totalStudents: 0, placedStudents: 0, packages: [], internships: 0, ppos: 0, multipleOffers: 0, companiesSet: new Set() };
    }
    const b = branchMap[branchName];
    b.totalStudents++;
    if (s.offers && s.offers.length > 0) {
      b.placedStudents++;
      if (s.offers.length > 1) b.multipleOffers++;
      s.offers.forEach(o => {
        if (typeof o.packageLpa === "number") b.packages.push(o.packageLpa);
        if (o.companyName) b.companiesSet.add(o.companyName);
      });
    }
    s.internships?.forEach(i => {
      b.internships++;
      if (i.ppo === "Yes") b.ppos++;
      if (i.companyName) b.companiesSet.add(i.companyName);
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

  // Filter & Sort Logic
  const filteredBranches = branchStatsList.filter(b => {
    if (search.trim()) {
      return b.branchName.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const sortedBranches = [...filteredBranches].sort((a, b) => {
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

  // Executive KPI Aggregations
  const totalBranches = branchStatsList.length;
  const grandTotalStudents = branchStatsList.reduce((acc, b) => acc + b.totalStudents, 0);
  const grandTotalPlaced = branchStatsList.reduce((acc, b) => acc + b.placedStudents, 0);
  const overallPlacementRate = grandTotalStudents > 0 ? ((grandTotalPlaced / grandTotalStudents) * 100).toFixed(1) : 0;
  const overallHighestPackage = branchStatsList.reduce((max, b) => (b.highestPackage && b.highestPackage > max ? b.highestPackage : max), 0);

  const hasData = sortedBranches.length > 0;

  const packageComparisonData = hasData ? {
    labels: sortedBranches.map(b => b.branchName),
    datasets: [
      { label: "Average Package (LPA)", data: sortedBranches.map(b => b.averagePackage || 0), backgroundColor: "rgba(6, 182, 212, 0.75)", borderColor: "#06b6d4", borderWidth: 1, borderRadius: 4 },
      { label: "Highest Package (LPA)", data: sortedBranches.map(b => b.highestPackage || 0), backgroundColor: "rgba(47, 49, 146, 0.75)", borderColor: "#2f3192", borderWidth: 1, borderRadius: 4 }
    ]
  } : null;

  const placementPercentageData = hasData ? {
    labels: sortedBranches.map(b => b.branchName),
    datasets: [{ label: "Placement Rate (%)", data: sortedBranches.map(b => b.placementPercentage), backgroundColor: "rgba(16, 185, 129, 0.75)", borderColor: "#10b981", borderWidth: 1, borderRadius: 4 }]
  } : null;

  const companyDistributionData = hasData ? {
    labels: sortedBranches.map(b => b.branchName),
    datasets: [{ label: "Recruiting Companies Visited", data: sortedBranches.map(b => b.companyCount), backgroundColor: "rgba(138, 63, 252, 0.75)", borderColor: "#8a3ffc", borderWidth: 1, borderRadius: 4 }]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { color: "#475569", font: { family: "Inter", size: 11, weight: 500 } } },
      tooltip: { backgroundColor: "#2f3192", titleColor: "#ffffff", bodyColor: "#ffffff", padding: 10, cornerRadius: 6 }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#64748b", font: { family: "Inter" } } },
      y: { grid: { color: "rgba(47, 49, 146, 0.05)" }, ticks: { color: "#64748b", font: { family: "Inter" } } }
    }
  };

  const toggleExpandCompany = (idx) => {
    setExpandedCompanies(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (loading) {
    return <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>Loading branch statistics...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      {/* Top Banner Card */}
      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <GraduationCap size={24} style={{ color: "var(--primary)" }} /> Department &amp; Branch Analytics
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4, margin: "4px 0 0" }}>
              Placement percentages, average salaries, and recruiting breakdown across academic branches.
            </p>
          </div>
          <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "rgba(99,102,241,0.12)", color: "var(--primary)", fontWeight: 700, border: "1px solid rgba(99,102,241,0.2)" }}>
            {totalBranches} Departments
          </span>
        </div>

        {/* Executive KPI Summary Grid */}
        <div className="wce-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginTop: 4, width: "100%", boxSizing: "border-box" }}>
          <div className="wce-stat-card" style={{ padding: 14 }}>
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--primary)", background: "var(--primary-glow)" }}>
              <GraduationCap size={18} />
            </div>
            <div className="wce-stat-info">
              <h3 style={{ fontSize: 18 }}>{totalBranches}</h3>
              <p style={{ fontSize: 11 }}>Academic Branches</p>
            </div>
          </div>
          <div className="wce-stat-card" style={{ padding: 14 }}>
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--accent)", background: "var(--accent-glow)" }}>
              <Percent size={18} />
            </div>
            <div className="wce-stat-info">
              <h3 style={{ fontSize: 18 }}>{overallPlacementRate}%</h3>
              <p style={{ fontSize: 11 }}>Overall Placement Rate</p>
            </div>
          </div>
          <div className="wce-stat-card" style={{ padding: 14 }}>
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--success)", background: "rgba(16, 185, 129, 0.1)" }}>
              <Users size={18} />
            </div>
            <div className="wce-stat-info">
              <h3 style={{ fontSize: 18 }}>{grandTotalPlaced} / {grandTotalStudents}</h3>
              <p style={{ fontSize: 11 }}>Total Placed Students</p>
            </div>
          </div>
          <div className="wce-stat-card" style={{ padding: 14 }}>
            <div className="wce-stat-icon-wrapper" style={{ color: "var(--secondary)", background: "rgba(138, 63, 252, 0.1)" }}>
              <Award size={18} />
            </div>
            <div className="wce-stat-info">
              <h3 style={{ fontSize: 18 }}>{formatLPA(overallHighestPackage)}</h3>
              <p style={{ fontSize: 11 }}>Highest Branch Offer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Center Card (Search, Sort, Filters & View Toggle) */}
      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, width: "100%", boxSizing: "border-box" }}>
          
          {/* Search Input */}
          <div style={{ flex: "1 1 180px", minWidth: 160 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Search Branch</label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search branch name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 34, height: 38, fontSize: 13, width: "100%", boxSizing: "border-box" }}
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
          <div style={{ flex: "1 1 160px", minWidth: 150 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Sort Field</label>
            <select
              className="form-control"
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              style={{ height: 38, fontSize: 13, fontWeight: 600, width: "100%", boxSizing: "border-box" }}
            >
              <option value="placementPercentage">Placement Rate (%)</option>
              <option value="totalStudents">Total Students</option>
              <option value="placedStudents">Placed Students Count</option>
              <option value="averagePackage">Average Package (LPA)</option>
              <option value="highestPackage">Highest Package (LPA)</option>
              <option value="ppoCount">PPO Count</option>
              <option value="branchName">Branch Name (A-Z)</option>
            </select>
          </div>

          {/* Sort Direction Toggle */}
          <div style={{ flex: "1 1 150px", minWidth: 140 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Sort Order</label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSortOrder(order => order === "asc" ? "desc" : "asc")}
              style={{ height: 38, width: "100%", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxSizing: "border-box" }}
            >
              <ArrowUpDown size={14} />
              {sortOrder === "desc" ? "High to Low (Desc)" : "Low to High (Asc)"}
            </button>
          </div>
        </div>

        {/* Action bar (Reset & View Toggle) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border-color)", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Showing <strong>{sortedBranches.length}</strong> of {branchStatsList.length} branches
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* View Mode Toggle Buttons */}
            <div style={{ display: "flex", background: "var(--bg-secondary)", borderRadius: 6, padding: 2, gap: 2 }}>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                style={{
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 4,
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
                  borderRadius: 4,
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

            {search && (
              <button
                className="btn btn-secondary"
                onClick={() => { setSearch(""); setSortField("placementPercentage"); setSortOrder("desc"); }}
                style={{ padding: "5px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Display Area */}
      {!hasData ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40, width: "100%", boxSizing: "border-box" }}>
          No academic branch statistics found matching your search.
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
          {/* MOBILE CENTRIC CARDS GRID VIEW */}
          {(viewMode === "grid" || viewMode === "auto") && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 16,
                width: "100%",
                boxSizing: "border-box",
                marginBottom: viewMode === "auto" ? 24 : 0
              }}
            >
              {sortedBranches.map((b, idx) => (
                <div
                  key={idx}
                  className="card"
                  style={{
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 14,
                    border: "1px solid var(--border-color)",
                    boxSizing: "border-box"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--primary-glow)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <GraduationCap size={20} />
                      </div>
                      <div style={{ overflow: "hidden" }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {b.branchName}
                        </h3>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                          {b.placedStudents} of {b.totalStudents} Placed
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, padding: "3px 10px", borderRadius: 12, background: b.placementPercentage >= 80 ? "rgba(16, 185, 129, 0.15)" : "rgba(99, 102, 241, 0.15)", color: b.placementPercentage >= 80 ? "var(--success)" : "var(--primary)", fontWeight: 800, flexShrink: 0, whiteSpace: "nowrap" }}>
                      {b.placementPercentage}%
                    </span>
                  </div>

                  {/* Metrics Pill Grid for Mobile */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "var(--bg-secondary)", padding: 10, borderRadius: 8, fontSize: 12 }}>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Avg Package</div>
                      <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: 12, marginTop: 2 }}>
                        {formatLPA(b.averagePackage)}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Highest Package</div>
                      <div style={{ fontWeight: 700, color: "var(--secondary)", fontSize: 12, marginTop: 2 }}>
                        {formatLPA(b.highestPackage)}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>PPO Count</div>
                      <div style={{ fontWeight: 700, color: b.ppoCount > 0 ? "var(--success)" : "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
                        {b.ppoCount}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Recruiters</div>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 12, marginTop: 2 }}>
                        {b.companyCount} Companies
                      </div>
                    </div>
                  </div>

                  {/* Expandable Recruiters Accordion */}
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleExpandCompany(idx)}
                      style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0, display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {expandedCompanies[idx] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      {expandedCompanies[idx] ? "Hide Recruiters" : `View ${b.companyCount} Recruiting Companies`}
                    </button>
                    {expandedCompanies[idx] && (
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6, padding: 8, background: "var(--bg-secondary)", borderRadius: 6, lineHeight: 1.4 }}>
                        {b.companiesList.length > 0 ? b.companiesList.join(", ") : "No recruiters recorded"}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DESKTOP STICKY DATA TABLE VIEW */}
          {(viewMode === "table" || viewMode === "auto") && (
            <div className="card" style={{ padding: 16, width: "100%", boxSizing: "border-box" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <TableIcon size={14} /> Full Department Placement Spreadsheet:
              </div>
              <div className="table-container" style={{ maxHeight: "520px", overflowY: "auto", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", width: "100%", boxSizing: "border-box" }}>
                <table className="data-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", cursor: "pointer" }} onClick={() => handleSort("branchName")}>
                        Branch {sortField === "branchName" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", textAlign: "center", cursor: "pointer" }} onClick={() => handleSort("totalStudents")}>
                        Total Students {sortField === "totalStudents" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", textAlign: "center", cursor: "pointer" }} onClick={() => handleSort("placedStudents")}>
                        Placed Students {sortField === "placedStudents" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", textAlign: "center", cursor: "pointer" }} onClick={() => handleSort("placementPercentage")}>
                        Placement Rate {sortField === "placementPercentage" && (sortOrder === "asc" ? "▲" : "▼")}
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
                        Internship Count {sortField === "internshipCount" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", textAlign: "center", cursor: "pointer" }} onClick={() => handleSort("ppoCount")}>
                        PPO Count {sortField === "ppoCount" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-secondary)", textAlign: "center", cursor: "pointer" }} onClick={() => handleSort("multipleOfferCount")}>
                        Multiple Offers {sortField === "multipleOfferCount" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBranches.map((b, idx) => (
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
            </div>
          )}
        </div>
      )}

      {/* Visual Analytics Charts Grid */}
      {hasData && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, width: "100%", boxSizing: "border-box" }}>
          <div className="card" style={{ height: 320, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 15, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>Salary Package Comparison</h3>
            <div style={{ flex: 1, position: "relative" }}><Bar data={packageComparisonData} options={chartOptions} /></div>
          </div>

          <div className="card" style={{ height: 320, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 15, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>Placement Rates (%) by Branch</h3>
            <div style={{ flex: 1, position: "relative" }}><Bar data={placementPercentageData} options={chartOptions} /></div>
          </div>

          <div className="card" style={{ height: 320, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 15, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>Unique Recruiters by Branch</h3>
            <div style={{ flex: 1, position: "relative" }}><Bar data={companyDistributionData} options={chartOptions} /></div>
          </div>

          <div className="card" style={{ minHeight: 320, display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ fontSize: 15, borderBottom: "1px solid var(--border-color)", paddingBottom: 10, margin: 0 }}>Company Recruitment Breakdown</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 }}>
              {sortedBranches.map((b, idx) => (
                <div key={idx} style={{ padding: "8px 12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.01)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <strong>{b.branchName}</strong>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{b.companyCount} Recruiter(s)</span>
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
