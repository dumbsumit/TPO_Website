import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { User } from "../models.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tpo_db";

async function migrate() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully.");

    const db = mongoose.connection.db;

    // --- Migrate Admins collection -> Users collection ---
    let migratedAdmins = 0;
    try {
      const adminsColl = db.collection("admins");
      const adminDocs = await adminsColl.find({}).toArray();
      console.log(`Found ${adminDocs.length} documents in raw 'admins' collection.`);

      for (const adminDoc of adminDocs) {
        const email = adminDoc.email?.toLowerCase().trim();
        if (!email) continue;

        const updateData = {
          name: adminDoc.name || "Admin",
          email,
          password: adminDoc.password || null,
          googleId: adminDoc.googleId || null,
          role: "tpo_admin",
          branch: "",
          graduationYear: null,
          isVerified: true,
          otpHash: adminDoc.otpHash || null,
          otpExpiry: adminDoc.otpExpiry || null,
          refreshTokenHash: adminDoc.refreshTokenHash || null,
        };

        const result = await User.updateOne(
          { email },
          { $set: updateData },
          { upsert: true }
        );

        if (result.upsertedCount > 0 || result.modifiedCount > 0) {
          migratedAdmins++;
        }
      }
    } catch (err) {
      console.log("No existing 'admins' collection or migration skipped:", err.message);
    }
    console.log(`Migrated ${migratedAdmins} admin accounts into 'users' collection.`);

    // --- Migrate Students collection -> Users collection ---
    let migratedStudents = 0;
    try {
      const studentsColl = db.collection("students");
      const studentDocs = await studentsColl.find({}).toArray();
      console.log(`Found ${studentDocs.length} documents in raw 'students' collection.`);

      for (const studentDoc of studentDocs) {
        const email = studentDoc.email?.toLowerCase().trim();
        if (!email) continue;

        const updateData = {
          name: studentDoc.name || "Student",
          email,
          password: studentDoc.password || null,
          googleId: studentDoc.googleId || null,
          role: "student",
          branch: studentDoc.branch || "",
          graduationYear: studentDoc.graduationYear || null,
          isVerified: studentDoc.isVerified !== undefined ? studentDoc.isVerified : false,
          otpHash: studentDoc.otpHash || null,
          otpExpiry: studentDoc.otpExpiry || null,
          refreshTokenHash: studentDoc.refreshTokenHash || null,
        };

        const result = await User.updateOne(
          { email },
          { $set: updateData },
          { upsert: true }
        );

        if (result.upsertedCount > 0 || result.modifiedCount > 0) {
          migratedStudents++;
        }
      }
    } catch (err) {
      console.log("No existing 'students' collection or migration skipped:", err.message);
    }
    console.log(`Migrated ${migratedStudents} student accounts into 'users' collection.`);

    const totalUsers = await User.countDocuments();
    console.log(`Total users in unified 'users' collection: ${totalUsers}`);

    console.log("\n✅ Migration complete!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
