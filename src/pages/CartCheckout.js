import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Copy, CreditCard, Truck, Zap, Tag } from "lucide-react";
import toast from "react-hot-toast";

function useShippingSettings() {
  const [settings, setSettings] = useState({
    amdDeliveryCharge: 40,
    outsideDeliveryCharge: 150,
    freeShippingAboveAmd: 599,
    freeShippingAboveOutside: 1999,
  });
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "site"));
        if (snap.exists()) {
          const d = snap.data();
          setSettings({
            amdDeliveryCharge: d.amdDeliveryCharge ?? 40,
            outsideDeliveryCharge: d.outsideDeliveryCharge ?? 150,
            freeShippingAboveAmd: d.freeShippingAboveAmd ?? 599,
            freeShippingAboveOutside: d.freeShippingAboveOutside ?? 1999,
          });
        }
      } catch (e) {}
    })();
  }, []);
  return settings;
}

function isAhmedabad(city) {
  return city.trim().toLowerCase().replace(/\s+/g, "") === "ahmedabad";
}

/* ─── CART ──────────────────────────────────────────────── */
export function Cart() {
  const { cart, removeFromCart, updateQty, total } = useCart();
  const settings = useShippingSettings();
  const navigate = useNavigate();
  const finalTotal = total; // No shipping on cart page — calculated at checkout

  useEffect(() => {
    if (!cart.length) return;
    (async () => {
      const uniqueIds = [...new Set(cart.map(i => i.productId || i.id).filter(Boolean))];
      const stockMap = {};
      await Promise.all(uniqueIds.map(async pid => {
        try {
          const snap = await getDoc(doc(db, "products", pid));
          if (snap.exists()) stockMap[pid] = snap.data().stock;
        } catch (e) {}
      }));
      cart.forEach(item => {
        const productStock = stockMap[item.productId || item.id];
        if (!productStock || typeof productStock !== "object") return;
        const sizeStock = productStock[item.size] ?? 0;
        if (sizeStock === 0) {
          removeFromCart(item.key);
          toast.error(`${item.name} (${item.size}) is now out of stock — removed from cart`);
        } else if (sizeStock < item.qty) {
          updateQty(item.key, sizeStock);
          toast(`${item.name} (${item.size}): only ${sizeStock} left — qty adjusted`, { icon: "⚠️" });
        }
      });
    })();
  }, []);

  if (cart.length === 0) return (
    <div className="flex-center" style={{ flexDirection: "column", minHeight: "70vh", gap: 16 }}>
      <ShoppingBag size={56} color="var(--muted)" />
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600 }}>Your cart is empty</h2>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>Add some items to get started</p>
      <Link to="/shop" className="btn btn-primary">Browse Shop <ArrowRight size={14} /></Link>
    </div>
  );

  return (
    <div className="container" style={{ paddingTop: 44, paddingBottom: 64 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 600, marginBottom: 8 }}>Your Cart</h1>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 32 }}>{cart.length} item{cart.length !== 1 ? "s" : ""}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 32, alignItems: "start" }} className="cart-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cart.map(item => (
            <div key={item.key} className="card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <img src={item.image || "/tshirt1.jpg"} alt={item.name} style={{ width: 80, height: 100, borderRadius: 10, objectFit: "cover", flexShrink: 0, background: "var(--ink3)" }} onError={e => e.target.src = "/tshirt1.jpg"} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3, fontWeight: 500 }}>{item.category} · {item.size}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, marginBottom: 10, lineHeight: 1.2 }}>{item.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--ink3)", borderRadius: 8, padding: "4px 8px" }}>
                    <button onClick={() => updateQty(item.key, item.qty - 1)} style={{ background: "none", border: "none", color: "var(--light)", cursor: "pointer", padding: 2, display: "flex" }}><Minus size={13} /></button>
                    <span style={{ minWidth: 22, textAlign: "center", fontWeight: 600, fontSize: 14 }}>{item.qty}</span>
                    <button onClick={() => updateQty(item.key, item.qty + 1)} style={{ background: "none", border: "none", color: "var(--light)", cursor: "pointer", padding: 2, display: "flex" }}><Plus size={13} /></button>
                  </div>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--accent)", fontWeight: 600 }}>₹{item.price * item.qty}</span>
                  {item.qty > 1 && <span style={{ fontSize: 11, color: "var(--muted)" }}>₹{item.price} each</span>}
                </div>
              </div>
              <button onClick={() => removeFromCart(item.key)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 8 }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="card" style={{ position: "sticky", top: 80 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Order Summary</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14 }}>
            <span style={{ color: "var(--muted)" }}>Subtotal ({cart.length} items)</span>
            <span>₹{total}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 14 }}>
            <span style={{ color: "var(--muted)" }}>Shipping</span>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>Calculated at checkout</span>
          </div>
          <div className="divider" />
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Total</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--accent)", fontWeight: 600 }}>₹{finalTotal}</span>
          </div>
          <button onClick={() => navigate("/checkout")} className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Proceed to Checkout <ArrowRight size={14} />
          </button>
          <Link to="/shop" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", marginTop: 10, fontSize: 13 }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── CHECKOUT ──────────────────────────────────────────── */
