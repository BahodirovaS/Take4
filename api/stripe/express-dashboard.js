const { Stripe } = require("stripe");
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

/**
 * @param {import('@vercel/node').VercelRequest} req 
 * @param {import('@vercel/node').VercelResponse} res 
 */
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { driver_id } = req.body;

    if (!driver_id) {
      return res.status(400).json({ error: "Driver ID is required" });
    }

    const driversQuery = db.collection("drivers").where("clerkId", "==", driver_id);
    const driversSnapshot = await driversQuery.get();

    if (driversSnapshot.empty) {
      return res.status(404).json({ error: "Driver not found" });
    }

    const driverData = driversSnapshot.docs[0].data();

    if (!driverData.stripe_connect_account_id) {
      return res.status(404).json({
        error: "Driver account not found. Please complete onboarding first.",
      });
    }

    const stripeAccountId = driverData.stripe_connect_account_id;

    try {
      const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);

      return res.json({
        url: loginLink.url,
        account_id: stripeAccountId,
        success: true,
      });
    } catch (stripeError) {
      console.error("Stripe error creating login link:", stripeError);
      return res.status(500).json({ error: "Failed to create dashboard link" });
    }
  } catch (error) {
    console.error("Error creating Express dashboard link:", error);
    return res.status(500).json({ error: "Failed to create dashboard link" });
  }
};
