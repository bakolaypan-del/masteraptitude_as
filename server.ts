import "dotenv/config";
import https from "https";

// Compensation for potential host clock drift (Item 5)
function syncTime() {
  return new Promise<void>((resolve) => {
    if (process.env.VERCEL) {
      console.log("[TimeSync] Skipping clock synchronization in Vercel serverless environment.");
      return resolve();
    }
    console.log("[TimeSync] Synchronizing clock with Google...");
    const req = https.request(
      "https://www.google.com",
      { method: "HEAD", timeout: 5000 },
      (res) => {
        const dateHeader = res.headers.date;
        if (dateHeader) {
          const serverTime = new Date(dateHeader).getTime();
          const localTime = Date.now();
          const offset = serverTime - localTime;
          
          console.log(`[TimeSync] Server Time: ${new Date(serverTime).toISOString()}`);
          console.log(`[TimeSync] Local Time:  ${new Date(localTime).toISOString()}`);
          console.log(`[TimeSync] Calculated clock offset: ${offset} ms (${(offset / 1000 / 60).toFixed(2)} minutes)`);
          
          if (Math.abs(offset) > 10000) {
            console.log("[TimeSync] Applying global Date patch to compensate for host clock drift.");
            const OriginalDate = global.Date;
            
            class PatchedDate extends OriginalDate {
              constructor(...args: [any?, any?, any?, any?, any?, any?, any?]) {
                if (args.length === 0) {
                  super(OriginalDate.now() + offset);
                } else {
                  super(...(args as [any, any, any, any, any, any, any]));
                }
              }
            }
            
            (PatchedDate as any).now = () => OriginalDate.now() + offset;
            PatchedDate.UTC = OriginalDate.UTC;
            PatchedDate.parse = OriginalDate.parse;
            
            global.Date = PatchedDate as any;
            console.log(`[TimeSync] Date successfully patched! Synced time: ${new Date().toISOString()}`);
          } else {
            console.log("[TimeSync] Clock drift is within safe limits (< 10s). No patch needed.");
          }
        } else {
          console.warn("[TimeSync] Could not find date header in Google response.");
        }
        resolve();
      }
    );
    
    req.on("error", (err) => {
      console.warn("[TimeSync] Time synchronization request failed:", err.message);
      resolve();
    });
    
    req.on("timeout", () => {
      req.destroy();
      console.warn("[TimeSync] Time synchronization request timed out.");
      resolve();
    });
    
    req.end();
  });
}

import express from "express";
import path from "path";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import cookieParser from "cookie-parser";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
let sqliteDb: any = null;

// Initialize SQLite Database ONLY when running locally, never on Vercel (Item 6)
async function initLocalSQLite() {
  try {
    const sqlite3 = (await import("sqlite3")).default;
    const sqliteDbPath = path.resolve(process.cwd(), "mock_analytics.db");
    sqliteDb = new sqlite3.Database(sqliteDbPath, (err) => {
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
  } catch (err: any) {
    console.warn("[SQLite] Dynamic sqlite3 import failed. Skipping local database:", err.message);
  }
}

function insertMockQuestionAnalysis(
  studentId: string,
  mockTestId: string,
  questionId: string,
  selectedAnswer: string,
  correctAnswer: string,
  isCorrect: number,
  timeTakenSeconds: number
) {
  if (!sqliteDb) return;
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
  `, [studentId, mockTestId, questionId, selectedAnswer, correctAnswer, isCorrect, timeTakenSeconds], (err: any) => {
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

// Request logger for debugging Vercel/Production issues
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[API Request] ${req.method} ${req.url}`);
  }
  next();
});

