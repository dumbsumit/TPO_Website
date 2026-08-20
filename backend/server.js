import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import router from "./routes.js";
import authAdminRouter from "./routes/authAdmin.js";
import authStudentRouter from "./routes/authStudent.js";
import authResetRouter from "./routes/authReset.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,   // required for httpOnly cookies cross-origin
}));
app.use(express.json());
app.use(cookieParser());

// Disable Mongoose buffering so queries fail fast with clear message when DB is disconnected
mongoose.set("bufferCommands", false);

// ─── Database Check Middleware ────────────────────────────────────────────────
const checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database connection unavailable. Connecting to MongoDB... Please try again in a few seconds."
    });
  }
  next();
};

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth/admin",  checkDbConnection, authAdminRouter);
app.use("/api/auth/student", checkDbConnection, authStudentRouter);
app.use("/api/auth/reset",   checkDbConnection, authResetRouter);
app.use("/api", router);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    message: "Placement Activity Portal Backend API is running.",
    databaseConnected: mongoose.connection.readyState === 1
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// ─── Database Connection with Retry ───────────────────────────────────────────
const connectWithRetry = () => {
  mongoose.connect(MONGO_URI)
    .then(async () => {
      console.log("Connected to MongoDB successfully.");

      // Automatically clean up legacy indexes from old schemas if present
      try {
        const studentsColl = mongoose.connection.collection("students");
        await studentsColl.dropIndex("prn_1").catch(() => { });
        await studentsColl.dropIndex("username_1").catch(() => { });
      } catch (_) { }
    })
    .catch(err => {
      console.error("MongoDB connection error:", err.message);
      console.log("Retrying MongoDB connection in 5 seconds...");
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();
