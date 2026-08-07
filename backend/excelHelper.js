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
