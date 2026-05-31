import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { ProductCard, useWishlist } from "./Home";
import { Search, X } from "lucide-react";

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(searchParams.get("cat") || "All");
  const [activeSubcat, setActiveSubcat] = useState(searchParams.get("sub") || "All");
  const [sortBy, setSortBy] = useState("newest");
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();
  const { isWishlisted, toggle } = useWishlist();

  useEffect(() => {
    (async () => {
      try {
        const [prodSnap, catSnap] = await Promise.all([
          getDocs(collection(db, "products")),
          getDocs(collection(db, "categories")),
        ]);
        setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const cat = searchParams.get("cat") || "All";
    const sub = searchParams.get("sub") || "All";
    setActiveCategory(cat);
    setActiveSubcat(sub);
  }, [searchParams]);

  // Get subcategories for active main category (stored as array in category doc)
  const currentCatDoc = categories.find(c => c.name === activeCategory);
  const subcats = currentCatDoc?.subcategories?.length > 0 ? currentCatDoc.subcategories : [];

  useEffect(() => {
    let result = [...products];
    if (activeCategory !== "All") result = result.filter(p => p.category === activeCategory);
    if (activeSubcat !== "All" && activeSubcat) result = result.filter(p => p.subcategory === activeSubcat);
    if (search) result = result.filter(p =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    );
    if (sortBy === "price_low") result.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_high") result.sort((a, b) => b.price - a.price);
    else result.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setFiltered(result);
  }, [products, activeCategory, activeSubcat, search, sortBy]);

  const mainCats = ["All", ...categories.map(c => c.name)];

  function selectCat(cat) {
    setActiveCategory(cat);
    setActiveSubcat("All");
    setSearchParams(cat === "All" ? {} : { cat });
  }

  function selectSubcat(sub) {
    setActiveSubcat(sub);
    if (sub === "All") {
      setSearchParams(activeCategory === "All" ? {} : { cat: activeCategory });
    } else {
      setSearchParams({ cat: activeCategory, sub });
    }
  }

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 3, color: "var(--accent)", textTransform: "uppercase", marginBottom: 8 }}>FITRO Store</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,6vw,48px)", fontWeight: 600, marginBottom: 6 }}>
          {activeCategory === "All" ? "ALL DROPS 🔥" : activeCategory.toUpperCase()}
          {activeSubcat !== "All" && activeSubcat ? ` — ${activeSubcat}` : ""}
        </h1>
        <p style={{ color: "var(--muted)", letterSpacing: 1, fontSize: 14 }}>{filtered.length} style{filtered.length !== 1 ? "s" : ""} available</p>
      </div>

      {/* Search + Sort */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tees..." className="input" style={{ paddingLeft: 40 }} />
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={14} /></button>}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input" style={{ width: "auto", minWidth: 160 }}>
          <option value="newest">Newest First</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
        </select>
      </div>

      {/* Main Category tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: subcats.length > 0 ? 12 : 32, flexWrap: "wrap" }}>
        {mainCats.map(cat => (
          <button key={cat} onClick={() => selectCat(cat)} className={`tag ${activeCategory === cat ? "active" : ""}`}>{cat}</button>
        ))}
      </div>

      {/* Subcategory tabs */}
      {subcats.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap", paddingLeft: 4 }}>
          <div style={{ width: "100%", fontSize: 10, color: "var(--muted)", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>
            {activeCategory} →
          </div>
          {["All", ...subcats].map(sub => (
            <button key={sub} onClick={() => selectSubcat(sub)}
              style={{
                padding: "6px 16px", borderRadius: 20,
                border: activeSubcat === sub ? "1px solid var(--accent)" : "1px solid var(--border2)",
                background: activeSubcat === sub ? "rgba(232,197,71,0.12)" : "transparent",
                color: activeSubcat === sub ? "var(--accent)" : "var(--muted)",
                fontSize: 12, fontWeight: activeSubcat === sub ? 600 : 400,
                cursor: "pointer", transition: "all 0.2s", letterSpacing: 0.5,
              }}>
              {sub === "All" ? `All ${activeCategory}` : sub}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex-center" style={{ height: 300 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😅</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: 2, marginBottom: 8 }}>NO PRODUCTS FOUND</div>
          <p style={{ fontSize: 13, marginBottom: 20 }}>Try a different category or clear your filters</p>
          <button onClick={() => { setSearch(""); setActiveCategory("All"); setActiveSubcat("All"); setSearchParams({}); }} className="btn btn-secondary">Clear Filters</button>
        </div>
      ) : (
        <div className="grid-4">
          {filtered.map(p => (
            <ProductCard key={p.id} product={p}
              onClick={() => navigate(`/product/${p.id}`)}
              wishlisted={isWishlisted(p.id)}
              onWishlist={(e) => { e.stopPropagation(); toggle(p.id); }} />
          ))}
        </div>
      )}
    </div>
  );
}
