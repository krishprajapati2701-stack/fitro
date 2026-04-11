import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Package, RotateCcw, CreditCard, MessageCircle, User, Heart, Truck, Shield, ChevronDown, ChevronUp, Search } from "lucide-react";

const SECTIONS = [
  {
    icon: <User size={20} />,
    title: "Account & Login",
    color: "#60a5fa",
    faqs: [
      { q: "How do I create an account?", a: "Tap 'Login' in the top menu → click 'Create Account' → fill your name, email, phone and password → done! You'll be logged in automatically." },
      { q: "I forgot my password. What do I do?", a: "Go to Login → tap 'Forgot Password?' → enter your email → we'll send you a reset link. Check your spam folder if you don't see it." },
      { q: "Can I use the same account on multiple devices?", a: "Yes! Your account, wishlist, and order history all sync across devices automatically. Just log in with the same email and password." },
    ]
  },
  {
    icon: <ShoppingBag size={20} />,
    title: "Placing an Order",
    color: "var(--accent)",
    faqs: [
      { q: "How do I place an order?", a: "1. Browse Shop → 2. Click a product → 3. Select your size → 4. Tap 'Add to Cart' → 5. Go to Cart → 6. Tap Checkout → 7. Fill address → 8. Choose payment → 9. Confirm! You'll see your order in 'My Orders' right away." },
      { q: "What sizes do you have?", a: "We carry XS, S, M, L, XL, and XXL for most products. Each product page shows available sizes. If a size is greyed out, it's out of stock." },
      { q: "Can I change or cancel my order after placing it?", a: "Once an order is placed, we're unable to cancel or modify it as it's processed immediately to ensure fast delivery. If you received a wrong or damaged item, please contact our support team and we'll make it right!" },
      { q: "I placed an order but don't see it in My Orders.", a: "Make sure you're logged in with the same account you used to order. If it still doesn't show, contact us with your email and we'll find it." },
    ]
  },
  {
    icon: <CreditCard size={20} />,
    title: "Payments",
    color: "#4ade80",
    faqs: [
      { q: "What payment methods do you accept?", a: "We accept UPI (PhonePe, GPay, Paytm, any UPI app), Cash on Delivery (COD), and card payments via Razorpay. All online payments are 100% secure." },
      { q: "How does UPI payment work?", a: "Select UPI at checkout → enter your UPI ID or scan the QR → complete payment → enter your UTR/Transaction ID in the app → our team verifies it (usually within 1-2 hours)." },
      { q: "How does Cash on Delivery work?", a: "Select COD at checkout → confirm your order → pay the delivery person in cash when they arrive with your parcel. Simple!" },
      { q: "My payment failed but money was deducted.", a: "Don't worry — if payment fails, the amount is automatically refunded to your original payment method within 5-7 business days. Contact us if it takes longer." },
    ]
  },
  {
    icon: <Truck size={20} />,
    title: "Delivery & Shipping",
    color: "#a78bfa",
    faqs: [
      { q: "How long does delivery take?", a: "We deliver Pan India in 3–7 business days. Metro cities (Mumbai, Delhi, Bangalore, etc.) usually get it in 3–5 days." },
      { q: "Is there a shipping charge?", a: "Shipping is FREE on orders above ₹999. For orders below ₹999, a small shipping fee applies (shown at checkout)." },
      { q: "How do I track my order?", a: "Go to My Orders → click on your order → you'll see the current status (Pending → Confirmed → Shipped → Out for Delivery → Delivered). We update it in real time." },
      { q: "My order says 'Shipped' but I haven't received it.", a: "After shipping, it usually takes 1–3 more days to arrive. If it's been over 7 days, please contact us with your order ID and we'll check with our courier partner." },
    ]
  },
  {
    icon: <RotateCcw size={20} />,
    title: "Returns & Exchanges",
    color: "#fb923c",
    faqs: [
      { q: "What is your return policy?", a: "We offer hassle-free 7-day returns from the date of delivery. The product must be unworn, unwashed, and in original condition with tags attached." },
      { q: "How do I request a return?", a: "Go to My Orders → find the delivered order → tap 'Request Return' → select your reason → submit. Our team will review and approve within 24 hours, then schedule a pickup." },
      { q: "How will I get my refund?", a: "Refunds are processed within 5–7 business days after we receive and verify the returned item. It'll go back to your original payment method." },
      { q: "Can I exchange for a different size?", a: "Currently we process returns and refunds. To get a different size, return the item and place a new order for the size you want." },
    ]
  },
  {
    icon: <Heart size={20} />,
    title: "Wishlist",
    color: "#f43f5e",
    faqs: [
      { q: "How do I add to my wishlist?", a: "Tap the heart ♥ icon on any product card or product page. You must be logged in to save items. Your wishlist syncs across all your devices." },
      { q: "My wishlist was empty after logging in on a new device.", a: "We've updated our system — wishlists now sync via your account. If you had items saved before, they may have been in local storage only. Going forward, all wishlist items sync automatically." },
    ]
  },
];

