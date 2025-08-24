const { initializeApp, getApps } = require('firebase/app');
const {
  getFirestore, collection, query, where, getDocs, updateDoc, doc
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

let app;
let db;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
} catch (initError) {
  console.error('Firebase initialization error:', initError);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { rideId, rideType, pickupLatitude, pickupLongitude, isScheduled = false } = req.body;

    if (!db) return res.status(500).json({ success: false, error: 'Database connection failed' });
    if (!rideId || !rideType || pickupLatitude === undefined || pickupLongitude === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const seatRequirement = rideType === 'xl' ? 7 : rideType === 'comfort' ? 6 : 4;

    const driversQuery = query(
      collection(db, 'drivers'),
      where('carSeats', '>=', seatRequirement),
      where('status', '==', true)
    );

    const driversSnapshot = await getDocs(driversQuery);
    if (driversSnapshot.empty) {
      return res.status(404).json({ 
        success: false, error: `No ${rideType} drivers available at this time` 
      });
    }

    const availableDrivers = [];
    driversSnapshot.forEach(d => {
      const driver = d.data();
      if (typeof driver.latitude !== 'number' || typeof driver.longitude !== 'number') return;
      const distance = calculateDistance(
        pickupLatitude, 
        pickupLongitude, 
        driver.latitude, 
        driver.longitude
      );
      availableDrivers.push({
        id: d.id,
        clerk_id: driver.clerkId,
        firstName: driver.firstName || 'Unknown',
        lastName: driver.lastName || 'Driver',
        carSeats: driver.carSeats,
        carMake: driver.vMake || 'Vehicle',
        latitude: driver.latitude,
        longitude: driver.longitude,
        distance
      });
    });

    if (availableDrivers.length === 0) {
      return res.status(404).json({ 
        success: false, error: 'No drivers with valid location data found' 
      });
    }

    availableDrivers.sort((a, b) => a.distance - b.distance);
    const target = availableDrivers[0];

    const rideRef = doc(db, 'rideRequests', rideId);
    await updateDoc(rideRef, {
      driver_id: target.clerk_id,
      requested_driver_name: `${target.firstName} ${target.lastName}`,
      requested_driver_car: target.carMake,
      requested_at: new Date(),
      driver_distance: target.distance,
      driver_acceptance: 'pending',
      status: isScheduled ? 'scheduled_requested' : 'requested',
      request_expires_at: new Date(Date.now() + 2 * 60 * 1000) 
    });

    return res.status(200).json({
      success: true,
      requested: true,
      driver: {
        id: target.clerk_id,
        name: `${target.firstName} ${target.lastName}`,
        car: target.carMake,
        seats: target.carSeats,
        distance: target.distance
      }
    });
  } catch (error) {
    console.error('assign-driver error:', error);
    return res.status(500).json({ success: false, error: 'Failed to request driver', details: error.message });
  }
};

// Haversine
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
