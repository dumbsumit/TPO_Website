/**
 * createAdmin.js  — CLI script to create a TPO Admin account
 *
 * Usage:
 *   node scripts/createAdmin.js --name "TPO Admin" --email tpo@walchandsangli.ac.in --password <secret>
 *
 * Run from the backend directory after setting MONGO_URI in .env
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Admin } from "../models.js";

const args = process.argv.slice(2);

const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const name = getArg("--name");
const email = getArg("--email");
const password = getArg("--password");

if (!name || !email || !password) {
  console.error(
    "\n❌  Missing required arguments.\n\n" +
    "Usage:\n  node scripts/createAdmin.js --name \"TPO Admin\" --email tpo@walchandsangli.ac.in --password <secret>\n"
  );
  process.exit(1);
}

const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || "walchandsangli.ac.in";
if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
  console.error(`\n❌  Email must be a @${ALLOWED_DOMAIN} address.\n`);
  process.exit(1);
}

if (password.length < 8) {
  console.error("\n❌  Password must be at least 8 characters.\n");
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI;

try {
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected to MongoDB");

  const existing = await Admin.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error(`\n⚠️  An admin account with email "${email}" already exists.\n`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await Admin.create({
    name,
    email: email.toLowerCase(),
    password: passwordHash,
    role: "tpo_admin",
    isVerified: true,
  });

  console.log(`\n✅  Admin account created successfully!`);
  console.log(`   Name  : ${admin.name}`);
  console.log(`   Email : ${admin.email}`);
  console.log(`   Role  : ${admin.role}\n`);
} catch (err) {
  console.error("\n❌  Error creating admin:", err.message, "\n");
  process.exit(1);
} finally {
  await mongoose.disconnect();
}
