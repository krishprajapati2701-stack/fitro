import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LayoutDashboard, ShoppingBag, Package, MessageSquare, Star, RotateCcw, Settings, LogOut, Plus, Trash2, Edit, Check, X, Truck, Save, Tag, Image, Layout, ChevronUp, ChevronDown, Globe, Gift, AlertTriangle, RefreshCw, ClipboardCheck, FileText } from "lucide-react";
import AdminSiteSettings from "./AdminSiteSettings";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where, getDoc, setDoc, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";

const DEFAULT_SLIDES = [
  { id: 1, image: "/tshirt1.jpg", title: "WEAR IT FIT", subtitle: "Built for Those Who Move with Purpose", badge: "NEW DROP", cta: "Shop Now", link: "/shop" },
  { id: 2, image: "/tshirt3.png", title: "OWN IT.", subtitle: "Raw Energy. Real Style. No Compromise.", badge: "BESTSELLER", cta: "Explore", link: "/shop?cat=Mens" },
  { id: 3, image: "/tshirt2.jpg", title: "FITRO ESSENTIALS", subtitle: "Minimal Drip — Less Is More", badge: "LIMITED", cta: "Shop Now", link: "/shop?cat=Unisex" },
  { id: 4, image: "/tshirt4.png", title: "FITTED. RAW. REAL.", subtitle: "Fresh Drops Every Week — Stay Ahead of the Fit", badge: "HOT", cta: "View All", link: "/shop" },
];

export default function AdminPanel() {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  if (!isAdmin) { navigate("/"); return null; }

  const navItems = [
    { path: "/admin", icon: <LayoutDashboard size={16} />, label: "Dashboard" },
    { path: "/admin/homepage", icon: <Layout size={16} />, label: "Homepage" },
    { path: "/admin/products", icon: <ShoppingBag size={16} />, label: "Products" },
    { path: "/admin/categories", icon: <Tag size={16} />, label: "Categories" },
    { path: "/admin/orders", icon: <Package size={16} />, label: "Orders" },
    { path: "/admin/returns", icon: <RotateCcw size={16} />, label: "Returns" },
    { path: "/admin/offers", icon: <Gift size={16} />, label: "Offers" },
    { path: "/admin/support", icon: <MessageSquare size={16} />, label: "Support" },
    { path: "/admin/reviews", icon: <Star size={16} />, label: "Reviews" },
    { path: "/admin/settings", icon: <Settings size={16} />, label: "Settings" },
    { path: "/admin/site", icon: <Globe size={16} />, label: "Site Settings" },
  ];

  const isActive = (path) => path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(path);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside className="sidebar">
        <div style={{ padding: "20px 20px 20px", borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--accent)", letterSpacing: 2 }}>FITRO</div>
          <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Admin Panel</div>
        </div>
        {navItems.map(item => (
          <Link key={item.path} to={item.path} className={`sidebar-link ${isActive(item.path) ? "active" : ""}`}>
            {item.icon} {item.label}
          </Link>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={async () => { await logout(); navigate("/"); }}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14, width: "100%", marginTop: 20 }}>
          <LogOut size={16} /> Logout
        </button>
      </aside>

      <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto", minWidth: 0 }}>
        {/* Mobile nav */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto", paddingBottom: 6 }} className="mobile-admin-nav">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, whiteSpace: "nowrap", fontSize: 12, fontWeight: 600, flexShrink: 0, background: isActive(item.path) ? "rgba(212,255,0,0.1)" : "var(--ink2)", color: isActive(item.path) ? "var(--accent)" : "var(--muted)", border: `1px solid ${isActive(item.path) ? "rgba(212,255,0,0.3)" : "var(--border)"}` }}>
              {item.icon} {item.label}
            </Link>
          ))}
        </div>
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/homepage" element={<AdminHomepage />} />
          <Route path="/products" element={<AdminProducts />} />
          <Route path="/categories" element={<AdminCategories />} />
          <Route path="/orders" element={<AdminOrders />} />
          <Route path="/returns" element={<AdminReturns />} />
          <Route path="/offers" element={<AdminOffers />} />
          <Route path="/support" element={<AdminSupport />} />
          <Route path="/reviews" element={<AdminReviews />} />
          <Route path="/settings" element={<AdminSettings />} />
          <Route path="/site" element={<AdminSiteSettings />} />
        </Routes>
      </main>
      <style>{`@media (min-width: 769px) { .mobile-admin-nav { display: none !important; } }`}</style>
    </div>
  );
}

