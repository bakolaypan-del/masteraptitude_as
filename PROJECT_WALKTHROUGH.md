# Master Aptitude — Project Walkthrough

**Last updated:** 2026-05-18 (rev 3)  
**Stack:** React 19 + Vite (frontend) · Express + Firebase Admin (backend) · Firebase Auth + Firestore (DB) · Vercel (deploy)

---

## Directory Structure

```
/
├── src/                     # React frontend
│   ├── App.tsx              # Root router + anti-cheat security wrapper
│   ├── main.tsx             # Entry point
│   ├── components/
│   │   ├── AuthContext.tsx  # Firebase auth provider, profile persistence
│   │   └── AdminTypingTests.tsx  # Admin typing test CRUD + PDF reports
│   ├── pages/
│   │   ├── Login.tsx        # Phone-based auth (synthetic email pattern)
│   │   ├── Dashboard.tsx    # Student home — tests, notes, videos, profile
│   │   ├── AdminDashboard.tsx  # Admin panel with 10+ tabs
│   │   ├── TestRunner.tsx   # Mock test execution with timer + retry logic
│   │   ├── TypingTestList.tsx   # Browse/filter typing tests
│   │   ├── TypingTestRunner.tsx # Real-time WPM/accuracy execution
│   │   └── TypingTestAnalysis.tsx # Results view
│   ├── lib/
│   │   ├── firebase.ts      # Firebase SDK init (project: gen-lang-client-0535684405)
│   │   └── firestore-errors.ts  # Centralized error logging
│   └── services/
│       └── translationService.ts  # Calls /api/translate → Gemini AI
├── api/
│   └── index.ts             # Vercel serverless wrapper for Express app
├── server.ts                # Express backend (1887 lines) — all API routes
├── firebase-applet-config.json  # Firebase client config
├── firestore.rules          # Firestore security rules
├── storage.rules            # Firebase Storage rules
├── service-account-key1.json    # Firebase admin credentials (local only)
├── mock_analytics.db        # Local SQLite for analytics
├── vercel.json              # Serverless + SPA rewrites
├── vite.config.ts           # Vite + Tailwind, HMR toggle
└── tsconfig.json            # ES2022, JSX react-jsx, @ alias
```

---

## Key Files — What Each Does

| File | Role |
|------|------|
| `App.tsx` | Routes + anti-cheat (blocks F12, right-click, Ctrl+U/S, screenshots; 48-tile email watermark) |
| `AuthContext.tsx` | Auth state, profile CRUD, auto-upgrades bakolaypan@gmail.com to admin |
| `server.ts` | All business logic: 60+ REST routes, Firebase Admin, SQLite analytics, Gemini AI, time sync |
| `Login.tsx` | Phone → synthetic email (`<phone>@students.myapp.com`) for Firebase Auth |
| `TestRunner.tsx` | Timed exam UI, 5-retry auto-load, timer, flag-for-review, auto-submit on timeout |
| `TypingTestRunner.tsx` | WPM = (correct chars / 5) / minutes; tracks accuracy, errors, word-level |
| `AdminDashboard.tsx` | Tabs: students, mock tests, typing tests, notes, videos, PYQs, patterns, carousel, social, affairs, practice sets, site info |

---

## API Routes (server.ts)

### Public
- `GET /api/health` — server status
- `GET /api/custom-categories` — active categories
- `GET /api/category-order` — ordered test categories

### Auth-required
- `POST /api/auth/check-mobile` — phone lookup
- `POST /api/auth/reset-password` — reset by phone
- `GET /api/test/:testId` — fetch test + questions (no answers)
- `POST /api/submit-test` — score calc, store results + SQLite analytics
- `GET /api/test-questions/:testId` — questions with stats (for PDF)
- `GET /api/typing-tests` — list active typing tests
- `GET /api/typing-test/:id` — single typing test
- `POST /api/typing-test/submit` — submit typing result
- `GET /api/typing-results/student` — student's typing results
- `GET /api/typing-result/:id` — single typing result
- `POST /api/translate` — Gemini translation

### Admin-only
- `GET /api/admin/students` — all students
- `GET /api/admin/stats` — total/active/blocked/today counts
- `PUT/DELETE /api/admin/students/:id` — update/delete student
- `GET /api/admin/student-attempts/:studentId` — test history
- `GET /api/admin/test-attempt-analysis/:attemptId` — deep analysis
- `POST/PUT/DELETE /api/admin/tests` — test CRUD
- `POST /api/admin/questions` — add questions
- `POST /api/admin/bulk-create-tests` — bulk test creation
- `DELETE /api/admin/questions/:id` — delete question
- `POST/PUT/DELETE /api/admin/typing-test` — typing test CRUD
- `GET /api/admin/typing-results` — all typing results with student names
- `POST /api/admin/seed-typing-tests` — seed 15 dummy tests
- `POST /api/admin/category-order` — update display order
- `GET/POST/PUT/DELETE /api/admin/custom-categories/*` — category management
- Delete endpoints for: pyqs, patterns, carousel, notes, videos, affairs, practice_sets

