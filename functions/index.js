const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * reduceStock — called by the frontend after an order is saved.
 *
 * Expects: { orderId: string }
 *
 * Security:
 *  - Caller must be authenticated (context.auth is checked)
 *  - Order must belong to the calling user (userId == context.auth.uid)
 *  - Stock is updated server-side with admin privileges — customers
 *    never write to the products collection directly
 *  - Idempotent: order document is marked stockReduced=true so a
 *    retry or double-call never deducts stock twice
 */
exports.reduceStock = functions.https.onCall(async (data, context) => {
  // 1. Must be logged in
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to place an order."
    );
  }

  const { orderId } = data;
  if (!orderId || typeof orderId !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "orderId is required."
    );
  }

  const orderRef = db.collection("orders").doc(orderId);

  try {
    await db.runTransaction(async (transaction) => {
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Order not found.");
      }

      const order = orderSnap.data();

      // 2. Order must belong to the calling user
      if (order.userId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You do not have permission to modify this order."
        );
      }

      // 3. Idempotency check — never deduct twice
      if (order.stockReduced === true) {
        return; // already done, safe to return
      }

      const items = order.items || [];
      if (!items.length) return;

      // 4. Group items by productId
      const byProduct = {};
      items.forEach((item) => {
        const pid = item.productId || item.id;
        if (!pid) return;
        if (!byProduct[pid]) byProduct[pid] = [];
        byProduct[pid].push({ size: item.size, qty: item.qty });
      });

      const productIds = Object.keys(byProduct);

      // 5. Read all product docs inside the transaction (sequential — required by Firestore)
      const productRefs = productIds.map((pid) =>
        db.collection("products").doc(pid)
      );
      const productSnaps = [];
      for (const ref of productRefs) {
        productSnaps.push(await transaction.get(ref));
      }

      // 6. Calculate new stock and write
      productSnaps.forEach((snap, i) => {
        if (!snap.exists) return;
        const pid = productIds[i];
        const currentStock = snap.data().stock;
        if (!currentStock || typeof currentStock !== "object") return;

        const newStock = { ...currentStock };
        byProduct[pid].forEach(({ size, qty }) => {
          if (newStock[size] !== undefined) {
            newStock[size] = Math.max(0, (newStock[size] || 0) - qty);
          }
        });

        transaction.update(productRefs[i], { stock: newStock });
      });

      // 7. Mark order as stock-reduced so this never runs twice
      transaction.update(orderRef, { stockReduced: true });
    });

    return { success: true };
  } catch (e) {
    // Re-throw HttpsErrors as-is
    if (e instanceof functions.https.HttpsError) throw e;
    console.error("reduceStock error:", e);
    throw new functions.https.HttpsError("internal", "Stock update failed.");
  }
});
