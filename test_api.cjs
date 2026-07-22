const jwt = require('jsonwebtoken');

const JWT_SECRET = "ma_default_jwt_secret_key_2026";
const adminUid = "0SCqNillT6Xe4z3RQzVzinzYiV12";
const adminEmail = "bakolaypan@gmail.com";

const token = jwt.sign(
  { uid: adminUid, email: adminEmail, role: 'admin' },
  JWT_SECRET
);

console.log("Generated Token:", token);

async function runTests() {


  // Test 1: Get students
  try {
    const res = await fetch('http://localhost:3000/api/mock-firestore/getDocs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        path: 'profiles',
        clauses: [{ type: 'where', field: 'role', op: 'in', val: ['user', 'student'] }]
      })
    });
    console.log("Mock Firestore getDocs status:", res.status);
    const json = await res.json();
    console.log("Returned docs count:", json.docs ? json.docs.length : "None");
    if (json.docs && json.docs.length > 0) {
      console.log("Sample student:", json.docs[0]);
    } else {
      console.log("Response JSON:", json);
    }
  } catch (err) {
    console.error("Test 1 error:", err.message);
  }

  // Test 2: Get test questions
  try {
    const testId = "gMGVmgm7QU745xVyJEIT";
    const res = await fetch(`http://localhost:3000/api/test/${testId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log("\nGet test status:", res.status);
    const json = await res.json();
    console.log("Success:", json.success);
    console.log("Questions count:", json.questions ? json.questions.length : "None");
    if (json.questions && json.questions.length > 0) {
      console.log("Sample question keys:", Object.keys(json.questions[0]));
    } else {
      console.log("Response JSON:", json);
    }
  } catch (err) {
    console.error("Test 2 error:", err.message);
  }
}

runTests();
