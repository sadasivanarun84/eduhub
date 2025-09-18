import React from 'react';
import { auth, googleProvider } from '@/lib/firebase';

export default function FirebaseTest() {
  const testFirebaseConfig = () => {
    console.log('=== Firebase Configuration Test ===');
    console.log('Auth object:', auth);
    console.log('Google Provider:', googleProvider);
    console.log('Environment variables:');
    console.log('API Key:', import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + '...');
    console.log('Auth Domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
    console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
    
    if (!auth) {
      alert('Firebase Auth is not initialized!');
    } else {
      alert('Firebase Auth is properly initialized');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Firebase Configuration Test</h1>
      
      <div className="space-y-4">
        <div>
          <strong>Firebase Auth Status:</strong> {auth ? '✅ Initialized' : '❌ Not Initialized'}
        </div>
        
        <div>
          <strong>Google Provider Status:</strong> {googleProvider ? '✅ Configured' : '❌ Not Configured'}
        </div>
        
        <div>
          <strong>Environment Check:</strong>
          <ul className="ml-4 mt-2">
            <li>API Key: {import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing'}</li>
            <li>Auth Domain: {import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing'}</li>
            <li>Project ID: {import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing'}</li>
          </ul>
        </div>
        
        <button
          onClick={testFirebaseConfig}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Configuration (Check Console)
        </button>
        
        <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
          <h3 className="font-bold">Next Steps:</h3>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Go to Firebase Console → Authentication</li>
            <li>Enable Google Sign-in provider</li>
            <li>Add localhost to authorized domains</li>
            <li>Set support email address</li>
          </ol>
        </div>
      </div>
    </div>
  );
}