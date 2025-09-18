# Firebase Setup Guide

This application now uses Firebase for both authentication and database storage, replacing the previous Passport.js + PostgreSQL setup.

## ✅ What's Implemented

### Backend (Server-side)
- **Firebase Admin SDK**: Server-side Firebase integration
- **Firestore Database**: Complete storage implementation replacing MemStorage
- **Firebase Auth Verification**: Server-side token verification
- **Collection Structure**: Organized Firestore collections for all game data

### Frontend (Client-side)
- **Firebase Auth**: Google Sign-in with popup
- **Authentication State Management**: Real-time auth state updates
- **Token Management**: Automatic ID token handling
- **User Profile Integration**: Seamless user data flow

### Database Collections
- `users` - User profiles and authentication data
- `campaigns` - Spinning wheel campaigns
- `wheelSections` - Wheel section configurations
- `spinResults` - Spin results and statistics
- `diceCampaigns` - Dice game campaigns
- `diceFaces` - Dice face configurations
- `diceResults` - Dice roll results
- `threeDiceCampaigns` - Three dice game campaigns
- `threeDiceFaces` - Three dice face configurations
- `threeDiceResults` - Three dice roll results
- `userSlotSettings` - User slot machine settings

## 🔧 Firebase Project Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "game-hub-app")
4. Enable Google Analytics (optional)
5. Create project

### Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab
4. Enable **Google** provider
5. Set support email address

### Step 3: Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose "Start in production mode" (we'll configure rules later)
4. Select a location (preferably close to your users)

### Step 4: Configure Web App

1. Go to **Project Settings** (gear icon)
2. Click "Add app" and select **Web** (</> icon)
3. Enter app nickname (e.g., "game-hub-web")
4. Register app
5. Copy the configuration object

## 🛠️ Environment Configuration

### Frontend Environment Variables

Create `.env.local` in the client directory:

```bash
# Firebase Web App Config (Client-side - these are public)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Backend Environment Variables

Add these to your main `.env` file:

```bash
# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=your_project_id

# For production (service account key)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"..."}' 

# For development, you can use default application credentials
# or set GOOGLE_APPLICATION_CREDENTIALS path
```

### Step 5: Service Account Setup (Production)

1. In Firebase Console, go to **Project Settings**
2. Go to **Service accounts** tab
3. Click "Generate new private key"
4. Download the JSON file
5. For production, set the entire JSON content as `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable

### Step 6: Firestore Security Rules

Set up Firestore rules for proper security:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Campaigns - users can read all, but only write their own
    match /campaigns/{campaignId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid);
    }
    
    // Wheel sections - users can read all, but only write for their campaigns
    match /wheelSections/{sectionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Results are readable by authenticated users
    match /{collection}/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## 🚀 Development Setup

### 1. Install Dependencies

The required Firebase packages are already installed:
- `firebase` (client SDK)
- `firebase-admin` (admin SDK)

### 2. Start Development Server

```bash
# Set Firebase environment variables
export FIREBASE_PROJECT_ID=your_project_id

# Start the server
npm run dev
```

### 3. Test Authentication

1. Open `http://localhost:3000`
2. Click "Login with Google"
3. Complete OAuth flow
4. Verify user profile appears

## 📊 Data Migration

If you had existing data, you'll need to migrate it to Firestore. The new structure is:

### User Data
```javascript
{
  id: "auto-generated",
  email: "user@example.com",
  googleId: "firebase-uid",
  displayName: "User Name",
  profilePicture: "https://...",
  role: "user" | "admin" | "super_admin",
  isActive: true,
  createdAt: Timestamp,
  lastLoginAt: Timestamp
}
```

### Campaign Data
```javascript
{
  id: "auto-generated",
  name: "Campaign Name",
  totalAmount: 1000,
  totalWinners: 100,
  currentSpent: 0,
  currentWinners: 0,
  rotationSequence: [0, 2, 1, 3],
  currentSequenceIndex: 0,
  isActive: true,
  userId: "owner-user-id", // NEW: user ownership
  isPublic: false, // NEW: visibility control
  createdAt: Timestamp
}
```

## 🔐 Security Features

### Authentication
- **Firebase ID Token**: Secure token-based authentication
- **Automatic Token Refresh**: Firebase handles token renewal
- **Server-side Verification**: All API calls verify tokens server-side

### Authorization
- **Role-based Access**: User, Admin, Super Admin roles
- **Resource Ownership**: Users can only modify their own resources
- **Super Admin Override**: `sadasivanarun84@gmail.com` gets super_admin role

### Data Protection
- **Firestore Rules**: Database-level security
- **CORS Configuration**: Proper cross-origin setup
- **Input Validation**: Zod schema validation maintained

## 🧪 Testing

### Test Firebase Connection

```bash
# Test with real Firebase project
FIREBASE_PROJECT_ID=your_project_id npm run dev
```

### Verify Features
1. **Authentication Flow**: Login/logout works
2. **Data Persistence**: Game data saves to Firestore
3. **Real-time Updates**: Changes reflect immediately
4. **Offline Support**: Firebase handles offline scenarios

## 🚦 Production Deployment

### Environment Variables for Production

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Client-side (build-time)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Deploy Command
```bash
./deploy.sh
```

## 📈 Benefits of Firebase

### Over PostgreSQL + Passport.js
1. **Serverless**: No database server to manage
2. **Real-time**: Built-in real-time updates
3. **Scalable**: Automatic scaling with usage
4. **Offline**: Built-in offline support
5. **Security**: Comprehensive security rules

### For Game Hub
1. **User Management**: Simplified user registration/login
2. **Data Sync**: Real-time game state synchronization
3. **Multi-device**: Same account across devices
4. **Analytics**: Built-in user analytics
5. **Performance**: Fast global CDN

## 🔄 Migration Status

✅ **Complete**: Firebase Firestore storage layer  
✅ **Complete**: Firebase Authentication  
✅ **Complete**: Frontend Firebase integration  
✅ **Complete**: Backend token verification  
✅ **Complete**: User role management  
🔄 **Ready**: Environment configuration and testing

The application is now fully converted to Firebase! Set up your Firebase project and configure the environment variables to start using it.