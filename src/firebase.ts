import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

const config = {
    apiKey: "AIzaSyANuJo1oZHEP_9biEEyNEKf7_H_KvqMuCk",
    authDomain: "liquiddemocracyprototype1.firebaseapp.com",
    databaseURL: "https://liquiddemocracyprototype1-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "liquiddemocracyprototype1",
    storageBucket: "liquiddemocracyprototype1.appspot.com",
    messagingSenderId: "208546212870",
    appId: "1:208546212870:web:7cbb9f1480377b62bb6787",
    measurementId: "G-JRBW9ERYYJ"
};

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

const functions = getFunctions();
const generateElectionKeys = httpsCallable(functions, "generateElectionKeys");
const calculateResults = httpsCallable(functions, "calculateResults");

export { auth, db, analytics, functions, generateElectionKeys, calculateResults };