import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Instagram, Twitter, Youtube, HelpCircle, ChevronDown, ChevronUp, ShoppingCart, Package, RotateCcw, CreditCard, MessageCircle } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Footer() {
  const [socialLinks, setSocialLinks] = useState({ instagram: "", twitter: "", youtube: "" });
  const [helpOpen, setHelpOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      icon: <ShoppingCart size={15} />,
      q: "How do I place an order?",
      a: "Browse our shop, pick your product, choose your size, and tap 'Add to Cart'. Then go to cart → checkout, fill in your address, choose payment (UPI/COD) and confirm. You'll get an order confirmation instantly!"
    },
    {
      icon: <Package size={15} />,
      q: "How do I track my order?",
      a: "Go to 'My Orders' from the menu or your profile. You'll see real-time status updates — Pending → Confirmed → Shipped → Delivered. We'll also notify you when your order ships."
    },
    {
      icon: <RotateCcw size={15} />,
      q: "How do I return or exchange?",
      a: "We offer 7-day hassle-free returns. Go to 'My Orders', find your order, and tap 'Request Return'. Our team will review and process it within 2–3 business days."
    },
    {
      icon: <CreditCard size={15} />,
      q: "What payment methods do you accept?",
      a: "We accept UPI (PhonePe, GPay, Paytm), Cash on Delivery (COD), and card payments via Razorpay. All payments are 100% secure."
    },
    {
      icon: <MessageCircle size={15} />,
      q: "I need more help — who do I contact?",
      a: "Use our Contact Us form on this page! Our support team replies within 24 hours. You can also track your support ticket status from the contact page."
    },
  ];

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "site"));
        if (snap.exists() && snap.data().socialLinks) setSocialLinks(snap.data().socialLinks);
      } catch (e) {}
    })();
  }, []);

  const socials = [
    { key: "instagram", Icon: Instagram, label: "Instagram" },
    { key: "twitter", Icon: Twitter, label: "Twitter" },
    { key: "youtube", Icon: Youtube, label: "YouTube" },
  ];

  return (
    <footer style={{ background: "var(--ink2)", borderTop: "1px solid var(--border)", marginTop: 80 }}>
      {/* Help Me Widget */}
      <div style={{ background: "var(--ink3)", borderBottom: "1px solid var(--border)" }}>
        <div className="container" style={{ padding: "0 18px" }}>
          <button
            onClick={() => setHelpOpen(p => !p)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", color: "var(--light)", cursor: "pointer", padding: "14px 0", gap: 10 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: "var(--accent)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <HelpCircle size={14} color="var(--ink)" />
              </div>
              <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, letterSpacing: 0.3 }}>Need Help? — How to order, track, return & more</span>
            </div>
            {helpOpen ? <ChevronUp size={16} color="var(--muted)" /> : <ChevronDown size={16} color="var(--muted)" />}
          </button>
          {helpOpen && (
            <div style={{ paddingBottom: 18 }}>
              <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                {faqs.map((faq, i) => (
                  <div key={i} style={{ background: "var(--ink2)", border: `1px solid ${openFaq === i ? "rgba(232,197,71,0.3)" : "var(--border)"}`, borderRadius: 10, overflow: "hidden", transition: "border-color 0.2s" }}>
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", color: "var(--light)", cursor: "pointer", padding: "12px 14px", gap: 10, textAlign: "left" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 9, color: openFaq === i ? "var(--accent)" : "var(--light)" }}>
                        <span style={{ color: openFaq === i ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}>{faq.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{faq.q}</span>
                      </div>
                      {openFaq === i ? <ChevronUp size={14} color="var(--accent)" /> : <ChevronDown size={14} color="var(--muted)" />}
                    </button>
                    {openFaq === i && (
                      <div style={{ padding: "0 14px 14px 38px", fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link to="/help" className="btn btn-primary" style={{ fontSize: 13, padding: "10px 20px" }}>
                  <HelpCircle size={14} /> Full Help Center
                </Link>
                <Link to="/contact" className="btn btn-secondary" style={{ fontSize: 13, padding: "10px 20px" }}>
                  <MessageCircle size={14} /> Contact Us
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Brand strip */}
      <div style={{ background: "var(--accent)", padding: "12px 0", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(14px,3vw,24px)", fontWeight: 700, color: "var(--ink)", letterSpacing: 4 }}>
          FITRO — Wear It Fit. Own It.
        </div>
      </div>

      <div className="container" style={{ padding: "52px 24px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 44, marginBottom: 44 }}>
          {/* Brand */}
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>FITRO</div>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.8, marginBottom: 18 }}>
              Premium streetwear built for those who move with purpose. Raw energy. Real style.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {socials.map(({ key, Icon, label }) =>
                socialLinks[key] ? (
                  <a key={key} href={socialLinks[key]} target="_blank" rel="noopener noreferrer" title={label}
                    style={{ background: "var(--ink3)", border: "1px solid var(--border)", padding: 9, borderRadius: 8, display: "flex", alignItems: "center", color: "var(--muted)", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}>
                    <Icon size={14} />
                  </a>
                ) : null
              )}
            </div>
          </div>

          {/* Shop */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Shop</div>
            {[["All Products", "/shop"], ["Men", "/shop?cat=Mens"], ["Women", "/shop?cat=Womens"], ["Unisex", "/shop?cat=Unisex"]].map(([l, p]) => (
              <Link key={l} to={p} style={{ display: "block", color: "var(--muted)", fontSize: 13, marginBottom: 10, transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "var(--light)"}
                onMouseLeave={e => e.target.style.color = "var(--muted)"}>{l}</Link>
            ))}
          </div>

          {/* Account */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Account</div>
            {[["My Orders", "/orders"], ["Wishlist", "/wishlist"], ["Profile", "/profile"], ["Login", "/login"]].map(([l, p]) => (
              <Link key={l} to={p} style={{ display: "block", color: "var(--muted)", fontSize: 13, marginBottom: 10, transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "var(--light)"}
                onMouseLeave={e => e.target.style.color = "var(--muted)"}>{l}</Link>
            ))}
          </div>

          {/* Help */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Help</div>
            {[["Help Center", "/help"], ["Contact Us", "/contact"], ["Privacy Policy", "/policy/privacy"], ["Return Policy", "/policy/returns"], ["Terms of Service", "/policy/terms"]].map(([l, p]) => (
              <Link key={l} to={p} style={{ display: "block", color: "var(--muted)", fontSize: 13, marginBottom: 10, transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "var(--light)"}
                onMouseLeave={e => e.target.style.color = "var(--muted)"}>{l}</Link>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>© {new Date().getFullYear()} Fitro. All rights reserved.</div>
          <div style={{ display: "flex", gap: 16 }}>
            {[["Privacy", "/policy/privacy"], ["Terms", "/policy/terms"], ["Returns", "/policy/returns"]].map(([l, p]) => (
              <Link key={l} to={p} style={{ fontSize: 12, color: "var(--muted)", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "var(--light)"}
                onMouseLeave={e => e.target.style.color = "var(--muted)"}>{l}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
