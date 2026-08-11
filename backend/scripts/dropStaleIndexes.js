/**
 * dropStaleIndexes.js — One-time script to remove stale indexes from old schemas.
 * Run once: node scripts/dropStaleIndexes.js
 */
import "dotenv/config";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tpo_db";

await mongoose.connect(MONGO_URI);
console.log("✅ Connected to MongoDB");

const toDrop = [
  { collection: "students", index: "prn_1" },
  { collection: "students", index: "username_1" },
];

for (const { collection, index } of toDrop) {
  try {
    await mongoose.connection.collection(collection).dropIndex(index);
    console.log(`✅ Dropped stale index "${index}" from "${collection}"`);
  } catch (err) {
    if (err.codeName === "IndexNotFound") {
      console.log(`ℹ️  Index "${index}" not found on "${collection}" — skipping`);
    } else {
      console.error(`❌ Error dropping "${index}":`, err.message);
    }
  }
}

await mongoose.disconnect();
console.log("Done.");
