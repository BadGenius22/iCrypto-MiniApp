import dotenv from "dotenv";
import path from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { generateMerkleTree } from "../src/utils/merkleTreeGenerator";
import fs from "fs";

// Load environment variables from the root directory
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Read the service account file
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH is not set in .env.local");
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
  });
}

const db = getFirestore();

async function main() {
  try {
    console.log("Environment variables:");
    console.log("Firebase configuration:");
    console.log("Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    console.log("Service Account Path:", serviceAccountPath);

    console.log("Starting Merkle tree generation...");
    const rootHash = await generateMerkleTree(db);
    if (rootHash === "0x") {
      console.warn(
        "Warning: Root hash is empty. This may indicate no data was processed."
      );
    }
    console.log("Merkle tree generation completed.");
    console.log("Root hash:", rootHash);
  } catch (error) {
    console.error("Error generating Merkle tree:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
  }
}

main();
