import "dotenv/config";
import express from "express";
import path from "path";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import cookieParser from "cookie-parser";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import sqlite3 from "sqlite3";

// Initialize SQLite Database for Mock Question Analysis
const sqliteDbPath = path.resolve(process.cwd(), "mock_analytics.db");
const sqliteDb = new sqlite3.Database(sqliteDbPath, (err) => {
  if (err) {
    console.error("[SQLite] Error opening database:", err.message);
  } else {
    console.log("[SQLite] Connected to mock_analytics database.");
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS mock_question_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT,
        mock_test_id TEXT,
        question_id TEXT,
        selected_answer TEXT,
        correct_answer TEXT,
        is_correct INTEGER,
        time_taken_seconds INTEGER,
        attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error("[SQLite] Error creating mock_question_analysis table:", err.message);
      } else {
        console.log("[SQLite] Table mock_question_analysis verified/created successfully.");
      }
    });
  }
});

function insertMockQuestionAnalysis(
  studentId: string,
  mockTestId: string,
  questionId: string,
  selectedAnswer: string,
  correctAnswer: string,
  isCorrect: number,
  timeTakenSeconds: number
) {
  sqliteDb.run(`
    INSERT INTO mock_question_analysis (
      student_id,
      mock_test_id,
      question_id,
      selected_answer,
      correct_answer,
      is_correct,
      time_taken_seconds
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [studentId, mockTestId, questionId, selectedAnswer, correctAnswer, isCorrect, timeTakenSeconds], (err) => {
    if (err) {
      console.error("[SQLite] Error inserting question analysis:", err.message);
    }
  });
}

// Load Firebase config (file on localhost, env vars on Vercel)
let firebaseConfig: any = { projectId: "", firestoreDatabaseId: "" };
try {
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (e) {
  console.warn("[Config] Could not load firebase-applet-config.json, using env vars");
}

// Initialize Gemini
let _googleGenAI: any = null;
function getGeminiClient() {
  if (_googleGenAI) return _googleGenAI;
  
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!key) {
    console.warn("[Gemini] No API key found in environment variables (GEMINI_API_KEY or GOOGLE_GENAI_API_KEY)");
  } else {
    console.log(`[Gemini] Initializing client with key starting with: ${key.substring(0, 6)}...`);
  }
  
  _googleGenAI = new GoogleGenAI({ apiKey: key || "" });
  return _googleGenAI;
}

// Global State
let db: admin.firestore.Firestore | null = null;

/**
 * Firebase Initialization
 * - Localhost: loads service-account-key.json directly from disk
 * - Vercel: uses FIREBASE_SERVICE_ACCOUNT env var (inline JSON string)
 */
const getDb = () => {
  if (db) return db;

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
    const databaseId = process.env.FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

    if (admin.apps.length === 0) {
      let initialized = false;

      // Path 1: Inline JSON from env var (Vercel)
      const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (saEnv && saEnv.trim().startsWith('{')) {
        try {
          console.log("[Firebase] Using inline FIREBASE_SERVICE_ACCOUNT...");
          let sa = JSON.parse(saEnv);
          if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
          admin.initializeApp({
            credential: admin.credential.cert(sa),
            projectId: projectId || sa.project_id,
          });
          initialized = true;
        } catch (e: any) {
          console.error("[Firebase] Inline SA parse failed:", e.message);
        }
      }

      // Path 2: Load key file from disk (localhost)
      if (!initialized) {
        const keyFilePath = path.resolve(process.cwd(), "service-account-key.json");
        if (fs.existsSync(keyFilePath)) {
          try {
            console.log(`[Firebase] Loading key from file: ${keyFilePath}`);
            const sa = JSON.parse(fs.readFileSync(keyFilePath, "utf-8"));
            admin.initializeApp({
              credential: admin.credential.cert(sa),
              projectId: projectId || sa.project_id,
            });
            initialized = true;
            console.log(`[Firebase] Initialized with key file for project: ${projectId || sa.project_id}`);
          } catch (e: any) {
            console.error("[Firebase] Key file load failed:", e.message);
          }
        }
      }

      // Path 3: Last resort fallback
      if (!initialized) {
        console.warn("[Firebase] No credentials found. Trying applicationDefault()...");
        try {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId,
          });
        } catch (e) {
          console.error("[Firebase] All credential methods failed. Initializing without credentials.");
          admin.initializeApp({ projectId });
        }
      }
    }

    if (admin.apps.length > 0) {
      const dbId = databaseId || undefined;
      console.log(`[Firestore] Project: ${projectId}, Database: ${dbId || "(default)"}`);
      db = getFirestore(admin.apps[0], dbId);
    }

    return db;
  } catch (error) {
    console.error("[Firebase] Fatal Initialization Error:", error);
    return null;
  }
};

// Start initialization early but don't crash the process if it fails
getDb();

async function verifyToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
}

async function verifyAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  const currentDb = getDb();
  if (!currentDb) {
    console.error("[Auth] verifyAdmin failed: Database not initialized");
    return res.status(500).json({ error: "Database not initialized" });
  }
  
  try {
    const userEmail = user.email || user.email_from_token || ''; // Handle potential variations in token structure
    console.log(`[Auth] Verifying admin status for user: ${user.uid} (${userEmail})`);
    
    // Explicitly allow owner email (case-insensitive)
    if (userEmail && userEmail.toLowerCase().trim() === 'bakolaypan@gmail.com') {
      console.log(`[Auth] Admin verified via email: ${userEmail}`);
      return next();
    }

    const profileSnap = await currentDb.collection("profiles").doc(user.uid).get();
    const profileData = profileSnap.data();
    if (profileSnap.exists && profileData?.role === "admin") {
      console.log(`[Auth] Admin verified via profile: ${user.uid}`);
      next();
    } else {
      console.warn(`[Auth] Access denied: User ${user.uid} (${userEmail}) is not an admin.`);
      return res.status(403).json({ 
        error: "Forbidden: Admins only", 
        details: `Role: ${profileData?.role || 'none'}, Email: ${userEmail}` 
      });
    }
  } catch (err: any) {
    console.error(`[Auth] Error verifying admin status for ${user.uid}:`, err);
    return res.status(500).json({ error: "Failed to verify admin status", message: err.message });
  }
}

const app = express();
const PORT = parseInt(process.env.PORT as string) || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Ensure local uploads/questions directory exists
const questionsUploadDir = path.join(process.cwd(), "uploads", "questions");
if (!fs.existsSync(questionsUploadDir)) {
  fs.mkdirSync(questionsUploadDir, { recursive: true });
}
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Request logger for debugging Vercel/Production issues
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[API Request] ${req.method} ${req.url}`);
  }
  next();
});

