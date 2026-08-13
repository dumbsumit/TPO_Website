import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { Company, Experience, GlobalStats, Admin, YearlyStats } from "./models.js";
import { parseCompaniesExcel, parseStatsExcel } from "./excelHelper.js";

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
    if (parsed.length === 0) {
      return res.status(400).json({ message: "No valid statistics rows found" });
    }

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

// --- NEW PLACEMENT RECORDS ENDPOINTS ---

// 1. Bulk import placement records from Excel/CSV
router.post("/admin/import-placement-records", authenticateToken, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Excel/CSV file is required" });
  }
  try {
    const parsed = parsePlacementRecordsExcel(req.file.buffer);
    if (parsed.length === 0) {
      return res.status(400).json({ message: "No valid student placement rows found" });
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const recordData of parsed) {
      // Upsert check: match by PRN (case-insensitive)
      const match = await PlacementRecord.findOne({ 
        prn: { $regex: new RegExp(`^${recordData.prn}$`, "i") } 
      });

      if (match) {
        await PlacementRecord.findByIdAndUpdate(match._id, recordData);
        updatedCount++;
      } else {
        const newRecord = new PlacementRecord(recordData);
        await newRecord.save();
        insertedCount++;
      }
    }

    res.json({ 
      message: "Student placement records Excel imported successfully!", 
      inserted: insertedCount, 
      updated: updatedCount,
      totalProcessed: parsed.length
    });
  } catch (error) {
    console.error("Student records import error:", error);
    res.status(500).json({ message: "Failed to parse student records file", error: error.message });
  }
});

// 2. Fetch paginated, filterable, and searchable list of placement records
router.get("/admin/placement-records", authenticateToken, async (req, res) => {
  try {
    const { search, branch, gender, placementStatus, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { prn: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { company1: searchRegex },
        { company2: searchRegex },
        { internshipCompany: searchRegex }
      ];
    }

    if (branch) {
      query.branch = { $regex: new RegExp(`^${branch.trim()}$`, "i") };
    }

    if (gender) {
      query.gender = { $regex: new RegExp(`^${gender.trim()}$`, "i") };
    }

    if (placementStatus) {
      query.placementStatus = { $regex: new RegExp(`^${placementStatus.trim()}$`, "i") };
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skipNum = (pageNum - 1) * limitNum;

    const records = await PlacementRecord.find(query)
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum);

    const total = await PlacementRecord.countDocuments(query);

    const uniqueBranches = await PlacementRecord.distinct("branch");
    const uniqueStatuses = await PlacementRecord.distinct("placementStatus");
    const uniqueGenders = await PlacementRecord.distinct("gender");

    res.json({
      records,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      filters: {
        branches: uniqueBranches.filter(Boolean).sort(),
        statuses: uniqueStatuses.filter(Boolean).sort(),
        genders: uniqueGenders.filter(Boolean).sort()
      }
    });
  } catch (error) {
    console.error("Error fetching student placement records:", error);
    res.status(500).json({ message: "Error fetching records" });
  }
});

