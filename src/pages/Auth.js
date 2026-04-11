import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { FitroLogotype } from "../components/FitroLogo";
import toast from "react-hot-toast";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const ADMIN_EMAIL = "fitrostore1@gmail.com";

function AuthLayout({ children, title, subtitle }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--ink)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(200,255,0,0.04) 0%, transparent 60%)", pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 440, position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link to="/" style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <FitroLogotype size={30} />
          </Link>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{title}</h2>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>{subtitle}</p>
        </div>
        <div className="card" style={{ padding: 32 }}>{children}</div>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, name }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} name={name} className="input" style={{ paddingRight: 44 }} />
      <button type="button" onClick={() => setShow(!show)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const isPhone = /^[0-9]{10}$/.test(identifier.trim());

  async function handleSubmit(e) {
    e.preventDefault();
    if (!identifier || !password) return toast.error("Fill all fields!");
    setLoading(true);
    try {
      let emailToUse = identifier.trim();

      if (isPhone) {
        const q = query(collection(db, "users"), where("phone", "==", identifier.trim()));
        const snap = await getDocs(q);
        if (snap.empty) {
          toast.error("No account found with this mobile number!");
          setLoading(false);
          return;
        }
        emailToUse = snap.docs[0].data().email;
      }

      await login(emailToUse, password);
      toast.success("Welcome back! 🔥");
      if (emailToUse === ADMIN_EMAIL) navigate("/admin");
      else navigate("/");
    } catch (err) {
      let msg = "Login failed";
      if (err.code === "auth/user-not-found") msg = "No account found. Sign up first!";
      else if (err.code === "auth/wrong-password") msg = "Wrong password!";
      else if (err.code === "auth/invalid-credential") msg = "Invalid credentials. Check your details!";
      toast.error(msg);
    }
    setLoading(false);
  }

  return (
    <AuthLayout title="Welcome back 👋" subtitle="Login to your FITRO account">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label">Email or Mobile Number</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="your@email.com or 10-digit mobile"
              className="input"
              style={{ paddingLeft: 40 }}
            />
            {isPhone
              ? <Phone size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              : <Mail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            }
          </div>
        </div>
        <div className="form-group">
          <label className="label">Password</label>
          <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
        </div>
        <div style={{ textAlign: "right", marginBottom: 20, marginTop: -8 }}>
          <Link to="/forgot-password" style={{ fontSize: 13, color: "var(--accent)" }}>Forgot password?</Link>
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: 14, fontSize: 12 }} disabled={loading}>
          {loading ? "Logging in..." : "Login ⚡"}
        </button>
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--muted)" }}>
          New here? <Link to="/register" style={{ color: "var(--accent)", fontWeight: 600 }}>Sign Up</Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export function Register() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const { name, email, phone, password, confirmPassword } = form;
    if (!name || !email || !phone || !password || !confirmPassword) return toast.error("Fill all fields!");
    if (password !== confirmPassword) return toast.error("Passwords don't match!");
    if (password.length < 6) return toast.error("Password must be at least 6 characters!");
    if (!/^[0-9]{10}$/.test(phone)) return toast.error("Enter valid 10-digit phone number!");
    if (email === ADMIN_EMAIL) return toast.error("This email is reserved!");
    setLoading(true);
    try {
      await register({ email, password, name, phone });
      toast.success("Welcome to FITRO! 🎉");
      navigate("/");
    } catch (err) {
      let msg = "Registration failed";
      if (err.code === "auth/email-already-in-use") msg = "Email already registered! Please login.";
      else if (err.message) msg = err.message;
      toast.error(msg);
    }
    setLoading(false);
  }

  return (
    <AuthLayout title="Join the Fit Gang ✌️" subtitle="Create your FITRO account">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label">Full Name</label>
          <div style={{ position: "relative" }}>
            <input type="text" value={form.name} onChange={set("name")} placeholder="Your name" className="input" style={{ paddingLeft: 40 }} />
            <User size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          </div>
        </div>
        <div className="form-group">
          <label className="label">Email</label>
          <div style={{ position: "relative" }}>
            <input type="email" value={form.email} onChange={set("email")} placeholder="your@email.com" className="input" style={{ paddingLeft: 40 }} />
            <Mail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          </div>
        </div>
        <div className="form-group">
          <label className="label">Phone Number</label>
          <div style={{ position: "relative" }}>
            <input type="tel" value={form.phone} onChange={set("phone")} placeholder="10-digit mobile number" className="input" style={{ paddingLeft: 40 }} />
            <Phone size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          </div>
        </div>
        <div className="form-group">
          <label className="label">Password</label>
          <PasswordInput value={form.password} onChange={set("password")} placeholder="Min 6 characters" />
        </div>
        <div className="form-group">
          <label className="label">Confirm Password</label>
          <PasswordInput value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="Repeat password" />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: 14, fontSize: 12, marginTop: 4 }} disabled={loading}>
          {loading ? "Creating account..." : "Create Account ⚡"}
        </button>
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--muted)" }}>
          Already have an account? <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>Login</Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return toast.error("Enter your email!");
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast.success("Reset link sent! Check your email 📧");
    } catch (err) {
      toast.error("Failed to send reset email");
    }
    setLoading(false);
  }

  return (
    <AuthLayout title="Forgot Password 🔐" subtitle="We'll send you a reset link">
      {sent ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Check your inbox!</div>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>Reset link sent to {email}</p>
          <Link to="/login" className="btn btn-primary" style={{ fontSize: 11 }}>Back to Login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Email Address</label>
            <div style={{ position: "relative" }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="input" style={{ paddingLeft: 40 }} />
              <Mail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: 14, fontSize: 12 }} disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Link to="/login" style={{ fontSize: 13, color: "var(--accent)" }}>← Back to Login</Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
