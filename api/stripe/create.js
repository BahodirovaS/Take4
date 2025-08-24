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
const adb = getFirestore();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_default", {
  apiVersion: "2023-10-16",
});

async function getDriverConnectAccountId(driverClerkId) {
  if (!driverClerkId) return null;
  const snap = await adb
    .collection("drivers")
    .where("clerkId", "==", driverClerkId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return data.stripe_connect_account_id || null;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      name,
      email,
      amount,
      tipAmount = "0",
      driverCommissionRate = 0.80,
      driver_id
    } = req.body;

    if (!name || !email || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const fare = parseFloat(amount) || 0;
    const tip  = parseFloat(tipAmount) || 0;
    const total = fare + tip;

    const totalCents       = Math.round(total * 100);
    const companyShareCents = Math.round(fare * (1 - driverCommissionRate) * 100);

    let customer;
    const list = await stripe.customers.list({ email });
    if (list.data.length > 0) {
      customer = list.data[0];
      if (name && customer.name !== name) {
        customer = await stripe.customers.update(customer.id, { name });
      }
    } else {
      customer = await stripe.customers.create({ name, email });
    }

    const connectedAccountId = await getDriverConnectAccountId(driver_id);

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2024-06-20" }
    );

    const intentParams = {
      amount: totalCents,
      currency: "usd",
      customer: customer.id,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        fareAmount: String(fare.toFixed(2)),
        tipAmount: String(tip.toFixed(2)),
        driverCommissionRate: String(driverCommissionRate),
        driver_id: driver_id || "",
      },
    };

    if (connectedAccountId) {
      intentParams.transfer_data = { destination: connectedAccountId };
      intentParams.application_fee_amount = companyShareCents; 
      intentParams.on_behalf_of = connectedAccountId;
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams);

    return res.json({
      paymentIntent,
      ephemeralKey,
      customer: customer.id,
      connectedAccountId: connectedAccountId || null,
      mode: connectedAccountId ? "destination_charge" : "platform_charge",
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
