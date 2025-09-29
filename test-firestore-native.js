import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK with explicit native mode
function initializeFirebase() {
  if (getApps().length === 0) {
    console.log("Initializing Firebase in Native Firestore mode...");

    try {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (serviceAccountKey) {
        const serviceAccount = JSON.parse(serviceAccountKey);
        console.log("Using service account:", serviceAccount.client_email);
        console.log("Project ID:", serviceAccount.project_id);

        initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID,
          // Explicitly set database URL for Firestore in Native mode
          databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/`
        });
        console.log("Firebase initialized successfully");
        return true;
      } else {
        console.error("No service account key found");
        return false;
      }
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      return false;
    }
  }
  return true;
}

async function testFirestoreNative() {
  if (!initializeFirebase()) {
    return;
  }

  const db = getFirestore();
  console.log("Testing Firestore connection in Native mode...");

  try {
    // Try to create a simple document first (this should auto-initialize the database)
    console.log("Attempting to create a test document...");
    const testDocRef = db.collection('test').doc('init');
    await testDocRef.set({
      message: 'Firestore initialization test',
      timestamp: new Date(),
      mode: 'native'
    });
    console.log("✅ Test document created successfully!");

    // Now try to read it back
    const doc = await testDocRef.get();
    if (doc.exists) {
      console.log("✅ Test document read successfully:", doc.data());
    } else {
      console.log("⚠️  Test document not found");
    }

    // Clean up - delete the test document
    await testDocRef.delete();
    console.log("✅ Test document deleted successfully!");

    console.log("✅ Firestore Native mode test completed successfully!");
  } catch (error) {
    console.error("❌ Firestore test failed:", error.message);
    console.error("Full error:", error);
  }
}

testFirestoreNative();