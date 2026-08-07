import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAppContext } from "../App";
import { 
  Trophy, Briefcase, Building2, CheckCircle2, ChevronRight, Award, ShieldCheck, Check 
} from "lucide-react";

export default function Home() {
  const { API_URL } = useAppContext();
  const [stats, setStats] = useState({
    totalCompanies: 45,
    totalPlaced: 182,
    highestPackage: 44.0,
    averagePackage: 11.8
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/statistics`);
        if (response.data) {
          setStats(response.data);
        }
      } catch (err) {
        console.error("Error fetching statistics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
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
        <div className="hiring-partners-panel" style={{ border: "1px solid var(--border-color)", padding: "30px", borderRadius: "var(--radius-md)", background: "var(--bg-secondary)" }}>
          <h3 className="partners-title">Our Recruiting Partners</h3>
          
          <div className="partners-grid">
            <div className="partner-logo-card">Google</div>
            <div className="partner-logo-card">Microsoft</div>
            <div className="partner-logo-card">Amazon</div>
            <div className="partner-logo-card">CRED</div>
            <div className="partner-logo-card">TCS</div>
            <div className="partner-logo-card">Infosys</div>
            <div className="partner-logo-card">Pepsi</div>
            <div className="partner-logo-card">OYO</div>
            <div className="partner-logo-card">L&T</div>
            <div className="partner-logo-card">Mahindra</div>
            <div className="partner-logo-card">American Express</div>
            <div className="partner-logo-card">Alstom</div>
            <div className="partner-logo-card">Adani</div>
            <div className="partner-logo-card">99acres</div>
            <div className="partner-logo-card">Halonix</div>
          </div>
        </div>

      </section>

      {/* 5. TPO OFFICE BOARD SECTION */}
      <section className="card" style={{ borderLeft: "4px solid var(--primary)", background: "var(--bg-secondary)", padding: 30, marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, marginBottom: 10, color: "var(--primary)" }}>Training & Placement Office (TPO) Notice</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14.5, lineHeight: 1.6 }}>
          Recruiter spreadsheet submissions (Excel/CSV formats) are processed directly by TPO staff to ensure student placement statistics are updated in real-time. Students must maintain correct branch details and profile credentials on the main campus ERP platform to guarantee seamless credential matching during recruitment drives.
        </p>
      </section>
      
    </div>
  );
}
