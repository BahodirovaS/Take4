
const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
const adminDb = getFirestore();

const seatByType = (rideType) =>
  rideType === 'xl' ? 7 : rideType === 'comfort' ? 6 : 4;

const nowMs = () => Date.now();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Idempotency-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  }

  try {
    const { rideId, rideType, pickupLatitude, pickupLongitude, isScheduled = false } = req.body || {};
    const idemKey = req.headers['x-idempotency-key'];

    
    if (!rideId || !rideType || typeof pickupLatitude !== 'number' || typeof pickupLongitude !== 'number') {
      return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', message: 'Missing or invalid fields' });
    }

    const seatRequirement = seatByType(rideType);
    console.log('[assign-driver] seatRequirement:', seatRequirement);

    
    const rideSnap = await adminDb.collection('rideRequests').doc(rideId).get();
    if (!rideSnap.exists) {
      return res.status(404).json({ success: false, code: 'RIDE_NOT_FOUND', message: 'Ride not found' });
    }
    const rideData = rideSnap.data() || {};
    const travelingWithPet = !!rideData.traveling_with_pet;
    console.log('[assign-driver] travelingWithPet:', travelingWithPet);

    
    let driversSnapshot;
    try {
      let q = adminDb
        .collection('drivers')
        .where('carSeats', '>=', seatRequirement)
        .where('status', '==', true);

      
      if (travelingWithPet) {
        q = q.where('pets', '==', true);
      }

      driversSnapshot = await q.get();
    } catch (err) {
      
      if (err && (err.code === 9 || err.code === 'failed-precondition') && /index/i.test(String(err.message))) {
        console.error('Index required for driver query.', err.message);

        
        return res.status(400).json({
          success: false,
          code: 'INDEX_REQUIRED',
          message: travelingWithPet
            ? 'Create Firestore composite index on drivers: status (ASC), carSeats (ASC), pets (ASC).'
            : 'Create Firestore composite index on drivers: status (ASC), carSeats (ASC).',
          details: err.message,
        });
      }
      throw err;
    }

    console.log('[assign-driver] driversSnapshot size:', driversSnapshot.size);

    if (driversSnapshot.empty) {
      if (isScheduled) {
        await adminDb.collection('rideRequests').doc(rideId).update({
          status: 'scheduled_waiting_for_driver',
          driver_acceptance: 'none',
          lastAssignmentRequestId: idemKey || null,
          lastAssignmentAt: FieldValue.serverTimestamp(),
        });

        return res.status(202).json({
          success: true,
          code: 'QUEUED_AWAITING_DRIVER',
          message: `No ${rideType} drivers online right now${travelingWithPet ? ' (pet-friendly required)' : ''}. The ride is queued until a driver comes online.`,
          retryAfterSec: 30,
          ride: { id: rideId },
        });
      }

      return res.status(404).json({
        success: false,
        code: 'NO_ACTIVE_DRIVERS',
        message: `No ${rideType} drivers available at this time${travelingWithPet ? ' that allow pets' : ''}`,
        retryAfterSec: 15,
        ride: { id: rideId },
      });
    }

    
    const availableDrivers = [];
    driversSnapshot.forEach((d) => {
      const driver = d.data() || {};
      const lat = Number(driver.latitude);
      const lng = Number(driver.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (!driver.clerkId) return; 

      const distance = calculateDistance(pickupLatitude, pickupLongitude, lat, lng);
      availableDrivers.push({
        id: d.id,
        clerk_id: driver.clerkId,
        firstName: driver.firstName || 'Unknown',
        lastName: driver.lastName || 'Driver',
        carSeats: driver.carSeats,
        carMake: driver.vMake || 'Vehicle',
        latitude: lat,
        longitude: lng,
        distance,
      });
    });

    console.log('[assign-driver] availableDrivers:', availableDrivers.length);

    if (availableDrivers.length === 0) {
      if (isScheduled) {
        await adminDb.collection('rideRequests').doc(rideId).update({
          status: 'scheduled_waiting_for_driver',
          driver_acceptance: 'none',
          lastAssignmentRequestId: idemKey || null,
          lastAssignmentAt: FieldValue.serverTimestamp(),
        });
        return res.status(202).json({
          success: true,
          code: 'QUEUED_AWAITING_DRIVER',
          message: 'Drivers online but no usable location yet; ride queued.',
          retryAfterSec: 30,
          ride: { id: rideId },
        });
      }
      return res.status(404).json({
        success: false,
        code: 'NO_GEO_DRIVERS',
        message: 'No drivers with valid location data found',
        retryAfterSec: 10,
        ride: { id: rideId },
      });
    }

    availableDrivers.sort((a, b) => a.distance - b.distance);
    const target = availableDrivers[0];

    
    const result = await adminDb.runTransaction(async (trx) => {
      const rideRef = adminDb.collection('rideRequests').doc(rideId);
      const rideSnap2 = await trx.get(rideRef);
      if (!rideSnap2.exists) {
        const err = new Error('Ride not found');
        err._code = 'RIDE_NOT_FOUND';
        err._http = 404;
        throw err;
      }
      const ride = rideSnap2.data() || {};

      
      if (idemKey && ride.lastAssignmentRequestId === idemKey) {
        return { kind: 'IDEMPOTENT_REPEAT', target };
      }

      
      if (ride.driver_acceptance === 'accepted' || ride.status === 'accepted') {
        const err = new Error('Ride already accepted');
        err._code = 'RIDE_STATE_CONFLICT';
        err._http = 409;
        throw err;
      }

      const expiresAtMs = nowMs() + 2 * 60 * 1000;

      trx.update(rideRef, {
        driver_id: target.clerk_id,
        requested_driver_name: `${target.firstName} ${target.lastName}`,
        requested_driver_car: target.carMake,
        requested_at: FieldValue.serverTimestamp(),
        driver_distance_km: target.distance,
        driver_acceptance: 'pending',
        status: isScheduled ? 'scheduled_requested' : 'requested',
        request_expires_at: new Date(expiresAtMs),
        request_expires_at_epochMs: expiresAtMs,
        lastAssignmentRequestId: idemKey || null,
        lastAssignmentAt: FieldValue.serverTimestamp(),
      });

      return { kind: 'ASSIGNED', target, expiresAtMs };
    });

    if (result.kind === 'IDEMPOTENT_REPEAT') {
      return res.status(200).json({
        success: true,
        code: 'REQUESTED_DRIVER_PENDING',
        requested: true,
        retryAfterSec: 5,
        driver: {
          id: result.target.clerk_id,
          name: `${result.target.firstName} ${result.target.lastName}`,
          car: result.target.carMake,
          seats: result.target.carSeats,
          distanceKm: Number(result.target.distance.toFixed(2)),
        },
        ride: { id: rideId },
      });
    }

    return res.status(200).json({
      success: true,
      code: 'REQUESTED_DRIVER_PENDING',
      requested: true,
      retryAfterSec: 5,
      driver: {
        id: result.target.clerk_id,
        name: `${result.target.firstName} ${result.target.lastName}`,
        car: result.target.carMake,
        seats: result.target.carSeats,
        distanceKm: Number(result.target.distance.toFixed(2)),
      },
      ride: { id: rideId, requestExpiresAtMs: result.expiresAtMs },
    });
  } catch (error) {
    const http = error._http || 500;
    const code = error.code || error._code || 'INTERNAL_ERROR';
    console.error('assign-driver error:', error);
    return res.status(http).json({
      success: false,
      code,
      message: error.message,
      details: (error.stack && error.stack.split('\n')[0]) || null,
    });
  }
};

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat1 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}