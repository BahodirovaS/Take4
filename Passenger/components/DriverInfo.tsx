import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import CustomButton from "@/components/CustomButton";
import { icons, images } from "@/constants";
import { MarkerData } from "@/types/type";
import { DriverInfoProps } from "@/types/type";

const DriverInfo: React.FC<DriverInfoProps> = ({ driverId, rideId, driverLocation }) => {
    const [driver, setDriver] = useState<MarkerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [eta, setEta] = useState("Calculating...");
    
    useEffect(() => {
        const fetchDriver = async () => {
            if (!driverId) {
                console.error("No driverId provided to DriverInfo component");
                setLoading(false);
                return;
            }
            
            try {
                const driversCollection = collection(db, "drivers");
                const q = query(driversCollection, where("clerkId", "==", driverId));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    const driverDoc = querySnapshot.docs[0];
                    const driverData = driverDoc.data();
                    
                    setDriver({
                        id: parseInt(driverDoc.id) || 0,
                        clerk_id: driverId,
                        first_name: driverData.firstName || '',
                        last_name: driverData.lastName || '',
                        profile_image_url: driverData.profile_image_url || '',
                        car_image_url: driverData.car_image_url || '',
                        car_seats: driverData.carSeats || 4,
                        latitude: driverLocation.latitude,
                        longitude: driverLocation.longitude,
                        title: `${driverData.firstName || ''} ${driverData.lastName || ''}`,
                        time: driverData.time || 0,
                        price: driverData.price || "0",
                        status: driverData.status || true,
                        v_make: driverData.vMake || '',
                        v_plate: driverData.vPlate || '',
                        pets: driverData.pets
                    });
                    
                    // Calculate estimated arrival time
                    const randomMinutes = Math.floor(Math.random() * 10) + 5;
                    setEta(`${randomMinutes} min`);
                } else {
                    console.error("Driver not found with clerkId:", driverId);
                }
                
                setLoading(false);
            } catch (error) {
                console.error("Error fetching driver:", error);
                setLoading(false);
            }
        };
        
        fetchDriver();
    }, [driverId, driverLocation]);
    
    const cancelRideRequest = async () => {
        if (!rideId) return;
        
        try {
            const rideIdString = Array.isArray(rideId) ? rideId[0] : rideId as string;
            const rideRef = doc(db, "rideRequests", rideIdString);
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
    
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
                <Text style={styles.loadingText}>Loading driver details...</Text>
            </View>
        );
    }
    
    if (!driver) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>Couldn't load driver information</Text>
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
            {/* Simple Driver Card */}
            <View style={styles.card}>
                {/* Driver Info Row */}
                <View style={styles.driverRow}>
                    <Image 
                        source={
                            driver.profile_image_url 
                            ? { uri: driver.profile_image_url } 
                            : icons.person
                        } 
                        style={styles.driverImage} 
                    />
                    <View style={styles.driverDetails}>
                        <Text style={styles.driverName}>
                            {driver.first_name} {driver.last_name}
                        </Text>
                        <Text style={styles.carInfo}>
                            {driver.v_make} • {driver.v_plate}
                        </Text>
                    </View>
                    <View style={styles.etaContainer}>
                        <Text style={styles.etaLabel}>ETA</Text>
                        <Text style={styles.etaValue}>{eta}</Text>
                    </View>
                </View>
                
                {/* Button */}
                <CustomButton 
                    title="Cancel Ride"
                    onPress={cancelRideRequest}
                    style={styles.viewButton}
                />
            </View>
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
        fontFamily: "JakartaRegular",
        color: "#666",
    },
    errorText: {
        marginBottom: 15,
        fontFamily: "JakartaMedium",
        color: "#FF3B30",
        textAlign: "center",
    },
    retryButton: {
        backgroundColor: "#000",
    },
    card: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    driverRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    driverImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    driverDetails: {
        flex: 1,
    },
    driverName: {
        fontSize: 16,
        fontFamily: "JakartaSemiBold",
        marginBottom: 4,
    },
    carInfo: {
        fontSize: 14,
        fontFamily: "JakartaRegular",
        color: "#666",
    },
    etaContainer: {
        alignItems: "center",
        backgroundColor: "#f0f0f0",
        borderRadius: 8,
        padding: 8,
    },
    etaLabel: {
        fontSize: 12,
        fontFamily: "JakartaRegular",
        color: "#666",
        marginBottom: 2,
    },
    etaValue: {
        fontSize: 16,
        fontFamily: "JakartaBold",
    },
    viewButton: {
        marginTop: 8,
    },
});

export default DriverInfo;