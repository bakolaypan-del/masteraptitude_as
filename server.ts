import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import cookieParser from "cookie-parser";
import fs from "fs";

// Initialize Firebase Admin
let config: any = {};
try {
  const firebaseConfigPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    config = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountStr) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountStr)),
        projectId: config.projectId,
      });
      console.log("Firebase Admin initialized with service account.");
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: config.projectId,
      });
      console.log("Firebase Admin initialized with application default credentials.");
    }
  } else {
    // Basic initialization for cases where config file is missing
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
    console.log("Firebase Admin initialized with basic application default credentials.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
}

const db = admin.apps.length > 0 ? getFirestore(admin.app(), config.firestoreDatabaseId) : null;

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
  if (!db) return res.status(500).json({ error: "Database not initialized" });
  
  try {
    const profileSnap = await db.collection("profiles").doc(user.uid).get();
    if (profileSnap.exists && profileSnap.data()?.role === "admin") {
      next();
    } else {
      return res.status(403).json({ error: "Forbidden: Admins only" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Failed to verify admin status" });
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// API Routes
  
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
          score += 1;
        } else {
          wrong++;
          score -= 0.25;
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

  // Admin Routes
  app.post("/api/admin/create-test", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    try {
      const { title, topic, isActive, duration, testType } = req.body;
      const ref = db.collection("tests").doc();
      await ref.set({
        title,
        topic,
        testType: testType || 'topic',
        duration: duration || 30, // Default 30 mins
        isActive: !!isActive,
        createdAt: Date.now()
      });
      res.json({ id: ref.id, title, topic, testType, isActive, duration });
    } catch (error) {
       console.error(error);
       res.status(500).json({ error: "Failed to create test" });
    }
  });

  app.put("/api/admin/tests/:testId", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    try {
      const { testId } = req.params;
      const { title, topic, isActive, duration, testType } = req.body;
      const updateData: any = {
        title,
        topic,
        duration: duration || 30,
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
      const { testId, topic, qNo, questionText, options, correctAnswer } = req.body;
      const ref = db.collection("questions").doc();
      await ref.set({
        testId, topic, qNo, questionText, options, correctAnswer
      });
      res.json({ id: ref.id });
    } catch (error) {
       console.error(error);
       res.status(500).json({ error: "Failed to create question" });
    }
  });
  
  app.delete("/api/admin/questions/:questionId", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { questionId } = req.params;
    console.log(`Server: Request to delete question ${questionId}`);
    try {
      await db.collection("questions").doc(questionId).delete();
      console.log(`Server: Successfully deleted question ${questionId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Server: Error deleting question ${questionId}:`, error);
      res.status(500).json({ error: "Failed to delete question", message: error.message });
    }
  });

  app.delete("/api/admin/materials/:collection/:id", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { collection, id } = req.params;
    const allowedCollections = ['notes', 'videos', 'pyqs', 'patterns', 'carousel'];
    if (!allowedCollections.includes(collection)) {
      return res.status(400).json({ error: "Invalid collection" });
    }
    console.log(`Server: Request to delete ${collection} ${id}`);
    try {
      await db.collection(collection).doc(id).delete();
      console.log(`Server: Successfully deleted ${collection} ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Server: Error deleting ${collection} ${id}:`, error);
      res.status(500).json({ error: `Failed to delete ${collection}`, message: error.message });
    }
  });

  app.delete("/api/admin/notes/:noteId", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { noteId } = req.params;
    console.log(`Server: Request to delete note ${noteId}`);
    try {
      await db.collection("notes").doc(noteId).delete();
      console.log(`Server: Successfully deleted note ${noteId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Server: Error deleting note ${noteId}:`, error);
      res.status(500).json({ error: "Failed to delete note", message: error.message });
    }
  });

  app.delete("/api/admin/videos/:videoId", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { videoId } = req.params;
    console.log(`Server: Request to delete video ${videoId}`);
    try {
      await db.collection("videos").doc(videoId).delete();
      console.log(`Server: Successfully deleted video ${videoId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Server: Error deleting video ${videoId}:`, error);
      res.status(500).json({ error: "Failed to delete video", message: error.message });
    }
  });

  app.delete("/api/admin/tests/:testId", verifyToken, verifyAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: "DB offline" });
    const { testId } = req.params;
    console.log(`Server: START delete request for test ${testId}`);
    try {
      // Delete all questions associated with this test
      console.log(`Server: Searching for questions with testId ${testId}`);
      const questionsSnap = await db.collection("questions").where("testId", "==", testId).get();
      const batch = db.batch();
      console.log(`Server: Found ${questionsSnap.size} questions to delete for test ${testId}`);
      
      questionsSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete the test itself
      console.log(`Server: Adding test ${testId} to batch deletion`);
      batch.delete(db.collection("tests").doc(testId));
      
      console.log(`Server: Attempting to commit batch for test ${testId}`);
      await batch.commit();
      console.log(`Server: SUCCESS - Deleted test ${testId} and all associated items`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Server: ERROR deleting test ${testId}:`, error);
      res.status(500).json({ error: "Failed to delete test", message: error.message });
    }
  });

// Vite Integration
async function startVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Express 4 wildcard catch-all for SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen if not deployed on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0" as any, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startVite();

export default app;
