import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { doc, onSnapshot, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@clerk/clerk-expo";
import RideLayout from "@/components/RideLayout";
import RequestLoading from "@/components/RequestLoading";
import DriverInfo from "@/components/DriverInfo";
import { useLocationStore } from "@/store";

const RideConfirmed = () => {
    const { user } = useUser();
    const { rideId: paramRideId } = useLocalSearchParams();
    const [rideId, setRideId] = useState<string | null>(paramRideId as string || null);
    const [rideStatus, setRideStatus] = useState<string>("requested");
    const [driverId, setDriverId] = useState<string | null>(null);
    const [driverLocation, setDriverLocation] = useState({
        latitude: 0,
        longitude: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const { userAddress, destinationAddress } = useLocationStore();

    // First, check if we need to find an active ride
    useEffect(() => {
        const findActiveRide = async () => {
            if (paramRideId) {
                // If we already have a rideId from params, use that
                setRideId(paramRideId as string);
                setIsLoading(false);
                return;
            }

            if (!user?.id) {
                setIsLoading(false);
                return;
            }

            try {
                // Query for active rides for this user
                const ridesRef = collection(db, "rideRequests");
                const activeRidesQuery = query(
                    ridesRef,
                    where("user_id", "==", user.id),
                    where("status", "in", ["requested", "accepted"])
                );

                const querySnapshot = await getDocs(activeRidesQuery);

                if (!querySnapshot.empty) {
                    // Get the most recent active ride
                    const rides = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    // Sort by createdAt timestamp descending to get most recent ride
                    // Using camelCase as per your actual database structure
                    rides.sort((a, b) => {
                        // Handle Firestore timestamps or dates properly
                        const getTimestamp = (item: any) => {
                            if (!item.createdAt) return 0;

                            // Handle Firestore Timestamp objects
                            if (item.createdAt.toDate) {
                                return item.createdAt.toDate().getTime();
                            }

                            // Handle Date objects directly
                            if (item.createdAt instanceof Date) {
                                return item.createdAt.getTime();
                            }

                            // Handle string dates
                            if (typeof item.createdAt === 'string') {
                                return new Date(item.createdAt).getTime();
                            }

                            return 0;
                        };

                        return getTimestamp(b) - getTimestamp(a);
                    });

                    const activeRide = rides[0];

                    // Set the ride ID and update router
                    setRideId(activeRide.id);

                    // Update the URL without triggering a new navigation
                    router.setParams({ rideId: activeRide.id });
                } else {
                    console.log("No active rides found");
                }
            } catch (error) {
                console.error("Error finding active rides:", error);
            } finally {
                setIsLoading(false);
            }
        };

        findActiveRide();
    }, [user?.id, paramRideId]);

    // Now, watch for changes on the ride document
    useEffect(() => {
        if (!rideId) return;

        const rideRef = doc(db, "rideRequests", rideId);

        const unsubscribe = onSnapshot(rideRef, (snapshot) => {
            const data = snapshot.data();
            if (data) {
                setRideStatus(data.status);

                if (data.driver_id && data.status === "accepted") {
                    setDriverId(data.driver_id);

                    setDriverLocation({
                        latitude: data.driver_current_latitude || 0,
                        longitude: data.driver_current_longitude || 0
                    });
                }
            }
        });

        return () => unsubscribe();
    }, [rideId]);

    if (isLoading) {
        return (
            <RideLayout title="Your Ride">
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#000" />
                    <Text style={styles.loadingText}>Finding a Driver...</Text>
                </View>
            </RideLayout>
        );
    }

    if (!rideId) {
        return (
            <RideLayout title="Your Ride">
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        No active driver found. Please request a new ride.
                    </Text>
                </View>
            </RideLayout>
        );
    }

    return (
        <RideLayout title="Your driver is on the way!" snapPoints={["40%", "80%"]}>
            {rideStatus === "requested" ? (
                <RequestLoading rideId={rideId} />
            ) : rideStatus === "accepted" && driverId ? (
                <DriverInfo
                    driverId={driverId}
                    rideId={rideId}
                    driverLocation={driverLocation}
                />
            ) : (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        Your ride was {rideStatus}. Please try requesting again.
                    </Text>
                </View>
            )}
        </RideLayout>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
        textAlign: "center",
        fontFamily: "JakartaRegular",
    },
    errorContainer: {
        flex: 1,
        alignItems: "center",
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        textAlign: "center",
        fontFamily: "JakartaRegular",
        color: "#FF3B30",
    },
});

export default RideConfirmed;