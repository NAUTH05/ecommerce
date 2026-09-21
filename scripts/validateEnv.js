import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.resolve(repoRoot, ".env"), quiet: true });

const requiredClientEnv = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

const checkAdmin = process.argv.includes("--admin");

const isPresent = (name) => {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "";
};

const missing = requiredClientEnv.filter((name) => !isPresent(name));

if (checkAdmin && !isPresent("FIREBASE_ADMIN_CREDENTIALS")) {
  missing.push("FIREBASE_ADMIN_CREDENTIALS");
}

if (missing.length > 0) {
  console.error("Missing required environment variables:");
  missing.forEach((name) => console.error(`- ${name}`));
  console.error(
    "\nCopy .env.example to .env, fill in the values, then rebuild with npm run build."
  );
  process.exit(1);
}

if (checkAdmin) {
  const configuredPath = process.env.FIREBASE_ADMIN_CREDENTIALS.trim();
  const credentialsPath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(repoRoot, configuredPath);

  if (!fs.existsSync(credentialsPath)) {
    console.error(
      `FIREBASE_ADMIN_CREDENTIALS does not point to an existing file: ${credentialsPath}`
    );
    process.exit(1);
  }
}

console.log("Environment validation passed.");
