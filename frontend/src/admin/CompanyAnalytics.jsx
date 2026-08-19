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

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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
        <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40 }}>No recruiting companies found matching your search.</div>
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
                      <button onClick={() => setSelectedCompany(c)} className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 11, height: 28 }}>
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
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }}>Previous</button>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Page <strong>{currentPage}</strong> of {pages}</span>
              <button disabled={currentPage === pages} onClick={() => setCurrentPage(p => Math.min(pages, p + 1))} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }}>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
