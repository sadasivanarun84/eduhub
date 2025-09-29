import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
function initializeFirebase() {
  if (getApps().length === 0) {
    console.log("Initializing Firebase...");
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        console.log("Using service account:", serviceAccount.client_email);
        console.log("Project ID:", serviceAccount.project_id);

        initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
        console.log("Firebase initialized successfully");
      } catch (error) {
        console.error("Error initializing Firebase:", error);
        return false;
      }
    } else {
      console.error("No service account key found");
      return false;
    }
  }
  return true;
}

async function testFirestore() {
  if (!initializeFirebase()) {
    return;
  }

  const db = getFirestore();
  console.log("Testing Firestore connection...");

  try {
    // Try to list collections
    console.log("Attempting to list collections...");
    const collections = await db.listCollections();
    console.log("Collections found:", collections.length);
    collections.forEach(collection => {
      console.log("- Collection:", collection.id);
    });

    // Try to read from a specific collection
    console.log("Attempting to read from 'classrooms' collection...");
    const snapshot = await db.collection('classrooms').get();
    console.log("Classrooms collection - size:", snapshot.size, "empty:", snapshot.empty);

    if (!snapshot.empty) {
      snapshot.forEach(doc => {
        console.log("Document ID:", doc.id, "Data:", doc.data());
      });
    }

    console.log("✅ Firestore test completed successfully!");
  } catch (error) {
    console.error("❌ Firestore test failed:", error.message);
    console.error("Full error:", error);
  }
}

testFirestore();