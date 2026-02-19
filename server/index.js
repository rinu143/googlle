import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import cors from "cors";
import dotenv from "dotenv";
import { FieldValue } from "firebase-admin/firestore";
import { db, auth, messaging } from "./firebaseAdmin.js";
import { sendWelcomeEmail } from "./services/mailer.js";

dotenv.config();

const app = express();
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true }));

const requiredEnv = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "RESEND_API_KEY",
];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`Missing ENV: ${key}`);
  }
});

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

function getEmailPrefix(email) {
  return (email || "").split("@")[0] || "user";
}

async function generateUniqueSlug(email) {
  const localPart = (email || "").split("@")[0] || "";
  const cleaned = localPart.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalized = cleaned || "user";

  const startLength = Math.min(3, normalized.length);
  for (let length = startLength; length <= normalized.length; length++) {
    const candidate = normalized.slice(0, length);
    const candidateSnap = await db.collection("slugs").doc(candidate).get();
    if (!candidateSnap.exists) {
      return candidate;
    }
  }

  const base = normalized.slice(0, Math.min(3, normalized.length)) || "user";
  let suffix = 1;
  while (true) {
    const candidate = `${base}${suffix}`;
    const candidateSnap = await db.collection("slugs").doc(candidate).get();
    if (!candidateSnap.exists) {
      return candidate;
    }
    suffix++;
  }
}

function parseBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    const error = new Error("Missing or invalid Authorization header");
    error.status = 401;
    throw error;
  }
  return authHeader.slice("Bearer ".length).trim();
}

async function verifyAdminRequester(req) {
  const token = parseBearerToken(req);
  const decoded = await auth.verifyIdToken(token);
  const requesterSnap = await db.collection("users").doc(decoded.uid).get();

  if (!requesterSnap.exists || requesterSnap.data()?.role !== "admin") {
    const error = new Error("Admin access required");
    error.status = 403;
    throw error;
  }
}

async function deleteQueryBatch(baseQuery, batchSize = 500) {
  while (true) {
    const snap = await baseQuery.limit(batchSize).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    if (snap.size < batchSize) break;
  }
}

async function sendPush(uid, word) {
  if (!uid || !word) return;

  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) return;

  if (userSnap.data()?.notificationsEnabled !== true) return;

  const tokensSnap = await db
    .collection("devices")
    .doc(uid)
    .collection("tokens")
    .get();

  if (tokensSnap.empty) return;

  const tokens = tokensSnap.docs.map((d) => d.id).filter(Boolean);
  if (tokens.length === 0) return;

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: String(word),
      body: "",
    },
    webpush: {
      notification: {
        tag: "latest-search",
        renotify: true,
      },
    },
  });

  const cleanupBatch = db.batch();
  let hasCleanup = false;

  response.responses.forEach((result, index) => {
    if (result.success) return;

    const code = result.error?.code;
    const isInvalidToken =
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token";

    if (!isInvalidToken) return;

    const token = tokens[index];
    if (!token) return;

    cleanupBatch.delete(
      db.collection("devices").doc(uid).collection("tokens").doc(token),
    );
    hasCleanup = true;
  });

  if (hasCleanup) {
    await cleanupBatch.commit();
  }
}

// ---------- CREATE ORDER ----------
app.post("/create-order", async (req, res, next) => {
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
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);
    next(error);
  }
});

// ---------- PUBLIC SLUG STATUS ----------
app.get("/slug-status/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({
        error: "Missing slug",
        message: "Missing slug",
      });
    }

    const slugSnap = await db.collection("slugs").doc(slug).get();
    if (!slugSnap.exists) {
      return res.json({ exists: false, isActive: false });
    }

    const uid = slugSnap.data()?.uid;
    if (!uid) {
      return res.json({ exists: false, isActive: false });
    }

    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return res.json({ exists: false, isActive: false });
    }

    const isActive = userSnap.data()?.isActive !== false;
    res.json({ exists: true, uid, isActive });
  } catch (error) {
    console.error("SLUG STATUS ERROR:", error);
    next(error);
  }
});

// ---------- PUSH SEARCH WORD ----------
app.post("/push-search", async (req, res, next) => {
  try {
    const { uid, word } = req.body;
    if (!uid || !word) {
      return res.status(400).json({
        error: "Missing uid or word",
        message: "Missing uid or word",
      });
    }

    await sendPush(uid, word);
    res.json({ success: true });
  } catch (error) {
    console.error("PUSH SEARCH ERROR:", error);
    next(error);
  }
});

// ---------- VERIFY PAYMENT & CREATE USER ----------
app.post("/verify-payment", async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email, phone, username } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !email || !phone || !username) {
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
    const slug = await generateUniqueSlug(email);
    const normalizedUsername = (username || "").trim() || getEmailPrefix(email);

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
      username: normalizedUsername,
      createdBy: "self",
      isActive: true,
      notificationsEnabled: false,
      sessionVersion: 1,
      slug,
      role: "performer",
      createdAt: FieldValue.serverTimestamp(),
    });

    await db.collection("slugs").doc(slug).set({
      uid: userRecord.uid,
    });

    await sendWelcomeEmail(email, password, slug).catch((e) => {
      console.error("MAIL ERROR:", e);
    });

    res.json({ success: true });
  } catch (error) {
    console.error("VERIFY PAYMENT ERROR:", error);
    next(error);
  }
});

// ---------- ADMIN CREATE USER ----------
app.post("/admin-create-user", async (req, res, next) => {
  try {
    const { email, phone, username } = req.body;
    if (!email || !phone || !username) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Missing required fields",
      });
    }

    const password = generatePassword(email, phone);
    const slug = await generateUniqueSlug(email);
    const normalizedUsername = (username || "").trim() || getEmailPrefix(email);

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
      username: normalizedUsername,
      createdBy: "admin",
      isActive: true,
      notificationsEnabled: false,
      sessionVersion: 1,
      slug,
      role: "performer",
      createdAt: FieldValue.serverTimestamp(),
    });

    await db.collection("slugs").doc(slug).set({
      uid: userRecord.uid,
    });

    await sendWelcomeEmail(email, password, slug).catch((e) => {
      console.error("MAIL ERROR:", e);
    });

    res.json({ success: true });
  } catch (error) {
    console.error("ADMIN CREATE USER ERROR:", error);
    next(error);
  }
});

// ---------- ADMIN DELETE USER ----------
app.delete("/admin-delete-user/:uid", async (req, res, next) => {
  try {
    await verifyAdminRequester(req);

    const { uid } = req.params;
    if (!uid) {
      return res.status(400).json({
        error: "Missing uid",
        message: "Missing uid",
      });
    }

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const slug = userSnap.exists ? userSnap.data()?.slug : null;

    // 1) Delete searches in batches by performer slug
    if (slug) {
      await deleteQueryBatch(db.collection("searches").where("slug", "==", slug));
    }

    // 2) Delete slug document
    if (slug) {
      await db.collection("slugs").doc(slug).delete();
    }

    // 3) Delete user document
    await userRef.delete();

    // 4) Delete auth user LAST, but handle non-existing user gracefully
    try {
      await auth.deleteUser(uid);
    } catch (error) {
      if (error?.code !== "auth/user-not-found") {
        throw error;
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("ADMIN DELETE USER ERROR:", error);
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));
