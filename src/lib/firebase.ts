import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCX3JcNa5CA-9QG5XMw60MDpmgrDkL8oyU",
  authDomain: "yash-links-crm.firebaseapp.com",
  projectId: "yash-links-crm",
  storageBucket: "yash-links-crm.firebasestorage.app",
  messagingSenderId: "596137726391",
  appId: "1:596137726391:web:fdd951a866723eb54cd832",
  measurementId: "G-NX0XXT8E5W"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
