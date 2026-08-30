import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useComboOffers, computeComboPricing } from "../utils/comboOffers";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const { currentUser } = useAuth();
  const [cart, setCart] = useState([]);
  const comboOffers = useComboOffers();

  useEffect(() => {
    if (currentUser) {
      const saved = localStorage.getItem(`fitro_cart_${currentUser.uid}`);
      if (saved) setCart(JSON.parse(saved));
    } else {
      setCart([]);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`fitro_cart_${currentUser.uid}`, JSON.stringify(cart));
    }
  }, [cart, currentUser]);

  function addToCart(product, size, qty = 1) {
    setCart((prev) => {
      const key = `${product.id}_${size}`;
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => i.key === key ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, { key, productId: product.id, name: product.name, price: product.price, image: product.images?.[0] || "", size, qty, category: product.category, comboGroup: product.comboGroup || null }];
    });
  }

  function removeFromCart(key) { setCart((prev) => prev.filter((i) => i.key !== key)); }
  function updateQty(key, qty) {
    if (qty < 1) return removeFromCart(key);
    setCart((prev) => prev.map((i) => i.key === key ? { ...i, qty } : i));
  }
  function clearCart() { setCart([]); }

  // rawTotal: plain sum of line items (what's shown per-item). total: after
  // any combo-deal discount (e.g. "3 Oversized Tees for ₹1299") is applied.
  const rawTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  const { discount: comboDiscount, breakdown: comboBreakdown } = computeComboPricing(cart, comboOffers);
  const total = Math.max(0, rawTotal - comboDiscount);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, total, rawTotal, count, comboOffers, comboDiscount, comboBreakdown }}>
      {children}
    </CartContext.Provider>
  );
}
