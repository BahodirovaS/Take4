import { useEffect, useState } from "react";

export const PriceCalculator = (
    userAddress: string,
    destinationAddress: string,
    mileageAPI: string
) => {
    const [price, setPrice] = useState<number>(0);
    const [distance, setDistance] = useState<number>(0);
    const [time, setTime] = useState<number>(0);
    const [arrivalTime, setArrivalTime] = useState<string>("");

    const basePrice = 1.0;
    const perMileRate = 1.0;
    const perMinuteRate = 0.1;
    const fixedPickupTime = 5; // time in minutes

    useEffect(() => {
        const calculatePriceAndArrival = async () => {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/directions/json?origin=${userAddress}&destination=${destinationAddress}&key=${mileageAPI}`
            );
            const data = await response.json();

            if (data.routes.length > 0) {
                const legs = data.routes[0].legs[0];
                const distanceInMeters = legs.distance.value; // in meters
                const durationInSeconds = legs.duration.value; // in seconds

                const distanceInMiles = distanceInMeters * 0.000621371; // meters to miles
                const durationInMinutes = Math.round(durationInSeconds / 60); // seconds to minutes
                
                setDistance(Number(distanceInMiles.toFixed(1))); // Keep 1 decimal place
                setTime(durationInMinutes);

                const totalPrice =
                    basePrice +
                    distanceInMiles * perMileRate +
                    durationInMinutes * perMinuteRate;
                setPrice(totalPrice);

                const totalTravelTime = durationInMinutes + fixedPickupTime;
                const now = new Date();
                now.setMinutes(now.getMinutes() + totalTravelTime);
                setArrivalTime(
                    now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                );
            }
        };

        calculatePriceAndArrival();
    }, [userAddress, destinationAddress]);

    return { price, distance, time, arrivalTime };
};
