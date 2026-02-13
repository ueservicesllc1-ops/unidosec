import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyA8KgKgKwUUP5EvygpcL8gOk7W5ELaeH6M",
    authDomain: "unidosec.firebaseapp.com",
    projectId: "unidosec",
    storageBucket: "unidosec.firebasestorage.app",
    messagingSenderId: "867537820786",
    appId: "1:867537820786:web:dfef1bf862aba63e5236eb",
    measurementId: "G-7Y9SPY5NSB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export default app;
