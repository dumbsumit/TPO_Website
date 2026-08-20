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
  title: { type: String, required: true },
  difficulty: { type: String, default: "Medium" },
  content: { type: String, default: "" },
});

const ExperienceSchema = new mongoose.Schema({
  studentName: { type: String, default: "Anonymous" },
  email: { type: String, default: "" },
  contactNumber: { type: String, default: "" },
  branch: { type: String, required: true },
  graduationYear: { type: Number, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
  companyName: { type: String, required: true },
  roleOffered: { type: String, default: "" },
  ctc: { type: Number, default: null },
  stipend: { type: Number, default: null },
  interviewDate: { type: Date, default: null },
  overallExperience: { type: String, default: "" },
  overallRating: { type: Number, min: 0, max: 5, default: 0 },
  tags: [{ type: String }],
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  rounds: [RoundSchema],
  technologies: [{ type: String }],
  prepTips: { type: String, default: "" },
}, { timestamps: true });

// ─── Statistics ───────────────────────────────────────────────────────────────
const YearlyStatsSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  companies: { type: Number, required: true, default: 0 },
  placed: { type: Number, required: true, default: 0 },
  avgPackage: { type: Number, required: true, default: 0 },
});

const GlobalStatsSchema = new mongoose.Schema({
  totalCompanies: { type: Number, default: 0 },
  totalPlaced: { type: Number, default: 0 },
  highestPackage: { type: Number, default: 0 },
  averagePackage: { type: Number, default: 0 },
  yearlyStats: [YearlyStatsSchema],
}, { timestamps: true });

// ─── Unified User ─────────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, default: null },   // null → Google-only account
  googleId: { type: String, default: null },
  role: { type: String, required: true, enum: ["student", "tpo_admin"], default: "student" },
  branch: { type: String, default: "" },
  graduationYear: { type: Number, default: null },
  isVerified: { type: Boolean, default: false },
  otpHash:   { type: String, default: null },  // bcrypt hash of pending OTP
  otpExpiry: { type: Date,   default: null },  // OTP expiry timestamp
  refreshTokenHash: { type: String, default: null },
}, { timestamps: true });

export const Company = mongoose.model("Company", CompanySchema);
export const Experience = mongoose.model("Experience", ExperienceSchema);
export const GlobalStats = mongoose.model("GlobalStats", GlobalStatsSchema);
export const YearlyStats = mongoose.model("YearlyStats", YearlyStatsSchema);
export const User = mongoose.model("User", UserSchema);
export const Admin = User;
export const Student = User;

// ─── PlacedStudent ────────────────────────────────────────────────────────────
const PlacedStudentSchema = new mongoose.Schema({
  prn:           { type: String, required: true, unique: true, trim: true },
  name:          { type: String, required: true },
  branch:        { type: String, default: "" },
  gender:        { type: String, default: "" },
  personalEmail: { type: String, default: "" },
  collegeEmail:  { type: String, default: "" },
  phone:         { type: String, default: "" },
}, { timestamps: true });

export const PlacedStudent = mongoose.model("PlacedStudent", PlacedStudentSchema);

// ─── PlacementOffer ───────────────────────────────────────────────────────────
const PlacementOfferSchema = new mongoose.Schema({
  studentId:       { type: mongoose.Schema.Types.ObjectId, ref: "PlacedStudent", required: true },
  companyId:       { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  packageLpa:      { type: Number, default: null },
  offerType:       { type: String, enum: ["PRIMARY", "SECONDARY"], default: "PRIMARY" },
  placementStatus: { type: String, default: "Placed" },
  offerDate:       { type: Date, default: null },
}, { timestamps: true });

export const PlacementOffer = mongoose.model("PlacementOffer", PlacementOfferSchema);

// ─── Internship ───────────────────────────────────────────────────────────────
const InternshipSchema = new mongoose.Schema({
  studentId:  { type: mongoose.Schema.Types.ObjectId, ref: "PlacedStudent", required: true },
  companyId:  { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  startDate:  { type: Date, default: null },
  endDate:    { type: Date, default: null },
  stipend:    { type: Number, default: null },
  ppo:        { type: String, enum: ["Yes", "No"], default: "No" },
  status:     { type: String, default: "Active" },
}, { timestamps: true });

export const Internship = mongoose.model("Internship", InternshipSchema);

// ─── PlacementRecord (flat/legacy record) ────────────────────────────────────
const PlacementRecordSchema = new mongoose.Schema({
  srNo:                 { type: Number, default: 0 },
  prn:                  { type: String, required: true, trim: true },
  branch:               { type: String, default: "" },
  firstName:            { type: String, default: "" },
  middleName:           { type: String, default: "" },
  lastName:             { type: String, default: "" },
  gender:               { type: String, default: "" },
  company1:             { type: String, default: "" },
  salary1:              { type: Number, default: 0 },
  company2:             { type: String, default: "" },
  salary2:              { type: Number, default: 0 },
  internshipOffered:    { type: String, default: "No" },
  internshipCompany:    { type: String, default: "" },
  internshipStartDate:  { type: Date, default: null },
  internshipEndDate:    { type: Date, default: null },
  stipend:              { type: Number, default: 0 },
  personalMail:         { type: String, default: "" },
  collegeMail:          { type: String, default: "" },
  phoneNo:              { type: String, default: "" },
  placementStatus:      { type: String, default: "Unplaced" },
}, { timestamps: true });

export const PlacementRecord = mongoose.model("PlacementRecord", PlacementRecordSchema);

// ─── BranchConfig (registered student counts per branch) ─────────────────────
const BranchConfigSchema = new mongoose.Schema({
  branch:          { type: String, required: true, unique: true, trim: true },
  registeredCount: { type: Number, required: true, default: 0 },
}, { timestamps: true });

export const BranchConfig = mongoose.model("BranchConfig", BranchConfigSchema);

// ─── UploadLog (tracks uploaded Excel/CSV files) ──────────────────────────────
const UploadLogSchema = new mongoose.Schema({
  fileName:             { type: String, required: true },
  fileType:             { type: String, default: "Student Placement Records Excel" },
  fileSize:             { type: Number, default: 0 },
  totalRows:            { type: Number, default: 0 },
  successfullyImported: { type: Number, default: 0 },
  updatedRecords:       { type: Number, default: 0 },
  failedRecords:        { type: Number, default: 0 },
  duplicateRecords:     { type: Number, default: 0 },
  uploadedBy:           { type: String, default: "TPO Admin" },
}, { timestamps: true });

export const UploadLog = mongoose.model("UploadLog", UploadLogSchema);

