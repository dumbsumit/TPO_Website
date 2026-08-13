import mongoose from "mongoose";

// ─── Company ──────────────────────────────────────────────────────────────────
const CompanySchema = new mongoose.Schema({
  name: { type: String, required: true },
  visitYear: { type: Number, required: true },
  role: { type: String, required: true },
  package: { type: Number, required: true }, // CTC in LPA
  selectedCount: { type: Number, required: true, default: 0 },
  eligibility: { type: String, default: "" },
  technologies: [{ type: String }],
  hiringProcess: { type: String, default: "" }
}, { timestamps: true });

// ─── Experience ───────────────────────────────────────────────────────────────
const RoundSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  difficulty: { type: String, default: "Medium" },
  content:    { type: String, default: "" },
});

const ExperienceSchema = new mongoose.Schema({
  studentName:       { type: String, default: "Anonymous" },
  email:             { type: String, default: "" },
  contactNumber:     { type: String, default: "" },
  branch:            { type: String, required: true },
  graduationYear:    { type: Number, required: true },
  companyId:         { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
  companyName:       { type: String, required: true },
  roleOffered:       { type: String, default: "" },
  ctc:               { type: Number, default: null },
  stipend:           { type: Number, default: null },
  interviewDate:     { type: Date, default: null },
  overallExperience: { type: String, default: "" },
  overallRating:     { type: Number, min: 0, max: 5, default: 0 },
  tags:              [{ type: String }],
  status:            { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  rounds:            [RoundSchema],
  technologies:      [{ type: String }],
  prepTips:          { type: String, default: "" },
}, { timestamps: true });

// ─── Statistics ───────────────────────────────────────────────────────────────
const YearlyStatsSchema = new mongoose.Schema({
  year:        { type: Number, required: true, unique: true },
  companies:   { type: Number, required: true, default: 0 },
  placed:      { type: Number, required: true, default: 0 },
  avgPackage:  { type: Number, required: true, default: 0 },
});

const GlobalStatsSchema = new mongoose.Schema({
  totalCompanies:  { type: Number, default: 0 },
  totalPlaced:     { type: Number, default: 0 },
  highestPackage:  { type: Number, default: 0 },
  averagePackage:  { type: Number, default: 0 },
  yearlyStats:     [YearlyStatsSchema],
}, { timestamps: true });

// ─── Admin (TPO) ──────────────────────────────────────────────────────────────
const AdminSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:         { type: String, default: null },   // null → Google-only account
  googleId:         { type: String, default: null },
  role:             { type: String, default: "tpo_admin" },
  refreshTokenHash: { type: String, default: null },
}, { timestamps: true });

// ─── Student ──────────────────────────────────────────────────────────────────
const StudentSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:         { type: String, default: null },   // null → Google-only account
  googleId:         { type: String, default: null },
  branch:           { type: String, default: "" },
  graduationYear:   { type: Number, default: null },
  isVerified:       { type: Boolean, default: false },
  otpHash:          { type: String, default: null },
  otpExpiry:        { type: Date,   default: null },
  refreshTokenHash: { type: String, default: null },
}, { timestamps: true });

export const Company     = mongoose.model("Company",     CompanySchema);
export const Experience  = mongoose.model("Experience",  ExperienceSchema);
export const GlobalStats = mongoose.model("GlobalStats", GlobalStatsSchema);
export const YearlyStats = mongoose.model("YearlyStats", YearlyStatsSchema);
