import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { Company, Experience, GlobalStats, YearlyStats } from "./models.js";
import { parseCompaniesExcel, parseStatsExcel } from "./excelHelper.js";
import { authenticateAdmin } from "./middleware/auth.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const isDatabaseReady = () => mongoose.connection.readyState === 1;

const getFallbackStatistics = () => ({
  totalCompanies: 0,
  totalPlaced: 0,
  highestPackage: 0,
  averagePackage: 0,
  yearlyStats: [],
});

// --- RECALCULATE STATISTICS HELPER ---
const recalculateGlobalStats = async () => {
  try {
    if (!isDatabaseReady()) return;

    const companies = await Company.find({});

    const totalCompanies = companies.length;
    const totalPlaced    = companies.reduce((acc, curr) => acc + (curr.selectedCount || 0), 0);
    const highestPackage = companies.length > 0 ? Math.max(...companies.map(c => c.package || 0)) : 0;
    let   averagePackage = 0;

    if (totalCompanies > 0) {
      const sumPackages = companies.reduce((acc, curr) => acc + (curr.package || 0), 0);
      averagePackage    = Number((sumPackages / totalCompanies).toFixed(2));
    }

    // Auto-sync current year
    const currentYear    = new Date().getFullYear();
    const companiesCY    = companies.filter(c => c.visitYear === currentYear);
    const placedCY       = companiesCY.reduce((acc, curr) => acc + (curr.selectedCount || 0), 0);
    let   avgPackageCY   = 0;
    if (companiesCY.length > 0) {
      const sumCY = companiesCY.reduce((acc, curr) => acc + (curr.package || 0), 0);
      avgPackageCY = Number((sumCY / companiesCY.length).toFixed(2));
    }

    await YearlyStats.findOneAndUpdate(
      { year: currentYear },
      { year: currentYear, companies: companiesCY.length, placed: placedCY, avgPackage: avgPackageCY },
      { upsert: true, new: true }
    );

    const yearlyStatsList = await YearlyStats.find({}).sort({ year: 1 });

    let globalStats = await GlobalStats.findOne({});
    if (!globalStats) globalStats = new GlobalStats();

    globalStats.totalCompanies = totalCompanies;
    globalStats.totalPlaced    = totalPlaced;
    globalStats.highestPackage = highestPackage;
    globalStats.averagePackage = averagePackage;
    globalStats.yearlyStats    = yearlyStatsList;

    await globalStats.save();
  } catch (error) {
    console.error("Error recalculating global stats:", error);
  }
};

// --- COMPANIES ROUTES ---
router.get("/companies", async (req, res) => {
  if (!isDatabaseReady()) return res.json([]);
  try {
    const companies = await Company.find({}).sort({ name: 1 });
    res.json(companies);
  } catch { res.json([]); }
});

router.get("/companies/:id", async (req, res) => {
  if (!isDatabaseReady()) return res.status(404).json({ message: "Company not found" });
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.json(company);
  } catch { res.status(500).json({ message: "Error fetching company" }); }
});

router.post("/companies", authenticateAdmin, async (req, res) => {
  try {
    const newCompany = new Company(req.body);
    await newCompany.save();
    await recalculateGlobalStats();
    res.status(201).json(newCompany);
  } catch (error) { res.status(400).json({ message: "Error saving company", error }); }
});

router.put("/companies/:id", authenticateAdmin, async (req, res) => {
  try {
    const updated = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Company not found" });
    await recalculateGlobalStats();
    res.json(updated);
  } catch { res.status(400).json({ message: "Error updating company" }); }
});

router.delete("/companies/:id", authenticateAdmin, async (req, res) => {
  try {
    const deleted = await Company.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Company not found" });
    await Experience.deleteMany({ companyId: req.params.id });
    await recalculateGlobalStats();
    res.json({ message: "Company deleted successfully" });
  } catch { res.status(500).json({ message: "Error deleting company" }); }
});

// --- INTERVIEW EXPERIENCES ROUTES ---
router.get("/experiences", async (req, res) => {
  if (!isDatabaseReady()) return res.json([]);
  try {
    const approved = await Experience.find({ status: "approved" }).sort({ createdAt: -1 });
    res.json(approved);
  } catch { res.json([]); }
});

router.get("/experiences/admin", authenticateAdmin, async (req, res) => {
  if (!isDatabaseReady()) return res.json([]);
  try {
    const experiences = await Experience.find({}).sort({ createdAt: -1 });
    res.json(experiences);
  } catch { res.json([]); }
});