---

## Firestore Collections & Schemas

| Collection | Key Fields |
|------------|-----------|
| `profiles/{userId}` | name, email, phoneNumber, role, totalTestsTaken, cumulativeScore, globalRank, status ('active'/'blocked') |
| `tests/{testId}` | title, topic, subjectName, category, testType, duration, marksPerCorrect, negativeMarks, isActive |
| `questions/{questionId}` | testId, topic, qNo, questionText, options[], correctAnswer, solution, explanation |
| `results/{resultId}` | userId, testId, score, correctAnswers, wrongAnswers, unattempted, accuracy, timeTaken, userAnswers{}, questionTimes{} |
| `mock_question_analysis/{id}` | userId, testId, questionId, selectedAnswer, correctAnswer, isCorrect, timeTakenSeconds |
| `typing_tests/{id}` | title, paragraph, duration (min), difficulty, language, isActive |
| `typing_results/{id}` | userId, testId, attemptNo, wpm, accuracy, errors, timeTakenMinutes |
| `notes/{id}` | noteTitle, noteLink, noteSubject, fileUrl |
| `videos/{id}` | videoTitle, videoLink, videoSubject |
| `pyqs/{id}` | pyqTitle, pyqLink, pyqSubject, fileUrl |
| `patterns/{id}` | patternExamName, fileUrls[] |
| `carousel/{id}` | imageUrl, priority |
| `affairs/{id}` | affairTitle, affairDate, affairLink |
| `practice_sets/{id}` | practiceTitle, practiceSubject, fileUrl, practiceLink |
| `custom_categories/{id}` | categoryName, categoryType, icon, colorTheme, status (0/1) |
| `settings/category_order` | order: string[] |

---

## Environment Variables

| Var | Purpose |
|-----|---------|
| `GEMINI_API_KEY` | Gemini AI (exposed to frontend via Vite define) |
| `GOOGLE_GENAI_API_KEY` | Backend Gemini key |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin credentials JSON (Vercel env) |
| `FIREBASE_PROJECT_ID` | Project ID override |
| `FIRESTORE_DATABASE_ID` | Custom Firestore DB ID |
| `PORT` | Server port (default 3000) |
| `NODE_ENV` | development / production |
| `DISABLE_HMR` | Disables Vite HMR (AI Studio compat) |

---

## Firebase Config

- **Project ID:** gen-lang-client-0535684405
- **Firestore DB:** ai-studio-a04eec93-77d7-4d06-a729-9d2c233ce685
- **Auth Domain:** gen-lang-client-0535684405.firebaseapp.com
- **Storage Bucket:** gen-lang-client-0535684405.firebasestorage.app

---

## Security Architecture

- **Auth:** Firebase Auth email/password with synthetic emails
- **API guard:** JWT token verified on all /api/* routes
- **Admin check:** email == 'bakolaypan@gmail.com' OR profile.role == 'admin'
- **Firestore rules:** deny-by-default; users see own data; admins see all; questions are admin-only
- **Storage rules:** public reads; writes restricted to admin
- **Anti-cheat:** F12/DevTools blocked, right-click disabled, Ctrl+U/S blocked, email watermark x48

---

## Special Technical Details

- **Time sync** (server.ts ~line 5): Syncs with Google on startup (local only), patches Date if drift > 10s
- **Firestore fallback**: If offline, serves 5-question sandbox test from hardcoded data
- **SQLite** (`mock_analytics.db`): Batch-inserts per-question analytics alongside Firestore writes
- **Retry logic** (TestRunner.tsx ~line 129): Auto-retries test load 5× at 3s intervals
- **PDF export**: jsPDF + jspdf-autotable; admin can download questions with pass rates
- **Bulk test creation**: Admin can create multiple tests with placeholder questions at once
- **Typing WPM formula**: (correct chars / 5) / time in minutes

---

## Dependencies (notable)

- React 19, React Router 7, Firebase SDK 12.12.1
- Express 4, Firebase Admin 13.8.0
- @google/genai 1.29.0, @google/generative-ai 0.24.1
- sqlite3, bcryptjs, jsonwebtoken
- lucide-react, motion (animations)
- jspdf, jspdf-autotable
- Vite 6, Tailwind CSS, esbuild
