import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAppContext } from "../appContext";
import {
  Trophy, Briefcase, Building2, CheckCircle2, ShieldCheck
} from "lucide-react";
import RichTextDisplay from "../components/RichTextDisplay";

const RECRUITING_PARTNERS = [
  { name: "Google", logo: "/logos/google.jpg" },
  { name: "Amazon", logo: "/logos/amazon.jpg" },
  { name: "TCS", logo: "/logos/tcs.png" },
  { name: "IBM", logo: "/logos/ibm.png" },
  { name: "Oracle", logo: "/logos/oracle.png" },
  { name: "Siemens", logo: "/logos/seimens2.png" },
  { name: "Philips", logo: "/logos/philips.png" },
  { name: "Schneider Electric", logo: "/logos/schnider.jpg" },
  { name: "Ather Energy", logo: "/logos/AtherLogo.jpg" },
  { name: "Thoughtworks", logo: "/logos/thoughtworks.png" },
  { name: "Hindustan Unilever", logo: "/logos/hul.png" },
  { name: "Maersk", logo: "/logos/maersk.png" },
  { name: "DP World", logo: "/logos/dpworld.png" },
  { name: "Hitachi", logo: "/logos/hitachi.png" },
  { name: "HPCL", logo: "/logos/hpcl.jpeg" },
  { name: "Baker Hughes", logo: "/logos/bakerhuges.png" },
  { name: "Bentley Systems", logo: "/logos/bentley.jpeg" },
  { name: "Bizom", logo: "/logos/bizom.png" },
  { name: "ConnectWise", logo: "/logos/connectwise.png" },
  { name: "Cooper Corporation", logo: "/logos/cooper.png" },
  { name: "IDeaS (SAS)", logo: "/logos/ideas sas .png" },
  { name: "Kaiser Permanente", logo: "/logos/kaiserpermanente.png" },
  { name: "NICE Systems", logo: "/logos/nice.jpeg" },
  { name: "OneSubsea", logo: "/logos/onesubsea.png" },
  { name: "Platform9", logo: "/logos/platfrom9.png" },
  { name: "Privado", logo: "/logos/privado.png" },
  { name: "PTC", logo: "/logos/ptc.png" },
  { name: "PubMatic", logo: "/logos/pubmatic.png" },
  { name: "Seagate", logo: "/logos/seafate.jpeg" },
  { name: "Thornton Tomasetti", logo: "/logos/throntonthomessati.png" },
  { name: "UBS", logo: "/logos/ubs.png" },
  { name: "Wayfair", logo: "/logos/wayfair.png" },
  { name: "Zensar", logo: "/logos/zensar.png" },
  { name: "AutomationEdge", logo: "/logos/automation edge.png" }
];

const getCompanyLogo = (companyName) => {
  if (!companyName) return null;
  const nameLower = companyName.toLowerCase().trim();
  const match = RECRUITING_PARTNERS.find(p => {
    const pName = p.name.toLowerCase().trim();
    return pName === nameLower || nameLower.includes(pName) || pName.includes(nameLower);
  });
  if (match) return match.logo;
  if (nameLower.includes("hul")) return "/logos/hul.png";
  if (nameLower.includes("schneider")) return "/logos/schnider.jpg";
  if (nameLower.includes("siemens")) return "/logos/seimens2.png";
  if (nameLower.includes("seagate")) return "/logos/seafate.jpeg";
  if (nameLower.includes("ather")) return "/logos/AtherLogo.jpg";
  return null;
};

