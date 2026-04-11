import React, { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { Mail, Phone, MapPin, Send, CheckCircle, User, Lock } from "lucide-react";

export function Contact() {
  const { currentUser, userProfile } = useAuth();
  const [form, setForm] = useState({
    name: userProfile?.name || "",
    email: currentUser?.email || "",
    phone: userProfile?.phone || "",
    subject: "",
    message: "",
  });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myTickets, setMyTickets] = useState([]);
  const [showTickets, setShowTickets] = useState(false);

  const set = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }));

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "support"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc")));
        setMyTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
    })();
  }, [currentUser, sent]);

  async function submit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) { toast.error("Please fill all fields!"); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, "support"), {
        ...form, userId: currentUser?.uid || null, userEmail: form.email, userName: form.name, userPhone: form.phone,
        status: "open", adminReply: null, createdAt: serverTimestamp(),
      });
      setSent(true);
      toast.success("Message sent! We'll reply within 24 hours 📩");
      setForm(prev => ({ ...prev, subject: "", message: "" }));
    } catch (e) { toast.error("Failed to send. Try again!"); }
    setLoading(false);
  }

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, letterSpacing: 4, color: "var(--accent)", textTransform: "uppercase", marginBottom: 6 }}>Get in Touch</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px,5vw,56px)", letterSpacing: 3, marginBottom: 8 }}>CONTACT US</h1>
        <p style={{ color: "var(--muted)", marginBottom: 40, fontSize: 15 }}>Got a question? We got you! Reach out and we'll get back to you within 24 hours.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }} className="contact-grid">
          <form onSubmit={submit} className="card">
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2, marginBottom: 18 }}>SEND A MESSAGE</div>
            {sent && (
              <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 9, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle size={16} color="#4ade80" />
                <span style={{ fontSize: 13, color: "#4ade80" }}>Message received! We'll reply soon.</span>
              </div>
            )}
            <div className="form-group">
              <label className="label">Full Name *</label>
              <input type="text" value={form.name} onChange={set("name")} placeholder="Your name" className="input" />
            </div>
            <div className="form-group">
              <label className="label">Email *</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="your@email.com" className="input" />
            </div>
            <div className="form-group">
              <label className="label">Phone</label>
              <input type="tel" value={form.phone} onChange={set("phone")} placeholder="10-digit number" className="input" />
            </div>
            <div className="form-group">
              <label className="label">Subject *</label>
              <input type="text" value={form.subject} onChange={set("subject")} placeholder="Order issue, size query..." className="input" />
            </div>
            <div className="form-group">
              <label className="label">Message *</label>
              <textarea value={form.message} onChange={set("message")} placeholder="Tell us what's up..." className="input" rows={4} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 12 }} disabled={loading}>
              <Send size={14} /> {loading ? "Sending..." : "Send Message"}
            </button>
          </form>

          {/* Contact info */}
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
              {[
                { icon: <Mail size={18} />, label: "Email", val: "fitrostore1@gmail.com", href: "mailto:fitrostore1@gmail.com" },
                { icon: <Phone size={18} />, label: "Response Time", val: "Within 24 hours" },
                { icon: <MapPin size={18} />, label: "Brand", val: "FITRO · India · 2026" },
              ].map((item, i) => (
                <div key={i} className="card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ background: "rgba(200,255,0,0.08)", padding: 12, borderRadius: 9, color: "var(--accent)", flexShrink: 0 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 9, letterSpacing: 3, color: "var(--muted)", textTransform: "uppercase", marginBottom: 2 }}>{item.label}</div>
                    {item.href ? (
                      <a href={item.href} style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>{item.val}</a>
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.val}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Previous tickets */}
            {currentUser && myTickets.length > 0 && (
              <div>
                <button onClick={() => setShowTickets(!showTickets)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-body)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  My Past Messages ({myTickets.length}) {showTickets ? "▲" : "▼"}
                </button>
                {showTickets && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {myTickets.slice(0, 5).map(ticket => (
                      <div key={ticket.id} className="card" style={{ padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{ticket.subject}</div>
                          <span className={`badge ${ticket.status === "open" ? "badge-orange" : "badge-green"}`} style={{ fontSize: 9 }}>{ticket.status}</span>
                        </div>
                        {ticket.adminReply && (
                          <div style={{ background: "rgba(200,255,0,0.06)", border: "1px solid var(--border)", borderRadius: 7, padding: "8px 12px", marginTop: 8, fontSize: 12, color: "rgba(245,244,240,0.7)" }}>
                            <strong style={{ color: "var(--accent)", fontSize: 10, fontFamily: "var(--font-body)", letterSpacing: 1.5, textTransform: "uppercase" }}>FITRO Reply:</strong> {ticket.adminReply}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Profile() {
  const { currentUser, userProfile, changePassword } = useAuth();
  const [name, setName] = useState(userProfile?.name || "");
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [saving, setSaving] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  async function saveProfile(e) {
    e.preventDefault();
    if (!name) { toast.error("Name is required!"); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { name, phone });
      toast.success("Profile updated! ✅");
    } catch (e) { toast.error("Failed to update profile"); }
    setSaving(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!newPass || !confirmPass) { toast.error("Fill both fields!"); return; }
    if (newPass !== confirmPass) { toast.error("Passwords don't match!"); return; }
    if (newPass.length < 6) { toast.error("Password must be at least 6 characters!"); return; }
    setChangingPass(true);
    try {
      await changePassword(newPass);
      toast.success("Password changed! 🔒");
      setNewPass(""); setConfirmPass("");
    } catch (e) {
      if (e.code === "auth/requires-recent-login") toast.error("Please re-login and try again");
      else toast.error("Failed to change password");
    }
    setChangingPass(false);
  }

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, letterSpacing: 4, color: "var(--accent)", textTransform: "uppercase", marginBottom: 6 }}>Account</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3, marginBottom: 32 }}>MY PROFILE</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 800 }} className="profile-grid">
        {/* Profile info */}
        <form onSubmit={saveProfile} className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(200,255,0,0.1)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={22} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2 }}>{userProfile?.name || "User"}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{currentUser?.email}</div>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" />
          </div>
          <div className="form-group">
            <label className="label">Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="input" />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input type="email" value={currentUser?.email} disabled className="input" style={{ opacity: 0.5 }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ fontSize: 11 }} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        {/* Change password */}
        <form onSubmit={handleChangePassword} className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Lock size={18} color="var(--accent)" />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2 }}>CHANGE PASSWORD</div>
          </div>
          <div className="form-group">
            <label className="label">New Password</label>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min 6 characters" className="input" />
          </div>
          <div className="form-group">
            <label className="label">Confirm New Password</label>
            <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Repeat new password" className="input" />
          </div>
          <button type="submit" className="btn btn-ghost" style={{ fontSize: 11 }} disabled={changingPass}>
            {changingPass ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
