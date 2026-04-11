import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, User, Menu, X, LogOut, Settings, Package, Heart, Home, Search, HelpCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useWishlist } from "../pages/Home";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";

export default function Navbar() {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const { wishlist } = useWishlist();
  const [shippingBarText, setShippingBarText] = useState("Free shipping ₹999+  ·  7-day returns  ·  COD available  ·  Authentic premium quality  ·  New arrivals weekly");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "homepage"));
        if (snap.exists() && snap.data().shippingBar) {
          setShippingBarText(snap.data().shippingBar);
        }
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); setDropOpen(false); }, [location]);

  useEffect(() => {
    if (dropOpen) {
      const close = (e) => { if (!e.target.closest(".user-drop")) setDropOpen(false); };
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [dropOpen]);

  async function handleLogout() {
    await logout();
    toast.success("Logged out! See you soon.");
    navigate("/");
  }

  const isActive = (path) => location.pathname === path || location.pathname + location.search === path;

  const navLinks = [
    ["Shop", "/shop"],
    ["Men", "/shop?cat=Mens"],
    ["Women", "/shop?cat=Womens"],
    ["Unisex", "/shop?cat=Unisex"],
  ];

  return (
    <>
      {/* Announcement bar */}
      <div className="announcement">
        <div className="marquee-wrap">
          <div className="marquee-track">
            {("  ✦ " + shippingBarText + "  ✦  ").repeat(6)}
          </div>
        </div>
      </div>

      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: scrolled ? "rgba(13,13,13,0.97)" : "var(--ink2)",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: "1px solid var(--border)",
        transition: "all 0.3s ease",
      }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 62 }}>
          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, textDecoration: "none" }}>
            <svg width="32" height="32" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
              <path d="M18,4 L12,2 L4,9 L8,13 L11,11 L11,32 L25,32 L25,11 L28,13 L32,9 L24,2 L18,4 Q17,7 17,8 L18,9 L19,8 Q19,7 18,4 Z" fill="none" stroke="#f7f6f2" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M15,8 Q17,10 18,11 Q19,10 21,8" fill="none" stroke="#f7f6f2" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: 4, color: "var(--light)", lineHeight: 1 }}>
              FITRO
            </span>
            <span style={{ width: 6, height: 6, background: "var(--accent)", borderRadius: "50%", marginBottom: 2, flexShrink: 0, animation: "dotPulse 2s ease-in-out infinite" }} />
          </Link>

          {/* Desktop Links */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }} className="desktop-nav-links">
            {navLinks.map(([label, path]) => (
              <Link key={label} to={path} style={{
                padding: "6px 13px", borderRadius: 8, fontSize: 13.5, fontWeight: 500,
                color: isActive(path) ? "var(--accent)" : "var(--muted)",
                background: isActive(path) ? "rgba(232,197,71,0.08)" : "none",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { if (!isActive(path)) e.currentTarget.style.color = "var(--light)"; }}
                onMouseLeave={e => { if (!isActive(path)) e.currentTarget.style.color = "var(--muted)"; }}>
                {label}
              </Link>
            ))}
            {currentUser && !isAdmin && (
              <Link to="/orders" style={{ padding: "6px 13px", borderRadius: 8, fontSize: 13.5, fontWeight: 500, color: isActive("/orders") ? "var(--accent)" : "var(--muted)", transition: "all 0.2s" }}
                onMouseEnter={e => { if (!isActive("/orders")) e.currentTarget.style.color = "var(--light)"; }}
                onMouseLeave={e => { if (!isActive("/orders")) e.currentTarget.style.color = "var(--muted)"; }}>
                Orders
              </Link>
            )}
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {currentUser ? (
              <>
                {!isAdmin && (
                  <>
                    <Link to="/wishlist" style={{ position: "relative", padding: 8, color: "var(--muted)", display: "flex", borderRadius: 8, transition: "color 0.2s" }}
                      className="desktop-only"
                      onMouseEnter={e => e.currentTarget.style.color = "var(--light)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}>
                      <Heart size={18} />
                      {wishlist.length > 0 && <span style={{ position: "absolute", top: 3, right: 3, background: "var(--rose)", color: "white", fontSize: 8, fontWeight: 700, width: 14, height: 14, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{wishlist.length}</span>}
                    </Link>
                    <Link to="/cart" style={{ position: "relative", padding: 8, color: "var(--muted)", display: "flex", borderRadius: 8, transition: "color 0.2s" }}
                      className="desktop-only"
                      onMouseEnter={e => e.currentTarget.style.color = "var(--light)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}>
                      <ShoppingBag size={18} />
                      {count > 0 && <span style={{ position: "absolute", top: 3, right: 3, background: "var(--accent)", color: "var(--ink)", fontSize: 8, fontWeight: 700, width: 14, height: 14, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{count}</span>}
                    </Link>
                  </>
                )}
                <div style={{ position: "relative" }} className="user-drop">
                  <button onClick={(e) => { e.stopPropagation(); setDropOpen(!dropOpen); }}
                    style={{ background: "var(--ink3)", border: "1px solid var(--border)", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--light)" }}>
                    <User size={15} />
                  </button>
                  {dropOpen && (
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "var(--ink2)", border: "1px solid var(--border)", borderRadius: 14, padding: 8, minWidth: 200, zIndex: 200, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
                      <div style={{ padding: "10px 12px 12px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{userProfile?.name || "User"}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{currentUser.email}</div>
                        {isAdmin && <span className="badge badge-gold" style={{ marginTop: 6, fontSize: 9 }}>Admin</span>}
                      </div>
                      {isAdmin ? (
                        <NavDropItem label="Admin Panel" to="/admin" icon={<Settings size={13} />} onClick={() => setDropOpen(false)} />
                      ) : (
                        <>
                          <NavDropItem label="My Orders" to="/orders" icon={<Package size={13} />} onClick={() => setDropOpen(false)} />
                          <NavDropItem label="Wishlist" to="/wishlist" icon={<Heart size={13} />} onClick={() => setDropOpen(false)} />
                          <NavDropItem label="Profile" to="/profile" icon={<User size={13} />} onClick={() => setDropOpen(false)} />
                        </>
                      )}
                      <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", background: "none", border: "none", color: "var(--rose)", cursor: "pointer", fontSize: 13, borderRadius: 8, fontFamily: "var(--font-body)", fontWeight: 500 }}>
                        <LogOut size={13} /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <Link to="/login" className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: 13 }}>Login</Link>
                <Link to="/register" className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 13 }}>Sign up</Link>
              </div>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: "none", border: "none", color: "var(--light)", cursor: "pointer", padding: 8, display: "none", alignItems: "center" }}
              className="mobile-hamburger">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background: "var(--ink2)", borderTop: "1px solid var(--border)", padding: "14px 18px 22px" }}>
            {[["Shop All", "/shop"], ["Men", "/shop?cat=Mens"], ["Women", "/shop?cat=Womens"], ["Unisex", "/shop?cat=Unisex"], ["Contact", "/contact"]].map(([l, p]) => (
              <Link key={l} to={p} style={{ display: "block", padding: "11px 4px", fontSize: 16, fontWeight: 500, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>{l}</Link>
            ))}
            {currentUser && !isAdmin && (
              <>
                <Link to="/orders" style={{ display: "block", padding: "11px 4px", fontSize: 16, fontWeight: 500, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Orders</Link>
                <Link to="/profile" style={{ display: "block", padding: "11px 4px", fontSize: 16, fontWeight: 500, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Profile</Link>
              </>
            )}
            {currentUser && isAdmin && (
              <Link to="/admin" style={{ display: "block", padding: "11px 4px", fontSize: 16, fontWeight: 600, color: "var(--accent)", borderBottom: "1px solid var(--border)" }}>Admin Panel</Link>
            )}
            {!currentUser && (
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <Link to="/login" className="btn btn-ghost" style={{ flex: 1 }}>Login</Link>
                <Link to="/register" className="btn btn-primary" style={{ flex: 1 }}>Sign up</Link>
              </div>
            )}
            {currentUser && (
              <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "11px 4px", background: "none", border: "none", color: "var(--rose)", cursor: "pointer", fontSize: 16, fontWeight: 500, marginTop: 4 }}>
                <LogOut size={16} /> Logout
              </button>
            )}
          </div>
        )}
      </nav>

      {/* Mobile Bottom Nav */}
      {currentUser && !isAdmin && (
        <nav className="mobile-bottom-nav">
          {[
            ["/", <Home size={20} />, "Home"],
            ["/shop", <Search size={20} />, "Shop"],
            ["/wishlist", <Heart size={20} />, "Saved", wishlist.length],
            ["/cart", <ShoppingBag size={20} />, "Cart", count],
            ["/help", <HelpCircle size={20} />, "Help"],
          ].map(([path, icon, label, badge]) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 4px", color: active ? "var(--accent)" : "var(--muted)", position: "relative", textDecoration: "none" }}>
                <div style={{ position: "relative" }}>
                  {icon}
                  {badge > 0 && <span style={{ position: "absolute", top: -4, right: -6, background: "var(--accent)", color: "var(--ink)", fontSize: 9, fontWeight: 700, width: 14, height: 14, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid var(--ink)" }}>{badge > 9 ? "9+" : badge}</span>}
                </div>
                <span style={{ fontSize: 9, fontWeight: active ? 600 : 400, letterSpacing: 0.5 }}>{label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {!currentUser && (
        <nav className="mobile-bottom-nav">
          {[["/", <Home size={20} />, "Home"], ["/shop", <Search size={20} />, "Shop"], ["/help", <HelpCircle size={20} />, "Help"], ["/login", <User size={20} />, "Login"]].map(([path, icon, label]) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 4px", color: active ? "var(--accent)" : "var(--muted)", textDecoration: "none" }}>
                {icon}
                <span style={{ fontSize: 9, fontWeight: active ? 600 : 400 }}>{label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      <style>{`
        @media (max-width: 767px) {
          .desktop-nav-links { display: none !important; }
          .desktop-only { display: none !important; }
          .mobile-hamburger { display: flex !important; }
        }
        @media (min-width: 768px) { .mobile-hamburger { display: none !important; } }
      `}</style>
    </>
  );
}

function NavDropItem({ label, to, icon, onClick }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => { navigate(to); onClick(); }}
      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 12px", background: "none", border: "none", color: "var(--light)", cursor: "pointer", fontSize: 13, borderRadius: 8, textAlign: "left", minHeight: 40, fontFamily: "var(--font-body)", fontWeight: 500 }}>
      {icon} {label}
    </button>
  );
}