// 3. Aggregate student analytics for KPIs and Charts
router.get("/admin/placement-records-analytics", authenticateToken, async (req, res) => {
  try {
    const totalStudents = await PlacementRecord.countDocuments({});
    
    // Placed logic: status matches Placed or has company
    const placedStudents = await PlacementRecord.countDocuments({
      placementStatus: { $regex: /Placed/i }
    });
    const unplacedStudents = totalStudents - placedStudents;
    const placementRate = totalStudents > 0 ? Number(((placedStudents / totalStudents) * 100).toFixed(2)) : 0;

    // Packages metrics (for placed students)
    const placedWithSalary = await PlacementRecord.find({
      $or: [
        { salary1: { $gt: 0 } },
        { salary2: { $gt: 0 } }
      ]
    });

    let highestPackage = 0;
    let sumPackage = 0;
    let salaryCount = 0;

    placedWithSalary.forEach(r => {
      const p1 = r.salary1 || 0;
      const p2 = r.salary2 || 0;
      const maxVal = Math.max(p1, p2);
      if (maxVal > highestPackage) highestPackage = maxVal;
      if (maxVal > 0) {
        sumPackage += maxVal;
        salaryCount++;
      }
    });

    const averagePackage = salaryCount > 0 ? Number((sumPackage / salaryCount).toFixed(2)) : 0;

    // Internship Stats
    const internshipCount = await PlacementRecord.countDocuments({
      internshipOffered: { $regex: /Yes/i }
    });
    const internshipWithStipend = await PlacementRecord.find({
      stipend: { $gt: 0 }
    });
    const avgStipend = internshipWithStipend.length > 0 
      ? Number((internshipWithStipend.reduce((acc, curr) => acc + (curr.stipend || 0), 0) / internshipWithStipend.length).toFixed(2))
      : 0;

    // Branch Breakdown
    const branchBreakdown = await PlacementRecord.aggregate([
      {
        $group: {
          _id: "$branch",
          total: { $sum: 1 },
          placed: {
            $sum: {
              $cond: [
                { $regexMatch: { input: "$placementStatus", regex: /Placed/i } },
                1,
                0
              ]
            }
          },
          packages: {
            $push: {
              $cond: [
                {
                  $gt: [
                    { $cond: [{ $gt: ["$salary1", "$salary2"] }, "$salary1", "$salary2"] },
                    0
                  ]
                },
                { $cond: [{ $gt: ["$salary1", "$salary2"] }, "$salary1", "$salary2"] },
                "$$REMOVE"
              ]
            }
          }
        }
      },
      {
        $project: {
          branch: "$_id",
          total: 1,
          placed: 1,
          unplaced: { $subtract: ["$total", "$placed"] },
          avgPackage: {
            $cond: [
              { $gt: [{ $size: "$packages" }, 0] },
              { $round: [{ $avg: "$packages" }, 2] },
              0
            ]
          },
          highestPackage: {
            $cond: [
              { $gt: [{ $size: "$packages" }, 0] },
              { $max: "$packages" },
              0
            ]
          }
        }
      },
      { $sort: { branch: 1 } }
    ]);

    // Package Distribution categories
    let distUnder5 = 0;
    let dist5to10 = 0;
    let dist10to15 = 0;
    let distOver15 = 0;

    placedWithSalary.forEach(r => {
      const maxVal = Math.max(r.salary1 || 0, r.salary2 || 0);
      if (maxVal > 0 && maxVal < 5) distUnder5++;
      else if (maxVal >= 5 && maxVal < 10) dist5to10++;
      else if (maxVal >= 10 && maxVal < 15) dist10to15++;
      else if (maxVal >= 15) distOver15++;
    });

    // Gender breakdown
    const genderBreakdown = await PlacementRecord.aggregate([
      {
        $group: {
          _id: "$gender",
          total: { $sum: 1 },
          placed: {
            $sum: {
              $cond: [
                { $regexMatch: { input: "$placementStatus", regex: /Placed/i } },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          gender: "$_id",
          total: 1,
          placed: 1,
          unplaced: { $subtract: ["$total", "$placed"] }
        }
      }
    ]);

    res.json({
      kpis: {
        totalStudents,
        placedStudents,
        unplacedStudents,
        placementRate,
        highestPackage,
        averagePackage,
        internshipCount,
        avgStipend
      },
      branchBreakdown,
      packageDistribution: [
        { range: "< 5 LPA", count: distUnder5 },
        { range: "5 - 10 LPA", count: dist5to10 },
        { range: "10 - 15 LPA", count: dist10to15 },
        { range: "> 15 LPA", count: distOver15 }
      ],
      genderBreakdown
    });
  } catch (error) {
    console.error("Error generating placement analytics:", error);
    res.status(500).json({ message: "Error generating analytics dashboard data" });
  }
});

// 4. Bulk clear all student placement records
router.delete("/admin/placement-records", authenticateToken, async (req, res) => {
  try {
    await PlacementRecord.deleteMany({});
    res.json({ message: "All student placement records cleared successfully!" });
  } catch (error) {
    console.error("Error clearing placement records:", error);
    res.status(500).json({ message: "Failed to clear records" });
  }
});

// 5. Delete individual student record
router.delete("/admin/placement-records/:id", authenticateToken, async (req, res) => {
  try {
    const deleted = await PlacementRecord.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.json({ message: "Student record deleted successfully!" });
  } catch (error) {
    console.error("Error deleting individual student record:", error);
    res.status(500).json({ message: "Failed to delete student record" });
  }
});

// 6. Update individual student record
router.put("/admin/placement-records/:id", authenticateToken, async (req, res) => {
  try {
    const updated = await PlacementRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "Failed to update student record", error: error.message });
  }
});

// --- EXCEL IMPORT FOR DETAILED PLACEMENT DATA ---
router.post("/admin/import-placement-excel", authenticateToken, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Excel/CSV file is required" });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      return res.status(400).json({ message: "The uploaded sheet is empty." });
    }

    // Cross-check if the file looks like yearly statistics instead of student records
    if (rows.length > 0) {
      const firstRowKeys = Object.keys(rows[0]).map(k => k.trim().toLowerCase());
      if (firstRowKeys.includes("year") && !firstRowKeys.includes("prn") && !firstRowKeys.includes("first name")) {
        return res.status(400).json({ 
          message: "This file appears to contain Yearly Placement Statistics. Please upload it in the 'Bulk Import Yearly Placements Stats Summary' section above instead." 
        });
      }
    }

    let totalRows = rows.length;
    let successfullyImported = 0; // brand new student records created
    let updatedRecords = 0;       // existing student records updated
    let skippedRecords = 0;       // exact matches where no changes occurred
    let failedRecords = 0;        // rows that failed validation
    let duplicateRecords = 0;     // duplicate PRNs in the same file
    const failedRows = [];        // detail: { rowNumber, field, errorReason }

    const seenPrns = new Set();   // to identify duplicate PRNs in the same file

    // Helper to normalize keys of rows
    const normalizeKeys = (row) => {
      const normalized = {};
      for (const key of Object.keys(row)) {
        const cleanKey = key.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
        normalized[cleanKey] = row[key];
      }
      return normalized;
    };

    const getVal = (row, normRow, keysList) => {
      for (const key of keysList) {
        if (row[key] !== undefined && row[key] !== "") return row[key];
        const cleanKey = key.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
        if (normRow[cleanKey] !== undefined && normRow[cleanKey] !== "") return normRow[cleanKey];
      }
      return "";
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // Excel row index + 2 (header is row 1)
      const norm = normalizeKeys(row);

      // Extract conceptual fields
      const prnRaw = getVal(row, norm, ["PRN", "Roll No", "Roll Number", "prn"]);
      const firstName = getVal(row, norm, ["First Name", "FirstName", "firstname"]);
      const middleName = getVal(row, norm, ["Middle Name", "MiddleName", "middlename"]);
      const lastName = getVal(row, norm, ["Last Name", "LastName", "lastname"]);
      const branch = getVal(row, norm, ["Branch", "branch"]);
      const gender = getVal(row, norm, ["Gender", "gender"]);
      
      const company1Name = getVal(row, norm, ["Company 1", "Company1", "company1"]);
      const salary1Raw = getVal(row, norm, ["Salary (LPA)", "Salary1", "salary1", "salarylpa"]);
      const company2Name = getVal(row, norm, ["Company 2", "Company2", "company2"]);
      const salary2Raw = getVal(row, norm, ["Salary (LPA)_1", "Salary2", "salary2", "salarylpa1"]);
      
      const internshipOffered = getVal(row, norm, ["Internship Offered", "InternshipOffered", "internshipoffered", "internship"]);
      const internshipCompany = getVal(row, norm, ["Internship Company", "InternshipCompany", "internshipcompany"]);
      const internshipStartDateRaw = getVal(row, norm, ["Internship Start Date", "InternshipStartDate", "internshipstartdate"]);
      const internshipEndDateRaw = getVal(row, norm, ["Internship End Date", "InternshipEndDate", "internshipenddate"]);
      const stipendRaw = getVal(row, norm, ["Stipend", "stipend"]);
      
      const personalMail = getVal(row, norm, ["Personal Mail", "PersonalMail", "personalmail"]);
      const collegeMail = getVal(row, norm, ["College Mail", "CollegeMail", "collegemail"]);
      const phoneNo = getVal(row, norm, ["Phone No", "PhoneNo", "phoneno", "phone"]);
      const placementStatus = getVal(row, norm, ["Placement Status", "PlacementStatus", "placementstatus"]);

      // 1. Required fields validations
      const prn = String(prnRaw).trim();
      if (!prn) {
        failedRecords++;
        failedRows.push({ rowNumber, field: "PRN", errorReason: "PRN is required and cannot be empty" });
        continue;
      }

      const fName = String(firstName).trim();
      const lName = String(lastName).trim();
      const sBranch = String(branch).trim();
      const sGender = String(gender).trim();

      if (!fName || !lName || !sBranch || !sGender) {
        failedRecords++;
        const missing = [];
        if (!fName) missing.push("First Name");
        if (!lName) missing.push("Last Name");
        if (!sBranch) missing.push("Branch");
        if (!sGender) missing.push("Gender");
        failedRows.push({ rowNumber, field: "Student Info", errorReason: `Missing required field(s): ${missing.join(", ")}` });
        continue;
      }

      // 2. Validate numeric values
      let salary1 = undefined;
      if (salary1Raw !== undefined && salary1Raw !== "") {
        const num = Number(salary1Raw);
        if (isNaN(num)) {
          failedRecords++;
          failedRows.push({ rowNumber, field: "Salary (LPA)", errorReason: `Invalid salary package for Company 1: '${salary1Raw}' is not a valid number` });
          continue;
        }
        salary1 = num;
      }

      let salary2 = undefined;
      if (salary2Raw !== undefined && salary2Raw !== "") {
        const num = Number(salary2Raw);
        if (isNaN(num)) {
          failedRecords++;
          failedRows.push({ rowNumber, field: "Salary (LPA)_1", errorReason: `Invalid salary package for Company 2: '${salary2Raw}' is not a valid number` });
          continue;
        }
        salary2 = num;
      }

      let stipend = undefined;
      if (stipendRaw !== undefined && stipendRaw !== "") {
        const num = Number(stipendRaw);
        if (isNaN(num)) {
          failedRecords++;
          failedRows.push({ rowNumber, field: "Stipend", errorReason: `Invalid stipend value: '${stipendRaw}' is not a valid number` });
          continue;
        }
        stipend = num;
      }

      // 3. Validate Date values
      const parseDateValue = (val) => {
        if (!val) return null;
        if (typeof val === "number") {
          return new Date((val - 25569) * 86400 * 1000);
        }
        const d = new Date(val);
        return isNaN(d.getTime()) ? "INVALID" : d;
      };

      let internshipStartDate = null;
      if (internshipStartDateRaw !== "") {
        const resDate = parseDateValue(internshipStartDateRaw);
        if (resDate === "INVALID") {
          failedRecords++;
          failedRows.push({ rowNumber, field: "Internship Start Date", errorReason: `Invalid date format: '${internshipStartDateRaw}'` });
          continue;
        }
        internshipStartDate = resDate;
      }

      let internshipEndDate = null;
      if (internshipEndDateRaw !== "") {
        const resDate = parseDateValue(internshipEndDateRaw);
        if (resDate === "INVALID") {
          failedRecords++;
          failedRows.push({ rowNumber, field: "Internship End Date", errorReason: `Invalid date format: '${internshipEndDateRaw}'` });
          continue;
        }
        internshipEndDate = resDate;
      }

      // 4. Duplicate checks in the same spreadsheet
      if (seenPrns.has(prn)) {
        duplicateRecords++;
        failedRows.push({ rowNumber, field: "PRN", errorReason: `Duplicate PRN '${prn}' found within the same uploaded Excel file` });
        continue;
      }
      seenPrns.add(prn);

      // 5. Save/Ingest Entities
      try {
        const fullName = `${fName} ${String(middleName).trim() ? String(middleName).trim() + " " : ""}${lName}`.trim();
        
        let student = await PlacedStudent.findOne({ prn });
        let isNewStudent = false;

        if (!student) {
          student = new PlacedStudent({
            prn,
            name: fullName,
            branch: sBranch,
            gender: sGender,
            personalEmail: String(personalMail).trim(),
            collegeEmail: String(collegeMail).trim(),
            phone: String(phoneNo).trim()
          });
          isNewStudent = true;
        } else {
          // Update existing student details non-destructively
          student.name = fullName;
          student.branch = sBranch;
          student.gender = sGender;
          if (personalMail) student.personalEmail = String(personalMail).trim();
          if (collegeMail) student.collegeEmail = String(collegeMail).trim();
          if (phoneNo) student.phone = String(phoneNo).trim();
        }

        await student.save();

        if (isNewStudent) {
          successfullyImported++;
        } else {
          updatedRecords++;
        }

        // Helper to find or create Company record
        const getOrCreateCompanyObj = async (nameVal, packageVal) => {
          if (!nameVal) return null;
          const cleanName = String(nameVal).trim();
          let comp = await Company.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, "i") } });
          if (!comp) {
            comp = new Company({
              name: cleanName,
              visitYear: 2025,
              role: "Software Engineer",
              package: packageVal !== undefined ? packageVal : 0,
              selectedCount: 1,
              eligibility: "Imported via Excel",
              technologies: [],
              hiringProcess: "Imported via Excel"
            });
            await comp.save();
          }
          return comp;
        };

        // Map Company 1 as PRIMARY offer
        if (company1Name) {
          const comp1 = await getOrCreateCompanyObj(company1Name, salary1);
          if (comp1) {
            // Find or create PRIMARY offer
            await PlacementOffer.findOneAndUpdate(
              { studentId: student._id, companyId: comp1._id, offerType: "PRIMARY" },
              {
                packageLpa: salary1,
                placementStatus: placementStatus || "Placed",
                offerDate: new Date()
              },
              { upsert: true }
            );
          }
        }

        // Map Company 2 as SECONDARY offer
        if (company2Name) {
          const comp2 = await getOrCreateCompanyObj(company2Name, salary2);
          if (comp2) {
            // Find or create SECONDARY offer
            await PlacementOffer.findOneAndUpdate(
              { studentId: student._id, companyId: comp2._id, offerType: "SECONDARY" },
              {
                packageLpa: salary2,
                placementStatus: placementStatus || "Placed",
                offerDate: new Date()
              },
              { upsert: true }
            );
          }
        }

        // Store Internship info separately
        const isInternshipOffered = String(internshipOffered).trim().toLowerCase() === "yes";
        const intCompName = String(internshipCompany).trim() || String(company1Name).trim();
        
        if (isInternshipOffered && intCompName) {
          const intComp = await getOrCreateCompanyObj(intCompName, 0);
          if (intComp) {
            await Internship.findOneAndUpdate(
              { studentId: student._id, companyId: intComp._id },
              {
                startDate: internshipStartDate,
                endDate: internshipEndDate,
                stipend: stipend,
                ppo: "No",
                status: "Active"
              },
              { upsert: true }
            );
          }
        }
      } catch (err) {
        console.error(`Error saving student row ${rowNumber}:`, err);
        failedRecords++;
        failedRows.push({ rowNumber, field: "Database Save", errorReason: err.message || "Failed to save record to DB" });
      }
    }

    res.json({
      summary: {
        totalRows,
        successfullyImported,
        updatedRecords,
        skippedRecords,
        failedRecords,
        duplicateRecords,
        invalidRecords: failedRecords
      },
      failedRows
    });

  } catch (error) {
    console.error("Excel import processing error:", error);
    res.status(500).json({ message: "Failed to process Excel import", error: error.message });
  }
});

