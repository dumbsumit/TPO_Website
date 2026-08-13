import xlsx from "xlsx";

// Helper to normalize keys from Excel rows to standard JS camelCase property keys
const normalizeKeys = (row) => {
  const normalized = {};
  for (const key of Object.keys(row)) {
    const cleanKey = key.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
    normalized[cleanKey] = row[key];
  }
  return normalized;
};

// Maps Excel fields to Company model properties
export const parseCompaniesExcel = (buffer) => {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);

  return rows.map(row => {
    const norm = normalizeKeys(row);

    // Find keys using aliases
    const name = row["Company Name"] || row["Company"] || row["Name"] || norm["companyname"] || norm["company"] || norm["name"] || "";
    const visitYear = Number(row["Visit Year"] || row["Year"] || norm["visityear"] || norm["year"] || new Date().getFullYear());
    const role = row["Offered Role"] || row["Role"] || row["Job Profile"] || norm["offeredrole"] || norm["role"] || norm["jobprofile"] || "";
    const packageVal = Number(row["Package (CTC)"] || row["Package"] || row["CTC"] || row["Package (LPA)"] || row["CTC (LPA)"] || norm["packagectc"] || norm["package"] || norm["ctc"] || norm["packagelpa"] || norm["ctclpa"] || 0);
    const selectedCount = Number(row["Selected Count"] || row["Selected Students"] || row["Placed"] || norm["selectedcount"] || norm["selectedstudents"] || norm["placed"] || 0);
    const eligibility = row["Eligibility Criteria"] || row["Eligibility"] || norm["eligibilitycriteria"] || norm["eligibility"] || "";
    
    let technologies = [];
    const techRaw = row["Technologies Asked"] || row["Technologies"] || row["Tech"] || norm["technologiesasked"] || norm["technologies"] || norm["tech"] || "";
    if (techRaw) {
      technologies = String(techRaw).split(",").map(t => t.trim()).filter(Boolean);
    }

    const hiringProcess = row["Hiring Process"] || row["Process"] || norm["hiringprocess"] || norm["process"] || "";

    return {
      name: String(name).trim(),
      visitYear,
      role: String(role).trim(),
      package: packageVal,
      selectedCount,
      eligibility: String(eligibility).trim(),
      technologies,
      hiringProcess: String(hiringProcess).trim()
    };
  }).filter(c => c.name); // Filter out rows without a company name
};

// Maps Excel fields to Yearly Placement Stats properties
export const parseStatsExcel = (buffer) => {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);

  return rows.map(row => {
    const norm = normalizeKeys(row);

    const year = Number(row["Year"] || norm["year"] || 0);
    const companies = Number(row["Total Companies Visited"] || row["Total Companies"] || row["Companies"] || norm["totalcompaniesvisited"] || norm["totalcompanies"] || norm["companies"] || 0);
    const placed = Number(row["Total Students Placed"] || row["Total Students"] || row["Placed"] || row["Students Placed"] || norm["totalstudentsplaced"] || norm["totalstudents"] || norm["placed"] || norm["studentsplaced"] || 0);
    const avgPackage = Number(row["Average Package"] || row["Average Package (LPA)"] || row["Average"] || row["Avg Package"] || norm["averagepackage"] || norm["averagepackagelpa"] || norm["average"] || norm["avgpackage"] || 0);

    return {
      year,
      companies,
      placed,
      avgPackage
    };
  }).filter(s => s.year > 0); // Filter out rows without a valid year
};

// Maps Excel fields to Student Placement Record properties
export const parsePlacementRecordsExcel = (buffer) => {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);

  return rows.map(row => {
    const norm = normalizeKeys(row);

    const srNo = Number(row["Sr.No"] || row["SrNo"] || row["Sr No"] || norm["srno"] || 0);
    const prn = String(row["PRN"] || norm["prn"] || "").trim();
    const branch = String(row["Branch"] || norm["branch"] || "").trim();
    const firstName = String(row["First Name"] || row["FirstName"] || norm["firstname"] || "").trim();
    const middleName = String(row["Middle Name"] || row["MiddleName"] || norm["middlename"] || "").trim();
    const lastName = String(row["Last Name"] || row["LastName"] || norm["lastname"] || "").trim();
    const gender = String(row["Gender"] || norm["gender"] || "").trim();
    
    const company1 = String(row["Company 1"] || row["Company1"] || norm["company1"] || "").trim();
    const salary1 = Number(row["Salary (LPA)"] || row["Salary1"] || norm["salary1"] || norm["salarylpa"] || 0);
    const company2 = String(row["Company 2"] || row["Company2"] || norm["company2"] || "").trim();
    
    // xlsx sheet_to_json handles duplicate keys by appending _1, e.g. "Salary (LPA)_1"
    const salary2 = Number(row["Salary (LPA)_1"] || row["Salary2"] || norm["salary2"] || norm["salarylpa1"] || 0);

    const internshipOffered = String(row["Internship Offered"] || row["Internship"] || norm["internshipoffered"] || norm["internship"] || "No").trim();
    const internshipCompany = String(row["Internship Company"] || norm["internshipcompany"] || "").trim();
    
    // Date parser helper
    const parseDateValue = (val) => {
      if (!val) return null;
      if (typeof val === "number") {
        // Excel serial date format conversion
        return new Date((val - 25569) * 86400 * 1000);
      }
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const internshipStartDate = parseDateValue(row["Internship Start Date"] || row["InternshipStartDate"] || norm["internshipstartdate"]);
    const internshipEndDate = parseDateValue(row["Internship End Date"] || row["InternshipEndDate"] || norm["internshipenddate"]);

    const stipend = Number(row["Stipend"] || norm["stipend"] || 0);
    const personalMail = String(row["Personal Mail"] || row["PersonalMail"] || norm["personalmail"] || "").trim();
    const collegeMail = String(row["College Mail"] || row["CollegeMail"] || norm["collegemail"] || "").trim();
    const phoneNo = String(row["Phone No"] || row["PhoneNo"] || norm["phoneno"] || "").trim();
    const placementStatus = String(row["Placement Status"] || row["PlacementStatus"] || norm["placementstatus"] || "Unplaced").trim();

    return {
      srNo,
      prn,
      branch,
      firstName,
      middleName,
      lastName,
      gender,
      company1,
      salary1,
      company2,
      salary2,
      internshipOffered,
      internshipCompany,
      internshipStartDate,
      internshipEndDate,
      stipend,
      personalMail,
      collegeMail,
      phoneNo,
      placementStatus
    };
  }).filter(p => p.prn && p.firstName); // Filter out empty PRN or First Name rows
};

