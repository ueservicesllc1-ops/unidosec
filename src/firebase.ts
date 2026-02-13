import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyANDPmm9TZzYsgLhzg5vrpO9BIWgeWRcsA",
    authDomain: "infieles-29223.firebaseapp.com",
    projectId: "infieles-29223",
    storageBucket: "infieles-29223.firebasestorage.app",
    messagingSenderId: "588069651968",
    appId: "1:588069651968:web:f1ac85609d696c42bc3ae5",
    measurementId: "G-809D3QQC9J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
