import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";
import { Student } from "../models.js";
import {
  authenticateStudent,
  STUDENT_ACCESS_COOKIE,
  STUDENT_REFRESH_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  getCookieOptions,
  clearStudentCookies,
} from "../middleware/auth.js";

const router = express.Router();
const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || "walchandsangli.ac.in";
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "tpo_access_secret_key_123456789_abcdef";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "tpo_refresh_secret_key_987654321_fedcba";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "69719983983-t4s37hm9b4nnu6obf22d3urr30rbo4qk.apps.googleusercontent.com";

// --- Domain validation ---
const isDomainAllowed = (email) =>
  typeof email === "string" &&
  email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);

// --- SHA-256 hash for refresh tokens ---
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// --- Nodemailer transporter (lazy init) ---
let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

// --- Send OTP email (subject / body changes based on purpose) ---
const sendOTPEmail = async (email, name, otp, purpose = "verify") => {
  const mail = getTransporter();
  const isPasswordChange = purpose === "password";
  await mail.sendMail({
    from: process.env.SMTP_FROM || `"TPO WCE" <${process.env.SMTP_USER}>`,
    to: email,
    subject: isPasswordChange
      ? "TPO Portal — Password Change OTP"
      : "Your TPO Portal Verification Code",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:28px 32px;text-align:center;">
          <h2 style="color:#fff;margin:0;font-size:22px;">Walchand College of Engineering</h2>
          <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px;">Training &amp; Placement Office</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#1e293b;font-size:16px;">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569;font-size:14px;">${
            isPasswordChange
              ? "Use the code below to confirm your <strong>password change</strong>. This code expires in <strong>10 minutes</strong>."
              : "Use the code below to verify your email address. This code expires in <strong>10 minutes</strong>."
          }</p>
          <div style="background:#1e3a5f;border-radius:10px;padding:20px;text-align:center;margin:24px 0;">
            <span style="color:#fff;font-size:36px;font-weight:700;letter-spacing:12px;">${otp}</span>
          </div>
          <p style="color:#94a3b8;font-size:12px;">${
            isPasswordChange
              ? "If you did not request a password change, please ignore this email and your password will remain unchanged."
              : "If you did not request this, please ignore this email. Do not share this code with anyone."
          }</p>
        </div>
      </div>
    `,
  });
};

// --- Issue student tokens + set cookies ---
const issueStudentTokens = async (student, res) => {
  const accessPayload = {
    id:          student._id,
    email:       student.email,
    name:        student.name,
    role:        "student",
    isVerified:  student.isVerified,
    branch:      student.branch,
    graduationYear: student.graduationYear,
  };

  const accessToken = jwt.sign(accessPayload, JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(
    { id: student._id, role: "student" },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  student.refreshTokenHash = hashToken(refreshToken);
  await student.save();

  res.cookie(STUDENT_ACCESS_COOKIE,  accessToken,  getCookieOptions(ACCESS_MAX_AGE));
  res.cookie(STUDENT_REFRESH_COOKIE, refreshToken, getCookieOptions(REFRESH_MAX_AGE));

  return {
    name:           student.name,
    email:          student.email,
    role:           "student",
    isVerified:     student.isVerified,
    branch:         student.branch,
    graduationYear: student.graduationYear,
  };
};

// ─────────────────────────────────────────────────────
// POST /api/auth/student/register  — Email + Password
// ─────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, branch, graduationYear } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    if (!isDomainAllowed(email)) {
      return res
        .status(403)
        .json({ message: `Only @${ALLOWED_DOMAIN} email addresses are allowed` });
    }

    const existing = await Student.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.isVerified) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }
      // Unverified — allow re-registration (resend OTP)
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Generate 6-digit OTP
    const otp    = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash   = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (existing) {
      // Update existing unverified student
      existing.name           = name;
      existing.password       = passwordHash;
      existing.branch         = branch || "";
      existing.graduationYear = graduationYear || null;
      existing.otpHash        = otpHash;
      existing.otpExpiry      = otpExpiry;
      await existing.save();
    } else {
      await Student.create({
        name,
        email:          email.toLowerCase(),
        password:       passwordHash,
        branch:         branch || "",
        graduationYear: graduationYear || null,
        isVerified:     false,
        otpHash,
        otpExpiry,
      });
    }

    await sendOTPEmail(email, name, otp, "verify");

    return res.status(201).json({
      message: "Registration successful. Please check your email for the OTP.",
      email: email.toLowerCase(),
    });
  } catch (err) {
    console.error("Student register error:", err);
    return res.status(500).json({ message: "Server error during registration" });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/auth/student/verify-otp
// ─────────────────────────────────────────────────────
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const student = await Student.findOne({ email: email.toLowerCase() });
    if (!student) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (student.isVerified) {
      return res.status(400).json({ message: "Email already verified. Please log in." });
    }

    if (!student.otpHash || !student.otpExpiry) {
      return res.status(400).json({ message: "No OTP found. Please register again." });
    }

    if (new Date() > student.otpExpiry) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    const isMatch = await bcrypt.compare(otp.toString(), student.otpHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    // Mark verified and clear OTP
    student.isVerified = true;
    student.otpHash    = null;
    student.otpExpiry  = null;
    await student.save();

    const user = await issueStudentTokens(student, res);
    return res.json({ message: "Email verified successfully!", user });
  } catch (err) {
    console.error("OTP verify error:", err);
    return res.status(500).json({ message: "Server error during OTP verification" });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/auth/student/resend-otp
// ─────────────────────────────────────────────────────
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const student = await Student.findOne({ email: email.toLowerCase() });
    if (!student) return res.status(404).json({ message: "Account not found" });
    if (student.isVerified) return res.status(400).json({ message: "Email already verified" });

    // Rate-limit: block if previous OTP was sent less than 2 minutes ago
    if (student.otpExpiry && new Date() < new Date(student.otpExpiry.getTime() - 8 * 60 * 1000)) {
      return res.status(429).json({ message: "Please wait before requesting another OTP" });
    }

    const otp    = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash   = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    student.otpHash   = otpHash;
    student.otpExpiry = otpExpiry;
    await student.save();

    await sendOTPEmail(email, student.name, otp, "verify");

    return res.json({ message: "OTP sent successfully. Please check your email." });
  } catch (err) {
    console.error("Resend OTP error:", err);
    return res.status(500).json({ message: "Server error while resending OTP" });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/auth/student/login  — Email + Password
// ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!isDomainAllowed(email)) {
      return res
        .status(403)
        .json({ message: `Only @${ALLOWED_DOMAIN} email addresses are allowed` });
    }

    const student = await Student.findOne({ email: email.toLowerCase() });
    if (!student) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!student.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        requiresVerification: true,
        email: student.email,
      });
    }

    if (!student.password) {
      return res.status(400).json({
        message: "This account uses Google Sign-In. Please use 'Sign in with Google'.",
      });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = await issueStudentTokens(student, res);
    return res.json({ message: "Login successful", user });
  } catch (err) {
    console.error("Student login error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/auth/student/google
// ─────────────────────────────────────────────────────
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Google credential token is required" });

    if (!GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: "Google authentication is not configured on this server" });
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({ message: "Google account email is not verified" });
    }

    if (!isDomainAllowed(email)) {
      return res
        .status(403)
        .json({ message: `Only @${ALLOWED_DOMAIN} email addresses are allowed` });
    }

    // Upsert student — Google sign-in creates account if not exists
    let student = await Student.findOne({ email: email.toLowerCase() });

    if (!student) {
      student = await Student.create({
        name,
        email:      email.toLowerCase(),
        googleId,
        isVerified: true, // Google verifies email natively
      });
    } else {
      if (!student.googleId) student.googleId = googleId;
      if (!student.isVerified) student.isVerified = true;
      await student.save();
    }

    const user = await issueStudentTokens(student, res);
    return res.json({ message: "Google sign-in successful", user });
  } catch (err) {
    console.error("Student Google login error:", err);
    if (err.message?.includes("Invalid token")) {
      return res.status(401).json({ message: "Invalid Google token. Please try again." });
    }
    return res.status(500).json({ message: "Server error during Google sign-in" });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/auth/student/refresh  — Refresh Token Rotation
// ─────────────────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies?.[STUDENT_REFRESH_COOKIE];
    if (!refreshToken) return res.status(401).json({ message: "Refresh token missing" });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      clearStudentCookies(res);
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const student = await Student.findById(decoded.id);
    if (!student || !student.refreshTokenHash) {
      clearStudentCookies(res);
      return res.status(401).json({ message: "Session revoked. Please log in again." });
    }

    if (student.refreshTokenHash !== hashToken(refreshToken)) {
      // Replay attack — revoke all sessions
      student.refreshTokenHash = null;
      await student.save();
      clearStudentCookies(res);
      return res.status(401).json({ message: "Token reuse detected. Please log in again." });
    }

    const user = await issueStudentTokens(student, res);
    return res.json({ user });
  } catch (err) {
    console.error("Student refresh error:", err);
    return res.status(500).json({ message: "Server error during token refresh" });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/auth/student/logout
// ─────────────────────────────────────────────────────
router.post("/logout", authenticateStudent, async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.student.id, { refreshTokenHash: null });
    clearStudentCookies(res);
    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Student logout error:", err);
    clearStudentCookies(res);
    return res.json({ message: "Logged out" });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/auth/student/me  — Restore session on page load
// ─────────────────────────────────────────────────────
router.get("/me", authenticateStudent, (req, res) => {
  const { id, email, name, role, isVerified, branch, graduationYear } = req.student;
  return res.json({ id, email, name, role, isVerified, branch, graduationYear });
});

// ─────────────────────────────────────────────────────
// POST /api/auth/student/request-password-otp
// Sends an OTP to the student's registered email to authorise a password change.
// ─────────────────────────────────────────────────────
router.post("/request-password-otp", authenticateStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.student.id);
    if (!student) return res.status(404).json({ message: "Student not found" });


    // Rate-limit: block if a fresh OTP was sent < 2 minutes ago
    if (
      student.otpExpiry &&
      new Date() < new Date(student.otpExpiry.getTime() - 8 * 60 * 1000)
    ) {
      return res.status(429).json({
        message: "Please wait before requesting another OTP.",
      });
    }

    const otp       = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash   = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    student.otpHash   = otpHash;
    student.otpExpiry = otpExpiry;
    await student.save();

    await sendOTPEmail(student.email, student.name, otp, "password");

    return res.json({
      message: "OTP sent to your registered email address. It is valid for 10 minutes.",
    });
  } catch (err) {
    console.error("Student request-password-otp error:", err);
    return res.status(500).json({ message: "Server error sending OTP" });
  }
});

// ─────────────────────────────────────────────────────
// PUT /api/auth/student/me  — Update profile (password change uses OTP)
// ─────────────────────────────────────────────────────
router.put("/me", authenticateStudent, async (req, res) => {
  try {
    const { name, branch, graduationYear, otp, newPassword } = req.body;
    const student = await Student.findById(req.student.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (name && name.trim())          student.name = name.trim();
    if (branch !== undefined)          student.branch = branch;
    if (graduationYear !== undefined)  student.graduationYear = graduationYear || null;

    if (newPassword) {
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      // --- OTP verification ---
      if (!otp) {
        return res.status(400).json({ message: "OTP is required to change your password" });
      }
      if (!student.otpHash || !student.otpExpiry) {
        return res.status(400).json({ message: "No pending OTP found. Please request a new one." });
      }
      if (new Date() > student.otpExpiry) {
        student.otpHash   = null;
        student.otpExpiry = null;
        await student.save();
        return res.status(400).json({ message: "OTP has expired. Please request a new one." });
      }
      const otpMatch = await bcrypt.compare(otp.toString(), student.otpHash);
      if (!otpMatch) {
        return res.status(401).json({ message: "Invalid OTP. Please try again." });
      }

      // OTP verified — update password and clear OTP
      student.password  = await bcrypt.hash(newPassword, 12);
      student.otpHash   = null;
      student.otpExpiry = null;
    }

    await student.save();
    const user = await issueStudentTokens(student, res);
    return res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Student profile update error:", err);
    return res.status(500).json({ message: "Server error updating profile" });
  }
});

export default router;
