const { Stripe } = require("stripe");
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

module.exports = async function handler(req, res) {
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
    const { driver_id, email } = req.body;

    if (!driver_id || !email) {
      return res.status(400).json({ error: "Driver ID and email are required" });
    }

    const driversQuery = db.collection("drivers").where("clerkId", "==", driver_id);
    const driversSnapshot = await driversQuery.get();

    if (driversSnapshot.empty) {
      return res.status(404).json({ error: "Driver not found" });
    }

    const driverDoc = driversSnapshot.docs[0];
    const driverData = driverDoc.data();
    let stripeAccountId = driverData.stripe_connect_account_id;

    if (!stripeAccountId) {
      try {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual',
          business_profile: {
            product_description: 'Transportation services through Cabbage Driver app',
          },
        });

        stripeAccountId = account.id;

        await driverDoc.ref.update({
          stripe_connect_account_id: stripeAccountId,
          stripe_account_created_at: new Date(),
          onboarding_completed: false,
        });

      } catch (stripeError) {
        console.error("Error creating Stripe account:", stripeError);
        return res.status(500).json({ error: "Failed to create Stripe account" });
      }
    }

    try {
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: 'https://dashboard.stripe.com/express/onboarding',
        return_url: 'https://dashboard.stripe.com/express/onboarding/complete',
        type: 'account_onboarding',
      });

      return res.json({
        url: accountLink.url,
        account_id: stripeAccountId,
        success: true,
      });

    } catch (stripeError) {
      console.error("Error creating account link:", stripeError);
      return res.status(500).json({ error: "Failed to create onboarding link" });
    }

  } catch (error) {
    console.error("Error in onboard-driver:", error);
    return res.status(500).json({ error: "Failed to create onboarding link" });
  }
};
