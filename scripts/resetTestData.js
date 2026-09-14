import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./lib/firebaseAdmin.js";
import { categories, products } from "./lib/seedData.js";

if (!process.argv.includes("--confirm")) {
  throw new Error(
    "This removes test orders, carts, products, and categories, then restores seed data. Re-run with --confirm."
  );
}

async function deleteRootCollection(collectionName) {
  const snapshot = await adminDb.collection(collectionName).get();
  for (let index = 0; index < snapshot.docs.length; index += 400) {
    const batch = adminDb.batch();
    snapshot.docs.slice(index, index + 400).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
}

async function deleteCarts() {
  const cartDocuments = await adminDb.collection("carts").listDocuments();
  for (const cartDocument of cartDocuments) {
    const itemSnapshot = await cartDocument.collection("items").get();
    for (let index = 0; index < itemSnapshot.docs.length; index += 400) {
      const batch = adminDb.batch();
      itemSnapshot.docs.slice(index, index + 400).forEach((document) => batch.delete(document.ref));
      await batch.commit();
    }
    await cartDocument.delete();
  }
}

await deleteRootCollection("orders");
await deleteCarts();
await deleteRootCollection("products");
await deleteRootCollection("categories");

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

console.log("Reset test orders and carts, replaced products and categories, and preserved all Authentication users.");
