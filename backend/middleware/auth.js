import jwt from "jsonwebtoken";

// --- Cookie names ---
export const ADMIN_ACCESS_COOKIE  = "admin_access";
export const ADMIN_REFRESH_COOKIE = "admin_refresh";
export const STUDENT_ACCESS_COOKIE  = "student_access";
export const STUDENT_REFRESH_COOKIE = "student_refresh";

// --- Cookie max-ages ---
export const ACCESS_MAX_AGE  = 15 * 60 * 1000;             // 15 minutes
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;   // 7 days

// --- Cookie factory ---
export const getCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  path: "/",
  maxAge,
});

// --- Clear auth cookies helpers ---
export const clearAdminCookies = (res) => {
  res.clearCookie(ADMIN_ACCESS_COOKIE,  { httpOnly: true, path: "/" });
  res.clearCookie(ADMIN_REFRESH_COOKIE, { httpOnly: true, path: "/" });
};

export const clearStudentCookies = (res) => {
  res.clearCookie(STUDENT_ACCESS_COOKIE,  { httpOnly: true, path: "/" });
  res.clearCookie(STUDENT_REFRESH_COOKIE, { httpOnly: true, path: "/" });
};

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "tpo_access_secret_key_123456789_abcdef";

// --- Middleware: Authenticate Admin ---
export const authenticateAdmin = (req, res, next) => {
  const token = req.cookies?.[ADMIN_ACCESS_COOKIE];
  if (!token) {
    return res.status(401).json({ message: "Admin authentication required" });
  }
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    if (decoded.role !== "tpo_admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.admin = decoded;
    next();
  } catch {
    clearAdminCookies(res);
    return res.status(401).json({ message: "Invalid or expired session" });
  }
};

// --- Middleware: Authenticate Student ---
export const authenticateStudent = (req, res, next) => {
  const token = req.cookies?.[STUDENT_ACCESS_COOKIE];
  if (!token) {
    return res.status(401).json({ message: "Student authentication required" });
  }
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    if (decoded.role !== "student") {
      return res.status(403).json({ message: "Student access required" });
    }
    req.student = decoded;
    next();
  } catch {
    clearStudentCookies(res);
    return res.status(401).json({ message: "Invalid or expired session" });
  }
};

// --- Middleware: Require verified student email ---
export const requireVerified = (req, res, next) => {
  if (!req.student?.isVerified) {
    return res.status(403).json({ message: "Please verify your email address first" });
  }
  next();
};
