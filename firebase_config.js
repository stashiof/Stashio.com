import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, onValue, get, update, push, remove } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBeAEsuacInlrQx05C1uDtqL0DeFzRojMY",
    authDomain: "stashio-6b332.firebaseapp.com",
    databaseURL: "https://stashio-6b332-default-rtdb.firebaseio.com",
    projectId: "stashio-6b332",
    storageBucket: "stashio-6b332.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);
const dbFirestore = getFirestore(app);

// Export for other pages
export { app, rtdb, dbFirestore, ref, onValue, get, update, push, remove, doc, getDoc, updateDoc, setDoc };
