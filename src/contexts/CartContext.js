import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const { currentUser } = useAuth();
  const [cart, setCart] = useState([]);

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
      return [...prev, { key, productId: product.id, name: product.name, price: product.price, image: product.images?.[0] || "", size, qty, category: product.category }];
    });
  }

  function removeFromCart(key) { setCart((prev) => prev.filter((i) => i.key !== key)); }
  function updateQty(key, qty) {
    if (qty < 1) return removeFromCart(key);
    setCart((prev) => prev.map((i) => i.key === key ? { ...i, qty } : i));
  }
  function clearCart() { setCart([]); }

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = cart.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}
