import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";
import { Admin } from "../models.js";
import {
  authenticateAdmin,
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  getCookieOptions,
  clearAdminCookies,
} from "../middleware/auth.js";

const router = express.Router();
const ALLOWED_DOMAIN     = process.env.ALLOWED_DOMAIN || "walchandsangli.ac.in";
const JWT_ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || process.env.JWT_SECRET || "tpo_access_secret_key_123456789_abcdef";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "tpo_refresh_secret_key_987654321_fedcba";
const GOOGLE_CLIENT_ID   = process.env.GOOGLE_CLIENT_ID   || process.env.VITE_GOOGLE_CLIENT_ID || "69719983983-t4s37hm9b4nnu6obf22d3urr30rbo4qk.apps.googleusercontent.com";

// --- Helpers ---
const isDomainAllowed = (email) =>
  typeof email === "string" &&
  email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);

// SHA-256 hash — handles arbitrary token lengths (unlike bcrypt 72-char limit)
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

// --- Send OTP email ---
const sendOTPEmail = async (email, name, otp) => {
  const mail = getTransporter();
  await mail.sendMail({
    from: process.env.SMTP_FROM || `"TPO WCE" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "TPO Portal — Password Change OTP",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:28px 32px;text-align:center;">
          <h2 style="color:#fff;margin:0;font-size:22px;">Walchand College of Engineering</h2>
          <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px;">Training &amp; Placement Office</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#1e293b;font-size:16px;">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569;font-size:14px;">Use the code below to confirm your <strong>password change</strong>. This code expires in <strong>10 minutes</strong>.</p>
          <div style="background:#1e3a5f;border-radius:10px;padding:20px;text-align:center;margin:24px 0;">
            <span style="color:#fff;font-size:36px;font-weight:700;letter-spacing:12px;">${otp}</span>
          </div>
          <p style="color:#94a3b8;font-size:12px;">If you did not request a password change, please ignore this email and your password will remain unchanged.</p>
        </div>
      </div>
    `,
  });
};

