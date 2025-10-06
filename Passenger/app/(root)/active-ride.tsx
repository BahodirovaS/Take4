import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";

import RideLayout from "@/components/RideLayout";
import RequestLoading from "@/components/RequestLoading";
import LiveDriver from "@/components/LiveDriver";
import { useLocationStore } from "@/store";
import { db } from "@/lib/firebase";
import { findActiveRide, subscribeToRideUpdates, fetchDriverDetails } from "@/lib/fetch";
import { getEtaMinutes, LatLng } from "@/lib/eta";

const ActiveRide = () => {
    const { user } = useUser();
    const { rideId: paramRideId } = useLocalSearchParams();
    const [rideId, setRideId] = useState<string | null>((paramRideId as string) || null);
    const [rideStatus, setRideStatus] = useState<string>("requested");
    const [driverId, setDriverId] = useState<string | null>(null);
    const [driverLocation, setDriverLocation] = useState<LatLng | null>(null);
    const [driverName, setDriverName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { destinationAddress, userAddress } = useLocationStore();
    const [originAddress, setOriginAddress] = useState<string | null>(userAddress ?? null);
    const apiKey = process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY || "";
    const [pickup, setPickup] = useState<LatLng | null>(null);
    const [driverEtaMin, setDriverEtaMin] = useState<number | null>(null);
    const [destination, setDestination] = useState<LatLng | null>(null);
    const [dropoffEtaMin, setDropoffEtaMin] = useState<number | null>(null);

    useEffect(() => {
        if (paramRideId) {
            setRideId(paramRideId as string);
            setIsLoading(false);
            return;
        }
        if (!user?.id) {
            setIsLoading(false);
            return;
        }
        findActiveRide(
            user.id,
            (rideData: { id: string; status: string } | null) => {
                if (rideData) {
                    setRideId(rideData.id);
                    router.setParams({ rideId: rideData.id });
                }
                setIsLoading(false);
            },
            () => setIsLoading(false)
        );
    }, [user?.id, paramRideId]);

    useEffect(() => {
        if (!rideId) return;
        (async () => {
            try {
                const snap = await getDoc(doc(db, "rideRequests", rideId));
                const d: any = snap.data();
                if (d?.origin_latitude != null && d?.origin_longitude != null) {
                    setPickup({ latitude: Number(d.origin_latitude), longitude: Number(d.origin_longitude) });
                }
                if (d?.destination_latitude != null && d?.destination_longitude != null) {
                    setDestination({ latitude: Number(d.destination_latitude), longitude: Number(d.destination_longitude) });
                }
                if (!originAddress && d?.origin_address) setOriginAddress(String(d.origin_address));

            } catch { }
        })();
    }, [rideId]);


    useEffect(() => {
        if (rideStatus !== "in_progress" || !apiKey || !driverLocation || !destination) return;
        let cancelled = false;

        const compute = async () => {
            const eta = await getEtaMinutes(driverLocation, destination, apiKey);
            if (!cancelled) setDropoffEtaMin(eta);
        };

        compute();
        const id = setInterval(compute, 15000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [
        rideStatus,
        driverLocation?.latitude,
        driverLocation?.longitude,
        destination?.latitude,
        destination?.longitude,
        apiKey
    ]);


    useEffect(() => {
        if (!rideId) return;
        const unsubscribe = subscribeToRideUpdates(
            rideId,
            (
                status: string,
                newDriverId: string | null,
                newDriverLocation: { latitude: number; longitude: number },
            ) => {
                setRideStatus(status);
                if (newDriverId) setDriverId(newDriverId);
                if (
                    newDriverLocation &&
                    Number.isFinite(newDriverLocation.latitude) &&
                    Number.isFinite(newDriverLocation.longitude) &&
                    !(newDriverLocation.latitude === 0 && newDriverLocation.longitude === 0)
                ) {
                    setDriverLocation({ latitude: newDriverLocation.latitude, longitude: newDriverLocation.longitude });
                }
            },
            (completedRideId: string) => {
                router.replace({ pathname: "/(root)/ride-completed", params: { rideId: completedRideId } });
            },
            (error: any) => {
                console.error("Error with ride updates:", error);
            }
        );
        return () => unsubscribe();
    }, [rideId]);

    useEffect(() => {
        if (!driverId) return;
        fetchDriverDetails(
            driverId,
            (name: string | null) => {
                if (name) setDriverName(name);
            },
            (error: any) => {
                console.error("Error fetching driver details:", error);
            }
        );
    }, [driverId]);

    useEffect(() => {
        if (!apiKey || !pickup || !driverLocation) return;
        let cancelled = false;

        const compute = async () => {
            const eta = await getEtaMinutes(driverLocation, pickup, apiKey);
            if (!cancelled) setDriverEtaMin(eta);
        };

        compute();
        const id = setInterval(compute, 15000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [driverLocation?.latitude, driverLocation?.longitude, pickup?.latitude, pickup?.longitude, apiKey]);

    const handleGoToHome = () => {
        router.push({ pathname: "/(root)/(tabs)/home" });
    };

    const getRideStatusTitle = () => {
        if (rideStatus === "accepted") {
            return driverEtaMin != null
                ? `Arriving in ${driverEtaMin} min`
                : (driverName ? `${driverName} is on the way!` : "Your driver is on the way!");
        } else if (rideStatus === "arrived_at_pickup") {
            return driverName ? `${driverName} is here!` : "Your driver is here!";
        } else if (rideStatus === "in_progress") {
            return `Headed to ${destinationAddress}`;
        } else if (rideStatus === "completed") {
            return "Your ride is complete";
        }
        return "";
    };

    const hasDriverFix = !!(driverLocation && Number.isFinite(driverLocation.latitude) && Number.isFinite(driverLocation.longitude));

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
                    <Text style={styles.errorText}>No active driver found. Please request a new ride.</Text>
                </View>
            </RideLayout>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backButton} onPress={handleGoToHome}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>

                <View style={styles.titleBlock}>
                    <Text style={styles.topBarText}>Active Ride</Text>

                    {(originAddress || destinationAddress) && (
                        <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={styles.routeText}
                        >
                            {(originAddress ? originAddress.split(",")[0] : "Origin")} → {(destinationAddress ? destinationAddress.split(",")[0] : "Destination")}
                        </Text>
                    )}
                </View>
            </View>


            <RideLayout
                title={getRideStatusTitle()}
                rideStatus={rideStatus}
                {...(hasDriverFix ? { driverLocation: driverLocation! } : {})}
            >
                {rideStatus === "in_progress" && dropoffEtaMin != null && (
                    <View style={styles.etaContainer}>
                        <Text style={styles.etaLabel}>Estimated arrival</Text>
                        <Text style={styles.etaValue}>{dropoffEtaMin} min</Text>
                    </View>
                )}
                <Text style={styles.headerText}>Your Driver</Text>
                {["accepted", "arrived_at_pickup", "in_progress"].includes(rideStatus) && driverId && hasDriverFix ? (
                    <LiveDriver
                        driverId={driverId}
                        rideId={rideId}
                        driverLocation={driverLocation!}
                        rideStatus={rideStatus}
                    />
                ) : rideStatus === "requested" ? (
                    <RequestLoading rideId={rideId} />
                ) : (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>Your ride was {rideStatus}. Please try requesting again.</Text>
                    </View>
                )}
            </RideLayout>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: "white" 
    },
    backButton: { 
        paddingTop: 15 
    },
    topBar: {
        height: 36,
        backgroundColor: "white",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        marginBottom: 15,
        zIndex: 10,
    },
    titleBlock: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
    },

    routeText: {
        fontSize: 14,
        fontFamily: "DMSans",
        color: "#666",
        marginTop: 4,
        textAlign: "center",
        maxWidth: "80%",
    },
    etaContainer: {
        alignItems: "flex-start",
        marginTop: 0,
        marginBottom: 12,
    },
    etaLabel: {
        fontSize: 14,
        fontFamily: "DMSans",
        color: "#666",
        marginBottom: 2,
    },
    etaValue: {
        fontSize: 20,
        fontFamily: "DMSans-Bold",
        color: "#000",
    },
    topBarText: { fontSize: 18, fontFamily: "DMSans-SemiBold", color: "#333", paddingTop: 15 },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
    loadingText: { marginTop: 20, fontSize: 16, textAlign: "center", fontFamily: "DMSans" },
    headerText: { fontSize: 18, marginTop: 5, marginBottom: 10, fontFamily: "DMSans" },
    errorContainer: { flex: 1, alignItems: "center", padding: 20 },
    errorText: { fontSize: 16, textAlign: "center", fontFamily: "DMSans", color: "#FF3B30" },
});

export default ActiveRide;