// API Routes

  // Health check
  app.get("/api/health", async (req, res) => {
    res.json({ 
      status: "ok", 
      db: db ? "online" : "offline",
      apps: admin.apps.length,
      config: {
        projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
        databaseId: process.env.FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || "(default)"
      },
      env: {
        hasGeminiKey: !!(process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY),
        hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL
      }
    });
  });

  // Translation endpoint
  app.post("/api/translate", verifyToken, async (req, res) => {
    const { questions, targetLang } = req.body;
    if (!questions || !targetLang) return res.status(400).json({ error: "Missing data" });

    // Safety fallback: If too many questions, don't crash, just return original
    if (!Array.isArray(questions) || questions.length > 100) {
      console.warn(`[API] Translation skipped: Too many questions (${questions?.length})`);
      return res.json(questions); 
    }

    try {
      if (!process.env.GOOGLE_GENAI_API_KEY && !process.env.GEMINI_API_KEY) {
        console.error("[API] Translation failed: No API key configured");
        return res.json(questions); // Fallback to English
      }

      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate this educational question array to ${targetLang}. Keep answer labels and formulas intact. Return ONLY valid JSON array: ${JSON.stringify(questions)}`,
        config: {
          systemInstruction: `You are an expert educational translator.
            Rules:
            1. Maintain EXACT JSON structure and keys.
            2. Keep mathematical formulas, technical terms, and placeholders unchanged.
            3. Provide the translation in the exact same index order.
            4. Output ONLY the raw JSON array. No markup or explanation.`,
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      
      try {
        const translated = JSON.parse(text.trim());
        res.json(translated);
      } catch (parseErr) {
        console.error("[API] Failed to parse translation JSON:", text);
        res.json(questions); // Fallback
      }
    } catch (error: any) {
      console.error("[API] Translation failed:", error);
      // fallback to original questions so student can still test
      res.json(questions);
    }
  });

  // Get test and questions (without correct answer)
  app.get("/api/test/:testId", verifyToken, async (req, res) => {
    const { testId } = req.params;
    console.log(`[API] Loading test: ${testId}`);

    const currentDb = getDb();
    if (!currentDb) {
      return res.status(503).json({ 
        success: false, 
        error: "Database offline", 
        message: "The database is currently initializing. Please try again in a few seconds." 
      });
    }
    
    try {
      const testSnap = await currentDb.collection("tests").doc(testId).get();
      if (!testSnap.exists) {
        return res.status(404).json({ success: false, error: "Test not found" });
      }
      
      const testData = { id: testSnap.id, ...testSnap.data() };
      
      const questionsSnap = await currentDb.collection("questions")
        .where("testId", "==", testId)
        .limit(200) // Safety limit to avoid huge responses/timeouts
        .get();
        
      const questions = questionsSnap.docs.map(doc => {
        const data = doc.data();
        // **STRIP correctAnswer**
        const { correctAnswer, ...safeData } = data;
        return { id: doc.id, ...safeData };
      });
      
      console.log(`[API] Successfully loaded ${questions.length} questions for test ${testId}`);
      res.json({ success: true, test: testData, questions });
    } catch (error: any) {
      console.error("[API] Failed to fetch test:", error);
      let clientMessage = "A server error occurred while fetching questions.";
      if (error && error.message && error.message.includes("default credentials")) {
         clientMessage = "CRITICAL SERVER ERROR: The backend cannot connect to the database because FIREBASE_SERVICE_ACCOUNT is missing in your Vercel Environment Variables.";
      }
      res.status(500).json({ 
        success: false, 
        error: "Failed to load mock test", 
        message: clientMessage,
        details: error.message || undefined 
      });
    }
  });

  // Submit test and score it
  app.post("/api/submit-test", verifyToken, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { testId, answers, timeTaken } = req.body; 
    const user = (req as any).user;

    if (!testId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Invalid submission data." });
    }
    
    try {
      const testSnap = await currentDb.collection("tests").doc(testId).get();
      if (!testSnap.exists) {
        return res.status(404).json({ error: "Test not found" });
      }
      const testData = testSnap.data();
      const posMarks = testData?.marksPerCorrect || 1;
      const negMarks = testData?.negativeMarks || 0.25;

      const questionsSnap = await currentDb.collection("questions").where("testId", "==", testId).get();
      const actualAnswers = new Map();
      const correctAnswersMap: Record<string, string> = {};

      questionsSnap.docs.forEach(doc => {
        const data = doc.data();
        actualAnswers.set(doc.id, data.correctAnswer);
        correctAnswersMap[doc.id] = data.correctAnswer;
      });
      
      let correct = 0;
      let wrong = 0;
      let unattempted = 0;
      let score = 0;
      const userAnswers: Record<string, string> = {};
      
      answers.forEach((ans: { id: string, selected: string }) => {
        const actual = actualAnswers.get(ans.id);
        userAnswers[ans.id] = ans.selected || "";
        if (!ans.selected) {
          unattempted++;
        } else if (actual === ans.selected) {
          correct++;
          score += posMarks;
        } else {
          wrong++;
          score -= negMarks;
        }
      });
      
      const missing = questionsSnap.size - answers.length;
      if (missing > 0) unattempted += missing;

      const totalQuestions = questionsSnap.size;
      const accuracy = totalQuestions > 0 ? ((correct / (correct + wrong || 1)) * 100).toFixed(1) : 0;

      const questionTimes = req.body.questionTimes || {};

      const resultData = {
        timestamp: Date.now(),
        userId: user.uid,
        testId: testId,
        testTitle: testData?.title || "Mock Test",
        score: parseFloat(score.toFixed(2)),
        correctAnswers: correct,
        wrongAnswers: wrong,
        unattempted: unattempted,
        totalQuestions: totalQuestions,
        accuracy: parseFloat(accuracy.toString()),
        timeTaken: timeTaken || "N/A",
        userAnswers,
        correctAnswersMap,
        questionTimes,
        status: "completed"
      };

      const profileRef = currentDb.collection("profiles").doc(user.uid);
      const resultDocRef = currentDb.collection("results").doc();

      await currentDb.runTransaction(async (transaction) => {
        const profileDoc = await transaction.get(profileRef);
        transaction.set(resultDocRef, resultData);
        
        if (profileDoc.exists) {
          const currentTests = profileDoc.data()?.totalTestsTaken || 0;
          const currentScore = profileDoc.data()?.cumulativeScore || 0;
          const newScore = parseFloat((currentScore + score).toFixed(2));
          
          transaction.update(profileRef, {
            totalTestsTaken: currentTests + 1,
            cumulativeScore: Math.max(0, newScore),
            lastTestAt: Date.now()
          });
        }
      });

      // Write mock_question_analysis documents in batch
      try {
        let studentName = "Student";
        const pSnap = await profileRef.get();
        if (pSnap.exists) {
          studentName = pSnap.data()?.name || "Student";
        }

        const analysisBatch = currentDb.batch();
        questionsSnap.docs.forEach(doc => {
          const qId = doc.id;
          const selected = userAnswers[qId] || "";
          const correctAns = correctAnswersMap[qId] || "";
          const isCorr = selected === correctAns;
          const timeSpent = questionTimes[qId] || 0;

          // Write to SQLite Database
          try {
            insertMockQuestionAnalysis(
              user.uid,
              testId,
              qId,
              selected,
              correctAns,
              isCorr ? 1 : 0,
              timeSpent
            );
          } catch (sqliteErr) {
            console.error("[SQLite] Error saving question analysis:", sqliteErr);
          }

          const analysisRef = currentDb.collection("mock_question_analysis").doc();
          analysisBatch.set(analysisRef, {
            userId: user.uid,
            studentId: user.uid,
            studentName,
            testId,
            testTitle: testData?.title || "Mock Test",
            questionId: qId,
            qNo: doc.data().qNo || 1,
            selectedAnswer: selected,
            correctAnswer: correctAns,
            isCorrect: isCorr,
            timeTakenSeconds: timeSpent,
            attemptedAt: Date.now()
          });
        });
        await analysisBatch.commit();
      } catch (batchErr) {
        console.error("Batch write to mock_question_analysis failed:", batchErr);
      }

      let rank = 1;
      try {
        const updatedProfileSnap = await profileRef.get();
        const totalScore = updatedProfileSnap.data()?.cumulativeScore || 0;
        const rankSnap = await currentDb.collection("profiles")
          .where("cumulativeScore", ">", totalScore)
          .count()
          .get();
        rank = rankSnap.data().count + 1;
        profileRef.update({ globalRank: rank }).catch(() => {});
      } catch (err) {}

      const analysis: Record<string, string> = {};
      actualAnswers.forEach((val, key) => {
        analysis[key] = val;
      });

      res.json({ ...resultData, rank, analysis });
    } catch (error: any) {
      console.error("[API] Failed to submit test:", error);
      res.status(500).json({ error: "Failed to submit test results" });
    }
  });

  // Demo endpoint to become an admin
  app.post("/api/become-admin", verifyToken, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "DB offline" });
    const user = (req as any).user;
    try {
      await currentDb.collection("profiles").doc(user.uid).update({ role: "admin" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to become admin" });
    }
  });

  // Auth Helpers for students
  app.post("/api/auth/check-mobile", async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) {
      console.error("[Auth] check-mobile failed: Database offline");
      return res.status(503).json({ error: "System is initializing. Please wait a moment." });
    }
    const { mobile } = req.body || {};
    if (!mobile) return res.status(400).json({ error: "Mobile number is required" });
    
    try {
      const digitsOnly = String(mobile).replace(/\D/g, '');
      const cleanMobile = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
      
      if (cleanMobile.length < 10) {
        return res.status(400).json({ error: "Invalid mobile number." });
      }

      const snap = await currentDb.collection("profiles").where("phoneNumber", "==", cleanMobile).get();
      res.json({ exists: !snap.empty });
    } catch (error: any) {
      console.error("[Auth] Mobile check error:", error);
      res.status(500).json({ error: "Failed to verify mobile number." });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "System error" });
    const { mobile, newPassword } = req.body;
    if (!mobile || !newPassword) return res.status(400).json({ error: "Missing data" });
    
    try {
      const digitsOnly = mobile.toString().replace(/\D/g, '');
      const cleanMobile = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
      const snap = await currentDb.collection("profiles").where("phoneNumber", "==", cleanMobile).get();
      if (snap.empty) return res.status(404).json({ error: "No account found." });
      
      const userId = snap.docs[0].id;
      await admin.auth().updateUser(userId, { password: newPassword });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to reset password." });
    }
  });

  // Admin: Get all students
  app.get("/api/admin/students", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      // Query both 'user' and 'student' roles as they might have been created differently
      const snap = await currentDb.collection("profiles").where("role", "in", ["user", "student"]).get();
      const students = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      res.json(students);
    } catch (error) {
      console.error("[Admin] Failed to fetch students:", error);
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  // Admin: Get all student analysis aggregates
  app.get("/api/admin/student-analysis", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });

    try {
      // Load all students
      const profilesSnap = await currentDb.collection("profiles")
        .where("role", "in", ["user", "student"])
        .get();

      const studentsData = await Promise.all(profilesSnap.docs.map(async (doc) => {
        const profile = doc.data();
        
        // Fetch all results (attempts) for this student to compute total attempts & avg marks
        const resultsSnap = await currentDb.collection("results")
          .where("userId", "==", doc.id)
          .get();

        const totalAttempts = resultsSnap.size;
        let cumulativeScore = 0;
        resultsSnap.docs.forEach(r => {
          cumulativeScore += r.data().score || 0;
        });

        const avgMarks = totalAttempts > 0 ? parseFloat((cumulativeScore / totalAttempts).toFixed(1)) : 0;

        return {
          id: doc.id,
          name: profile.name || "Student",
          phoneNumber: profile.phoneNumber || "N/A",
          email: profile.email || "N/A",
          registrationDate: profile.createdAt || profile.registrationDate || Date.now(),
          courseName: profile.courseName || "General Aptitude",
          totalTestsTaken: totalAttempts,
          avgMarks: avgMarks,
          status: profile.status || "active"
        };
      }));

      // Filter only active students (status = 'active')
      const activeStudents = studentsData.filter(s => s.status === 'active');

      return res.json({ students: activeStudents });
    } catch (err: any) {
      console.error("[student-analysis] failed:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Admin: Get Student's Test Attempts
  app.get("/api/admin/student-attempts/:studentId", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { studentId } = req.params;

    try {
      const snap = await currentDb.collection("results")
        .where("userId", "==", studentId)
        .orderBy("timestamp", "desc")
        .get();

      const attempts = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          testTitle: data.testTitle || "Mock Test",
          createdAt: data.timestamp || Date.now(),
          score: data.score || 0,
          accuracy: data.accuracy || 0,
          timeTaken: data.timeTakenStr || (typeof data.timeTaken === "number" ? data.timeTaken : parseInt(data.timeTaken) || 0),
          totalQuestions: data.totalQuestions || 0
        };
      });

      return res.json({ attempts });
    } catch (err: any) {
      console.error("[student-attempts] failed:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Admin: Get Detailed Test Attempt Analysis
  app.get("/api/admin/test-attempt-analysis/:attemptId", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { attemptId } = req.params;

    try {
      const resultSnap = await currentDb.collection("results").doc(attemptId).get();
      if (!resultSnap.exists) {
        return res.status(404).json({ error: "Attempt not found" });
      }
      const attemptData = resultSnap.data() || {};
      const testId = attemptData.testId;
      const userAnswers = attemptData.userAnswers || {};
      const correctAnswersMap = attemptData.correctAnswersMap || {};
      const questionTimes = attemptData.questionTimes || {};

      // Get questions for this test to display question details and subject analysis
      const questionsSnap = await currentDb.collection("questions").where("testId", "==", testId).get();
      
      const questions = questionsSnap.docs.map((doc, idx) => {
        const qData = doc.data();
        const qId = doc.id;
        const studentAns = userAnswers[qId] || "";
        const correctAns = correctAnswersMap[qId] || qData.correctAnswer || "";
        const isCorrect = studentAns === correctAns;
        const timeTaken = questionTimes[qId] || 0;

        return {
          questionNo: qData.qNo || (idx + 1),
          subject: qData.subject || qData.subjectName || "General",
          studentAnswer: studentAns,
          correctAnswer: correctAns,
          isCorrect,
          timeTaken
        };
      }).sort((a, b) => a.questionNo - b.questionNo);

      return res.json({ questions });
    } catch (err: any) {
      console.error("[attempt-analysis] failed:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Admin: Update Student
  app.put("/api/admin/students/:studentId", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { studentId } = req.params;
    const { name, phoneNumber, status, password } = req.body;
    
    if (!studentId) return res.status(400).json({ error: "Missing student ID" });

    try {
      const updateData: any = { 
        name, 
        phoneNumber, 
        status: status || 'active', 
        updatedAt: Date.now() 
      };
      
      // Update Firestore profile
      const profileRef = currentDb.collection("profiles").doc(studentId);
      const profileSnap = await profileRef.get();
      
      if (!profileSnap.exists) {
        // If profile doesn't exist, we might want to create it or at least check Auth
        console.warn(`[Admin] Profile ${studentId} not found in Firestore during update`);
      } else {
        await profileRef.update(updateData);
      }
      
      // Update Firebase Auth if password or mobile changed (mobile is used for pseudo-email)
      const authUpdates: any = {};
      if (password && password.trim().length >= 6) {
        authUpdates.password = password;
      }
      if (phoneNumber) {
        authUpdates.email = `${phoneNumber}@students.myapp.com`;
        authUpdates.displayName = name;
      }
      
      if (Object.keys(authUpdates).length > 0) {
        await admin.auth().updateUser(studentId, authUpdates);
        console.log(`[Admin] Updated Auth records for ${studentId}`);
      }
      
      res.json({ success: true, message: "Student record updated" });
    } catch (error: any) {
      console.error(`[Admin] Update failed for ${studentId}:`, error);
      res.status(500).json({ error: "Failed to update student", details: error.message });
    }
  });

  // Admin: Delete Student
  app.delete("/api/admin/students/:studentId", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { studentId } = req.params;
    try {
      // 1. Delete from Auth
      await admin.auth().deleteUser(studentId);
      // 2. Delete from Firestore
      await currentDb.collection("profiles").doc(studentId).delete();
      // 3. Optional: Delete results?
      const resultsSnap = await currentDb.collection("results").where("userId", "==", studentId).get();
      const batch = currentDb.batch();
      resultsSnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete student" });
    }
  });

  // Admin: Dashboard Stats
  app.get("/api/admin/stats", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const allProfiles = await currentDb.collection("profiles").where("role", "in", ["user", "student"]).get();
      
      const stats = {
        total: allProfiles.size,
        active: 0,
        blocked: 0,
        today: 0
      };

      const todayStart = new Date().setHours(0, 0, 0, 0);

      allProfiles.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'blocked') stats.blocked++;
        else stats.active++;

        const regDate = data.registrationDate ? new Date(data.registrationDate).getTime() : 0;
        if (regDate >= todayStart) stats.today++;
      });

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Admin Routes
  app.post("/api/admin/create-test", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const { title, topic, isActive, duration, testType, subjectName, category, marksPerCorrect, negativeMarks } = req.body;
      const ref = currentDb.collection("tests").doc();
      await ref.set({
        title,
        topic,
        subjectName: subjectName || "",
        category: category || "",
        testType: testType || 'topic',
        duration: duration || 30, 
        marksPerCorrect: marksPerCorrect || 1,
        negativeMarks: negativeMarks || 0,
        isActive: !!isActive,
        createdAt: Date.now()
      });
      res.json({ id: ref.id, title, topic, testType, isActive, duration, subjectName, category });
    } catch (error) {
       console.error(error);
       res.status(500).json({ error: "Failed to create test" });
    }
  });

  app.post("/api/admin/bulk-create-tests", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { tests } = req.body;
    if (!Array.isArray(tests)) return res.status(400).json({ error: "Expected array of tests" });

    try {
      const batch = currentDb.batch();
      tests.forEach(test => {
        const docRef = currentDb!.collection("tests").doc();
        const testId = docRef.id;
        batch.set(docRef, {
          ...test,
          isActive: true,
          createdAt: Date.now()
        });

        // Add 10 placeholder questions for each test
        for (let i = 1; i <= 10; i++) {
          const qRef = currentDb!.collection("questions").doc();
          batch.set(qRef, {
            testId: testId,
            questionText: `Sample Question ${i} for ${test.title}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: "Option A",
            explanation: "Placeholder explanation",
            marks: 1,
            createdAt: Date.now()
          });
        }
      });
      await batch.commit();
      res.json({ success: true, count: tests.length });
    } catch (error) {
      console.error("[Admin] Bulk create failed:", error);
      res.status(500).json({ error: "Failed to create tests in bulk" });
    }
  });

  app.put("/api/admin/tests/:testId", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const { testId } = req.params;
      const { title, topic, isActive, duration, testType, subjectName, category, marksPerCorrect, negativeMarks } = req.body;
      const updateData: any = {
        title,
        topic,
        subjectName: subjectName || "",
        category: category || "",
        duration: duration || 30,
        marksPerCorrect: marksPerCorrect || 1,
        negativeMarks: negativeMarks || 0,
        isActive: !!isActive
      };
      if (testType) updateData.testType = testType;
      await currentDb.collection("tests").doc(testId).update(updateData);
      res.json({ success: true });
    } catch (error) {
       console.error(error);
       res.status(500).json({ error: "Failed to update test" });
    }
  });

  app.post("/api/admin/questions/upload-image", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const { base64Data, fileName } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: "Missing base64 data" });
      }

      // Check image size (limit to 3mb)
      const base64Content = base64Data.split(",")[1] || base64Data;
      const buffer = Buffer.from(base64Content, "base64");
      if (buffer.length > 3 * 1024 * 1024) {
        return res.status(400).json({ error: "Image exceeds 3MB limit" });
      }

      // Verify extension (png, jpg, jpeg, webp)
      const ext = path.extname(fileName || "image.png").toLowerCase() || ".png";
      if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
        return res.status(400).json({ error: "Invalid file extension. Only PNG, JPG, and WEBP allowed." });
      }

      const generatedName = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
      const uploadPath = path.join(process.cwd(), "uploads", "questions", generatedName);

      fs.writeFileSync(uploadPath, buffer);

      res.json({ success: true, imageUrl: `/uploads/questions/${generatedName}` });
    } catch (err: any) {
      console.error("[upload-image] failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/questions", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const { 
        testId, topic, qNo, questionText, questionEquation, questionImage,
        options, optionEquations, optionImages, correctAnswer, difficulty, category, solution 
      } = req.body;
      const ref = currentDb.collection("questions").doc();
      await ref.set({
        testId, 
        topic: topic || "", 
        qNo, 
        questionText, 
        questionEquation: questionEquation || "",
        questionImage: questionImage || "",
        options: options || [], 
        optionEquations: optionEquations || ["", "", "", ""],
        optionImages: optionImages || ["", "", "", ""],
        correctAnswer, 
        difficulty: difficulty || "easy",
        category: category || "mock",
        solution: solution || ""
      });
      res.json({ id: ref.id });
    } catch (error) {
       console.error(error);
       res.status(500).json({ error: "Failed to create question" });
    }
  });

  app.put("/api/admin/questions/:questionId", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const { questionId } = req.params;
      const { 
        topic, questionText, questionEquation, questionImage,
        options, optionEquations, optionImages, correctAnswer, difficulty, category, solution 
      } = req.body;
      await currentDb.collection("questions").doc(questionId).update({
        topic: topic || "", 
        questionText, 
        questionEquation: questionEquation || "",
        questionImage: questionImage || "",
        options: options || [], 
        optionEquations: optionEquations || ["", "", "", ""],
        optionImages: optionImages || ["", "", "", ""],
        correctAnswer, 
        difficulty: difficulty || "easy",
        category: category || "mock",
        solution: solution || ""
      });
      res.json({ success: true });
    } catch (error) {
       console.error(error);
       res.status(500).json({ error: "Failed to update question" });
    }
  });
  
  app.delete("/api/admin/questions/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { id } = req.params;
    console.log(`[Admin] Request to delete question: ${id} by ${(req as any).user?.email}`);
    if (!id) return res.status(400).json({ error: "Missing question ID" });
    try {
      await currentDb.collection("questions").doc(id).delete();
      console.log(`[Admin] Successfully deleted question: ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[Admin] Error deleting question ${id}:`, error);
      res.status(500).json({ error: "Failed to delete question", message: error.message });
    }
  });

  app.delete("/api/admin/pyqs/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { id } = req.params;
    console.log(`[Admin] Request to delete pyq: ${id} by ${(req as any).user?.email}`);
    if (!id) return res.status(400).json({ error: "Missing PYQ ID" });
    try {
      await currentDb.collection("pyqs").doc(id).delete();
      console.log(`[Admin] Successfully deleted pyq: ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[Admin] Error deleting pyq ${id}:`, error);
      res.status(500).json({ error: "Failed to delete pyq", message: error.message });
    }
  });

  app.delete("/api/admin/patterns/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { id } = req.params;
    console.log(`[Admin] Request to delete pattern: ${id} by ${(req as any).user?.email}`);
    if (!id) return res.status(400).json({ error: "Missing pattern ID" });
    try {
      await currentDb.collection("patterns").doc(id).delete();
      console.log(`[Admin] Successfully deleted pattern: ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[Admin] Error deleting pattern ${id}:`, error);
      res.status(500).json({ error: "Failed to delete pattern", message: error.message });
    }
  });

  app.delete("/api/admin/carousel/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) {
      console.error("[Admin] DB offline during carousel delete");
      return res.status(500).json({ error: "DB offline" });
    }
    const { id } = req.params;
    console.log(`[Admin] Request to delete carousel item: ${id} by user: ${(req as any).user?.email}`);
    try {
      if (!id || id === 'undefined') {
        console.error(`[Admin] Invalid ID provided for carousel delete: ${id}`);
        return res.status(400).json({ error: "Invalid ID" });
      }
      const docRef = currentDb.collection("carousel").doc(id);
      const snap = await docRef.get();
      if (!snap.exists) {
        console.warn(`[Admin] Carousel item ${id} not found in DB - attempting deletion anyway`);
      }
      await docRef.delete();
      console.log(`[Admin] Successfully deleted carousel item: ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[Admin] Error deleting carousel item ${id}:`, error);
      res.status(500).json({ error: "Failed to delete carousel", message: error.message });
    }
  });

  app.delete("/api/admin/notes/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { id } = req.params;
    console.log(`[Admin] Request to delete note: ${id} by ${(req as any).user?.email}`);
    if (!id) return res.status(400).json({ error: "Missing note ID" });
    try {
      await currentDb.collection("notes").doc(id).delete();
      console.log(`[Admin] Successfully deleted note: ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[Admin] Error deleting note ${id}:`, error);
      res.status(500).json({ error: "Failed to delete note", message: error.message });
    }
  });

  app.delete("/api/admin/videos/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { id } = req.params;
    console.log(`[Admin] Request to delete video: ${id} by ${(req as any).user?.email}`);
    if (!id) return res.status(400).json({ error: "Missing video ID" });
    try {
      await currentDb.collection("videos").doc(id).delete();
      console.log(`[Admin] Successfully deleted video: ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[Admin] Error deleting video ${id}:`, error);
      res.status(500).json({ error: "Failed to delete video", message: error.message });
    }
  });

  app.delete("/api/admin/affairs/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing ID" });
    try {
      await currentDb.collection("affairs").doc(id).delete();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete current affair", message: error.message });
    }
  });

  app.delete("/api/admin/practice_sets/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing ID" });
    try {
      await currentDb.collection("practice_sets").doc(id).delete();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete practice set", message: error.message });
    }
  });

  app.delete("/api/admin/tests/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { id } = req.params;
    console.log(`Server: START delete request for test ${id} by ${(req as any).user?.email}`);
    
    if (!id || id === 'undefined') {
      console.error(`Server: Invalid ID provided for test delete: ${id}`);
      return res.status(400).json({ error: "Invalid test ID" });
    }

    try {
      const testRef = currentDb.collection("tests").doc(id);
      const testSnap = await testRef.get();
      
      if (!testSnap.exists) {
        console.warn(`Server: Test ${id} not found in DB - checking for orphaned questions`);
        // We continue anyway to clean up questions if they exist
      }

      // Delete all questions associated with this test
      console.log(`Server: Searching for questions with testId ${id}`);
      const questionsSnap = await currentDb.collection("questions").where("testId", "==", id).get();
      const batch = currentDb.batch();
      console.log(`Server: Found ${questionsSnap.size} questions to delete for test ${id}`);
      
      questionsSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete the test itself
      console.log(`Server: Adding test ${id} to batch deletion`);
      batch.delete(testRef);
      
      console.log(`Server: Attempting to commit batch for test ${id}`);
      await batch.commit();
      console.log(`Server: SUCCESS - Deleted test ${id} and all associated items`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Server: ERROR deleting test ${id}:`, error);
      res.status(500).json({ error: "Failed to delete test", message: error.message });
    }
  });

  // PDF Download: Get all questions for a test
  app.get("/api/test-questions/:testId", verifyToken, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { testId } = req.params;
    try {
      const questionsSnap = await currentDb.collection("questions").where("testId", "==", testId).orderBy("qNo", "asc").get();
      
      // Fetch dynamic statistics from mock_question_analysis collection
      const allAnalysisSnap = await currentDb.collection("mock_question_analysis").where("testId", "==", testId).get();
      const questionStats: Record<string, { correct: number, total: number }> = {};
      allAnalysisSnap.docs.forEach(doc => {
        const data = doc.data();
        const qId = data.questionId;
        if (!questionStats[qId]) {
          questionStats[qId] = { correct: 0, total: 0 };
        }
        questionStats[qId].total++;
        if (data.isCorrect === true || data.isCorrect === 1) {
          questionStats[qId].correct++;
        }
      });

      const questions = questionsSnap.docs.map(doc => {
        const qData = doc.data();
        const qId = doc.id;
        const stats = questionStats[qId];
        const percent = stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 100;
        
        let difficulty = "Easy";
        if (percent < 40) difficulty = "Hard";
        else if (percent < 75) difficulty = "Moderate";

        return {
          id: qId,
          ...qData,
          successPercentage: percent,
          difficulty
        };
      });

      res.json({ questions });
    } catch (err: any) {
      console.error("Failed to fetch questions with statistics:", err);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // Admin: Get Category Order
  app.get("/api/category-order", async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "DB offline" });
    try {
      const snap = await currentDb.collection("settings").doc("category_order").get();
      if (snap.exists) {
        res.json(snap.data());
      } else {
        res.json({ order: [] });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch category order" });
    }
  });

  // Admin: Update Category Order
  app.post("/api/admin/category-order", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "DB offline" });
    const { order } = req.body;
    try {
      await currentDb.collection("settings").doc("category_order").set({ order });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update category order" });
    }
  });

  // ----------------------------------------------------
  // CUSTOM CATEGORIES ROUTES
  // ----------------------------------------------------

  // Get all active custom categories (Public)
  app.get("/api/custom-categories", async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "DB offline" });
    try {
      const snap = await currentDb.collection("custom_categories").where("status", "==", 1).get();
      const categories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, categories });
    } catch (err: any) {
      console.error("Failed to fetch custom categories:", err);
      res.status(500).json({ error: "Failed to fetch custom categories" });
    }
  });

  // Get all custom categories (Admin - including inactive ones)
  app.get("/api/admin/custom-categories", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "DB offline" });
    try {
      const snap = await currentDb.collection("custom_categories").get();
      const categories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ success: true, categories });
    } catch (err: any) {
      console.error("Failed to fetch admin custom categories:", err);
      res.status(500).json({ error: "Failed to fetch custom categories" });
    }
  });

  // Create new custom category (Admin)
  app.post("/api/admin/custom-categories", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "DB offline" });
    const { categoryName, categoryType, icon, colorTheme, status } = req.body;
    if (!categoryName || !categoryType) {
      return res.status(400).json({ error: "Category name and type are required." });
    }
    try {
      const docRef = await currentDb.collection("custom_categories").add({
        categoryName,
        categoryType,
        icon: icon || "Layers",
        colorTheme: colorTheme || "linear-gradient(135deg, #4facfe, #00f2fe)",
        status: status !== undefined ? Number(status) : 1,
        createdAt: Date.now()
      });
      res.json({ success: true, id: docRef.id });
    } catch (err: any) {
      console.error("Failed to create custom category:", err);
      res.status(500).json({ error: "Failed to create custom category" });
    }
  });

  // Update custom category (Admin)
  app.put("/api/admin/custom-categories/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "DB offline" });
    const { id } = req.params;
    const { categoryName, categoryType, icon, colorTheme, status } = req.body;
    try {
      const docRef = currentDb.collection("custom_categories").doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: "Category not found." });
      }
      
      const updateData: any = {};
      if (categoryName !== undefined) updateData.categoryName = categoryName;
      if (categoryType !== undefined) updateData.categoryType = categoryType;
      if (icon !== undefined) updateData.icon = icon;
      if (colorTheme !== undefined) updateData.colorTheme = colorTheme;
      if (status !== undefined) updateData.status = Number(status);

      await docRef.update(updateData);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to update custom category:", err);
      res.status(500).json({ error: "Failed to update custom category" });
    }
  });

  // Delete custom category (Admin)
  app.delete("/api/admin/custom-categories/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "DB offline" });
    const { id } = req.params;
    try {
      const docRef = currentDb.collection("custom_categories").doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: "Category not found." });
      }
      await docRef.delete();
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to delete custom category:", err);
      res.status(500).json({ error: "Failed to delete custom category" });
    }
  });

  // ==========================================
  // TYPING TEST API ROUTES
  // ==========================================

  // --- Student APIs ---

  // Get all active typing tests
  app.get("/api/typing-tests", verifyToken, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const snap = await currentDb.collection("typing_tests").where("isActive", "==", true).get();
      const tests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Don't send full paragraph to list view if we don't want to, but it's okay for now
      res.json(tests);
    } catch (error) {
      console.error("[API] Failed to fetch typing tests", error);
      res.status(500).json({ error: "Failed to fetch typing tests" });
    }
  });

  // Get a specific typing test
  app.get("/api/typing-test/:id", verifyToken, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { id } = req.params;
    try {
      const docSnap = await currentDb.collection("typing_tests").doc(id).get();
      if (!docSnap.exists) return res.status(404).json({ error: "Test not found" });
      res.json({ id: docSnap.id, ...docSnap.data() });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch typing test" });
    }
  });

  // Submit typing test result
  app.post("/api/typing-test/submit", verifyToken, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const user = (req as any).user;
    const { testId, typedText, wpm, accuracy, errors, correctWords, wrongWords, timeTakenMinutes } = req.body;

    if (!testId || wpm === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Validate test exists
      const testSnap = await currentDb.collection("typing_tests").doc(testId).get();
      if (!testSnap.exists) {
        return res.status(404).json({ error: "Typing test not found" });
      }
      
      const testData = testSnap.data();

      // Fetch previous attempts to calculate attempt number
      const prevAttemptsSnap = await currentDb.collection("typing_results")
        .where("userId", "==", user.uid)
        .where("testId", "==", testId)
        .get();

      // Calculate attempt number securely by finding the max attempt number
      let attemptNo = 1;
      if (prevAttemptsSnap.size > 0) {
        const attempts = prevAttemptsSnap.docs.map(doc => doc.data().attemptNo || doc.data().attempt_no || 0);
        attemptNo = Math.max(...attempts, 0) + 1;
      }

      // Save result with both camelCase and snake_case properties to satisfy all database contract requests
      const resultData = {
        userId: user.uid,
        student_id: user.uid,
        testId,
        test_id: testId,
        attemptNo,
        attempt_no: attemptNo,
        testTitle: testData?.title || "Unknown Test",
        originalParagraph: testData?.paragraph || "",
        original_text: testData?.paragraph || "",
        typedText: typedText || "",
        typed_text: typedText || "",
        wpm: Number(wpm),
        accuracy: Number(accuracy),
        errors: Number(errors),
        correctWords: Number(correctWords),
        correct_words: Number(correctWords),
        wrongWords: Number(wrongWords),
        wrong_words: Number(wrongWords),
        timeTakenMinutes: Number(timeTakenMinutes),
        duration: Number(testData?.duration || 5),
        timestamp: Date.now(),
        completed_at: new Date().toISOString()
      };

      const docRef = await currentDb.collection("typing_results").add(resultData);
      
      res.json({ success: true, resultId: docRef.id, result: resultData });
    } catch (error) {
      console.error("[API] Failed to submit typing test result", error);
      res.status(500).json({ error: "Failed to submit result" });
    }
  });

  // Get all results for the logged-in student
  app.get("/api/typing-results/student", verifyToken, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const user = (req as any).user;
    try {
      const snap = await currentDb.collection("typing_results")
        .where("userId", "==", user.uid)
        .orderBy("timestamp", "desc")
        .get();
      const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(results);
    } catch (error) {
      console.error("[API] Failed to fetch student typing results", error);
      res.status(500).json({ error: "Failed to fetch typing results" });
    }
  });

  // Get specific typing test result (with access check)
  app.get("/api/typing-result/:id", verifyToken, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const user = (req as any).user;
    const { id } = req.params;
    try {
      const docSnap = await currentDb.collection("typing_results").doc(id).get();
      if (!docSnap.exists) return res.status(404).json({ error: "Result not found" });
      const data = docSnap.data();

      // Check if it belongs to current student, or if user is admin
      if (data?.userId !== user.uid && user.email?.toLowerCase() !== 'bakolaypan@gmail.com') {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json({ id: docSnap.id, ...data });
    } catch (error) {
      console.error("[API] Failed to fetch specific typing result", error);
      res.status(500).json({ error: "Failed to fetch typing result" });
    }
  });

  // --- Admin APIs ---

  // Add new typing test
  app.post("/api/admin/typing-test", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const { title, paragraph, duration, difficulty, language, isActive } = req.body;
      const ref = currentDb.collection("typing_tests").doc();
      await ref.set({
        title: title || "",
        paragraph: paragraph || "",
        duration: Number(duration) || 5, // in minutes
        difficulty: difficulty || "Easy",
        language: language || "English",
        isActive: isActive !== false,
        createdAt: Date.now()
      });
      res.json({ id: ref.id, success: true });
    } catch (error) {
      console.error("[Admin API] Failed to add typing test", error);
      res.status(500).json({ error: "Failed to add typing test" });
    }
  });

  // Update typing test
  app.put("/api/admin/typing-test/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const { id } = req.params;
      const { title, paragraph, duration, difficulty, language, isActive } = req.body;
      await currentDb.collection("typing_tests").doc(id).update({
        title,
        paragraph,
        duration: Number(duration),
        difficulty,
        language,
        isActive: !!isActive
      });
      res.json({ success: true });
    } catch (error) {
      console.error("[Admin API] Failed to update typing test", error);
      res.status(500).json({ error: "Failed to update typing test" });
    }
  });

  // Delete typing test
  app.delete("/api/admin/typing-test/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const { id } = req.params;
      await currentDb.collection("typing_tests").doc(id).delete();
      // Optional: Delete associated results
      const resultsSnap = await currentDb.collection("typing_results").where("testId", "==", id).get();
      const batch = currentDb.batch();
      resultsSnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete typing test" });
    }
  });

  // Get all typing results
  app.get("/api/admin/typing-results", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const snap = await currentDb.collection("typing_results").orderBy("timestamp", "desc").get();
      const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // We should ideally fetch student names, but doing it in a batch
      const userIds = [...new Set(results.map(r => (r as any).userId))];
      const profilesMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        // Handle firestore IN limits (10 max)
        for (let i = 0; i < userIds.length; i += 10) {
          const chunk = userIds.slice(i, i + 10);
          const profilesSnap = await currentDb.collection("profiles").where("__name__", "in", chunk).get();
          profilesSnap.docs.forEach(p => {
             profilesMap[p.id] = p.data().name || "Unknown Student";
          });
        }
      }
      
      const enrichedResults = results.map(r => ({
        ...r,
        studentName: profilesMap[(r as any).userId as string] || "Unknown Student"
      }));
      
      res.json(enrichedResults);
    } catch (error) {
      console.error("[Admin API] Failed to fetch typing results", error);
      res.status(500).json({ error: "Failed to fetch typing results" });
    }
  });

  // Seed 15 typing tests
  app.post("/api/admin/seed-typing-tests", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const dummyTests = [
        // 1 Minute tests
        { title: "Standard Easy Test (1 Min)", duration: 1, difficulty: "Easy", paragraph: "Technology is becoming a very important part of daily life. People use mobile phones, computers, and the internet for communication, education, shopping, and entertainment. Students can learn new skills online and attend classes from home. Offices use computers to store data and complete work quickly. Doctors use technology to help patients and maintain medical records." },
        { title: "Short Medium Challenge (1 Min)", duration: 1, difficulty: "Medium", paragraph: "Typing tests assess efficiency and visual concentration. To succeed in competitive exams, you must practice key positions daily, minimize spelling mistakes, and build robust finger muscle memory." },
        
        // 2 Minute tests
        { title: "Standard Medium Test (2 Min)", duration: 2, difficulty: "Medium", paragraph: "Electricity distribution systems require regular maintenance and monitoring. Engineers and field workers coordinate together to ensure uninterrupted power supply to consumers and business establishments across urban areas." },
        { title: "Short Hard Challenge (2 Min)", duration: 2, difficulty: "Hard", paragraph: "Quantum mechanics dictates the behavior of subatomic particles through wave-particle duality. The mathematical framework depends upon wave functions, eigenvalues, and mathematical operators that diverge from classical physics." },
        
        // 3 Minute tests
        { title: "Standard Hard Test (3 Min)", duration: 3, difficulty: "Hard", paragraph: "Cryptographic algorithms secure modern communication channels by utilizing asymmetric public key infrastructure. Encryption and decryption procedures rely on mathematical principles such as modular arithmetic, prime factorization, and complex elliptical curve coordinates to prevent unauthorized eavesdropping." },
        { title: "Easy Paragraph Speed (3 Min)", duration: 3, difficulty: "Easy", paragraph: "Reading books expands the mind and builds a strong vocabulary. Every page offers unique lessons, new ideas, and fascinating stories from different cultures. Establishing a daily reading habit improves cognitive function, enhances personal creativity, and reduces mental stress naturally." },

        // 5 Minute tests
        { title: "Standard Easy Test (5 Min)", duration: 5, difficulty: "Easy", paragraph: "Developing proper posture is crucial for long-term keyboard usage. Keep your wrists straight, your elbows at a ninety-degree angle, and sit with your back fully supported by a high-quality office chair. Take frequent short breaks to stretch your fingers, hands, and shoulders to prevent strain during long periods of work." },
        { title: "Medium Exam Style (5 Min)", duration: 5, difficulty: "Medium", paragraph: "The evolutionary trajectory of global communication systems has entered an unprecedented era of high-speed connectivity. Digital platforms allow instant information transfer across continental distances, fostering collaborative remote working environments and international trading channels. Adapting to this virtual ecosystem is necessary for modern corporate success." },
        { title: "Hard Exam Challenge (5 Min)", duration: 5, difficulty: "Hard", paragraph: "Socioeconomic paradigm shifts are often catalyzed by rapid industrial digitization. Innovative technological infrastructures revolutionize mechanical pipelines, optimize supply distribution chains, and establish completely new financial ecosystems. However, these changes introduce substantial compliance challenges regarding data privacy regulations and security audits." },

        // 10 Minute tests
        { title: "10-Minute Endurance Test (Easy)", duration: 10, difficulty: "Easy", paragraph: "The quick brown fox jumps over the lazy dog. This sentence contains every single letter in the English alphabet and is frequently utilized to test typewriter keys and computer keyboards. Because it includes all characters from A to Z, it is a perfect pangram for practicing fluid typing motions. Practicing with pangrams ensures complete familiarity with all letter locations across the QWERTY layout. Consistently repeating this sentence helps build typing speed, finger rhythm, and accuracy. Over time, muscle memory takes over, allowing you to type without looking at the keys." },
        { title: "10-Minute Endurance Test (Medium)", duration: 10, difficulty: "Medium", paragraph: "Developing a robust software application requires careful planning and coordination throughout the development life cycle. The process begins with structured requirements gathering, followed by architectural design, frontend and backend implementation, comprehensive unit testing, staging deployment, and ongoing system maintenance. Each phase plays a vital role in ensuring the final software product meets stakeholder expectations, operates reliably under load, and maintains strict security standards against potential external threats. Regular code reviews and automated testing pipelines are highly recommended." },
        { title: "10-Minute Endurance Test (Hard)", duration: 10, difficulty: "Hard", paragraph: "In accordance with the regulatory compliance standards established under Section Forty-Two of the Environmental Quality and Resource Conservation Act of Twenty-Twenty-Three, all commercial enterprises operating within the designated special economic zones must submit their finalized greenhouse gas emission declarations and environmental impact assessments before the absolute deadline of November thirtieth. Failure to satisfy these legal guidelines will inevitably result in severe regulatory penalties, including substantial financial fines, suspension of business permits, or complete closure of operations as determined by the executive oversight committee." }
      ];

      const batch = currentDb.batch();
      dummyTests.forEach(test => {
        const docRef = currentDb.collection("typing_tests").doc();
        batch.set(docRef, {
          ...test,
          language: "English",
          isActive: true,
          createdAt: Date.now()
        });
      });
      await batch.commit();

      res.json({ success: true, message: "Successfully seeded 10 typing tests" });
    } catch (error) {
      console.error("[Admin API] Failed to seed typing tests", error);
      res.status(500).json({ error: "Failed to seed typing tests" });
    }
  });

  // --- API ROUTE CATCH-ALL ---
  // This ensures that any unmatched /api/* request returns JSON, not HTML
  app.all("/api/*", (req, res) => {
    console.warn(`[API 404] Unmatched route: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: "API Route Not Found", 
      method: req.method,
      path: req.url 
    });
  });

  // Global Error Handler for API
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled API Error:", err);
    if (res.headersSent) return next(err);
    if (req.path.startsWith('/api/')) {
       res.status(500).json({ success: false, error: "Internal Server Error", message: "A server-side error occurred." });
    } else {
       next(err);
    }
  });

// Vite Integration
async function startVite() {
  try {
    if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
      // Dynamic import: avoids pulling in vite/rollup on Vercel
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else if (!process.env.VERCEL) {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0" as any, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  } catch (err) {
    console.error("Vite setup error:", err);
  }
}

// Start Vite but don't block
startVite().catch(err => {
  console.error("Crash during startVite:", err);
});

export default app;
