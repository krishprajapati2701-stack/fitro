import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { FitroLogoIcon } from "./components/FitroLogo";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import { Cart, Checkout } from "./pages/CartCheckout";
import Orders from "./pages/Orders";
import { Login, Register, ForgotPassword } from "./pages/Auth";
import { Contact, Profile } from "./pages/ContactProfile";
import HelpPage from "./pages/HelpPage";
import AdminPanel from "./pages/AdminPanel";
import Wishlist from "./pages/Wishlist";
import PolicyPage from "./pages/PolicyPage";
import AdminSiteSettings from "./pages/AdminSiteSettings";
import ScrollToTop from "./components/ScrollToTop";
import "./index.css";

// ─── Splash Screen ─────────────────────────────────────────────────────────────
function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState("in"); // "in" | "hold" | "out"

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 900);
    const t2 = setTimeout(() => setPhase("out"), 2000);
    const t3 = setTimeout(() => onDone(), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#0a0a0a",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      opacity: phase === "out" ? 0 : 1,
      transition: phase === "out" ? "opacity 0.6s ease" : "none",
    }}>
      {/* Subtle radial glow */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at 50% 50%, rgba(200,255,0,0.06) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        opacity: phase === "in" ? 0 : 1,
        transform: phase === "in" ? "scale(0.88)" : "scale(1)",
        transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
      }}>
        {/* Logo icon — same as navbar */}
        <div style={{ marginBottom: 12 }}>
          <svg width="90" height="90" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
            <path d="M18,4 L12,2 L4,9 L8,13 L11,11 L11,32 L25,32 L25,11 L28,13 L32,9 L24,2 L18,4 Q17,7 17,8 L18,9 L19,8 Q19,7 18,4 Z" fill="none" stroke="#f5f4f0" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M15,8 Q17,10 18,11 Q19,10 21,8" fill="none" stroke="#f5f4f0" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Brand name */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 56,
            letterSpacing: 10,
            color: "#f5f4f0",
            lineHeight: 1,
          }}>FITRO</span>
          <div style={{
            width: 8,
            height: 8,
            background: "var(--accent)",
            borderRadius: "50%",
            marginBottom: 4,
            animation: "dotPulse 1.2s ease-in-out infinite",
          }} />
        </div>

        {/* Tagline */}
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          letterSpacing: 5,
          color: "rgba(245,244,240,0.35)",
          textTransform: "uppercase",
          marginTop: 8,
        }}>
          Wear It Fit · Own It
        </div>
      </div>

      {/* Loading bar */}
      <div style={{
        position: "absolute",
        bottom: 60,
        left: "50%",
        transform: "translateX(-50%)",
        width: 120,
        height: 2,
        background: "rgba(200,255,0,0.15)",
        borderRadius: 1,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          background: "var(--accent)",
          borderRadius: 1,
          width: phase === "out" ? "100%" : phase === "hold" ? "80%" : "20%",
          transition: "width 1.2s ease",
        }} />
      </div>
    </div>
  );
}

// ─── Route Guards ──────────────────────────────────────────────────────────────
function ProtectedRoute({ children, adminOnly }) {
  const { currentUser, isAdmin } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  if (!adminOnly && isAdmin) return <Navigate to="/admin" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { currentUser, isAdmin } = useAuth();
  if (currentUser) return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<AppLayout><Home /></AppLayout>} />
      <Route path="/shop" element={<AppLayout><Shop /></AppLayout>} />
      <Route path="/product/:id" element={<AppLayout><ProductDetail /></AppLayout>} />
      <Route path="/contact" element={<AppLayout><Contact /></AppLayout>} />
      <Route path="/help" element={<AppLayout><HelpPage /></AppLayout>} />
      <Route path="/policy/:type" element={<AppLayout><PolicyPage /></AppLayout>} />

      {/* Auth */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      {/* User protected */}
      <Route path="/cart" element={<ProtectedRoute><AppLayout><Cart /></AppLayout></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute><AppLayout><Checkout /></AppLayout></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><AppLayout><Orders /></AppLayout></ProtectedRoute>} />
      <Route path="/wishlist" element={<ProtectedRoute><AppLayout><Wishlist /></AppLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin/*" element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}

      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "#1a1a1a",
                  color: "#f5f4f0",
                  border: "1px solid rgba(200,255,0,0.18)",
                  fontFamily: 'var(--font-body)',
                  fontSize: "13px",
                  letterSpacing: "0.5px",
                },
                success: { iconTheme: { primary: "var(--accent)", secondary: "#0a0a0a" } },
                error: { iconTheme: { primary: "#ff2d78", secondary: "#fff" } },
              }}
            />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </>
  );
}
