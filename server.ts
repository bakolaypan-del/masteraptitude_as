import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import cookieParser from "cookie-parser";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

const googleGenAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || "" });

// Initialize Firebase Admin
let db: any = null;
let profileDb: any = null;
let config: any = {};

const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    db = getFirestore(admin.app(), config.firestoreDatabaseId);
    return;
  }

  try {
    const firebaseConfigPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(firebaseConfigPath)) {
      config = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
      const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
      
      if (serviceAccountStr) {
        try {
          const serviceAccount = JSON.parse(serviceAccountStr);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: config.projectId,
          });
          console.log("Firebase Admin initialized with service account.");
        } catch (parseError) {
          console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env var. Ensure it is a valid JSON string.");
          admin.initializeApp({
            projectId: config.projectId,
          });
        }
      } else {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: config.projectId,
        });
        console.log("Firebase Admin initialized with application default credentials.");
      }
      
      // Initialize Firestore after Admin is initialized
      db = getFirestore(admin.app(), config.firestoreDatabaseId);
      console.log("Firestore initialized successfully.");
    } else {
      console.warn("firebase-applet-config.json not found. Initializing with defaults.");
      admin.initializeApp();
      db = getFirestore(admin.app());
    }
  } catch (error) {
    console.error("CRITICAL: Failed to initialize Firebase Admin or Firestore:", error);
  }
};

