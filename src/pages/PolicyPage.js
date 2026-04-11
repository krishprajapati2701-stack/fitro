import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const TERMS_DEFAULT = `## Terms & Conditions

By placing an order on FITRO, you agree to all terms below. Please read carefully before checkout.

### 1. Orders & Pricing
- All orders are subject to product availability
- Prices are inclusive of all applicable taxes
- A 2% platform fee is applied on every order — this fee is non-refundable under any circumstance
- Discounts, coupons, and bundle offers do not reduce the platform fee

### 2. Return & Exchange — Regular T-Shirts (No Offer)
- 7-day return policy from the date of delivery
- Items must be unworn, unwashed, with original tags still attached
- Return delivery charge is completely FREE — FITRO bears the full cost
- Refunds are processed within 5–7 business days after we receive the returned item
- Refund is issued to the original payment method

### 3. Return & Exchange — Offer / Bundle T-Shirts
- T-shirts purchased under any offer, bundle deal, or discount promotion are NON-RETURNABLE
- Only size or color exchange is allowed (subject to stock availability)
- Exchange request must be raised within 7 days of delivery
- The return delivery charge for exchange of offer/bundle items is to be paid by the customer
- The delivery charge for sending the exchanged item back to the customer will be borne by FITRO
- No refund will be issued for offer or bundle items under any circumstance

### 4. Delivery
- Delivery charges vary based on your city — Ahmedabad customers pay a lower charge
- Customers inside Ahmedabad with an active bundle offer get completely free delivery
- Outside Ahmedabad customers are charged the standard delivery fee even with bundle offer
- Estimated delivery time: 3–5 business days

### 5. Platform Fee
- A 2% platform fee is charged on all orders
- This fee covers payment processing and platform maintenance
- The platform fee is applied on the item total and is not affected by any coupon, bundle, or offer
- The platform fee is strictly non-refundable

### 6. Payments
- We accept UPI, Debit/Credit Cards, Net Banking, and Wallets via Razorpay
- Cash on Delivery (COD) is also available
- Online payments are secured and processed by Razorpay
- COD orders require confirmation by admin before processing

### 7. Cancellations
- Orders can be cancelled before they are marked as shipped
- Once shipped, cancellations are not accepted
- For cancellation requests, contact fitrostore1@gmail.com immediately after placing the order

### 8. Liability
- FITRO is not responsible for delays caused by courier partners
- In case of a damaged delivery, please contact us within 24 hours with photos

For all support and queries, contact us at fitrostore1@gmail.com`;

const PRIVACY_DEFAULT = `## Privacy Policy

Your privacy matters to us at FITRO. We collect only the minimum necessary information to process your orders.

### Data We Collect
- Name, email, phone for order processing and communication
- Shipping address for delivery
- Payment confirmation details (we do not store card or UPI credentials)

### How We Use Your Data
- To process and deliver your orders
- To send order updates and notifications
- To resolve support queries

### Data Security
- Your data is stored securely on Firebase servers
- We never sell or share your personal data with third parties
- Payment processing is handled by Razorpay — we never see your card details

For privacy queries, contact fitrostore1@gmail.com`;

const SHIPPING_DEFAULT = `## Shipping Policy

### Delivery Time
- Standard delivery: 3–5 business days from order confirmation

### Shipping Charges
- Ahmedabad customers: lower delivery charge (set by admin)
- Outside Ahmedabad: standard delivery charge (set by admin)
- Bundle offer customers inside Ahmedabad: FREE delivery
- Outside Ahmedabad customers: delivery charge applies even with bundle offer

### Coverage
- We deliver Pan India to all major cities and towns

### Tracking
- A tracking ID is shared once your order is shipped
- You can track your order under My Orders section

### Delays
- Delays may occur during peak seasons or due to courier issues
- FITRO is not liable for delays caused by courier partners`;

export default function PolicyPage() {
  const { type } = useParams();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  const defaults = {
    privacy:  { title: "Privacy Policy",     key: "privacyPolicy",  default: PRIVACY_DEFAULT  },
    terms:    { title: "Terms & Conditions", key: "termsOfService", default: TERMS_DEFAULT    },
    shipping: { title: "Shipping Policy",    key: "shippingPolicy", default: SHIPPING_DEFAULT },
  };

  const info = defaults[type] || defaults.privacy;

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "site"));
        if (snap.exists() && snap.data()[info.key]) setContent(snap.data()[info.key]);
        else setContent(info.default);
      } catch (e) { setContent(info.default); }
      setLoading(false);
    })();
  }, [type]);

  function renderMarkdown(text) {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## "))
        return <h2 key={i} style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 16, marginTop: i === 0 ? 0 : 32 }}>{line.slice(3)}</h2>;
      if (line.startsWith("### "))
        return <h3 key={i} style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, marginTop: 28, color: "var(--accent)", letterSpacing: 1.2, textTransform: "uppercase" }}>{line.slice(4)}</h3>;
      if (line.startsWith("- "))
        return (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7 }}>
            <span style={{ color: "var(--accent)", marginTop: 1 }}>•</span>
            <span style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.75 }}>{line.slice(2)}</span>
          </div>
        );
      if (line === "") return <div key={i} style={{ height: 8 }} />;
      return <p key={i} style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.85, marginBottom: 6 }}>{line}</p>;
    });
  }

  if (loading) return <div className="flex-center" style={{ height: "60vh" }}><div className="spinner" /></div>;

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 60, maxWidth: 820 }}>
      <div className="card" style={{ padding: "40px 48px" }}>
        {type === "terms" && (
          <div style={{ background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.25)", borderRadius: 12, padding: "16px 20px", marginBottom: 32 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#fb923c", marginBottom: 8 }}>⚠️ Important — Please Read Before Ordering</div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.8 }}>
              🔴 <strong style={{ color: "var(--light)" }}>Offer / Bundle T-shirts are NON-RETURNABLE</strong> — only exchange is allowed. Return delivery charges for offer items are paid by the customer.<br />
              🟢 <strong style={{ color: "var(--light)" }}>Regular T-shirts (no offer)</strong> — free 7-day returns, no delivery charge for the customer.<br />
              💳 A <strong style={{ color: "var(--light)" }}>2% platform fee</strong> is applied on every order and is non-refundable regardless of offers or discounts.
            </div>
          </div>
        )}
        {renderMarkdown(content)}
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 40, paddingTop: 20, fontSize: 12, color: "var(--muted)", letterSpacing: 1 }}>
          Last updated by FITRO Admin · 2026 · For queries:{" "}
          <a href="mailto:fitrostore1@gmail.com" style={{ color: "var(--accent)" }}>fitrostore1@gmail.com</a>
        </div>
      </div>
    </div>
  );
}
