import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAppContext } from "../App";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Landmark, TrendingUp, ShieldAlert, Award } from "lucide-react";

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Statistics() {
  const { API_URL } = useAppContext();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/statistics`);
        setStats(response.data);
      } catch (err) {
        console.error("Error loading statistics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [API_URL]);

  if (loading) {
    return <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>Loading statistics visualization...</div>;
  }

  if (!stats || !stats.yearlyStats || stats.yearlyStats.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        <ShieldAlert size={48} style={{ color: "var(--warning)", marginBottom: 16 }} />
        <h3>No Statistics Data Available</h3>
        <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>
          Upload stats from the admin dashboard Excel tool to render charts.
        </p>
      </div>
    );
  }

  const sortedYearly = [...stats.yearlyStats].sort((a, b) => a.year - b.year);
  const labels = sortedYearly.map(d => String(d.year));

  // Chart 1: Companies vs Placed
  const placementData = {
    labels,
    datasets: [
      {
        label: "Students Placed",
        data: sortedYearly.map(d => d.placed),
        backgroundColor: "rgba(99, 102, 241, 0.7)",
        borderColor: "#6366f1",
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: "Companies Visited",
        data: sortedYearly.map(d => d.companies),
        backgroundColor: "rgba(6, 182, 212, 0.7)",
        borderColor: "#06b6d4",
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  // Chart 2: Average Package Growth
  const packageData = {
    labels,
    datasets: [
      {
        fill: true,
        label: "Average Package (LPA)",
        data: sortedYearly.map(d => d.avgPackage),
        borderColor: "#a855f7",
        backgroundColor: "rgba(168, 85, 247, 0.1)",
        borderWidth: 3,
        tension: 0.3,
        pointBackgroundColor: "#a855f7",
        pointHoverRadius: 8
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#94a3b8",
          font: { family: "Inter", size: 12 }
        }
      },
      tooltip: {
        backgroundColor: "#131b2e",
        titleColor: "#f8fafc",
        bodyColor: "#94a3b8",
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { color: "rgba(255, 255, 255, 0.04)" },
        ticks: { color: "#94a3b8", font: { family: "Inter" } }
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.04)" },
        ticks: { color: "#94a3b8", font: { family: "Inter" } }
      }
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>Placement Statistics</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Visual analysis of yearly placement updates, recruiter drives, and compensation statistics.
        </p>
      </div>

      {/* Aggregate Counters */}
      <div className="stats-grid" style={{ marginBottom: 40 }}>
        <div className="stat-card">
          <div className="stat-number">{stats.totalCompanies}</div>
          <div className="stat-label">Total Recruiters (2025)</div>
        </div>
        
        <div className="stat-card accent">
          <div className="stat-number">{stats.totalPlaced}</div>
          <div className="stat-label">Placed Offers (2025)</div>
        </div>
        
        <div className="stat-card secondary">
          <div className="stat-number">{stats.highestPackage} LPA</div>
          <div className="stat-label">Highest Drive CTC</div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-number">{stats.averagePackage} LPA</div>
          <div className="stat-label">Average Batch CTC</div>
        </div>
      </div>

      {/* Visual Graphs Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, marginBottom: 50 }}>
        
        <div className="card" style={{ minHeight: 380, display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: 18, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={18} style={{ color: "var(--primary)" }} /> Yearly Recruitment & Offers
          </h3>
          <div style={{ flex: 1, position: "relative" }}>
            <Bar data={placementData} options={chartOptions} />
          </div>
        </div>

        <div className="card" style={{ minHeight: 380, display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: 18, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <Award size={18} style={{ color: "var(--secondary)" }} /> Average Package Growth (LPA)
          </h3>
          <div style={{ flex: 1, position: "relative" }}>
            <Line data={packageData} options={chartOptions} />
          </div>
        </div>

      </div>

      {/* Overview Analytics Details */}
      <div className="card">
        <h3 style={{ fontSize: 20, marginBottom: 16 }}>Recruitment Numerical Summary</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Companies Visited</th>
                <th>Total Placed</th>
                <th>Average Compensation</th>
              </tr>
            </thead>
            <tbody>
              {sortedYearly.map(row => (
                <tr key={row._id || row.year}>
                  <td style={{ fontWeight: 600 }}>{row.year}</td>
                  <td>{row.companies} Companies</td>
                  <td>{row.placed} Placed</td>
                  <td style={{ color: "var(--success)", fontWeight: 500 }}>{row.avgPackage} LPA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