// API Routes

  // Sitemap — dynamically generated from blog posts
  app.get("/sitemap.xml", async (req, res) => {
    const currentDb = getDb();
    const baseUrl = process.env.BASE_URL || "https://masteraptitude.vercel.app";
    type SitemapUrl = { loc: string; priority: string; changefreq: string; lastmod?: string };
    const staticUrls: SitemapUrl[] = [
      { loc: `${baseUrl}/`, priority: "1.0", changefreq: "daily" },
      { loc: `${baseUrl}/news`, priority: "0.9", changefreq: "daily" },
      { loc: `${baseUrl}/current-affairs`, priority: "0.9", changefreq: "daily" },
      { loc: `${baseUrl}/practice-set`, priority: "0.8", changefreq: "weekly" },
      { loc: `${baseUrl}/study-notes`, priority: "0.8", changefreq: "weekly" },
      { loc: `${baseUrl}/vlog`, priority: "0.7", changefreq: "weekly" },
    ];
    let dynamicUrls: SitemapUrl[] = [];
    if (currentDb) {
      try {
        const [newsSnap, affairsSnap, practiceSnap, notesSnap, videosSnap] = await Promise.all([
          currentDb.collection("news_posts").get(),
          currentDb.collection("affairs").where("status", "==", "published").get().catch(() => ({ docs: [] as any[] })),
          currentDb.collection("practice_sets").where("status", "==", "published").get().catch(() => ({ docs: [] as any[] })),
          currentDb.collection("notes").where("status", "==", "published").get().catch(() => ({ docs: [] as any[] })),
          currentDb.collection("videos").where("status", "==", "published").get().catch(() => ({ docs: [] as any[] })),
        ]);
        const toDate = (d: any) => d?.toDate ? d.toDate().toISOString().split("T")[0] : undefined;
        dynamicUrls = [
          ...newsSnap.docs.map(d => { const data = d.data(); return { loc: `${baseUrl}/news/${data.slug || d.id}`, priority: "0.8", changefreq: "weekly", lastmod: data.publishDate || toDate(data.updatedAt) }; }),
          ...affairsSnap.docs.map(d => { const data = d.data(); return { loc: `${baseUrl}/current-affairs`, priority: "0.7", changefreq: "daily", lastmod: data.date || toDate(data.createdAt) }; }),
          ...practiceSnap.docs.map(d => { const data = d.data(); return { loc: `${baseUrl}/practice-set`, priority: "0.7", changefreq: "weekly", lastmod: toDate(data.createdAt) }; }),
          ...notesSnap.docs.map(d => { const data = d.data(); return { loc: `${baseUrl}/study-notes`, priority: "0.7", changefreq: "weekly", lastmod: toDate(data.createdAt) }; }),
          ...videosSnap.docs.map(d => { const data = d.data(); return { loc: `${baseUrl}/vlog`, priority: "0.6", changefreq: "weekly", lastmod: toDate(data.createdAt) }; }),
        ];
      } catch (err) {
        console.error("[sitemap] Failed to fetch collections:", err);
      }
    }
    const allUrls = [...staticUrls, ...dynamicUrls];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
    res.header("Content-Type", "application/xml").send(xml);
  });

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
  // Get test and questions (without correct answer)
  app.get("/api/test/:testId", verifyToken, async (req, res) => {
    const { testId } = req.params;
    console.log(`[API] Loading test: ${testId}`);

    const currentDb = getDb();
    if (!currentDb) {
      return res.status(503).json({ success: false, error: "Database is currently offline. Please try again shortly." });
    }

    try {
      const testSnap = await currentDb.collection("tests").doc(testId).get();
      if (!testSnap.exists) {
        return res.status(404).json({ success: false, error: "Test not found." });
      }
      const testData = testSnap.data();
      if (!testData) {
        return res.status(404).json({ success: false, error: "Test data is unavailable." });
      }
      const testObj = { id: testSnap.id, ...testData };

      const questionsSnap = await currentDb.collection("questions")
        .where("testId", "==", testId)
        .limit(200)
        .get();

      const questions = questionsSnap.docs.map(doc => {
        const data = doc.data();
        const { correctAnswer, ...safeData } = data;
        return { id: doc.id, ...safeData };
      });

      questions.sort((a: any, b: any) => (a.qNo || 0) - (b.qNo || 0));

      if (questions.length === 0) {
        return res.status(404).json({ success: false, error: "No questions have been added to this test yet." });
      }

      console.log(`[API] Loaded ${questions.length} questions for test ${testId}`);
      return res.status(200).json({ success: true, test: testObj, questions });
    } catch (error: any) {
      console.error("[API] Error fetching test:", error);
      return res.status(500).json({ success: false, error: "Failed to load test. Please try again." });
    }
  });

  // Helper function to serve submit fallback scoring locally
  // Submit test and score it
  app.post("/api/submit-test", verifyToken, async (req, res) => {
    const { testId, answers, timeTaken } = req.body;
    const user = (req as any).user;

    if (!testId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Invalid submission data." });
    }

    const currentDb = getDb();
    if (!currentDb) {
      return res.status(503).json({ error: "Database is currently offline. Please try again shortly." });
    }

    try {
      const testSnap = await currentDb.collection("tests").doc(testId).get();
      if (!testSnap.exists) {
        return res.status(404).json({ error: "Test not found." });
      }

      const testData = testSnap.data();
      const posMarks = testData?.marksPerCorrect || 1;
      const negMarks = testData?.negativeMarks || 0.25;

      const questionsSnap = await currentDb.collection("questions").where("testId", "==", testId).get();
      if (questionsSnap.empty) {
        return res.status(404).json({ error: "No questions found for this test." });
      }

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

      // Check if submitted within live window (uses already-fetched testData — zero extra reads)
      let submittedDuringLive = false;
      if (testData?.isLive && testData.liveStartDate && testData.liveEndDate) {
        const now = Date.now();
        submittedDuringLive = now >= new Date(testData.liveStartDate).getTime() && now <= new Date(testData.liveEndDate).getTime();
      }

      const baseResultData = {
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
        status: "completed",
        submittedDuringLive,
        marksPerCorrect: posMarks,
        negativeMarks: negMarks,
      };

      const profileRef = currentDb.collection("profiles").doc(user.uid);
      const resultDocRef = currentDb.collection("results").doc();

      // Mutable — filled inside transaction with zero extra reads
      let attemptNumber = 1;
      let isFirstAttempt = true;
      let idsToDelete: string[] = [];
      let resolvedStudentName = "Student";

      await currentDb.runTransaction(async (transaction) => {
        const profileDoc = await transaction.get(profileRef);

        if (profileDoc.exists) {
          const pd = profileDoc.data()!;
          resolvedStudentName = pd.name || "Student";

          // Attempt tracking — stored in profile, no extra read required
          const counts: Record<string, number> = pd.testAttemptCounts || {};
          attemptNumber = (counts[testId] || 0) + 1;
          isFirstAttempt = attemptNumber === 1;

          // Track result IDs for 3-attempt cap — stored in profile, no extra read required
          const recentIds: Record<string, string[]> = pd.recentAttemptIds || {};
          const currentIds = recentIds[testId] ? [...recentIds[testId]] : [];
          currentIds.push(resultDocRef.id);
          idsToDelete = currentIds.length > 3 ? currentIds.slice(0, currentIds.length - 3) : [];
          const updatedIds = currentIds.slice(-3);

          const currentTests = pd.totalTestsTaken || 0;
          const currentScore = pd.cumulativeScore || 0;
          const newScore = parseFloat((currentScore + baseResultData.score).toFixed(2));

          transaction.update(profileRef, {
            totalTestsTaken: currentTests + 1,
            cumulativeScore: Math.max(0, newScore),
            lastTestAt: Date.now(),
            [`testAttemptCounts.${testId}`]: attemptNumber,
            [`recentAttemptIds.${testId}`]: updatedIds
          });
        }

        transaction.set(resultDocRef, { ...baseResultData, attemptNumber, isFirstAttempt });
      });

      // Increment uniqueStudentCount on test for first-ever attempts (fire-and-forget)
      if (isFirstAttempt) {
        currentDb.collection("tests").doc(testId).update({
          uniqueStudentCount: admin.firestore.FieldValue.increment(1)
        }).catch(() => {});
      }

      // Delete result docs beyond the 3-attempt cap (fire-and-forget)
      for (const id of idsToDelete) {
        currentDb.collection("results").doc(id).delete().catch(() => {});
      }

      // Write mock_question_analysis documents in batch
      try {
        const studentName = resolvedStudentName;

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

      return res.json({ ...baseResultData, resultId: resultDocRef.id, attemptNumber, isFirstAttempt, rank, analysis });
    } catch (error: any) {
      console.error("[API] Failed to submit test:", error);
      return res.status(500).json({ error: "Failed to submit test. Please try again." });
    }
  });

  // Fetch a single result by ID (used by AnalysisPage fallback when no navigation state)
  app.get("/api/my-result/:resultId", verifyToken, async (req, res) => {
    const { resultId } = req.params;
    const user = (req as any).user;
    const currentDb = getDb();
    if (!currentDb) return res.status(503).json({ error: "Database offline" });
    try {
      const resultDoc = await currentDb.collection("results").doc(resultId).get();
      if (!resultDoc.exists) return res.status(404).json({ error: "Result not found" });
      const resultData = resultDoc.data()!;
      if (resultData.userId !== user.uid) return res.status(403).json({ error: "Forbidden" });
      const testId = resultData.testId;
      const questionsSnap = await currentDb.collection("questions")
        .where("testId", "==", testId)
        .orderBy("qNo", "asc")
        .get();
      const questions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.json({ result: { id: resultId, ...resultData }, questions });
    } catch (err: any) {
      console.error("[my-result] failed:", err);
      return res.status(500).json({ error: "Failed to fetch result" });
    }
  });

  // Test-specific leaderboard — uses FIRST attempt per user for fair ranking
  app.get("/api/test-leaderboard/:testId", verifyToken, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(503).json({ error: "Database offline" });
    const { testId } = req.params;
    const user = (req as any).user;
    const myScoreParam = req.query.myScore !== undefined ? parseFloat(req.query.myScore as string) : null;
    const isFirstAttemptParam = req.query.isFirstAttempt === "true";

    try {
      // Fetch results + test doc in parallel (test doc needed for live window check)
      const [resultsSnap, testSnap] = await Promise.all([
        currentDb.collection("results").where("testId", "==", testId).get(),
        currentDb.collection("tests").doc(testId).get()
      ]);
      const testData = testSnap.data();

      let liveStart = 0, liveEnd = 0;
      const isLiveTest = !!(testData?.isLive && testData.liveStartDate && testData.liveEndDate);
      if (isLiveTest) {
        liveStart = new Date(testData!.liveStartDate).getTime();
        liveEnd = new Date(testData!.liveEndDate).getTime();
      }

      // First attempt per user (lowest timestamp wins), track all unique users for the counter
      const firstByUser = new Map<string, { userId: string; score: number; timestamp: number; duringLive: boolean }>();
      const allUniqueUsers = new Set<string>();

      resultsSnap.docs.forEach(doc => {
        const d = doc.data();
        const uid = d.userId as string;
        const sc = typeof d.score === "number" ? d.score : 0;
        const ts = d.timestamp || 0;
        const duringLive = !!(d.submittedDuringLive);
        allUniqueUsers.add(uid);
        const existing = firstByUser.get(uid);
        if (!existing || ts < existing.timestamp) {
          firstByUser.set(uid, { userId: uid, score: sc, timestamp: ts, duringLive });
        }
      });

      const uniqueStudents = allUniqueUsers.size;

      // Inject current user if Firestore hasn't replicated their submission yet
      if (myScoreParam !== null && !isNaN(myScoreParam) && isFirstAttemptParam && !firstByUser.has(user.uid)) {
        firstByUser.set(user.uid, { userId: user.uid, score: myScoreParam, timestamp: Date.now(), duringLive: true });
      }

      // For live tests: leaderboard ranks only live-window submissions.
      // Always include the requesting user so their rank is always visible in analysis.
      let leaderboardSet = Array.from(firstByUser.values());
      if (isLiveTest) {
        leaderboardSet = leaderboardSet.filter(e => e.duringLive || e.userId === user.uid);
      }

      const sorted = leaderboardSet.sort((a, b) => b.score - a.score);
      const totalParticipants = sorted.length;

      // Rank with tied-score support
      let rank = 1;
      let myRank = totalParticipants + 1;
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i].score < sorted[i - 1].score) rank = i + 1;
        if (sorted[i].userId === user.uid) { myRank = rank; break; }
      }

      // Percentile: always use the user's FIRST-attempt score from Firestore for fairness.
      // myScoreParam is only used as a fallback injection for brand-new first-attempts that
      // haven't yet replicated to Firestore; for reattempts we ignore myScoreParam.
      const firstAttemptEntry = firstByUser.get(user.uid);
      const myScore = firstAttemptEntry
        ? firstAttemptEntry.score                                  // always use first-attempt score
        : (isFirstAttemptParam && myScoreParam !== null && !isNaN(myScoreParam)
          ? myScoreParam                                           // pre-replication fallback
          : 0);
      const scoringBelow = sorted.filter(r => r.score < myScore).length;
      const percentile = totalParticipants > 0 ? parseFloat(((scoringBelow / totalParticipants) * 100).toFixed(1)) : 0;

      const top10 = sorted.slice(0, 10);
      const profileSnaps = await Promise.all(
        top10.map(r => currentDb.collection("profiles").doc(r.userId).get())
      );

      const topRankers = top10.map((r, idx) => ({
        rank: idx + 1,
        name: profileSnaps[idx].exists ? (profileSnaps[idx].data()?.name || 'Student') : 'Student',
        score: r.score,
        isCurrentUser: r.userId === user.uid
      }));

      return res.json({ topRankers, myRank, totalParticipants, uniqueStudents, percentile });
    } catch (error: any) {
      console.error("[test-leaderboard] failed:", error);
      return res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Per-question community stats — aggregated from mock_question_analysis (called once per analysis view)
  app.get("/api/test-question-stats/:testId", verifyToken, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(503).json({ error: "Database offline" });
    const { testId } = req.params;
    try {
      const snap = await currentDb.collection("mock_question_analysis").where("testId", "==", testId).get();
      const statsMap: Record<string, { attempts: number; correct: number; totalTime: number }> = {};
      snap.docs.forEach(doc => {
        const d = doc.data();
        const qId = d.questionId as string;
        if (!qId) return;
        if (!statsMap[qId]) statsMap[qId] = { attempts: 0, correct: 0, totalTime: 0 };
        statsMap[qId].attempts++;
        if (d.isCorrect) statsMap[qId].correct++;
        statsMap[qId].totalTime += d.timeTakenSeconds || 0;
      });
      const stats: Record<string, { totalAttempts: number; correctPercent: number; avgTimeSecs: number }> = {};
      for (const [qId, s] of Object.entries(statsMap)) {
        stats[qId] = {
          totalAttempts: s.attempts,
          correctPercent: s.attempts > 0 ? parseFloat(((s.correct / s.attempts) * 100).toFixed(1)) : 0,
          avgTimeSecs: s.attempts > 0 ? parseFloat((s.totalTime / s.attempts).toFixed(1)) : 0
        };
      }
      return res.json({ stats });
    } catch (error: any) {
      console.error("[test-question-stats] failed:", error);
      return res.status(500).json({ error: "Failed to fetch question stats" });
    }
  });

  // Admin: full test analysis — all first-attempt entries with names, scores, accuracy, time
  app.get("/api/admin/test-analysis/:testId", verifyToken, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(503).json({ error: "Database offline" });
    const user = (req as any).user;
    const isAdmin = user?.email === "bakolaypan@gmail.com";
    if (!isAdmin) {
      const profSnap = await currentDb.collection("profiles").doc(user.uid).get();
      if (!profSnap.exists || profSnap.data()?.role !== "admin") {
        return res.status(403).json({ error: "Admin only" });
      }
    }
    const { testId } = req.params;
    try {
      // Fetch all first-attempt results for this test
      const snap = await currentDb.collection("results")
        .where("testId", "==", testId)
        .where("isFirstAttempt", "==", true)
        .get();

      // Also fetch total attempts count (all attempts, not just first)
      const allAttemptsSnap = await currentDb.collection("results").where("testId", "==", testId).get();
      const totalAttempts = allAttemptsSnap.size;

      const resultDocs = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      const uniqueStudents = resultDocs.length;

      // Fetch all user profiles in parallel (batched)
      const userIds = [...new Set(resultDocs.map(r => r.userId as string))];
      const profileChunks: string[][] = [];
      for (let i = 0; i < userIds.length; i += 10) profileChunks.push(userIds.slice(i, i + 10));
      const profileMap: Record<string, string> = {};
      for (const chunk of profileChunks) {
        const profs = await Promise.all(chunk.map(uid => currentDb.collection("profiles").doc(uid).get()));
        profs.forEach((p, idx) => {
          profileMap[chunk[idx]] = p.exists ? (p.data()?.name || "Student") : "Student";
        });
      }

      const leaderboard = resultDocs
        .sort((a, b) => (b.score || 0) - (a.score || 0) || (a.timeTaken || 0) - (b.timeTaken || 0))
        .map((r, i) => ({
          rank: i + 1,
          name: profileMap[r.userId] || "Student",
          userId: r.userId,
          score: r.score || 0,
          accuracy: r.accuracy || 0,
          correctAnswers: r.correctAnswers || 0,
          wrongAnswers: r.wrongAnswers || 0,
          unattempted: r.unattempted || 0,
          timeTaken: r.timeTaken || 0,
          submittedAt: r.createdAt || null,
          attemptNumber: r.attemptNumber || 1,
          submittedDuringLive: r.submittedDuringLive || false,
        }));

      const scores = leaderboard.map(e => e.score);
      const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const highScore = scores.length ? Math.max(...scores) : 0;

      return res.json({ leaderboard, uniqueStudents, totalAttempts, avgScore, highScore });
    } catch (error: any) {
      console.error("[admin/test-analysis] failed:", error);
      return res.status(500).json({ error: "Failed to fetch test analysis" });
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

  // Admin: Get Detailed Test Attempt Analysis — returns full question data with solutions
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
      const userAnswers: Record<string, string> = attemptData.userAnswers || {};
      const questionTimes: Record<string, number> = attemptData.questionTimes || {};

      // Fetch test doc to get marks scheme
      const [questionsSnap, testSnap] = await Promise.all([
        currentDb.collection("questions").where("testId", "==", testId).get(),
        currentDb.collection("tests").doc(testId).get(),
      ]);
      const testData = testSnap.exists ? testSnap.data() || {} : {};
      const marksPerCorrect: number = parseFloat(testData.marksPerCorrect ?? "1");
      const negativeMarks: number = parseFloat(testData.negativeMarks ?? "0.25");

      const questions = questionsSnap.docs.map((qDoc, idx) => {
        const qData = qDoc.data();
        const qId = qDoc.id;
        const studentAns = userAnswers[qId] || "";
        const correctAns = qData.correctAnswer || "";
        const isCorrect = studentAns !== "" && studentAns === correctAns;
        const isSkipped = studentAns === "";
        const timeTaken = questionTimes[qId] || 0;

        // Marks computation
        let marksEarned = 0;
        if (isCorrect) marksEarned = marksPerCorrect;
        else if (!isSkipped) marksEarned = -negativeMarks;

        return {
          questionNo: qData.qNo || (idx + 1),
          questionId: qId,
          questionText: qData.questionText || "",
          options: qData.options || [],
          correctAnswer: correctAns,
          studentAnswer: studentAns,
          isCorrect,
          isSkipped,
          topic: qData.topic || "",
          subject: qData.subject || qData.subjectName || qData.topic || "General",
          solution: qData.solution || "",
          explanation: qData.explanation || qData.solution || "",
          imageUrl: qData.imageUrl || "",
          equationLatex: qData.equationLatex || "",
          timeTaken,
          marksEarned,
          marksPerCorrect,
          negativeMarks,
        };
      }).sort((a, b) => a.questionNo - b.questionNo);

      // Aggregate stats
      const totalQuestions = questions.length;
      const correct = questions.filter(q => q.isCorrect).length;
      const wrong = questions.filter(q => !q.isCorrect && !q.isSkipped).length;
      const skipped = questions.filter(q => q.isSkipped).length;
      const totalScore = questions.reduce((sum, q) => sum + q.marksEarned, 0);
      const accuracy = totalQuestions > 0 ? parseFloat(((correct / totalQuestions) * 100).toFixed(1)) : 0;

      // Subject-wise breakdown
      const subjectMap: Record<string, { total: number; correct: number; totalTime: number }> = {};
      questions.forEach(q => {
        const sub = q.subject || "General";
        if (!subjectMap[sub]) subjectMap[sub] = { total: 0, correct: 0, totalTime: 0 };
        subjectMap[sub].total++;
        if (q.isCorrect) subjectMap[sub].correct++;
        subjectMap[sub].totalTime += q.timeTaken;
      });

      return res.json({
        questions,
        summary: { totalQuestions, correct, wrong, skipped, totalScore, accuracy },
        subjectMap,
        testTitle: testData.title || "",
        marksPerCorrect,
        negativeMarks,
      });
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
    const { name, phoneNumber, status, password, batch } = req.body;

    if (!studentId) return res.status(400).json({ error: "Missing student ID" });

    try {
      const updateData: any = {
        name,
        phoneNumber,
        status: status || 'active',
        batch: batch || '',
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
      
      // Update Firebase Auth — only password change is critical; email/name update is best-effort
      if (password && password.trim().length >= 6) {
        await admin.auth().updateUser(studentId, { password: password.trim() });
        console.log(`[Admin] Password updated for ${studentId}`);
      }
      if (phoneNumber) {
        admin.auth().updateUser(studentId, {
          email: `${phoneNumber}@students.myapp.com`,
          displayName: name
        }).catch((e: any) => console.warn(`[Admin] Auth email update skipped for ${studentId}:`, e.message));
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
      const { title, topic, isActive, duration, testType, subjectName, category, marksPerCorrect, negativeMarks, isPaid, isLive, liveStartDate, liveEndDate, description } = req.body;
      const ref = currentDb.collection("tests").doc();
      await ref.set({
        title,
        topic,
        subjectName: subjectName || "",
        description: description || "",
        category: category || "",
        testType: testType || 'topic',
        duration: duration || 30,
        marksPerCorrect: marksPerCorrect || 1,
        negativeMarks: negativeMarks || 0,
        isActive: !!isActive,
        isPaid: !!isPaid,
        isLive: !!isLive,
        liveStartDate: liveStartDate || "",
        liveEndDate: liveEndDate || "",
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
      const { title, topic, isActive, duration, testType, subjectName, category, marksPerCorrect, negativeMarks, isPaid, isLive, liveStartDate, liveEndDate, description } = req.body;
      const updateData: any = {
        title,
        topic,
        subjectName: subjectName || "",
        description: description || "",
        category: category || "",
        duration: duration || 30,
        marksPerCorrect: marksPerCorrect || 1,
        negativeMarks: negativeMarks || 0,
        isActive: !!isActive,
        isPaid: !!isPaid,
        isLive: !!isLive,
        liveStartDate: liveStartDate || "",
        liveEndDate: liveEndDate || ""
      };
      if (testType) updateData.testType = testType;
      await currentDb.collection("tests").doc(testId).update(updateData);
      res.json({ success: true });
    } catch (error) {
       console.error(error);
       res.status(500).json({ error: "Failed to update test" });
    }
  });

  app.post("/api/admin/questions", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const { testId, topic, qNo, questionText, options, correctAnswer, solution, imageUrl, equationLatex } = req.body;
      const ref = currentDb.collection("questions").doc();
      await ref.set({
        testId, topic, qNo, questionText, options, correctAnswer, solution: solution || "", imageUrl: imageUrl || "", equationLatex: equationLatex || ""
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
      const { topic, questionText, options, correctAnswer, solution, imageUrl, equationLatex } = req.body;
      await currentDb.collection("questions").doc(questionId).update({
        topic, questionText, options, correctAnswer, solution: solution || "", imageUrl: imageUrl || "", equationLatex: equationLatex || ""
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
    } catch (err: any) {
      console.error("[API] Category Order fetch error:", err);
      res.status(500).json({ error: "Failed to fetch category order", details: err.message });
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

  // List ALL typing tests (admin — includes inactive)
  app.get("/api/admin/typing-tests", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const snap = await currentDb.collection("typing_tests").orderBy("createdAt", "desc").get();
      const tests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(tests);
    } catch (error) {
      console.error("[Admin API] Failed to fetch all typing tests", error);
      res.status(500).json({ error: "Failed to fetch typing tests" });
    }
  });

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
        // 1 Minute Easy tests - Set A
        { title: "Easy Typing Test 1 (1 Min)", duration: 1, difficulty: "Easy", paragraph: "The sun rises every morning and gives light to the world. Birds sing sweet songs in the trees. Children go to school and learn new things every day. Farmers work hard in their fields to grow food for all of us. Clean water and fresh air are gifts of nature. We must take care of our environment and keep it clean." },
        { title: "Easy Typing Test 2 (1 Min)", duration: 1, difficulty: "Easy", paragraph: "My mother wakes up early and cooks food for the family. My father goes to work every day to earn money. My sister and I go to school by bus. We study, play, and come home in the evening. At night we have dinner together and talk about our day. Family time is very important and makes us happy." },
        { title: "Easy Typing Test 3 (1 Min)", duration: 1, difficulty: "Easy", paragraph: "Dogs are very loyal animals and love their owners very much. Cats are quiet and clean pets that enjoy sleeping in the sun. Cows give us milk which is good for our health. Elephants are the biggest land animals and are very intelligent. We should be kind to all animals and never harm them in any way." },
        { title: "Easy Typing Test 4 (1 Min)", duration: 1, difficulty: "Easy", paragraph: "Reading books is a very good habit for everyone. Books teach us many new things about the world around us. A good book can take us to faraway places without leaving our home. Public libraries have thousands of books that we can read for free. Children who read books from a young age do better in school and life." },
        { title: "Easy Typing Test 5 (1 Min)", duration: 1, difficulty: "Easy", paragraph: "India is a great country with a rich culture and long history. People of many religions and languages live together in peace and harmony. Our national flag has three colors which stand for courage, peace, and growth. We celebrate many festivals like Diwali, Eid, Christmas, and Holi with great joy. Every citizen must love and serve the nation with pride and dedication." },

        // 1 Minute Easy tests - Set B (5 additional)
        { title: "Easy Typing Test 6 (1 Min)", duration: 1, difficulty: "Easy", paragraph: "Water is the most important thing for all living beings on earth. We should never waste water in our daily life. Rivers, lakes, and ponds are sources of fresh water for us. Rain fills the rivers and keeps our land green and fertile. Every drop of water is precious and we must use it wisely every day." },
        { title: "Easy Typing Test 7 (1 Min)", duration: 1, difficulty: "Easy", paragraph: "Health is the greatest wealth a person can have in life. We should eat healthy food and drink clean water every day. Exercise keeps our body strong and our mind fresh and active. Sleeping well at night helps our body to rest and grow. We should avoid junk food and eat more fruits and green vegetables daily." },
        { title: "Easy Typing Test 8 (1 Min)", duration: 1, difficulty: "Easy", paragraph: "Trees give us oxygen, fruits, wood, and shade from the hot sun. They also bring rain and keep the air clean and fresh for us. We should plant more trees and take care of them with love. Cutting trees without reason is very harmful for our environment and all life. A green earth is a healthy earth for all living creatures." },
        { title: "Easy Typing Test 9 (1 Min)", duration: 1, difficulty: "Easy", paragraph: "The market is a busy place where people buy and sell things every day. Shops sell food, clothes, medicines, and many other useful items. The vegetable market opens very early in the morning with fresh produce. Shopkeepers call out to attract customers and sell their goods at fair prices. A good market helps the local community grow and meet their daily needs." },
        { title: "Easy Typing Test 10 (1 Min)", duration: 1, difficulty: "Easy", paragraph: "A good teacher is one of the greatest gifts in a student's life. Teachers guide us, correct our mistakes, and help us grow with care and patience. They work hard every day to prepare lessons and explain new topics clearly. A student who respects and listens to the teacher will always do well in life. We should always be thankful to our teachers for all that they do." },

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

      res.json({ success: true, message: "Successfully seeded 20 typing tests" });
    } catch (error) {
      console.error("[Admin API] Failed to seed typing tests", error);
      res.status(500).json({ error: "Failed to seed typing tests" });
    }
  });

  // ── Live Tests — reads from tests collection where isLive==true ───────────
  app.get("/api/live-tests", async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const snap = await currentDb.collection("tests").where("isLive", "==", true).orderBy("createdAt", "asc").get();
      const tests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.json({ tests });
    } catch (err) {
      console.error("[API] live-tests fetch failed", err);
      res.status(500).json({ error: "Failed to fetch live tests" });
    }
  });

  // ── Review System ────────────────────────────────────────────────────────────

  // Public: approved reviews for homepage slider
  app.get("/api/reviews/public", async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const snap = await currentDb.collection("student_reviews")
        .where("status", "==", "approved")
        .where("showHomepage", "==", true)
        .orderBy("createdAt", "desc")
        .get();
      res.json({ reviews: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // Public: get review link details by code
  app.get("/api/review-link/:code", async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const snap = await currentDb.collection("review_links")
        .where("uniqueCode", "==", req.params.code).get();
      if (snap.empty) return res.status(404).json({ error: "Review link not found" });
      const d = snap.docs[0];
      const data = d.data();
      if (data.status !== "active") return res.status(410).json({ error: "This review link has been deactivated" });
      if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
        return res.status(410).json({ error: "This review link has expired" });
      }
      res.json({ id: d.id, ...data });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch review link" });
    }
  });

  // Submit a review (no auth required for public link submissions)
  app.post("/api/reviews/submit", async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { studentId, fullName, reviewText, rating, reviewLinkId, category } = req.body;
    if (!fullName?.trim() || !reviewText?.trim()) {
      return res.status(400).json({ error: "Name and review text are required" });
    }
    try {
      if (studentId) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const existing = await currentDb.collection("student_reviews")
          .where("studentId", "==", studentId)
          .where("createdAt", ">=", cutoff).get();
        if (!existing.empty) {
          return res.status(429).json({ error: "You already submitted a review recently. Please wait 30 days." });
        }
      }
      const data: any = {
        fullName: fullName.trim(),
        reviewText: reviewText.trim(),
        rating: Math.max(1, Math.min(5, Number(rating) || 5)),
        status: "pending",
        showHomepage: false,
        featured: false,
        category: category || "General",
        createdAt: new Date(),
      };
      if (studentId) data.studentId = studentId;
      if (reviewLinkId) data.reviewLinkId = reviewLinkId;
      const ref = await currentDb.collection("student_reviews").add(data);
      if (studentId) {
        currentDb.collection("profiles").doc(studentId).update({
          lastReviewDate: new Date().toISOString(),
          reviewSubmitted: true,
        }).catch(() => {});
      }
      res.json({ id: ref.id, message: "Review submitted! It will appear after admin approval." });
    } catch (err) {
      res.status(500).json({ error: "Failed to submit review" });
    }
  });

  // Admin: all reviews
  app.get("/api/admin/reviews", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const snap = await currentDb.collection("student_reviews").orderBy("createdAt", "desc").get();
      res.json({ reviews: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // Admin: update review (approve/reject/edit/toggle)
  app.put("/api/admin/reviews/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const allowed = ['status', 'showHomepage', 'featured', 'reviewText', 'rating'];
      const updates: any = {};
      allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
      await currentDb.collection("student_reviews").doc(req.params.id).update(updates);
      res.json({ message: "Review updated" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update review" });
    }
  });

  // Admin: delete review
  app.delete("/api/admin/reviews/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      await currentDb.collection("student_reviews").doc(req.params.id).delete();
      res.json({ message: "Review deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  // Admin: get all review links
  app.get("/api/admin/review-links", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const snap = await currentDb.collection("review_links").orderBy("createdAt", "desc").get();
      res.json({ links: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch review links" });
    }
  });

  // Admin: create review link
  app.post("/api/admin/review-links", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    const { category, expiryDays } = req.body;
    try {
      const uniqueCode = Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
      const data: any = {
        uniqueCode,
        category: category || "General",
        status: "active",
        createdAt: new Date(),
      };
      if (Number(expiryDays) > 0) {
        const exp = new Date();
        exp.setDate(exp.getDate() + Number(expiryDays));
        data.expiryDate = exp.toISOString();
      }
      const docRef = await currentDb.collection("review_links").add(data);
      res.json({ id: docRef.id, ...data });
    } catch (err) {
      res.status(500).json({ error: "Failed to create review link" });
    }
  });

  // Admin: toggle review link status
  app.put("/api/admin/review-links/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      await currentDb.collection("review_links").doc(req.params.id).update({ status: req.body.status });
      res.json({ message: "Link updated" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update link" });
    }
  });

  // Admin: delete review link
  app.delete("/api/admin/review-links/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      await currentDb.collection("review_links").doc(req.params.id).delete();
      res.json({ message: "Link deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete link" });
    }
  });

  // ── Paid Mock Batches (public) ────────────────────────
  app.get("/api/paid-batches", async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const snap = await currentDb.collection("paid_mock_batches")
        .where("isActive", "==", true)
        .orderBy("createdAt", "desc")
        .get();
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch batches" });
    }
  });

  app.get("/api/paid-batches/:id", async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const docSnap = await currentDb.collection("paid_mock_batches").doc(req.params.id).get();
      if (!docSnap.exists) return res.status(404).json({ error: "Batch not found" });
      res.json({ id: docSnap.id, ...docSnap.data() });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch batch" });
    }
  });

  // ── Admin: Paid Mock Batches ───────────────────────────
  app.get("/api/admin/paid-batches", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const snap = await currentDb.collection("paid_mock_batches").orderBy("createdAt", "desc").get();
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch batches" });
    }
  });

  app.post("/api/admin/paid-batches", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const { examName, description, price, thumbnailUrl, validity, totalMocks, features, isActive, isPopular } = req.body;
      const ref = await currentDb.collection("paid_mock_batches").add({
        examName, description,
        price: Number(price) || 0,
        thumbnailUrl: thumbnailUrl || '',
        validity: validity || 'Unlimited',
        totalMocks: Number(totalMocks) || 0,
        features: features || [],
        isActive: isActive !== false,
        isPopular: !!isPopular,
        enrolledCount: 0,
        createdAt: new Date().toISOString(),
      });
      res.json({ id: ref.id, message: "Batch created" });
    } catch (err) {
      res.status(500).json({ error: "Failed to create batch" });
    }
  });

  app.put("/api/admin/paid-batches/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const { examName, description, price, thumbnailUrl, validity, totalMocks, features, isActive, isPopular } = req.body;
      await currentDb.collection("paid_mock_batches").doc(req.params.id).update({
        examName, description,
        price: Number(price) || 0,
        thumbnailUrl: thumbnailUrl || '',
        validity: validity || 'Unlimited',
        totalMocks: Number(totalMocks) || 0,
        features: features || [],
        isActive: isActive !== false,
        isPopular: !!isPopular,
        updatedAt: new Date().toISOString(),
      });
      res.json({ message: "Batch updated" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update batch" });
    }
  });

  app.delete("/api/admin/paid-batches/:id", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      await currentDb.collection("paid_mock_batches").doc(req.params.id).delete();
      res.json({ message: "Batch deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete batch" });
    }
  });

  // ── Admin: Payments Dashboard ─────────────────────────
  app.get("/api/admin/payments", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const snap = await currentDb.collection("payments").orderBy("createdAt", "desc").limit(500).get();
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // ── Student: My Purchases ──────────────────────────────
  app.get("/api/my-purchases", verifyToken, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const studentId = (req as any).user.uid;
      const snap = await currentDb.collection("payments")
        .where("studentId", "==", studentId)
        .where("status", "==", "success")
        .get();
      res.json({ purchasedBatches: snap.docs.map(d => (d.data() as any).batchId) });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  // ── Payment: Public config (razorpay.me URL + whether API is ready) ────────
  app.get("/api/payment-config", (req, res) => {
    res.json({
      razorpayMeUrl: process.env.RAZORPAY_ME_URL || 'https://razorpay.me/@masteraptitude',
      apiReady: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    });
  });

  // ── Payment: Manual (UPI ref after razorpay.me redirect) ─────────────────
  app.post("/api/payments/submit-manual", verifyToken, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const { batchId, transactionId, amount, studentName, screenshotUrl } = req.body;
      const studentId = (req as any).user.uid;
      // Prevent duplicate submission for same batch
      const existing = await currentDb.collection("payments")
        .where("studentId", "==", studentId)
        .where("batchId", "==", batchId)
        .get();
      if (!existing.empty) {
        return res.status(400).json({ error: "Payment already submitted for this batch" });
      }
      await currentDb.collection("payments").add({
        studentId, batchId, amount: Number(amount), status: "pending_verification",
        transactionId: transactionId || '', studentName: studentName || '',
        screenshotUrl: screenshotUrl || '', paymentMethod: 'manual_upi',
        createdAt: new Date().toISOString(),
      });
      res.json({ success: true, message: "Submitted for verification" });
    } catch (err: any) {
      res.status(500).json({ error: "Submission failed", details: err.message });
    }
  });

  // ── Admin: Approve / Reject manual payment ───────────────────────────────
  app.put("/api/admin/payments/:id/verify", verifyToken, verifyAdmin, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const { action, batchId } = req.body; // action: 'approve' | 'reject'
      const docRef = currentDb.collection("payments").doc(req.params.id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) return res.status(404).json({ error: "Payment not found" });
      const paymentData = docSnap.data() as any;
      if (action === 'approve') {
        await docRef.update({ status: "success", verifiedAt: new Date().toISOString() });
        await currentDb.collection("paid_mock_batches").doc(batchId || paymentData.batchId).update({
          enrolledCount: admin.firestore.FieldValue.increment(1),
        });
      } else {
        await docRef.update({ status: "rejected", verifiedAt: new Date().toISOString() });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Update failed", details: err.message });
    }
  });

  // ── Payment: Create Razorpay Order ────────────────────
  app.post("/api/payments/create-order", verifyToken, async (req, res) => {
    try {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ error: "Payment gateway not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env" });
      }
      const { amount } = req.body;
      const Razorpay = (await import("razorpay")).default;
      const rz = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
      const order = await rz.orders.create({ amount: Math.round(Number(amount) * 100), currency: "INR", receipt: `rcpt_${Date.now()}` });
      res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
    } catch (err: any) {
      res.status(500).json({ error: "Order creation failed", details: err.message });
    }
  });

  // ── Payment: Verify Razorpay Signature ────────────────
  app.post("/api/payments/verify", verifyToken, async (req, res) => {
    const currentDb = getDb();
    if (!currentDb) return res.status(500).json({ error: "Database offline" });
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, batchId, amount, studentName } = req.body;
      const secret = process.env.RAZORPAY_KEY_SECRET || '';
      const expected = crypto.createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      if (expected !== razorpay_signature) {
        return res.status(400).json({ error: "Invalid payment signature" });
      }
      const studentId = (req as any).user.uid;
      await currentDb.collection("payments").add({
        studentId, batchId, amount: Number(amount), status: "success",
        transactionId: razorpay_payment_id, razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id, studentName: studentName || '',
        createdAt: new Date().toISOString(),
      });
      await currentDb.collection("paid_mock_batches").doc(batchId).update({
        enrolledCount: admin.firestore.FieldValue.increment(1),
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Verification failed", details: err.message });
    }
  });

  // --- API ROUTE CATCH-ALL (must be after all routes) ---
  app.all("/api/*", (req, res) => {
    console.warn(`[API 404] Unmatched route: ${req.method} ${req.url}`);
    res.status(404).json({ error: "API Route Not Found", method: req.method, path: req.url });
  });

  // Global Error Handler (must be after all routes)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled API Error:", err);
    if (res.headersSent) return next(err);
    if (req.path.startsWith('/api/')) {
      res.status(500).json({ success: false, error: "Internal Server Error" });
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

// Initialize all services asynchronously to avoid top-level await bundler issues (Item 6)
async function initServer() {
  if (!process.env.VERCEL) {
    try {
      await syncTime();
      await initLocalSQLite();
    } catch (err: any) {
      console.warn("Local services setup failed:", err.message);
    }
  }
  await startVite();
}

initServer().catch(err => {
  console.error("Crash during server initialization:", err);
});

export default app;
