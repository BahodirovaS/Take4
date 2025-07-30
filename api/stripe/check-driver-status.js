const { Stripe } = require("stripe");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase environment variables');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { driver_id } = req.body;
    
    if (!driver_id) {
      return res.status(400).json({ error: "Driver ID is required" });
    }

    const driversQuery = db.collection("drivers").where("clerkId", "==", driver_id);
    const driversSnapshot = await driversQuery.get();
    
    if (driversSnapshot.empty) {
      return res.json({
        onboarding_completed: false,
        account_exists: false,
        message: "Driver not found"
      });
    }

    const driverDoc = driversSnapshot.docs[0];
    const driverData = driverDoc.data();
    
    if (!driverData.stripe_connect_account_id) {
      return res.json({
        onboarding_completed: false,
        account_exists: false
      });
    }

    const stripeAccountId = driverData.stripe_connect_account_id;

    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);
      const isComplete = account.details_submitted &&
                        account.charges_enabled &&
                        account.payouts_enabled;

      await driverDoc.ref.update({
        onboarding_completed: isComplete,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        last_checked: new Date(),
      });

      return res.json({
        onboarding_completed: isComplete,
        account_exists: true,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        account_id: stripeAccountId,
      });

    } catch (stripeError) {
      console.error("Stripe error:", stripeError);
      return res.json({
        onboarding_completed: false,
        account_exists: true,
        error: "Failed to retrieve Stripe account"
      });
    }

  } catch (error) {
    console.error("Error checking driver status:", error);
    return res.status(500).json({ error: "Failed to check status" });
  }
};

