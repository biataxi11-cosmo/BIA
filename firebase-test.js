// Simple Firebase test
const { initializeApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCn58l3GXCwRn4byYM5HyDORFRl10zc3I",
  authDomain: "studio-9112820495-67573.firebaseapp.com",
  projectId: "studio-9112820495-67573",
  storageBucket: "studio-9112820495-67573.firebasestorage.app",
  messagingSenderId: "399178180137",
  appId: "1:399178180137:web:456df7b5a12e0d16da9e38",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("Firebase app initialized:", app.name);

// Get Auth instance
const auth = getAuth(app);
console.log("Firebase Auth initialized:", !!auth);