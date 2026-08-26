const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

/**
 * reduceStockForOrderInternal — shared, admin-privileged stock deduction.
 * No auth checks here; callers (reduceStock callable, razorpayWebhook) are
 * responsible for verifying the caller/event is legitimate before calling this.
 *
 * Idempotent: order document is marked stockReduced=true so a retry or
 * double-call (e.g. client AND webhook both firing) never deducts twice.
 */
async function reduceStockForOrderInternal(orderId) {
  const orderRef = db.collection("orders").doc(orderId);

  await db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) return;

    const order = orderSnap.data();
    if (order.stockReduced === true) return; // already done

    const items = order.items || [];
    if (!items.length) {
      transaction.update(orderRef, { stockReduced: true });
      return;
    }

    const byProduct = {};
    items.forEach((item) => {
      const pid = item.productId || item.id;
      if (!pid) return;
      if (!byProduct[pid]) byProduct[pid] = [];
      byProduct[pid].push({ size: item.size, qty: item.qty });
    });

    const productIds = Object.keys(byProduct);
    const productRefs = productIds.map((pid) => db.collection("products").doc(pid));
    const productSnaps = [];
    for (const ref of productRefs) {
      productSnaps.push(await transaction.get(ref)); // sequential — required by Firestore
    }

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

    transaction.update(orderRef, { stockReduced: true });
  });
}

/**
 * reduceStock — callable, used by the frontend after COD orders (and as a
 * best-effort fast path right after a Razorpay payment succeeds client-side).
 *
 * Security:
 *  - Caller must be authenticated
 *  - Order must belong to the calling user
 *  - Delegates the actual write to reduceStockForOrderInternal (idempotent)
 */
exports.reduceStock = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to place an order."
    );
  }

  const { orderId } = data;
  if (!orderId || typeof orderId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "orderId is required.");
  }

  const orderRef = db.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Order not found.");
  }
  if (orderSnap.data().userId !== context.auth.uid) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "You do not have permission to modify this order."
    );
  }

  try {
    await reduceStockForOrderInternal(orderId);
    return { success: true };
  } catch (e) {
    console.error("reduceStock error:", e);
    throw new functions.https.HttpsError("internal", "Stock update failed.");
  }
});

/**
 * razorpayWebhook — the SOURCE OF TRUTH for payment confirmation.
 *
 * This runs on Razorpay's servers hitting our backend directly, so unlike the
 * client-side `handler` callback in CartCheckout.js, it does NOT depend on the
 * customer's phone/browser staying alive after they approve a UPI payment.
 *
 * Setup required (see deployment notes):
 *  1. Deploy this function, copy its HTTPS URL.
 *  2. In Razorpay Dashboard → Settings → Webhooks, add that URL, subscribe to
 *     "payment.captured" and "payment.failed", and set a webhook secret.
 *  3. Store that same secret as a Firebase secret:
 *       firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
 *
 * How linking works:
 *  - The frontend creates a Firestore order doc with status "pending_payment"
 *    BEFORE opening Razorpay checkout, and passes that doc's ID as
 *    options.notes.fitroOrderId to Razorpay.
 *  - Razorpay attaches those notes to the payment entity automatically.
 *  - This webhook reads notes.fitroOrderId from the captured payment and
 *    updates that exact Firestore order — no reliance on the browser.
 */
exports.razorpayWebhook = functions
  .runWith({ secrets: ["RAZORPAY_WEBHOOK_SECRET"] })
  .https.onRequest(async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error("RAZORPAY_WEBHOOK_SECRET is not configured");
        res.status(500).send("Webhook not configured");
        return;
      }

      // --- Signature verification (never trust the body without this) ---
      const signature = req.headers["x-razorpay-signature"];
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(req.rawBody) // raw, untouched request body — required for HMAC to match
        .digest("hex");

      if (!signature || signature !== expectedSignature) {
        console.warn("razorpayWebhook: signature mismatch — rejecting");
        res.status(400).send("Invalid signature");
        return;
      }

      const event = req.body;
      const eventType = event.event;

      if (eventType === "payment.captured") {
        const payment = event.payload && event.payload.payment && event.payload.payment.entity;
        if (!payment) {
          res.status(200).send("No payment entity");
          return;
        }

        const fitroOrderId = payment.notes && payment.notes.fitroOrderId;

        // No order ID in notes — log it so a real payment is never silently lost,
        // even though we can't auto-link it to an order.
        if (!fitroOrderId) {
          console.error("payment.captured with no fitroOrderId note. Payment ID:", payment.id);
          await db.collection("webhookOrphans").add({
            reason: "missing_fitro_order_id",
            paymentId: payment.id,
            amount: payment.amount,
            notes: payment.notes || {},
            email: payment.email || null,
            contact: payment.contact || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          res.status(200).send("Logged orphan payment");
          return;
        }

        const orderRef = db.collection("orders").doc(fitroOrderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
          console.error("payment.captured for unknown order:", fitroOrderId);
          await db.collection("webhookOrphans").add({
            reason: "order_not_found",
            fitroOrderId,
            paymentId: payment.id,
            amount: payment.amount,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          res.status(200).send("Logged orphan payment");
          return;
        }

        const order = orderSnap.data();

        // Idempotency — Razorpay may retry webhooks, and the client-side fast
        // path may have already confirmed this order. Never double-process.
        if (order.paymentStatus === "verified" && order.razorpayPaymentId === payment.id) {
          res.status(200).send("Already processed");
          return;
        }

        // Payment.captured is definitive proof money moved — always confirm,
        // even if an earlier client-side event (e.g. modal dismissed) had
        // marked this order "cancelled" before the payment actually cleared.
        await orderRef.update({
          paymentStatus: "verified",
          status: "confirmed",
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id || null,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          verifiedVia: "webhook",
        });

        await reduceStockForOrderInternal(fitroOrderId);

        res.status(200).send("OK");
        return;
      }

      if (eventType === "payment.failed") {
        const payment = event.payload && event.payload.payment && event.payload.payment.entity;
        const fitroOrderId = payment && payment.notes && payment.notes.fitroOrderId;

        if (fitroOrderId) {
          const orderRef = db.collection("orders").doc(fitroOrderId);
          const orderSnap = await orderRef.get();
          if (orderSnap.exists && orderSnap.data().paymentStatus !== "verified") {
            await orderRef.update({
              paymentStatus: "failed",
              status: "cancelled",
              failureReason: (payment.error_description) || null,
            });
          }
        }
        res.status(200).send("OK");
        return;
      }

      // Any other event type — acknowledge so Razorpay doesn't keep retrying.
      res.status(200).send("Ignored");
    } catch (e) {
      console.error("razorpayWebhook error:", e);
      res.status(500).send("Internal error");
    }
  });
