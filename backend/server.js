import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import router from "./routes.js";
import { Admin, Company, Experience, YearlyStats, GlobalStats } from "./models.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/tpo_db";

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", router);

// Default Route
app.get("/", (req, res) => {
  res.json({ message: "Placement Activity Portal Backend API is running." });
});

// Database Seeding Logic
const seedDefaultData = async () => {
  try {
    // 1. Seed Admin
    const adminCount = await Admin.countDocuments({});
    if (adminCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("admin123", salt);
      await Admin.create({ username: "admin", password: hashedPassword });
      console.log("Default admin account seeded successfully: admin / admin123");
    }

    // Seeding of sample companies, experiences, and stats has been disabled to start with a clean portal database.
    // Admin seeding is kept to allow initial logins.
  } catch (error) {
    console.error("Error seeding default data:", error);
  }
};

// Database Connection & Server Startup
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB successfully.");
    await seedDefaultData();
    
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
  });
