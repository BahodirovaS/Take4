const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, runTransaction, arrayUnion } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

let app, db;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
} catch (e) {
  console.error('Firebase init error:', e);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { rideId, driverId } = req.body;
    if (!rideId || !driverId) return res.status(400).json({ success: false, error: 'rideId and driverId required' });

    const rideRef = doc(db, 'rideRequests', rideId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(rideRef);
      if (!snap.exists()) throw new Error('Ride not found');
      const data = snap.data();

      const isRequested = data.status === 'requested' || data.status === 'scheduled_requested';
      if (!isRequested) throw new Error('Ride is not in a requested state');

      if (data.driver_id !== driverId) throw new Error('Not targeted to this driver');

      tx.update(rideRef, {
        driver_acceptance: 'declined',
        declined_driver_ids: arrayUnion(driverId),
        driver_id: "",
        status: 'requested_pending_driver'
      });
    });

    return res.status(200).json({ success: true, declined: true });
  } catch (error) {
    console.error('decline-ride error:', error);
    return res.status(409).json({ success: false, error: error.message });
  }
};
