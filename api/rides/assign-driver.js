const { initializeApp, getApps } = require('firebase/app');
const {
  getFirestore, collection, query, where, getDocs, updateDoc, doc,
  runTransaction, serverTimestamp
} = require('firebase/firestore');

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
    const { rideId, rideType, pickupLatitude, pickupLongitude, isScheduled = false } = req.body;
    const idemKey = req.headers['x-idempotency-key'];

    if (!db) {
      return res.status(500).json({ success: false, code: 'DB_INIT_FAILED', message: 'Database connection failed' });
    }
    if (!rideId || !rideType || typeof pickupLatitude !== 'number' || typeof pickupLongitude !== 'number') {
      return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', message: 'Missing or invalid fields' });
    }

    const seatRequirement = seatByType(rideType);

    // Query drivers
    const driversQuery = query(
      collection(db, 'drivers'),
      where('carSeats', '>=', seatRequirement),
      where('status', '==', true) // online/available
    );
    const driversSnapshot = await getDocs(driversQuery);

    if (driversSnapshot.empty) {
      // If scheduled, park the request and return 202 (queued)
      if (isScheduled) {
        await updateDoc(doc(db, 'rideRequests', rideId), {
          status: 'scheduled_waiting_for_driver',
          driver_acceptance: 'none',
          lastAssignmentRequestId: idemKey || null,
          lastAssignmentAt: serverTimestamp()
        });

        return res.status(202).json({
          success: true,
          code: 'QUEUED_AWAITING_DRIVER',
          message: `No ${rideType} drivers online right now. The ride is queued until a driver comes online.`,
          retryAfterSec: 30,
          ride: { id: rideId }
        });
      }

      return res.status(404).json({
        success: false,
        code: 'NO_ACTIVE_DRIVERS',
        message: `No ${rideType} drivers available at this time`,
        retryAfterSec: 15,
        ride: { id: rideId }
      });
    }

    // Filter drivers with usable geo
    const availableDrivers = [];
    driversSnapshot.forEach(d => {
      const driver = d.data();
      if (typeof driver.latitude !== 'number' || typeof driver.longitude !== 'number') return;
      const distance = calculateDistance(pickupLatitude, pickupLongitude, driver.latitude, driver.longitude);
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
      if (isScheduled) {
        await updateDoc(doc(db, 'rideRequests', rideId), {
          status: 'scheduled_waiting_for_driver',
          driver_acceptance: 'none',
          lastAssignmentRequestId: idemKey || null,
          lastAssignmentAt: serverTimestamp()
        });
        return res.status(202).json({
          success: true,
          code: 'QUEUED_AWAITING_DRIVER',
          message: 'Drivers online but no usable location yet; ride queued.',
          retryAfterSec: 30,
          ride: { id: rideId }
        });
      }
      return res.status(404).json({
        success: false,
        code: 'NO_GEO_DRIVERS',
        message: 'No drivers with valid location data found',
        retryAfterSec: 10,
        ride: { id: rideId }
      });
    }

    availableDrivers.sort((a, b) => a.distance - b.distance);
    const target = availableDrivers[0];

    // Transaction to avoid race conditions and double-assignments
    const result = await runTransaction(db, async (trx) => {
      const rideRef = doc(db, 'rideRequests', rideId);
      const rideSnap = await trx.get(rideRef);
      if (!rideSnap.exists()) {
        throw Object.assign(new Error('Ride not found'), { _code: 'RIDE_NOT_FOUND', _http: 404 });
      }
      const ride = rideSnap.data();

      // Idempotency: if same requestId already processed, short-circuit
      if (idemKey && ride.lastAssignmentRequestId === idemKey) {
        return { kind: 'IDEMPOTENT_REPEAT', target };
      }

      // State guard: prevent reassignment if already accepted or locked
      if (ride.driver_acceptance === 'accepted' || ride.status === 'accepted') {
        throw Object.assign(new Error('Ride already accepted'), { _code: 'RIDE_STATE_CONFLICT', _http: 409 });
      }

      // (Optional) verify driver availability field (pendingRideId == null)
      // const driverRef = doc(db, 'drivers', target.id);
      // const driverSnap = await trx.get(driverRef);
      // const driver = driverSnap.data();
      // if (driver.pendingRideId) {
      //   throw Object.assign(new Error('Driver busy'), { _code: 'DRIVER_BUSY', _http: 409 });
      // }
      // trx.update(driverRef, { pendingRideId: rideId, pendingAt: serverTimestamp() });

      const expiresAtMs = nowMs() + 2 * 60 * 1000;

      trx.update(rideRef, {
        driver_id: target.clerk_id,
        requested_driver_name: `${target.firstName} ${target.lastName}`,
        requested_driver_car: target.carMake,
        requested_at: serverTimestamp(),
        driver_distance_km: target.distance,
        driver_acceptance: 'pending',
        status: isScheduled ? 'scheduled_requested' : 'requested',
        request_expires_at: new Date(expiresAtMs),
        request_expires_at_epochMs: expiresAtMs,
        lastAssignmentRequestId: idemKey || null,
        lastAssignmentAt: serverTimestamp()
      });

      return { kind: 'ASSIGNED', target, expiresAtMs };
    });

    if (result.kind === 'IDEMPOTENT_REPEAT') {
      // Mirror a 200 with same payload shape
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
          distanceKm: Number(result.target.distance.toFixed(2))
        },
        ride: { id: rideId }
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
        distanceKm: Number(result.target.distance.toFixed(2))
      },
      ride: { id: rideId, requestExpiresAtMs: result.expiresAtMs }
    });

  } catch (error) {
    // Map known errors to proper status/codes
    const http = error._http || 500;
    const code = error._code || 'INTERNAL_ERROR';
    console.error('assign-driver error:', error);
    return res.status(http).json({
      success: false,
      code,
      message: error.message || 'Failed to request driver'
    });
  }
};

// Haversine (km)
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