// --- STATISTICS & ANALYTICS HELPER FUNCTIONS ---
const calculateMedianVal = (arr) => {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

// 1. Dashboard Summary API
router.get("/admin/dashboard-summary", authenticateToken, async (req, res) => {
  try {
    const totalStudents = await PlacedStudent.countDocuments({});
    
    // Find distinct studentIds who have offers
    const placedStudentIds = await PlacementOffer.distinct("studentId");
    const placedStudents = placedStudentIds.length;
    
    const placementPercentage = totalStudents > 0 ? parseFloat(((placedStudents / totalStudents) * 100).toFixed(2)) : 0;
    
    const totalCompanies = await Company.countDocuments({});
    
    const offers = await PlacementOffer.find({ packageLpa: { $ne: null, $exists: true } });
    const packages = offers.map(o => o.packageLpa).filter(p => typeof p === "number");
    
    const averagePackage = packages.length > 0 ? parseFloat((packages.reduce((sum, p) => sum + p, 0) / packages.length).toFixed(2)) : 0;
    const medianPackage = parseFloat((calculateMedianVal(packages)).toFixed(2));
    const highestPackage = packages.length > 0 ? parseFloat(Math.max(...packages).toFixed(2)) : 0;
    const lowestPackage = packages.length > 0 ? parseFloat(Math.min(...packages).toFixed(2)) : 0;
    
    const internshipCount = await Internship.countDocuments({});
    const ppoCount = await Internship.countDocuments({ ppo: "Yes" });
    const internshipPpoCount = await Internship.countDocuments({ ppo: "Yes" }); // internship + PPO
    
    // Students with multiple offers
    const multipleOffersAgg = await PlacementOffer.aggregate([
      { $group: { _id: "$studentId", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    const studentsWithMultipleOffers = multipleOffersAgg.length;
    
    res.json({
      totalStudents,
      placedStudents,
      placementPercentage,
      totalCompanies,
      averagePackage,
      medianPackage,
      highestPackage,
      lowestPackage,
      internshipCount,
      ppoCount,
      internshipPpoCount,
      studentsWithMultipleOffers
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ message: "Failed to fetch dashboard summary", error: error.message });
  }
});

// 2. Student Placement List API (Paginated, Searchable, Filterable)
router.get("/admin/students", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const branch = req.query.branch || "";
    const gender = req.query.gender || "";

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { prn: { $regex: search, $options: "i" } }
      ];
    }
    if (branch) query.branch = branch;
    if (gender) query.gender = gender;

    const skip = (page - 1) * limit;
    const total = await PlacedStudent.countDocuments(query);
    const students = await PlacedStudent.find(query).skip(skip).limit(limit).lean();

    const populatedStudents = [];
    for (const s of students) {
      const offers = await PlacementOffer.find({ studentId: s._id }).populate("companyId").lean();
      const internships = await Internship.find({ studentId: s._id }).populate("companyId").lean();

      populatedStudents.push({
        ...s,
        offers: offers.map(o => ({
          offerId: o._id,
          companyName: o.companyId?.name || "",
          packageLpa: o.packageLpa,
          offerType: o.offerType,
          placementStatus: o.placementStatus,
          offerDate: o.offerDate
        })),
        internships: internships.map(i => ({
          internshipId: i._id,
          companyName: i.companyId?.name || "",
          startDate: i.startDate,
          endDate: i.endDate,
          stipend: i.stipend,
          ppo: i.ppo,
          status: i.status
        }))
      });
    }

    res.json({
      total,
      page,
      pages: Math.ceil(total / limit),
      students: populatedStudents
    });
  } catch (error) {
    console.error("Error fetching students list:", error);
    res.status(500).json({ message: "Failed to fetch students list", error: error.message });
  }
});

// 3. Student Details API
router.get("/admin/students/:id", authenticateToken, async (req, res) => {
  try {
    const student = await PlacedStudent.findById(req.params.id).lean();
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    const offers = await PlacementOffer.find({ studentId: student._id }).populate("companyId").lean();
    const internships = await Internship.find({ studentId: student._id }).populate("companyId").lean();

    res.json({
      ...student,
      offers: offers.map(o => ({
        offerId: o._id,
        companyName: o.companyId?.name || "",
        packageLpa: o.packageLpa,
        offerType: o.offerType,
        placementStatus: o.placementStatus,
        offerDate: o.offerDate
      })),
      internships: internships.map(i => ({
        internshipId: i._id,
        companyName: i.companyId?.name || "",
        startDate: i.startDate,
        endDate: i.endDate,
        stipend: i.stipend,
        ppo: i.ppo,
        status: i.status
      }))
    });
  } catch (error) {
    console.error("Error fetching student details:", error);
    res.status(500).json({ message: "Failed to fetch student details", error: error.message });
  }
});

// 4. Update Student Details API (with associated Offers/Internships)
router.put("/admin/students/:id", authenticateToken, async (req, res) => {
  try {
    const { name, branch, gender, personalEmail, collegeEmail, phone, offers, internships } = req.body;

    const student = await PlacedStudent.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.name = name || student.name;
    student.branch = branch || student.branch;
    student.gender = gender || student.gender;
    if (personalEmail !== undefined) student.personalEmail = personalEmail;
    if (collegeEmail !== undefined) student.collegeEmail = collegeEmail;
    if (phone !== undefined) student.phone = phone;
    await student.save();

    const getOrCreateCompanyObj = async (nameVal, packageVal) => {
      if (!nameVal) return null;
      const cleanName = String(nameVal).trim();
      let comp = await Company.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, "i") } });
      if (!comp) {
        comp = new Company({
          name: cleanName,
          visitYear: 2025,
          role: "Software Engineer",
          package: packageVal !== undefined ? packageVal : 0,
          selectedCount: 1,
          eligibility: "Created via update",
          technologies: [],
          hiringProcess: "Created via update"
        });
        await comp.save();
      }
      return comp;
    };

    // Update Placement Offers
    if (offers && Array.isArray(offers)) {
      await PlacementOffer.deleteMany({ studentId: student._id });
      for (const off of offers) {
        if (off.companyName) {
          const comp = await getOrCreateCompanyObj(off.companyName, off.packageLpa);
          if (comp) {
            const newOffer = new PlacementOffer({
              studentId: student._id,
              companyId: comp._id,
              packageLpa: off.packageLpa !== undefined && off.packageLpa !== "" ? Number(off.packageLpa) : undefined,
              offerType: off.offerType || "PRIMARY",
              placementStatus: off.placementStatus || "Placed"
            });
            await newOffer.save();
          }
        }
      }
    }

    // Update Internships
    if (internships && Array.isArray(internships)) {
      await Internship.deleteMany({ studentId: student._id });
      for (const intern of internships) {
        if (intern.companyName) {
          const comp = await getOrCreateCompanyObj(intern.companyName, 0);
          if (comp) {
            const newIntern = new Internship({
              studentId: student._id,
              companyId: comp._id,
              startDate: intern.startDate || null,
              endDate: intern.endDate || null,
              stipend: intern.stipend !== undefined && intern.stipend !== "" ? Number(intern.stipend) : undefined,
              ppo: intern.ppo || "No",
              status: intern.status || "Active"
            });
            await newIntern.save();
          }
        }
      }
    }

    res.json({ message: "Student record updated successfully", student });
  } catch (error) {
    console.error("Error updating student record:", error);
    res.status(500).json({ message: "Failed to update student record", error: error.message });
  }
});

