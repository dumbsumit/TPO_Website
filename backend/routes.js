import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import { Company, Experience, GlobalStats, Admin, YearlyStats } from "./models.js";
import { parseCompaniesExcel, parseStatsExcel } from "./excelHelper.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const JWT_SECRET = process.env.JWT_SECRET || "tpo_placement_portal_jwt_secret_key_987654321";

// --- MIDDLEWARE FOR ADMIN AUTH ---
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// --- RECALCULATE STATISTICS HELPER ---
const recalculateGlobalStats = async () => {
  try {
    const companies = await Company.find({});
    
    let totalCompanies = companies.length;
    let totalPlaced = companies.reduce((acc, curr) => acc + (curr.selectedCount || 0), 0);
    let highestPackage = companies.length > 0 ? Math.max(...companies.map(c => c.package || 0)) : 0;
    let averagePackage = 0;
    
    if (totalCompanies > 0) {
      const sumPackages = companies.reduce((acc, curr) => acc + (curr.package || 0), 0);
      averagePackage = Number((sumPackages / totalCompanies).toFixed(2));
    }

    // Dynamic auto-sync for the current year (2025) in YearlyStats
    const currentYear = 2025;
    const companies2025 = companies.filter(c => c.visitYear === currentYear);
    const placed2025 = companies2025.reduce((acc, curr) => acc + (curr.selectedCount || 0), 0);
    let avgPackage2025 = 0;
    if (companies2025.length > 0) {
      const sum2025 = companies2025.reduce((acc, curr) => acc + (curr.package || 0), 0);
      avgPackage2025 = Number((sum2025 / companies2025.length).toFixed(2));
    }

    await YearlyStats.findOneAndUpdate(
      { year: currentYear },
      { 
        year: currentYear, 
        companies: companies2025.length, 
        placed: placed2025, 
        avgPackage: avgPackage2025 
      },
      { upsert: true, new: true }
    );

    const yearlyStatsList = await YearlyStats.find({}).sort({ year: 1 });

    let globalStats = await GlobalStats.findOne({});
    if (!globalStats) {
      globalStats = new GlobalStats();
    }

    globalStats.totalCompanies = totalCompanies;
    globalStats.totalPlaced = totalPlaced;
    globalStats.highestPackage = highestPackage;
    globalStats.averagePackage = averagePackage;
    globalStats.yearlyStats = yearlyStatsList;

    await globalStats.save();
  } catch (error) {
    console.error("Error recalculating global stats:", error);
  }
};

// --- AUTH ROUTE ---
router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign({ id: admin._id, username: admin.username }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, username: admin.username });
  } catch (error) {
    res.status(500).json({ message: "Server error during login" });
  }
});

// --- COMPANIES ROUTES ---
router.get("/companies", async (req, res) => {
  try {
    const companies = await Company.find({}).sort({ name: 1 });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: "Error fetching companies" });
  }
});

router.get("/companies/:id", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: "Error fetching company" });
  }
});

router.post("/companies", authenticateToken, async (req, res) => {
  try {
    const newCompany = new Company(req.body);
    await newCompany.save();
    await recalculateGlobalStats();
    res.status(201).json(newCompany);
  } catch (error) {
    res.status(400).json({ message: "Error saving company", error });
  }
});

router.put("/companies/:id", authenticateToken, async (req, res) => {
  try {
    const updated = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Company not found" });
    }
    await recalculateGlobalStats();
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "Error updating company" });
  }
});

router.delete("/companies/:id", authenticateToken, async (req, res) => {
  try {
    const deleted = await Company.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Company not found" });
    }
    // Remove references or associated experiences
    await Experience.deleteMany({ companyId: req.params.id });
    await recalculateGlobalStats();
    res.json({ message: "Company deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting company" });
  }
});

// --- INTERVIEW EXPERIENCES ROUTES ---
router.get("/experiences", async (req, res) => {
  try {
    const approved = await Experience.find({ status: "approved" }).sort({ createdAt: -1 });
    res.json(approved);
  } catch (error) {
    res.status(500).json({ message: "Error fetching experiences" });
  }
});

router.get("/experiences/admin", authenticateToken, async (req, res) => {
  try {
    const experiences = await Experience.find({}).sort({ createdAt: -1 });
    res.json(experiences);
  } catch (error) {
    res.status(500).json({ message: "Error fetching experiences" });
  }
});

