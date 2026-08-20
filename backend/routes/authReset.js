import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { User } from "../models.js";

const router = express.Router();

const ALLOWED_DOMAIN   = process.env.ALLOWED_DOMAIN || "walchandsangli.ac.in";
const CLIENT_URL       = process.env.CLIENT_URL      || "http://localhost:5173";
const RESET_EXPIRY_MS  = 15 * 60 * 1000;   // 15 minutes
const RATE_LIMIT_MS    = 2  * 60 * 1000;   // 2-minute cooldown between requests

// --- Helpers ---
const isDomainAllowed = (email) =>
  typeof email === "string" && email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// --- Lazy Nodemailer transporter ---
let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

const sendResetEmail = async (email, name, resetUrl) => {
  const mail = getTransporter();
  await mail.sendMail({
    from: process.env.SMTP_FROM || `"TPO WCE" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "TPO Portal — Password Reset Request",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:28px 32px;text-align:center;">
          <h2 style="color:#fff;margin:0;font-size:22px;">Walchand College of Engineering</h2>
          <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px;">Training &amp; Placement Office</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#1e293b;font-size:16px;">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569;font-size:14px;">We received a request to reset the password for your TPO Portal account.</p>
          <p style="color:#475569;font-size:14px;">Click the button below to reset your password. This link is valid for <strong>15 minutes</strong>.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
              Reset My Password
            </a>
          </div>
          <p style="color:#64748b;font-size:13px;">Or copy this link into your browser:</p>
          <p style="color:#2563eb;font-size:12px;word-break:break-all;">${resetUrl}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
          <p style="color:#94a3b8;font-size:12px;">
            If you didn&rsquo;t request this, you can safely ignore this email.
            Your password will <strong>not</strong> change unless you click the link above.
          </p>
        </div>
      </div>
    `,
  });
};

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/reset/request
// Accepts: { email }
// Returns 200 regardless of whether the email exists (enumeration guard).
// ─────────────────────────────────────────────────────────────────
router.post("/request", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !isDomainAllowed(email)) {
      // Always return 200 — don't reveal whether the email is registered
      return res.json({ message: "If that email exists in our system, a reset link has been sent." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Email not found → silently succeed (enumeration protection)
    if (!user) {
      return res.json({ message: "If that email exists in our system, a reset link has been sent." });
    }

    // Google-only account — no password to reset
    if (!user.password) {
      return res.status(400).json({
        message: "This account uses Google Sign-In and does not have a password. Please sign in with Google.",
      });
    }

    // Rate-limit: block if a reset was requested < 2 minutes ago
    if (
      user.resetTokenExpiry &&
      new Date() < new Date(user.resetTokenExpiry.getTime() - (RESET_EXPIRY_MS - RATE_LIMIT_MS))
    ) {
      return res.status(429).json({
        message: "A reset link was already sent recently. Please check your inbox or wait 2 minutes before trying again.",
      });
    }

    // Generate cryptographically secure token
    const rawToken  = crypto.randomBytes(32).toString("hex");   // 64 hex chars
    const tokenHash = hashToken(rawToken);
    const expiry    = new Date(Date.now() + RESET_EXPIRY_MS);

    user.resetTokenHash   = tokenHash;
    user.resetTokenExpiry = expiry;
    await user.save();

    const resetUrl = `${CLIENT_URL}/reset-password?token=${rawToken}`;
    await sendResetEmail(user.email, user.name, resetUrl);

    return res.json({ message: "If that email exists in our system, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/reset/confirm
// Accepts: { token, newPassword }
// ─────────────────────────────────────────────────────────────────
router.post("/confirm", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const tokenHash = hashToken(token);
    const user = await User.findOne({ resetTokenHash: tokenHash });

    if (!user) {
      return res.status(400).json({
        message: "This reset link is invalid or has already been used. Please request a new one.",
      });
    }

    if (new Date() > user.resetTokenExpiry) {
      // Clear the expired token
      user.resetTokenHash   = null;
      user.resetTokenExpiry = null;
      await user.save();
      return res.status(400).json({
        message: "This reset link has expired (valid for 15 minutes). Please request a new one.",
      });
    }

    // All good — update password, invalidate reset token + all active sessions
    user.password         = await bcrypt.hash(newPassword, 12);
    user.resetTokenHash   = null;
    user.resetTokenExpiry = null;
    user.refreshTokenHash = null;   // Force re-login on all devices
    await user.save();

    return res.json({ message: "Password reset successfully. You can now log in with your new password." });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/reset/validate?token=<token>
// Used by frontend to validate a token before showing the form
// ─────────────────────────────────────────────────────────────────
router.get("/validate", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ valid: false, message: "Token is required." });

    const tokenHash = hashToken(token);
    const user = await User.findOne({ resetTokenHash: tokenHash });

    if (!user) {
      return res.status(400).json({ valid: false, message: "This reset link is invalid or has already been used." });
    }

    if (new Date() > user.resetTokenExpiry) {
      return res.status(400).json({ valid: false, message: "This reset link has expired. Please request a new one." });
    }

    return res.json({ valid: true, email: user.email });
  } catch (err) {
    console.error("Validate reset token error:", err);
    return res.status(500).json({ valid: false, message: "Server error." });
  }
});

export default router;
