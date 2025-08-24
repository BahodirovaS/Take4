import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import RideLayout from "@/components/RideLayout";
import RequestLoading from "@/components/RequestLoading";
import LiveDriver from "@/components/LiveDriver";
import { useLocationStore } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import {
    findActiveRide,
    subscribeToRideUpdates,
    fetchDriverDetails
} from "@/lib/fetch";

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
    const { destinationAddress } = useLocationStore();


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
            (rideData: { id: string, status: string } | null) => {
                if (rideData) {
                    setRideId(rideData.id);
                    router.setParams({ rideId: rideData.id });
                }
                setIsLoading(false);
            },
            (error: any) => {
                console.error("Error finding active ride:", error);
                setIsLoading(false);
            }
        );
    }, [user?.id, paramRideId]);


    useEffect(() => {
        if (!rideId) return;
        const unsubscribe = subscribeToRideUpdates(
            rideId,
            (
                status: string,
                newDriverId: string | null,
                newDriverLocation: { latitude: number, longitude: number },
                destinationInfo: { latitude: number, longitude: number, address: string } | null
            ) => {
                setRideStatus(status);

                if (newDriverId) {
                    setDriverId(newDriverId);
                    setDriverLocation(newDriverLocation);
                }
            },
            (completedRideId: string) => {
                router.replace({
                    pathname: "/(root)/ride-completed",
                    params: { rideId: completedRideId }
                });
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
                if (name) {
                    setDriverName(name);
                }
            },
            (error: any) => {
                console.error("Error fetching driver details:", error);
            }
        );
    }, [driverId]);

    const handleGoToHome = () => {
        router.push({
            pathname: '/(root)/(tabs)/home',
        });
    };


    const getRideStatusTitle = () => {
        if ((rideStatus === "accepted" )) {
            return driverName ? `${driverName} is on the way!` : "Your driver is on the way!";
        } else if (rideStatus === "arrived_at_pickup") {
            return driverName ? `${driverName} is here!` : "Your driver is here!";
        } else if (rideStatus === "in_progress") {
            return `Headed to ${destinationAddress}`;
        } else if (rideStatus === "completed") {
            return "Your ride is complete";
        }
        return "";
    };


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
        <SafeAreaView style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleGoToHome}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.topBarText}>Active Ride</Text>
            </View>
            <RideLayout
                title={getRideStatusTitle()}
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    backButton: {
        paddingTop: 15,
    },
    topBar: {
        height: 36,
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        marginBottom: 10,
        zIndex: 10,
    },
    topBarText: {
        fontSize: 18,
        fontFamily: "DMSans-SemiBold",
        color: '#333',
        paddingTop: 15,
    },
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
        fontFamily: "DMSans",
    },
    errorContainer: {
        flex: 1,
        alignItems: "center",
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        textAlign: "center",
        fontFamily: "DMSans",
        color: "#FF3B30",
    },
});

export default ActiveRide;