import mongoose from "mongoose";
import dotenv from "dotenv";
import { Company, PlacementRecord, Student, PlacedStudent, PlacementOffer, Internship } from "./models.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tpo_db";

async function runMigration() {
  console.log("Connecting to Database...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected successfully. Starting migration...");

  const records = await PlacementRecord.find({});
  console.log(`Found ${records.length} flat placement records to migrate.`);

  let studentMigrated = 0;
  let offersMigrated = 0;
  let internshipsMigrated = 0;

  for (const record of records) {
    // 1. Create or Find Placed Student
    let student = await PlacedStudent.findOne({ prn: record.prn });
    if (!student) {
      const fullName = `${record.firstName} ${record.middleName ? record.middleName + " " : ""}${record.lastName}`.trim();
      student = new PlacedStudent({
        prn: record.prn,
        name: fullName,
        branch: record.branch,
        gender: record.gender,
        personalEmail: record.personalMail || "",
        collegeEmail: record.collegeMail || "",
        phone: record.phoneNo || ""
      });
      await student.save();
      studentMigrated++;
    }

    // Helper to find or create a Company by name
    const getOrCreateCompany = async (companyName, packageLpa) => {
      if (!companyName) return null;
      let company = await Company.findOne({ name: { $regex: new RegExp(`^${companyName.trim()}$`, "i") } });
      if (!company) {
        company = new Company({
          name: companyName.trim(),
          visitYear: 2025, // default visit year
          role: "Software Engineer", // default role
          package: packageLpa || 0,
          selectedCount: 1,
          eligibility: "Default eligibility",
          technologies: [],
          hiringProcess: "Default hiring process"
        });
        await company.save();
      }
      return company;
    };

    // 2. Migrate Offer 1
    if (record.company1) {
      const comp1 = await getOrCreateCompany(record.company1, record.salary1);
      if (comp1) {
        // Check if offer already exists for this student & company
        const offerExists = await PlacementOffer.findOne({
          studentId: student._id,
          companyId: comp1._id,
          offerType: "PRIMARY"
        });

        if (!offerExists) {
          const offer = new PlacementOffer({
            studentId: student._id,
            companyId: comp1._id,
            packageLpa: record.salary1 || 0,
            offerType: "PRIMARY",
            placementStatus: record.placementStatus || "Placed",
            offerDate: record.createdAt || new Date()
          });
          await offer.save();
          offersMigrated++;
        }
      }
    }

    // 3. Migrate Offer 2
    if (record.company2) {
      const comp2 = await getOrCreateCompany(record.company2, record.salary2);
      if (comp2) {
        const offerExists = await PlacementOffer.findOne({
          studentId: student._id,
          companyId: comp2._id,
          offerType: "SECONDARY"
        });

        if (!offerExists) {
          const offer = new PlacementOffer({
            studentId: student._id,
            companyId: comp2._id,
            packageLpa: record.salary2 || 0,
            offerType: "SECONDARY",
            placementStatus: record.placementStatus || "Placed",
            offerDate: record.createdAt || new Date()
          });
          await offer.save();
          offersMigrated++;
        }
      }
    }

    // 4. Migrate Internship
    if (record.internshipOffered === "Yes" || record.internshipCompany) {
      const internshipCompName = record.internshipCompany || record.company1;
      if (internshipCompName) {
        const intComp = await getOrCreateCompany(internshipCompName, 0);
        if (intComp) {
          const internshipExists = await Internship.findOne({
            studentId: student._id,
            companyId: intComp._id
          });

          if (!internshipExists) {
            const internship = new Internship({
              studentId: student._id,
              companyId: intComp._id,
              startDate: record.internshipStartDate || null,
              endDate: record.internshipEndDate || null,
              stipend: record.stipend || 0,
              ppo: "No", // default
              status: "Active"
            });
            await internship.save();
            internshipsMigrated++;
          }
        }
      }
    }
  }

  console.log("Migration complete!");
  console.log(`- Students Migrated/Created: ${studentMigrated}`);
  console.log(`- Placement Offers Migrated: ${offersMigrated}`);
  console.log(`- Internships Migrated: ${internshipsMigrated}`);

  await mongoose.disconnect();
  console.log("Database connection closed.");
}

runMigration().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
