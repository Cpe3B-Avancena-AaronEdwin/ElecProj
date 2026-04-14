import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

const shouldForceLongPolling =
  import.meta.env.VITE_FIRESTORE_FORCE_LONG_POLLING === "true";
const shouldAutoDetectLongPolling =
  import.meta.env.VITE_FIRESTORE_AUTO_DETECT_LONG_POLLING !== "false";
const shouldUseFetchStreams =
  import.meta.env.VITE_FIRESTORE_USE_FETCH_STREAMS !== "false";

export const auth = getAuth(app);

// Initialize Firestore transport settings explicitly so dev environments with
// restrictive proxies/extensions can fall back from unstable WebChannel/QUIC.
export const db =
  shouldForceLongPolling || !shouldUseFetchStreams
    ? initializeFirestore(app, {
        experimentalForceLongPolling: shouldForceLongPolling,
        experimentalAutoDetectLongPolling: shouldAutoDetectLongPolling,
        useFetchStreams: shouldUseFetchStreams,
      })
    : getFirestore(app);

export default app;