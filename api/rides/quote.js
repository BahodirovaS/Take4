export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { origin, destination } = req.body;
    const key =
      process.env.DIRECTIONS_API_KEY ||
      process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY ||
      process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY_SERVER;

    const fmt = (p) =>
      p?.placeId
        ? `place_id:${encodeURIComponent(p.placeId)}`
        : p?.address
        ? encodeURIComponent(p.address)
        : `${p.lat},${p.lng}`;

    const directions = async (o, d) => {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${o}&destination=${d}&mode=driving&departure_time=now&traffic_model=best_guess&key=${key}`;
      const r = await fetch(url);
      const data = await r.json();
      return data;
    };

    const geocodeToPlaceId = async (addr) => {
      const u = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${key}`;
      const r = await fetch(u);
      const g = await r.json();
      return g?.results?.[0]?.place_id || null;
    };

    let o = fmt(origin);
    let d = fmt(destination);

    let data = await directions(o, d);
    let leg = data?.routes?.[0]?.legs?.[0];

    if (!leg) {
      const oPid = origin?.address ? await geocodeToPlaceId(origin.address) : null;
      const dPid = destination?.address ? await geocodeToPlaceId(destination.address) : null;
      if (oPid) o = `place_id:${encodeURIComponent(oPid)}`;
      if (dPid) d = `place_id:${encodeURIComponent(dPid)}`;
      data = await directions(o, d);
      leg = data?.routes?.[0]?.legs?.[0];
    }

    if (!leg) {
      return res.json({
        success: false,
        reason: data?.status || "NO_LEG",
        debug: { origin: o, destination: d },
      });
    }

    const meters = leg.distance?.value ?? 0;
    const seconds = leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0;
    const miles = meters * 0.000621371;
    const driveMin = Math.max(1, Math.round(seconds / 60));

    res.json({
      success: true,
      distanceMiles: Number(miles.toFixed(1)),
      driveMin,
      computedAt: Date.now(),
      trafficModel: "best_guess",
    });
  } catch (e) {
    res.status(200).json({ success: false, reason: e?.message || "ERROR" });
  }
}