// ---- DASHBOARD ----
function AdminDashboard() {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, products: 0, pending: 0, pendingPayment: 0, pendingRazorpay: 0, returns: 0 });
  useEffect(() => {
    (async () => {
      const [ordSnap, prodSnap] = await Promise.all([getDocs(collection(db, "orders")), getDocs(collection(db, "products"))]);
      const orders = ordSnap.docs.map(d => d.data());
      setStats({
        orders: orders.length,
        revenue: orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.total || 0), 0),
        products: prodSnap.size,
        pending: orders.filter(o => o.status === "pending").length,
        pendingPayment: orders.filter(o => o.paymentStatus === "pending_verification").length,
        pendingRazorpay: orders.filter(o => o.paymentStatus === "pending_razorpay").length,
        returns: orders.filter(o => o.status === "return_requested").length,
      });
    })();
  }, []);

  const cards = [
    { label: "Total Orders", value: stats.orders, icon: "📦", color: "#60a5fa" },
    { label: "Revenue", value: `₹${stats.revenue.toLocaleString("en-IN")}`, icon: "💰", color: "#4ade80" },
    { label: "Products", value: stats.products, icon: "👕", color: "var(--accent)" },
    { label: "Pending Orders", value: stats.pending, icon: "⏳", color: "#fbbf24" },

    { label: "Return Requests", value: stats.returns, icon: "↩️", color: "var(--neon2)" },
  ];

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, letterSpacing: 1, marginBottom: 4 }}>DASHBOARD</h1>
      <p style={{ color: "var(--muted)", marginBottom: 28 }}>Welcome back, Admin! 🔥</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
        {cards.map(c => (
          <div key={c.label} className="card" style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>
      {stats.pendingRazorpay > 0 && (
        <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>🟡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#fbbf24", fontSize: 14 }}>{stats.pendingRazorpay} Razorpay order(s) pending confirmation</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Check Razorpay dashboard and confirm in Orders section</div>
          </div>
          <Link to="/admin/orders" className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 12 }}>View Orders</Link>
        </div>
      )}

      {stats.returns > 0 && (
        <div style={{ background: "rgba(255,45,120,0.08)", border: "1px solid rgba(255,45,120,0.25)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>↩️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "var(--neon2)", fontSize: 14 }}>{stats.returns} return request(s) pending</div>
          </div>
          <Link to="/admin/returns" className="btn" style={{ padding: "7px 14px", fontSize: 12, background: "var(--neon2)", color: "white" }}>View Returns</Link>
        </div>
      )}
    </div>
  );
}

// ---- HOMEPAGE EDITOR ----
function AdminHomepage() {
  const [tab, setTab] = useState("slides");
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [features, setFeatures] = useState([
    { icon: "⚡", title: "Lightning Drops", desc: "New styles every week" },
    { icon: "🚚", title: "Fast Delivery", desc: "Pan India 3–5 days" },
    { icon: "↩️", title: "7-Day Returns", desc: "No questions asked" },
    { icon: "🔒", title: "Secure Payments", desc: "UPI & COD available" },
  ]);
  const [stats, setStats] = useState([
    { value: "10K+", label: "Happy Customers" },
    { value: "500+", label: "Styles" },
    { value: "4.9★", label: "Rating" },
  ]);
  const [shippingBar, setShippingBar] = useState("Free shipping ₹999+ · 7-day returns · Secure payments · 3–5 day delivery");
  const [catImages, setCatImages] = useState([
    { name: "Mens", image: "", description: "Mens collection thumbnail" },
    { name: "Womens", image: "", description: "Womens collection thumbnail" },
    { name: "Unisex", image: "", description: "Unisex collection thumbnail" },
  ]);
  const [saving, setSaving] = useState(false);
  const [editSlide, setEditSlide] = useState(null);
  const [slideForm, setSlideForm] = useState({ image: "", title: "", subtitle: "", badge: "", cta: "Shop Now", link: "/shop" });

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "settings", "homepage"));
      if (snap.exists()) {
        const d = snap.data();
        if (d.slides?.length) setSlides(d.slides);
        if (d.features?.length) setFeatures(d.features);
        if (d.stats?.length) setStats(d.stats);
        if (d.shippingBar) setShippingBar(d.shippingBar);
        if (d.catImages?.length) setCatImages(d.catImages);
      }
    })();
  }, []);

  async function saveAll() {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "homepage"), { slides, features, stats, shippingBar, catImages, updatedAt: serverTimestamp() });
      toast.success("Homepage updated! 🎉");
    } catch (e) { toast.error("Failed to save"); }
    setSaving(false);
  }

  function openSlideEdit(slide, idx) {
    setEditSlide(idx);
    setSlideForm({ ...slide });
  }

  function saveSlide() {
    if (editSlide === "new") {
      setSlides(prev => [...prev, { ...slideForm, id: Date.now() }]);
    } else {
      setSlides(prev => prev.map((s, i) => i === editSlide ? { ...slideForm, id: s.id } : s));
    }
    setEditSlide(null);
    setSlideForm({ image: "", title: "", subtitle: "", badge: "", cta: "Shop Now", link: "/shop" });
  }

  const tabs = [["slides", "🖼️ Carousel Slides"], ["categories", "🗂️ Category Images"], ["features", "⚡ Features Bar"], ["shipping", "📢 Shipping Bar"]];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 1 }}>HOMEPAGE EDITOR</h1>
        <button onClick={saveAll} className="btn btn-primary" disabled={saving}>
          <Save size={14} /> {saving ? "Saving..." : "Save All Changes"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`tag ${tab === k ? "active" : ""}`} style={{ fontSize: 13 }}>{l}</button>
        ))}
      </div>

      {/* CATEGORY IMAGES */}
      {tab === "categories" && (
        <div>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
            Edit the thumbnail images shown in the "Your Vibe, Your Drip" section. Paste ImgBB or any image URL.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {catImages.map((cat, i) => (
              <div key={i} className="card" style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, alignItems: "center" }}>
                {/* Preview */}
                <div style={{ borderRadius: 10, overflow: "hidden", aspectRatio: "2/3", background: "var(--ink3)", border: "1px solid var(--border)" }}>
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display="none"} />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)", fontSize: 12, textAlign: "center", padding: 8 }}>
                      No image<br/>set
                    </div>
                  )}
                </div>
                {/* Fields */}
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--accent)", letterSpacing: 2, marginBottom: 12 }}>{cat.name.toUpperCase()}</div>
                  <div className="form-group">
                    <label className="label">Image URL *</label>
                    <input
                      type="text"
                      value={cat.image}
                      onChange={e => setCatImages(prev => prev.map((c,j) => j===i ? {...c, image: e.target.value} : c))}
                      placeholder="https://i.ibb.co/... or any image URL"
                      className="input"
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    💡 Upload your t-shirt photo to <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>imgbb.com</a> → Copy the "Direct link" → Paste above
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, background: "rgba(212,255,0,0.05)", border: "1px solid rgba(212,255,0,0.15)", borderRadius: 10, padding: "12px 16px", fontSize: 13 }}>
            <strong style={{ color: "var(--accent)" }}>📸 How to get image URL:</strong>
            <div style={{ color: "var(--muted)", marginTop: 6, lineHeight: 1.7 }}>
              1. Go to <strong style={{ color: "var(--light)" }}>imgbb.com</strong> and upload your t-shirt photo<br/>
              2. After upload, click the image → copy the <strong style={{ color: "var(--light)" }}>"Direct link"</strong><br/>
              3. Paste it in the Image URL field above<br/>
              4. Click <strong style={{ color: "var(--accent)" }}>"Save All Changes"</strong>
            </div>
          </div>
        </div>
      )}

      {/* SLIDES */}
      {tab === "slides" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>Manage hero carousel slides. Changes save when you click "Save All".</p>
            <button onClick={() => { setEditSlide("new"); setSlideForm({ image: "", title: "", subtitle: "", badge: "NEW", cta: "Shop Now", link: "/shop" }); }} className="btn btn-primary" style={{ padding: "8px 14px", fontSize: 13 }}>
              <Plus size={13} /> Add Slide
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {slides.map((slide, i) => (
              <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px" }}>
                <img src={slide.image} alt="" style={{ width: 80, height: 60, borderRadius: 8, objectFit: "cover", background: "var(--ink3)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{slide.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slide.subtitle}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <span className="badge badge-neon">{slide.badge}</span>
                    <span className="badge badge-gray">{slide.cta}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => i > 0 && setSlides(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; })} style={{ background: "var(--ink3)", border: "none", color: "var(--muted)", cursor: "pointer", padding: 6, borderRadius: 6 }}><ChevronUp size={14} /></button>
                  <button onClick={() => i < slides.length-1 && setSlides(prev => { const a = [...prev]; [a[i+1], a[i]] = [a[i], a[i+1]]; return a; })} style={{ background: "var(--ink3)", border: "none", color: "var(--muted)", cursor: "pointer", padding: 6, borderRadius: 6 }}><ChevronDown size={14} /></button>
                  <button onClick={() => openSlideEdit(slide, i)} className="btn btn-ghost" style={{ padding: "6px 10px" }}><Edit size={13} /></button>
                  <button onClick={() => setSlides(prev => prev.filter((_, j) => j !== i))} className="btn btn-danger" style={{ padding: "6px 10px" }}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>

          {/* Slide edit modal */}
          {editSlide !== null && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditSlide(null)}>
              <div className="modal-box">
                <div className="flex-between" style={{ marginBottom: 20 }}>
                  <h3 style={{ fontWeight: 700 }}>{editSlide === "new" ? "Add New Slide" : "Edit Slide"}</h3>
                  <button onClick={() => setEditSlide(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={18} /></button>
                </div>
                {[["image","Image URL (paste your image link)"],["title","Title (e.g. TRIBE NOMADIC)"],["subtitle","Subtitle / Description"],["badge","Badge (NEW DROP / HOT / LIMITED)"],["cta","Button Text (Shop Now)"],["link","Button Link (/shop or /shop?cat=Mens)"]].map(([k,p]) => (
                  <div key={k} className="form-group">
                    <label className="label">{p}</label>
                    <input type="text" value={slideForm[k]} onChange={e => setSlideForm(prev => ({...prev,[k]:e.target.value}))} placeholder={p} className="input" />
                  </div>
                ))}
                {slideForm.image && (
                  <img src={slideForm.image} alt="preview" style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 10, marginBottom: 12, background: "var(--ink3)" }} />
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveSlide} className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}><Save size={14} /> Save Slide</button>
                  <button onClick={() => setEditSlide(null)} className="btn btn-secondary">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FEATURES */}
      {tab === "features" && (
        <div>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>Edit the 4 feature boxes shown below the hero section.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {features.map((f, i) => (
              <div key={i} className="card" style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", gap: 12, alignItems: "center", padding: "14px 16px" }}>
                <input value={f.icon} onChange={e => setFeatures(prev => prev.map((x,j) => j===i ? {...x,icon:e.target.value} : x))} className="input" style={{ textAlign: "center", fontSize: 20, padding: "8px" }} />
                <input value={f.title} onChange={e => setFeatures(prev => prev.map((x,j) => j===i ? {...x,title:e.target.value} : x))} className="input" placeholder="Title" />
                <input value={f.desc} onChange={e => setFeatures(prev => prev.map((x,j) => j===i ? {...x,desc:e.target.value} : x))} className="input" placeholder="Description" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATS */}
      {tab === "stats" && (
        <div>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>Edit the stats shown on homepage (e.g. 10K+ Happy Customers).</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stats.map((s, i) => (
              <div key={i} className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "center", padding: "14px 16px" }}>
                <input value={s.value} onChange={e => setStats(prev => prev.map((x,j) => j===i ? {...x,value:e.target.value} : x))} className="input" placeholder="Value (e.g. 10K+)" />
                <input value={s.label} onChange={e => setStats(prev => prev.map((x,j) => j===i ? {...x,label:e.target.value} : x))} className="input" placeholder="Label (e.g. Happy Customers)" />
                <button onClick={() => setStats(prev => prev.filter((_,j) => j!==i))} className="btn btn-danger" style={{ padding: "8px 10px" }}><Trash2 size={13} /></button>
              </div>
            ))}
            <button onClick={() => setStats(prev => [...prev, { value: "0", label: "New Stat" }])} className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>
              <Plus size={13} /> Add Stat
            </button>
          </div>
        </div>
      )}

      {/* SHIPPING BAR */}
      {tab === "shipping" && (
        <div>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>Edit the scrolling announcement bar text at the top of the page.</p>
          <div className="card">
            <label className="label">Shipping Bar Text</label>
            <textarea value={shippingBar} onChange={e => setShippingBar(e.target.value)} className="input" rows={3} placeholder="Free shipping ₹999+ · 7-day returns · Secure payments" />
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>💡 Use · to separate items. This text will scroll across the top.</div>
          </div>
          <div style={{ background: "var(--accent)", color: "var(--ink)", borderRadius: 8, padding: "10px 16px", marginTop: 12, fontSize: 12, fontWeight: 700, overflow: "hidden" }}>
            Preview: ✦ {shippingBar} ✦
          </div>
        </div>
      )}
    </div>
  );
}

// ---- PRODUCTS ----
function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [step, setStep] = useState(1);
  const EMPTY_FORM = { name: "", price: "", mrp: "", category: "", description: "", imageList: ["", "", "", "", "", ""], sizes: "XS,S,M,L,XL,XXL", badge: "", stockPerSize: { XS:10, S:10, M:10, L:10, XL:10, XXL:10 } };
  const [form, setForm] = useState(EMPTY_FORM);
  const [allCatsData, setAllCatsData] = useState([]);
  const [saving, setSaving] = useState(false);
  const [restockModal, setRestockModal] = useState(null);
  const [restockData, setRestockData] = useState({});
  const [restockSaving, setRestockSaving] = useState(false);

  useEffect(() => { fetchProducts(); fetchCats(); }, []);

  async function fetchProducts() {
    const snap = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc")));
    setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function fetchCats() {
    try {
      const snap = await getDocs(collection(db, "categories"));
      if (!snap.empty) {
        const catData = snap.docs.map(d => ({ name: d.data().name }));
        setAllCatsData(catData);
        // Set default category to first one
        setForm(prev => prev.category === "" ? { ...prev, category: catData[0]?.name || "Mens" } : prev);
      }
    } catch (e) {}
  }

  const catNames = allCatsData.map(c => c.name).length > 0 ? allCatsData.map(c => c.name) : ["Mens", "Womens", "Unisex"];

  const set = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }));

  function openNew() {
    setEditing(null);
    const defaultCat = catNames[0] || "Mens";
    setForm({ ...EMPTY_FORM, category: defaultCat, stockPerSize: { XS:10, S:10, M:10, L:10, XL:10, XXL:10 } });
    setStep(1);
    setModal(true);
  }

  function openEdit(p) {
    setEditing(p);
    const imgs = p.images || [];
    const padded = [...imgs, "", "", "", "", "", ""].slice(0, 6);
    const sizesStr = (p.sizes || []).join(",");
    // Build stockPerSize from existing stock data (support both old flat stock and new per-size map)
    let stockPerSize = {};
    const sizes = (p.sizes || []);
    if (p.stock && typeof p.stock === "object") {
      stockPerSize = { ...p.stock };
      // Ensure all current sizes have an entry
      sizes.forEach(s => { if (stockPerSize[s] === undefined) stockPerSize[s] = 0; });
    } else {
      const flatStock = Number(p.stock) || 10;
      sizes.forEach(s => { stockPerSize[s] = flatStock; });
    }
    setForm({ name: p.name, price: String(p.price), mrp: String(p.mrp || ""), category: p.category || catNames[0], description: p.description || "", imageList: padded, sizes: sizesStr, badge: p.badge || "", stockPerSize });
    setStep(1);
    setModal(true);
  }

  async function saveProduct() {
    if (!form.name || !form.price) return toast.error("Product name and price are required!");
    if (!form.imageList.some(u => u.trim())) return toast.error("Add at least one image URL!");
    setSaving(true);
    const parsedSizes = form.sizes.split(",").map(s => s.trim()).filter(Boolean);
    // Build per-size stock object — only keep entries for current sizes
    const stockObj = {};
    parsedSizes.forEach(s => { stockObj[s] = Number(form.stockPerSize?.[s]) || 0; });
    const data = {
      name: form.name, price: Number(form.price),
      mrp: form.mrp ? Number(form.mrp) : null,
      category: form.category,
      description: form.description,
      images: form.imageList.filter(u => u.trim()),
      sizes: parsedSizes,
      badge: form.badge || null,
      stock: stockObj,
      updatedAt: serverTimestamp()
    };
    try {
      if (editing) { await updateDoc(doc(db, "products", editing.id), data); toast.success("✅ Product updated!"); }
      else { await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() }); toast.success("🔥 Product added!"); }
      setModal(false); setEditing(null);
      setForm({ ...EMPTY_FORM, category: catNames[0] || "Mens", stockPerSize: {} });
      fetchProducts();
    } catch (e) { toast.error("Failed to save"); }
    setSaving(false);
  }

  async function deleteProduct(id) {
    if (!window.confirm("Delete this product?")) return;
    await deleteDoc(doc(db, "products", id));
    toast.success("Deleted!"); fetchProducts();
  }

  const filledImages = form.imageList.filter(u => u.trim());
  const steps = ["Basic Info", "Category", "Images"];

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 1 }}>PRODUCTS ({products.length})</h1>
        <button onClick={openNew} className="btn btn-primary"><Plus size={14} /> Add Product</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Category / Sub</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" style={{ width: 40, height: 50, borderRadius: 6, objectFit: "cover", background: "var(--ink3)", flexShrink: 0 }} onError={e => { e.target.style.display = "none"; }} />
                    ) : (
                      <div style={{ width: 40, height: 50, borderRadius: 6, background: "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Image size={14} color="var(--muted)" /></div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                      {p.badge && <span className="badge badge-neon" style={{ fontSize: 9, padding: "2px 6px" }}>{p.badge}</span>}
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge badge-gray">{p.category}</span>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{p.category}</div>
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: "var(--accent)" }}>₹{p.price}</span>
                  {p.mrp && p.mrp > p.price && <div style={{ fontSize: 11, color: "var(--muted)", textDecoration: "line-through" }}>₹{p.mrp}</div>}
                </td>
                <td>
                  {/* Stock summary per size */}
                  {p.stock && typeof p.stock === "object" ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {Object.entries(p.stock).map(([sz, qty]) => {
                        const isOut = qty === 0;
                        const isLow = qty > 0 && qty <= 3;
                        return (
                          <span key={sz} style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5, border: `1px solid ${isOut ? "#f87171" : isLow ? "#fbbf24" : "var(--border)"}`, color: isOut ? "#f87171" : isLow ? "#fbbf24" : "var(--muted)", background: isOut ? "rgba(248,113,113,0.08)" : isLow ? "rgba(251,191,36,0.08)" : "transparent" }}>
                            {sz}:{qty}{isOut ? " Gone" : isLow ? " Low" : ""}
                          </span>
                        );
                      })}
                      {Object.values(p.stock).every(q => q === 0) && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid #f87171", borderRadius: 5, padding: "2px 7px" }}>OUT OF STOCK</span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{typeof p.stock === "number" ? p.stock : "—"}</span>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setRestockModal(p); setRestockData(p.stock && typeof p.stock === "object" ? { ...p.stock } : {}); }} className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 11 }} title="Quick Restock"><RefreshCw size={13} /></button>
                    <button onClick={() => openEdit(p)} className="btn btn-ghost" style={{ padding: "6px 10px" }}><Edit size={13} /></button>
                    <button onClick={() => deleteProduct(p.id)} className="btn btn-danger" style={{ padding: "6px 10px" }}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>No products yet. Click <strong>Add Product</strong> to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── RESTOCK MODAL ── */}
      {restockModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRestockModal(null)}>
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 18 }}>⚡ Quick Restock</h3>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{restockModal.name}</div>
              </div>
              <button onClick={() => setRestockModal(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
              {(restockModal.sizes || []).map(size => {
                const cur = restockData[size] ?? (restockModal.stock?.[size] ?? 0);
                const isOut = cur === 0;
                const isLow = cur > 0 && cur <= 3;
                return (
                  <div key={size} style={{ flex: "1 1 80px", background: "var(--ink3)", borderRadius: 10, padding: "10px 12px", border: `1.5px solid ${isOut ? "#f87171" : isLow ? "#fbbf24" : "var(--border)"}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isOut ? "#f87171" : isLow ? "#fbbf24" : "var(--muted)", letterSpacing: 1, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                      {size}
                      {isOut && <span style={{ fontSize: 9 }}>GONE</span>}
                      {isLow && !isOut && <span style={{ fontSize: 9 }}>LOW</span>}
                    </div>
                    <input
                      type="number" min="0"
                      value={restockData[size] ?? cur}
                      onChange={e => setRestockData(d => ({ ...d, [size]: Number(e.target.value) }))}
                      style={{ width: "100%", textAlign: "center", padding: "7px 4px", borderRadius: 7, border: "1.5px solid var(--border2)", background: "var(--ink2)", color: "var(--light)", fontSize: 18, fontWeight: 700 }}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={async () => {
                setRestockSaving(true);
                try {
                  await updateDoc(doc(db, "products", restockModal.id), { stock: restockData, updatedAt: serverTimestamp() });
                  toast.success("Stock updated! ✅");
                  setRestockModal(null);
                  fetchProducts();
                } catch (e) { toast.error("Failed to update stock"); }
                setRestockSaving(false);
              }} className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={restockSaving}>
                <Save size={14} /> {restockSaving ? "Saving..." : "Save Stock"}
              </button>
              <button onClick={() => setRestockModal(null)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box" style={{ maxWidth: 520 }}>
            {/* Header */}
            <div className="flex-between" style={{ marginBottom: 20 }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 18 }}>{editing ? "✏️ Edit Product" : "➕ Add New Product"}</h3>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Step {step} of 3 — {steps[step - 1]}</div>
              </div>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={18} /></button>
            </div>

            {/* Progress bar */}
            <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
              {steps.map((s, i) => (
                <div key={i} onClick={() => i + 1 < step && setStep(i + 1)}
                  style={{ flex: 1, height: 4, borderRadius: 2, background: i + 1 <= step ? "var(--accent)" : "var(--border)", cursor: i + 1 < step ? "pointer" : "default", transition: "background 0.3s" }} />
              ))}
            </div>

            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
                    <label className="label">Product Name *</label>
                    <input type="text" value={form.name} onChange={set("name")} placeholder="e.g. Oversized Drop Tee" className="input" autoFocus />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="label">Selling Price (₹) *</label>
                    <input type="number" value={form.price} onChange={set("price")} placeholder="799" className="input" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="label">MRP (for strikethrough)</label>
                    <input type="number" value={form.mrp} onChange={set("mrp")} placeholder="999" className="input" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
                    <label className="label">Stock Per Size (enter qty for each size listed above)</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                      {form.sizes.split(",").map(s => s.trim()).filter(Boolean).map(size => (
                        <div key={size} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 56 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: 1 }}>{size}</span>
                          <input
                            type="number"
                            min="0"
                            value={form.stockPerSize?.[size] ?? 0}
                            onChange={e => setForm(f => ({ ...f, stockPerSize: { ...f.stockPerSize, [size]: Number(e.target.value) } }))}
                            style={{ width: 56, textAlign: "center", padding: "6px 4px", borderRadius: 7, border: "1.5px solid var(--border)", background: "var(--ink3)", color: "var(--light)", fontSize: 13, fontWeight: 600 }}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>💡 Update the sizes field above first, then stock fields will update automatically</div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="label">Badge</label>
                    <select value={form.badge} onChange={set("badge")} className="input">
                      <option value="">No Badge</option>
                      <option value="NEW">🟢 NEW</option>
                      <option value="HOT">🔴 HOT</option>
                      <option value="SALE">🟡 SALE</option>
                      <option value="LIMITED">🟣 LIMITED</option>
                      <option value="BESTSELLER">⭐ BESTSELLER</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
                    <label className="label">Sizes <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 11 }}>(comma separated)</span></label>
                    <input type="text" value={form.sizes} onChange={set("sizes")} placeholder="XS,S,M,L,XL,XXL" className="input" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
                    <label className="label">Description</label>
                    <textarea value={form.description} onChange={set("description")} className="input" rows={3} placeholder="Describe the fit, fabric, vibe..." />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <button onClick={() => { if (!form.name || !form.price) return toast.error("Name and price required!"); setStep(2); }} className="btn btn-primary">
                    Next: Category →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Category */}
            {step === 2 && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <label className="label" style={{ fontSize: 13, marginBottom: 10, display: "block" }}>Select Category *</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {catNames.map(c => (
                      <button key={c} type="button"
                        onClick={() => setForm(f => ({ ...f, category: c }))}
                        style={{ padding: "11px 24px", borderRadius: 10, border: `2px solid ${form.category === c ? "var(--accent)" : "var(--border)"}`, background: form.category === c ? "rgba(232,197,71,0.12)" : "var(--ink3)", color: form.category === c ? "var(--accent)" : "var(--light)", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.15s" }}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ background: "rgba(232,197,71,0.06)", borderRadius: 10, padding: "12px 14px", fontSize: 13, marginBottom: 20 }}>
                  📁 <strong style={{ color: "var(--accent)" }}>{form.category}</strong>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                  <button onClick={() => setStep(1)} className="btn btn-secondary">← Back</button>
                  <button onClick={() => setStep(3)} className="btn btn-primary">Next: Images →</button>
                </div>
              </div>
            )}

            {/* STEP 3: Images */}
            {step === 3 && (
              <div>
                <div style={{ background: "rgba(232,197,71,0.06)", border: "1px solid rgba(232,197,71,0.15)", borderRadius: 10, padding: "12px 14px", fontSize: 13, marginBottom: 16 }}>
                  <strong style={{ color: "var(--accent)" }}>📸 How to add images:</strong>
                  <div style={{ color: "var(--muted)", marginTop: 6, lineHeight: 1.7 }}>
                    Upload photo to <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>imgbb.com</a> → copy <strong style={{ color: "var(--light)" }}>Direct Link</strong> → paste below.<br />
                    Add 2–3 angles so users can swipe through them on the product page.
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {form.imageList.map((url, i) => (
                    <div key={i} style={{ background: "var(--ink3)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: url.trim() ? "var(--accent)" : "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: url.trim() ? "var(--ink)" : "var(--muted)", flexShrink: 0 }}>{i + 1}</div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {i === 0 ? "Main Photo" : `Photo ${i + 1}`}
                          {i === 0 && <span style={{ color: "var(--orange)", marginLeft: 4 }}>*</span>}
                          {i > 0 && <span style={{ color: "var(--muted)", fontWeight: 400, marginLeft: 6, fontSize: 11 }}>(optional)</span>}
                        </span>
                      </div>
                      <input
                        type="text" value={url}
                        onChange={e => { const next = [...form.imageList]; next[i] = e.target.value; setForm(prev => ({ ...prev, imageList: next })); }}
                        placeholder={i === 0 ? "https://i.ibb.co/... (required)" : "https://i.ibb.co/... (different angle)"}
                        className="input" style={{ fontSize: 12, marginBottom: url.trim() ? 10 : 0 }}
                      />
                      {url.trim() && (
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <div style={{ width: 60, height: 76, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
                            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.parentElement.style.opacity = "0.3"; }} />
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", paddingTop: 2, lineHeight: 1.6 }}>
                            {i === 0 ? "Main image shown in shop grid." : "Users swipe to see this image."}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {filledImages.length > 0 && (
                  <div style={{ marginTop: 12, background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
                    ✅ <strong style={{ color: "#4ade80" }}>{filledImages.length} image{filledImages.length > 1 ? "s" : ""}</strong> ready — users can swipe all of them.
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 18 }}>
                  <button onClick={() => setStep(2)} className="btn btn-secondary">← Back</button>
                  <button onClick={saveProduct} className="btn btn-primary" disabled={saving} style={{ minWidth: 140, justifyContent: "center" }}>
                    <Save size={14} /> {saving ? "Saving..." : editing ? "Save Changes" : "Add Product 🔥"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- CATEGORIES ----
function AdminCategories() {
  const [cats, setCats] = useState([]);
  const [name, setName] = useState("");
  const [editingCat, setEditingCat] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", image: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCats(); }, []);

  async function fetchCats() {
    const snap = await getDocs(collection(db, "categories"));
    if (snap.empty) {
      for (const n of ["Mens", "Womens", "Unisex"]) await addDoc(collection(db, "categories"), { name: n, image: "", createdAt: serverTimestamp() });
      fetchCats(); return;
    }
    setCats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function addCat(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await addDoc(collection(db, "categories"), { name: name.trim(), image: "", createdAt: serverTimestamp() });
    setName(""); fetchCats(); toast.success("Category added!");
  }

  async function deleteCat(id) {
    if (!window.confirm("Delete this category?")) return;
    await deleteDoc(doc(db, "categories", id)); fetchCats(); toast.success("Removed!");
  }

  function openEdit(cat) {
    setEditingCat(cat.id);
    setEditForm({ name: cat.name, image: cat.image || "" });
  }

  async function saveCat() {
    setSaving(true);
    try {
      await updateDoc(doc(db, "categories", editingCat), { name: editForm.name, image: editForm.image, updatedAt: serverTimestamp() });
      toast.success("Category updated!");
      setEditingCat(null);
      fetchCats();
    } catch (e) { toast.error("Failed to save"); }
    setSaving(false);
  }

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 1, marginBottom: 8 }}>CATEGORIES</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Manage your product categories. Assign products to categories in the Products section.</p>
      <form onSubmit={addCat} style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="New category name (e.g. Mens)..." className="input" style={{ maxWidth: 300 }} />
        <button type="submit" className="btn btn-primary"><Plus size={14} /> Add Category</button>
      </form>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {cats.map(c => (
          <div key={c.id} className="card" style={{ padding: "16px 18px" }}>
            {editingCat === c.id ? (
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--accent)", letterSpacing: 2, marginBottom: 16 }}>EDIT: {c.name}</div>
                <div className="form-group">
                  <label className="label">Category Name</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} className="input" />
                </div>
                <div className="form-group">
                  <label className="label">Thumbnail Image URL</label>
                  <input type="text" value={editForm.image} onChange={e => setEditForm(f => ({...f, image: e.target.value}))} className="input" placeholder="https://i.ibb.co/... or any image URL" />
                  {editForm.image && (
                    <img src={editForm.image} alt="" style={{ width: 80, height: 100, borderRadius: 8, objectFit: "cover", marginTop: 8, background: "var(--ink3)" }} onError={e => e.target.style.display="none"} />
                  )}
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>💡 Upload to imgbb.com → Copy Direct Link → Paste here</div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={saveCat} className="btn btn-primary" disabled={saving}><Save size={13} /> {saving ? "Saving..." : "Save Changes"}</button>
                  <button onClick={() => setEditingCat(null)} className="btn btn-secondary">Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {c.image ? (
                  <img src={c.image} alt={c.name} style={{ width: 50, height: 64, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "var(--ink3)" }} onError={e => e.target.style.display="none"} />
                ) : (
                  <div style={{ width: 50, height: 64, borderRadius: 8, background: "var(--ink3)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Image size={18} color="var(--muted)" />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{c.name}</div>

                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEdit(c)} className="btn btn-ghost" style={{ padding: "6px 10px" }}><Edit size={13} /></button>
                  <button onClick={() => deleteCat(c.id)} className="btn btn-danger" style={{ padding: "6px 10px" }}><Trash2 size={13} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, background: "rgba(212,255,0,0.05)", border: "1px solid rgba(212,255,0,0.15)", borderRadius: 10, padding: "12px 16px", fontSize: 13 }}>
        <strong style={{ color: "var(--accent)" }}>💡 How sub-categories work:</strong>
        <div style={{ color: "var(--muted)", marginTop: 6, lineHeight: 1.7 }}>
          Sub-categories (e.g. "Summer Collection", "Oversized Fit") appear as filter chips in the Shop page under each main category. Products with a matching badge or category name will be filtered accordingly.
        </div>
      </div>
    </div>
  );
}

// ---- ORDERS ----
function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    })();
  }, []);

  const filtered = filter === "all" ? orders
    : filter === "razorpay_pending" ? orders.filter(o => o.paymentStatus === "pending_razorpay")
    : filter === "payment" ? orders.filter(o => o.paymentStatus === "pending_verification")
    : orders.filter(o => o.status === filter);

  // Group orders by date for day-wise view
  const groupedByDay = React.useMemo(() => {
    const groups = {};
    filtered.forEach(order => {
      const d = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date();
      const key = d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(order);
    });
    return groups;
  }, [filtered]);

  async function exportOrdersPDF() {
    setExportingPdf(true);
    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      let y = 15;
      // Header
      pdf.setFillColor(26, 26, 26);
      pdf.rect(0, 0, pw, 22, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(232, 197, 71);
      pdf.text("FITRO", 14, 14);
      pdf.setFontSize(9);
      pdf.setTextColor(180, 180, 180);
      const filterLabel = filter === "all" ? "All Orders" : filter.charAt(0).toUpperCase() + filter.slice(1);
      pdf.text(`Orders Export — ${filterLabel} (${filtered.length} orders)`, 40, 14);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Generated: ${new Date().toLocaleString("en-IN")}`, pw - 14, 14, { align: "right" });
      y = 32;

      const groups = Object.entries(groupedByDay);
      for (const [dateLabel, dayOrders] of groups) {
        if (y > 260) { pdf.addPage(); y = 15; }
        pdf.setFillColor(35, 35, 35);
        pdf.roundedRect(10, y - 5, pw - 20, 12, 2, 2, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(232, 197, 71);
        pdf.text(dateLabel, 14, y + 3);
        const dayTotal = dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
        pdf.setTextColor(74, 222, 128);
        pdf.text(`${dayOrders.length} orders  Rs.${dayTotal}`, pw - 14, y + 3, { align: "right" });
        y += 14;

        for (const order of dayOrders) {
          if (y > 265) { pdf.addPage(); y = 15; }
          pdf.setFillColor(30, 30, 30);
          pdf.roundedRect(12, y - 3, pw - 24, 32, 2, 2, "F");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.setTextColor(160, 160, 160);
          pdf.text(`#${order.id.slice(0, 8).toUpperCase()}`, 16, y + 2);
          pdf.setTextColor(245, 244, 240);
          pdf.setFontSize(9);
          pdf.text(order.userName || "—", 40, y + 2);
          const sc = order.status === "delivered" ? [74,222,128] : order.status === "cancelled" ? [248,113,113] : order.status === "shipped" ? [167,139,250] : [251,191,36];
          pdf.setTextColor(...sc);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.text((order.status || "").toUpperCase(), pw - 16, y + 2, { align: "right" });
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(140, 140, 140);
          pdf.setFontSize(7.5);
          pdf.text(`${order.userPhone || ""}  .  ${order.userEmail || ""}`, 16, y + 9);
          pdf.text(`${order.shippingAddress?.address || ""}, ${order.shippingAddress?.city || ""} ${order.shippingAddress?.pincode || ""}`, 16, y + 15);
          const itemStr = (order.items || []).map(i => `${i.name} (${i.size}) x${i.qty}`).join("  |  ");
          pdf.setTextColor(200, 200, 200);
          pdf.setFontSize(7);
          const lines = pdf.splitTextToSize(itemStr, pw - 36);
          pdf.text(lines.slice(0,2), 16, y + 21);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(232, 197, 71);
          pdf.text(`Rs.${order.total}`, pw - 16, y + 15, { align: "right" });
          pdf.setTextColor(120, 120, 120);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
          pdf.text((order.paymentMethod || "").toUpperCase(), pw - 16, y + 21, { align: "right" });
          y += 37;
        }
        y += 4;
      }

      if (y > 250) { pdf.addPage(); y = 15; }
      pdf.setDrawColor(60, 60, 60);
      pdf.line(10, y, pw - 10, y);
      y += 8;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(232, 197, 71);
      pdf.text("SUMMARY", 14, y);
      y += 7;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(200, 200, 200);
      const grandTotal = filtered.reduce((s, o) => s + (Number(o.total) || 0), 0);
      ["pending","confirmed","shipped","delivered","cancelled"].forEach(st => {
        const cnt = filtered.filter(o => o.status === st).length;
        if (cnt > 0) { pdf.text(`${st.charAt(0).toUpperCase()+st.slice(1)}: ${cnt}`, 14, y); y += 6; }
      });
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(74, 222, 128);
      pdf.setFontSize(10);
      pdf.text(`Grand Total: Rs.${grandTotal}`, 14, y + 2);
      pdf.save(`fitro-orders-${filter}-${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success("Orders PDF exported! 📄");
    } catch (e) { console.error(e); toast.error("PDF export failed"); }
    setExportingPdf(false);
  }

  async function updateStatus(orderId, status) {
    const updates = { status, updatedAt: serverTimestamp() };
    if (status === "delivered") { updates.deliveredAt = serverTimestamp(); }
    await updateDoc(doc(db, "orders", orderId), updates);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    toast.success(`Status → ${status}`);
  }

  async function verifyPayment(orderId) {
    await updateDoc(doc(db, "orders", orderId), { paymentStatus: "verified", status: "confirmed", updatedAt: serverTimestamp() });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: "verified", status: "confirmed" } : o));
    toast.success("✅ Payment verified! Order confirmed.");
  }

  async function addTracking(orderId) {
    const trackingId = prompt("Enter Tracking ID / AWB Number:\n\n(This is the courier tracking number given by the delivery company — e.g. Delhivery, BlueDart. The user will see this number to track their shipment.)");
    if (!trackingId) return;
    await updateDoc(doc(db, "orders", orderId), { trackingId, status: "shipped", updatedAt: serverTimestamp() });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, trackingId, status: "shipped" } : o));
    toast.success("Tracking added & marked shipped!");
  }

  async function setDeliveryDate(orderId) {
    const days = prompt("Estimated delivery days (e.g. 5 for 5 days from today):");
    if (!days || isNaN(days)) return;
    const date = new Date();
    date.setDate(date.getDate() + Number(days));
    const dateStr = date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    await updateDoc(doc(db, "orders", orderId), { estimatedDelivery: dateStr, updatedAt: serverTimestamp() });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, estimatedDelivery: dateStr } : o));
    toast.success(`✅ Delivery date set: ${dateStr} — User will see this!`);
  }

  function generateAndSendBill(order) {
    // Open the premium HTML bill (auto-prints / save as PDF)
    openPremiumBill(order);
    // Also open WhatsApp after a short delay
    const date = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date();
    const dateStr = date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const payVia = order.paymentMethod === "razorpay"
      ? `Razorpay — ID: ${order.razorpayPaymentId || "N/A"}`
      : order.paymentMethod === "cod" ? "Cash on Delivery (COD)"
      : order.paymentMethod === "upi" ? `UPI — UTR: ${order.utrNumber || "N/A"}`
      : order.paymentMethod?.toUpperCase() || "N/A";
    const shortMsg = `Hi ${order.userName}! 👋\n\nYour *FITRO* order bill is attached! 🧾\nOrder: *#${order.id?.slice(0,10).toUpperCase()}*\nAmount: *₹${order.total}*\nDate: ${dateStr}\nPayment: ${payVia}\n\nThank you for shopping with FITRO! 🔥\nfitrostore1@gmail.com`;
    const phone = (order.userPhone || "").replace(/\D/g, "");
    const waPhone = phone.length === 10 ? "91" + phone : phone;
    setTimeout(() => window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(shortMsg)}`, "_blank"), 900);
  }


  const sendWhatsAppBill = generateAndSendBill;

  function generatePDFBill(order) { openPremiumBill(order); }

  function openPremiumBill(order) {
    const date = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date();
    const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const orderId = order.id?.slice(0, 10).toUpperCase();
    const addr = order.address || order.shippingAddress || {};
    const shipping = order.shipping || 0;
    const subtotal = order.subtotal || order.total || 0;
    const discount = order.discount || 0;
    const platformFee = order.platformFee || 0;
    const payVia = order.paymentMethod === "razorpay"
      ? `Razorpay (Online)${order.razorpayPaymentId ? " · " + order.razorpayPaymentId : ""}`
      : order.paymentMethod === "cod" ? "Cash on Delivery (COD)"
      : order.paymentMethod === "upi" ? `UPI · UTR: ${order.utrNumber || "N/A"}`
      : order.paymentMethod?.toUpperCase() || "N/A";
    const statusColor = order.status === "delivered" ? "#16a34a" : order.status === "cancelled" ? "#dc2626" : "#d97706";
    const itemRows = (order.items || []).map((item, i) => `
      <tr>
        <td class="tc">${i + 1}</td>
        <td>
          <span class="iname">${item.name}</span>
          <span class="isub">Size: ${item.size}</span>
        </td>
        <td class="tc">${item.qty}</td>
        <td class="tr">₹${item.price.toLocaleString("en-IN")}</td>
        <td class="tr bold">₹${(item.price * item.qty).toLocaleString("en-IN")}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>FITRO Bill — #${orderId}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Inter',Arial,sans-serif;background:#f0f0f0;padding:30px 16px;color:#1a1a1a;}
    .wrap{max-width:700px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12);}
    /* HEADER */
    .hdr{background:#111;padding:28px 36px;display:flex;align-items:center;justify-content:space-between;}
    .brand{display:flex;align-items:center;gap:14px;}
    .brand-text .name{color:#e8c547;font-size:30px;font-weight:900;letter-spacing:6px;line-height:1;}
    .brand-text .sub{color:#666;font-size:9px;letter-spacing:3px;margin-top:3px;}
    .hdr-right{text-align:right;}
    .hdr-right .title{color:#e8c547;font-size:16px;font-weight:800;letter-spacing:2px;}
    .hdr-right .oid{color:#999;font-size:13px;margin-top:5px;font-weight:600;}
    .hdr-right .dt{color:#666;font-size:11px;margin-top:3px;}
    /* STATUS BAR */
    .sbar{background:#e8c547;padding:10px 36px;display:flex;justify-content:space-between;align-items:center;}
    .sbar .slabel{font-size:11px;font-weight:700;color:#111;letter-spacing:1.5px;}
    .sbar .sval{font-size:12px;font-weight:700;color:${statusColor};background:#fff;padding:3px 12px;border-radius:20px;}
    .sbar .stime{font-size:11px;color:#555;font-weight:600;}
    /* BODY */
    .body{padding:30px 36px;}
    /* TWO COL */
    .twocol{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;}
    .box{background:#f8f8f8;border-radius:12px;padding:18px 20px;}
    .box-label{font-size:9px;font-weight:700;color:#aaa;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;}
    .cname{font-size:16px;font-weight:800;color:#111;margin-bottom:6px;}
    .cinfo{font-size:12px;color:#555;margin-bottom:3px;display:flex;align-items:center;gap:6px;}
    .addr-line{font-size:12px;color:#444;line-height:1.8;}
    .pin{font-weight:700;color:#111;}
    /* ITEMS TABLE */
    .sec-label{font-size:9px;font-weight:700;color:#aaa;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;}
    table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid #eee;border-radius:12px;overflow:hidden;margin-bottom:24px;}
    thead tr{background:#111;}
    thead th{padding:11px 12px;font-size:10px;font-weight:700;color:#e8c547;letter-spacing:1.5px;text-transform:uppercase;}
    thead th:first-child{border-radius:0;}
    tbody tr{border-bottom:1px solid #f0f0f0;}
    tbody tr:last-child td{border-bottom:none;}
    tbody tr:nth-child(even) td{background:#fafafa;}
    td{padding:13px 12px;vertical-align:middle;}
    .tc{text-align:center;}
    .tr{text-align:right;}
    .iname{display:block;font-size:13px;font-weight:700;color:#111;}
    .isub{display:block;font-size:11px;color:#888;margin-top:2px;}
    .bold{font-weight:700;}
    /* BILL SUMMARY */
    .summary{background:#f8f8f8;border-radius:12px;overflow:hidden;margin-bottom:24px;}
    .sum-row{display:flex;justify-content:space-between;align-items:center;padding:11px 20px;border-bottom:1px solid #eee;}
    .sum-row:last-child{border-bottom:none;}
    .sum-label{font-size:13px;color:#555;}
    .sum-val{font-size:13px;font-weight:600;color:#111;}
    .sum-free{color:#16a34a;font-weight:700;}
    .sum-disc{color:#16a34a;font-weight:700;}
    .sum-total{background:#111;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;}
    .sum-total .tl{font-size:13px;font-weight:700;color:#e8c547;letter-spacing:1px;text-transform:uppercase;}
    .sum-total .tv{font-size:22px;font-weight:900;color:#e8c547;}
    /* PAYMENT */
    .pay-row{display:flex;justify-content:space-between;align-items:center;border:1px solid #eee;border-radius:12px;padding:16px 20px;margin-bottom:24px;}
    .pay-left .pl{font-size:9px;color:#aaa;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;}
    .pay-left .pv{font-size:13px;font-weight:700;color:#111;}
    .paid-badge{background:#111;color:#e8c547;font-size:11px;font-weight:800;padding:7px 18px;border-radius:20px;letter-spacing:1px;}
    /* FOOTER */
    .footer{border-top:2px dashed #eee;padding-top:22px;text-align:center;}
    .footer .ty{font-size:15px;font-weight:700;color:#111;margin-bottom:5px;}
    .footer .fc{font-size:12px;color:#999;margin-bottom:4px;}
    .footer .fi{font-size:10px;color:#ccc;margin-top:8px;}
    /* PRINT */
    .no-print{text-align:center;margin-top:24px;}
    .pbtn{background:#111;color:#e8c547;border:none;padding:13px 36px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:1px;}
    .phint{font-size:11px;color:#999;margin-top:8px;}
    @media print{
      body{background:#fff;padding:0;}
      .wrap{box-shadow:none;border-radius:0;max-width:100%;}
      .no-print{display:none!important;}
    }
  </style>
</head>
<body>
<div class="wrap">

  <!-- HEADER -->
  <div class="hdr">
    <div class="brand">
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 5L14 3L4 11L9 16L13 13.5V39H31V13.5L35 16L40 11L30 3L22 5Z" stroke="#e8c547" stroke-width="2" stroke-linejoin="round" fill="none"/>
        <path d="M18 10Q20 13 22 14Q24 13 26 10" stroke="#e8c547" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        <text x="22" y="30" text-anchor="middle" font-size="8" font-weight="900" fill="#e8c547" font-family="Arial">FIT</text>
      </svg>
      <div class="brand-text">
        <div class="name">FITRO</div>
        <div class="sub">STREETWEAR</div>
      </div>
    </div>
    <div class="hdr-right">
      <div class="title">ORDER BILL</div>
      <div class="oid">#${orderId}</div>
      <div class="dt">${dateStr} · ${timeStr}</div>
    </div>
  </div>

  <!-- STATUS BAR -->
  <div class="sbar">
    <span class="slabel">ORDER STATUS</span>
    <span class="sval">${(order.status || "delivered").toUpperCase()}</span>
    <span class="stime">📅 ${dateStr}</span>
  </div>

  <div class="body">

    <!-- CUSTOMER + ADDRESS -->
    <div class="twocol">
      <div class="box">
        <div class="box-label">Customer Details</div>
        <div class="cname">${order.userName || "—"}</div>
        <div class="cinfo">📱 ${order.userPhone || "—"}</div>
        ${order.userEmail ? `<div class="cinfo">✉️ ${order.userEmail}</div>` : ""}
      </div>
      <div class="box">
        <div class="box-label">Delivery Address</div>
        <div class="addr-line">
          ${addr.address || "—"}<br/>
          ${addr.city || ""}, ${addr.state || ""}<br/>
          <span class="pin">PIN: ${addr.pincode || "—"}</span>
        </div>
      </div>
    </div>

    <!-- ITEMS -->
    <div class="sec-label">Items Ordered</div>
    <table>
      <thead>
        <tr>
          <th class="tc" style="width:40px">#</th>
          <th style="text-align:left">Product</th>
          <th class="tc" style="width:50px">Qty</th>
          <th class="tr" style="width:80px">Price</th>
          <th class="tr" style="width:90px">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <!-- BILL SUMMARY -->
    <div class="sec-label">Bill Summary</div>
    <div class="summary">
      <div class="sum-row">
        <span class="sum-label">Subtotal</span>
        <span class="sum-val">₹${subtotal.toLocaleString("en-IN")}</span>
      </div>
      ${discount > 0 ? `<div class="sum-row">
        <span class="sum-label">🏷️ Coupon Discount <span style="font-size:11px;color:#888;">(${order.couponCode || ""})</span></span>
        <span class="sum-disc">− ₹${discount.toLocaleString("en-IN")}</span>
      </div>` : ""}
      <div class="sum-row">
        <span class="sum-label">🚚 Delivery Charges</span>
        <span class="${shipping === 0 ? "sum-free" : "sum-val"}">${shipping === 0 ? "FREE 🎉" : "₹" + shipping.toLocaleString("en-IN")}</span>
      </div>
      ${platformFee > 0 ? `<div class="sum-row">
        <span class="sum-label">⚙️ Platform Fee <span style="font-size:11px;color:#aaa;">(2%)</span></span>
        <span class="sum-val">₹${platformFee.toLocaleString("en-IN")}</span>
      </div>` : ""}
      <div class="sum-total">
        <span class="tl">Total Paid</span>
        <span class="tv">₹${(order.total || 0).toLocaleString("en-IN")}</span>
      </div>
    </div>

    <!-- PAYMENT -->
    <div class="pay-row">
      <div class="pay-left">
        <div class="pl">Payment Method</div>
        <div class="pv">${payVia}</div>
      </div>
      <div class="paid-badge">✓ PAID</div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <div class="ty">Thank you for shopping with FITRO! 🙏</div>
      <div class="fc">For queries: fitrostore1@gmail.com · fitro.in</div>
      <div class="fi">This is a computer-generated invoice. No signature required.</div>
    </div>

  </div>
</div>

<div class="no-print">
  <button class="pbtn" onclick="window.print()">📄 Save as PDF / Print</button>
  <div class="phint">In print dialog → set Destination to "Save as PDF"</div>
</div>
<script>setTimeout(()=>window.print(),900);</script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=780,height=960");
    if (win) { win.document.write(html); win.document.close(); }
    else toast.error("Popup blocked! Please allow popups for this site.");
  }

  if (loading) return <div className="flex-center" style={{ height: 200 }}><div className="spinner" /></div>;

  return (
    <div>
      {/* Fullscreen Image Lightbox */}
      {lightboxImage && (
        <div onClick={() => setLightboxImage(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <button onClick={() => setLightboxImage(null)} style={{ position: "absolute", top: 18, right: 22, background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", fontSize: 26, width: 44, height: 44, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>✕</button>
          <img src={lightboxImage} alt="Product" style={{ maxWidth: "92vw", maxHeight: "92vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 8px 48px rgba(0,0,0,0.7)" }} onClick={e => e.stopPropagation()} />
        </div>
      )}
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 1 }}>ORDERS ({filtered.length})</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", background: "var(--ink3)", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
            <button onClick={() => setViewMode("list")} style={{ padding: "7px 14px", background: viewMode === "list" ? "var(--accent)" : "transparent", color: viewMode === "list" ? "#111" : "var(--muted)", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>☰ List</button>
            <button onClick={() => setViewMode("daywise")} style={{ padding: "7px 14px", background: viewMode === "daywise" ? "var(--accent)" : "transparent", color: viewMode === "daywise" ? "#111" : "var(--muted)", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>📅 Day-wise</button>
          </div>
          <button onClick={exportOrdersPDF} disabled={exportingPdf} className="btn btn-primary" style={{ fontSize: 12, padding: "8px 14px" }}>
            <FileText size={13} /> {exportingPdf ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[["all","All"],["razorpay_pending","🟡 Razorpay Pending"],["pending","Pending"],["confirmed","Confirmed"],["shipped","Shipped"],["delivered","Delivered"],["cancelled","Cancelled"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`tag ${filter === v ? "active" : ""}`} style={{ fontSize: 12 }}>{l}</button>
        ))}
      </div>

      {/* DAY-WISE VIEW */}
      {viewMode === "daywise" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Object.entries(groupedByDay).map(([dateLabel, dayOrders]) => {
            const dayTotal = dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
            return (
              <div key={dateLabel}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(90deg, rgba(232,197,71,0.12), transparent)", border: "1px solid rgba(232,197,71,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>📅</span>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 1, color: "var(--accent)" }}>{dateLabel}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{dayOrders.length} order{dayOrders.length > 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 18, color: "#4ade80" }}>₹{dayTotal}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>day total</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {dayOrders.map(order => (
                    <div key={order.id} className="card" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>#{order.id.slice(0,8).toUpperCase()}</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{order.userName}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{order.userEmail} · 📱 {order.userPhone}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleString("en-IN") : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <span className={`badge badge-${order.status === "delivered" ? "green" : order.status === "cancelled" ? "pink" : order.status === "shipped" ? "purple" : "orange"}`}>{order.status}</span>
                <span className="badge badge-gray">{order.paymentMethod?.toUpperCase()}</span>
                {order.paymentMethod === "online" && <span className={`badge badge-${order.paymentStatus === "verified" ? "green" : "orange"}`}>{order.paymentStatus === "verified" ? "✅ Verified" : "⏳ Verify"}</span>}
                {order.paymentStatus === "pending_razorpay" && <span className="badge badge-orange">🟡 Razorpay Pending</span>}
                {order.cityIsAhmedabad && <span className="badge badge-gray">📍 AMD</span>}
              </div>
            </div>

            {/* Address */}
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
              📍 {order.shippingAddress?.address}, {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.pincode}
            </div>

            {/* UPI verification box */}
            {order.paymentMethod === "online" && order.paymentStatus !== "verified" && (
              <div style={{ background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                <div style={{ color: "var(--orange)", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>🔍 Payment Verification Required</div>
                <div style={{ fontSize: 13 }}>UPI ID: <strong>{order.upiId}</strong></div>
                <div style={{ fontSize: 13 }}>UTR: <strong style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{order.utrNumber}</strong></div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Amount: ₹{order.total}</div>
              </div>
            )}

            {/* Razorpay pending box */}
            {order.paymentStatus === "pending_razorpay" && (
              <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>🟡 Razorpay Payment — Pending Confirmation</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Payment was initiated via Razorpay but confirmation is awaited. Check your Razorpay dashboard to verify.</div>
                {order.razorpayPaymentId && <div style={{ fontSize: 12, marginTop: 4 }}>Payment ID: <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{order.razorpayPaymentId}</span></div>}
                <div style={{ fontSize: 12, marginTop: 4 }}>Amount: ₹{order.total}</div>
              </div>
            )}

            {/* Items preview */}
            {expanded === order.id && (
              <div style={{ background: "var(--ink3)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Order Items</div>
                {order.items?.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, background: "var(--ink2)", borderRadius: 8, padding: "8px 10px" }}>
                    {(item.image || item.images?.[0]) && (
                      <img src={item.image || item.images?.[0]} alt={item.name} onClick={() => setLightboxImage(item.image || item.images?.[0])} style={{ width: 44, height: 54, borderRadius: 6, objectFit: "cover", background: "var(--ink3)", flexShrink: 0, cursor: "zoom-in" }} onError={e => e.target.style.display = "none"} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Size: {item.size} · Qty: {item.qty}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: 13 }}>₹{item.price * item.qty}</div>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                    <span style={{ color: "var(--muted)" }}>Subtotal</span><span>₹{order.subtotal || order.total}</span>
                  </div>
                  {order.shipping > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                    <span style={{ color: "var(--muted)" }}>Shipping</span><span>₹{order.shipping}</span>
                  </div>}
                  {order.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                    <span style={{ color: "#4ade80" }}>Discount ({order.couponCode})</span><span style={{ color: "#4ade80" }}>-₹{order.discount}</span>
                  </div>}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14, marginTop: 4 }}>
                    <span>Total</span><span style={{ color: "var(--accent)" }}>₹{order.total}</span>
                  </div>
                </div>
                {order.estimatedDelivery && (
                  <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 10, background: "rgba(232,197,71,0.06)", padding: "6px 10px", borderRadius: 6 }}>
                    📅 Delivery date shown to user: <strong>{order.estimatedDelivery}</strong>
                  </div>
                )}
                {order.trackingId && (
                  <div style={{ fontSize: 12, marginTop: 6, color: "var(--muted)" }}>
                    🚚 Tracking ID: <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{order.trackingId}</span>
                  </div>
                )}
                {order.address && (
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                    📍 {order.address.address}, {order.address.city}, {order.address.state} — {order.address.pincode}
                  </div>
                )}
              </div>
            )}

            {/* ORDER VERIFICATION PANEL */}
            {expanded === order.id && (
              <OrderVerificationPanel order={order} onConfirmed={(updatedOrder) => {
                setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
              }} />
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 15 }}>₹{order.total}</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => setExpanded(expanded === order.id ? null : order.id)} className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>
                {expanded === order.id ? "Hide" : "Details"}
              </button>
              {order.paymentMethod === "online" && order.paymentStatus !== "verified" && (
                <button onClick={() => verifyPayment(order.id)} className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 12 }}>
                  <Check size={12} /> Verify Payment
                </button>
              )}
              {(order.status === "confirmed" || order.status === "pending") && !order.trackingId && (
                <button onClick={() => addTracking(order.id)} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }}>
                  <Truck size={12} /> Add Tracking
                </button>
              )}
              <button onClick={() => setDeliveryDate(order.id)} className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>📅 Set Delivery Date</button>
              {order.status === "delivered" && (
                <button onClick={() => generateAndSendBill(order)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, background: "#25D366", color: "white", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  📄💬 WhatsApp Bill
                </button>
              )}
              <select value={order.status} onChange={e => updateStatus(order.id, e.target.value)}
                style={{ background: "var(--ink3)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--light)", padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                {["pending","confirmed","shipped","delivered","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>No orders found</div>}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(order => (
            <div key={order.id} className="card" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>#{order.id.slice(0,8).toUpperCase()}</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{order.userName}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{order.userEmail} · 📱 {order.userPhone}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleString("en-IN") : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <span className={`badge badge-${order.status === "delivered" ? "green" : order.status === "cancelled" ? "pink" : order.status === "shipped" ? "purple" : "orange"}`}>{order.status}</span>
                <span className="badge badge-gray">{order.paymentMethod?.toUpperCase()}</span>
                {order.paymentMethod === "online" && <span className={`badge badge-${order.paymentStatus === "verified" ? "green" : "orange"}`}>{order.paymentStatus === "verified" ? "✅ Verified" : "⏳ Verify"}</span>}
                {order.paymentStatus === "pending_razorpay" && <span className="badge badge-orange">🟡 Razorpay Pending</span>}
                {order.cityIsAhmedabad && <span className="badge badge-gray">📍 AMD</span>}
              </div>
            </div>

            {/* Address */}
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
              📍 {order.shippingAddress?.address}, {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.pincode}
            </div>

            {/* UPI verification box */}
            {order.paymentMethod === "online" && order.paymentStatus !== "verified" && (
              <div style={{ background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                <div style={{ color: "var(--orange)", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>🔍 Payment Verification Required</div>
                <div style={{ fontSize: 13 }}>UPI ID: <strong>{order.upiId}</strong></div>
                <div style={{ fontSize: 13 }}>UTR: <strong style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{order.utrNumber}</strong></div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Amount: ₹{order.total}</div>
              </div>
            )}

            {/* Razorpay pending box */}
            {order.paymentStatus === "pending_razorpay" && (
              <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>🟡 Razorpay Payment — Pending Confirmation</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Payment was initiated via Razorpay but confirmation is awaited. Check your Razorpay dashboard to verify.</div>
                {order.razorpayPaymentId && <div style={{ fontSize: 12, marginTop: 4 }}>Payment ID: <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{order.razorpayPaymentId}</span></div>}
                <div style={{ fontSize: 12, marginTop: 4 }}>Amount: ₹{order.total}</div>
              </div>
            )}

            {/* Items preview */}
            {expanded === order.id && (
              <div style={{ background: "var(--ink3)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Order Items</div>
                {order.items?.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, background: "var(--ink2)", borderRadius: 8, padding: "8px 10px" }}>
                    {(item.image || item.images?.[0]) && (
                      <img src={item.image || item.images?.[0]} alt={item.name} onClick={() => setLightboxImage(item.image || item.images?.[0])} style={{ width: 44, height: 54, borderRadius: 6, objectFit: "cover", background: "var(--ink3)", flexShrink: 0, cursor: "zoom-in" }} onError={e => e.target.style.display = "none"} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Size: {item.size} · Qty: {item.qty}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: 13 }}>₹{item.price * item.qty}</div>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                    <span style={{ color: "var(--muted)" }}>Subtotal</span><span>₹{order.subtotal || order.total}</span>
                  </div>
                  {order.shipping > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                    <span style={{ color: "var(--muted)" }}>Shipping</span><span>₹{order.shipping}</span>
                  </div>}
                  {order.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                    <span style={{ color: "#4ade80" }}>Discount ({order.couponCode})</span><span style={{ color: "#4ade80" }}>-₹{order.discount}</span>
                  </div>}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14, marginTop: 4 }}>
                    <span>Total</span><span style={{ color: "var(--accent)" }}>₹{order.total}</span>
                  </div>
                </div>
                {order.estimatedDelivery && (
                  <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 10, background: "rgba(232,197,71,0.06)", padding: "6px 10px", borderRadius: 6 }}>
                    📅 Delivery date shown to user: <strong>{order.estimatedDelivery}</strong>
                  </div>
                )}
                {order.trackingId && (
                  <div style={{ fontSize: 12, marginTop: 6, color: "var(--muted)" }}>
                    🚚 Tracking ID: <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{order.trackingId}</span>
                  </div>
                )}
                {order.address && (
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                    📍 {order.address.address}, {order.address.city}, {order.address.state} — {order.address.pincode}
                  </div>
                )}
              </div>
            )}

            {/* ORDER VERIFICATION PANEL */}
            {expanded === order.id && (
              <OrderVerificationPanel order={order} onConfirmed={(updatedOrder) => {
                setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
              }} />
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 15 }}>₹{order.total}</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => setExpanded(expanded === order.id ? null : order.id)} className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>
                {expanded === order.id ? "Hide" : "Details"}
              </button>
              {order.paymentMethod === "online" && order.paymentStatus !== "verified" && (
                <button onClick={() => verifyPayment(order.id)} className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 12 }}>
                  <Check size={12} /> Verify Payment
                </button>
              )}
              {(order.status === "confirmed" || order.status === "pending") && !order.trackingId && (
                <button onClick={() => addTracking(order.id)} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }}>
                  <Truck size={12} /> Add Tracking
                </button>
              )}
              <button onClick={() => setDeliveryDate(order.id)} className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>📅 Set Delivery Date</button>
              {order.status === "delivered" && (
                <button onClick={() => generateAndSendBill(order)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, background: "#25D366", color: "white", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  📄💬 WhatsApp Bill
                </button>
              )}
              <select value={order.status} onChange={e => updateStatus(order.id, e.target.value)}
                style={{ background: "var(--ink3)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--light)", padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                {["pending","confirmed","shipped","delivered","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          ))}
          {filtered.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>No orders found</div>}
        </div>
      )}
    </div>
  );
}

// ---- ORDER VERIFICATION PANEL ----
function OrderVerificationPanel({ order, onConfirmed }) {
  const [itemStocks, setItemStocks] = useState({}); // productId+size -> current stock
  const [verified, setVerified] = useState({}); // itemKey -> boolean
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!order.items?.length) { setLoading(false); return; }
    (async () => {
      const stockMap = {};
      const unique = [...new Set(order.items.map(i => i.id || i.productId).filter(Boolean))];
      await Promise.all(unique.map(async pid => {
        try {
          const snap = await getDoc(doc(db, "products", pid));
          if (snap.exists()) stockMap[pid] = snap.data().stock || {};
        } catch (e) {}
      }));
      setItemStocks(stockMap);
      setLoading(false);
    })();
  }, [order.id]);

  const allVerified = order.items?.length > 0 && order.items.every((_, i) => verified[i]);

  async function handleConfirmPack() {
    setConfirming(true);
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "confirmed", warehouseVerified: true, updatedAt: serverTimestamp() });
      onConfirmed({ ...order, status: "confirmed", warehouseVerified: true });
      toast.success("✅ Order confirmed & ready to pack!");
    } catch (e) { toast.error("Failed to confirm"); }
    setConfirming(false);
  }

  if (!order.items?.length) return null;

  return (
    <div style={{ background: "rgba(232,197,71,0.04)", border: "1px solid rgba(232,197,71,0.2)", borderRadius: 12, padding: "14px 16px", margin: "10px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <ClipboardCheck size={16} color="var(--accent)" />
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--accent)", letterSpacing: 0.5 }}>WAREHOUSE VERIFICATION — Pick & Pack List</div>
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 20, color: "var(--muted)", fontSize: 13 }}>Loading stock data...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {order.items.map((item, idx) => {
            const pid = item.id || item.productId;
            const stockForProduct = itemStocks[pid] || {};
            const stockForSize = typeof stockForProduct === "object" ? (stockForProduct[item.size] ?? "—") : stockForProduct;
            const stockNum = typeof stockForSize === "number" ? stockForSize : null;
            const stockOk = stockNum === null || stockNum >= item.qty;
            const isVerified = verified[idx];
            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, background: isVerified ? "rgba(74,222,128,0.06)" : "var(--ink3)", border: `1.5px solid ${isVerified ? "rgba(74,222,128,0.3)" : "var(--border)"}`, borderRadius: 10, padding: "10px 14px", transition: "all 0.2s" }}>
                {(item.image || item.images?.[0]) && (
                  <img src={item.image || item.images?.[0]} alt={item.name} onClick={() => setLightboxImage(item.image || item.images?.[0])} style={{ width: 44, height: 54, borderRadius: 7, objectFit: "cover", flexShrink: 0, cursor: "zoom-in" }} onError={e => e.target.style.display = "none"} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Size: <strong style={{ color: "var(--accent)" }}>{item.size}</strong> · Qty: <strong style={{ color: "var(--light)" }}>×{item.qty}</strong></div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    Stock remaining: <strong style={{ color: stockOk ? "#4ade80" : "#f87171" }}>
                      {stockForSize === "—" ? "No data" : `${stockForSize} in stock`}
                    </strong>
                    {!stockOk && stockNum !== null && <span style={{ color: "#f87171", marginLeft: 6 }}>⚠️ Insufficient!</span>}
                  </div>
                </div>
                <button onClick={() => setVerified(v => ({ ...v, [idx]: !v[idx] }))}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `2px solid ${isVerified ? "#4ade80" : "var(--border)"}`, background: isVerified ? "rgba(74,222,128,0.15)" : "var(--ink2)", color: isVerified ? "#4ade80" : "var(--muted)", cursor: "pointer", fontWeight: 700, fontSize: 12, flexShrink: 0, transition: "all 0.2s" }}>
                  {isVerified ? <><Check size={13} /> Verified</> : "Mark Verified"}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {allVerified && (
        <div style={{ marginTop: 14 }}>
          <button onClick={handleConfirmPack} disabled={confirming} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "13px", fontSize: 14 }}>
            <Package size={16} /> {confirming ? "Confirming..." : "✅ Confirm & Pack — All Items Verified"}
          </button>
          <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 6 }}>This marks the order as confirmed and ready to ship</div>
        </div>
      )}
      {!allVerified && !loading && (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
          Verify {order.items?.filter((_, i) => !verified[i]).length} remaining item(s) above to unlock Confirm & Pack
        </div>
      )}
    </div>
  );
}

// ---- RETURNS ----
function AdminReturns() {
  const [returns, setReturns] = useState([]);
  const [pickupDate, setPickupDate] = useState({});
  const [pickupInfo, setPickupInfo] = useState({});
  const [adminNote, setAdminNote] = useState({});

  useEffect(() => {
    (async () => {
      const snap = await getDocs(query(collection(db, "orders"), where("status", "in", ["return_requested", "return_approved", "returned"])));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a,b) => (b.returnRequestedAt?.seconds||0)-(a.returnRequestedAt?.seconds||0));
      setReturns(data);
    })();
  }, []);

  function daysLeftForReturn(order) {
    const deliveredAt = order.deliveredAt?.seconds ? new Date(order.deliveredAt.seconds*1000) : null;
    if (!deliveredAt) return "N/A";
    const daysSince = (new Date()-deliveredAt)/(1000*60*60*24);
    const left = Math.max(0, Math.ceil(7-daysSince));
    return left;
  }

  function isExpired(order) {
    const deliveredAt = order.deliveredAt?.seconds ? new Date(order.deliveredAt.seconds*1000) : null;
    if (!deliveredAt) return false;
    return (new Date()-deliveredAt)/(1000*60*60*24) > 7;
  }

  async function processReturn(order, action) {
    const pd = pickupDate[order.id] || order.returnPickupDate || "";
    const pi = pickupInfo[order.id] || order.returnPickupInfo || "";
    const an = adminNote[order.id] || "";
    if (action === "approve" && !pd) { toast.error("Set pickup date before approving!"); return; }
    const status = action === "approve" ? "return_approved" : "delivered";
    const updates = { status, updatedAt: serverTimestamp(), adminReturnNote: an };
    if (action === "approve") { updates.returnPickupDate = pd; updates.returnPickupInfo = pi; }
    await updateDoc(doc(db, "orders", order.id), updates);
    setReturns(prev => prev.map(o => o.id === order.id ? { ...o, ...updates } : o));
    toast.success(action==="approve" ? "✅ Return approved! User will see pickup details." : "Return rejected — order status reset.");
  }

  async function markReturnReceived(orderId) {
    await updateDoc(doc(db, "orders", orderId), { status: "returned", returnReceivedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    setReturns(prev => prev.map(o => o.id === orderId ? { ...o, status: "returned" } : o));
    toast.success("✅ Return marked as received!");
  }

  return (
    <div>
      <h1 style={{fontFamily:"var(--font-display)",fontSize:32,letterSpacing:1,marginBottom:20}}>RETURNS ({returns.length})</h1>
      {returns.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px",color:"var(--muted)"}}>
          <div style={{fontSize:48,marginBottom:12}}>🎉</div><div>No return requests!</div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {returns.map(order => {
            const dLeft = daysLeftForReturn(order);
            const expired = isExpired(order);
            const reqDate = order.returnRequestedAt?.seconds ? new Date(order.returnRequestedAt.seconds*1000) : null;
            const delivDate = order.deliveredAt?.seconds ? new Date(order.deliveredAt.seconds*1000) : null;
            return (
              <div key={order.id} className="card" style={{borderLeft:`3px solid ${order.status==="returned"?"#9ca3af":"#fb923c"}`}}>
                <div className="flex-between" style={{marginBottom:12}}>
                  <div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--muted)"}}>#{order.id.slice(0,8).toUpperCase()}</div>
                    <div style={{fontWeight:700,fontSize:16}}>{order.userName}</div>
                    <div style={{fontSize:13,color:"var(--muted)"}}>{order.userEmail} · 📱 {order.userPhone}</div>
                  </div>
                  <span className={`badge badge-${order.status==="returned"?"gray":"orange"}`}>{order.status==="returned"?"✔️ Returned":"↩️ Pending Review"}</span>
                </div>

                {/* KEY INFO BOX */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
                  <div style={{background:"var(--ink3)",borderRadius:8,padding:"8px 12px"}}>
                    <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>Ordered On</div>
                    <div style={{fontSize:13,fontWeight:600}}>{order.createdAt?.seconds ? new Date(order.createdAt.seconds*1000).toLocaleDateString("en-IN") : "—"}</div>
                  </div>
                  <div style={{background:"var(--ink3)",borderRadius:8,padding:"8px 12px"}}>
                    <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>Delivered On</div>
                    <div style={{fontSize:13,fontWeight:600}}>{delivDate ? delivDate.toLocaleDateString("en-IN") : "Not marked"}</div>
                  </div>
                  <div style={{background:"var(--ink3)",borderRadius:8,padding:"8px 12px"}}>
                    <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>Return Requested</div>
                    <div style={{fontSize:13,fontWeight:600}}>{reqDate ? reqDate.toLocaleDateString("en-IN") : "—"}</div>
                  </div>
                  <div style={{background:expired?"rgba(248,113,113,0.1)":"rgba(74,222,128,0.08)",border:`1px solid ${expired?"rgba(248,113,113,0.3)":"rgba(74,222,128,0.2)"}`,borderRadius:8,padding:"8px 12px"}}>
                    <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>Return Window</div>
                    <div style={{fontSize:13,fontWeight:700,color:expired?"#f87171":"#4ade80"}}>
                      {expired ? "⚠️ EXPIRED" : `${dLeft} days left`}
                    </div>
                  </div>
                </div>

                <div style={{fontSize:13,color:"var(--muted)",marginBottom:8}}>
                  <strong style={{color:"var(--light)"}}>Items:</strong>
                  <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:8}}>
                    {order.items?.map((item,idx)=>(
                      <div key={idx} style={{display:"flex",alignItems:"center",gap:10,background:"var(--ink3)",borderRadius:10,padding:"8px 12px",minWidth:200}}>
                        {(item.image||item.images?.[0]) && (
                          <img src={item.image||item.images?.[0]} alt={item.name} style={{width:48,height:58,borderRadius:7,objectFit:"cover",flexShrink:0,background:"var(--ink2)"}} onError={e=>e.target.style.display="none"}/>
                        )}
                        <div>
                          <div style={{fontWeight:600,fontSize:13}}>{item.name}</div>
                          <div style={{fontSize:12,color:"var(--muted)"}}>Size: {item.size} · Qty: {item.qty}</div>
                          <div style={{fontSize:13,color:"var(--accent)",fontWeight:700}}>₹{item.price*item.qty}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:6,fontSize:13}}><strong style={{color:"var(--accent)"}}>Total: ₹{order.total}</strong></div>
                </div>
                {/* PICKUP ADDRESS BOX - prominent for delivery agent */}
                <div style={{background:"rgba(251,146,60,0.08)",border:"2px solid rgba(251,146,60,0.35)",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:"#fb923c",textTransform:"uppercase",marginBottom:6}}>📦 Pickup Address (for delivery agent)</div>
                  <div style={{fontSize:14,fontWeight:700,color:"var(--light)"}}>{order.address?.name || order.userName}</div>
                  <div style={{fontSize:13,color:"var(--light)",marginTop:2}}>📱 {order.address?.phone || order.userPhone}</div>
                  <div style={{fontSize:13,color:"var(--light2)",marginTop:4,lineHeight:1.6}}>
                    {order.address?.address || order.shippingAddress?.address}<br/>
                    {order.address?.city || order.shippingAddress?.city}, {order.address?.state || order.shippingAddress?.state}<br/>
                    <strong style={{color:"var(--accent)"}}>PIN: {order.address?.pincode || order.shippingAddress?.pincode}</strong>
                  </div>
                </div>
                {order.returnReason && (
                  <div style={{background:"rgba(251,146,60,0.08)",border:"1px solid rgba(251,146,60,0.2)",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:13}}>
                    <strong style={{color:"#fb923c"}}>Return Reason:</strong> <span style={{color:"var(--light)"}}>{order.returnReason}</span>
                  </div>
                )}

                {order.status==="return_requested" && (
                  <div style={{background:"var(--ink3)",borderRadius:12,padding:16,marginTop:8}}>
                    <div style={{fontWeight:700,marginBottom:12,fontSize:14}}>📋 Process Return</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                      <div>
                        <label className="label">Pickup Date *</label>
                        <input type="date" value={pickupDate[order.id]||""} onChange={e=>setPickupDate(p=>({...p,[order.id]:e.target.value}))} className="input"/>
                      </div>
                      <div>
                        <label className="label">Pickup Agent / Info</label>
                        <input type="text" value={pickupInfo[order.id]||""} onChange={e=>setPickupInfo(p=>({...p,[order.id]:e.target.value}))} placeholder="e.g. Delhivery pickup, call 24hr prior" className="input"/>
                      </div>
                    </div>
                    <div style={{marginBottom:12}}>
                      <label className="label">Note to Customer</label>
                      <input type="text" value={adminNote[order.id]||""} onChange={e=>setAdminNote(p=>({...p,[order.id]:e.target.value}))} placeholder="e.g. Keep product packed and ready" className="input"/>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>processReturn(order,"approve")} className="btn btn-primary" style={{padding:"8px 16px",fontSize:13}}>
                        <Check size={12}/> Approve & Set Pickup
                      </button>
                      <button onClick={()=>processReturn(order,"reject")} className="btn btn-danger" style={{padding:"8px 16px",fontSize:13}}>
                        <X size={12}/> Reject Return
                      </button>
                    </div>
                  </div>
                )}
                {order.status==="return_approved" && (
                  <div style={{background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:8,padding:"12px 14px",fontSize:13}}>
                    <div style={{fontWeight:700,color:"#4ade80",marginBottom:8}}>✅ Return Approved — Waiting for pickup</div>
                    <div>📅 Pickup Date: <strong style={{color:"var(--accent)"}}>{order.returnPickupDate}</strong></div>
                    {order.returnPickupInfo && <div style={{marginTop:4}}>🚚 Agent: {order.returnPickupInfo}</div>}
                    {order.adminReturnNote && <div style={{marginTop:4,color:"var(--muted)"}}>📝 Note: {order.adminReturnNote}</div>}
                    <button onClick={()=>markReturnReceived(order.id)} className="btn btn-primary" style={{marginTop:12,padding:"8px 16px",fontSize:13}}>
                      <Check size={12}/> Mark as Return Received
                    </button>
                    <div style={{fontSize:12,color:"var(--muted)",marginTop:6}}>Click above once you physically receive the returned item.</div>
                  </div>
                )}
                {order.status==="returned" && (
                  <div style={{background:"rgba(156,163,175,0.06)",border:"1px solid rgba(156,163,175,0.2)",borderRadius:8,padding:"8px 12px",fontSize:13}}>
                    ✔️ Return fully completed. Item received.
                    {order.returnPickupDate && <span style={{color:"var(--muted)"}}> · Pickup was: {order.returnPickupDate}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- SUPPORT ----
function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [reply, setReply] = useState({});
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const snap = await getDocs(query(collection(db, "support"), orderBy("createdAt", "desc")));
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    })();
  }, []);

  async function saveReply(ticket) {
    const text = reply[ticket.id];
    if (!text?.trim()) { toast.error("Type a reply first!"); return; }
    await updateDoc(doc(db, "support", ticket.id), { adminReply: text, status: "resolved", repliedAt: serverTimestamp() });
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, adminReply: text, status: "resolved" } : t));
    setReply(prev => ({ ...prev, [ticket.id]: "" }));
    toast.success("Reply saved! Now send it to user via Email or WhatsApp 👇");
  }

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 1 }}>SUPPORT ({tickets.length})</h1>
      </div>
      <div style={{ background: "rgba(212,255,0,0.06)", border: "1px solid rgba(212,255,0,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
        <strong style={{ color: "var(--accent)" }}>💡 How to reply:</strong>
        <span style={{ color: "var(--muted)", marginLeft: 6 }}>Type reply → Save → Click 📧 Email or 💬 WhatsApp button to send to user. Reply also shows on user contact page.</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["all","All"],["open","⏳ Open"],["resolved","✅ Resolved"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`tag ${filter === v ? "active" : ""}`} style={{ fontSize: 12 }}>{l}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--muted)" }}>No tickets found 🎉</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map(t => (
            <div key={t.id} className="card" style={{ borderLeft: `3px solid ${t.status === "resolved" ? "#4ade80" : "var(--accent)"}` }}>
              <div className="flex-between" style={{ marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name || t.userName}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleString("en-IN") : ""}</div>
                </div>
                <span className={`badge badge-${t.status === "resolved" ? "green" : "orange"}`}>{t.status === "resolved" ? "✅ Resolved" : "⏳ Open"}</span>
              </div>
              <div style={{ background: "rgba(212,255,0,0.05)", border: "1px solid rgba(212,255,0,0.1)", borderRadius: 8, padding: "8px 12px", marginBottom: 10, display: "flex", gap: 20, flexWrap: "wrap" }}>
                <div><div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Email</div><div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{t.email || t.userEmail || "—"}</div></div>
                {(t.phone || t.userPhone) && <div><div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>WhatsApp</div><div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{t.phone || t.userPhone}</div></div>}
              </div>
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>{t.subject}</div>
              <div style={{ background: "var(--ink3)", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{t.message}</div>
              {t.adminReply ? (
                <div>
                  <div style={{ background: "rgba(212,255,0,0.06)", border: "1px solid rgba(212,255,0,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 13 }}>
                    <div style={{ color: "var(--accent)", fontWeight: 700, marginBottom: 4, fontSize: 11 }}>✅ YOUR SAVED REPLY:</div>
                    <div style={{ lineHeight: 1.6 }}>{t.adminReply}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a href={`mailto:${t.email || t.userEmail}?subject=Re: ${encodeURIComponent(t.subject)}&body=${encodeURIComponent("Hi " + (t.name||t.userName) + ",\n\n" + t.adminReply + "\n\nBest regards,\nFITRO Support\nfitro.netlify.app")}`}
                      className="btn btn-primary" style={{ padding: "8px 14px", fontSize: 12, textDecoration: "none" }}>📧 Send via Email</a>
                    {(t.phone || t.userPhone) && (
                      <a href={`https://wa.me/${(t.phone||t.userPhone).replace(/[^0-9]/g,"")}?text=${encodeURIComponent("Hi " + (t.name||t.userName) + "! 👋\n\nFITRO Support reply for: *" + t.subject + "*\n\n" + t.adminReply + "\n\n- Team FITRO 🔥")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="btn" style={{ padding: "8px 14px", fontSize: 12, background: "#25D366", color: "white", textDecoration: "none" }}>💬 WhatsApp User</a>
                    )}
                    <button onClick={() => setTickets(prev => prev.map(x => x.id === t.id ? { ...x, adminReply: null, status: "open" } : x))}
                      style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", cursor: "pointer", padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>✏️ Edit</button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="label" style={{ marginBottom: 6 }}>Type Reply</label>
                  <textarea value={reply[t.id] || ""} onChange={e => setReply(prev => ({ ...prev, [t.id]: e.target.value }))}
                    placeholder={`Type your reply to ${t.name || "user"}...`} className="input" rows={3} style={{ resize: "vertical", marginBottom: 10 }} />
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button onClick={() => saveReply(t)} className="btn btn-primary" style={{ padding: "9px 18px", fontSize: 13 }}>
                      <Save size={13} /> Save Reply
                    </button>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Then use Email/WhatsApp buttons to send</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- REVIEWS ----
function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    (async () => {
      const snap = await getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc")));
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    })();
  }, []);

  async function deleteReview(id) {
    await deleteDoc(doc(db, "reviews", id));
    setReviews(prev => prev.filter(r => r.id !== id));
    toast.success("Review deleted");
  }

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 1, marginBottom: 20 }}>REVIEWS ({reviews.length})</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {reviews.map(r => (
          <div key={r.id} className="card">
            <div className="flex-between" style={{ marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{r.userName}</div>
                <div className="stars">{[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= r.rating ? "#ffd700" : "#333" }}>★</span>)}</div>
              </div>
              <button onClick={() => deleteReview(r.id)} className="btn btn-danger" style={{ padding: "6px 10px" }}><Trash2 size={13} /></button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>{r.text}</p>
          </div>
        ))}
        {reviews.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>No reviews yet</div>}
      </div>
    </div>
  );
}

// ---- SETTINGS ----
function AdminSettings() {
  const { currentUser, changePassword } = useAuth();
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [upiId, setUpiId] = useState("7265065054@ybl");
  const [savingUpi, setSavingUpi] = useState(false);
  const [amdCharge, setAmdCharge] = useState(40);
  const [outsideCharge, setOutsideCharge] = useState(150);
  const [freeAboveAmd, setFreeAboveAmd] = useState(599);
  const [freeAboveOutside, setFreeAboveOutside] = useState(1999);
  const [savingDelivery, setSavingDelivery] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "payment"));
        if (snap.exists() && snap.data().upiId) setUpiId(snap.data().upiId);
      } catch(e) {}
      try {
        const snap2 = await getDoc(doc(db, "settings", "site"));
        if (snap2.exists()) {
          setAmdCharge(snap2.data().amdDeliveryCharge ?? 40);
          setOutsideCharge(snap2.data().outsideDeliveryCharge ?? 150);
          setFreeAboveAmd(snap2.data().freeShippingAboveAmd ?? 599);
          setFreeAboveOutside(snap2.data().freeShippingAboveOutside ?? 1999);
        }
      } catch(e) {}
    })();
  }, []);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!oldPass || !newPass || !confirmPass) return toast.error("Fill all fields!");
    if (newPass !== confirmPass) return toast.error("Passwords don't match!");
    if (newPass.length < 6) return toast.error("Min 6 characters!");
    setLoading(true);
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const { auth } = await import("../firebase");
      await signInWithEmailAndPassword(auth, currentUser.email, oldPass);
      await changePassword(newPass);
      toast.success("Password changed! 🔐");
      setOldPass(""); setNewPass(""); setConfirmPass("");
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") toast.error("Current password is wrong!");
      else toast.error("Failed");
    }
    setLoading(false);
  }

  async function saveUpi() {
    if (!upiId.trim()) return toast.error("Enter a valid UPI ID!");
    setSavingUpi(true);
    try {
      await setDoc(doc(db, "settings", "payment"), { upiId: upiId.trim(), updatedAt: serverTimestamp() });
      toast.success("UPI ID updated! ✅");
    } catch(e) { toast.error("Failed to save UPI ID"); }
    setSavingUpi(false);
  }

  async function saveDeliveryCharges() {
    if (isNaN(amdCharge) || isNaN(outsideCharge)) return toast.error("Enter valid numbers!");
    setSavingDelivery(true);
    try {
      const snap = await getDoc(doc(db, "settings", "site"));
      const existing = snap.exists() ? snap.data() : {};
      await setDoc(doc(db, "settings", "site"), {
        ...existing,
        amdDeliveryCharge: Number(amdCharge),
        outsideDeliveryCharge: Number(outsideCharge),
        freeShippingAboveAmd: Number(freeAboveAmd),
        freeShippingAboveOutside: Number(freeAboveOutside),
        updatedAt: serverTimestamp()
      });
      toast.success("Delivery charges saved! 🚚");
    } catch(e) { toast.error("Failed to save delivery charges"); }
    setSavingDelivery(false);
  }

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 1, marginBottom: 20 }}>SETTINGS</h1>

      {/* Delivery Charges */}
      <div className="card" style={{ maxWidth: 520, marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 6 }}>🚚 Delivery Charges</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Set different delivery charges and free delivery thresholds by location.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">📍 Ahmedabad Charge (₹)</label>
            <input type="number" value={amdCharge} onChange={e => setAmdCharge(e.target.value)} min="0" className="input" placeholder="e.g. 40" />
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>For customers in Ahmedabad</div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">🌏 Outside Ahmedabad (₹)</label>
            <input type="number" value={outsideCharge} onChange={e => setOutsideCharge(e.target.value)} min="0" className="input" placeholder="e.g. 150" />
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>For all other cities</div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>🎁 Free Delivery Thresholds</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">📍 AMD Free Above (₹)</label>
            <input type="number" value={freeAboveAmd} onChange={e => setFreeAboveAmd(e.target.value)} min="0" className="input" placeholder="e.g. 599" />
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Set 0 to disable free delivery</div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">🌏 Outside Free Above (₹)</label>
            <input type="number" value={freeAboveOutside} onChange={e => setFreeAboveOutside(e.target.value)} min="0" className="input" placeholder="e.g. 1999" />
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Set 0 to disable free delivery</div>
          </div>
        </div>
        <div style={{ background: "rgba(212,255,0,0.05)", border: "1px solid rgba(212,255,0,0.15)", borderRadius: 8, padding: "10px 13px", fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
          💡 AMD: ₹{amdCharge} charge · Free ₹{freeAboveAmd > 0 ? `${freeAboveAmd}+` : "disabled"}<br/>
          🌏 Outside: ₹{outsideCharge} charge · Free ₹{freeAboveOutside > 0 ? `${freeAboveOutside}+` : "disabled"}
        </div>
        <button onClick={saveDeliveryCharges} className="btn btn-primary" disabled={savingDelivery}>
          <Save size={14} /> {savingDelivery ? "Saving..." : "Save Delivery Charges"}
        </button>
      </div>

      <div className="card" style={{ maxWidth: 520, marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 20 }}>🔐 Change Password</h3>
        <form onSubmit={handleChangePassword}>
          <div className="form-group"><label className="label">Current Password</label><input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="Current password" className="input" /></div>
          <div className="form-group"><label className="label">New Password</label><input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New password (min 6)" className="input" /></div>
          <div className="form-group"><label className="label">Confirm New Password</label><input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Confirm password" className="input" /></div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Updating..." : "Update Password"}</button>
        </form>
      </div>
      <div className="card" style={{ maxWidth: 520 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 6 }}>💳 UPI Payment ID</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>This UPI ID is shown to customers during checkout. Update it anytime.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@bank" className="input" style={{ fontFamily: "var(--font-mono)", fontSize: 15 }} />
          <button onClick={saveUpi} className="btn btn-primary" style={{ flexShrink: 0 }} disabled={savingUpi}>
            <Save size={14}/> {savingUpi ? "Saving..." : "Save"}
          </button>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
          Current: <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{upiId}</span>
        </div>
      </div>
    </div>
  );
}

// ---- OFFERS / COUPONS ----
function AdminOffers() {
  // ── Coupon Offers ──
  const [offers, setOffers] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: "", type: "percent", value: "", minOrder: "", description: "", active: true, expiresAt: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchOffers(); }, []);

  async function fetchOffers() {
    try {
      const snap = await getDocs(query(collection(db, "offers"), orderBy("createdAt", "desc")));
      setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      try {
        const snap2 = await getDocs(collection(db, "offers"));
        setOffers(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e2) { toast.error("Failed to load offers"); }
    }
  }

  function openNew() { setEditing(null); setForm({ code: "", type: "percent", value: "", minOrder: "", description: "", active: true, expiresAt: "" }); setModal(true); }
  function openEdit(o) { setEditing(o); setForm({ code: o.code, type: o.type, value: String(o.value), minOrder: String(o.minOrder || ""), description: o.description || "", active: o.active !== false, expiresAt: o.expiresAt || "" }); setModal(true); }

  async function saveOffer(e) {
    e.preventDefault();
    if (!form.code.trim() || !form.value) return toast.error("Fill required fields!");
    setSaving(true);
    const data = { code: form.code.trim().toUpperCase(), type: form.type, value: Number(form.value), minOrder: form.minOrder ? Number(form.minOrder) : 0, description: form.description, active: form.active, expiresAt: form.expiresAt || null, updatedAt: serverTimestamp() };
    try {
      if (editing) { await updateDoc(doc(db, "offers", editing.id), data); toast.success("Offer updated! ✅"); }
      else { await addDoc(collection(db, "offers"), { ...data, createdAt: serverTimestamp(), usedCount: 0 }); toast.success("Offer created! 🎉"); }
      setModal(false); fetchOffers();
    } catch (err) { toast.error("Failed to save: " + err.message); }
    setSaving(false);
  }

  async function toggleActive(offer) {
    await updateDoc(doc(db, "offers", offer.id), { active: !offer.active });
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, active: !o.active } : o));
    toast.success(offer.active ? "Offer deactivated" : "Offer activated!");
  }

  async function deleteOffer(id) {
    if (!window.confirm("Delete this offer?")) return;
    await deleteDoc(doc(db, "offers", id)); fetchOffers(); toast.success("Deleted!");
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 8 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 1 }}>OFFERS</h1>
        <button onClick={openNew} className="btn btn-primary">
          <Plus size={14} /> Create Coupon
        </button>
      </div>



      {/* ── COUPON CODES ── */}
      {(
        <div>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Create discount coupons usable by customers at checkout. Share codes via WhatsApp or Instagram.</p>
          {offers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", color: "var(--muted)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏷️</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No coupons yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {offers.map(o => (
                <div key={o.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", opacity: o.active ? 1 : 0.55 }}>
                  <div style={{ background: o.active ? "rgba(232,197,71,0.12)" : "var(--ink3)", border: `1px dashed ${o.active ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, padding: "10px 18px", minWidth: 100, textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: o.active ? "var(--accent)" : "var(--muted)", letterSpacing: 2 }}>{o.code}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{o.usedCount || 0} uses</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
                      {o.type === "percent" ? `${o.value}% OFF` : `₹${o.value} OFF`}
                      {o.minOrder > 0 && <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}> · Min order ₹{o.minOrder}</span>}
                    </div>
                    {o.description && <div style={{ fontSize: 13, color: "var(--muted)" }}>{o.description}</div>}
                    {o.expiresAt && <div style={{ fontSize: 11, color: "#fb923c", marginTop: 2 }}>⏰ Expires: {o.expiresAt}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button onClick={() => toggleActive(o)} style={{ background: o.active ? "rgba(74,222,128,0.1)" : "var(--ink3)", border: `1px solid ${o.active ? "#4ade80" : "var(--border)"}`, color: o.active ? "#4ade80" : "var(--muted)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      {o.active ? "✅ Active" : "⏸ Inactive"}
                    </button>
                    <button onClick={() => openEdit(o)} className="btn btn-ghost" style={{ padding: "6px 10px" }}><Edit size={13} /></button>
                    <button onClick={() => deleteOffer(o.id)} className="btn btn-danger" style={{ padding: "6px 10px" }}><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COUPON MODAL ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box">
            <div className="flex-between" style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700 }}>{editing ? "Edit Coupon" : "Create Coupon"}</h3>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form onSubmit={saveOffer}>
              <div className="form-group">
                <label className="label">Coupon Code *</label>
                <input type="text" value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} placeholder="FITRO20" className="input" style={{ fontFamily: "var(--font-mono)", fontSize: 16, letterSpacing: 2 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">Discount Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} className="input">
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">Value * {form.type === "percent" ? "(in %)" : "(in ₹)"}</label>
                  <input type="number" value={form.value} onChange={e => setForm(f => ({...f, value: e.target.value}))} placeholder={form.type === "percent" ? "20" : "100"} className="input" min="1" max={form.type === "percent" ? "100" : undefined} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Minimum Order Amount (₹)</label>
                <input type="number" value={form.minOrder} onChange={e => setForm(f => ({...f, minOrder: e.target.value}))} placeholder="0" className="input" min="0" />
              </div>
              <div className="form-group">
                <label className="label">Description</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="e.g. 20% off on all orders above ₹999" className="input" />
              </div>
              <div className="form-group">
                <label className="label">Expiry Date (optional)</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({...f, expiresAt: e.target.value}))} className="input" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <input type="checkbox" id="offerActive" checked={form.active} onChange={e => setForm(f => ({...f, active: e.target.checked}))} style={{ width: 16, height: 16, cursor: "pointer" }} />
                <label htmlFor="offerActive" style={{ fontSize: 14, cursor: "pointer" }}>Active</label>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}><Save size={14} /> {saving ? "Saving..." : "Save Coupon"}</button>
                <button type="button" onClick={() => setModal(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// ---- SITE SETTINGS (Social, Footer pages, Shipping) exported and used in Footer ----
export async function loadSiteSettings() {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const { db } = await import("../firebase");
    const snap = await getDoc(doc(db, "settings", "site"));
    if (snap.exists()) return snap.data();
  } catch (e) {}
  return null;
}
