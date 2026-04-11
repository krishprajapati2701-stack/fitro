import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Save, Instagram, Twitter, Youtube } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminSiteSettings() {
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("shipping");
  const [settings, setSettings] = useState({
    shippingCharge: 99,
    freeShippingAbove: 999,
    socialLinks: { instagram: "", twitter: "", youtube: "" },
    privacyPolicy: "## Privacy Policy\n\nYour privacy matters to us at FITRO. We collect only necessary information to process your orders.\n\n### Data We Collect\n- Name, email, phone for order processing\n- Shipping address for delivery\n\nContact: fitrostore1@gmail.com",
    termsOfService: "## Terms of Service\n\nBy using FITRO, you agree to these terms.\n\n### Returns\n- 7-day return policy\n- Items must be unworn with original tags",
    shippingPolicy: "## Shipping Policy\n\n### Delivery\n- Standard: 3-5 business days\n\n### Charges\n- Free above the configured threshold\n- Standard charges below threshold",
  });

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "settings", "site"));
      if (snap.exists()) setSettings(prev => ({ ...prev, ...snap.data() }));
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "site"), { ...settings, updatedAt: serverTimestamp() });
      toast.success("Site settings saved! ✅");
    } catch (e) { toast.error("Failed to save"); }
    setSaving(false);
  }

  const tabs = [
    ["shipping", "💰 Shipping Charges"],
    ["social", "📱 Social Links"],
    ["privacy", "📄 Privacy Policy"],
    ["terms", "📋 Terms of Service"],
    ["shippingpolicy", "🚚 Shipping Policy"],
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 2 }}>SITE SETTINGS</h1>
        <button onClick={save} className="btn btn-primary" disabled={saving} style={{ fontSize: 11 }}>
          <Save size={13} /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`tag ${tab === k ? "active" : ""}`} style={{ fontSize: 11 }}>{l}</button>
        ))}
      </div>

      {tab === "shipping" && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2, marginBottom: 12 }}>SHIPPING RATES</div>
          <div style={{ background: "rgba(212,255,0,0.05)", border: "1px solid rgba(212,255,0,0.2)", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>📍 Delivery charges managed in Settings</div>
            Ahmedabad and Outside Ahmedabad delivery charges are in <strong style={{ color: "var(--light)" }}>Settings → Delivery Charges</strong>.
            <br /><a href="/admin/settings" style={{ color: "var(--accent)", textDecoration: "underline", fontWeight: 600, marginTop: 10, display: "inline-block" }}>→ Go to Settings</a>
          </div>
        </div>
      )}

      {tab === "social" && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2, marginBottom: 18 }}>SOCIAL LINKS</div>
          {[["instagram", "Instagram", <Instagram size={15} />], ["twitter", "Twitter / X", <Twitter size={15} />], ["youtube", "YouTube", <Youtube size={15} />]].map(([key, label, icon]) => (
            <div key={key} className="form-group">
              <label className="label" style={{ display: "flex", alignItems: "center", gap: 6 }}>{icon} {label}</label>
              <input type="url" value={settings.socialLinks?.[key] || ""} onChange={e => setSettings(p => ({ ...p, socialLinks: { ...p.socialLinks, [key]: e.target.value } }))} className="input" placeholder={`https://${key}.com/fitrostore`} />
            </div>
          ))}
        </div>
      )}

      {["privacy", "terms", "shippingpolicy"].includes(tab) && (() => {
        const keyMap = { privacy: "privacyPolicy", terms: "termsOfService", shippingpolicy: "shippingPolicy" };
        const titleMap = { privacy: "PRIVACY POLICY", terms: "TERMS OF SERVICE", shippingpolicy: "SHIPPING POLICY" };
        const k = keyMap[tab];
        return (
          <div className="card">
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2, marginBottom: 4 }}>{titleMap[tab]}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>Supports ## H2, ### H3, - list items and plain paragraphs</div>
            <textarea value={settings[k]} onChange={e => setSettings(p => ({ ...p, [k]: e.target.value }))} className="input" rows={18} style={{ fontFamily: "monospace", fontSize: 13 }} />
          </div>
        );
      })()}
    </div>
  );
}
