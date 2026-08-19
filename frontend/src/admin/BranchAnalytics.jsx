import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAppContext } from "../appContext";
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
  }).sort((a, b) => b.totalStudents - a.totalStudents);

  const formatLPA = (val) => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return `${parseFloat(Number(val).toFixed(2))} LPA`;
  };

  const hasData = branchStatsList.length > 0;

  const packageComparisonData = hasData ? {
    labels: branchStatsList.map(b => b.branchName),
    datasets: [
      { label: "Average Package (LPA)", data: branchStatsList.map(b => b.averagePackage || 0), backgroundColor: "rgba(6, 182, 212, 0.75)", borderColor: "#06b6d4", borderWidth: 1, borderRadius: 4 },
      { label: "Highest Package (LPA)", data: branchStatsList.map(b => b.highestPackage || 0), backgroundColor: "rgba(47, 49, 146, 0.75)", borderColor: "#2f3192", borderWidth: 1, borderRadius: 4 }
    ]
  } : null;

  const placementPercentageData = hasData ? {
    labels: branchStatsList.map(b => b.branchName),
    datasets: [{ label: "Placement Rate (%)", data: branchStatsList.map(b => b.placementPercentage), backgroundColor: "rgba(16, 185, 129, 0.75)", borderColor: "#10b981", borderWidth: 1, borderRadius: 4 }]
  } : null;

  const companyDistributionData = hasData ? {
    labels: branchStatsList.map(b => b.branchName),
    datasets: [{ label: "Recruiting Companies Visited", data: branchStatsList.map(b => b.companyCount), backgroundColor: "rgba(138, 63, 252, 0.75)", borderColor: "#8a3ffc", borderWidth: 1, borderRadius: 4 }]
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

  if (loading) {
    return <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>Loading branch statistics...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: 12 }}>
          <h2 style={{ fontSize: 20 }}>Branch Comparison Placement Table</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>Overview metrics across all academic departments.</p>
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

      {hasData && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 30 }}>
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
              {branchStatsList.map((b, idx) => (
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
