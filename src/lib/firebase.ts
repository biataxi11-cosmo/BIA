// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCn58l3GXCwRn4byYMs5HyDORFRl10zc3I",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-9112820495-67573.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-9112820495-67573",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-9112820495-67573.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "399178180137",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:399178180137:web:456df7b5a12e0d16da9e38",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Connect to emulators only if explicitly enabled
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' && typeof window !== 'undefined') {
  try {
    // Check if we're already connected to avoid multiple connections
    if (!(auth as any)._emulator) {
      connectAuthEmulator(auth, "http://localhost:9099");
    }
    if (!(db as any)._settings?.host?.includes('localhost')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }
    if (!(storage as any)._delegate._host?.includes('localhost')) {
      connectStorageEmulator(storage, 'localhost', 9199);
    }
    if (!(functions as any)._delegate._url?.includes('localhost')) {
      connectFunctionsEmulator(functions, 'localhost', 5001);
    }
  } catch (error) {
    console.log('Firebase emulators not available, using production Firebase');
  }
}

export { app, auth, db, storage, functions };
