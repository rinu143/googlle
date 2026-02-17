import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import cors from "cors";
import dotenv from "dotenv";
import { FieldValue } from "firebase-admin/firestore";
import { db, auth } from "./firebaseAdmin.js";
import { sendWelcomeEmail } from "./services/mailer.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ---------- UTILITIES ----------

function generatePassword(email, phone) {
  let local = email.split("@")[0];
  let part1 = (local + phone).slice(0, 3);
  let part2 = phone.slice(0, 3);
  let random = Math.floor(Math.random() * 10);
  return part1 + part2 + random;
}

function generateSlug(email) {
  return email.slice(0, 3).toLowerCase();
}

// ---------- CREATE ORDER ----------
app.post("/create-order", async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        error: "Razorpay keys are missing in server env.",
        message: "Razorpay keys are missing in server env.",
      });
    }

    const configSnap = await db.collection("config").doc("app").get();
    if (!configSnap.exists) {
      return res.status(400).json({
        error: "Signup price config not found.",
        message: "Signup price config not found.",
      });
    }

    const amount = Number(configSnap.data()?.signupPrice);
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: "Invalid signup price in config/app.",
        message: "Invalid signup price in config/app.",
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
    });

    res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (e) {
    console.error("create-order error:", e);
    res.status(500).json({ error: e.message, message: e.message });
  }
});

// ---------- VERIFY PAYMENT & CREATE USER ----------
app.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email, phone } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !email || !phone) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Missing required fields",
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        error: "Razorpay secret is missing in server env.",
        message: "Razorpay secret is missing in server env.",
      });
    }

    // verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expected !== razorpay_signature)
      return res.status(400).json({
        error: "Payment verification failed",
        message: "Payment verification failed",
      });

    // prevent duplicates
    const existing = await db.collection("users").where("email", "==", email).get();

    if (!existing.empty)
      return res.status(409).json({
        error: "Email already registered",
        message: "Email already registered",
      });

    const password = generatePassword(email, phone);
    const slug = generateSlug(email);

    // create auth user
    const userRecord = await auth.createUser({
      email,
      password,
      phoneNumber: "+91" + phone,
      emailVerified: true,
      disabled: false,
    });

    // firestore profile
    await db.collection("users").doc(userRecord.uid).set({
      email,
      phone,
      slug,
      role: "performer",
      createdAt: FieldValue.serverTimestamp(),
    });

    await db.collection("slugs").doc(slug).set({
      uid: userRecord.uid,
    });

    await sendWelcomeEmail(email, password, slug);

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message, message: e.message });
  }
});

// ---------- ADMIN CREATE USER ----------
app.post("/admin-create-user", async (req, res) => {
  try {
    const { email, phone } = req.body;

    const password = generatePassword(email, phone);
    const slug = generateSlug(email);

    const userRecord = await auth.createUser({
      email,
      password,
      phoneNumber: "+91" + phone,
      emailVerified: true,
      disabled: false,
    });

    await db.collection("users").doc(userRecord.uid).set({
      email,
      phone,
      slug,
      role: "performer",
      createdAt: FieldValue.serverTimestamp(),
    });

    await db.collection("slugs").doc(slug).set({
      uid: userRecord.uid,
    });

    await sendWelcomeEmail(email, password, slug);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
