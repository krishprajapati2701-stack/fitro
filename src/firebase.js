import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyB1hriUiaentTy5zGuKxN1AmBcQiBUHOaA",
  authDomain: "fitro-store.firebaseapp.com",
  projectId: "fitro-store",
  storageBucket: "fitro-store.firebasestorage.app",
  messagingSenderId: "1024321261428",
  appId: "1:1024321261428:web:b639ee26e3d8a431a3a621",
  measurementId: "G-QJRZJHKKTP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export default app;
