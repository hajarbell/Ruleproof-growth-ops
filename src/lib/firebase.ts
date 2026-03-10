import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBRAreNOhCThEGM7qvdfPYd1Y8H_W03mcM",
  authDomain: "ruleproof-growth-os.firebaseapp.com",
  projectId: "ruleproof-growth-os",
  storageBucket: "ruleproof-growth-os.firebasestorage.app",
  messagingSenderId: "531873415998",
  appId: "1:531873415998:web:d3681f58d4b2841d2fe26f",
  measurementId: "G-F24QW404WD",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
