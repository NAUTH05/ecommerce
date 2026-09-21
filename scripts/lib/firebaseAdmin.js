import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
dotenv.config({ path: path.resolve(repoRoot, ".env"), quiet: true });

function getCredentialsPath() {
  const configuredPath = process.env.FIREBASE_ADMIN_CREDENTIALS?.trim();
  if (!configuredPath) {
    throw new Error(
      "FIREBASE_ADMIN_CREDENTIALS is missing. Set it to the Firebase service-account JSON path before running a trusted script."
    );
  }
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(repoRoot, configuredPath);
}

function readServiceAccount() {
  const credentialsPath = getCredentialsPath();
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(
      `Firebase Admin credentials were not found at ${credentialsPath}. Check FIREBASE_ADMIN_CREDENTIALS.`
    );
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Firebase Admin credentials at ${credentialsPath} are not valid JSON: ${error.message}`
    );
  }

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error(
      `Firebase Admin credentials at ${credentialsPath} are missing required service-account fields.`
    );
  }
  return serviceAccount;
}

export function initializeFirebaseAdmin() {
  const existingApp = getApps()[0];
  if (existingApp) return existingApp;
  return initializeApp({ credential: cert(readServiceAccount()) });
}

export const adminApp = initializeFirebaseAdmin();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
