import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { images } from "@/constants";
import CustomButton from "@/components/CustomButton";
import { CompletedRideDetails } from "@/types/type"
import { 
  fetchCompletedRideDetails, 
  formatFarePrice,  
} from "@/lib/fetch";

const RideCompleted = () => {
    const { rideId } = useLocalSearchParams();
    const [rideDetails, setRideDetails] = useState<CompletedRideDetails | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCompletedRideDetails(
            rideId as string,
            (details) => {
                setRideDetails(details);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error loading ride details:", error);
                setError("Could not load ride details. Please try again.");
                setIsLoading(false);
            }
        );
    }, [rideId]);
    const handleGoHome = () => {
        router.replace("/(root)/(tabs)/home");
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#289dd2" />
                <Text style={styles.loadingText}>Loading ride details...</Text>
            </View>
        );
    }

    if (error || !rideDetails) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>{error || "Unable to load ride details"}</Text>
                <CustomButton 
                    title="Back to Home" 
                    onPress={handleGoHome}
                    bgVariant="primary"
                    style={styles.homeButton}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Image source={images.check} style={styles.checkImage} />
            <Text style={styles.titleText}>Ride Completed</Text>
            <View style={styles.rideDetailsContainer}>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>From:</Text>
                    <Text style={styles.detailValue}>{rideDetails.origin_address}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>To:</Text>
                    <Text style={styles.detailValue}>{rideDetails.destination_address}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ride Time:</Text>
                    <Text style={styles.detailValue}>
                        {rideDetails.ride_time} minutes
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fare:</Text>
                    <Text style={styles.detailValue}>
                        {formatFarePrice(rideDetails.fare_price)}
                    </Text>
                </View>
            </View>
            <CustomButton 
                title="Back to Home" 
                onPress={handleGoHome}
                bgVariant="primary"
                style={styles.homeButton}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    checkImage: {
        width: 120,
        height: 120,
        marginBottom: 20,
    },
    titleText: {
        fontSize: 24,
        fontFamily: "DMSans-Bold",
        marginBottom: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        fontFamily: "DMSans",
        color: "#666",
    },
    errorText: {
        fontSize: 16,
        fontFamily: "DMSans",
        color: "#FF3B30",
        marginBottom: 20,
        textAlign: "center",
    },
    rideDetailsContainer: {
        width: "100%",
        backgroundColor: "#F5F5F5",
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: "row",
        marginBottom: 10,
    },
    detailLabel: {
        fontFamily: "DMSans-SemiBold",
        width: 80,
        color: "#666",
    },
    detailValue: {
        fontFamily: "DMSans",
        flex: 1,
    },
    homeButton: {
        width: "100%",
    },
});

export default RideCompleted;