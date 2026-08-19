import React, { useState } from "react";
import { useAppContext } from "../appContext";
import {
  FileSpreadsheet, ShieldCheck,
  Briefcase, Award, FileText, MessageSquare
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
    { key: "excel",       icon: <FileSpreadsheet size={16} />, label: "Excel Bulk Imports" },
    { key: "companies",   icon: <Briefcase size={16} />,       label: "Company Analytics" },
    { key: "branches",    icon: <Award size={16} />,           label: "Branch Analytics" },
    { key: "reports",     icon: <FileText size={16} />,        label: "Reports Generator" },
    { key: "experiences", icon: <MessageSquare size={16} />,   label: "Review User Responses" },
  ];

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30, borderBottom: "1px solid var(--border-color)", paddingBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 36, display: "flex", alignItems: "center", gap: 12 }}>
            <ShieldCheck size={36} style={{ color: "var(--success)" }} /> TPO Administrative Panel
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
            Control portal content, upload spreadsheets, and moderate reviews.
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Sidebar Nav */}
        <aside className="sidebar">
          <ul className="sidebar-menu">
            {navItems.map(item => (
              <li
                key={item.key}
                className={`sidebar-item ${activeTab === item.key ? "active" : ""}`}
                onClick={() => setActiveTab(item.key)}
              >
                {item.icon} {item.label}
              </li>
            ))}
          </ul>
        </aside>

        {/* Tab Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 30, minWidth: 0, width: "100%", overflow: "hidden" }}>
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
