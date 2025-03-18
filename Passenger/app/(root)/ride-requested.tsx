import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useUser } from "@clerk/clerk-expo";
import { useLocationStore, useDriverStore } from "@/store";
import CustomButton from "@/components/CustomButton";

const RideRequest: React.FC = () => {
    const { user } = useUser();
    const { rideId } = useLocalSearchParams();
    const [status, setStatus] = useState<string>("requested");
    const [elapsedTime, setElapsedTime] = useState<number>(0);
    
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        
        return () => clearInterval(timer);
    }, []);

    const formatElapsedTime = () => {
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    useEffect(() => {
        if (!rideId) return;
        
        const rideRef = doc(db, "rideRequests", rideId as string);
        
        const unsubscribe = onSnapshot(rideRef, (snapshot) => {
            const data = snapshot.data();
            if (data) {
                setStatus(data.status);
                
                if (data.status === "accepted") {
                    router.replace({
                        pathname: "/ride-confirmed",
                        params: { rideId },
                    });
                } else if (data.status === "rejected") {
                    // Handle rejection - could show alert or search for another driver
                    Alert.alert(
                        "Ride Rejected",
                        "Driver has rejected your ride request. You can try another driver.",
                        [
                            {
                                text: "OK",
                                onPress: () => router.back()
                            }
                        ]
                    );
                }
            }
        });

        return () => unsubscribe();
    }, [rideId]);

    const cancelRideRequest = async () => {
        if (!rideId) return;
        
        try {
            const rideRef = doc(db, "rideRequests", rideId as string);
            await updateDoc(rideRef, {
                status: "cancelled_by_user",
                cancelledAt: new Date()
            });
            
            router.back();
        } catch (error) {
            console.error("Error cancelling ride:", error);
            Alert.alert("Error", "Failed to cancel ride. Please try again.");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Finding Your Driver</Text>
            <ActivityIndicator size="large" color="#000" />
            
            <Text style={styles.statusText}>
                {status === "requested" && "Waiting for a driver to accept your ride..."}
                {status === "requested" && "Processing your ride request..."}
            </Text>
            
            <Text style={styles.timeText}>
                Waiting time: {formatElapsedTime()}
            </Text>
            
            <CustomButton
                title="Cancel Request"
                onPress={cancelRideRequest}
                style={styles.cancelButton}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        fontFamily: "JakartaBold",
    },
    statusText: {
        fontSize: 16,
        marginTop: 20,
        textAlign: "center",
        color: "#666",
        fontFamily: "JakartaRegular",
    },
    timeText: {
        fontSize: 14,
        marginTop: 10,
        color: "#888",
        fontFamily: "JakartaRegular",
    },
    cancelButton: {
        marginTop: 40,
        backgroundColor: "#FF3B30",
    },
});

export default RideRequest;