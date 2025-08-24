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

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { rideId, tipAmount, customer_id, driver_id, payment_method_id } = req.body || {};

    if (!rideId || !tipAmount || !customer_id || !driver_id || !payment_method_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const tipAmountCents = Math.round(parseFloat(tipAmount) * 100);
    if (!Number.isFinite(tipAmountCents) || tipAmountCents <= 0) {
      return res.json({ success: true, message: "No tip amount, skipping payment" });
    }

    const driverSnap = await db.collection("drivers").where("clerkId", "==", driver_id).limit(1).get();
    if (driverSnap.empty) return res.status(404).json({ error: "Driver not found" });
    const driver = driverSnap.docs[0].data();
    const destination = driver.stripe_connect_account_id;
    if (!destination) return res.status(400).json({ error: "Driver is missing Stripe Connect account" });

    try {
      const pm = await stripe.paymentMethods.retrieve(payment_method_id);
      if (pm.customer !== customer_id) {
        await stripe.paymentMethods.attach(payment_method_id, { customer: customer_id });
      }
    } catch (e) {
      console.error("Error verifying payment method:", e);
      return res.status(400).json({ error: "Invalid payment method" });
    }

    const idempotencyKey = `tip_${rideId}_${tipAmountCents}`;

    // tip goes to driver’s Connect account
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: tipAmountCents,
        currency: "usd",
        customer: customer_id,
        payment_method: payment_method_id,
        confirm: true,
        off_session: true,
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        transfer_data: { destination },
        application_fee_amount: 0,
        metadata: { rideId, type: "tip", driver_id },
        description: `Tip for ride ${rideId}`,
      },
      { idempotencyKey }
    );

    return res.json({ paymentIntent, customer: customer_id, success: true });
  } catch (error) {
    if (error?.type === "StripeCardError" || error?.code === "authentication_required") {
      const pi = error?.payment_intent;
      if (pi?.client_secret) {
        return res.status(402).json({
          error: "Authentication required",
          requiresAction: true,
          clientSecret: pi.client_secret,
          paymentIntentId: pi.id,
        });
      }
    }
    console.error("Error creating tip payment:", error);
    return res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
};
