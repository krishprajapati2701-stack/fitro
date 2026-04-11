import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

const STATUS_STEPS = ["pending", "confirmed", "shipped", "delivered"];

function getStatusColor(status) {
  const map = { pending: "#fbbf24", confirmed: "#60a5fa", shipped: "#a78bfa", delivered: "#4ade80", cancelled: "#f87171", return_requested: "#fb923c", returned: "#9ca3af" };
  return map[status] || "#888";
}

function getStatusLabel(status) {
  const map = { pending: "⏳ Order Placed", confirmed: "✅ Confirmed", shipped: "🚚 Shipped", delivered: "📦 Delivered", cancelled: "❌ Cancelled", return_requested: "↩️ Return Requested", returned: "✔️ Returned" };
  return map[status] || status;
}

function ReturnModal({ order, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");
  const reasons = ["Wrong size received", "Product damaged/defective", "Wrong product delivered", "Quality not as expected", "Changed my mind", "Other"];

  function submit() {
    const finalReason = reason === "Other" ? custom : reason;
    if (!finalReason.trim()) { toast.error("Please select a return reason!"); return; }
    onSubmit(finalReason);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 2 }}>RETURN REQUEST</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        <div style={{ background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.22)", borderRadius: 9, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "rgba(245,244,240,0.7)" }}>
          ⚠️ Returns accepted within <strong style={{ color: "#fb923c" }}>7 days of delivery</strong>. Items must be unworn with original tags.
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="label" style={{ marginBottom: 8 }}>Select Return Reason *</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reasons.map(r => (
              <button key={r} onClick={() => setReason(r)} style={{ padding: "10px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left", fontWeight: 600, fontSize: 13, background: reason === r ? "rgba(200,255,0,0.08)" : "var(--ink3)", border: `1.5px solid ${reason === r ? "var(--accent)" : "#2a2a2a"}`, color: reason === r ? "var(--accent)" : "var(--light)", transition: "all 0.2s" }}>
                {r}
              </button>
            ))}
          </div>
        </div>
        {reason === "Other" && (
          <div className="form-group">
            <label className="label">Describe your reason *</label>
            <textarea value={custom} onChange={e => setCustom(e.target.value)} className="input" rows={3} placeholder="Please describe the issue..." />
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={submit} className="btn btn-primary" style={{ flex: 1, justifyContent: "center", fontSize: 11 }}>Submit Return Request</button>
          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: 11 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [returnModal, setReturnModal] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "orders"), where("userId", "==", currentUser.uid)));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setOrders(data);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [currentUser]);

  async function submitReturn(order, reason) {
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "return_requested", returnReason: reason, returnRequestedAt: serverTimestamp() });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "return_requested", returnReason: reason } : o));
      setReturnModal(null);
      toast.success("Return request submitted! 📦");
    } catch (e) { toast.error("Failed to submit return request"); }
  }

  if (loading) return <div className="flex-center" style={{ height: "60vh" }}><div className="spinner" /></div>;

  if (orders.length === 0) return (
    <div className="flex-center" style={{ flexDirection: "column", minHeight: "70vh", gap: 16 }}>
      <div style={{ fontSize: 64 }}>📦</div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2 }}>NO ORDERS YET</h2>
      <p style={{ color: "var(--muted)" }}>Time to get your first FITRO drop!</p>
      <Link to="/shop" className="btn btn-primary">Shop Now</Link>
    </div>
  );

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 3, marginBottom: 8 }}>MY ORDERS</h1>
      <p style={{ color: "var(--muted)", marginBottom: 28, fontFamily: "var(--font-body)", letterSpacing: 1 }}>{orders.length} total orders</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {orders.map(order => {
          const isExp = expanded === order.id;
          const stepIdx = STATUS_STEPS.indexOf(order.status);
          const canReturn = order.status === "delivered";

          return (
            <div key={order.id} className="card">
              <div onClick={() => setExpanded(isExp ? null : order.id)} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: 3, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>
                    {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recent"}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 1 }}>#{order.id.slice(0, 10).toUpperCase()}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ color: getStatusColor(order.status), fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>{getStatusLabel(order.status)}</span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--accent)", letterSpacing: 1 }}>₹{order.total}</span>
                  {isExp ? <ChevronUp size={16} color="var(--muted)" /> : <ChevronDown size={16} color="var(--muted)" />}
                </div>
              </div>

              {isExp && (
                <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                  {/* Progress */}
                  {!["cancelled", "return_requested", "returned"].includes(order.status) && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", maxWidth: 500 }}>
                        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 2, background: "var(--ink3)", transform: "translateY(-50%)", zIndex: 0 }} />
                        <div style={{ position: "absolute", left: 0, top: "50%", height: 2, background: "var(--accent)", transform: "translateY(-50%)", zIndex: 1, width: stepIdx >= 0 ? `${(stepIdx / (STATUS_STEPS.length - 1)) * 100}%` : "0%" }} />
                        {STATUS_STEPS.map((step, i) => (
                          <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative", zIndex: 2 }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: i <= stepIdx ? "var(--accent)" : "var(--ink3)", border: `2px solid ${i <= stepIdx ? "var(--accent)" : "#2a2a2a"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                              {i <= stepIdx ? "✓" : ""}
                            </div>
                            <span style={{ fontSize: 9, color: i <= stepIdx ? "var(--accent)" : "var(--muted)", fontFamily: "var(--font-body)", letterSpacing: 1.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: 3, color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>Items</div>
                    {order.items?.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, background: "var(--ink3)", borderRadius: 10, padding: "10px 12px" }}>
                        {(item.image || item.images?.[0]) && (
                          <img
                            src={item.image || item.images?.[0]}
                            alt={item.name}
                            style={{ width: 56, height: 68, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "var(--ink2)" }}
                            onError={e => e.target.style.display = "none"}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Size: {item.size} · Qty: {item.qty}</div>
                        </div>
                        <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 14 }}>₹{item.price * item.qty}</span>
                      </div>
                    ))}
                  </div>

                  {/* Delivery date & tracking */}
                  {(order.estimatedDelivery || order.trackingId) && (
                    <div style={{ marginBottom: 16, background: "rgba(232,197,71,0.06)", border: "1px solid rgba(232,197,71,0.2)", borderRadius: 10, padding: "12px 16px" }}>
                      {order.estimatedDelivery && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: order.trackingId ? 8 : 0, fontSize: 13 }}>
                          <span style={{ fontSize: 16 }}>📅</span>
                          <div>
                            <span style={{ color: "var(--muted)", fontSize: 11, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Estimated Delivery</span>
                            <span style={{ color: "var(--accent)", fontWeight: 700 }}>{order.estimatedDelivery}</span>
                          </div>
                        </div>
                      )}
                      {order.trackingId && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                          <span style={{ fontSize: 16 }}>🚚</span>
                          <div>
                            <span style={{ color: "var(--muted)", fontSize: 11, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Tracking ID (AWB)</span>
                            <span style={{ fontFamily: "var(--font-mono)", color: "var(--light)", fontWeight: 600 }}>{order.trackingId}</span>
                            <span style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 2 }}>Use this number on your courier's website to track your package</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Address */}
                  {order.address && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: 3, color: "var(--muted)", textTransform: "uppercase", marginBottom: 6 }}>Delivery Address</div>
                      <div style={{ fontSize: 13, color: "rgba(245,244,240,0.65)" }}>
                        {order.address.name} · {order.address.phone}<br />
                        {order.address.address}, {order.address.city}, {order.address.state} — {order.address.pincode}
                      </div>
                    </div>
                  )}

                  {/* Payment */}
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: 2, color: "var(--muted)", textTransform: "uppercase", marginBottom: 3 }}>Payment</div>
                      <div style={{ fontSize: 13, textTransform: "uppercase", fontFamily: "var(--font-body)", letterSpacing: 1 }}>
                        {order.paymentMethod === "razorpay" ? "Razorpay (Online)" : order.paymentMethod === "upi" ? "UPI" : "Cash on Delivery"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: 2, color: "var(--muted)", textTransform: "uppercase", marginBottom: 3 }}>Status</div>
                      <div style={{ fontSize: 13, fontFamily: "var(--font-body)", letterSpacing: 1,
                        color: (order.paymentStatus === "verified" || order.paymentStatus === "paid") ? "#4ade80"
                          : order.paymentStatus === "pending_verification" ? "#fbbf24"
                          : order.paymentStatus === "pending_razorpay" ? "#fbbf24"
                          : "var(--muted)"
                      }}>
                        {(order.paymentStatus === "verified" || order.paymentStatus === "paid") ? "✅ Paid"
                          : order.paymentStatus === "pending_verification" ? "⏳ Pending Verification"
                          : order.paymentStatus === "pending_razorpay" ? "⏳ Awaiting Confirmation"
                          : order.paymentStatus === "cod" ? "💵 Pay on Delivery"
                          : "💵 Pay on Delivery"}
                      </div>
                    </div>
                  </div>

                  {canReturn && (
                    <button onClick={() => setReturnModal(order)} className="btn btn-secondary" style={{ fontSize: 11 }}>
                      <RotateCcw size={13} /> Request Return
                    </button>
                  )}
                  {order.status === "return_requested" && (
                    <div style={{ background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.22)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#fb923c" }}>
                      ↩️ Return requested: <em style={{ color: "rgba(245,244,240,0.5)" }}>{order.returnReason}</em>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>We're reviewing your request. You'll be notified once approved.</div>
                    </div>
                  )}
                  {order.status === "return_approved" && (
                    <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 10, padding: "12px 16px" }}>
                      <div style={{ fontWeight: 700, color: "#4ade80", fontSize: 14, marginBottom: 8 }}>✅ Return Approved!</div>
                      {order.returnPickupDate && (
                        <div style={{ fontSize: 13, marginBottom: 4 }}>
                          📅 <strong>Pickup Date:</strong> <span style={{ color: "var(--accent)" }}>{order.returnPickupDate}</span>
                        </div>
                      )}
                      {order.returnPickupInfo && (
                        <div style={{ fontSize: 13, marginBottom: 4 }}>
                          🚚 <strong>Pickup Info:</strong> {order.returnPickupInfo}
                        </div>
                      )}
                      {order.adminReturnNote && (
                        <div style={{ fontSize: 13, background: "var(--ink3)", borderRadius: 8, padding: "8px 10px", marginTop: 8 }}>
                          📝 <strong>Note from FITRO:</strong> {order.adminReturnNote}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Please keep the product packed and ready for pickup.</div>
                    </div>
                  )}
                  {order.status === "returned" && (
                    <div style={{ background: "rgba(156,163,175,0.07)", border: "1px solid rgba(156,163,175,0.25)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#9ca3af" }}>
                      ✔️ Return completed. Thank you!
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {returnModal && (
        <ReturnModal order={returnModal} onClose={() => setReturnModal(null)} onSubmit={(reason) => submitReturn(returnModal, reason)} />
      )}
    </div>
  );
}
