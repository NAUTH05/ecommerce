import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./lib/firebaseAdmin.js";

function getArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const email = getArgument("--email");
const uid = getArgument("--uid");
if ((!email && !uid) || (email && uid)) {
  throw new Error("Provide exactly one target: --email user@example.com or --uid FIREBASE_UID.");
}

const user = email ? await adminAuth.getUserByEmail(email) : await adminAuth.getUser(uid);
const profileRef = adminDb.collection("users").doc(user.uid);
const existingProfile = await profileRef.get();
const profile = existingProfile.exists ? existingProfile.data() : {};

await profileRef.set(
  {
    uid: user.uid,
    email: user.email || profile.email || "",
    fullName: profile.fullName || user.displayName || "",
    role: "admin",
    phone: profile.phone || "",
    address: profile.address || "",
    updatedAt: FieldValue.serverTimestamp(),
    ...(existingProfile.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  },
  { merge: true }
);

console.log(`Admin profile configured for ${user.email || user.uid}.`);
