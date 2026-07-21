const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// 1. Path to your service account key
const keyPath = path.resolve(__dirname, '../service-account-key1.json');
if (!fs.existsSync(keyPath)) {
  console.error(`Error: Service account key not found at ${keyPath}`);
  process.exit(1);
}

const serviceAccount = require(keyPath);

// 2. Initialize Firebase Admin pointing to your custom database ID
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "gen-lang-client-0535684405"
});

// Access the specific database
const db = admin.firestore("ai-studio-a04eec93-77d7-4d06-a729-9d2c233ce685");

// List of collections we want to migrate
const collections = [
  'profiles',
  'tests',
  'questions',
  'results',
  'notes',
  'videos',
  'pyqs',
  'patterns',
  'carousel',
  'affairs',
  'practice_sets',
  'custom_categories'
];

const outputDir = path.resolve(__dirname, '../migration_data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

async function exportCollections() {
  console.log("Starting Firestore export to JSON...");
  
  for (const collectionName of collections) {
    try {
      console.log(`Exporting collection: "${collectionName}"...`);
      const snapshot = await db.collection(collectionName).get();
      
      const data = {};
      snapshot.forEach(doc => {
        data[doc.id] = doc.data();
      });
      
      const outputPath = path.join(outputDir, `${collectionName}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`✓ Saved ${Object.keys(data).length} documents to migration_data/${collectionName}.json`);
    } catch (error) {
      console.error(`✗ Failed to export "${collectionName}":`, error.message);
      console.log("If your quota is still exceeded, please wait a bit and run the script again.");
    }
  }
  
  console.log("\nExport complete! Check the 'migration_data' folder in your project root.");
}

exportCollections().catch(console.error);
