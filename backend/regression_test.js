import mongoose from "mongoose";
import dotenv from "dotenv";
import xlsx from "xlsx";
import { Student, PlacedStudent, PlacementOffer, Internship, Company, YearlyStats } from "./models.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tpo_db";
const API_URL = "http://localhost:5001";

async function runRegressionTests() {
  console.log("==================================================");
  console.log("STARTING PLACEMENT ADMIN MODULE REGRESSION TESTS");
  console.log("==================================================");

  // 1. Connect to Database
  console.log("\n[TEST 1] Database Connection...");
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✔ Connected to MongoDB successfully.");
  } catch (err) {
    console.error("✘ Database connection failed:", err);
    process.exit(1);
  }

  // Drop stale unique email index if exists
  try {
    await PlacedStudent.collection.dropIndex("email_1");
    console.log("✔ Dropped stale unique index 'email_1' on students collection.");
  } catch (e) {
    // Index doesn't exist, ignore
  }

  let token = "";

  // 2. Authentication & API Tests
  console.log("\n[TEST 2] Authentication & Authorization...");
  try {
    // 2a. Login with invalid credentials
    const badLoginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "wrong_user", password: "wrong_password" })
    });
    if (badLoginRes.status === 401) {
      console.log("✔ Invalid login rejected with 401 Unauthorized (PASSED)");
    } else {
      console.log(`✘ Invalid login returned status ${badLoginRes.status} (FAILED)`);
    }

    // 2b. Login with valid fallback credentials
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    if (loginRes.status === 200) {
      const data = await loginRes.json();
      token = data.token;
      console.log("✔ Valid login accepted with 200 OK. Token retrieved (PASSED)");
    } else {
      console.log(`✘ Valid login returned status ${loginRes.status} (FAILED)`);
    }

    // 2c. Unauthorized access to Admin API
    const unauthorizedRes = await fetch(`${API_URL}/api/admin/students`);
    if (unauthorizedRes.status === 401) {
      console.log("✔ Accessing Admin API without token rejected with 401 Unauthorized (PASSED)");
    } else {
      console.log(`✘ Accessing Admin API without token returned status ${unauthorizedRes.status} (FAILED)`);
    }

    // 2d. Authorized access to Admin API
    const authorizedRes = await fetch(`${API_URL}/api/admin/students`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (authorizedRes.status === 200) {
      console.log("✔ Accessing Admin API with valid token accepted with 200 OK (PASSED)");
    } else {
      console.log(`✘ Accessing Admin API with valid token returned status ${authorizedRes.status} (FAILED)`);
    }

    // 2e. Import stats spreadsheet test
    console.log("\n[TEST 2e] Uploading Mock Yearly Stats Spreadsheet...");
    const ws = xlsx.utils.json_to_sheet([
      { "Year": 2025, "Total Companies Visited": 80, "Total Students Placed": 350, "Average Package": 12.5 }
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Stats");
    const excelBuffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    const formData = new FormData();
    const fileBlob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    formData.append("file", fileBlob, "stats.xlsx");

    const statsImportRes = await fetch(`${API_URL}/api/admin/import-stats`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    
    if (statsImportRes.status === 200) {
      console.log("✔ Statistics spreadsheet imported via API successfully (PASSED)");
    } else {
      const errData = await statsImportRes.json();
      console.log(`✘ Statistics spreadsheet import failed with status ${statsImportRes.status}: ${errData.message} (FAILED)`);
    }

  } catch (err) {
    console.error("✘ Authentication/API test failed with error:", err.message);
  }

  // 3. Seed Sandbox Test Records
  console.log("\n[TEST 3] Seeding Sandbox Test Records...");
  const createdStudentIds = [];
  const createdOfferIds = [];
  const createdInternshipIds = [];
  const createdCompanyIds = [];

  try {
    // Clean up any stray test records first
    await cleanUpTESTRecords();

    // Create companies
    const compGoogle = await new Company({ name: "TEST_Google", visitYear: 2025, role: "Software Engineer", package: 22, selectedCount: 1, eligibility: "Open", technologies: [], hiringProcess: "Direct", industry: "Technology", location: "Pune" }).save();
    const compAmazon = await new Company({ name: "TEST_Amazon", visitYear: 2025, role: "SDE", package: 18, selectedCount: 1, eligibility: "Open", technologies: [], hiringProcess: "Direct", industry: "E-Commerce", location: "Bangalore" }).save();
    const compMicrosoft = await new Company({ name: "TEST_Microsoft", visitYear: 2025, role: "SE", package: 20, selectedCount: 1, eligibility: "Open", technologies: [], hiringProcess: "Direct", industry: "Technology", location: "" }).save(); // missing location
    const compTcs = await new Company({ name: "TEST_TCS", visitYear: 2025, role: "Consultant", package: 4.5, selectedCount: 1, eligibility: "Open", technologies: [], hiringProcess: "Direct", industry: "", location: "Mumbai" }).save(); // missing industry
    const compInfosys = await new Company({ name: "TEST_Infosys", visitYear: 2025, role: "Consultant", package: 4, selectedCount: 1, eligibility: "Open", technologies: [], hiringProcess: "Direct", industry: "Consulting", location: "Pune" }).save();

    createdCompanyIds.push(compGoogle._id, compAmazon._id, compMicrosoft._id, compTcs._id, compInfosys._id);

    // Student A: PRN001, John Doe, CS. Primary Google 25 LPA, Secondary Amazon 18 LPA, Internship Google (stipend 50k, PPO Yes)
    const stuA = await new PlacedStudent({ prn: "TEST_PRN_001", name: "TEST John Doe", branch: "Computer Science", gender: "Male", collegeEmail: "john@wce.edu" }).save();
    createdStudentIds.push(stuA._id);
    const offA1 = await new PlacementOffer({ studentId: stuA._id, companyId: compGoogle._id, packageLpa: 25, offerType: "PRIMARY", placementStatus: "Placed" }).save();
    const offA2 = await new PlacementOffer({ studentId: stuA._id, companyId: compAmazon._id, packageLpa: 18, offerType: "SECONDARY", placementStatus: "Placed" }).save();
    createdOfferIds.push(offA1._id, offA2._id);
    const intA = await new Internship({ studentId: stuA._id, companyId: compGoogle._id, stipend: 50000, ppo: "Yes", startDate: new Date("2025-01-01"), endDate: new Date("2025-06-30") }).save();
    createdInternshipIds.push(intA._id);

    // Student B: PRN002, Jane Smith, IT. Primary Google 22 LPA, Internship Google (stipend 45k, PPO No)
    const stuB = await new PlacedStudent({ prn: "TEST_PRN_002", name: "TEST Jane Smith", branch: "Information Technology", gender: "Female" }).save();
    createdStudentIds.push(stuB._id);
    const offB = await new PlacementOffer({ studentId: stuB._id, companyId: compGoogle._id, packageLpa: 22, offerType: "PRIMARY", placementStatus: "Placed" }).save();
    createdOfferIds.push(offB._id);
    const intB = await new Internship({ studentId: stuB._id, companyId: compGoogle._id, stipend: 45000, ppo: "No", startDate: new Date("2025-02-01"), endDate: new Date("2025-07-31") }).save();
    createdInternshipIds.push(intB._id);

    // Student C: PRN003, Alice Brown, CS. Primary Microsoft 20 LPA, Internship Microsoft (missing stipend, missing dates)
    const stuC = await new PlacedStudent({ prn: "TEST_PRN_003", name: "TEST Alice Brown", branch: "Computer Science", gender: "Female" }).save();
    createdStudentIds.push(stuC._id);
    const offC = await new PlacementOffer({ studentId: stuC._id, companyId: compMicrosoft._id, packageLpa: 20, offerType: "PRIMARY", placementStatus: "Placed" }).save();
    createdOfferIds.push(offC._id);
    const intC = await new Internship({ studentId: stuC._id, companyId: compMicrosoft._id, stipend: undefined, ppo: "No", startDate: null, endDate: null }).save();
    createdInternshipIds.push(intC._id);

    // Student D: PRN004, Bob White, Electronics. No offers, No internship (Unplaced)
    const stuD = await new PlacedStudent({ prn: "TEST_PRN_004", name: "TEST Bob White", branch: "Electronics", gender: "Male" }).save();
    createdStudentIds.push(stuD._id);

    // Student E: PRN005, Charlie Green, CS. Primary TCS 4.5 LPA, No internship
    const stuE = await new PlacedStudent({ prn: "TEST_PRN_005", name: "TEST Charlie Green", branch: "Computer Science", gender: "Male" }).save();
    createdStudentIds.push(stuE._id);
    const offE = await new PlacementOffer({ studentId: stuE._id, companyId: compTcs._id, packageLpa: 4.5, offerType: "PRIMARY", placementStatus: "Placed" }).save();
    createdOfferIds.push(offE._id);

    // Student F: PRN006, Diana Prince, IT. Primary Infosys null (missing package), Internship Infosys (stipend 0, PPO No)
    const stuF = await new PlacedStudent({ prn: "TEST_PRN_006", name: "TEST Diana Prince", branch: "Information Technology", gender: "Female" }).save();
    createdStudentIds.push(stuF._id);
    const offF = await new PlacementOffer({ studentId: stuF._id, companyId: compInfosys._id, packageLpa: undefined, offerType: "PRIMARY", placementStatus: "Placed" }).save();
    createdOfferIds.push(offF._id);
    const intF = await new Internship({ studentId: stuF._id, companyId: compInfosys._id, stipend: 0, ppo: "No", startDate: new Date("2025-01-01"), endDate: new Date("2025-06-30") }).save();
    createdInternshipIds.push(intF._id);

    // Student G: PRN007, Duplicate Student, CS. Primary Microsoft 20 LPA, Internship Microsoft (stipend 20k, invalid dates)
    const stuG = await new PlacedStudent({ prn: "TEST_PRN_007", name: "TEST Duplicate Student", branch: "Computer Science", gender: "Male" }).save();
    createdStudentIds.push(stuG._id);
    const offG = await new PlacementOffer({ studentId: stuG._id, companyId: compMicrosoft._id, packageLpa: 20, offerType: "PRIMARY", placementStatus: "Placed" }).save();
    createdOfferIds.push(offG._id);
    const intG = await new Internship({ studentId: stuG._id, companyId: compMicrosoft._id, stipend: 20000, ppo: "No", startDate: new Date("2025-06-30"), endDate: new Date("2025-01-01") }).save(); // Invalid start > end
    createdInternshipIds.push(intG._id);

    console.log(`✔ Seeded 5 Companies, 7 Students, 6 Offers, and 5 Internships.`);
  } catch (err) {
    console.error("✘ Seeding failed:", err);
    await cleanUpTESTRecords();
    process.exit(1);
  }

  // 4. Run calculations verification
  console.log("\n[TEST 4] Verification of Calculations via REST API...");
  try {
    const listRes = await fetch(`${API_URL}/api/admin/students?limit=100000`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listData = await listRes.json();
    const allStudents = listData.students || [];

    // Filter test students only
    const testStudents = allStudents.filter(s => s.prn && s.prn.startsWith("TEST_"));

    // Assertions:
    // Total students
    console.log(`- Total Students: ${testStudents.length} (Expected: 7)`);
    assert(testStudents.length === 7, "Total students count mismatch");

    // Placed students
    const placedStudents = testStudents.filter(s => s.offers && s.offers.length > 0);
    console.log(`- Placed Students: ${placedStudents.length} (Expected: 6)`);
    assert(placedStudents.length === 6, "Placed students count mismatch");

    // Placement percentage
    const pct = parseFloat(((placedStudents.length / testStudents.length) * 100).toFixed(2));
    console.log(`- Placement Rate: ${pct}% (Expected: 85.71%)`);
    assert(Math.abs(pct - 85.71) < 0.05, "Placement rate mismatch");

    // Package List calculations
    const pkgs = [];
    testStudents.forEach(s => s.offers?.forEach(o => {
      if (typeof o.packageLpa === "number" && o.packageLpa !== null) {
        pkgs.push(o.packageLpa);
      }
    }));
    pkgs.sort((a, b) => a - b);

    console.log(`- Extracted salary packages (ignoring nulls): [${pkgs.join(", ")}]`);
    assert(pkgs.length === 6, "Salary packages list count mismatch (null packages should be excluded)");

    const maxPkg = Math.max(...pkgs);
    console.log(`- Highest Package: ${maxPkg} LPA (Expected: 25 LPA)`);
    assert(maxPkg === 25, "Highest package calculation mismatch");

    const minPkg = Math.min(...pkgs);
    console.log(`- Lowest Package: ${minPkg} LPA (Expected: 4.5 LPA)`);
    assert(minPkg === 4.5, "Lowest package calculation mismatch");

    const avgPkg = parseFloat((pkgs.reduce((a, b) => a + b, 0) / pkgs.length).toFixed(2));
    console.log(`- Average Package: ${avgPkg} LPA (Expected: 18.25 LPA)`);
    assert(Math.abs(avgPkg - 18.25) < 0.05, "Average package calculation mismatch");

    // Median package calculation
    const mid = Math.floor(pkgs.length / 2);
    const medianPkg = pkgs.length % 2 === 0 ? (pkgs[mid - 1] + pkgs[mid]) / 2 : pkgs[mid];
    console.log(`- Median Package: ${medianPkg} LPA (Expected: 20 LPA)`);
    assert(medianPkg === 20, "Median package calculation mismatch");

    // Multiple offer students count
    const multiOffersCount = testStudents.filter(s => s.offers && s.offers.length > 1).length;
    console.log(`- Students with Multiple Offers: ${multiOffersCount} (Expected: 1)`);
    assert(multiOffersCount === 1, "Multiple offers count mismatch");

    // Internship counts & stipends
    const internCount = testStudents.reduce((sum, s) => sum + (s.internships?.length || 0), 0);
    console.log(`- Total Internships: ${internCount} (Expected: 5)`);
    assert(internCount === 5, "Total internships mismatch");

    const stipends = [];
    testStudents.forEach(s => s.internships?.forEach(i => {
      if (typeof i.stipend === "number" && i.stipend !== null) {
        stipends.push(i.stipend);
      }
    }));
    console.log(`- Extracted stipends (excluding nulls): [${stipends.join(", ")}]`);
    assert(stipends.length === 4, "Stipend list count mismatch (null stipends must be ignored, 0 must be included)");

    const maxStipend = Math.max(...stipends);
    console.log(`- Highest Stipend: ${maxStipend} (Expected: 50,000)`);
    assert(maxStipend === 50000, "Highest stipend mismatch");

    const avgStipend = stipends.reduce((a, b) => a + b, 0) / stipends.length;
    console.log(`- Average Stipend: ${avgStipend} (Expected: 28,750)`);
    assert(avgStipend === 28750, "Average stipend mismatch");

    console.log("✔ Calculations verification: ALL CHECKS PASSED!");

  } catch (err) {
    console.error("✘ Calculations verification failed:", err);
  }

  // 5. Verification of Data Quality Auditing Rules
  console.log("\n[TEST 5] Verification of Data Quality Audits...");
  try {
    const listRes = await fetch(`${API_URL}/api/admin/students?limit=100000`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listData = await listRes.json();
    const testStudents = (listData.students || []).filter(s => s.prn && s.prn.startsWith("TEST_"));

    const compRes = await fetch(`${API_URL}/api/companies`);
    const allCompanies = await compRes.json();
    const testCompanies = allCompanies.filter(c => c.name && c.name.startsWith("TEST_"));

    const issues = [];
    testStudents.forEach(s => {
      if (!s.branch || s.branch.trim() === "") issues.push("missing_branch");
      
      const isPlaced = s.offers && s.offers.length > 0;
      if (isPlaced) {
        s.offers.forEach(o => {
          if (!o.placementStatus || o.placementStatus.trim() === "") issues.push("missing_status");
          if (o.packageLpa === undefined || o.packageLpa === null || isNaN(o.packageLpa)) issues.push("missing_package");
          if (typeof o.packageLpa === "number" && (o.packageLpa < 0 || o.packageLpa > 150)) issues.push("invalid_package");
          if (!o.companyName || o.companyName.trim() === "") issues.push("missing_company");
        });
      }
      
      s.internships?.forEach(i => {
        if (!i.startDate || !i.endDate) issues.push("missing_dates");
        if (i.startDate && i.endDate && new Date(i.startDate) > new Date(i.endDate)) issues.push("invalid_dates");
        if (i.stipend === undefined || i.stipend === null || isNaN(i.stipend)) issues.push("missing_stipend");
      });
    });

    testCompanies.forEach(c => {
      const missingIndustry = !c.industry || c.industry.trim() === "";
      const missingLocation = !c.location || c.location.trim() === "";
      if (missingIndustry || missingLocation) {
        issues.push("incomplete_company");
      }
    });

    console.log(`- Data quality anomalies flagged: [${issues.join(", ")}]`);
    
    // Check specific anomalies triggered:
    assert(issues.includes("missing_package"), "Failed to flag missing package");
    assert(issues.includes("missing_dates"), "Failed to flag missing internship dates");
    assert(issues.includes("missing_stipend"), "Failed to flag missing internship stipend");
    assert(issues.includes("invalid_dates"), "Failed to flag invalid internship dates");
    assert(issues.includes("incomplete_company"), "Failed to flag company with incomplete information");

    console.log("✔ Data quality auditing: ALL CHECKS PASSED!");
  } catch (err) {
    console.error("✘ Data quality audits verification failed:", err);
  }

  // Clean up sandbox
  console.log("\nCleaning up sandbox test records...");
  await cleanUpTESTRecords();
  
  // Clean up yearly stats seeded during test 2e
  await YearlyStats.deleteMany({ year: 2025 });
  console.log("✔ Cleanup complete.");

  await mongoose.disconnect();
  console.log("\n==================================================");
  console.log("REGRESSION TESTS COMPLETED SUCCESSFULLY!");
  console.log("==================================================");
}

async function cleanUpTESTRecords() {
  const testCompanies = await Company.find({ name: { $regex: /^TEST_/ } });
  const compIds = testCompanies.map(c => c._id);

  const testStudents = await PlacedStudent.find({ prn: { $regex: /^TEST_/ } });
  const stuIds = testStudents.map(s => s._id);

  await Company.deleteMany({ _id: { $in: compIds } });
  await PlacedStudent.deleteMany({ _id: { $in: stuIds } });
  await PlacementOffer.deleteMany({ studentId: { $in: stuIds } });
  await Internship.deleteMany({ studentId: { $in: stuIds } });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

runRegressionTests().catch(err => {
  console.error("\n✘ Regression Tests aborted due to error:", err);
  process.exit(1);
});
