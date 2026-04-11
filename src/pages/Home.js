import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { Heart, ArrowRight, ChevronLeft, ChevronRight, Star } from "lucide-react";
import toast from "react-hot-toast";

export function useWishlist() {
  const { currentUser } = useAuth();
  const [wishlist, setWishlist] = useState([]);

  // Load wishlist from Firestore when user logs in (cross-device sync)
  useEffect(() => {
    if (!currentUser) { setWishlist([]); return; }
    (async () => {
      try {
        const snap = await getDoc(doc(db, "wishlists", currentUser.uid));
        if (snap.exists()) {
          setWishlist(snap.data().items || []);
        } else {
          // Migrate from localStorage if exists
          const local = localStorage.getItem(`fitro_wishlist_${currentUser.uid}`);
          const items = local ? JSON.parse(local) : [];
          await setDoc(doc(db, "wishlists", currentUser.uid), { items, updatedAt: new Date() });
          setWishlist(items);
          if (items.length) localStorage.removeItem(`fitro_wishlist_${currentUser.uid}`);
        }
      } catch (e) {
        // Fallback to localStorage if Firestore fails
        const saved = localStorage.getItem(`fitro_wishlist_${currentUser.uid}`);
        if (saved) setWishlist(JSON.parse(saved));
      }
    })();
  }, [currentUser?.uid]);

  async function toggle(productId) {
    if (!currentUser) { toast.error("Login to save wishlist!"); return; }
    const isIn = wishlist.includes(productId);
    const next = isIn ? wishlist.filter(id => id !== productId) : [...wishlist, productId];
    setWishlist(next); // optimistic update
    toast(isIn ? "Removed from wishlist" : "Saved to wishlist ♥");
    try {
      await updateDoc(doc(db, "wishlists", currentUser.uid), {
        items: isIn ? arrayRemove(productId) : arrayUnion(productId),
        updatedAt: new Date(),
      });
    } catch (e) {
      // Doc may not exist yet
      await setDoc(doc(db, "wishlists", currentUser.uid), { items: next, updatedAt: new Date() });
    }
  }

  function isWishlisted(id) { return wishlist.includes(id); }
  return { wishlist, toggle, isWishlisted };
}

const DEFAULT_SLIDES = [
  { id: 1, image: "/tshirt1.jpg", title: "Wear It Fit", subtitle: "Premium streetwear built for those who move with purpose.", badge: "New Drop", cta: "Shop Now", link: "/shop" },
  { id: 2, image: "/tshirt3.png", title: "Own It.", subtitle: "Raw energy. Real style. No compromise — ever.", badge: "Bestseller", cta: "Explore", link: "/shop?cat=Mens" },
  { id: 3, image: "/tshirt2.jpg", title: "Fitro Essentials", subtitle: "Minimal drip. Timeless pieces. Always in season.", badge: "Limited", cta: "Shop Now", link: "/shop?cat=Unisex" },
  { id: 4, image: "/tshirt4.png", title: "Fitted. Raw. Real.", subtitle: "Fresh drops every week — stay ahead of the fit.", badge: "Hot", cta: "View All", link: "/shop" },
];

const DEFAULT_FEATURES = [
  { icon: "⚡", title: "New Drops Weekly", desc: "Fresh styles constantly dropping" },
  { icon: "🚚", title: "Fast Delivery", desc: "Pan India 3–5 days" },
  { icon: "↩️", title: "7-Day Returns", desc: "Hassle-free, no questions" },
  { icon: "🔒", title: "Secure Payments", desc: "Razorpay · UPI · COD" },
];

