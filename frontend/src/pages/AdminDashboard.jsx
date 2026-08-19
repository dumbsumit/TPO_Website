import React, { useState } from "react";
import { useAppContext } from "../appContext";
import {
  FileSpreadsheet, ShieldCheck,
  Briefcase, Award, FileText, MessageSquare,
  Sparkles, Layers, ChevronRight, Activity
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
    { key: "excel",       icon: <FileSpreadsheet size={18} />, label: "Excel Bulk Imports", badge: "Data Ingestion" },
    { key: "companies",   icon: <Briefcase size={18} />,       label: "Company Analytics",   badge: "Recruiter Metrics" },
    { key: "branches",    icon: <Award size={18} />,           label: "Branch Analytics",    badge: "Dept Breakdown" },
    { key: "reports",     icon: <FileText size={18} />,        label: "Reports Generator",   badge: "Exports" },
    { key: "experiences", icon: <MessageSquare size={18} />,   label: "Review User Responses", badge: "Moderation" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      
      {/* Executive Command Header Card */}
      <div
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, var(--bg-secondary) 100%)",
          border: "1px solid var(--border-color)",
          borderRadius: 16,
          padding: "24px 28px",
          display: "flex",
          justify: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          boxShadow: "0 4px 20px rgba(47, 49, 146, 0.04)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, var(--primary) 0%, #2f3192 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justify: "center",
              boxShadow: "0 6px 16px rgba(47, 49, 146, 0.25)"
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                TPO Executive Portal
              </h1>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: "rgba(16, 185, 129, 0.12)", color: "var(--success)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block" }}></span> Operational
              </span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4, margin: "4px 0 0", fontWeight: 500 }}>
              Walchand College of Engineering &bull; Training &amp; Placement Office Management Console
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right", display: "none", smDisplay: "block" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>Session Status</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>Administrator Mode</div>
          </div>
        </div>
      </div>

      {/* Main Command Dashboard Layout Grid */}
      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 24, alignItems: "start", width: "100%", boxSizing: "border-box" }}>
        
        {/* Custom Bespoke Sidebar */}
        <aside
          style={{
            background: "#ffffff",
            border: "1px solid var(--border-color)",
            borderRadius: 16,
            padding: 14,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.03)",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", padding: "8px 12px 6px", letterSpacing: "0.08em" }}>
              Management Tabs
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {navItems.map(item => {
                const isActive = activeTab === item.key;
                return (
                  <li
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justify: "space-between",
                      padding: "11px 14px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 600,
                      cursor: "pointer",
                      transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                      background: isActive ? "linear-gradient(135deg, var(--primary) 0%, #3730a3 100%)" : "transparent",
                      color: isActive ? "#ffffff" : "var(--text-secondary)",
                      boxShadow: isActive ? "0 4px 12px rgba(47, 49, 146, 0.2)" : "none",
                      borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: isActive ? "#ffffff" : "var(--primary)", display: "flex" }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight size={14} style={{ opacity: 0.9 }} />}
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Tab Content Display */}
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
