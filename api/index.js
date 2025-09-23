const { Stripe } = require('stripe');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_default', {
  apiVersion: '2023-10-16',
});

async function getDriverConnectAccountId(driverClerkId) {
  if (!driverClerkId) return null;
  const snap = await db
    .collection('drivers')
    .where('clerkId', '==', driverClerkId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return data.stripe_connect_account_id || null;
}

function setCorsJson(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

module.exports = async (req, res) => {
  setCorsJson(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/?/, '/');

  try {
    if (req.method === 'POST' && path === '/create') {
  const {
    name,
    email,
    amount,              // <-- this is the FARE ONLY (ride price before tip)
    driverCommissionRate = 0.8,
    driver_id,
    rideId,              // <-- recommend passing a rideId for reconciliation
  } = req.body || {};

  if (!name || !email || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // IMPORTANT: Only the fare is charged here. Tips happen later in /createTip.
  const fare = parseFloat(amount) || 0;
  const fareCents = Math.round(fare * 100);

  // Company share is taken via application_fee_amount on the destination charge
  const companyShareCents = Math.round(fare * (1 - driverCommissionRate) * 100);

  // Load or create the customer
  let customer;
  const list = await stripe.customers.list({ email, limit: 1 });
  if (list.data.length > 0) {
    customer = list.data[0];
    if (name && customer.name !== name) {
      customer = await stripe.customers.update(customer.id, { name });
    }
  } else {
    customer = await stripe.customers.create({ name, email });
  }

  const connectedAccountId = await getDriverConnectAccountId(driver_id);

  // Create an ephemeral key for the mobile SDK
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customer.id },
    { apiVersion: '2024-06-20' }
  );

  // Base intent params for the FARE ONLY
  const baseIntentParams = {
    amount: fareCents,            // <-- FARE ONLY
    currency: 'usd',
    customer: customer.id,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: {
      type: 'fare',
      rideId: rideId || '',
      fareAmount: fare.toFixed(2),
      driverCommissionRate: String(driverCommissionRate),
      driver_id: driver_id || '',
    },
    // Optional: statement descriptors help driver/platform disputes
    description: rideId ? `Fare for ride ${rideId}` : 'Ride fare',
  };

  let paymentIntent;
  let mode;

  if (connectedAccountId) {
    // Destination charge → driver receives (fare - app_fee)
    paymentIntent = await stripe.paymentIntents.create({
      ...baseIntentParams,
      transfer_data: { destination: connectedAccountId },
      application_fee_amount: companyShareCents,
      on_behalf_of: connectedAccountId, // keeps fees lower and descriptors cleaner
    });
    mode = 'destination_charge';
  } else {
    // Fallback: platform charge (no transfer yet)
    // You can later run a transfer when the driver connects, or handle it manually.
    paymentIntent = await stripe.paymentIntents.create({
      ...baseIntentParams,
    });
    mode = 'platform_charge';
  }

  return res.json({
    paymentIntent,
    ephemeralKey,
    customer: customer.id,
    connectedAccountId: connectedAccountId || null,
    mode,
  });
}


    if (req.method === 'POST' && path === '/check-driver-status') {
      const { driver_id } = req.body || {};

      if (!driver_id) {
        return res.status(400).json({ error: 'Driver ID is required' });
      }

      const driversQuery = db.collection('drivers').where('clerkId', '==', driver_id);
      const driversSnapshot = await driversQuery.get();

      if (driversSnapshot.empty) {
        return res.json({
          onboarding_completed: false,
          account_exists: false,
          message: 'Driver not found',
        });
      }

      const driverDoc = driversSnapshot.docs[0];
      const driverData = driverDoc.data();

      if (!driverData.stripe_connect_account_id) {
        return res.json({
          onboarding_completed: false,
          account_exists: false,
        });
      }

      const stripeAccountId = driverData.stripe_connect_account_id;

      try {
        const account = await stripe.accounts.retrieve(stripeAccountId);
        const isComplete =
          account.details_submitted && account.charges_enabled && account.payouts_enabled;

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
        return res.json({
          onboarding_completed: false,
          account_exists: true,
          error: 'Failed to retrieve Stripe account',
        });
      }
    }

    if (req.method === 'POST' && path === '/createTip') {
      const { rideId, tipAmount, customer_id, driver_id, payment_method_id } = req.body || {};

      if (!rideId || !tipAmount || !customer_id || !driver_id || !payment_method_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const tipAmountCents = Math.round(parseFloat(tipAmount) * 100);
      if (!Number.isFinite(tipAmountCents) || tipAmountCents <= 0) {
        return res.json({ success: true, message: 'No tip amount, skipping payment' });
      }

      const driverSnap = await db
        .collection('drivers')
        .where('clerkId', '==', driver_id)
        .limit(1)
        .get();
      if (driverSnap.empty) return res.status(404).json({ error: 'Driver not found' });
      const driver = driverSnap.docs[0].data();
      const destination = driver.stripe_connect_account_id;
      if (!destination)
        return res.status(400).json({ error: 'Driver is missing Stripe Connect account' });

      try {
        const pm = await stripe.paymentMethods.retrieve(payment_method_id);
        if (pm.customer !== customer_id) {
          await stripe.paymentMethods.attach(payment_method_id, { customer: customer_id });
        }
      } catch (e) {
        return res.status(400).json({ error: 'Invalid payment method' });
      }

      const idempotencyKey = `tip_${rideId}_${tipAmountCents}`;

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: tipAmountCents,
          currency: 'usd',
          customer: customer_id,
          payment_method: payment_method_id,
          confirm: true,
          off_session: true,
          automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
          transfer_data: { destination },
          application_fee_amount: 0,
          metadata: { rideId, type: 'tip', driver_id },
          description: `Tip for ride ${rideId}`,
        },
        { idempotencyKey }
      );

      return res.json({ paymentIntent, customer: customer_id, success: true });
    }

    if (req.method === 'POST' && path === '/express-dashboard') {
      const { driver_id } = req.body || {};

      if (!driver_id) {
        return res.status(400).json({ error: 'Driver ID is required' });
      }

      const driversQuery = db.collection('drivers').where('clerkId', '==', driver_id);
      const driversSnapshot = await driversQuery.get();

      if (driversSnapshot.empty) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      const driverData = driversSnapshot.docs[0].data();

      if (!driverData.stripe_connect_account_id) {
        return res
          .status(404)
          .json({ error: 'Driver account not found. Please complete onboarding first.' });
      }

      const stripeAccountId = driverData.stripe_connect_account_id;

      try {
        const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
        return res.json({ url: loginLink.url, account_id: stripeAccountId, success: true });
      } catch (stripeError) {
        return res.status(500).json({ error: 'Failed to create dashboard link' });
      }
    }

    if (req.method === 'POST' && path === '/onboard-driver') {
      const { driver_id, email } = req.body || {};

      if (!driver_id || !email) {
        return res.status(400).json({ error: 'Driver ID and email are required' });
      }

      const driversQuery = db.collection('drivers').where('clerkId', '==', driver_id);
      const driversSnapshot = await driversQuery.get();

      if (driversSnapshot.empty) {
        return res.status(404).json({ error: 'Driver not found' });
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
          return res.status(500).json({ error: 'Failed to create Stripe account' });
        }
      }

      try {
        const accountLink = await stripe.accountLinks.create({
          account: stripeAccountId,
          refresh_url: 'https://bahodirovas.github.io/cabbage-return/refresh.html?v=2',
          return_url: 'https://bahodirovas.github.io/cabbage-return/return.html?v=2',
          type: 'account_onboarding',
        });

        return res.json({ url: accountLink.url, account_id: stripeAccountId, success: true });
      } catch (stripeError) {
        return res.status(500).json({ error: 'Failed to create onboarding link' });
      }
    }

    if (req.method === 'POST' && path === '/pay') {
      const { payment_method_id, payment_intent_id, customer_id } = req.body || {};

      if (!payment_method_id || !payment_intent_id || !customer_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const paymentMethod = await stripe.paymentMethods.attach(payment_method_id, {
        customer: customer_id,
      });

      const result = await stripe.paymentIntents.confirm(payment_intent_id, {
        payment_method: paymentMethod.id,
      });

      return res.json({ success: true, message: 'Payment successful', result });
    }

    return res.status(404).json({ error: 'Not found', path });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err?.message || String(err) });
  }
};