export function ProductCard({ product, onClick, wishlisted, onWishlist }) {
  const { currentUser } = useAuth();
  const { isWishlisted, toggle } = useWishlist();
  const wl = wishlisted !== undefined ? wishlisted : isWishlisted(product.id);
  const handleWishlist = onWishlist || ((e) => { e.stopPropagation(); toggle(product.id); });
  const discount = product.mrp && product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : null;
  // Stock check
  const stockMap = (product.stock && typeof product.stock === "object") ? product.stock : null;
  const totalStock = stockMap ? Object.values(stockMap).reduce((s, v) => s + v, 0) : (typeof product.stock === "number" ? product.stock : 999);
  const isOOS = totalStock === 0;

  return (
    <div className="product-card" onClick={onClick}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <img className="pcard-img" src={product.images?.[0] || "/tshirt1.jpg"} alt={product.name} onError={e => e.target.src = "/tshirt1.jpg"} />
        {discount && (
          <div style={{ position: "absolute", top: 10, left: 10, background: "var(--accent)", color: "var(--ink)", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5 }}>
            -{discount}%
          </div>
        )}
        {product.badge && !isOOS && (
          <div style={{ position: "absolute", top: 10, left: discount ? 56 : 10, background: "rgba(13,13,13,0.75)", border: "1px solid var(--border2)", color: "var(--light2)", fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 5, backdropFilter: "blur(4px)" }}>
            {product.badge}
          </div>
        )}
        {isOOS && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(13,13,13,0.65)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
            <div style={{ background: "#f87171", color: "#fff", fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 6, letterSpacing: 1, textTransform: "uppercase" }}>Out of Stock</div>
          </div>
        )}

        {currentUser && (
          <button onClick={handleWishlist} style={{
            position: "absolute", top: 10, right: 10,
            background: wl ? "var(--rose)" : "rgba(13,13,13,0.7)", border: "none",
            borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", transition: "all 0.2s", backdropFilter: "blur(4px)"
          }}>
            <Heart size={14} color="#fff" fill={wl ? "#fff" : "none"} />
          </button>
        )}
      </div>
      <div className="product-card-body">
        <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, fontWeight: 500 }}>{product.category}</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 15, marginBottom: 7, color: "var(--light)", lineHeight: 1.2 }}>{product.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--accent)" }}>₹{product.price}</span>
          {product.mrp && product.mrp > product.price && (
            <span style={{ fontSize: 12, color: "var(--muted)", textDecoration: "line-through" }}>₹{product.mrp}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [categories, setCategories] = useState([]);
  const [catImages, setCatImages] = useState({});
  const slideTimer = useRef(null);
  const navigate = useNavigate();
  const { isWishlisted, toggle } = useWishlist();

  useEffect(() => {
    (async () => {
      try {
        const prodSnap = await getDocs(collection(db, "products"));
        const prods = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        prods.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setProducts(prods.slice(0, 8));
      } catch (e) {}
      setLoading(false);
      try {
        const settingsSnap = await getDoc(doc(db, "settings", "homepage"));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (data.slides?.length) setSlides(data.slides);
          if (data.features?.length) setFeatures(data.features);
          if (data.catImages?.length) {
            const imgMap = {};
            data.catImages.forEach(c => { if (c.image) imgMap[c.name] = c.image; });
            setCatImages(imgMap);
          }
        }
      } catch (e) {}
      try {
        const catSnap = await getDocs(collection(db, "categories"));
        if (!catSnap.empty) setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    slideTimer.current = setInterval(() => setCurrentSlide(p => (p + 1) % slides.length), 5000);
    return () => clearInterval(slideTimer.current);
  }, [slides.length]);

  function nextSlide() { clearInterval(slideTimer.current); setCurrentSlide(p => (p + 1) % slides.length); }
  function prevSlide() { clearInterval(slideTimer.current); setCurrentSlide(p => (p - 1 + slides.length) % slides.length); }

  const defaultCatImages = { Mens: "/tshirt2.jpg", Womens: "/tshirt3.png", Unisex: "/tshirt1.jpg" };
  const getCatImg = (name) => catImages[name] || defaultCatImages[name] || "/tshirt4.png";
  const displayCats = categories.length > 0
    ? categories.slice(0, 3).map(c => ({ name: c.name, img: getCatImg(c.name) }))
    : [{ name: "Mens", img: getCatImg("Mens") }, { name: "Womens", img: getCatImg("Womens") }, { name: "Unisex", img: getCatImg("Unisex") }];

  return (
    <div>
      {/* HERO */}
      <style>{`
        .hero-section { position: relative; height: clamp(520px, 92vh, 860px); overflow: hidden; background: var(--ink); }
        .hero-bg-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center top; opacity: 0.28; }
        .hero-overlay { position: absolute; inset: 0; background: linear-gradient(105deg, rgba(13,13,13,0.97) 35%, rgba(13,13,13,0.35) 100%); }
        .hero-content-wrap { position: relative; zIndex: 2; height: 100%; display: flex; align-items: center; }
        .hero-text-block { max-width: 580px; width: 100%; padding: 0 0 32px; }
        .hero-title { font-family: var(--font-display); font-size: clamp(38px, 7vw, 96px); font-weight: 600; line-height: 1.0; letter-spacing: -0.5px; margin-bottom: 14px; color: var(--light); }
        .hero-sub { color: rgba(247,246,242,0.6); font-size: clamp(14px, 1.8vw, 16px); line-height: 1.7; margin-bottom: 24px; max-width: 360px; }
        .hero-img-panel { position: absolute; right: 0; top: 8%; bottom: 8%; width: 38%; border-radius: 16px 0 0 16px; overflow: hidden; border: 1px solid rgba(232,197,71,0.12); }
        .hero-counter { position: absolute; bottom: 26px; right: 24px; font-family: var(--font-mono); font-size: 11px; color: rgba(255,255,255,0.3); z-index: 10; letter-spacing: 2px; }

        @media (max-width: 768px) {
          .hero-section {
            height: 100svh;
            min-height: 600px;
            max-height: 900px;
          }
          .hero-bg-img {
            opacity: 1 !important;
            object-fit: contain !important;
            object-position: center 30% !important;
            width: 100% !important;
            height: 100% !important;
            background: #0a0a0a !important;
          }
          .hero-overlay {
            background: linear-gradient(
              to top,
              rgba(5,5,5,0.98) 0%,
              rgba(5,5,5,0.85) 28%,
              rgba(5,5,5,0.45) 55%,
              rgba(5,5,5,0.08) 80%,
              rgba(5,5,5,0.0) 100%
            ) !important;
          }
          .hero-content-wrap {
            align-items: flex-end !important;
            padding-bottom: 80px !important;
          }
          .hero-text-block {
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .hero-title {
            font-size: clamp(30px, 8.5vw, 50px) !important;
            margin-bottom: 10px !important;
            text-shadow: 0 2px 24px rgba(0,0,0,0.9) !important;
            line-height: 1.05 !important;
          }
          .hero-sub {
            font-size: 13px !important;
            color: rgba(247,246,242,0.82) !important;
            margin-bottom: 18px !important;
            max-width: 100% !important;
            text-shadow: 0 1px 8px rgba(0,0,0,0.8) !important;
          }
          .hero-img-panel { display: none !important; }
          .hero-counter { display: none; }
          .hero-arrow-btn {
            width: 36px !important;
            height: 36px !important;
            top: 40% !important;
          }
          .hero-dots {
            bottom: 56px !important;
          }
        }
      `}</style>

      <section className="hero-section">
        {slides.map((slide, i) => (
          <div key={i} style={{ position: "absolute", inset: 0, opacity: i === currentSlide ? 1 : 0, transition: "opacity 1s ease", pointerEvents: i === currentSlide ? "all" : "none" }}>
            <img src={slide.image} alt={slide.title} className="hero-bg-img" onError={e => e.target.src = "/tshirt1.jpg"} />
            <div className="hero-overlay" />
            <div className="container" style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", alignItems: "center" }} >
              <div className="hero-content-wrap" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
                <div className="hero-text-block">
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(232,197,71,0.12)", border: "1px solid rgba(232,197,71,0.35)", borderRadius: 100, padding: "4px 14px", fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" }}>
                    ✦ {slide.badge}
                  </div>
                  <h1 className="hero-title">{slide.title}</h1>
                  <p className="hero-sub">{slide.subtitle}</p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link to={slide.link || "/shop"} className="btn btn-primary" style={{ fontSize: 14, padding: "13px 24px" }}>
                      {slide.cta} <ArrowRight size={14} />
                    </Link>
                    <Link to="/shop" className="btn btn-secondary" style={{ fontSize: 14, padding: "13px 22px" }}>All Drops</Link>
                  </div>
                </div>
              </div>

              {/* Right image panel — desktop only */}
              <div className="hero-img-panel">
                <img src={slide.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.src = "/tshirt1.jpg"} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(13,13,13,0.85) 0%, transparent 45%)" }} />
              </div>
            </div>
          </div>
        ))}

        {/* Arrow controls */}
        {[["left", prevSlide, ChevronLeft], ["right", nextSlide, ChevronRight]].map(([side, fn, Icon]) => (
          <button key={side} onClick={fn} className="hero-arrow-btn" style={{
            position: "absolute", [side]: 16, top: "50%", transform: "translateY(-50%)",
            background: "rgba(247,246,242,0.09)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(247,246,242,0.12)", borderRadius: "50%",
            width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "white", zIndex: 10, transition: "all 0.2s"
          }}>
            <Icon size={18} />
          </button>
        ))}

        {/* Dot indicators */}
        <div className="hero-dots" style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 10 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrentSlide(i)} style={{ width: i === currentSlide ? 28 : 7, height: 7, borderRadius: 4, background: i === currentSlide ? "var(--accent)" : "rgba(255,255,255,0.25)", border: "none", cursor: "pointer", transition: "all 0.3s ease", padding: 0 }} />
          ))}
        </div>

        <div className="hero-counter">
          {String(currentSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </div>
      </section>

      {/* Features bar */}
      <section style={{ background: "var(--ink2)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "22px 0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 20 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ background: "rgba(232,197,71,0.08)", border: "1px solid rgba(232,197,71,0.15)", padding: "10px 11px", borderRadius: 10, fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section">
        <div className="container">
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 3, color: "var(--accent)", textTransform: "uppercase", marginBottom: 8 }}>Browse By</div>
            <h2 className="section-title">Categories</h2>
          </div>
          <div className="grid-3">
            {displayCats.map((cat) => (
              <Link key={cat.name} to={`/shop?cat=${cat.name}`} style={{ position: "relative", borderRadius: 16, overflow: "hidden", display: "block", aspectRatio: "4/5", textDecoration: "none", transition: "transform 0.3s ease, box-shadow 0.3s ease" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 20px 50px rgba(0,0,0,0.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                <img src={cat.img} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
                  onMouseEnter={e => e.target.style.transform = "scale(1.06)"}
                  onMouseLeave={e => e.target.style.transform = "scale(1)"}
                  onError={e => e.target.src = "/tshirt1.jpg"} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(13,13,13,0.88) 0%, transparent 50%)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "22px 20px" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, color: "var(--light)", marginBottom: 6 }}>{cat.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent)", fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>
                    Shop Now <ArrowRight size={12} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="section" style={{ background: "var(--ink2)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 3, color: "var(--accent)", textTransform: "uppercase", marginBottom: 8 }}>Latest</div>
              <h2 className="section-title">New Arrivals</h2>
            </div>
            <Link to="/shop" className="btn btn-ghost" style={{ fontSize: 13, padding: "9px 18px" }}>View All <ArrowRight size={13} /></Link>
          </div>
          {loading ? (
            <div className="flex-center" style={{ height: 300 }}><div className="spinner" /></div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>👕</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Coming Soon</div>
              <p style={{ fontSize: 14 }}>Stay tuned for new Fitro arrivals</p>
            </div>
          ) : (
            <div className="grid-4">
              {products.map(p => (
                <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} wishlisted={isWishlisted(p.id)} onWishlist={(e) => { e.stopPropagation(); toggle(p.id); }} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ background: "var(--accent)", padding: "64px 0", overflow: "hidden", position: "relative" }}>
        {/* Background animated shapes */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              borderRadius: "50%",
              background: "rgba(13,13,13,0.06)",
              width: `${80 + i * 40}px`,
              height: `${80 + i * 40}px`,
              top: `${10 + (i % 3) * 30}%`,
              left: `${(i * 18) % 90}%`,
              animation: `floatBubble ${4 + i}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.5}s`,
            }} />
          ))}
        </div>
        <div className="container" style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-block", background: "rgba(13,13,13,0.1)", borderRadius: 100, padding: "4px 16px", fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "rgba(13,13,13,0.7)", textTransform: "uppercase", marginBottom: 16, animation: "fadeInUp 0.6s ease" }}>
            ✦ FITRO DROP
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,5vw,60px)", fontWeight: 600, color: "var(--ink)", marginBottom: 12, animation: "fadeInUp 0.7s ease" }}>
            Fitted. Raw. Real.
          </div>
          <p style={{ color: "rgba(13,13,13,0.6)", fontSize: "clamp(13px,1.8vw,16px)", marginBottom: 28, fontWeight: 500, animation: "fadeInUp 0.8s ease" }}>
            Premium streetwear built for those who move with purpose.
          </p>
          <Link to="/shop" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--ink)", color: "var(--accent)", padding: "14px 30px", borderRadius: "var(--radius)", fontWeight: 600, fontSize: 14, textDecoration: "none", transition: "all 0.3s", animation: "fadeInUp 0.9s ease", boxShadow: "0 8px 30px rgba(13,13,13,0.25)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--ink2)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 14px 40px rgba(13,13,13,0.35)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--ink)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(13,13,13,0.25)"; }}>
            Shop All Drops <ArrowRight size={14} />
          </Link>
        </div>
        <style>{`
          @keyframes floatBubble { from { transform: translateY(0) scale(1); } to { transform: translateY(-20px) scale(1.05); } }
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </section>
    </div>
  );
}
