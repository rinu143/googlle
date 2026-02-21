import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Signup.css";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    if (window.Razorpay) return;

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      setError("Username is required.");
      return;
    }

    if (!/^\d{10}$/.test(normalizedPhone)) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    if (!window.Razorpay) {
      setError("Payment gateway failed to load. Please refresh and try again.");
      return;
    }

    setLoading(true);

    try {
      const createOrderRes = await fetch(`${API_BASE}/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          phone: normalizedPhone,
        }),
      });

      if (!createOrderRes.ok) {
        const createOrderError = await createOrderRes.json();
        throw new Error(
          createOrderError.message ||
            createOrderError.error ||
            "Unable to create order.",
        );
      }

      const { keyId, orderId, amount, currency } = await createOrderRes.json();

      const razorpay = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: "Mentalism Portal",
        description: "Performer account signup",
        prefill: {
          email: normalizedEmail,
          contact: normalizedPhone,
        },
        handler: async (response) => {
          try {
            const verifyRes = await fetch(
              `${API_BASE}/verify-payment`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  email: normalizedEmail,
                  phone: normalizedPhone,
                  username: normalizedUsername,
                }),
              },
            );

            if (!verifyRes.ok) {
              const verifyErrorData = await verifyRes.json();
              throw new Error(
                verifyErrorData.message ||
                  verifyErrorData.error ||
                  "Payment verified but account creation failed.",
              );
            }

            await verifyRes.json();

            setSuccess("Account created. Check your email.");
            setUsername("");
            setEmail("");
            setPhone("");
          } catch (verifyError) {
            console.error(verifyError);
            setError(
              verifyError.message || "Payment verified but account creation failed.",
            );
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      });

      razorpay.open();
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to start payment. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Create Performer Account</h2>

        {error && <div className="login-error">{error}</div>}
        {success && <div className="signup-success">{success}</div>}

        <form onSubmit={onSubmit} className="login-form">
          <div className="login-input-group">
            <label className="login-label">Username</label>
            <input
              className="login-input"
              type="text"
              placeholder="Your display name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="login-input-group">
            <label className="login-label">Email</label>
            <input
              className="login-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-input-group">
            <label className="login-label">Phone Number</label>
            <input
              className="login-input"
              type="tel"
              placeholder="10 digit number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? <span className="spinner"></span> : "Pay & Create Account"}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => nav("/login")}
            disabled={loading}
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}
