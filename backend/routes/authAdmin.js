import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
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
const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || "walchandsangli.ac.in";

// --- Helpers ---
const isDomainAllowed = (email) =>
  typeof email === "string" &&
  email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);

// SHA-256 hash — handles arbitrary token lengths (unlike bcrypt 72-char limit)
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const issueAdminTokens = async (admin, res) => {
  const accessPayload = {
    id:    admin._id,
    email: admin.email,
    name:  admin.name,
    role:  "tpo_admin",
  };

  const accessToken = jwt.sign(accessPayload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(
    { id: admin._id, role: "tpo_admin" },
    process.env.JWT_REFRESH_SECRET,
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

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: "Google authentication is not configured on this server" });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
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
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
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

export default router;
