import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useWishlist, ProductCard } from "./Home";
import { ArrowLeft, Heart, ShoppingBag, Star, Package, RotateCcw, Shield, Truck, FileText, Plus, Minus } from "lucide-react";
import toast from "react-hot-toast";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile, isAdmin } = useAuth();
  const { addToCart } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState("");
  const [activeImg, setActiveImg] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [openSection, setOpenSection] = useState("description");
  const [similarProducts, setSimilarProducts] = useState([]);
  useEffect(() => {
    // Real-time listener — product page updates instantly when admin changes stock
    setLoading(true);
    const unsub = onSnapshot(doc(db, "products", id), (snap) => {
      if (snap.exists()) {
        setProduct({ id: snap.id, ...snap.data() });
      } else {
        navigate("/shop");
      }
      setLoading(false);
    }, (e) => { console.error(e); setLoading(false); });

    // Fetch reviews separately (one-time is fine)
    (async () => {
      try {
        const rSnap = await getDocs(query(collection(db, "reviews"), where("productId", "==", id)));
        const revData = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        revData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setReviews(revData);
      } catch (e) { console.error(e); }
    })();

    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!product?.category) { setSimilarProducts([]); return; }
    (async () => {
      try {
        // Always fetches live from Firestore, so any product added/removed later
        // is picked up automatically — nothing here needs to change in future.
        const snap = await getDocs(query(collection(db, "products"), where("category", "==", product.category)));
        const pool = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.id !== product.id);

        const shuffle = arr => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
        const norm = v => (v || "").toString().trim().toLowerCase();

        // Rank in tiers: same subcategory+fit > same subcategory > same fit > rest of category
        const sameSubAndFit = pool.filter(p => norm(p.subcategory) && norm(p.subcategory) === norm(product.subcategory) && norm(p.fit) && norm(p.fit) === norm(product.fit));
        const sameSub = pool.filter(p => norm(p.subcategory) && norm(p.subcategory) === norm(product.subcategory));
        const sameFit = pool.filter(p => norm(p.fit) && norm(p.fit) === norm(product.fit));
        const rest = pool;

        const seen = new Set();
        const ranked = [];
        for (const tier of [shuffle(sameSubAndFit), shuffle(sameSub), shuffle(sameFit), shuffle(rest)]) {
          for (const p of tier) {
            if (!seen.has(p.id)) { seen.add(p.id); ranked.push(p); }
          }
        }

        setSimilarProducts(ranked.slice(0, 8));
      } catch (e) { console.error(e); }
    })();
  }, [product?.id, product?.category, product?.subcategory, product?.fit]);

  async function handleAddToCart() {
    if (!currentUser) { toast.error("Login first!"); navigate("/login"); return; }
    if (isAdmin) { toast.error("Admin can't shop 😄"); return; }
    if (!selectedSize) { toast.error("Pick a size first!"); return; }
    // Live stock check at moment of add-to-cart
    const { getDoc, doc: fsDoc } = await import("firebase/firestore");
    const snap = await getDoc(fsDoc(db, "products", product.id));
    if (snap.exists()) {
      const liveStock = snap.data().stock;
      if (liveStock && typeof liveStock === "object") {
        const sizeQty = liveStock[selectedSize] ?? 0;
        if (sizeQty === 0) {
          toast.error(`Size ${selectedSize} just went out of stock!`);
          return;
        }
      }
    }
    addToCart(product, selectedSize);
    toast.success("Added to cart! 🛍️");
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!currentUser) { toast.error("Login to review!"); return; }
    if (!reviewText.trim()) return;
    setSubmittingReview(true);
    try {
      const newRev = { productId: id, userId: currentUser.uid, userName: userProfile?.name || "FITRO Fan", rating, text: reviewText.trim(), createdAt: serverTimestamp() };
      const ref = await addDoc(collection(db, "reviews"), newRev);
      setReviews(prev => [{ id: ref.id, ...newRev, createdAt: { seconds: Date.now() / 1000 } }, ...prev]);
      setReviewText(""); setRating(5);
      toast.success("Review posted! 🌟");
    } catch (e) { toast.error("Failed to post review"); }
    setSubmittingReview(false);
  }

  if (loading) return <div className="flex-center" style={{ height: "60vh" }}><div className="spinner" /></div>;
  if (!product) return null;

  const images = product.images?.length ? product.images : ["/tshirt1.jpg"];
  const sizes = product.sizes?.length ? product.sizes : ["XS", "S", "M", "L", "XL", "XXL"];
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const wishlisted = isWishlisted(product.id);
  const discount = product.mrp && product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : null;

  // Stock helpers
  const stockMap = (product.stock && typeof product.stock === "object") ? product.stock : null;
  const getSizeStock = (size) => stockMap ? (stockMap[size] ?? 0) : 999;
  const isSizeOutOfStock = (size) => stockMap ? getSizeStock(size) === 0 : false;
  const totalStock = stockMap ? Object.values(stockMap).reduce((s, v) => s + v, 0) : 999;
  const isFullyOutOfStock = stockMap ? totalStock === 0 : false;

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", marginBottom: 24, fontSize: 13, fontFamily: "var(--font-body)", letterSpacing: 1.5, textTransform: "uppercase" }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }} className="product-detail-grid">
        {/* Images */}
        <div>
          <div style={{ borderRadius: 14, overflow: "hidden", background: "var(--ink2)", border: "1px solid var(--border)", marginBottom: 12, aspectRatio: "3/4" }}>
            <img src={images[activeImg]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.src = "/tshirt1.jpg"} />
          </div>
          {images.length > 1 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {images.map((img, i) => (
                <div key={i} onClick={() => setActiveImg(i)} style={{ width: 64, height: 80, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: `2px solid ${i === activeImg ? "var(--accent)" : "var(--border)"}`, flexShrink: 0 }}>
                  <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.src = "/tshirt1.jpg"} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.badge && <div className="badge badge-neon" style={{ marginBottom: 12 }}>{product.badge}</div>}
          <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-body)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>{product.category}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,4vw,44px)", letterSpacing: 2, marginBottom: 12, lineHeight: 1.05 }}>{product.name}</h1>

          {avgRating && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 2 }}>
                {[1, 2, 3, 4, 5].map(i => <span key={i} className={`star ${i <= Math.round(avgRating) ? "" : "empty"}`}>★</span>)}
              </div>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{avgRating} ({reviews.length} reviews)</span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--accent)", letterSpacing: 2 }}>₹{product.price}</span>
            {product.mrp && product.mrp > product.price && (
              <>
                <span style={{ fontSize: 18, color: "var(--muted)", textDecoration: "line-through" }}>₹{product.mrp}</span>
                <span className="badge badge-neon">{discount}% OFF</span>
              </>
            )}
          </div>

          {/* Quick spec grid */}
          {(product.productType || product.fit || product.closure || product.length || product.fabric) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px", padding: "18px 0", marginBottom: 8, borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
              {[
                ["Product Category", product.category],
                ["Product Type", product.productType],
                ["Fit", product.fit],
                ["Closure", product.closure],
                ["Length", product.length],
                ["Fabric", product.fabric],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-body)", letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--light)" }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Info accordion */}
          <div style={{ marginBottom: 20 }}>
            {[
              { key: "description", icon: <FileText size={16} />, title: "Product Description", body: product.description || "Manufacture, Care and Fit" },
              { key: "shipping", icon: <Truck size={16} />, title: "Shipping Info", body: "We offer free shipping across India on orders above ₹999. Standard delivery takes 3–5 business days." },
              { key: "returns", icon: <RotateCcw size={16} />, title: "7 Days Returns & Exchange", body: "Easy returns and exchange within 7 days of delivery. Item must be unused, unwashed, and with original tags." },
            ].map((sec, i, arr) => {
              const isOpen = openSection === sec.key;
              return (
                <div key={sec.key} style={{ borderBottom: i === arr.length - 1 ? "1px solid var(--border)" : "none", borderTop: "1px solid var(--border)" }}>
                  <button
                    onClick={() => setOpenSection(isOpen ? null : sec.key)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 2px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ color: "var(--accent)", display: "flex" }}>{sec.icon}</span>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 700, color: "var(--light)" }}>{sec.title}</span>
                    </div>
                    {isOpen ? <Minus size={16} color="var(--muted)" /> : <Plus size={16} color="var(--muted)" />}
                  </button>
                  {isOpen && (
                    <p style={{ padding: "0 2px 16px 40px", color: "rgba(245,244,240,0.6)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>{sec.body}</p>
                  )}
                </div>
              );
            })}
          </div>


          {/* Size selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, letterSpacing: 3, color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>
              Select Size {selectedSize && `— ${selectedSize}`}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {sizes.map(size => {
                const outOfStock = isSizeOutOfStock(size);
                const sizeStock = getSizeStock(size);
                const isLow = sizeStock > 0 && sizeStock <= 3;
                return (
                  <div key={size} style={{ position: "relative" }}>
                    <button
                      onClick={() => {
                        if (outOfStock) { toast.error(`Size ${size} is out of stock!`); return; }
                        setSelectedSize(size);
                      }}
                      style={{
                        padding: "9px 16px", borderRadius: 7,
                        border: `1.5px solid ${outOfStock ? "rgba(248,113,113,0.3)" : selectedSize === size ? "var(--accent)" : "var(--border)"}`,
                        background: outOfStock ? "rgba(248,113,113,0.05)" : selectedSize === size ? "rgba(200,255,0,0.1)" : "var(--ink3)",
                        color: outOfStock ? "rgba(248,113,113,0.5)" : selectedSize === size ? "var(--accent)" : "var(--light)",
                        cursor: outOfStock ? "not-allowed" : "pointer",
                        fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
                        transition: "all 0.2s", minWidth: 48, position: "relative",
                        textDecoration: outOfStock ? "line-through" : "none",
                        opacity: outOfStock ? 0.6 : 1,
                      }}>
                      {size}
                    </button>
                    {isLow && !outOfStock && (
                      <div style={{ position: "absolute", top: -6, right: -4, background: "#fbbf24", color: "#000", fontSize: 8, fontWeight: 800, padding: "1px 4px", borderRadius: 4, pointerEvents: "none" }}>
                        {sizeStock} LEFT
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {stockMap && (
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
                {sizes.filter(s => isSizeOutOfStock(s)).length > 0 && (
                  <span style={{ color: "#f87171" }}>
                    {sizes.filter(s => isSizeOutOfStock(s)).join(", ")} — Out of Stock
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {isFullyOutOfStock && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, textAlign: "center" }}>
              <div style={{ color: "#f87171", fontWeight: 700, fontSize: 14 }}>❌ Out of Stock</div>
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>This product is currently unavailable. Check back soon!</div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            <button onClick={isFullyOutOfStock ? undefined : handleAddToCart}
              className="btn btn-primary"
              disabled={isFullyOutOfStock}
              style={{ flex: 1, justifyContent: "center", fontSize: 12, opacity: isFullyOutOfStock ? 0.5 : 1, cursor: isFullyOutOfStock ? "not-allowed" : "pointer" }}>
              <ShoppingBag size={16} /> {isFullyOutOfStock ? "Out of Stock" : "Add to Cart"}
            </button>
            {currentUser && (
              <button onClick={() => toggle(product.id)} style={{ padding: "12px 14px", borderRadius: 8, border: `1.5px solid ${wishlisted ? "var(--neon2)" : "var(--border)"}`, background: wishlisted ? "rgba(255,45,120,0.1)" : "var(--ink3)", cursor: "pointer", display: "flex", alignItems: "center", transition: "all 0.2s" }}>
                <Heart size={18} color={wishlisted ? "var(--neon2)" : "var(--muted)"} fill={wishlisted ? "var(--neon2)" : "none"} />
              </button>
            )}
          </div>

          {/* Assurance badges */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            {[
              { icon: <Truck size={14} />, text: "Free shipping ₹999+" },
              { icon: <RotateCcw size={14} />, text: "7-day returns" },
              { icon: <Shield size={14} />, text: "Secure payment" },
              { icon: <Package size={14} />, text: "3–5 day delivery" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--ink3)", borderRadius: 8, padding: "10px 12px", color: "var(--muted)", fontSize: 12, fontFamily: "var(--font-body)", letterSpacing: 0.5 }}>
                {item.icon} {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <div style={{ marginTop: 60 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 24 }}>
            SIMILAR {product.fit ? product.fit.toUpperCase() : ""} PICKS
          </h2>
          <div className="grid-4">
            {similarProducts.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={() => navigate(`/product/${p.id}`)}
                wishlisted={isWishlisted(p.id)}
                onWishlist={(e) => { e.stopPropagation(); toggle(p.id); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div style={{ marginTop: 60 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 24 }}>REVIEWS {reviews.length > 0 && `(${reviews.length})`}</h2>

        {currentUser && !isAdmin && (
          <form onSubmit={submitReview} className="card" style={{ marginBottom: 28, maxWidth: 600 }}>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Write a Review</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} type="button" onClick={() => setRating(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: i <= rating ? "#ffd700" : "#2a2a2a", transition: "color 0.15s" }}>★</button>
              ))}
            </div>
            <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} className="input" rows={3} placeholder="Share your thoughts on this drop..." style={{ marginBottom: 12 }} />
            <button type="submit" className="btn btn-primary" disabled={submittingReview} style={{ fontSize: 11 }}>
              {submittingReview ? "Posting..." : "Post Review ⚡"}
            </button>
          </form>
        )}

        {reviews.length === 0 ? (
          <div style={{ color: "var(--muted)", padding: "32px 0" }}>No reviews yet — be the first!</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 700 }}>
            {reviews.map(r => (
              <div key={r.id} className="card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.userName}</div>
                  <div style={{ display: "flex", gap: 2 }}>
                    {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ fontSize: 13, color: i <= r.rating ? "#ffd700" : "#2a2a2a" }}>★</span>)}
                  </div>
                </div>
                <p style={{ color: "rgba(245,244,240,0.65)", fontSize: 14, lineHeight: 1.6 }}>{r.text}</p>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, fontFamily: "var(--font-body)", letterSpacing: 1 }}>
                  {r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Just now"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
