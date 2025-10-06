export type LatLng = { latitude: number; longitude: number };

export async function getEtaMinutes(
  origin: LatLng,
  destination: LatLng,
  apiKey: string
): Promise<number | null> {
  const o = `${origin.latitude},${origin.longitude}`;
  const d = `${destination.latitude},${destination.longitude}`;
  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${o}&destination=${d}&mode=driving&departure_time=now&key=${apiKey}`;
  const r = await fetch(url);
  const j = await r.json();
  const sec =
    j?.routes?.[0]?.legs?.[0]?.duration_in_traffic?.value ??
    j?.routes?.[0]?.legs?.[0]?.duration?.value ??
    null;
  if (typeof sec !== "number") return null;
  return Math.round(sec / 60);
}
