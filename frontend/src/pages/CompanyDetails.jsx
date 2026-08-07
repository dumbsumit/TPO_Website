import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { useAppContext } from "../App";
import { ChevronLeft, Briefcase, Calendar, Landmark, CheckSquare, Settings, Award, Users, FileText, ChevronDown, ChevronUp } from "lucide-react";

export default function CompanyDetails() {
  const { id } = useParams();
  const { API_URL } = useAppContext();
  const [company, setCompany] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [expandedExpId, setExpandedExpId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const companyRes = await axios.get(`${API_URL}/companies/${id}`);
        setCompany(companyRes.data);

        // Fetch all experiences, filter by companyName or companyId
        const experiencesRes = await axios.get(`${API_URL}/experiences`);
        const companyExps = (experiencesRes.data || []).filter(
          exp => exp.companyId === id || exp.companyName.toLowerCase() === companyRes.data.name.toLowerCase()
        );
        setExperiences(companyExps);
      } catch (err) {
        console.error("Error loading company details:", err);
        setError("Company not found or API error.");
      } finally {
        setLoading(false);
      }
    };
    fetchCompanyData();
  }, [id, API_URL]);

  const toggleExperience = (expId) => {
    if (expandedExpId === expId) {
      setExpandedExpId(null);
    } else {
      setExpandedExpId(expId);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>Loading company details...</div>;
  }

  if (error || !company) {
    return (
      <div className="card" style={{ textAlign: "center", borderColor: "var(--danger)", padding: 40 }}>
        <p style={{ color: "var(--danger)", marginBottom: 20 }}>{error || "Company details could not be loaded."}</p>
        <Link to="/companies" className="btn btn-secondary">
          <ChevronLeft size={16} style={{ marginRight: 6 }} /> Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link to="/companies" style={{ display: "inline-flex", alignItems: "center", color: "var(--text-secondary)", fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
          <ChevronLeft size={16} style={{ marginRight: 4 }} /> Back to Companies
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <h1 style={{ fontSize: 40 }}>{company.name}</h1>
          <span className="package-badge" style={{ fontSize: 20, padding: "8px 16px" }}>{company.package} LPA</span>
        </div>
      </div>

      <div className="company-details-grid">
        
        {/* Left Side: General Requirements */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          <div className="card">
            <h2 style={{ fontSize: 22, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <CheckSquare size={20} style={{ color: "var(--primary)" }} /> Eligibility Criteria
            </h2>
            <p style={{ color: "var(--text-secondary)", whiteSpace: "pre-line", fontSize: 15 }}>
              {company.eligibility || "No criteria specified."}
            </p>
          </div>

          <div className="card">
            <h2 style={{ fontSize: 22, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <Settings size={20} style={{ color: "var(--accent)" }} /> Hiring Process
            </h2>
            <p style={{ color: "var(--text-secondary)", whiteSpace: "pre-line", fontSize: 15, lineHeight: 1.7 }}>
              {company.hiringProcess || "No hiring process details provided."}
            </p>
          </div>

          {/* Interview Experiences for this specific company */}
          <div>
            <h2 style={{ fontSize: 24, marginBottom: 20, marginTop: 10 }}>Interview Experiences ({experiences.length})</h2>
            {experiences.length === 0 ? (
              <div className="card" style={{ color: "var(--text-secondary)", textAlign: "center", padding: 30 }}>
                No senior interview experiences have been submitted for {company.name} yet. Be the first to share one!
                <div style={{ marginTop: 16 }}>
                  <Link to="/submit-experience" className="btn btn-primary btn-sm">
                    Share Experience
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {experiences.map(exp => {
                  const isExpanded = expandedExpId === exp._id;
                  return (
                    <div key={exp._id} className="card" style={{ padding: 20 }}>
                      <div 
                        onClick={() => toggleExperience(exp._id)} 
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                      >
                        <div>
                          <h3 style={{ fontSize: 17, marginBottom: 4 }}>{exp.studentName}</h3>
                          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                            {exp.branch} &bull; Class of {exp.graduationYear}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="tag" style={{ background: "var(--bg-tertiary)" }}>{exp.rounds.length} Rounds</span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: 20, borderTop: "1px solid var(--border-color)", paddingTop: 20 }}>
                          {/* Rounds Timeline */}
                          <h4 style={{ fontSize: 15, marginBottom: 12, color: "var(--text-primary)" }}>Interview Rounds & Questions:</h4>
                          <div className="exp-timeline">
                            {exp.rounds.map((round, rIdx) => (
                              <div key={rIdx} className="exp-round">
                                <h5 style={{ fontSize: 14, color: "var(--primary)", marginBottom: 4 }}>{round.title}</h5>
                                <p style={{ color: "var(--text-secondary)", fontSize: 13.5, whiteSpace: "pre-line" }}>{round.content}</p>
                              </div>
                            ))}
                          </div>

                          {/* Tech Asked */}
                          {exp.technologies && exp.technologies.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <h4 style={{ fontSize: 14, marginBottom: 6, color: "var(--text-primary)" }}>Topics & Technologies Asked:</h4>
                              <div className="comp-tags">
                                {exp.technologies.map((t, idx) => (
                                  <span key={idx} className="tag">{t}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Prep Tips */}
                          {exp.prepTips && (
                            <div>
                              <h4 style={{ fontSize: 14, marginBottom: 6, color: "var(--text-primary)" }}>Preparation Tips & Advice:</h4>
                              <p style={{ color: "var(--text-secondary)", fontSize: 13.5, fontStyle: "italic", background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 6, borderLeft: "2px solid var(--accent)" }}>
                                "{exp.prepTips}"
                              </p>
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

        </div>

        {/* Right Side: Quick info panel */}
        <div style={{ position: "sticky", top: 100, display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card" style={{ background: "linear-gradient(185deg, var(--bg-secondary) 0%, rgba(19, 27, 46, 0.6) 100%)" }}>
            <h3 style={{ fontSize: 18, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>Quick Specifications</h3>
            
            <ul className="comp-details-list" style={{ gap: 14 }}>
              <li>
                <Briefcase size={16} style={{ color: "var(--primary)" }} />
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Offered Profile</div>
                  <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{company.role}</div>
                </div>
              </li>
              
              <li>
                <Calendar size={16} style={{ color: "var(--accent)" }} />
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Drive Year</div>
                  <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{company.visitYear}</div>
                </div>
              </li>

              <li>
                <Users size={16} style={{ color: "var(--success)" }} />
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Recruited Students</div>
                  <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{company.selectedCount} Placed</div>
                </div>
              </li>

              <li>
                <Award size={16} style={{ color: "var(--secondary)" }} />
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Compensation</div>
                  <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{company.package} LPA (CTC)</div>
                </div>
              </li>
            </ul>

            {company.technologies && company.technologies.length > 0 && (
              <div style={{ marginTop: 24, borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                <h4 style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>Primary Tech Stack</h4>
                <div className="comp-tags">
                  {company.technologies.map((t, idx) => (
                    <span key={idx} className="tag">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
