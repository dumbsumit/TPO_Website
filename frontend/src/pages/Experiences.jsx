import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAppContext } from "../appContext";
import { Search, ChevronDown, ChevronUp, BookOpen, User, Award } from "lucide-react";
import RichTextDisplay from "../components/RichTextDisplay";

export default function Experiences() {
  const { API_URL } = useAppContext();
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Search & Filter state
  const [selectedCompany, setSelectedCompany] = useState("");
  const [seniorSearchTerm, setSeniorSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  useEffect(() => {
    const fetchExperiences = async () => {
      try {
        const response = await axios.get(`${API_URL}/experiences`);
        setExperiences(response.data || []);
      } catch (err) {
        console.error("Error loading experiences:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchExperiences();
  }, [API_URL]);

  // Derive unique values for dropdowns
  const sharedCompanies = [...new Set(experiences.map(e => e.companyName).filter(Boolean))].sort();
  const branches = [...new Set(experiences.map(e => e.branch).filter(Boolean))].sort();
  const years = [...new Set(experiences.map(e => e.graduationYear).filter(Boolean))].sort((a, b) => b - a);

  // Filter Logic
  const filtered = experiences.filter(exp => {
    const matchesCompany = selectedCompany === "" || (exp.companyName && exp.companyName.toLowerCase() === selectedCompany.toLowerCase());
    const term = seniorSearchTerm.toLowerCase();
    const matchesSenior = seniorSearchTerm === "" || (exp.studentName && exp.studentName.toLowerCase().includes(term));
    const matchesBranch = selectedBranch === "" || exp.branch === selectedBranch;
    const matchesYear = selectedYear === "" || exp.graduationYear === Number(selectedYear);
    return matchesCompany && matchesSenior && matchesBranch && matchesYear;
  });

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 30 }}>
        <div>
          <h1 style={{ fontSize: 36, marginBottom: 8 }}>Interview Experiences</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Read real interview reviews shared by graduating seniors.
          </p>
        </div>
        <Link to="/submit-experience" className="btn btn-primary">
          Share Your Experience
        </Link>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        {/* Company Dropdown (companies whose experience has been shared) */}
        <div className="form-group">
          <label>Company</label>
          <select
            className="form-control"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
          >
            <option value="">All Companies ({sharedCompanies.length})</option>
            {sharedCompanies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Senior Name Search */}
        <div className="form-group">
          <label>Search Senior Name</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Afnan"
              value={seniorSearchTerm}
              onChange={(e) => setSeniorSearchTerm(e.target.value)}
              style={{ paddingLeft: 36, width: "100%" }}
            />
            <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-muted)" }} />
          </div>
        </div>

        <div className="form-group">
          <label>Branch</label>
          <select
            className="form-control"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Graduation Year</label>
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

        <div className="form-group" style={{ justifyContent: "flex-end" }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => { setSelectedCompany(""); setSeniorSearchTerm(""); setSelectedBranch(""); setSelectedYear(""); }}
            style={{ height: 38 }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Experiences List */}
      {loading ? (
        <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>
          Loading interview experiences...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>
          No interview experiences match your filter search.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {filtered.map(exp => {
            const isExpanded = expandedId === exp._id;
            return (
              <div key={exp._id} className="card" style={{ padding: 24 }}>
                <div 
                  onClick={() => toggleExpand(exp._id)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer", flexWrap: "wrap", gap: 16 }}
                >
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--primary-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)", flexShrink: 0 }}>
                      <User size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                        {exp.studentName} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>at</span> {exp.companyName}
                      </h3>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                        {exp.branch} &bull; Class of {exp.graduationYear}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="tag" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--primary)", fontWeight: 600, border: "none" }}>
                      {exp.rounds ? exp.rounds.length : 0} Rounds
                    </span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ marginTop: 24, borderTop: "1px solid var(--border-color)", paddingTop: 24 }}>
                    
                    {/* Rounds */}
                    {exp.rounds && exp.rounds.length > 0 && (
                      <div style={{ marginBottom: 24 }}>
                        <h4 style={{ fontSize: 16, marginBottom: 16, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                          <BookOpen size={16} style={{ color: "var(--primary)" }} /> Interview Workflow & Questions
                        </h4>
                        <div className="exp-timeline">
                          {exp.rounds.map((round, rIdx) => (
                            <div key={rIdx} className="exp-round">
                              <h5 style={{ fontSize: 14, color: "var(--primary)", marginBottom: 4 }}>{round.title}</h5>
                              <RichTextDisplay content={round.content} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Technologies Asked */}
                    {exp.technologies && exp.technologies.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <h4 style={{ fontSize: 14, marginBottom: 8, color: "var(--text-primary)" }}>Topics & Technologies Evaluated:</h4>
                        <div className="comp-tags">
                          {exp.technologies.map((t, idx) => (
                            <span key={idx} className="tag">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preparation Tips */}
                    {exp.prepTips && (
                      <div style={{ borderLeft: "3px solid var(--accent)", background: "rgba(255,255,255,0.01)", padding: "16px 20px", borderRadius: "0 8px 8px 0" }}>
                        <h4 style={{ fontSize: 14, marginBottom: 6, color: "var(--accent)", display: "flex", alignItems: "center", gap: 6 }}>
                          <Award size={15} /> Senior's Advice:
                        </h4>
                        <RichTextDisplay content={exp.prepTips} style={{ fontStyle: "italic" }} />
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

