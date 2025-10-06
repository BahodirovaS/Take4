import { useEffect, useRef, useState } from "react";

type LatLng = { latitude: number; longitude: number };

interface ETAResult {
  etaMin: number | null;
  arrivalText: string;
  loading: boolean;
}

export function useRealtimeETA(
  from: LatLng | null,
  to: LatLng | null,
  opts?: {
    apiKey?: string;
    pollMs?: number;
  }
): ETAResult {
  const [etaMin, setEtaMin] = useState<number | null>(null);
  const [arrivalText, setArrivalText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const apiKey = opts?.apiKey || process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY!;
  const pollMs = opts?.pollMs ?? 20000;

  const fetchETA = async () => {
    if (!from || !to || !apiKey) return;
    controllerRef.current?.abort();
    const ac = new AbortController();
    controllerRef.current = ac;
    setLoading(true);

    try {
      const url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${from.latitude},${from.longitude}` +
        `&destination=${to.latitude},${to.longitude}` +
        `&mode=driving&departure_time=now&traffic_model=best_guess&key=${apiKey}`;

      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) throw new Error(`Directions HTTP ${res.status}`);
      const data = await res.json();
      const leg = data?.routes?.[0]?.legs?.[0];
      if (!leg) throw new Error(data?.status || "No route");

      const sec: number = leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0;
      const min = Math.max(1, Math.round(sec / 60));
      setEtaMin(min);

      const etaDate = new Date(Date.now() + sec * 1000);
      setArrivalText(
        etaDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      );
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchETA();
    const id = setInterval(fetchETA, pollMs);
    return () => {
      clearInterval(id);
      controllerRef.current?.abort();
    };
  }, [from?.latitude, from?.longitude, to?.latitude, to?.longitude, apiKey, pollMs]);

  return { etaMin, arrivalText, loading };
}
