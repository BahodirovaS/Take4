import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDR_DB1QClsS3XeQpfIJtDTtU1Q_G3q7Q4",
    authDomain: "rideshare-96aad.firebaseapp.com",
    projectId: "rideshare-96aad",
    storageBucket: "rideshare-96aad.appspot.com",
    messagingSenderId: "526273475573",
    appId: "1:526273475573:web:5a142e62180b451e1ae6bc",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);

export { app, db, auth };