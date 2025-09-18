#!/usr/bin/env node

/**
 * Firebase Setup Helper Script
 * 
 * This script helps guide you through the Firebase setup process
 * and validates your configuration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔥 Firebase Setup Helper\n');

// Check if environment files exist
const envPath = path.join(__dirname, '..', '.env');
const clientEnvPath = path.join(__dirname, '..', 'client', '.env.local');

console.log('📋 Checking environment files...\n');

// Check backend .env
if (fs.existsSync(envPath)) {
  console.log('✅ Backend .env file exists');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasFirebaseProjectId = envContent.includes('FIREBASE_PROJECT_ID=') && !envContent.includes('FIREBASE_PROJECT_ID=your_firebase_project_id');
  
  if (hasFirebaseProjectId) {
    console.log('✅ FIREBASE_PROJECT_ID is configured');
  } else {
    console.log('❌ FIREBASE_PROJECT_ID needs to be configured in .env');
  }
} else {
  console.log('❌ Backend .env file missing');
  console.log('   Copy .env.example to .env and configure it');
}

// Check frontend .env.local
if (fs.existsSync(clientEnvPath)) {
  console.log('✅ Frontend .env.local file exists');
  
  const clientEnvContent = fs.readFileSync(clientEnvPath, 'utf8');
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];
  
  const configured = requiredVars.filter(varName => 
    clientEnvContent.includes(`${varName}=`) && 
    !clientEnvContent.includes(`${varName}=your_`)
  );
  
  if (configured.length === requiredVars.length) {
    console.log('✅ All Firebase frontend variables configured');
  } else {
    console.log(`❌ ${requiredVars.length - configured.length} Firebase variables need configuration in client/.env.local`);
    console.log('   Missing:', requiredVars.filter(v => !configured.includes(v)).join(', '));
  }
} else {
  console.log('❌ Frontend .env.local file missing');
  console.log('   Copy client/.env.local.example to client/.env.local and configure it');
}

console.log('\n📚 Setup Documentation:');
console.log('• Quick Start: ENVIRONMENT_SETUP.md');
console.log('• Detailed Guide: FIREBASE_SETUP.md');
console.log('• Templates: .env.example and client/.env.local.example');

console.log('\n🚀 Next Steps:');
if (!fs.existsSync(envPath)) {
  console.log('1. Copy .env.example to .env');
}
if (!fs.existsSync(clientEnvPath)) {
  console.log('2. Copy client/.env.local.example to client/.env.local');
}
console.log('3. Follow ENVIRONMENT_SETUP.md to create Firebase project');
console.log('4. Update .env and client/.env.local with your Firebase config');
console.log('5. Run: npm run dev');

console.log('\n💡 Quick Firebase Project Creation:');
console.log('1. Go to: https://console.firebase.google.com/');
console.log('2. Create project → Enable Auth (Google) → Create Firestore');
console.log('3. Add Web App → Copy config to client/.env.local');
console.log('4. Generate service account key → Add to .env');