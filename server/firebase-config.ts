import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin SDK
function initializeFirebase() {
  // Check if Firebase is already initialized
  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      // Production: Use service account key
      const serviceAccount = JSON.parse(serviceAccountKey);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
      });
    } else {
      // Development: Use default credentials
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
      });
    }
  }
}

// Initialize Firebase
initializeFirebase();

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
} as const;