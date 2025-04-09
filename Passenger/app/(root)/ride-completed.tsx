import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { images } from "@/constants";

import CustomButton from "@/components/CustomButton";

const RideCompleted = () => {
    const { rideId } = useLocalSearchParams();
    const [rideDetails, setRideDetails] = useState<any>(null);

    useEffect(() => {
        const fetchRideDetails = async () => {
            if (!rideId) return;

            try {
                const rideDocRef = doc(db, "rideRequests", rideId as string);
                const rideSnapshot = await getDoc(rideDocRef);

                if (rideSnapshot.exists()) {
                    const data = rideSnapshot.data();
                    setRideDetails(data);
                }
            } catch (error) {
                console.error("Error fetching ride details:", error);
            }
        };

        fetchRideDetails();
    }, [rideId]);

    if (!rideDetails) {
        return (
            <View style={styles.container}>
                <Text>Loading ride details...</Text>
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
                        ${(rideDetails.fare_price / 100).toFixed(2)}
                    </Text>
                </View>
            </View>

            <CustomButton 
                title="Back to Home" 
                onPress={() => router.replace("/(root)/(tabs)/home")}
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
        fontFamily: "JakartaBold",
        marginBottom: 20,
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
        fontFamily: "JakartaSemiBold",
        width: 80,
        color: "#666",
    },
    detailValue: {
        fontFamily: "JakartaRegular",
        flex: 1,
    },
    homeButton: {
        width: "100%",
    },
});

export default RideCompleted;