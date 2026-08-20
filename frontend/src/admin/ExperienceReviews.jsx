import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAppContext } from "../appContext";
import { Check, Trash2 } from "lucide-react";
import RichTextDisplay from "../components/RichTextDisplay";

export default function ExperienceReviews() {
  const { API_URL, showToast } = useAppContext();
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const expRes = await axios.get(`${API_URL}/experiences/admin`, { withCredentials: true });
      setExperiences(expRes.data || []);
    } catch (err) {
      console.error("Dashboard fetching error:", err);
      showToast("Failed to fetch experience submissions", "error");
    } finally {
      setLoading(false);
    }
  }, [API_URL, showToast]);

  const updateExpStatus = async (expId, status) => {
    try {
      await axios.patch(`${API_URL}/experiences/${expId}/status`, { status }, { withCredentials: true });
      showToast(`Experience updated to: ${status.toUpperCase()}`);
      loadData();
    } catch (err) {
      console.error("Experience status update failed:", err);
      showToast("Failed to update experience status", "error");
    }
  };

  const deleteExperience = async (expId) => {
    if (!window.confirm("Are you sure you want to delete this submission?")) return;
    try {
      await axios.delete(`${API_URL}/experiences/${expId}`, { withCredentials: true });
      showToast("Submission deleted.");
      loadData();
    } catch (err) {
      console.error("Experience delete error:", err);
      showToast("Failed to delete experience", "error");
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 60 }}>Loading submissions...</div>;
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: 20, marginBottom: 6 }}>Student Submissions ({experiences.length})</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>
        Review every response received from users, publish approved submissions to the home page, or delete anything inappropriate.
      </p>

      {experiences.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 40 }}>
          No student submissions found in database.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {experiences.map(exp => (
            <div key={exp._id} style={{ border: "1px solid var(--border-color)", padding: 20, borderRadius: "var(--radius-sm)", background: exp.status === "pending" ? "rgba(99, 102, 241, 0.02)" : "transparent" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                <div>
                  <h4 style={{ fontSize: 16 }}>{exp.studentName} at <strong>{exp.companyName}</strong></h4>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {exp.branch} &bull; Class of {exp.graduationYear}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="tag" style={{
                    background: exp.status === "approved" ? "rgba(16, 185, 129, 0.15)" : exp.status === "pending" ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    color: exp.status === "approved" ? "var(--success)" : exp.status === "pending" ? "var(--warning)" : "var(--danger)",
                    border: "none",
                    fontWeight: 600
                  }}>
                    {exp.status === "approved" ? "VISIBLE ON HOME" : exp.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.01)", padding: 14, borderRadius: 6, fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                <div style={{ marginBottom: 10 }}><strong>Role:</strong> {exp.roleOffered || "Not specified"}</div>
                <div style={{ marginBottom: 10 }}>
                  <strong>Package:</strong> {exp.ctc ? `${exp.ctc} LPA` : "Not specified"}
                  {exp.stipend ? ` - Stipend: Rs. ${exp.stipend}` : ""}
                </div>
                <div style={{ marginBottom: 10 }}><strong>Rating:</strong> {exp.overallRating ? `${exp.overallRating}/5` : "Not rated"}</div>
                <div style={{ marginBottom: 10 }}><strong>Rounds:</strong> {(exp.rounds || []).map(r => r.title).join(" -> ") || "None added"}</div>
                <div style={{ marginBottom: 10 }}><strong>Tags:</strong> {(exp.tags || exp.technologies || []).join(", ") || "None"}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                  <strong>Overall Experience:</strong> 
                  <RichTextDisplay content={exp.overallExperience || exp.prepTips || "None"} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {exp.status === "pending" && (
                  <button
                    onClick={() => updateExpStatus(exp._id, "approved")}
                    className="btn btn-primary"
                    style={{ padding: "6px 12px", fontSize: 12, background: "var(--success)" }}
                  >
                    <Check size={12} style={{ marginRight: 4 }} /> Publish to Home
                  </button>
                )}
                {exp.status === "approved" && (
                  <button
                    onClick={() => updateExpStatus(exp._id, "pending")}
                    className="btn btn-secondary"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                  >
                    Remove from Home
                  </button>
                )}
                <button
                  onClick={() => deleteExperience(exp._id)}
                  className="btn btn-danger"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                >
                  <Trash2 size={12} style={{ marginRight: 4 }} /> Delete Response
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
