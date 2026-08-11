import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import { useAppContext } from "../appContext";
import {
  AlertCircle,
  Bold,
  Building2,
  Code,
  FileText,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Palette,
  Plus,
  Quote,
  Redo2,
  Send,
  Star,
  Tag,
  Trash2,
  Underline,
  Undo2,
  User
} from "lucide-react";

const BRANCHES = [
  "Computer Science and Engineering",
  "Information Technology",
  "Electronics Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
];

const BATCH_YEARS = Array.from({ length: 8 }, (_, index) => new Date().getFullYear() + 4 - index);

const DEFAULT_TAGS = [
  "Internship",
  "Full-Time",
  "Product",
  "Service",
  "Startup",
  "MNC",
  "Remote",
  "Hybrid",
  "SDE",
  "Analyst",
  "Consultant"
];

const ROUND_DIFFICULTIES = ["Easy", "Medium", "Hard"];

function TiptapEditor({ value, onChange, placeholder, minHeight = 160 }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] }
      }),
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https"
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Placeholder.configure({ placeholder })
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "tiptap-editor-content",
        style: `min-height: ${minHeight}px`
      }
    },
    onUpdate: ({ editor: activeEditor }) => {
      onChange(activeEditor.getHTML());
    }
  });

  useEffect(() => {
    if (!editor || editor.getHTML() === value) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href || "";
    const url = window.prompt("Enter URL", previousUrl);
    if (url === null) return;

    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="tiptap-shell">
      <div className="rich-text-toolbar" aria-label="Rich text formatting toolbar">
        <button type="button" className={`rich-text-tool ${editor.isActive("bold") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <Bold size={18} />
        </button>
        <button type="button" className={`rich-text-tool ${editor.isActive("italic") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <Italic size={18} />
        </button>
        <button type="button" className={`rich-text-tool ${editor.isActive("underline") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <Underline size={18} />
        </button>
        <button type="button" className={`rich-text-tool with-divider ${editor.isActive("bulletList") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bulleted list">
          <List size={18} />
        </button>
        <button type="button" className={`rich-text-tool ${editor.isActive("orderedList") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
          <ListOrdered size={18} />
        </button>
        <button type="button" className={`rich-text-tool with-divider ${editor.isActive("heading", { level: 2 }) ? "active" : ""}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
          <Heading2 size={18} />
        </button>
        <button type="button" className={`rich-text-tool ${editor.isActive("heading", { level: 3 }) ? "active" : ""}`} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
          <Heading3 size={18} />
        </button>
        <button type="button" className={`rich-text-tool with-divider ${editor.isActive("blockquote") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
          <Quote size={18} />
        </button>
        <button type="button" className={`rich-text-tool ${editor.isActive("code") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleCode().run()} title="Code">
          <Code size={18} />
        </button>
        <select
          className="rich-text-format-select"
          value={editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : "paragraph"}
          onChange={(event) => {
            const nextFormat = event.target.value;
            if (nextFormat === "h2") editor.chain().focus().setHeading({ level: 2 }).run();
            else if (nextFormat === "h3") editor.chain().focus().setHeading({ level: 3 }).run();
            else editor.chain().focus().setParagraph().run();
          }}
          title="Format"
        >
          <option value="paragraph">Format v</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <button type="button" className={`rich-text-tool with-divider ${editor.isActive("link") ? "active" : ""}`} onClick={setLink} title="Link">
          <LinkIcon size={18} />
        </button>
        <button type="button" className={`rich-text-tool ${editor.isActive("highlight") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef3c7" }).run()} title="Highlight">
          <Palette size={18} />
        </button>
        <button type="button" className="rich-text-tool with-divider" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
          <Undo2 size={18} />
        </button>
        <button type="button" className="rich-text-tool" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
          <Redo2 size={18} />
        </button>
      </div>

      <EditorContent editor={editor} className="tiptap-editor" />
    </div>
  );
}

export default function SubmitExperience() {
  const { API_URL, showToast } = useAppContext();
  const navigate = useNavigate();

  
  const [formData, setFormData] = useState({
    studentName: "",
    email: "",
    contactNumber: "",
    branch: "",
    graduationYear: "",
    companyName: "",
    
    roleOffered: "",
    ctc: "",
    stipend: "",
    interviewDate: "",
    overallExperience: "",
    overallRating: 0,
    tags: []
  });

  const [customTag, setCustomTag] = useState("");
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(false);

  
  const tagOptions = useMemo(() => {
    const merged = [...DEFAULT_TAGS, ...formData.tags];
    return [...new Set(merged)];
  }, [formData.tags]);

  const isEmptyRichText = (html) => {
    return !html || html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoundChange = (index, field, value) => {
    setRounds(prev => prev.map((round, idx) => (
      idx === index ? { ...round, [field]: value } : round
    )));
  };

  const addRound = () => {
    setRounds(prev => [...prev, { title: "", difficulty: "Medium", content: "" }]);
  };

  const removeRound = (index) => {
    setRounds(prev => prev.filter((_, idx) => idx !== index));
  };

  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(item => item !== tag)
        : [...prev.tags, tag]
    }));
  };

  const addCustomTag = () => {
    const nextTag = customTag.trim();
    if (!nextTag) return;
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(nextTag) ? prev.tags : [...prev.tags, nextTag]
    }));
    setCustomTag("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.branch || !formData.graduationYear || !formData.companyName || !formData.roleOffered || isEmptyRichText(formData.overallExperience) || !formData.overallRating) {
      showToast("Please fill all required fields before submitting.", "error");
      return;
    }

    const incompleteRound = rounds.some(round => !round.title.trim());
    if (incompleteRound) {
      showToast("Please add a round name for every added round or remove the blank one.", "error");
      return;
    }

    setLoading(true);
    try {
      const cleanedRounds = rounds
        .map(round => ({
          title: round.title.trim(),
          difficulty: round.difficulty || "Medium",
          content: round.content.trim()
        }))
        .filter(round => round.title);

      const submission = {
        studentName: formData.studentName.trim() || "Anonymous",
        email: formData.email.trim(),
        contactNumber: formData.contactNumber.trim(),
        branch: formData.branch,
        graduationYear: Number(formData.graduationYear),
        companyName: formData.companyName.trim(),
        roleOffered: formData.roleOffered.trim(),
        ctc: formData.ctc ? Number(formData.ctc) : null,
        stipend: formData.stipend ? Number(formData.stipend) : null,
        interviewDate: formData.interviewDate || null,
        rounds: cleanedRounds,
        overallExperience: formData.overallExperience.trim(),
        overallRating: Number(formData.overallRating),
        tags: formData.tags,
        technologies: formData.tags,
        prepTips: formData.overallExperience.trim()
      };

      await axios.post(`${API_URL}/experiences`, submission);

      showToast("Thank you! Your experience is submitted and pending TPO review.", "success");
      navigate("/experiences");
    } catch (err) {
      console.error("Error submitting experience:", err);
      showToast("Failed to submit experience. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const sectionStyle = (accent = "var(--primary)") => ({
    borderTop: `8px solid ${accent}`,
    display: "flex",
    flexDirection: "column",
    gap: 22
  });

  const sectionTitleStyle = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 24
  };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ marginBottom: 36, textAlign: "center" }}>
        <h1 style={{ fontSize: 38, marginBottom: 10 }}>Share Your Journey</h1>
        <p style={{ color: "var(--text-secondary)", maxWidth: 720, margin: "0 auto" }}>
          Help your fellow Walchand students by sharing your interview experience. Details help others prepare better.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        <section className="card" style={sectionStyle("var(--primary)")}>
          <div>
            <h2 style={sectionTitleStyle}>
              <User size={23} style={{ color: "var(--secondary)" }} /> Personal Information
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>
              Your details help verify authenticity. Name can be kept optional for anonymity.
            </p>
          </div>

          <div className="form-row-2col">
            <div className="form-group">
              <label>Name (Optional)</label>
              <input type="text" name="studentName" className="form-control" placeholder="Your full name" value={formData.studentName} onChange={handleInputChange} />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" className="form-control" placeholder="your.email@walchandsangli.ac.in" value={formData.email} onChange={handleInputChange} />
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-group">
              <label>Contact Number (Optional)</label>
              <input type="tel" name="contactNumber" className="form-control" placeholder="+91 9999999999" value={formData.contactNumber} onChange={handleInputChange} />
            </div>

            <div className="form-group">
              <label>Branch <span style={{ color: "var(--danger)" }}>*</span></label>
              <select name="branch" className="form-control" required value={formData.branch} onChange={handleInputChange}>
                <option value="">Select Branch</option>
                {BRANCHES.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-group">
              <label>Batch <span style={{ color: "var(--danger)" }}>*</span></label>
              <select name="graduationYear" className="form-control" required value={formData.graduationYear} onChange={handleInputChange}>
                <option value="">Select Batch</option>
                {BATCH_YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="card" style={sectionStyle("var(--secondary)")}>
          <h2 style={sectionTitleStyle}>
            <Building2 size={23} style={{ color: "var(--secondary)" }} /> Company Details
          </h2>

          <div className="form-row-2col">
            <div className="form-group" style={{ flex: "1 1 100%" }}>
              <label>Company Name <span style={{ color: "var(--danger)" }}>*</span></label>
              <input type="text" name="companyName" className="form-control" placeholder="e.g. Google, Microsoft, TCS" required value={formData.companyName} onChange={handleInputChange} />
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-group">
              <label>Role Offered <span style={{ color: "var(--danger)" }}>*</span></label>
              <input type="text" name="roleOffered" className="form-control" placeholder="e.g. SDE-1, System Engineer" required value={formData.roleOffered} onChange={handleInputChange} />
            </div>

            <div className="form-group">
              <label>Interview Date</label>
              <input type="date" name="interviewDate" className="form-control" value={formData.interviewDate} onChange={handleInputChange} />
            </div>
          </div>

          <div className="form-row-3col">
            <div className="form-group">
              <label>CTC (in LPA)</label>
              <input type="number" min="0" step="0.01" name="ctc" className="form-control" placeholder="e.g. 12" value={formData.ctc} onChange={handleInputChange} />
            </div>

            <div className="form-group">
              <label>Stipend (Optional)</label>
              <input type="number" min="0" step="1" name="stipend" className="form-control" placeholder="e.g. 50000" value={formData.stipend} onChange={handleInputChange} />
            </div>
          </div>
        </section>

        <section className="card" style={sectionStyle("var(--primary)")}>
          <div>
            <h2 style={sectionTitleStyle}>
              <FileText size={23} style={{ color: "var(--secondary)" }} /> Interview Rounds
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>
              Break down your experience by rounds, such as online assessment or technical interview.
            </p>
          </div>

          {rounds.map((round, index) => (
            <div key={index} className="round-editor-card">
              <button type="button" onClick={() => removeRound(index)} className="round-remove-button" aria-label="Remove round" title="Remove round">
                <Trash2 size={17} />
              </button>

              <div className="form-row-2col">
                <div className="form-group">
                  <label>Round Name <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input type="text" className="form-control" placeholder="e.g. Technical Round 1" value={round.title} onChange={(event) => handleRoundChange(index, "title", event.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Difficulty</label>
                  <select className="form-control" value={round.difficulty || "Medium"} onChange={(event) => handleRoundChange(index, "difficulty", event.target.value)}>
                    {ROUND_DIFFICULTIES.map(difficulty => (
                      <option key={difficulty} value={difficulty}>{difficulty}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <TiptapEditor
                  value={round.content}
                  placeholder="What was asked in this round?"
                  minHeight={96}
                  onChange={(nextValue) => handleRoundChange(index, "content", nextValue)}
                />
                <p className="rich-text-help">Use the toolbar above to format your text with bold, lists, headers, and more.</p>
              </div>
            </div>
          ))}

          <button type="button" onClick={addRound} className="btn btn-secondary" style={{ width: "100%", borderStyle: "dashed", height: 48, color: "var(--primary)" }}>
            <Plus size={16} /> Add Round
          </button>
        </section>

        <section className="card" style={sectionStyle("var(--secondary)")}>
          <h2 style={sectionTitleStyle}>
            <FileText size={23} style={{ color: "var(--secondary)" }} /> Overall Experience <span style={{ color: "var(--danger)" }}>*</span>
          </h2>

          <div className="form-group">
            <label>Share your comprehensive experience, preparation strategy, and tips.</label>
            <TiptapEditor
              value={formData.overallExperience}
              placeholder="Write your experience here..."
              minHeight={260}
              onChange={(nextValue) => setFormData(prev => ({ ...prev, overallExperience: nextValue }))}
            />
          </div>

          <div className="form-group">
            <label>Overall Rating <span style={{ color: "var(--danger)" }}>*</span></label>
            <div style={{ display: "flex", gap: 10 }}>
              {[1, 2, 3, 4, 5].map(rating => (
                <button key={rating} type="button" onClick={() => setFormData(prev => ({ ...prev, overallRating: rating }))} style={{ background: "none", border: "none", cursor: "pointer", color: rating <= formData.overallRating ? "var(--warning)" : "#cbd5e1", padding: 0 }} aria-label={`${rating} star rating`}>
                  <Star size={32} fill={rating <= formData.overallRating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card" style={sectionStyle("var(--primary)")}>
          <h2 style={sectionTitleStyle}>
            <Tag size={23} style={{ color: "var(--secondary)" }} /> Tags
          </h2>

          <div className="comp-tags" style={{ gap: 10 }}>
            {tagOptions.map(tag => {
              const active = formData.tags.includes(tag);
              return (
                <button key={tag} type="button" className="tag" onClick={() => toggleTag(tag)} style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "8px 14px", background: active ? "var(--primary)" : "white", color: active ? "white" : "var(--text-primary)" }}>
                  {tag}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              type="text"
              className="form-control"
              placeholder="Add custom tag"
              value={customTag}
              onChange={(event) => setCustomTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomTag();
                }
              }}
              style={{ flex: "1 1 260px" }}
            />
            <button type="button" className="btn btn-primary" onClick={addCustomTag}>
              Add
            </button>
          </div>
        </section>

        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--primary-glow)", padding: 14, borderRadius: 8, border: "1px solid rgba(47, 49, 146, 0.2)", fontSize: 13, color: "var(--text-secondary)" }}>
          <AlertCircle size={18} style={{ color: "var(--primary)", flexShrink: 0 }} />
          <span>
            By submitting, your response will be saved as <strong>Pending Approval</strong>. The Training and Placement Officer reviews all submissions before they go public.
          </span>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", height: 54, fontSize: 16 }}>
          <Send size={17} /> {loading ? "Submitting..." : "Submit Experience"}
        </button>
      </form>
    </div>
  );
}
