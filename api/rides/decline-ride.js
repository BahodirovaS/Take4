const { initializeApp, getApps } = require("firebase/app");
const {
  getFirestore,
  doc,
  runTransaction,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} = require("firebase/firestore");

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

let app, db;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init error:", e);
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function pickNextDriver(ride) {
  // Seat requirement (mirror your assign_driver logic)
  const rideType = ride.ride_type || "standard";
  const seatRequirement =
    rideType === "xl" ? 7 : rideType === "comfort" ? 6 : 4;

  // Pull all ONLINE drivers who meet seat requirement
  const q = query(
    collection(db, "drivers"),
    where("carSeats", ">=", seatRequirement),
    where("status", "==", true)
  );
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const declined = Array.isArray(ride.declined_driver_ids) ? ride.declined_driver_ids : [];
  const excludeSet = new Set(
    declined.filter(Boolean) // previously declined
  );

  // Exclude the current requested driver, if any
  if (ride.driver_id) excludeSet.add(ride.driver_id);

  const candidates = [];
  snap.forEach(d => {
    const data = d.data();
    const clerkId = data.clerkId;
    if (!clerkId || excludeSet.has(clerkId)) return;
    if (typeof data.latitude !== "number" || typeof data.longitude !== "number") return;

    // Distance from pickup if we have it
    let distance = Infinity;
    if (typeof ride.origin_latitude === "number" && typeof ride.origin_longitude === "number") {
      distance = haversine(
        ride.origin_latitude,
        ride.origin_longitude,
        data.latitude,
        data.longitude
      );
    }

    candidates.push({
      clerkId,
      firstName: data.firstName || "Unknown",
      lastName: data.lastName || "Driver",
      carMake: data.vMake || "Vehicle",
      carSeats: data.carSeats || 4,
      distance,
    });
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0];
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { rideId, driverId } = req.body || {};
    if (!rideId || !driverId) {
      return res.status(400).json({ success: false, error: "rideId and driverId required" });
    }

    const rideRef = doc(db, "rideRequests", rideId);

    // 1) Mark decline and clear requested fields atomically
    let rideAfter;
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(rideRef);
      if (!snap.exists()) throw new Error("Ride not found");
      const ride = snap.data();

      const isRequested =
        ride.status === "requested" || ride.status === "scheduled_requested";
      if (!isRequested) throw new Error("Ride is not in a requested state");

      // Only allow the targeted driver to decline
      if (ride.driver_id && ride.driver_id !== driverId) {
        throw new Error("This ride is targeted to a different driver");
      }

      tx.update(rideRef, {
        driver_acceptance: "declined",
        declined_driver_ids: arrayUnion(driverId),
        // Clear targeting fields so a different driver can be assigned
        driver_id: "",
        requested_driver_name: "",
        requested_driver_car: "",
        requested_at: new Date(),
        // Keep status the same kind (requested vs scheduled_requested)
        // so listeners keep looking at the right bucket
        // (no change to status here)
      });

      rideAfter = { ...ride, driver_id: "", requested_driver_name: "", requested_driver_car: "" };
    });

    // 2) Re-assign to next eligible online driver
    const snap = await getDocs(query(collection(db, "rideRequests"), where("__name__", "==", rideId)));
    if (snap.empty) {
      // Shouldn't happen, but guard
      return res.status(200).json({ success: true, reassigned: false, reason: "ride_missing_post_tx" });
    }
    const rideData = snap.docs[0].data();

    const next = await pickNextDriver(rideData);
    if (!next) {
      // No drivers available; leave it unassigned
      return res.status(200).json({ success: true, reassigned: false, reason: "no_available_drivers" });
    }

    await updateDoc(rideRef, {
      driver_id: next.clerkId,
      requested_driver_name: `${next.firstName} ${next.lastName}`.trim(),
      requested_driver_car: next.carMake,
      requested_at: new Date(),
      driver_acceptance: "pending",
    });

    return res.status(200).json({
      success: true,
      reassigned: true,
      nextDriver: {
        id: next.clerkId,
        name: `${next.firstName} ${next.lastName}`.trim(),
        car: next.carMake,
        seats: next.carSeats,
      },
    });
  } catch (error) {
    console.error("decline-ride error:", error);
    return res.status(409).json({ success: false, error: error.message });
  }
};