router.post("/experiences", async (req, res) => {
  try {
    // Check if companyId exists or lookup by companyName
    let { companyName, companyId } = req.body;
    if (!companyId && companyName) {
      const comp = await Company.findOne({ name: { $regex: new RegExp(`^${companyName.trim()}$`, "i") } });
      if (comp) {
        companyId = comp._id;
        companyName = comp.name; // Keep name clean
      }
    }
    const newExp = new Experience({ ...req.body, companyId, companyName, status: "pending" });
    await newExp.save();
    res.status(201).json(newExp);
  } catch (error) {
    res.status(400).json({ message: "Error submitting experience", error });
  }
});

router.patch("/experiences/:id/status", authenticateToken, async (req, res) => {
  const { status } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }
  try {
    const updated = await Experience.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Experience not found" });
    }
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "Error updating status" });
  }
});

router.delete("/experiences/:id", authenticateToken, async (req, res) => {
  try {
    const deleted = await Experience.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Experience not found" });
    }
    res.json({ message: "Experience deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting experience" });
  }
});

// --- STATISTICS ROUTES ---
router.get("/statistics", async (req, res) => {
  try {
    let stats = await GlobalStats.findOne({});
    if (!stats) {
      await recalculateGlobalStats();
      stats = await GlobalStats.findOne({});
    }
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: "Error fetching statistics" });
  }
});

router.put("/statistics", authenticateToken, async (req, res) => {
  try {
    const { totalCompanies, totalPlaced, highestPackage, averagePackage } = req.body;
    let stats = await GlobalStats.findOne({});
    if (!stats) {
      stats = new GlobalStats();
    }
    if (totalCompanies !== undefined) stats.totalCompanies = totalCompanies;
    if (totalPlaced !== undefined) stats.totalPlaced = totalPlaced;
    if (highestPackage !== undefined) stats.highestPackage = highestPackage;
    if (averagePackage !== undefined) stats.averagePackage = averagePackage;
    
    await stats.save();
    res.json(stats);
  } catch (error) {
    res.status(400).json({ message: "Error updating statistics" });
  }
});

// --- EXCEL BULK IMPORTS ---
router.post("/admin/import-companies", authenticateToken, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Excel file is required" });
  }
  try {
    const parsed = parseCompaniesExcel(req.file.buffer);
    if (parsed.length === 0) {
      return res.status(400).json({ message: "No valid rows found in sheet" });
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const compData of parsed) {
      // Upsert check: match by name, visitYear, and role
      const match = await Company.findOne({ 
        name: { $regex: new RegExp(`^${compData.name}$`, "i") }, 
        visitYear: compData.visitYear, 
        role: { $regex: new RegExp(`^${compData.role}$`, "i") } 
      });

      if (match) {
        await Company.findByIdAndUpdate(match._id, compData);
        updatedCount++;
      } else {
        const newComp = new Company(compData);
        await newComp.save();
        insertedCount++;
      }
    }

    await recalculateGlobalStats();
    res.json({ 
      message: "Companies Excel imported successfully!", 
      inserted: insertedCount, 
      updated: updatedCount,
      totalProcessed: parsed.length
    });
  } catch (error) {
    console.error("Excel import error:", error);
    res.status(500).json({ message: "Failed to parse Excel file", error: error.message });
  }
});

router.post("/admin/import-stats", authenticateToken, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Excel file is required" });
  }
  try {
    const parsed = parseStatsExcel(req.file.buffer);
    if (parsed.length === 0) {
      return res.status(400).json({ message: "No valid statistics rows found" });
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const statData of parsed) {
      const match = await YearlyStats.findOne({ year: statData.year });
      if (match) {
        await YearlyStats.findByIdAndUpdate(match._id, statData);
        updatedCount++;
      } else {
        const newStat = new YearlyStats(statData);
        await newStat.save();
        insertedCount++;
      }
    }

    await recalculateGlobalStats();
    res.json({ 
      message: "Placement Statistics Excel imported successfully!", 
      inserted: insertedCount, 
      updated: updatedCount,
      totalProcessed: parsed.length
    });
  } catch (error) {
    console.error("Stats import error:", error);
    res.status(500).json({ message: "Failed to parse statistics Excel file", error: error.message });
  }
});

export default router;
