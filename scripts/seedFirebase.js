import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./lib/firebaseAdmin.js";
import { categories, products } from "./lib/seedData.js";

let existing;
try {
  existing = await adminDb.collection("products").limit(1).get();
} catch (error) {
  if (error.code === 7 && error.reason === "SERVICE_DISABLED") {
    throw new Error(
      "Cloud Firestore is disabled for this Firebase project. Enable the Cloud Firestore API in Google Cloud, create a Firestore database, then run npm run firebase:seed again."
    );
  }
  throw error;
}
if (!existing.empty) {
  console.log("Products already exist; nothing overwritten.");
  process.exit(0);
}

const batch = adminDb.batch();
for (const category of categories) {
  batch.set(adminDb.collection("categories").doc(category.id), {
    ...category,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

for (const [id, name, price, stock, categoryId, categoryName] of products) {
  batch.set(adminDb.collection("products").doc(id), {
    id,
    name,
    description: `Thoughtfully made ${name.toLowerCase()} for everyday life.`,
    price,
    stock,
    categoryId,
    categoryName,
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

await batch.commit();
console.log(`Seeded ${categories.length} categories and ${products.length} products.`);
