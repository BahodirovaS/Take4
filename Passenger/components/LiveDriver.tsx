import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert, Linking } from "react-native";
import { router } from "expo-router";
import CustomButton from "@/components/CustomButton";
import { MarkerData } from "@/types/type";
import { DriverInfoProps } from "@/types/type";
import LiveDriverCard from "./LiveDriverCard";
import {
    fetchDriverInfo,
    cancelRideRequest,
    navigateToDriverChat
} from "@/lib/fetch";

interface ExtendedDriverInfoProps extends DriverInfoProps {
    rideStatus?: string;
}

const LiveDriver: React.FC<ExtendedDriverInfoProps> = ({
    driverId,
    rideId,
    driverLocation,
    rideStatus = ""
}) => {
    const [driver, setDriver] = useState<MarkerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [eta, setEta] = useState("Calculating...");
    const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchDriverInfo(
            driverId,
            driverLocation,
            (driverData, phone, estimatedTime) => {
                setDriver(driverData);
                setPhoneNumber(phone);
                setEta(estimatedTime);
                setLoading(false);
            },
            // Error callback
            (error) => {
                console.error("Error fetching driver:", error);
                setError("Could not load driver information");
                setLoading(false);
            }
        );
    }, [driverId, driverLocation]);

    const handleContactDriverMessage = () => {
        if (!driver) return;
        navigateToDriverChat(driver, rideId);
    };

    const handleContactDriverPhone = () => {
        if (!phoneNumber) {
            Alert.alert("Contact Info", "Phone number is not available");
            return;
        }

        Linking.openURL(`tel:${phoneNumber}`)
            .catch(err => {
                Alert.alert("Error", "Could not open phone dialer");
                console.error('An error occurred', err);
            });
    };

    const handleCancelRide = () => {
        Alert.alert(
            "Cancel Ride",
            "Are you sure you want to cancel this ride?",
            [
                {
                    text: "No",
                    style: "cancel"
                },
                {
                    text: "Yes",
                    onPress: () => {
                        cancelRideRequest(
                            rideId,
                            () => {
                                Alert.alert(
                                    "Ride Canceled",
                                    "Your ride has been canceled successfully.",
                                    [{ text: "OK", onPress: () => router.back() }]
                                );
                            },
                            (error) => {
                                Alert.alert("Error", "Failed to cancel ride. Please try again.");
                            }
                        );
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
                <Text style={styles.loadingText}>Loading driver details...</Text>
            </View>
        );
    }

    if (error || !driver) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>{error || "Couldn't load driver information"}</Text>
                <CustomButton
                    title="Try Again"
                    onPress={() => router.back()}
                    style={styles.retryButton}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LiveDriverCard
                driver={driver}
                eta={eta}
                rideStatus={rideStatus}
                onMessagePress={handleContactDriverMessage}
                onCallPress={handleContactDriverPhone}
            />

            {rideStatus !== "arrived_at_pickup" && rideStatus !== "in_progress" && (
                <CustomButton
                    title="Cancel Ride"
                    onPress={handleCancelRide}
                    bgVariant="danger"
                    style={styles.cancelButton}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 0,
    },
    loadingContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 30,
    },
    loadingText: {
        marginTop: 10,
        fontFamily: "DMSans",
        color: "#666",
    },
    errorText: {
        marginBottom: 15,
        fontFamily: "DMSans-Medium",
        color: "#FF3B30",
        textAlign: "center",
    },
    retryButton: {
        backgroundColor: "#000",
    },
    cancelButton: {
        marginTop: 20,
    },
});

export default LiveDriver;