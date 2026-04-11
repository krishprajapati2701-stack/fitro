import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "../firebase";
import { useWishlist, ProductCard } from "./Home";
import { Heart } from "lucide-react";

export default function Wishlist() {
  const { wishlist, toggle, isWishlisted } = useWishlist();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (wishlist.length === 0) { setLoading(false); return; }
      try {
        const batches = [];
        for (let i = 0; i < wishlist.length; i += 10) {
          const batch = wishlist.slice(i, i + 10);
          batches.push(getDocs(query(collection(db, "products"), where(documentId(), "in", batch))));
        }
        const results = await Promise.all(batches);
        setProducts(results.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [wishlist.length]);

  if (wishlist.length === 0) return (
    <div className="flex-center" style={{ flexDirection: "column", minHeight: "70vh", gap: 16 }}>
      <Heart size={64} color="var(--neon2)" />
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2 }}>WISHLIST IS EMPTY</h2>
      <p style={{ color: "var(--muted)" }}>Save fits you love for later!</p>
      <Link to="/shop" className="btn btn-primary">Browse Drops</Link>
    </div>
  );

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, letterSpacing: 4, color: "var(--accent)", textTransform: "uppercase", marginBottom: 6 }}>Saved</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3, marginBottom: 8 }}>MY WISHLIST ❤️</h1>
      <p style={{ color: "var(--muted)", marginBottom: 32, fontFamily: "var(--font-body)", letterSpacing: 1 }}>{wishlist.length} saved items</p>
      {loading ? (
        <div className="flex-center" style={{ height: 200 }}><div className="spinner" /></div>
      ) : (
        <div className="grid-4">
          {products.map(p => (
            <ProductCard key={p.id} product={p}
              onClick={() => navigate(`/product/${p.id}`)}
              wishlisted={isWishlisted(p.id)}
              onWishlist={e => { e.stopPropagation(); toggle(p.id); }} />
          ))}
        </div>
      )}
    </div>
  );
}
