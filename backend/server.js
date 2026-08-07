import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import router from "./routes.js";
import { Admin, Company, Experience, YearlyStats, GlobalStats } from "./models.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/tpo_db";

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", router);

// Default Route
app.get("/", (req, res) => {
  res.json({ message: "Placement Activity Portal Backend API is running." });
});

// Database Seeding Logic
const seedDefaultData = async () => {
  try {
    // 1. Seed Admin
    const adminCount = await Admin.countDocuments({});
    if (adminCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("admin123", salt);
      await Admin.create({ username: "admin", password: hashedPassword });
      console.log("Default admin account seeded successfully: admin / admin123");
    }

    // 2. Seed Companies
    const companyCount = await Company.countDocuments({});
    if (companyCount === 0) {
      const seedCompanies = [
        {
          name: "Google",
          visitYear: 2025,
          role: "Software Engineer Intern",
          package: 35.5,
          selectedCount: 4,
          eligibility: "CGPA >= 8.5, Open to CS, IT, and ECE branches. No active backlogs.",
          technologies: ["C++", "Python", "Go", "Data Structures", "System Design"],
          hiringProcess: "1 Online Coding Challenge (2 medium-hard graph questions, 90 mins) -> 3 rounds of Technical Interviews (focusing on algorithms, data structures, and complex system design) -> 1 Googleness & Leadership interview."
        },
        {
          name: "Microsoft",
          visitYear: 2025,
          role: "Software Engineer",
          package: 44.0,
          selectedCount: 6,
          eligibility: "CGPA >= 8.0, open to CS and IT branches only.",
          technologies: ["C#", "C++", "Java", "Operating Systems", "DBMS"],
          hiringProcess: "Resume Shortlisting -> 1 Online Assessment (3 coding questions on Codility) -> Technical Round 1 (System Design & DSA) -> Technical Round 2 (Algorithms & Core CS Concepts) -> AA (As Appropriate) Round focusing on problem solving and culture fit."
        },
        {
          name: "Amazon",
          visitYear: 2024,
          role: "Cloud Support Associate",
          package: 18.0,
          selectedCount: 8,
          eligibility: "CGPA >= 7.5, open to CS, IT, ECE, and EE branches.",
          technologies: ["Linux/Unix", "Networking", "Databases", "Python/Java"],
          hiringProcess: "1 Online Assessment (Debugging + Coding + Work Simulation + Cognitive tests) -> 2 rounds of Technical Interviews focusing on networking, operating systems, and Amazon Leadership Principles."
        },
        {
          name: "Tata Consultancy Services (TCS)",
          visitYear: 2025,
          role: "Ninja & Digital Developer",
          package: 7.2,
          selectedCount: 35,
          eligibility: "CGPA >= 6.5, No active backlogs. Open to all engineering branches.",
          technologies: ["Java", "Python", "SQL", "HTML/CSS/JS"],
          hiringProcess: "TCS NQT National Qualifier Test (Aptitude + Coding) -> Single Interview containing Technical, Managerial, and HR assessments."
        },
        {
          name: "Infosys",
          visitYear: 2024,
          role: "System Engineer Specialist",
          package: 6.5,
          selectedCount: 22,
          eligibility: "CGPA >= 6.0, Open to CS, IT, ECE, EE, and Mech branches.",
          technologies: ["C++", "Java", "Python", "SQL"],
          hiringProcess: "InfyTQ / HackWithInfy Hackathon or Infosys Placement Test -> 1 Technical Interview -> 1 HR Interview."
        }
      ];

      const createdCompanies = await Company.insertMany(seedCompanies);
      console.log("Seed companies seeded successfully.");

      // 3. Seed Experiences
      const expCount = await Experience.countDocuments({});
      if (expCount === 0) {
        const googleId = createdCompanies.find(c => c.name === "Google")?._id;
        const msId = createdCompanies.find(c => c.name === "Microsoft")?._id;
        const amazonId = createdCompanies.find(c => c.name === "Amazon")?._id;
        const tcsId = createdCompanies.find(c => c.name === "Tata Consultancy Services (TCS)")?._id;

        const seedExperiences = [
          {
            studentName: "Aditya Verma",
            branch: "Computer Science & Engineering",
            graduationYear: 2025,
            companyId: googleId,
            companyName: "Google",
            status: "approved",
            rounds: [
              {
                title: "Round 1: Online Assessment",
                content: "Had 2 coding questions. One was a variation of Dijkstra's algorithm for finding shortest paths with edge constraints, and the other was a complex Dynamic Programming question related to string alignment."
              },
              {
                title: "Round 2: Technical Interview 1",
                content: "Deep dive into Tree Data Structures. I was asked to implement a binary tree traversal method and optimize it to run in O(1) extra space (Morris Traversal)."
              },
              {
                title: "Round 3: Technical Interview 2",
                content: "System Design question. Design a URL shortening service like TinyURL. We discussed read-to-write ratios, database partitioning, caching strategy, and custom base62 hashing."
              }
            ],
            technologies: ["Graphs", "DP", "Trees", "System Design"],
            prepTips: "Focus on LeetCode Medium/Hard, especially trees and graphs. Explain your thoughts clearly during interviews."
          },
          {
            studentName: "Sneha Patil",
            branch: "Information Technology",
            graduationYear: 2025,
            companyId: msId,
            companyName: "Microsoft",
            status: "approved",
            rounds: [
              {
                title: "Round 1: Online Codility Test",
                content: "3 coding tasks covering Array manipulation, Greedy scheduling, and Substring counting. Solved all three within 75 minutes."
              },
              {
                title: "Round 2: Technical Discussion",
                content: "Asked detailed questions on Database indexing (B-trees, B+ trees), differences between SQL and NoSQL, and a coding question: 'Find the lowest common ancestor in a Binary Tree'."
              }
            ],
            technologies: ["DBMS", "Trees", "Arrays", "Greedy Algorithms"],
            prepTips: "Strengthen your core computer science fundamentals. Operating systems (paging, virtual memory) and DBMS (transactions, indexing) are heavily tested at Microsoft."
          },
          {
            studentName: "Rohan Das",
            branch: "Electronics & Communication",
            graduationYear: 2024,
            companyId: amazonId,
            companyName: "Amazon",
            status: "approved",
            rounds: [
              {
                title: "Round 1: Online OA",
                content: "Included 2 debugging challenges, 1 coding challenge on sliding window, and a personality survey mapping to Amazon's Leadership Principles."
              },
              {
                title: "Round 2: Technical Interview",
                content: "Very conversational. Asked about Linux architecture, process scheduling, TCP 3-way handshake, and DNS resolution steps. Be very crisp with networking concepts!"
              }
            ],
            technologies: ["Linux", "TCP/IP", "DNS", "Sliding Window"],
            prepTips: "Understand how networks operate and get comfortable with terminal commands. Read up on Amazon's Leadership Principles and frame your answers in STAR (Situation, Task, Action, Result) format."
          },
          {
            studentName: "Pooja Hegde",
            branch: "Computer Science & Engineering",
            graduationYear: 2025,
            companyId: googleId,
            companyName: "Google",
            status: "pending",
            rounds: [
              {
                title: "Round 1: OA",
                content: "Two questions. The first was on Segment Trees for range query updates and the second was a grid-based dynamic programming problem."
              },
              {
                title: "Round 2: Interview 1",
                content: "Asked to design a data structure that supports insert, delete, and getRandom in O(1) time. Implemented this using a hash map combined with an array list."
              }
            ],
            technologies: ["Segment Trees", "Hashing", "Dynamic Programming"],
            prepTips: "Practice writing clean, dry-runnable code. Google interviewers evaluate code cleanliness and edge case handling carefully."
          },
          {
            studentName: "Anonymous Senior",
            branch: "Information Technology",
            graduationYear: 2025,
            companyId: tcsId,
            companyName: "Tata Consultancy Services (TCS)",
            status: "pending",
            rounds: [
              {
                title: "Round 1: Aptitude & Coding",
                content: "Aptitude questions were on quantitative analysis, verbal logic, and programming concepts. Coding questions were very basic: prime factorization and matrix transposition."
              },
              {
                title: "Round 2: Interview",
                content: "Asked basic Java oops concepts (Polymorphism, Inheritance), SQL queries using JOINs, and a brief walkthrough of my final year project."
              }
            ],
            technologies: ["Java OOPS", "SQL JOINs"],
            prepTips: "Be confident about your resume projects. Know basic SQL syntax and OOP principles."
          }
        ];

        await Experience.insertMany(seedExperiences);
        console.log("Seed experiences seeded successfully.");
      }
    }

    // 4. Seed Yearly Stats
    const yearlyCount = await YearlyStats.countDocuments({});
    if (yearlyCount === 0) {
      const seedYearly = [
        { year: 2023, companies: 28, placed: 124, avgPackage: 8.5 },
        { year: 2024, companies: 38, placed: 148, avgPackage: 10.2 }
      ];
      await YearlyStats.insertMany(seedYearly);
      console.log("Seed yearly statistics seeded successfully.");
    }
  } catch (error) {
    console.error("Error seeding default data:", error);
  }
};

// Database Connection & Server Startup
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB successfully.");
    await seedDefaultData();
    
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
  });
