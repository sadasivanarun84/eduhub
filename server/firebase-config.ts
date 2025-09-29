import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin SDK
async function initializeFirebase() {
  // Check if Firebase is already initialized
  if (getApps().length === 0) {
    console.log("=== Firebase Initialization Debug ===");
    console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);

    // Try service account file first
    const serviceAccountPath = './new-service-account-key.json';
    let useServiceAccountFile = false;

    try {
      const { readFileSync, existsSync } = await import('fs');
      const { resolve } = await import('path');
      const absolutePath = resolve(serviceAccountPath);
      console.log("Looking for service account at:", absolutePath);

      if (existsSync(absolutePath)) {
        console.log("Service account file found, using file-based authentication");
        const serviceAccount = JSON.parse(readFileSync(absolutePath, 'utf8'));
        console.log("Service account loaded successfully");
        console.log("Service account project_id:", serviceAccount.project_id);
        console.log("Service account client_email:", serviceAccount.client_email);

        // Validate the service account has required fields
        if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
          throw new Error("Invalid service account key: missing required fields");
        }

        const config = {
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id, // Use project ID from service account
          storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
        };
        console.log("Firebase config:", {
          projectId: config.projectId,
          storageBucket: config.storageBucket,
          hasCredential: !!config.credential
        });

        initializeApp(config);
        console.log("Firebase initialized successfully with service account file");
        useServiceAccountFile = true;
      } else {
        console.log("Service account file not found at:", absolutePath);
      }
    } catch (fileError) {
      console.log("Service account file error:", fileError.message);
    }

    if (!useServiceAccountFile) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      console.log("Service account key exists:", !!serviceAccountKey);
      console.log("Service account key length:", serviceAccountKey ? serviceAccountKey.length : 0);

      if (serviceAccountKey) {
        try {
          // Production: Use service account key
          console.log("Parsing service account key...");
          const serviceAccount = JSON.parse(serviceAccountKey);
          console.log("Service account parsed successfully");
          console.log("Service account project_id:", serviceAccount.project_id);
          console.log("Service account client_email:", serviceAccount.client_email);

          const config = {
            credential: cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
          };
          console.log("Firebase config:", {
            projectId: config.projectId,
            storageBucket: config.storageBucket,
            hasCredential: !!config.credential
          });

          initializeApp(config);
          console.log("Firebase initialized successfully with service account");
        } catch (error) {
          console.error("Error parsing service account key:", error);
          console.log("Falling back to default credentials");

          // Fallback to default credentials
          initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
          });
        }
      } else {
        console.log("No service account key found, using default credentials");
        // Development: Use default credentials
        initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID,
          storageBucket: `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
        });
      }
    }

    console.log("Firebase apps initialized:", getApps().length);
  } else {
    console.log("Firebase already initialized, apps count:", getApps().length);
  }
}

// Initialize Firebase
await initializeFirebase();

// Get Firestore instance
export const db = getFirestore();

// Get Storage instance
export const storage = getStorage();

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  CAMPAIGNS: 'campaigns',
  WHEEL_SECTIONS: 'wheelSections',
  SPIN_RESULTS: 'spinResults',
  DICE_CAMPAIGNS: 'diceCampaigns',
  DICE_FACES: 'diceFaces',
  DICE_RESULTS: 'diceResults',
  THREE_DICE_CAMPAIGNS: 'threeDiceCampaigns',
  THREE_DICE_FACES: 'threeDiceFaces',
  THREE_DICE_RESULTS: 'threeDiceResults',
  USER_SLOT_SETTINGS: 'userSlotSettings',
  QUIZ_QUESTIONS: 'quizQuestions',
  QUIZ_RESULTS: 'quizResults',
  QUIZ_SESSIONS: 'quizSessions',
  QUIZ_BACKGROUND_IMAGES: 'quizBackgroundImages',
  CLASSROOMS: 'classrooms',
  CLASSROOM_ADMINS: 'classroomAdmins',
  CLASSROOM_STUDENTS: 'classroomStudents',
  CLASSROOM_SUBJECTS: 'classroomSubjects',
  SUBJECTS: 'subjects',
  FLASH_CARDS: 'flashCards',
  STUDENT_PROGRESS: 'studentProgress',
} as const;