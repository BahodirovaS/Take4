import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import CustomButton from "@/components/CustomButton";

interface RequestLoadingProps {
    rideId: string;
}

const RequestLoading: React.FC<RequestLoadingProps> = ({ rideId }) => {
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

    const cancelRideRequest = async () => {
        if (!rideId) return;
        
        try {
            const rideRef = doc(db, "rideRequests", rideId);
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
                Waiting for a driver to accept your ride...
            </Text>
            
            <Text style={styles.timeText}>
                Waiting time: {formatElapsedTime()}
            </Text>
            
            <CustomButton
                title="Cancel Request"
                onPress={cancelRideRequest}
                bgVariant="danger"
                style={styles.cancelButton}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        fontFamily: "DMSans-Bold",
    },
    statusText: {
        fontSize: 16,
        marginTop: 20,
        textAlign: "center",
        color: "#666",
        fontFamily: "DMSans",
    },
    timeText: {
        fontSize: 14,
        marginTop: 10,
        color: "#888",
        fontFamily: "DMSans",
    },
    cancelButton: {
        marginTop: 40,
    },
});

export default RequestLoading;