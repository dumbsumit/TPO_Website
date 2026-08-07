import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAppContext } from "../App";
import { Search, Calendar, Landmark, Briefcase, Users, Eye } from "lucide-react";

export default function Companies() {
  const { API_URL } = useAppContext();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [minPackage, setMinPackage] = useState(0);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await axios.get(`${API_URL}/companies`);
        setCompanies(response.data || []);
      } catch (err) {
        console.error("Error fetching companies:", err);
        setError("Could not load companies database.");
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, [API_URL]);

  // Derive filter values
  const years = [...new Set(companies.map(c => c.visitYear))].sort((a, b) => b - a);
  const roles = [...new Set(companies.map(c => c.role))].sort();
  const maxPackageInDB = companies.length > 0 ? Math.max(...companies.map(c => c.package)) : 50;

  // Filter logic
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPackage = company.package >= minPackage;
    const matchesYear = selectedYear === "" || company.visitYear === Number(selectedYear);
    const matchesRole = selectedRole === "" || company.role === selectedRole;
    return matchesSearch && matchesPackage && matchesYear && matchesRole;
  });

  return (
    <div>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>Recruiting Companies</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Browse recruitment drives, check eligibility criteria, and read processes.
        </p>
      </div>

      {/* Filter Control Bar */}
      <div className="filter-bar">
        <div className="form-group">
          <label>Search Company</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Google, TCS"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 36, width: "100%" }}
            />
            <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-muted)" }} />
          </div>
        </div>

        <div className="form-group">
          <label>Min Package: {minPackage} LPA</label>
          <input
            type="range"
            min="0"
            max={maxPackageInDB}
            step="1"
            value={minPackage}
            onChange={(e) => setMinPackage(Number(e.target.value))}
            className="form-control"
            style={{ padding: 0, height: 38, accentColor: "var(--primary)" }}
          />
        </div>

        <div className="form-group">
          <label>Visit Year</label>
          <select
            className="form-control"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="">All Years</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Role</label>
          <select
            className="form-control"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">All Roles</option>
            {roles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Companies List */}
      {loading ? (
        <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>
          Loading company directory...
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: "center", borderColor: "var(--danger)", padding: 40 }}>
          <p style={{ color: "var(--danger)" }}>{error}</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>
          No companies found matching your filter criteria.
        </div>
      ) : (
        <div className="grid-companies">
          {filteredCompanies.map(company => (
            <div key={company._id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div className="comp-card-header">
                  <h3 style={{ fontSize: 20 }}>{company.name}</h3>
                  <span className="package-badge">{company.package} LPA</span>
                </div>

                <ul className="comp-details-list">
                  <li>
                    <Briefcase size={14} style={{ color: "var(--primary)" }} />
                    <span>{company.role}</span>
                  </li>
                  <li>
                    <Calendar size={14} style={{ color: "var(--accent)" }} />
                    <span>Visit Year: {company.visitYear}</span>
                  </li>
                  <li>
                    <Users size={14} style={{ color: "var(--success)" }} />
                    <span>Selected: {company.selectedCount} Students</span>
                  </li>
                </ul>

                {company.technologies && company.technologies.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, fontWeight: 500 }}>Technologies:</div>
                    <div className="comp-tags">
                      {company.technologies.map((t, idx) => (
                        <span key={idx} className="tag">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link to={`/companies/${company._id}`} className="btn btn-secondary" style={{ width: "100%" }}>
                <Eye size={14} style={{ marginRight: 6 }} /> View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