export default function Home() {
  const { API_URL } = useAppContext();
  const [stats, setStats] = useState({
    totalCompanies: 45,
    totalPlaced: 182,
    highestPackage: 44.0,
    averagePackage: 11.8
  });
  const [featuredExperiences, setFeaturedExperiences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [statsResponse, experiencesResponse] = await Promise.all([
          axios.get(`${API_URL}/statistics`),
          axios.get(`${API_URL}/experiences`)
        ]);

        if (statsResponse.data) {
          setStats(statsResponse.data);
        }

        setFeaturedExperiences((experiencesResponse.data || []).slice(0, 3));
      } catch (err) {
        console.error("Error fetching home data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, [API_URL]);

  return (
    <div>

      {/* 1. WELCOME TO WCE SANGLI SECTION */}
      <section className="welcome-section">
        <div className="welcome-content">
          <h1>Welcome to WCE Sangli</h1>
          <p>
            Established in 1947, Walchand College of Engineering, Sangli, stands as a beacon of excellence in engineering education. As a premier autonomous institution affiliated with Shivaji University, we seamlessly blend tradition with innovation to create a holistic learning environment. With a focus on academic rigor, cutting-edge research, state-of-the-art facilities, and strong industry collaborations, WCE empowers students to excel academically, develop critical skills, and contribute meaningfully to a rapidly evolving global landscape.
          </p>

          <ul className="checkmark-list">
            <li>
              <CheckCircle2 size={18} className="checkmark-icon" />
              <span>Over 75 years of excellence in engineering education.</span>
            </li>
            <li>
              <CheckCircle2 size={18} className="checkmark-icon" />
              <span>Autonomous institution affiliated with Shivaji University.</span>
            </li>
            <li>
              <CheckCircle2 size={18} className="checkmark-icon" />
              <span>Accredited by NBA and NAAC with top rankings.</span>
            </li>
            <li>
              <CheckCircle2 size={18} className="checkmark-icon" />
              <span>State-of-the-art labs, libraries, and research facilities.</span>
            </li>
            <li>
              <CheckCircle2 size={18} className="checkmark-icon" />
              <span>Robust industry collaborations and placement opportunities.</span>
            </li>
          </ul>

          <Link to="/companies" className="btn btn-primary" style={{ padding: "12px 24px" }}>
            Explore More
          </Link>
        </div>

        <div className="welcome-image-container">
          <img
            src="/campus_library.png"
            alt="Walchand College Campus Library"
            className="welcome-image"
          />

          {/* Floating Badge 1 */}
          <div className="floating-badge" style={{ top: "30px", right: "-15px" }}>
            <div className="floating-badge-avatars">
              <img src="/student_male.png" alt="Alumnus 1" />
              <img src="/student_female.png" alt="Alumnus 2" />
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: "bold", marginLeft: -8 }}>+</div>
            </div>
            <div className="floating-badge-info">
              <h4>250+</h4>
              <p>CEO's from WCE</p>
            </div>
          </div>

          {/* Floating Badge 2 */}
          <div className="floating-badge" style={{ bottom: "30px", left: "-15px" }}>
            <div className="floating-badge-avatars">
              <img src="/student_female.png" alt="Alumnus 3" />
              <img src="/student_male.png" alt="Alumnus 4" />
            </div>
            <div className="floating-badge-info">
              <h4>1000+</h4>
              <p>Enterprise Founders</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EXCELLENCE IN CAMPUS PLACEMENTS SECTION */}
      <section style={{ margin: "60px 0 80px" }}>
        <h2 className="wce-heading">Excellence in Campus Placements</h2>
        <div className="wce-subheading">"Launching Careers, Transforming Futures"</div>
        <div className="wce-divider"></div>

        <p style={{ color: "var(--text-secondary)", textAlign: "center", maxWidth: 900, margin: "-10px auto 40px", fontSize: 14 }}>
          At Walchand College of Engineering, our stellar placement record speaks volumes about the quality of education and the industry readiness of our graduates. With strong ties to leading global and national companies, we ensure that our students are equipped with the skills, knowledge, and confidence to excel in their professional journeys.
        </p>

        {/* WCE Style Placement Stats Grid */}
        <div className="wce-stats-grid">
          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper">
              <Trophy size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>₹54.0 LPA</h3>
              <p>Highest Package (Google)</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper">
              <Briefcase size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>₹{stats.averagePackage} LPA</h3>
              <p>Average Batch Package</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper">
              <Building2 size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>{stats.totalCompanies}+</h3>
              <p>Companies Visit Campus</p>
            </div>
          </div>

          <div className="wce-stat-card">
            <div className="wce-stat-icon-wrapper">
              <ShieldCheck size={20} />
            </div>
            <div className="wce-stat-info">
              <h3>100%</h3>
              <p>Placement Assistance</p>
            </div>
          </div>
        </div>

        {/* 3. HEARTIEST CONGRATULATIONS STUDENTS LIST */}
        <div className="congrats-slider-container">

          <div className="congrats-card">
            <div className="congrats-info">
              <div>
                <span className="congrats-title">Heartiest Congratulations</span>
                <h3 className="congrats-student-name">Aardhya Pittalwar</h3>
                <p className="congrats-student-meta">B.Tech (Comp. Sci. & Engineering)</p>
              </div>
              <div className="congrats-package-box">
                <div className="congrats-package-label">Successful Placement At</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "var(--primary)", margin: "4px 0" }}>CRED</div>
                <div className="congrats-package-label">With CTC of</div>
                <div className="congrats-package-value">52 LPA</div>
              </div>
            </div>
            <div className="congrats-image-box">
              <img src="/student_male.png" alt="Aardhya Pittalwar" className="congrats-image" />
              <span className="company-logo-badge">CRED</span>
            </div>
          </div>

          <div className="congrats-card">
            <div className="congrats-info">
              <div>
                <span className="congrats-title">Heartiest Congratulations</span>
                <h3 className="congrats-student-name">Ankita Dongare</h3>
                <p className="congrats-student-meta">B.Tech (Information Technology)</p>
              </div>
              <div className="congrats-package-box">
                <div className="congrats-package-label">Successful Placement At</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "var(--primary)", margin: "4px 0" }}>Google</div>
                <div className="congrats-package-label">With CTC of</div>
                <div className="congrats-package-value">54 LPA</div>
              </div>
            </div>
            <div className="congrats-image-box">
              <img src="/student_female.png" alt="Ankita Dongare" className="congrats-image" />
              <span className="company-logo-badge">Google</span>
            </div>
          </div>

        </div>

        {/* 4. HIRING PARTNERS GRID PANEL */}
        <div className="hiring-partners-panel">
          <div className="partners-title-container">
            <h3 className="partners-title">Our Recruiting Partners</h3>
            <p className="partners-subtitle">Leading global organizations hiring talent from Walchand College of Engineering</p>
          </div>

          <div className="partners-grid">
            {RECRUITING_PARTNERS.map((partner, idx) => (
              <div
                key={idx}
                className="partner-flip-card"
                title={partner.name}
                onMouseEnter={(e) => {
                  // Remove first so re-entering quickly always restarts the animation
                  const inner = e.currentTarget.querySelector('.partner-flip-inner');
                  e.currentTarget.classList.remove('is-spinning');
                  // Force reflow so the browser registers the class removal
                  void inner.offsetWidth;
                  e.currentTarget.classList.add('is-spinning');
                }}
                onAnimationEnd={(e) => {
                  // Clean up so the next mouseenter can re-add and re-trigger
                  if (e.animationName === 'partner-spin') {
                    e.currentTarget.classList.remove('is-spinning');
                  }
                }}
              >
                <div className="partner-flip-inner">
                  {/* Front Face: Logo */}
                  <div className="partner-card-front">
                    <img
                      src={partner.logo}
                      alt={`${partner.name} logo`}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <span style={{ display: 'none', fontWeight: 'bold', fontSize: 13, color: 'var(--primary)' }}>
                      {partner.name}
                    </span>
                  </div>

                  {/* Back Face: Company Details */}
                  <div className="partner-card-back">
                    <span className="partner-name">{partner.name}</span>
                    <span className="partner-sub">Recruiter</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>


      {/* 6. FEATURED STUDENT RESPONSES */}
      <section style={{ margin: "40px 0 10px" }}>
        <h2 className="wce-heading">Featured Student Responses</h2>
        <div className="wce-subheading">Real interview insights, preparation guidance, and campus recruitment experiences shared by seniors</div>
        <div className="wce-divider"></div>

        {loading ? (
          <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading approved responses...</div>
        ) : featuredExperiences.length === 0 ? (
          <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)" }}>
            No student responses have been published yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
            {featuredExperiences.map(exp => {
              const logoUrl = getCompanyLogo(exp.companyName);
              return (
                <article key={exp._id} className="card" style={{ padding: 22, borderTop: "3px solid var(--primary)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 18, marginBottom: 4 }}>{exp.companyName}</h3>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{exp.branch} · Class of {exp.graduationYear}</p>
                    </div>
                    {logoUrl && (
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        background: "#ffffff",
                        padding: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid var(--border-color)",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                        flexShrink: 0,
                        overflow: "hidden"
                      }}>
                        <img
                          src={logoUrl}
                          alt={`${exp.companyName} logo`}
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                        />
                      </div>
                    )}
                  </div>

                <RichTextDisplay content={exp.prepTips || "No extra advice was added with this response."} style={{ marginBottom: 12 }} />

                <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span><strong>Student:</strong> {exp.studentName}</span>
                  <span><strong>Rounds:</strong> {Array.isArray(exp.rounds) && exp.rounds.length > 0 ? exp.rounds.map(r => r.title).join(" -> ") : "Not listed"}</span>
                  <span><strong>Technologies:</strong> {(exp.technologies || []).join(", ") || "None"}</span>
                </div>
              </article>
            );
          })}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <Link to="/experiences" className="btn btn-secondary" style={{ padding: "10px 18px" }}>
            View All Responses
          </Link>
        </div>
      </section>

    </div>
  );
}
