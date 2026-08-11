import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import router from "./routes.js";
import authAdminRouter   from "./routes/authAdmin.js";
import authStudentRouter from "./routes/authStudent.js";

dotenv.config();

const app      = express();
const PORT     = process.env.PORT     || 5001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tpo_db";

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,   // required for httpOnly cookies cross-origin
}));
app.use(express.json());
app.use(cookieParser());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth/admin",   authAdminRouter);
app.use("/api/auth/student", authStudentRouter);
app.use("/api",              router);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Placement Activity Portal Backend API is running." });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// ─── Database Connection ──────────────────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully.");
    console.log("Note: Run 'node scripts/createAdmin.js' to create the TPO admin account.");
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
  });
