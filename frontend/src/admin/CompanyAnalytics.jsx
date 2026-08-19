import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAppContext } from "../appContext";
import {
  Award, FileSpreadsheet, User, Check, Search
} from "lucide-react";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, ArcElement, Title, Tooltip, Legend
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

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

  const [sortField, setSortField] = useState("totalStudents");
  const [sortOrder, setSortOrder] = useState("desc");

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
    s.offers?.forEach(o => {
      if (!o.companyName) return;
      const name = o.companyName.trim();
      if (!companyMap[name]) {
        companyMap[name] = { name, packages: [], studentsSet: new Set(), primaryOffers: 0, secondaryOffers: 0, internships: 0, ppos: 0, branchBreakdown: {}, studentList: [] };
      }
      const comp = companyMap[name];
      comp.studentsSet.add(s._id);
      if (typeof o.packageLpa === "number") comp.packages.push(o.packageLpa);
      if (o.offerType === "PRIMARY") comp.primaryOffers++;
      else if (o.offerType === "SECONDARY") comp.secondaryOffers++;
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
      if (!companyMap[name]) {
        companyMap[name] = { name, packages: [], studentsSet: new Set(), primaryOffers: 0, secondaryOffers: 0, internships: 0, ppos: 0, branchBreakdown: {}, studentList: [] };
      }
      const comp = companyMap[name];
      comp.studentsSet.add(s._id);
      comp.internships++;
      if (i.ppo === "Yes") comp.ppos++;
      let existing = comp.studentList.find(x => x.prn === s.prn);
      if (!existing) {
        existing = { _id: s._id, name: s.name, prn: s.prn, branch: s.branch, gender: s.gender, offers: [], internships: [] };
        comp.studentList.push(existing);
      }
      existing.internships.push(i);
      const hasOffer = s.offers?.some(o => o.companyName.trim() === name);
      if (!hasOffer) comp.branchBreakdown[s.branch] = (comp.branchBreakdown[s.branch] || 0) + 1;
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
    setSortField("totalStudents");
    setSortOrder("desc");
  };

  if (loading) {
    return <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>Loading company analytics...</div>;
  }

  if (selectedCompany) {
    const comp = selectedCompany;
    const raw = comp.raw;

    let distUnder5 = 0, dist5to10 = 0, dist10to15 = 0, distOver15 = 0;
    raw.packages.forEach(p => {
      if (p < 5) distUnder5++;
      else if (p >= 5 && p < 10) dist5to10++;
      else if (p >= 10 && p < 15) dist10to15++;
      else distOver15++;
    });

    const distData = {
      labels: ["< 5 LPA", "5-10 LPA", "10-15 LPA", "> 15 LPA"],
      datasets: [{
        data: [distUnder5, dist5to10, dist10to15, distOver15],
        backgroundColor: ["rgba(138, 63, 252, 0.75)", "rgba(6, 182, 212, 0.75)", "rgba(245, 158, 11, 0.75)", "rgba(16, 185, 129, 0.75)"],
        borderColor: ["#8a3ffc", "#06b6d4", "#f59e0b", "#10b981"],
        borderWidth: 1
      }]
    };

    const branchLabels = Object.keys(raw.branchBreakdown).sort();
    const branchData = {
      labels: branchLabels,
      datasets: [{
        label: "Students Recruited",
        data: branchLabels.map(b => raw.branchBreakdown[b]),
        backgroundColor: "rgba(47, 49, 146, 0.75)",
        borderColor: "#2f3192",
        borderWidth: 1,
        borderRadius: 4
      }]
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

        <div className="wce-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, margin: 0 }}>
          {[
            { icon: <User size={20} />, val: comp.totalStudents, label: "Students Placed", color: "var(--primary)", bg: "var(--primary-glow)" },
            { icon: <Award size={20} />, val: formatLPA(comp.averagePackage), label: "Average Package", color: "var(--success)", bg: "rgba(16, 185, 129, 0.08)" },
            { icon: <Award size={20} />, val: formatLPA(comp.medianPackage), label: "Median Package", color: "var(--accent)", bg: "var(--accent-glow)" },
            { icon: <Award size={20} />, val: formatLPA(comp.highestPackage), label: "Highest Package", color: "var(--secondary)", bg: "rgba(138, 63, 252, 0.08)" },
            { icon: <Award size={20} />, val: formatLPA(comp.lowestPackage), label: "Lowest Package", color: "var(--primary)", bg: "var(--primary-glow)" },
            { icon: <FileSpreadsheet size={20} />, val: comp.internshipCount, label: "Internships", color: "var(--success)", bg: "rgba(16, 185, 129, 0.08)" },
            { icon: <Check size={20} />, val: comp.ppoCount, label: "PPOs Awarded", color: "var(--accent)", bg: "var(--accent-glow)" },
          ].map((item, idx) => (
            <div key={idx} className="wce-stat-card">
              <div className="wce-stat-icon-wrapper" style={{ color: item.color, background: item.bg }}>{item.icon}</div>
              <div className="wce-stat-info"><h3>{item.val}</h3><p>{item.label}</p></div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 30 }}>
          <div className="card" style={{ height: 320, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 15, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>Package Distribution</h3>
            <div style={{ flex: 1, position: "relative" }}>
              {raw.packages.length > 0 ? (
                <Doughnut data={distData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { color: "#475569", font: { family: "Inter", size: 11 } } } } }} />
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60 }}>No packages recorded for chart.</div>
              )}
            </div>
          </div>

          <div className="card" style={{ height: 320, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 15, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>Branch Recruitment Breakdown</h3>
            <div style={{ flex: 1, position: "relative" }}>
              {branchLabels.length > 0 ? (
                <Bar data={branchData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: "#64748b" } }, y: { grid: { color: "rgba(47, 49, 146, 0.05)" }, ticks: { color: "#64748b" } } } }} />
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60 }}>No branch recruitment data available.</div>
              )}
            </div>
          </div>
        </div>

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

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: 18, borderBottom: "1px solid var(--border-color)", paddingBottom: 12, margin: 0 }}>Student Placements &amp; Interns</h3>
          {paginatedDetailStudents.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 20 }}>No students found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="table-container">
                <table className="data-table">
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
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: 12 }}>
        <h2 style={{ fontSize: 20 }}>Companies Placement Analytics</h2>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Unique Recruiting Companies: <strong>{total}</strong></span>
      </div>

      {/* Filter and Search controls bar */}
      <div className="filter-bar" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, margin: 0, padding: 0, border: "none", background: "none" }}>
        <div className="form-group">
          <label>Search Company</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search company name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32, height: 38 }}
            />
            <Search size={12} style={{ position: "absolute", left: 10, top: 13, color: "var(--text-muted)" }} />
          </div>
        </div>

        <div className="form-group">
          <label>Avg Package Range</label>
          <select className="form-control" value={selectedPackageRange} onChange={(e) => setSelectedPackageRange(e.target.value)} style={{ height: 38 }}>
            <option value="">All Avg Packages</option>
            <option value="< 5">&lt; 5 LPA</option>
            <option value="5-10">5 - 10 LPA</option>
            <option value="10-15">10 - 15 LPA</option>
            <option value="> 15">&gt; 15 LPA</option>
          </select>
        </div>

        <div className="form-group">
          <label>PPO Offered</label>
          <select className="form-control" value={selectedHasPpo} onChange={(e) => setSelectedHasPpo(e.target.value)} style={{ height: 38 }}>
            <option value="">All</option>
            <option value="Yes">Has PPO Offers</option>
            <option value="No">No PPO Offers</option>
          </select>
        </div>

        <div className="form-group">
          <label>Internship Offered</label>
          <select className="form-control" value={selectedHasInternship} onChange={(e) => setSelectedHasInternship(e.target.value)} style={{ height: 38 }}>
            <option value="">All</option>
            <option value="Yes">Has Internships</option>
            <option value="No">No Internships</option>
          </select>
        </div>
      </div>

      {(search || selectedPackageRange || selectedHasPpo || selectedHasInternship) && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={handleResetFilters} style={{ padding: "6px 16px", fontSize: 12 }}>
            Reset Filters
          </button>
        </div>
      )}

      {sortedCompanies.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40 }}>No recruiting companies found matching your filters.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Scrollable Container with sticky headers */}
          <div className="table-container" style={{ maxHeight: "550px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
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
                      <button onClick={() => setSelectedCompany(c)} className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 11, height: 28 }}>
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
  );
}
