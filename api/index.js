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
        amount,
        tipAmount = '0',
        driverCommissionRate = 0.8,
        driver_id,
        // rideId,
        customer_id
      } = req.body || {};

      const missing = [];
      // if (rideId == null) missing.push('rideId');
      if (driver_id == null) missing.push('driver_id');
      if (!customer_id && !(name && email)) missing.push('customer_id or (name + email)');
      if (!name) missing.push('name');
      if (!email) missing.push('email');
      if (!amount) missing.push('amount');

      if (missing.length) {
        console.error('[createTip] Missing fields:', missing, 'Body:', req.body);
        return res.status(400).json({ error: 'Missing required fields', missing });
      }

      if (!name || !email || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const fare = parseFloat(amount) || 0;
      const tip = parseFloat(tipAmount) || 0;
      const total = fare + tip;

      const totalCents = Math.round(total * 100);
      const companyShareCents = Math.round(fare * (1 - driverCommissionRate) * 100);

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
      if (!connectedAccountId) {
        return res.status(400).json({
          error: "missing_connect",
          message: "Driver is missing stripe_connect_account_id or driver_id is not the clerkId",
          driver_id
        });
      }
      const ephemeralKey = await stripe.ephemeralKeys.create(
        { customer: customer.id },
        { apiVersion: '2024-06-20' }
      );

      const driverAmountCents = Math.round((fare * driverCommissionRate + tip) * 100);

      const intentParams = {
        amount: totalCents,
        currency: 'usd',
        customer: customer.id,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        setup_future_usage: 'off_session',
        metadata: {
          fareAmount: String(fare.toFixed(2)),
          tipAmount: String(tip.toFixed(2)),
          driverCommissionRate: String(driverCommissionRate),
          driver_id: driver_id || '',
        },
        transfer_data: { destination: connectedAccountId, amount: driverAmountCents },
        application_fee_amount: totalCents - driverAmountCents,
        on_behalf_of: connectedAccountId,
      };
      console.log("[PAY] driver_id:", driver_id);
      console.log("[PAY] connectedAccountId:", connectedAccountId);
      console.log("[PAY] mode:", connectedAccountId ? "destination_charge" : "platform_charge");
      console.log("[PAY] totalCents:", totalCents, "companyFeeCents:", companyShareCents);
      const paymentIntent = await stripe.paymentIntents.create(intentParams);

      return res.json({
        paymentIntent,
        ephemeralKey,
        customer: customer.id,
        connectedAccountId: connectedAccountId || null,
        mode: connectedAccountId ? 'destination_charge' : 'platform_charge',
      });
    }

    if (req.method === 'POST' && path === '/createTip') {
      const { rideId, tipAmount, customer_id, driver_id } = req.body || {};

      if (!rideId || !tipAmount || !customer_id || !driver_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const tipAmountCents = Math.round(parseFloat(tipAmount) * 100);
      if (!Number.isFinite(tipAmountCents) || tipAmountCents <= 0) {
        return res.json({ success: true, message: 'No tip amount, skipping payment' });
      }

      const driverSnap = await db.collection('drivers').where('clerkId', '==', driver_id).limit(1).get();
      if (driverSnap.empty) return res.status(404).json({ error: 'Driver not found' });

      const driver = driverSnap.docs[0].data();
      const destination = driver.stripe_connect_account_id;
      if (!destination) return res.status(400).json({ error: 'Driver is missing Stripe Connect account' });

      const selectPaymentMethodForCustomer = async (customerId) => {
        const cust = await stripe.customers.retrieve(customerId);
        const defaultPM = cust?.invoice_settings?.default_payment_method;
        if (defaultPM) return typeof defaultPM === 'string' ? defaultPM : defaultPM.id;
        const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
        return list.data[0]?.id || null;
      };

      try {
        const chosenPM = await selectPaymentMethodForCustomer(customer_id);
        if (!chosenPM) {
          return res.status(400).json({
            error: 'no_saved_payment_method',
            message: 'No saved card on this customer. Add a card via Payment Sheet first.',
          });
        }

        const idempotencyKey = `tip_${rideId}_${tipAmountCents}_${chosenPM}`;

        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: tipAmountCents,
            currency: 'usd',
            customer: customer_id,
            payment_method: chosenPM,
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
      } catch (e) {
        console.error('Stripe tip error:', e); // keep this log
        return res.status(400).json({
          error: e?.type || 'stripe_error',
          message: e?.message || 'Unknown Stripe error',
          code: e?.code,
        });
      }
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

        // Check if this is a test account
        const isTestAccount = stripeAccountId.startsWith('acct_test_') ||
          process.env.NODE_ENV === 'development' ||
          process.env.STRIPE_SECRET_KEY?.includes('sk_test_');

        // For test accounts, only require details_submitted
        // For live accounts, require all three conditions
        const isComplete = isTestAccount
          ? account.details_submitted
          : account.details_submitted && account.charges_enabled && account.payouts_enabled;

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

    // this function is for expiring the scheduled request the night of the day before the date
    function toDate(input) {
      if (!input) return null;
      if (input.toDate) return input.toDate();
      if (input instanceof Date) return input;
      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    }

    function computePreScheduledExpiry(ride) {
      const schedDT = toDate(ride.scheduled_datetime);
      if (schedDT) {
        const ms = schedDT.getTime() - 24 * 60 * 60 * 1000;
        return new Date(ms);
      }

      const dateStr = ride.scheduled_date;
      if (typeof dateStr === 'string') {
        const [y, m, d] = dateStr.split('-').map(Number);
        if (y && m && d) {
          const expUtc = Date.UTC(y, m - 1, d - 1, 23, 59, 59, 999);
          return new Date(expUtc);
        }
      }

      return new Date(Date.now() + 2 * 60 * 1000);
    }

    // end of function. it is used for the POST below

    if (req.method === 'POST' && path === '/claim-pending-ride') {
      try {
        const { driverId, lat, lng } = req.body || {};
        if (!driverId || typeof lat !== 'number' || typeof lng !== 'number') {
          return res.status(400).json({ success: false, error: 'driverId, lat, lng required' });
        }

        const db = getFirestore();

        const driverSnap = await db
          .collection('drivers')
          .where('clerkId', '==', driverId)
          .limit(1)
          .get();
        if (driverSnap.empty) {
          return res.status(404).json({ success: false, error: 'Driver profile not found' });
        }
        const d = driverSnap.docs[0].data();
        const assignedName =
          [d.firstName, d.lastName].filter(Boolean).join(' ').trim() || d.name || 'Driver';
        const assignedCar = d.vMake || d.vehicleMake || 'Vehicle';

        const rideSnap = await db
          .collection('rideRequests')
          .where('status', 'in', ['requested', 'scheduled_requested'])
          .where('driver_id', '==', '')
          .get();

        if (rideSnap.empty) {
          return res.json({ success: true, claimed: false, ride: null });
        }

        function haversineKm(lat1, lng1, lat2, lng2) {
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLng = (lng2 - lng1) * Math.PI / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
          return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        const candidates = [];
        rideSnap.forEach((doc) => {
          const data = doc.data();
          if (data.declined_driver_ids?.includes(driverId)) return; // skip declined ones
          if (typeof data.origin_latitude !== 'number' || typeof data.origin_longitude !== 'number') return;
          const distance = haversineKm(lat, lng, data.origin_latitude, data.origin_longitude);
          candidates.push({ id: doc.id, data, distance });
        });

        if (candidates.length === 0) {
          return res.json({ success: true, claimed: false, reason: 'no_unassigned_rides' });
        }

        candidates.sort((a, b) => a.distance - b.distance);
        const target = candidates[0];

        const rideRef = db.collection('rideRequests').doc(target.id);
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(rideRef);
          if (!snap.exists) throw new Error('Ride not found');
          const current = snap.data();

          if (
            !['requested', 'scheduled_requested'].includes(current.status) ||
            current.driver_id !== ''
          ) {
            throw new Error('Ride no longer available');
          }

          const expiry = computePreScheduledExpiry(current); // day-before cutoff

          tx.update(rideRef, {
            driver_id: driverId,
            requested_driver_name: assignedName,
            requested_driver_car: assignedCar,
            driver_acceptance: 'pending',
            request_expires_at: expiry,
            request_expires_at_epochMs: expiry.getTime(),
          });
        });

        return res.json({
          success: true,
          claimed: true,
          rideId: target.id,
          rideStatus: target.data.status,
        });
      } catch (e) {
        console.error('claim-pending-ride error:', e);
        return res.status(500).json({ success: false, error: e?.message || 'claim failed' });
      }
    }


    return res.status(404).json({ error: 'Not found', path });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err?.message || String(err) });
  }
};
