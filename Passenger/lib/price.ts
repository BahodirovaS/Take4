import { useEffect, useState } from "react";
import { fetchPricing } from "@/lib/fetch";
import { Pricing } from "@/types/type";

export const usePriceCalculator = (
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  mileageAPI: string
): { price: number; distance: number; time: number; arrivalTime: string } => {
  const [price, setPrice] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [time, setTime] = useState<number>(0);
  const [arrivalTime, setArrivalTime] = useState<string>("");
  const [pricing, setPricing] = useState<Pricing | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const p = await fetchPricing();
        if (!cancelled) setPricing(p);
      } catch (e) {
        console.warn("Failed to load pricing:", e);
        if (!cancelled) {
          setPricing({
            basePrice: 2.5,
            perMileRate: 1.0,
            perMinuteRate: 0.1,
            minimumPrice: 5.0,
            fixedPickupTime: 5,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const calculatePriceAndArrival = async () => {
      if (!pricing) return;

      const originString = `${origin.latitude},${origin.longitude}`;
      const destinationString = `${destination.latitude},${destination.longitude}`;

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${originString}&destination=${destinationString}&departure_time=now&key=${mileageAPI}`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const legs = data.routes[0].legs[0];
        const distanceInMeters: number = legs.distance.value;
        const durationInSeconds: number =
          legs.duration_in_traffic?.value || legs.duration.value;

        const distanceInMiles = distanceInMeters * 0.000621371;
        const durationInMinutes = Math.round(durationInSeconds / 60);

        setDistance(Number(distanceInMiles.toFixed(1)));
        setTime(durationInMinutes);

        const calculatedPrice =
          pricing.basePrice +
          distanceInMiles * pricing.perMileRate +
          durationInMinutes * pricing.perMinuteRate;

        const finalPrice = Math.max(calculatedPrice, pricing.minimumPrice);
        setPrice(Number(finalPrice.toFixed(2)));

        const totalTravelTime = durationInMinutes + pricing.fixedPickupTime;
        const now = new Date();
        now.setMinutes(now.getMinutes() + totalTravelTime);
        setArrivalTime(
          now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
      }
    };

    if (
      pricing &&
      origin?.latitude != null &&
      origin?.longitude != null &&
      destination?.latitude != null &&
      destination?.longitude != null
    ) {
      calculatePriceAndArrival();
    }
  }, [origin, destination, mileageAPI, pricing]);

  return { price, distance, time, arrivalTime };
};