// 5. Delete Student API (with associated Offers/Internships)
router.delete("/admin/students/:id", authenticateToken, async (req, res) => {
  try {
    const student = await PlacedStudent.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    await PlacementOffer.deleteMany({ studentId: student._id });
    await Internship.deleteMany({ studentId: student._id });

    res.json({ message: "Student and associated placement/internship records deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ message: "Failed to delete student record", error: error.message });
  }
});

// 6. Company-wise Statistics API
router.get("/admin/companies-stats", authenticateToken, async (req, res) => {
  try {
    const companies = await Company.find({});
    const stats = [];

    for (const comp of companies) {
      const offers = await PlacementOffer.find({ companyId: comp._id });
      const internships = await Internship.find({ companyId: comp._id });

      const studentIds = [...new Set(offers.map(o => String(o.studentId)))];
      const numStudents = studentIds.length;

      const packages = offers
        .map(o => o.packageLpa)
        .filter(p => p !== null && p !== undefined && typeof p === "number");

      const avgPackage = packages.length > 0 ? (packages.reduce((a, b) => a + b, 0) / packages.length) : 0;
      const medianPackage = calculateMedianVal(packages) || 0;
      const highestPackage = packages.length > 0 ? Math.max(...packages) : 0;
      const lowestPackage = packages.length > 0 ? Math.min(...packages) : 0;

      const internshipCount = internships.length;
      const ppoCount = internships.filter(i => i.ppo === "Yes").length;

      stats.push({
        companyId: comp._id,
        companyName: comp.name,
        industry: comp.industry || "",
        location: comp.location || "",
        numberStudents: numStudents,
        averagePackage: parseFloat(avgPackage.toFixed(2)),
        medianPackage: parseFloat(medianPackage.toFixed(2)),
        highestPackage: parseFloat(highestPackage.toFixed(2)),
        lowestPackage: parseFloat(lowestPackage.toFixed(2)),
        internshipCount,
        ppoCount
      });
    }

    res.json(stats);
  } catch (error) {
    console.error("Error fetching company stats:", error);
    res.status(500).json({ message: "Failed to fetch company statistics", error: error.message });
  }
});

// 7. Branch-wise Statistics API
router.get("/admin/branches-stats", authenticateToken, async (req, res) => {
  try {
    const students = await PlacedStudent.find({});
    const branches = [...new Set(students.map(s => s.branch))];

    const stats = [];
    for (const branch of branches) {
      const branchStudents = students.filter(s => s.branch === branch);
      const totalStudentsCount = branchStudents.length;

      const branchStudentIds = branchStudents.map(s => s._id);
      const branchOffers = await PlacementOffer.find({ studentId: { $in: branchStudentIds } });
      
      const placedStudentIds = [...new Set(branchOffers.map(o => String(o.studentId)))];
      const placedCount = placedStudentIds.length;
      
      const placementRate = totalStudentsCount > 0 ? (placedCount / totalStudentsCount) * 100 : 0;

      const packages = branchOffers
        .map(o => o.packageLpa)
        .filter(p => p !== null && p !== undefined && typeof p === "number");

      const avgPackage = packages.length > 0 ? (packages.reduce((a, b) => a + b, 0) / packages.length) : 0;
      const medianPackage = calculateMedianVal(packages) || 0;
      const highestPackage = packages.length > 0 ? Math.max(...packages) : 0;

      stats.push({
        branch,
        totalStudents: totalStudentsCount,
        placedStudents: placedCount,
        placementPercentage: parseFloat(placementRate.toFixed(2)),
        averagePackage: parseFloat(avgPackage.toFixed(2)),
        medianPackage: parseFloat(medianPackage.toFixed(2)),
        highestPackage: parseFloat(highestPackage.toFixed(2))
      });
    }

    res.json(stats);
  } catch (error) {
    console.error("Error fetching branch stats:", error);
    res.status(500).json({ message: "Failed to fetch branch statistics", error: error.message });
  }
});

// 8. Package Statistics API
router.get("/admin/packages-stats", authenticateToken, async (req, res) => {
  try {
    const offers = await PlacementOffer.find({});
    const packages = offers
      .map(o => o.packageLpa)
      .filter(p => p !== null && p !== undefined && typeof p === "number");

    let distUnder5 = 0;
    let dist5to10 = 0;
    let dist10to15 = 0;
    let distOver15 = 0;

    for (const pkg of packages) {
      if (pkg < 5) distUnder5++;
      else if (pkg >= 5 && pkg < 10) dist5to10++;
      else if (pkg >= 10 && pkg < 15) dist10to15++;
      else distOver15++;
    }

    const avgPackage = packages.length > 0 ? (packages.reduce((a, b) => a + b, 0) / packages.length) : 0;
    const medianPackage = calculateMedianVal(packages) || 0;
    const highestPackage = packages.length > 0 ? Math.max(...packages) : 0;
    const lowestPackage = packages.length > 0 ? Math.min(...packages) : 0;

    res.json({
      average: parseFloat(avgPackage.toFixed(2)),
      median: parseFloat(medianPackage.toFixed(2)),
      highest: parseFloat(highestPackage.toFixed(2)),
      lowest: parseFloat(lowestPackage.toFixed(2)),
      packageDistribution: [
        { range: "< 5 LPA", count: distUnder5 },
        { range: "5 - 10 LPA", count: dist5to10 },
        { range: "10 - 15 LPA", count: dist10to15 },
        { range: "> 15 LPA", count: distOver15 }
      ]
    });
  } catch (error) {
    console.error("Error fetching package stats:", error);
    res.status(500).json({ message: "Failed to fetch package statistics", error: error.message });
  }
});

// 9. Internship Statistics API
router.get("/admin/internships-stats", authenticateToken, async (req, res) => {
  try {
    const internships = await Internship.find({}).populate("studentId");
    
    const totalInternships = internships.length;
    const ppoCount = internships.filter(i => i.ppo === "Yes").length;
    
    const stipends = internships
      .map(i => i.stipend)
      .filter(s => s !== null && s !== undefined && typeof s === "number");
      
    const averageStipend = stipends.length > 0 ? (stipends.reduce((a, b) => a + b, 0) / stipends.length) : 0;
    const medianStipend = calculateMedianVal(stipends) || 0;

    // Branch-wise internship count
    const branchCounts = {};
    for (const intern of internships) {
      const branchName = intern.studentId?.branch || "Unknown";
      branchCounts[branchName] = (branchCounts[branchName] || 0) + 1;
    }
    
    const branchDistribution = Object.keys(branchCounts).map(branch => ({
      branch,
      count: branchCounts[branch]
    }));

    res.json({
      totalInternships,
      ppoCount,
      averageStipend: parseFloat(averageStipend.toFixed(2)),
      medianStipend: parseFloat(medianStipend.toFixed(2)),
      branchDistribution
    });
  } catch (error) {
    console.error("Error fetching internship stats:", error);
    res.status(500).json({ message: "Failed to fetch internship statistics", error: error.message });
  }
});

// 10. Multiple-Offer Statistics API
router.get("/admin/multiple-offers-stats", authenticateToken, async (req, res) => {
  try {
    const multipleOffersAgg = await PlacementOffer.aggregate([
      { $group: { _id: "$studentId", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    const studentIds = multipleOffersAgg.map(item => item._id);
    const studentsList = [];

    for (const sId of studentIds) {
      const studentObj = await PlacedStudent.findById(sId).lean();
      if (studentObj) {
        const offers = await PlacementOffer.find({ studentId: sId }).populate("companyId").lean();
        studentsList.push({
          ...studentObj,
          offers: offers.map(o => ({
            companyName: o.companyId?.name || "",
            packageLpa: o.packageLpa,
            offerType: o.offerType
          }))
        });
      }
    }

    res.json({
      totalStudentsWithMultipleOffers: studentsList.length,
      students: studentsList
    });
  } catch (error) {
    console.error("Error fetching multiple offers stats:", error);
    res.status(500).json({ message: "Failed to fetch multiple offers statistics", error: error.message });
  }
});

// 11. Excel Export API
router.get("/admin/export-placement-excel", authenticateToken, async (req, res) => {
  try {
    const students = await PlacedStudent.find({}).lean();
    const rows = [];

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const offers = await PlacementOffer.find({ studentId: s._id }).populate("companyId").lean();
      const internships = await Internship.find({ studentId: s._id }).populate("companyId").lean();

      const primaryOffer = offers.find(o => o.offerType === "PRIMARY");
      const secondaryOffer = offers.find(o => o.offerType === "SECONDARY");
      const internship = internships[0];

      const nameParts = s.name.split(" ");
      const firstName = nameParts[0] || "";
      const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

      rows.push({
        "Sr No": i + 1,
        "PRN": s.prn,
        "Branch": s.branch,
        "First Name": firstName,
        "Middle Name": middleName,
        "Last Name": lastName,
        "Gender": s.gender,
        "Company 1": primaryOffer?.companyId?.name || "",
        "Salary (LPA)": primaryOffer?.packageLpa !== undefined ? primaryOffer.packageLpa : "",
        "Company 2": secondaryOffer?.companyId?.name || "",
        "Salary (LPA)_1": secondaryOffer?.packageLpa !== undefined ? secondaryOffer.packageLpa : "",
        "Internship Offered": internship ? "Yes" : "No",
        "Internship Company": internship?.companyId?.name || "",
        "Internship Start Date": internship?.startDate ? internship.startDate.toISOString().split('T')[0] : "",
        "Internship End Date": internship?.endDate ? internship.endDate.toISOString().split('T')[0] : "",
        "Stipend": internship?.stipend !== undefined ? internship.stipend : "",
        "Personal Mail": s.personalEmail || "",
        "College Mail": s.collegeEmail || "",
        "Phone No": s.phone || "",
        "Placement Status": primaryOffer ? "Placed" : "Unplaced"
      });
    }

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Placement Data");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=placement_data_export.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting placement Excel:", error);
    res.status(500).json({ message: "Failed to export Excel file", error: error.message });
  }
});

export default router;

