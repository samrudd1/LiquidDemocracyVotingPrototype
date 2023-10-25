import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

const config = {
    //need firebase config
    //https://firebase.google.com/docs/web/learn-more#config-object
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
};

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

const functions = getFunctions();
const generateElectionKeys = httpsCallable(functions, "generateElectionKeys");
const calculateResults = httpsCallable(functions, "calculateResults");

export { auth, db, analytics, functions, generateElectionKeys, calculateResults };
