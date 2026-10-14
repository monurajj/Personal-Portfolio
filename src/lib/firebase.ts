import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase web app. The config is public by design; what matters is the
 * Firestore security rules (see firestore.rules at the repo root).
 */
const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

export function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(config);
}

export function getDb() {
  return getFirestore(getFirebaseApp());
}
