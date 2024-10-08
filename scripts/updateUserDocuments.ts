import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH is not set in .env.local");
}

let serviceAccount;
try {
  const rawData = fs.readFileSync(serviceAccountPath, "utf8");
  serviceAccount = JSON.parse(rawData);
} catch (error) {
  console.error(`Error reading service account file at ${serviceAccountPath}`);
  console.error(error);
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
  });
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:");
  console.error(error);
  process.exit(1);
}

const db = admin.firestore();
const usersRef = db.collection("users");

async function updateUserDocuments(seasonId: number) {
  const snapshot = await usersRef.get();

  const batch = db.batch();

  snapshot.forEach(doc => {
    const userData = doc.data();
    if (userData.tokenRewards && Array.isArray(userData.tokenRewards)) {
      const updatedTokenRewards = userData.tokenRewards.map(reward => ({
        ...reward,
        seasonId: seasonId,
      }));

      batch.update(doc.ref, { tokenRewards: updatedTokenRewards });
    } else {
      console.warn(`User ${doc.id} has no tokenRewards or it's not an array. Skipping.`);
    }
  });

  await batch.commit();
  console.log(`All user documents updated for season ${seasonId}`);
}

// Get season ID from command line argument
const seasonId = parseInt(process.argv[2], 10);
if (isNaN(seasonId)) {
  throw new Error("Please provide a valid season ID as a command line argument");
}

updateUserDocuments(seasonId).catch(console.error);
