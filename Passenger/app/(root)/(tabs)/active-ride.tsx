import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { doc, onSnapshot, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@clerk/clerk-expo";
import RideLayout from "@/components/RideLayout";
import RequestLoading from "@/components/RequestLoading";
import DriverInfo from "@/components/LiveDriver";
import { useLocationStore } from "@/store";
import LiveDriver from "@/components/LiveDriver";

const ActiveRide = () => {
    const { user } = useUser();
    const { rideId: paramRideId } = useLocalSearchParams();
    const [rideId, setRideId] = useState<string | null>(paramRideId as string || null);
    const [rideStatus, setRideStatus] = useState<string>("requested");
    const [driverId, setDriverId] = useState<string | null>(null);
    const [driverLocation, setDriverLocation] = useState({
        latitude: 0,
        longitude: 0
    });
    const [driverName, setDriverName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { userAddress, destinationAddress } = useLocationStore();

    useEffect(() => {
        const findActiveRide = async () => {
            if (paramRideId) {
                setRideId(paramRideId as string);
                setIsLoading(false);
                return;
            }
            if (!user?.id) {
                setIsLoading(false);
                return;
            }
            try {
                const ridesRef = collection(db, "rideRequests");
                const activeRidesQuery = query(
                    ridesRef,
                    where("user_id", "==", user.id),
                    where("status", "in", ["requested", "accepted", "arrived_at_pickup", "in_progress"])
                );
                const querySnapshot = await getDocs(activeRidesQuery);
                if (!querySnapshot.empty) {
                    const rides = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    rides.sort((a, b) => {
                        const getTimestamp = (item: any) => {
                            if (!item.createdAt) return 0;
                            if (item.createdAt.toDate) {
                                return item.createdAt.toDate().getTime();
                            }
                            if (item.createdAt instanceof Date) {
                                return item.createdAt.getTime();
                            }
                            if (typeof item.createdAt === 'string') {
                                return new Date(item.createdAt).getTime();
                            }
                            return 0;
                        };
                        return getTimestamp(b) - getTimestamp(a);
                    });
                    const activeRide = rides[0];
                    setRideId(activeRide.id);
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


    useEffect(() => {
        if (!rideId) return;
        const rideRef = doc(db, "rideRequests", rideId);
        const unsubscribe = onSnapshot(rideRef, (snapshot) => {
            const data = snapshot.data();
            if (data) {
                const { setDestinationLocation } = useLocationStore.getState();
                if (data.destination_latitude && data.destination_longitude && data.destination_address) {
                    setDestinationLocation({
                        latitude: data.destination_latitude,
                        longitude: data.destination_longitude,
                        address: data.destination_address
                    });
                }    
                setRideStatus(data.status);
                if (data.driver_id && 
                    (data.status === "accepted" || 
                     data.status === "arrived_at_pickup" || 
                     data.status === "in_progress")) {
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


    useEffect(() => {
        if (!driverId) return;
        const fetchDriverDetails = async () => {
            try {
                const driversRef = collection(db, "drivers");
                const driverQuery = query(driversRef, where("clerkId", "==", driverId));
                const querySnapshot = await getDocs(driverQuery);
                if (!querySnapshot.empty) {
                    const driverData = querySnapshot.docs[0].data();
                    setDriverName(`${driverData.firstName}`);
                } else {
                    console.log("Driver not found");
                }
            } catch (error) {
                console.error("Error fetching driver details:", error);
            }
        };
        fetchDriverDetails();
    }, [driverId]);


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
        <RideLayout
            title={
                rideStatus === "accepted" && driverName ? `${driverName} is on the way!` :
                    rideStatus === "arrived_at_pickup" && driverName ? `${driverName} is here!` :
                        rideStatus === "in_progress" ? `Headed to ${destinationAddress}` :
                            rideStatus === "completed" ? "Your ride is complete" :
                                ""
            }
            rideStatus={rideStatus}
            driverLocation={driverLocation}
        >
            {["accepted", "arrived_at_pickup", "in_progress"].includes(rideStatus) && driverId ? (
                <LiveDriver
                    driverId={driverId}
                    rideId={rideId}
                    driverLocation={driverLocation}
                    rideStatus={rideStatus}
                />
            ) : rideStatus === "requested" ? (
                <RequestLoading rideId={rideId} />
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

export default ActiveRide;