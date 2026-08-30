import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// A product's `comboGroup` field must match one of these keys to take part
// in a combo deal. Keep this in sync with the dropdown in AdminPanel.js.
export const COMBO_GROUP_LABELS = {
  oversize: "Oversized Tee",
  regular: "Regular Tee",
};

export const DEFAULT_COMBO_OFFERS = {
  oversize: { enabled: false, qty: 3, price: 1299 },
  regular: { enabled: false, qty: 4, price: 1299 },
};

// Live-listens to settings/site so admin changes to combo pricing show up
// instantly for every shopper — no refresh needed, same pattern used for
// live stock elsewhere in this app.
export function useComboOffers() {
  const [comboOffers, setComboOffers] = useState(DEFAULT_COMBO_OFFERS);
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "site"),
      (snap) => {
        const data = snap.exists() ? snap.data().comboOffers : null;
        setComboOffers({
          oversize: { ...DEFAULT_COMBO_OFFERS.oversize, ...(data?.oversize || {}) },
          regular: { ...DEFAULT_COMBO_OFFERS.regular, ...(data?.regular || {}) },
        });
      },
      () => {}
    );
    return () => unsub();
  }, []);
  return comboOffers;
}

// Works out combo-priced totals for a cart. For each enabled combo group
// (e.g. "oversize"), every unit of every cart item tagged with that group is
// pooled together — regardless of which product or size it is. Full bundles
// of `qty` units are charged at the flat `price`; anything left over is
// charged at its own regular price. The priciest units are always the ones
// pulled into a bundle first, so any leftover (regular-priced) units are
// always the cheapest ones — this maximizes the customer's discount and
// guarantees a combo is never worse than buying items individually.
export function computeComboPricing(cart, comboOffers) {
  const breakdown = {};
  let discount = 0;

  for (const groupKey of Object.keys(comboOffers || {})) {
    const cfg = comboOffers[groupKey];
    if (!cfg?.enabled || !cfg.qty || cfg.qty < 2 || !cfg.price) continue;

    const units = [];
    cart.forEach((item) => {
      if (item.comboGroup !== groupKey) return;
      for (let i = 0; i < item.qty; i++) units.push(item.price);
    });
    if (units.length < cfg.qty) continue;

    units.sort((a, b) => b - a); // priciest units go into the bundle first
    const fullChunks = Math.floor(units.length / cfg.qty);
    const inCombo = units.slice(0, fullChunks * cfg.qty);
    const leftover = units.slice(fullChunks * cfg.qty);
    const naiveComboPortion = inCombo.reduce((s, p) => s + p, 0);
    const comboPortionTotal = fullChunks * cfg.price;
    const leftoverTotal = leftover.reduce((s, p) => s + p, 0);
    const groupDiscount = naiveComboPortion - comboPortionTotal;

    // Never let a "deal" make the customer pay more than regular pricing.
    if (groupDiscount <= 0) continue;

    discount += groupDiscount;
    breakdown[groupKey] = {
      qty: cfg.qty,
      comboPrice: cfg.price,
      fullChunks,
      totalUnits: units.length,
      leftoverQty: leftover.length,
      leftoverTotal,
      groupTotal: comboPortionTotal + leftoverTotal,
      discount: groupDiscount,
      unitsToNextCombo: leftover.length > 0 ? cfg.qty - leftover.length : 0,
    };
  }

  return { discount: Math.max(0, Math.round(discount)), breakdown };
}
