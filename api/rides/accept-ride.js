const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}
const db = getFirestore();

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { rideId, driverId } = req.body;
    if (!rideId || !driverId) return res.status(400).json({ error: "rideId and driverId are required" });

    const driverSnap = await db
      .collection("drivers")
      .where("clerkId", "==", driverId)
      .limit(1)
      .get();

    if (driverSnap.empty) {
      return res.status(404).json({ error: "Driver profile not found" });
    }
    const driverDoc = driverSnap.docs[0];
    const d = driverDoc.data();
    const assignedName =
      [d.firstName, d.lastName].filter(Boolean).join(" ").trim() || d.name || "Driver";
    const assignedCar = d.vMake || d.vehicleMake || "Vehicle";
    const assignedSeats = d.carSeats || d.seats || 4;

    const rideRef = db.collection("rideRequests").doc(rideId);

    const result = await db.runTransaction(async (tx) => {
      const ride = await tx.get(rideRef);
      if (!ride.exists) {
        throw new Error("Ride not found");
      }
      const r = ride.data();

      const openStatuses = ["requested", "scheduled_requested"]; 
      const alreadyTaken =
        (r.driver_id && r.driver_id !== driverId) ||
        !openStatuses.includes(r.status);

      if (alreadyTaken) {
        return { success: false, reason: "taken_or_closed", status: r.status, driver_id: r.driver_id || "" };
      }

      tx.update(rideRef, {
        status: "accepted",
        driver_id: driverId,
        assigned_driver_name: assignedName,
        assigned_driver_car: assignedCar,
        assigned_driver_seats: assignedSeats,
        assigned_at: FieldValue.serverTimestamp(),
      });
      return { success: true, assignedName };
    });

    if (!result.success) {
      return res.status(409).json({
        success: false,
        error: "Ride is no longer available",
        status: result.status,
        driver_id: result.driver_id,
      });
    }

    return res.json({ success: true, assigned_driver_name: result.assignedName });
  } catch (e) {
    console.error("accept-ride error:", e);
    return res.status(500).json({ success: false, error: "Failed to accept ride" });
  }
};