initializeFirebase();

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
  if (!db) {
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

    const profileSnap = await db.collection("profiles").doc(user.uid).get();
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

  // Health check
  app.get("/api/health", async (req, res) => {
    res.json({ 
      status: "ok", 
      db: db ? "online" : "offline",
      apps: admin.apps.length,
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

    try {
      const response = await googleGenAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate this array to ${targetLang}: ${JSON.stringify(questions)}`,
        config: {
          systemInstruction: `You are an expert educational translator.
            Rules:
            1. Maintain standard JSON structure.
            2. Keep mathematical formulas, technical terms, and placeholders unchanged.
            3. Provide the translation in the exact same index order.
            4. Output ONLY the raw JSON array.`,
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      
      const translated = JSON.parse(text.trim());
      res.json(translated);
    } catch (error: any) {
      console.error("[API] Translation failed:", error);
      res.status(500).json({ error: "Translation failed", details: error.message });
    }
  });

  // Get test and questions (without correct answer)
  app.get("/api/test/:testId", verifyToken, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { testId } = req.params;
    
    try {
      const testSnap = await db.collection("tests").doc(testId).get();
      if (!testSnap.exists) {
        return res.status(404).json({ error: "Test not found" });
      }
      
      const testData = { id: testSnap.id, ...testSnap.data() };
      
      const questionsSnap = await db.collection("questions").where("testId", "==", testId).get();
      const questions = questionsSnap.docs.map(doc => {
        const data = doc.data();
        // **STRIP correctAnswer**
        const { correctAnswer, ...safeData } = data;
        return { id: doc.id, ...safeData };
      });
      
      res.json({ test: testData, questions });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch test" });
    }
  });

  // Submit test and score it
  app.post("/api/submit-test", verifyToken, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { testId, answers } = req.body; 
    const user = (req as any).user;

    console.log(`Submission received from user ${user.uid} for test ${testId}`);

    if (!testId || !answers || !Array.isArray(answers)) {
      console.error("Invalid submission payload:", { testId, answersType: typeof answers });
      return res.status(400).json({ error: "Invalid submission data. Please ensure all questions are submitted." });
    }
    
    try {
      // Fetch test details for marking scheme
      const testSnap = await db.collection("tests").doc(testId).get();
      if (!testSnap.exists) {
        return res.status(404).json({ error: "Test not found" });
      }
      const testData = testSnap.data();
      const posMarks = testData?.marksPerCorrect || 1;
      const negMarks = testData?.negativeMarks || 0.25;

      // Fetch the actual questions to get correctAnswers
      const questionsSnap = await db.collection("questions").where("testId", "==", testId).get();
      if (questionsSnap.empty) {
        console.warn(`No questions found for test ${testId}`);
      }

      const actualAnswers = new Map();
      questionsSnap.docs.forEach(doc => {
        actualAnswers.set(doc.id, doc.data().correctAnswer);
      });
      
      let correct = 0;
      let wrong = 0;
      let unattempted = 0;
      let score = 0;
      
      answers.forEach((ans: { id: string, selected: string }) => {
        const actual = actualAnswers.get(ans.id);
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
      
      // Calculate missing/unanswered questions that weren't in the payload
      const missing = questionsSnap.size - answers.length;
      if (missing > 0) {
        unattempted += missing;
      }

      console.log(`Scored submission: ${correct} correct, ${wrong} wrong, ${unattempted} unattempted. Total score: ${score}`);

      // Create result data
      const resultData = {
        timestamp: Date.now(),
        userId: user.uid,
        testId: testId,
        score: parseFloat(score.toFixed(2)),
        correctAnswers: correct,
        wrongAnswers: wrong,
        status: "completed"
      };

      const profileRef = db.collection("profiles").doc(user.uid);
      const resultDocRef = db.collection("results").doc();

      await db.runTransaction(async (transaction) => {
        const profileDoc = await transaction.get(profileRef);
        
        // Always record the result
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
        } else {
          // Create profile if missing
          transaction.set(profileRef, {
            uid: user.uid,
            email: user.email || "",
            name: user.name || user.email?.split('@')[0] || "Student",
            role: "student",
            totalTestsTaken: 1,
            cumulativeScore: Math.max(0, score),
            globalRank: 0,
            createdAt: Date.now(),
            lastTestAt: Date.now()
          });
        }
      });

      console.log(`Transaction committed for user ${user.uid}`);

      // Calculate Rank (do this after transaction commits to ensure we see updated score)
      let rank = 1;
      try {
        const updatedProfileSnap = await profileRef.get();
        const totalScore = updatedProfileSnap.data()?.cumulativeScore || 0;
        
        // Use count() aggregator for efficiency
        const rankSnap = await db.collection("profiles")
          .where("cumulativeScore", ">", totalScore)
          .count()
          .get();
        
        rank = rankSnap.data().count + 1;
        
        // Async update the profile with the new rank (not blocking the response)
        profileRef.update({ globalRank: rank }).catch(e => console.error("Async rank update failed", e));
      } catch (err) {
        console.error("Rank calculation logic error:", err);
      }

      // Convert Map to plain object for JSON response
      const analysis: Record<string, string> = {};
      actualAnswers.forEach((val, key) => {
        analysis[key] = val;
      });

      res.json({ ...resultData, rank, analysis });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to submit test" });
    }
  });

  // Demo endpoint to become an admin
  app.post("/api/become-admin", verifyToken, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const user = (req as any).user;
    try {
      await db.collection("profiles").doc(user.uid).update({ role: "admin" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to become admin" });
    }
  });

  // Auth Helpers for students
  app.post("/api/auth/send-otp", async (req, res) => {
    const { mobile } = req.body || {};
    if (!mobile) return res.status(400).json({ error: "Mobile number is required" });
    
    try {
      const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
      console.log(`[Auth] Sending (mock) OTP to: ${cleanMobile}`);
      
      // In a real app, you'd call an SMS API here.
      // For now, we simulate success.
      res.json({ success: true, message: "OTP sent successfully (Simulated)" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to send OTP", details: error.message });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    const { mobile, otp } = req.body || {};
    if (!mobile || !otp) return res.status(400).json({ error: "Mobile and OTP are required" });

    try {
      console.log(`[Auth] Verifying (mock) OTP: ${otp} for ${mobile}`);
      
      // Verification logic: For demo/simulated purposes, accept 123456 or any 6-digit code
      if (otp.length === 6) {
        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Invalid OTP code" });
      }
    } catch (error: any) {
      res.status(500).json({ error: "OTP verification failed" });
    }
  });

  app.post("/api/auth/check-mobile", async (req, res) => {
    if (!db) {
      console.error("[Auth] check-mobile failed: Database offline");
      return res.status(503).json({ error: "Database service temporarily offline. Please ensure FIREBASE_SERVICE_ACCOUNT is set." });
    }
    const { mobile } = req.body || {};
    if (!mobile) return res.status(400).json({ error: "Mobile number is required" });
    
    try {
      // Normalize: strip non-digits and keep last 10 digits for consistency
      const digitsOnly = String(mobile).replace(/\D/g, '');
      const cleanMobile = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
      
      if (cleanMobile.length < 10) {
        return res.status(400).json({ error: "Invalid mobile number. Please provide a 10-digit number." });
      }

      console.log(`[Auth] Checking mobile exists: ${cleanMobile}`);

      const snap = await db.collection("profiles").where("phoneNumber", "==", cleanMobile).get();
      res.json({ exists: !snap.empty });
    } catch (error: any) {
      console.error("[Auth] Mobile check error:", error);
      res.status(500).json({ error: "Mobile verification failed", message: error.message });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { mobile, newPassword } = req.body;
    if (!mobile || !newPassword) return res.status(400).json({ error: "Missing mobile or new password" });
    
    try {
      // Normalize: strip non-digits and keep last 10 digits for consistency
      const digitsOnly = mobile.toString().replace(/\D/g, '');
      const cleanMobile = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
      console.log(`[Auth] Resetting password for mobile: ${cleanMobile}`);

      const snap = await db.collection("profiles").where("phoneNumber", "==", cleanMobile).get();
      if (snap.empty) return res.status(404).json({ error: "No account found with this mobile number." });
      
      const userId = snap.docs[0].id;
      await admin.auth().updateUser(userId, { password: newPassword });
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Auth] Reset password error:", error);
      res.status(500).json({ error: "Password reset failed", message: error.message });
    }
  });

  // Admin: Get all students
  app.get("/api/admin/students", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    try {
      // Query both 'user' and 'student' roles as they might have been created differently
      const snap = await db.collection("profiles").where("role", "in", ["user", "student"]).get();
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

  // Admin: Update Student
  app.put("/api/admin/students/:studentId", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
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
      const profileRef = db.collection("profiles").doc(studentId);
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
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { studentId } = req.params;
    try {
      // 1. Delete from Auth
      await admin.auth().deleteUser(studentId);
      // 2. Delete from Firestore
      await db.collection("profiles").doc(studentId).delete();
      // 3. Optional: Delete results?
      const resultsSnap = await db.collection("results").where("userId", "==", studentId).get();
      const batch = db.batch();
      resultsSnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete student" });
    }
  });

  // Admin: Dashboard Stats
  app.get("/api/admin/stats", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    try {
      const allProfiles = await db.collection("profiles").where("role", "in", ["user", "student"]).get();
      
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
    if (!db) return res.status(500).json({ error: "DB offline" });
    try {
      const { title, topic, isActive, duration, testType, subjectName, category, marksPerCorrect, negativeMarks } = req.body;
      const ref = db.collection("tests").doc();
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
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { tests } = req.body;
    if (!Array.isArray(tests)) return res.status(400).json({ error: "Expected array of tests" });

    try {
      const batch = db.batch();
      tests.forEach(test => {
        const docRef = db!.collection("tests").doc();
        const testId = docRef.id;
        batch.set(docRef, {
          ...test,
          isActive: true,
          createdAt: Date.now()
        });

        // Add 10 placeholder questions for each test
        for (let i = 1; i <= 10; i++) {
          const qRef = db!.collection("questions").doc();
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
    if (!db) return res.status(500).json({ error: "DB offline" });
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
      await db.collection("tests").doc(testId).update(updateData);
      res.json({ success: true });
    } catch (error) {
       console.error(error);
       res.status(500).json({ error: "Failed to update test" });
    }
  });

  app.post("/api/admin/questions", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    try {
      const { testId, topic, qNo, questionText, options, correctAnswer, solution } = req.body;
      const ref = db.collection("questions").doc();
      await ref.set({
        testId, topic, qNo, questionText, options, correctAnswer, solution: solution || ""
      });
      res.json({ id: ref.id });
    } catch (error) {
       console.error(error);
       res.status(500).json({ error: "Failed to create question" });
    }
  });

  app.put("/api/admin/questions/:questionId", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    try {
      const { questionId } = req.params;
      const { topic, questionText, options, correctAnswer, solution } = req.body;
      await db.collection("questions").doc(questionId).update({
        topic, questionText, options, correctAnswer, solution: solution || ""
      });
      res.json({ success: true });
    } catch (error) {
       console.error(error);
       res.status(500).json({ error: "Failed to update question" });
    }
  });
  
  app.delete("/api/admin/questions/:id", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { id } = req.params;
    console.log(`[Admin] Request to delete question: ${id} by ${(req as any).user?.email}`);
    if (!id) return res.status(400).json({ error: "Missing question ID" });
    try {
      await db.collection("questions").doc(id).delete();
      console.log(`[Admin] Successfully deleted question: ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[Admin] Error deleting question ${id}:`, error);
      res.status(500).json({ error: "Failed to delete question", message: error.message });
    }
  });

  app.delete("/api/admin/pyqs/:id", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { id } = req.params;
    console.log(`[Admin] Request to delete pyq: ${id} by ${(req as any).user?.email}`);
    if (!id) return res.status(400).json({ error: "Missing PYQ ID" });
    try {
      await db.collection("pyqs").doc(id).delete();
      console.log(`[Admin] Successfully deleted pyq: ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[Admin] Error deleting pyq ${id}:`, error);
      res.status(500).json({ error: "Failed to delete pyq", message: error.message });
    }
  });

  app.delete("/api/admin/patterns/:id", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { id } = req.params;
    console.log(`[Admin] Request to delete pattern: ${id} by ${(req as any).user?.email}`);
    if (!id) return res.status(400).json({ error: "Missing pattern ID" });
    try {
      await db.collection("patterns").doc(id).delete();
      console.log(`[Admin] Successfully deleted pattern: ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[Admin] Error deleting pattern ${id}:`, error);
      res.status(500).json({ error: "Failed to delete pattern", message: error.message });
    }
  });

  app.delete("/api/admin/carousel/:id", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) {
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
      const docRef = db.collection("carousel").doc(id);
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
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { id } = req.params;
    console.log(`[Admin] Request to delete note: ${id} by ${(req as any).user?.email}`);
    if (!id) return res.status(400).json({ error: "Missing note ID" });
    try {
      await db.collection("notes").doc(id).delete();
      console.log(`[Admin] Successfully deleted note: ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[Admin] Error deleting note ${id}:`, error);
      res.status(500).json({ error: "Failed to delete note", message: error.message });
    }
  });

  app.delete("/api/admin/videos/:id", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { id } = req.params;
    console.log(`[Admin] Request to delete video: ${id} by ${(req as any).user?.email}`);
    if (!id) return res.status(400).json({ error: "Missing video ID" });
    try {
      await db.collection("videos").doc(id).delete();
      console.log(`[Admin] Successfully deleted video: ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[Admin] Error deleting video ${id}:`, error);
      res.status(500).json({ error: "Failed to delete video", message: error.message });
    }
  });

  app.delete("/api/admin/affairs/:id", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing ID" });
    try {
      await db.collection("affairs").doc(id).delete();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete current affair", message: error.message });
    }
  });

  app.delete("/api/admin/practice_sets/:id", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing ID" });
    try {
      await db.collection("practice_sets").doc(id).delete();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete practice set", message: error.message });
    }
  });

  app.delete("/api/admin/tests/:id", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { id } = req.params;
    console.log(`Server: START delete request for test ${id} by ${(req as any).user?.email}`);
    
    if (!id || id === 'undefined') {
      console.error(`Server: Invalid ID provided for test delete: ${id}`);
      return res.status(400).json({ error: "Invalid test ID" });
    }

    try {
      const testRef = db.collection("tests").doc(id);
      const testSnap = await testRef.get();
      
      if (!testSnap.exists) {
        console.warn(`Server: Test ${id} not found in DB - checking for orphaned questions`);
        // We continue anyway to clean up questions if they exist
      }

      // Delete all questions associated with this test
      console.log(`Server: Searching for questions with testId ${id}`);
      const questionsSnap = await db.collection("questions").where("testId", "==", id).get();
      const batch = db.batch();
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

// Vite Integration
async function startVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Express 4 wildcard catch-all for SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global error handler to prevent HTML stack traces
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Express Error:", err);
    if (req.path.startsWith('/api/')) {
      res.status(500).json({ error: "Internal Server Error", details: err.message });
    } else {
      next(err);
    }
  });

  // Only listen if not deployed on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0" as any, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startVite();

export default app;
