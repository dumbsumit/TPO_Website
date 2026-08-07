import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAppContext } from "../App";
import { Trash2, Plus, Send, AlertCircle, Sparkles } from "lucide-react";

export default function SubmitExperience() {
  const { API_URL, showToast } = useAppContext();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [formData, setFormData] = useState({
    studentName: "",
    branch: "",
    graduationYear: new Date().getFullYear(),
    companyName: "",
    companyId: "",
    technologies: "",
    prepTips: ""
  });

  const [rounds, setRounds] = useState([
    { title: "Round 1: Online Assessment", content: "" }
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await axios.get(`${API_URL}/companies`);
        setCompanies(response.data || []);
      } catch (err) {
        console.error("Error loading companies list:", err);
      }
    };
    fetchCompanies();
  }, [API_URL]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "companySelect") {
      if (value === "other") {
        setFormData(prev => ({ ...prev, companyName: "", companyId: "" }));
      } else {
        const selected = companies.find(c => c._id === value);
        setFormData(prev => ({ 
          ...prev, 
          companyName: selected ? selected.name : "", 
          companyId: value 
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRoundChange = (index, field, value) => {
    const updated = [...rounds];
    updated[index][field] = value;
    setRounds(updated);
  };

  const addRound = () => {
    setRounds([...rounds, { title: `Round ${rounds.length + 1}: `, content: "" }]);
  };

  const removeRound = (index) => {
    if (rounds.length === 1) return;
    setRounds(rounds.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.branch || !formData.companyName || rounds.some(r => !r.title || !r.content)) {
      showToast("Please fill all required fields and complete all round entries.", "error");
      return;
    }

    setLoading(true);
    try {
      // Map tech list string to array
      const techArray = formData.technologies
        ? formData.technologies.split(",").map(t => t.trim()).filter(Boolean)
        : [];

      const submission = {
        studentName: formData.studentName || "Anonymous",
        branch: formData.branch,
        graduationYear: Number(formData.graduationYear),
        companyName: formData.companyName,
        companyId: formData.companyId || null,
        rounds,
        technologies: techArray,
        prepTips: formData.prepTips
      };

      await axios.post(`${API_URL}/experiences`, submission);
      
      showToast("Thank you! Your interview experience is submitted and pending admin review.", "success");
      navigate("/experiences");
    } catch (err) {
      console.error("Error submitting experience:", err);
      showToast("Failed to submit experience. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 30, textAlign: "center" }}>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>Share Your Interview Experience</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Help fellow students prepare by detailing the recruitment process and questions you encountered.
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          <div className="form-row-2col">
            <div className="form-group">
              <label>Your Name (Leave blank to remain Anonymous)</label>
              <input
                type="text"
                name="studentName"
                className="form-control"
                placeholder="e.g. Rahul Sharma"
                value={formData.studentName}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Branch / Department <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                type="text"
                name="branch"
                className="form-control"
                placeholder="e.g. Computer Science Engineering"
                required
                value={formData.branch}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-group">
              <label>Graduation Year <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                type="number"
                name="graduationYear"
                className="form-control"
                required
                value={formData.graduationYear}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Select Company <span style={{ color: "var(--danger)" }}>*</span></label>
              <select
                name="companySelect"
                className="form-control"
                required
                onChange={handleInputChange}
                value={formData.companyId || (formData.companyName ? "other" : "")}
              >
                <option value="" disabled>-- Select Company --</option>
                {companies.map(c => (
                  <option key={c._id} value={c._id}>{c.name} ({c.role})</option>
                ))}
                <option value="other">Other / Not Listed</option>
              </select>
            </div>
          </div>

          {/* Render custom company input if "Other" is chosen */}
          {(formData.companyId === "" && (
            <div className="form-group">
              <label>Company Name <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                type="text"
                name="companyName"
                className="form-control"
                placeholder="Enter Company Name"
                required
                value={formData.companyName}
                onChange={handleInputChange}
              />
            </div>
          ))}

          <div className="form-group">
            <label>Technologies / Topics Asked (Comma-separated)</label>
            <input
              type="text"
              name="technologies"
              className="form-control"
              placeholder="e.g. C++, Graph Algorithms, Operating Systems, DBMS"
              value={formData.technologies}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label>General Preparation Tips & Resources</label>
            <textarea
              name="prepTips"
              rows="3"
              className="form-control"
              placeholder="What topics should junior students focus on? Mention useful preparation websites, coding practice strategies, etc."
              value={formData.prepTips}
              onChange={handleInputChange}
            />
          </div>

          {/* Dynamic Rounds Fields */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>
              <h3 style={{ fontSize: 18 }}>Interview Rounds & Questions</h3>
              <button 
                type="button" 
                onClick={addRound} 
                className="btn btn-secondary" 
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                <Plus size={14} style={{ marginRight: 4 }} /> Add Round
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {rounds.map((round, index) => (
                <div key={index} style={{ border: "1px solid var(--border-color)", padding: 16, borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.01)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10 }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Round 1: OA / Technical Interview"
                      value={round.title}
                      onChange={(e) => handleRoundChange(index, "title", e.target.value)}
                      style={{ flex: 1, padding: "6px 12px" }}
                      required
                    />
                    
                    {rounds.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeRound(index)} 
                        className="btn btn-danger"
                        style={{ padding: "8px 10px" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  
                  <textarea
                    rows="3"
                    className="form-control"
                    placeholder="Describe what occurred in this round. Add key technical questions asked and your responses."
                    value={round.content}
                    onChange={(e) => handleRoundChange(index, "content", e.target.value)}
                    style={{ width: "100%" }}
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Info Banner */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--primary-glow)", padding: 14, borderRadius: 8, border: "1px solid rgba(99, 102, 241, 0.2)", fontSize: 13, color: "var(--text-secondary)" }}>
            <AlertCircle size={18} style={{ color: "var(--primary)", flexShrink: 0 }} />
            <span>
              By submitting, your response will be saved as <strong>Pending Approval</strong>. The Training and Placement Officer reviews all submissions to verify standard formatting and prevent inappropriate language before they go public.
            </span>
          </div>

          {/* Submit Action */}
          <button 
            type="submit" 
            disabled={loading} 
            className="btn btn-primary" 
            style={{ width: "100%", height: 44, fontSize: 15 }}
          >
            <Send size={16} style={{ marginRight: 8 }} /> {loading ? "Submitting..." : "Submit Experience for TPO Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
