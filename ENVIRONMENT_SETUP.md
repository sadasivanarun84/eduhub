# Environment Setup Guide

This guide will help you configure Firebase and environment variables for the Game Hub application.

## 📋 Prerequisites

Before starting, you'll need:
- A Google account
- Access to [Firebase Console](https://console.firebase.google.com/)

## 🔥 Step 1: Create Firebase Project

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Click "Create a project"**
3. **Enter project name**: `game-hub` (or your preferred name)
4. **Google Analytics**: Choose whether to enable (optional)
5. **Create project** and wait for setup to complete

## 🔐 Step 2: Enable Authentication

1. **In Firebase Console**, click on **Authentication** in the left sidebar
2. **Click "Get started"**
3. **Go to "Sign-in method" tab**
4. **Click on "Google"** provider
5. **Enable the Google provider**
6. **Set support email** (use your email address)
7. **Save**

## 🗄️ Step 3: Create Firestore Database

1. **Click on "Firestore Database"** in the left sidebar
2. **Click "Create database"**
3. **Start in production mode** (we'll configure rules later)
4. **Choose location** (select closest to your users, e.g., us-central)
5. **Done**

## 🌐 Step 4: Register Web App

1. **Go to Project Settings** (gear icon in sidebar)
2. **Scroll down** to "Your apps" section
3. **Click the web icon** (</>)
4. **Enter app nickname**: `game-hub-web`
5. **Register app**
6. **Copy the config object** - you'll need this for environment variables

The config will look like:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## 🔑 Step 5: Generate Service Account Key

1. **Still in Project Settings**, click **Service accounts** tab
2. **Click "Generate new private key"**
3. **Click "Generate key"** - a JSON file will download
4. **Keep this file secure** - it contains admin credentials

## 📝 Step 6: Configure Environment Variables

### Frontend Configuration

Create `client/.env.local` (copy from `client/.env.local.example`):

```bash
# Use the values from your Firebase config object
VITE_FIREBASE_API_KEY=AIzaSyC...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Backend Configuration

Create `.env` in the project root (copy from `.env.example`):

```bash
# Your Firebase project ID
FIREBASE_PROJECT_ID=your-project-id

# For production (paste the ENTIRE service account JSON as one line)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id",...}'
```

**For development**, you can alternatively set:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

## 🛡️ Step 7: Configure Firestore Security Rules

1. **Go to Firestore Database** in Firebase Console
2. **Click "Rules" tab**
3. **Replace the default rules** with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read and write game data
    match /{collection}/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. **Click "Publish"**

## 🧪 Step 8: Test the Setup

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open browser** to `http://localhost:3000`

3. **Click "Login with Google"** - it should work!

4. **Check browser console** for any Firebase errors

## 🚀 Step 9: Production Deployment

For production, you'll need to:

1. **Set environment variables** in your hosting platform (Cloud Run, Vercel, etc.)

2. **Use the service account key** for server-side Firebase Admin SDK

3. **Update CORS settings** if needed

## 📁 File Structure

After setup, your files should look like:

```
SpinWheel/
├── .env                          # Backend config
├── .env.example                  # Backend template
├── client/
│   ├── .env.local               # Frontend config (your actual values)
│   └── .env.local.example       # Frontend template
├── FIREBASE_SETUP.md            # Detailed Firebase guide
└── ENVIRONMENT_SETUP.md         # This file
```

## ❗ Security Notes

- **Never commit `.env` files** to git (they're in `.gitignore`)
- **Frontend env vars are public** - only use public Firebase config
- **Backend service account key** should be kept secret
- **Use different Firebase projects** for development/production

## 🐛 Troubleshooting

### "Firebase not configured" error
- Check that frontend `.env.local` has all required variables
- Verify variable names start with `VITE_`

### "Permission denied" errors
- Check Firestore security rules
- Verify user is authenticated
- Check Firebase project settings

### Authentication not working
- Verify Google provider is enabled in Firebase Console
- Check that auth domain matches in environment variables
- Ensure Firebase project is active

### Server errors
- Check `FIREBASE_PROJECT_ID` is set correctly
- Verify service account key is valid JSON
- Check server logs for specific Firebase errors

## ✅ Success Checklist

- [ ] Firebase project created
- [ ] Authentication enabled with Google provider
- [ ] Firestore database created
- [ ] Web app registered in Firebase
- [ ] Service account key generated
- [ ] Frontend `.env.local` configured
- [ ] Backend `.env` configured
- [ ] Firestore rules updated
- [ ] Application runs without Firebase errors
- [ ] Google login works
- [ ] Data persists in Firestore

Once all steps are complete, your Game Hub application will be fully functional with Firebase!