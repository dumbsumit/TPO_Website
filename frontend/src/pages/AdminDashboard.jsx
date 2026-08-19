import React, { useState } from "react";
import { useAppContext } from "../appContext";
import {
  FileSpreadsheet, ShieldCheck,
  Briefcase, Award, FileText, MessageSquare,
  Sparkles, Layers
} from "lucide-react";

// Feature Modules
import ExcelImports from "../admin/ExcelImports";
import CompanyAnalytics from "../admin/CompanyAnalytics";
import BranchAnalytics from "../admin/BranchAnalytics";
import Reports from "../admin/Reports";
import ExperienceReviews from "../admin/ExperienceReviews";

export default function AdminDashboard() {
  const { } = useAppContext();
  const [activeTab, setActiveTab] = useState("excel");

  const navItems = [
    { key: "excel",       icon: <FileSpreadsheet size={17} />, label: "Excel Bulk Imports" },
    { key: "companies",   icon: <Briefcase size={17} />,       label: "Company Analytics" },
    { key: "branches",    icon: <Award size={17} />,           label: "Branch Analytics" },
    { key: "reports",     icon: <FileText size={17} />,        label: "Reports Generator" },
    { key: "experiences", icon: <MessageSquare size={17} />,   label: "Review User Responses" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      {/* Professional Page Header */}
      <div
        className="card"
        style={{
          padding: "20px 24px",
          borderRadius: 12,
          display: "flex",
          justify: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          background: "#ffffff",
          border: "1px solid var(--border-color)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)"
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10, color: "var(--text-primary)" }}>
            <ShieldCheck size={26} style={{ color: "var(--primary)" }} /> TPO Administrative Control Center
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4, margin: "4px 0 0" }}>
            Manage placement drives, bulk spreadsheet ingestion, company analytics, and student reviews.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, background: "rgba(99,102,241,0.1)", color: "var(--primary)", fontWeight: 700, border: "1px solid rgba(99,102,241,0.2)" }}>
            Admin Portal Active
          </span>
        </div>
      </div>

      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24, alignItems: "start", width: "100%", boxSizing: "border-box" }}>
        {/* Modern Sidebar Nav */}
        <aside
          style={{
            background: "#ffffff",
            border: "1px solid var(--border-color)",
            borderRadius: 12,
            padding: 12,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)"
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", padding: "8px 12px", letterSpacing: "0.05em" }}>
            Admin Navigation
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {navItems.map(item => {
              const isActive = activeTab === item.key;
              return (
                <li
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    background: isActive ? "var(--primary)" : "transparent",
                    color: isActive ? "#ffffff" : "var(--text-secondary)"
                  }}
                >
                  <span style={{ color: isActive ? "#ffffff" : "var(--primary)", display: "flex" }}>
                    {item.icon}
                  </span>
                  {item.label}
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Tab Content Wrapper */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0, width: "100%", overflow: "hidden", boxSizing: "border-box" }}>
          {activeTab === "excel"       && <ExcelImports />}
          {activeTab === "companies"   && <CompanyAnalytics />}
          {activeTab === "branches"    && <BranchAnalytics />}
          {activeTab === "reports"     && <Reports />}
          {activeTab === "experiences" && <ExperienceReviews />}
        </div>
      </div>
    </div>
  );
}
