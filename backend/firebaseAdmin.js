import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

function buildCredentialFromJsonFile() {
  if (!fs.existsSync(serviceAccountPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(serviceAccountPath, "utf8");
    const parsed = JSON.parse(raw);

    if (
      !parsed.project_id ||
      !parsed.client_email ||
      !parsed.private_key
    ) {
      throw new Error(
        "serviceAccountKey.json is missing project_id, client_email, or private_key."
      );
    }

    return admin.credential.cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    });
  } catch (error) {
    throw new Error(
      `Failed to load serviceAccountKey.json: ${error.message}`
    );
  }
}

function buildCredentialFromEnv() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    return null;
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n").trim();

  if (
    !privateKey.includes("BEGIN PRIVATE KEY") ||
    !privateKey.includes("END PRIVATE KEY")
  ) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY is present but is not a valid PEM block."
    );
  }

  return admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  });
}

function getFirebaseCredential() {
  const jsonExists = fs.existsSync(serviceAccountPath);

  if (jsonExists) {
    console.log("Using Firebase Admin credentials from serviceAccountKey.json");
    return buildCredentialFromJsonFile();
  }

  const envCredential = buildCredentialFromEnv();

  if (envCredential) {
    console.log("Using Firebase Admin credentials from .env");
    return envCredential;
  }

  throw new Error(
    [
      "No valid Firebase Admin credentials found.",
      "Use one of these:",
      "1. Put serviceAccountKey.json in the backend folder",
      "2. Or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env",
    ].join(" ")
  );
}

let db;
let firebaseAdmin = admin;

try {
  if (!admin.apps.length) {
    const credential = getFirebaseCredential();

    admin.initializeApp({
      credential,
    });

    console.log("Firebase Admin initialized successfully.");
  }

  db = admin.firestore();
} catch (error) {
  console.error("Firebase Admin initialization failed.");
  console.error(error.message);

  if (process.env.NODE_OPTIONS) {
    console.error(`NODE_OPTIONS=${process.env.NODE_OPTIONS}`);
  }

  throw error;
}

export { firebaseAdmin as admin, db };