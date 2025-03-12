import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { router, useNavigation } from "expo-router";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { useUser } from "@clerk/clerk-expo";
import { useLocationStore, useDriverStore } from "@/store";
import { PriceCalculator } from "@/lib/price";

const RideRequest: React.FC = () => {
    const navigation = useNavigation();
    const { user } = useUser();
    const { userAddress, destinationAddress } = useLocationStore();
    const { drivers, selectedDriver } = useDriverStore();
    const mileageAPI = process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY!;

    const driverDetails = drivers?.find(
        (driver) => +driver.driver_id === selectedDriver
    );
    const driverClerkId = driverDetails?.clerk_id;

    const { price, distance, time, arrivalTime } = PriceCalculator(
        userAddress!,
        destinationAddress!,
        mileageAPI
    );
    
    const adjustedPrice = driverDetails?.car_seats
    ? driverDetails.car_seats >= 6
        ? price * 1.2
        : price
    : price;

    const [rideId, setRideId] = useState<string | null>(null);


    useEffect(() => {
        if (!rideId) return;
        const rideRef = doc(db, "rideRequests", rideId);
        
        const unsubscribe = onSnapshot(rideRef, (snapshot) => {
            const data = snapshot.data();
            if (data?.status === "accepted") {
                router.replace({
                    pathname: "/ride-confirmed",
                    params: { rideId },
                });
                            }
        });

        return () => unsubscribe();
    }, [rideId]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Ride Request Pending...</Text>
            <ActivityIndicator size="large" color="#000" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 10,
    },
});

export default RideRequest;