export function Checkout() {
  const { cart, total, clearCart } = useCart();
  const { currentUser, userProfile } = useAuth();
  const settings = useShippingSettings();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: userProfile?.name || "",
    phone: userProfile?.phone || "",
    email: currentUser?.email || "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    paymentMethod: "razorpay",
  });
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const cityIsAmd = isAhmedabad(form.city);
  const baseShipping = cityIsAmd ? settings.amdDeliveryCharge : settings.outsideDeliveryCharge;
  const freeThreshold = cityIsAmd ? settings.freeShippingAboveAmd : settings.freeShippingAboveOutside;

  // Shipping is 0 until city is entered
  const shipping = !form.city ? 0 : (freeThreshold > 0 && total >= freeThreshold) ? 0 : baseShipping;

  // Online discount & COD fee
  const ONLINE_DISCOUNT = 20;
  const COD_FEE = 25;
  const isOnline = form.paymentMethod === "razorpay";
  const paymentAdjustment = isOnline ? -ONLINE_DISCOUNT : COD_FEE;

  const couponDiscount = appliedCoupon
    ? (appliedCoupon.type === "percent" ? Math.round(total * appliedCoupon.value / 100) : Math.min(appliedCoupon.value, total))
    : 0;

  // Total: only add shipping if city is entered
  const finalTotal = total + shipping + paymentAdjustment - couponDiscount;

  async function applyCoupon() {
    if (!couponCode.trim()) return toast.error("Enter a coupon code!");
    setCouponLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "offers"), where("code", "==", couponCode.trim().toUpperCase()), where("active", "==", true)));
      if (snap.empty) { toast.error("Invalid or expired coupon code!"); setCouponLoading(false); return; }
      const offer = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (offer.minOrder && total < offer.minOrder) { toast.error(`Minimum order ₹${offer.minOrder} required!`); setCouponLoading(false); return; }
      if (offer.expiresAt && new Date(offer.expiresAt) < new Date()) { toast.error("This coupon has expired!"); setCouponLoading(false); return; }
      setAppliedCoupon(offer);
      toast.success(`🎉 Coupon applied! ${offer.type === "percent" ? offer.value + "% off" : "₹" + offer.value + " off"}`);
      try { await updateDoc(doc(db, "offers", offer.id), { usedCount: (offer.usedCount || 0) + 1 }); } catch (_) {}
    } catch (err) { toast.error("Failed to apply coupon. Please try again."); }
    setCouponLoading(false);
  }

  useEffect(() => {
    if (window.Razorpay) { setScriptLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => toast.error("Failed to load payment gateway. Please refresh.");
    document.head.appendChild(script);
  }, []);

  // Recovery check: on mobile, switching to a UPI app to approve payment can
  // cause the browser tab to be killed and reloaded when the customer comes
  // back — losing the in-page Razorpay `handler` callback entirely, even
  // though the payment succeeded and the razorpayWebhook already confirmed
  // the order server-side. Without this, the customer would land back here
  // with a full cart and no idea their payment went through. We check for a
  // just-confirmed order matching the current cart and, if found, show the
  // success screen instead of asking them to pay again.
  useEffect(() => {
    if (!currentUser || !cart.length) return;
    (async () => {
      try {
        const cutoff = new Date(Date.now() - 20 * 60 * 1000); // last 20 minutes
        const snap = await getDocs(query(
          collection(db, "orders"),
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc"),
          limit(5)
        ));
        const cartFingerprint = JSON.stringify(
          [...cart].map(i => ({ pid: i.productId || i.id, size: i.size, qty: i.qty })).sort((a, b) => (a.pid + a.size).localeCompare(b.pid + b.size))
        );
        for (const d of snap.docs) {
          const o = d.data();
          if (o.paymentMethod !== "razorpay" || o.paymentStatus !== "verified") continue;
          if (!o.createdAt?.toDate || o.createdAt.toDate() < cutoff) continue;
          const orderFingerprint = JSON.stringify(
            (o.items || []).map(i => ({ pid: i.productId || i.id, size: i.size, qty: i.qty })).sort((a, b) => (a.pid + a.size).localeCompare(b.pid + b.size))
          );
          if (orderFingerprint === cartFingerprint) {
            clearCart();
            setOrderId(d.id);
            toast.success("Payment already confirmed — showing your order!");
            break;
          }
        }
      } catch (e) { /* silent — worst case, customer just sees checkout normally */ }
    })();
  }, [currentUser]); // intentionally excludes `cart`/`clearCart` — this check should only re-run when the user identity changes, not on every cart edit

  const set = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }));

  function validateForm() {
    const { name, phone, address, city, state, pincode } = form;
    if (!name || !phone || !address || !city || !state || !pincode) { toast.error("Please fill all delivery details!"); return false; }
    if (!/^[0-9]{10}$/.test(phone.replace(/\s/g, ""))) { toast.error("Enter a valid 10-digit phone number!"); return false; }
    if (!/^[0-9]{6}$/.test(pincode)) { toast.error("Enter a valid 6-digit pincode!"); return false; }
    return true;
  }

  async function reduceStockForOrder(orderId) {
    try {
      const orderRef = doc(db, "orders", orderId);
      const byProduct = {};
      cart.forEach(item => {
        const pid = item.productId || item.id;
        if (!pid) return;
        if (!byProduct[pid]) byProduct[pid] = [];
        byProduct[pid].push({ size: item.size, qty: item.qty });
      });
      const productIds = Object.keys(byProduct);
      if (!productIds.length) return;
      await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (orderSnap.data()?.stockReduced === true) return;
        const productRefs = productIds.map(pid => doc(db, "products", pid));
        const productSnaps = [];
        for (const ref of productRefs) productSnaps.push(await transaction.get(ref));
        productSnaps.forEach((snap, i) => {
          if (!snap.exists()) return;
          const pid = productIds[i];
          const currentStock = snap.data().stock;
          if (!currentStock || typeof currentStock !== "object") return;
          const newStock = { ...currentStock };
          byProduct[pid].forEach(({ size, qty }) => {
            if (newStock[size] !== undefined) newStock[size] = Math.max(0, (newStock[size] || 0) - qty);
          });
          transaction.update(productRefs[i], { stock: newStock });
        });
        transaction.update(orderRef, { stockReduced: true });
      });
    } catch (e) { console.error("Stock reduction failed:", e); }
  }

  // Creates the Firestore order BEFORE the Razorpay popup opens, in
  // "pending_payment" state. This is the key fix: the order exists the
  // moment checkout starts, so even if the customer's tab is killed while
  // they're switching to a UPI app (very common on mobile — see below),
  // the order record is never lost. Its ID is passed to Razorpay as a note,
  // and the razorpayWebhook Cloud Function confirms it server-side once the
  // payment is actually captured — independent of the browser surviving.
  async function createPendingRazorpayOrder() {
    const order = {
      userId: currentUser.uid, userEmail: currentUser.email, userName: form.name, userPhone: form.phone,
      items: cart, subtotal: total, shipping,
      onlineDiscount: isOnline ? ONLINE_DISCOUNT : 0,
      codFee: !isOnline ? COD_FEE : 0,
      discount: couponDiscount, couponCode: appliedCoupon?.code || null,
      total: finalTotal, cityIsAhmedabad: cityIsAmd,
      shippingAddress: { name: form.name, phone: form.phone, address: form.address, city: form.city, state: form.state, pincode: form.pincode },
      address: { name: form.name, phone: form.phone, address: form.address, city: form.city, state: form.state, pincode: form.pincode },
      paymentMethod: "razorpay", paymentStatus: "pending_razorpay",
      razorpayPaymentId: null, razorpayOrderId: null,
      status: "pending", createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, "orders"), order);
    return ref.id;
  }

  // Best-effort fast path: if the browser DOES survive to run this (normal
  // case for cards / same-tab UPI QR), confirm immediately for instant UX.
  // If it doesn't run, the webhook still confirms the order — this function
  // is not the source of truth, just a shortcut.
  async function confirmRazorpayOrderClientSide(oid, paymentData) {
    await updateDoc(doc(db, "orders", oid), {
      paymentStatus: "verified", status: "confirmed",
      razorpayPaymentId: paymentData?.razorpay_payment_id || null,
      razorpayOrderId: paymentData?.razorpay_order_id || null,
      verifiedVia: "client",
    });
    await reduceStockForOrder(oid);
  }

  async function saveCodOrder() {
    const order = {
      userId: currentUser.uid, userEmail: currentUser.email, userName: form.name, userPhone: form.phone,
      items: cart, subtotal: total, shipping,
      onlineDiscount: 0, codFee: COD_FEE,
      discount: couponDiscount, couponCode: appliedCoupon?.code || null,
      total: finalTotal, cityIsAhmedabad: cityIsAmd,
      shippingAddress: { name: form.name, phone: form.phone, address: form.address, city: form.city, state: form.state, pincode: form.pincode },
      address: { name: form.name, phone: form.phone, address: form.address, city: form.city, state: form.state, pincode: form.pincode },
      paymentMethod: "cod", paymentStatus: "cod",
      status: "pending", createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, "orders"), order);
    await reduceStockForOrder(ref.id);
    return ref.id;
  }

  async function checkCartStockBeforePayment() {
    for (const item of cart) {
      const pid = item.productId || item.id;
      if (!pid) continue;
      try {
        const snap = await getDoc(doc(db, "products", pid));
        if (!snap.exists()) continue;
        const stockMap = snap.data().stock;
        if (!stockMap || typeof stockMap !== "object") continue;
        const sizeStock = stockMap[item.size] ?? 0;
        if (sizeStock === 0) { toast.error(`${item.name} (${item.size}) just went out of stock!`); return false; }
        if (sizeStock < item.qty) { toast.error(`Only ${sizeStock} units of ${item.name} (${item.size}) available.`); return false; }
      } catch (e) {}
    }
    return true;
  }

  async function handleRazorpay() {
    if (!validateForm()) return;
    const stockOk = await checkCartStockBeforePayment();
    if (!stockOk) return;
    if (!scriptLoaded || !window.Razorpay) { toast.error("Payment gateway not loaded. Please refresh."); return; }
    setLoading(true);

    let oid;
    try {
      // Create the order FIRST, before the payment popup even opens.
      oid = await createPendingRazorpayOrder();
    } catch (e) {
      setLoading(false);
      toast.error("Could not start checkout. Please try again.");
      return;
    }

    try {
      const options = {
        key: "rzp_live_SWdAQTV5mEVY85",
        amount: finalTotal * 100,
        currency: "INR",
        name: "FITRO",
        description: `${cart.length} item${cart.length !== 1 ? "s" : ""} — FITRO Streetwear`,
        image: "https://i.ibb.co/d43Bf1mg/payment-Copy.png",
        handler: async function (response) {
          try {
            await confirmRazorpayOrderClientSide(oid, response);
            clearCart(); setOrderId(oid);
            toast.success("Payment successful! Order confirmed 🎉");
          } catch (e) {
            // Order was already created before payment (see above), so even
            // if this client-side confirm step fails, the razorpayWebhook
            // will still verify and confirm it shortly — nothing is lost.
            clearCart(); setOrderId(oid);
            toast.success("Payment received! Confirming your order…");
          }
          setLoading(false);
        },
        prefill: { name: form.name, email: form.email, contact: form.phone },
        notes: { fitroOrderId: oid, address: `${form.address}, ${form.city}, ${form.state} - ${form.pincode}` },
        theme: { color: "#e8c547" },
        modal: { ondismiss: async function () {
          setLoading(false);
          toast("Payment cancelled. Your cart is still saved.");
          try { await updateDoc(doc(db, "orders", oid), { status: "cancelled", paymentStatus: "abandoned" }); } catch (_) {}
        } }
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", async function (response) {
        setLoading(false);
        toast.error("Payment failed: " + (response.error?.description || "Unknown error"));
        try { await updateDoc(doc(db, "orders", oid), { status: "cancelled", paymentStatus: "failed" }); } catch (_) {}
      });
      rzp.open();
    } catch (e) { setLoading(false); toast.error("Failed to open payment. Please try again."); }
  }

  async function handleCod(e) {
    e.preventDefault();
    if (!validateForm()) return;
    const stockOk = await checkCartStockBeforePayment();
    if (!stockOk) return;
    setLoading(true);
    try {
      const oid = await saveCodOrder();
      clearCart(); setOrderId(oid);
      toast.success("Order placed! We'll deliver to your door.");
    } catch (e) { toast.error("Failed to place order. Try again."); }
    setLoading(false);
  }

  if (orderId) return (
    <div className="flex-center" style={{ flexDirection: "column", minHeight: "70vh", gap: 16, textAlign: "center", padding: 24 }}>
      <div style={{ width: 72, height: 72, background: "rgba(61,184,122,0.1)", border: "2px solid var(--emerald)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>✓</div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 600, color: "var(--light)" }}>Order Confirmed!</h2>
      <p style={{ color: "var(--muted)", maxWidth: 360, fontSize: 14 }}>Your Fitro order is on its way. We'll notify you when it ships!</p>
      <div style={{ background: "var(--ink2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>Order ID:</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{orderId.slice(0, 14)}...</span>
        <button onClick={() => { navigator.clipboard.writeText(orderId); toast.success("Copied!"); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}><Copy size={13} /></button>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <Link to="/orders" className="btn btn-primary">Track Order</Link>
        <Link to="/shop" className="btn btn-ghost">Keep Shopping</Link>
      </div>
    </div>
  );

  if (cart.length === 0) { navigate("/cart"); return null; }

  return (
    <div className="container" style={{ paddingTop: 44, paddingBottom: 64 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 600, marginBottom: 32 }}>Checkout</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 32, alignItems: "start" }} className="checkout-grid">
        <div>
          {/* Delivery */}
          <div className="card" style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <Truck size={18} color="var(--accent)" /> Delivery Details
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Full Name *</label>
                <input type="text" value={form.name} onChange={set("name")} placeholder="Your full name" className="input" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Phone *</label>
                <input type="tel" value={form.phone} onChange={set("phone")} placeholder="10-digit number" className="input" />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="your@email.com" className="input" />
            </div>
            <div className="form-group">
              <label className="label">Address *</label>
              <textarea value={form.address} onChange={set("address")} placeholder="House/Flat no, Street, Locality" className="input" rows={2} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">City *</label>
                <input type="text" value={form.city} onChange={set("city")} placeholder="City" className="input" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">State *</label>
                <input type="text" value={form.state} onChange={set("state")} placeholder="State" className="input" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Pincode *</label>
                <input type="text" value={form.pincode} onChange={set("pincode")} placeholder="6 digits" className="input" maxLength={6} />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="card">
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <CreditCard size={18} color="var(--accent)" /> Payment Method
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Pay Online */}
              <button type="button" onClick={() => setForm(p => ({ ...p, paymentMethod: "razorpay" }))}
                style={{ padding: "16px", borderRadius: "var(--radius)", cursor: "pointer", textAlign: "left", background: form.paymentMethod === "razorpay" ? "rgba(232,197,71,0.07)" : "var(--ink3)", border: `1.5px solid ${form.paymentMethod === "razorpay" ? "var(--accent)" : "var(--border)"}`, transition: "all 0.2s", display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ color: form.paymentMethod === "razorpay" ? "var(--accent)" : "var(--muted)", flexShrink: 0, marginTop: 2 }}><Zap size={18} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Pay Online</span>
                    <span className="badge badge-gold">Recommended</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>UPI · Cards · Net Banking · Wallets — via Razorpay</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 6, padding: "4px 10px", display: "inline-block" }}>
                    🟢 Save ₹{ONLINE_DISCOUNT} on this order!
                  </div>
                </div>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${form.paymentMethod === "razorpay" ? "var(--accent)" : "var(--border2)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  {form.paymentMethod === "razorpay" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />}
                </div>
              </button>

              {/* COD */}
              <button type="button" onClick={() => setForm(p => ({ ...p, paymentMethod: "cod" }))}
                style={{ padding: "16px", borderRadius: "var(--radius)", cursor: "pointer", textAlign: "left", background: form.paymentMethod === "cod" ? "rgba(232,197,71,0.07)" : "var(--ink3)", border: `1.5px solid ${form.paymentMethod === "cod" ? "var(--accent)" : "var(--border)"}`, transition: "all 0.2s", display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ color: form.paymentMethod === "cod" ? "var(--accent)" : "var(--muted)", flexShrink: 0, marginTop: 2 }}><Truck size={18} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Cash on Delivery</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Pay when your order arrives at your door</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fb923c", background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 6, padding: "4px 10px", display: "inline-block" }}>
                    🔴 +₹{COD_FEE} COD handling fee applies
                  </div>
                </div>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${form.paymentMethod === "cod" ? "var(--accent)" : "var(--border2)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  {form.paymentMethod === "cod" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />}
                </div>
              </button>
            </div>

            {form.paymentMethod === "razorpay" && (
              <div style={{ background: "rgba(232,197,71,0.05)", border: "1px solid rgba(232,197,71,0.18)", borderRadius: "var(--radius)", padding: 14, marginTop: 14 }}>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
                  <strong style={{ color: "var(--accent)", display: "block", marginBottom: 4 }}>Secure Payment by Razorpay</strong>
                  You'll be redirected to Razorpay's secure checkout. Supports UPI (QR + Intent), all major cards, net banking, and wallets like Paytm & PhonePe.
                </div>
              </div>
            )}

            {form.paymentMethod === "cod" && (
              <div style={{ background: "rgba(247,246,242,0.03)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14, marginTop: 14 }}>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
                  Pay with cash when your order is delivered. Please keep exact change ready. COD is available across all major cities in India.
                </div>
              </div>
            )}

            <div style={{ marginTop: 22 }}>
              <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${termsAccepted ? "rgba(74,222,128,0.3)" : "rgba(255,107,53,0.3)"}`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, cursor: "pointer", accentColor: "var(--accent)", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                    I have read and agree to the{" "}
                    <a href="/policy/terms" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "underline" }}>Terms & Conditions</a>,{" "}
                    <a href="/policy/privacy" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "underline" }}>Privacy Policy</a>, and{" "}
                    <a href="/policy/shipping" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "underline" }}>Shipping Policy</a>.
                  </span>
                </label>
                {!termsAccepted && <div style={{ fontSize: 11, color: "#fb923c", marginTop: 8, marginLeft: 30 }}>⚠️ You must accept the terms to place your order</div>}
              </div>

              {form.paymentMethod === "razorpay" ? (
                <button type="button" onClick={() => { if (!termsAccepted) { toast.error("Please accept Terms & Conditions!"); return; } handleRazorpay(); }} disabled={loading || !scriptLoaded}
                  className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "15px", opacity: termsAccepted ? 1 : 0.6 }}>
                  {loading ? "Opening Payment..." : !scriptLoaded ? "Loading..." : `Pay ₹${finalTotal} Securely`}
                </button>
              ) : (
                <button type="button" onClick={e => { if (!termsAccepted) { toast.error("Please accept Terms & Conditions!"); return; } handleCod(e); }} disabled={loading}
                  className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "15px", opacity: termsAccepted ? 1 : 0.6 }}>
                  {loading ? "Placing Order..." : `Place COD Order · ₹${finalTotal}`}
                </button>
              )}
              <p style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: 10 }}>🔒 Your data is encrypted and secure</p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="card" style={{ position: "sticky", top: 80 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Order Summary</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {cart.map(item => (
              <div key={item.key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <img src={item.image || "/tshirt1.jpg"} alt={item.name} style={{ width: 44, height: 54, borderRadius: 7, objectFit: "cover", flexShrink: 0, background: "var(--ink3)" }} onError={e => e.target.src = "/tshirt1.jpg"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{item.size} · ×{item.qty}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>₹{item.price * item.qty}</span>
              </div>
            ))}
          </div>
          <div className="divider" />

          {/* Coupon */}
          {!appliedCoupon ? (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 7 }}>Have a coupon?</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Enter coupon code" className="input" style={{ fontFamily: "var(--font-mono)", letterSpacing: 1.5, fontSize: 13 }} onKeyDown={e => e.key === "Enter" && applyCoupon()} />
                <button onClick={applyCoupon} disabled={couponLoading} className="btn btn-secondary" style={{ flexShrink: 0, padding: "8px 14px", fontSize: 12 }}>
                  <Tag size={13} /> {couponLoading ? "..." : "Apply"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 8, padding: "10px 12px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4ade80" }}>🎉 {appliedCoupon.code} applied!</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{appliedCoupon.description || (appliedCoupon.type === "percent" ? `${appliedCoupon.value}% off` : `₹${appliedCoupon.value} off`)}</div>
              </div>
              <button onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 4px" }}>×</button>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: "var(--muted)" }}>Subtotal</span><span>₹{total}</span>
          </div>

          {/* Free delivery nudge */}
          {form.city && freeThreshold > 0 && total < freeThreshold && (
            <div style={{ background: "rgba(232,197,71,0.08)", border: "1px solid rgba(232,197,71,0.2)", borderRadius: 8, padding: "7px 11px", fontSize: 12, color: "var(--accent)", marginBottom: 8 }}>
              🎁 Add ₹{freeThreshold - total} more for <strong>FREE delivery!</strong>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: "var(--muted)" }}>
              Delivery
              {form.city && <span style={{ fontSize: 11, marginLeft: 4, color: cityIsAmd ? "#60a5fa" : "var(--muted)" }}>({cityIsAmd ? "Ahmedabad" : "Outside AMD"})</span>}
            </span>
            <span style={{ color: shipping === 0 && form.city ? "var(--emerald)" : "var(--light)" }}>
              {!form.city ? <span style={{ color: "var(--muted)", fontSize: 12 }}>Enter city</span> : shipping === 0 ? "Free 🎉" : `₹${shipping}`}
            </span>
          </div>

          {/* Online discount line */}
          {isOnline && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: "#4ade80", fontWeight: 600 }}>🟢 Online Discount</span>
              <span style={{ color: "#4ade80", fontWeight: 700 }}>-₹{ONLINE_DISCOUNT}</span>
            </div>
          )}

          {/* COD fee line */}
          {!isOnline && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: "#fb923c", fontWeight: 600 }}>🔴 COD Fee</span>
              <span style={{ color: "#fb923c", fontWeight: 700 }}>+₹{COD_FEE}</span>
            </div>
          )}

          {/* Coupon discount */}
          {couponDiscount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: "#4ade80" }}>Coupon ({appliedCoupon.code})</span>
              <span style={{ color: "#4ade80", fontWeight: 600 }}>-₹{couponDiscount}</span>
            </div>
          )}

          <div className="divider" />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Total</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--accent)", fontWeight: 600 }}>₹{finalTotal}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
