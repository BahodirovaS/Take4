import { useEffect, useState } from "react";

export const usePriceCalculator = (
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  mileageAPI: string
): { price: number; distance: number; time: number; arrivalTime: string } => {
  const [price, setPrice] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [time, setTime] = useState<number>(0);
  const [arrivalTime, setArrivalTime] = useState<string>("");

  const basePrice = 2.5;
  const perMileRate = 1.0;
  const perMinuteRate = 0.1;
  const minimumPrice = 5.0;
  const fixedPickupTime = 5;

  useEffect(() => {
    const calculatePriceAndArrival = async () => {
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
          basePrice +
          distanceInMiles * perMileRate +
          durationInMinutes * perMinuteRate;
        const finalPrice = Math.max(calculatedPrice, minimumPrice);
        setPrice(finalPrice);

        const totalTravelTime = durationInMinutes + fixedPickupTime;
        const now = new Date();
        now.setMinutes(now.getMinutes() + totalTravelTime);
        setArrivalTime(
          now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
      }
    };

    if (
      origin?.latitude != null &&
      origin?.longitude != null &&
      destination?.latitude != null &&
      destination?.longitude != null
    ) {
      calculatePriceAndArrival();
    }
  }, [origin, destination, mileageAPI]);

  return { price, distance, time, arrivalTime };
};