export default function HelpPage() {
  const [openSection, setOpenSection] = useState(null);
  const [openFaq, setOpenFaq] = useState({});
  const [search, setSearch] = useState("");

  function toggleFaq(sIdx, fIdx) {
    const key = `${sIdx}-${fIdx}`;
    setOpenFaq(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const filteredSections = search.trim()
    ? SECTIONS.map(s => ({
        ...s,
        faqs: s.faqs.filter(f =>
          f.q.toLowerCase().includes(search.toLowerCase()) ||
          f.a.toLowerCase().includes(search.toLowerCase())
        )
      })).filter(s => s.faqs.length > 0)
    : SECTIONS;

  return (
    <div className="container page-bottom-spacing" style={{ paddingTop: 40, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 4, color: "var(--accent)", textTransform: "uppercase", marginBottom: 10 }}>FITRO Help Center</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,6vw,56px)", letterSpacing: 2, marginBottom: 12 }}>HOW CAN WE HELP? 🙋</h1>
        <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 480, margin: "0 auto 24px" }}>
          Everything you need to know about ordering, tracking, returns and more.
        </p>
        {/* Search */}
        <div style={{ position: "relative", maxWidth: 440, margin: "0 auto" }}>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search your question..." className="input"
            style={{ paddingLeft: 42, fontSize: 15, height: 50 }}
          />
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
        </div>
      </div>

      {/* Quick links */}
      {!search && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 40 }}>
          {SECTIONS.map((s, i) => (
            <button key={i} onClick={() => setOpenSection(openSection === i ? null : i)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px", background: "var(--ink2)", border: `1px solid ${openSection === i ? s.color : "var(--border)"}`, borderRadius: 14, cursor: "pointer", transition: "all 0.2s" }}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: openSection === i ? s.color : "var(--muted)", textAlign: "center", lineHeight: 1.3 }}>{s.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* FAQ Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720, margin: "0 auto" }}>
        {filteredSections.map((section, sIdx) => {
          const isOpen = search ? true : openSection === sIdx;
          return (
            <div key={sIdx} style={{ background: "var(--ink2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
              {/* Section header */}
              <button onClick={() => !search && setOpenSection(openSection === sIdx ? null : sIdx)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", color: "var(--light)", cursor: "pointer", padding: "16px 20px", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ color: section.color, flexShrink: 0 }}>{section.icon}</span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 1 }}>{section.title}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)", background: "var(--ink3)", borderRadius: 20, padding: "2px 8px" }}>{section.faqs.length} topics</span>
                </div>
                {!search && (isOpen ? <ChevronUp size={16} color="var(--muted)" /> : <ChevronDown size={16} color="var(--muted)" />)}
              </button>

              {/* FAQs */}
              {isOpen && (
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  {section.faqs.map((faq, fIdx) => {
                    const key = `${sIdx}-${fIdx}`;
                    const isOpen2 = openFaq[key];
                    return (
                      <div key={fIdx} style={{ borderBottom: fIdx < section.faqs.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <button onClick={() => toggleFaq(sIdx, fIdx)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", color: isOpen2 ? section.color : "var(--light)", cursor: "pointer", padding: "14px 20px", gap: 12, textAlign: "left" }}>
                          <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{faq.q}</span>
                          {isOpen2 ? <ChevronUp size={14} style={{ flexShrink: 0 }} color={section.color} /> : <ChevronDown size={14} style={{ flexShrink: 0 }} color="var(--muted)" />}
                        </button>
                        {isOpen2 && (
                          <div style={{ padding: "0 20px 16px 20px", fontSize: 14, color: "var(--muted)", lineHeight: 1.8, background: "rgba(255,255,255,0.01)" }}>
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Still need help CTA */}
      <div style={{ textAlign: "center", marginTop: 52, padding: "36px 24px", background: "var(--ink2)", border: "1px solid var(--border)", borderRadius: 20, maxWidth: 500, margin: "52px auto 0" }}>
        <MessageCircle size={32} color="var(--accent)" style={{ marginBottom: 12 }} />
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 1, marginBottom: 8 }}>Still need help?</h3>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>
          Can't find your answer? Our support team replies within 24 hours!
        </p>
        <Link to="/contact" className="btn btn-primary" style={{ fontSize: 14 }}>
          <MessageCircle size={15} /> Contact Support
        </Link>
      </div>
    </div>
  );
}
