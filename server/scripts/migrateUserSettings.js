import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin.js";

async function run() {
  const usersSnap = await db.collection("users").get();
  let migrated = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    await db.collection("userSettings").doc(uid).set(
      {
        notificationsEnabled: false,
        linkEnabled: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    migrated++;
  }

  console.log(`userSettings migration complete. Processed: ${migrated}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("userSettings migration failed:", error);
    process.exit(1);
  });