const issueAdminTokens = async (admin, res) => {
  const accessPayload = {
    id:    admin._id,
    email: admin.email,
    name:  admin.name,
    role:  "tpo_admin",
  };

  const accessToken = jwt.sign(accessPayload, JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(
    { id: admin._id, role: "tpo_admin" },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  // Store hashed refresh token for server-side revocation
  admin.refreshTokenHash = hashToken(refreshToken);
  await admin.save();

  res.cookie(ADMIN_ACCESS_COOKIE,  accessToken,  getCookieOptions(ACCESS_MAX_AGE));
  res.cookie(ADMIN_REFRESH_COOKIE, refreshToken, getCookieOptions(REFRESH_MAX_AGE));

  return { name: admin.name, email: admin.email, role: "tpo_admin" };
};

// ─────────────────────────────────────────────────────
// POST /api/auth/admin/login  — Email + Password
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
        .json({ message: `Only @${ALLOWED_DOMAIN} accounts are permitted` });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!admin.password) {
      return res.status(400).json({
        message: "This account uses Google Sign-In. Please use 'Sign in with Google'.",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = await issueAdminTokens(admin, res);
    return res.json({ message: "Login successful", user });
  } catch (err) {
    console.error("Admin login error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/auth/admin/google  — Google OAuth (login only, no registration)
// ─────────────────────────────────────────────────────
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Google credential token is required" });
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: "Google authentication is not configured on this server" });
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload        = ticket.getPayload();
    const { email, name, sub: googleId, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({ message: "Google account email is not verified" });
    }

    if (!isDomainAllowed(email)) {
      return res
        .status(403)
        .json({ message: `Only @${ALLOWED_DOMAIN} accounts are permitted` });
    }

    // Admin MUST already exist — no self-registration via Google
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(403).json({
        message: "No admin account found for this email. Please contact the system administrator.",
      });
    }

    // Bind googleId on first Google sign-in
    if (!admin.googleId) {
      admin.googleId = googleId;
    }

    const user = await issueAdminTokens(admin, res);
    return res.json({ message: "Google login successful", user });
  } catch (err) {
    console.error("Admin Google login error:", err);
    if (err.message?.includes("Invalid token")) {
      return res.status(401).json({ message: "Invalid Google token. Please try again." });
    }
    return res.status(500).json({ message: "Server error during Google login" });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/auth/admin/refresh  — Refresh Token Rotation
// ─────────────────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies?.[ADMIN_REFRESH_COOKIE];
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      clearAdminCookies(res);
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.refreshTokenHash) {
      clearAdminCookies(res);
      return res.status(401).json({ message: "Session revoked. Please log in again." });
    }

    // Validate stored hash matches incoming token (RTR check)
    if (admin.refreshTokenHash !== hashToken(refreshToken)) {
      // Potential token reuse — revoke all sessions
      admin.refreshTokenHash = null;
      await admin.save();
      clearAdminCookies(res);
      return res.status(401).json({ message: "Token reuse detected. Please log in again." });
    }

    const user = await issueAdminTokens(admin, res);
    return res.json({ user });
  } catch (err) {
    console.error("Admin refresh error:", err);
    return res.status(500).json({ message: "Server error during token refresh" });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/auth/admin/logout
// ─────────────────────────────────────────────────────
router.post("/logout", authenticateAdmin, async (req, res) => {
  try {
    await Admin.findByIdAndUpdate(req.admin.id, { refreshTokenHash: null });
    clearAdminCookies(res);
    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Admin logout error:", err);
    clearAdminCookies(res);
    return res.json({ message: "Logged out" });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/auth/admin/me  — Restore session on page load
// ─────────────────────────────────────────────────────
router.get("/me", authenticateAdmin, (req, res) => {
  const { id, email, name, role } = req.admin;
  return res.json({ id, email, name, role });
});

// ─────────────────────────────────────────────────────
// POST /api/auth/admin/request-password-otp
// Sends an OTP to the admin's registered email to authorise a password change.
// ─────────────────────────────────────────────────────
router.post("/request-password-otp", authenticateAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });


    // Rate-limit: block if a fresh OTP was sent < 2 minutes ago
    if (
      admin.otpExpiry &&
      new Date() < new Date(admin.otpExpiry.getTime() - 8 * 60 * 1000)
    ) {
      return res.status(429).json({
        message: "Please wait before requesting another OTP.",
      });
    }

    const otp       = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash   = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    admin.otpHash   = otpHash;
    admin.otpExpiry = otpExpiry;
    await admin.save();

    await sendOTPEmail(admin.email, admin.name, otp);

    return res.json({
      message: "OTP sent to your registered email address. It is valid for 10 minutes.",
    });
  } catch (err) {
    console.error("Admin request-password-otp error:", err);
    return res.status(500).json({ message: "Server error sending OTP" });
  }
});

// ─────────────────────────────────────────────────────
// PUT /api/auth/admin/me  — Update profile (name / password via OTP)
// ─────────────────────────────────────────────────────
router.put("/me", authenticateAdmin, async (req, res) => {
  try {
    const { name, otp, newPassword } = req.body;
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (name && name.trim()) {
      admin.name = name.trim();
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      // --- OTP verification ---
      if (!otp) {
        return res.status(400).json({ message: "OTP is required to change your password" });
      }
      if (!admin.otpHash || !admin.otpExpiry) {
        return res.status(400).json({ message: "No pending OTP found. Please request a new one." });
      }
      if (new Date() > admin.otpExpiry) {
        admin.otpHash   = null;
        admin.otpExpiry = null;
        await admin.save();
        return res.status(400).json({ message: "OTP has expired. Please request a new one." });
      }
      const otpMatch = await bcrypt.compare(otp.toString(), admin.otpHash);
      if (!otpMatch) {
        return res.status(401).json({ message: "Invalid OTP. Please try again." });
      }

      // OTP verified — update password and clear OTP
      admin.password  = await bcrypt.hash(newPassword, 12);
      admin.otpHash   = null;
      admin.otpExpiry = null;
    }

    await admin.save();
    const user = await issueAdminTokens(admin, res);
    return res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Admin profile update error:", err);
    return res.status(500).json({ message: "Server error updating profile" });
  }
});

export default router;