router.post("/experiences", async (req, res) => {
  try {
    let { companyName, companyId } = req.body;
    if (!companyId && companyName) {
      const comp = await Company.findOne({ name: { $regex: new RegExp(`^${companyName.trim()}$`, "i") } });
      if (comp) { companyId = comp._id; companyName = comp.name; }
    }
    const newExp = new Experience({ ...req.body, companyId, companyName, status: "pending" });
    await newExp.save();
    res.status(201).json(newExp);
  } catch (error) { res.status(400).json({ message: "Error submitting experience", error }); }
});

router.patch("/experiences/:id/status", authenticateAdmin, async (req, res) => {
  const { status } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }
  try {
    const updated = await Experience.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: "Experience not found" });
    res.json(updated);
  } catch { res.status(400).json({ message: "Error updating status" }); }
});

router.delete("/experiences/:id", authenticateAdmin, async (req, res) => {
  try {
    const deleted = await Experience.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Experience not found" });
    res.json({ message: "Experience deleted successfully" });
  } catch { res.status(500).json({ message: "Error deleting experience" }); }
});

// --- STATISTICS ROUTES ---
router.get("/statistics", async (req, res) => {
  if (!isDatabaseReady()) return res.json(getFallbackStatistics());
  try {
    let stats = await GlobalStats.findOne({});
    if (!stats) { await recalculateGlobalStats(); stats = await GlobalStats.findOne({}); }
    res.json(stats || getFallbackStatistics());
  } catch { res.json(getFallbackStatistics()); }
});

router.put("/statistics", authenticateAdmin, async (req, res) => {
  try {
    const { totalCompanies, totalPlaced, highestPackage, averagePackage } = req.body;
    let stats = await GlobalStats.findOne({});
    if (!stats) stats = new GlobalStats();
    if (totalCompanies !== undefined) stats.totalCompanies = totalCompanies;
    if (totalPlaced     !== undefined) stats.totalPlaced   = totalPlaced;
    if (highestPackage  !== undefined) stats.highestPackage = highestPackage;
    if (averagePackage  !== undefined) stats.averagePackage = averagePackage;
    await stats.save();
    res.json(stats);
  } catch { res.status(400).json({ message: "Error updating statistics" }); }
});

// --- EXCEL BULK IMPORTS ---
router.post("/admin/import-companies", authenticateAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Excel file is required" });
  try {
    const parsed = parseCompaniesExcel(req.file.buffer);
    if (parsed.length === 0) return res.status(400).json({ message: "No valid rows found in sheet" });

    let insertedCount = 0, updatedCount = 0;
    for (const compData of parsed) {
      const match = await Company.findOne({
        name: { $regex: new RegExp(`^${compData.name}$`, "i") },
        visitYear: compData.visitYear,
        role: { $regex: new RegExp(`^${compData.role}$`, "i") },
      });
      if (match) { await Company.findByIdAndUpdate(match._id, compData); updatedCount++; }
      else { await new Company(compData).save(); insertedCount++; }
    }
    await recalculateGlobalStats();
    res.json({ message: "Companies Excel imported successfully!", inserted: insertedCount, updated: updatedCount, totalProcessed: parsed.length });
  } catch (error) {
    console.error("Excel import error:", error);
    res.status(500).json({ message: "Failed to parse Excel file", error: error.message });
  }
});

router.post("/admin/import-stats", authenticateAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Excel file is required" });
  try {
    const parsed = parseStatsExcel(req.file.buffer);
    if (parsed.length === 0) return res.status(400).json({ message: "No valid statistics rows found" });

    let insertedCount = 0, updatedCount = 0;
    for (const statData of parsed) {
      const match = await YearlyStats.findOne({ year: statData.year });
      if (match) { await YearlyStats.findByIdAndUpdate(match._id, statData); updatedCount++; }
      else { await new YearlyStats(statData).save(); insertedCount++; }
    }
    await recalculateGlobalStats();
    res.json({ message: "Placement Statistics Excel imported successfully!", inserted: insertedCount, updated: updatedCount, totalProcessed: parsed.length });
  } catch (error) {
    console.error("Stats import error:", error);
    res.status(500).json({ message: "Failed to parse statistics Excel file", error: error.message });
  }
});

export default router;
