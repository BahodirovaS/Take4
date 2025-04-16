import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator, Alert, Linking, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import CustomButton from "@/components/CustomButton";
import { icons, images } from "@/constants";
import { MarkerData } from "@/types/type";
import { DriverInfoProps } from "@/types/type";
import { Ionicons } from "@expo/vector-icons";
import LiveDriverCard from "./LiveDriverCard";

interface ExtendedDriverInfoProps extends DriverInfoProps {
    rideStatus?: string;
}
const LiveDriver: React.FC<ExtendedDriverInfoProps> = ({ driverId, rideId, driverLocation, rideStatus="" }) => {
    const [driver, setDriver] = useState<MarkerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [eta, setEta] = useState("Calculating...");
    const [phoneNumber, setPhoneNumber] = useState<string | null>(null);


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
                    if (driverData.phoneNumber) {
                        setPhoneNumber(driverData.phoneNumber);
                    }
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
            Alert.alert(
                "Ride Canceled",
                "Your ride has been canceled successfully.",
                [{ text: "OK", onPress: () => router.back() }]
            );
        } catch (error) {
            console.error("Error cancelling ride:", error);
            Alert.alert("Error", "Failed to cancel ride. Please try again.");
        }
    };


    const contactDriverMessage = () => {
        if (!driver) return;
        router.push({
            pathname: "/(root)/chat",
            params: {
                otherPersonId: driver.clerk_id,
                otherPersonName: driver.first_name,
                rideId: rideId,
                context: "active_ride"
            }
        });
    };


    const contactDriverPhone = () => {
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
            <LiveDriverCard 
                driver={driver}
                eta={eta}
                rideStatus={rideStatus}
                onMessagePress={contactDriverMessage}
                onCallPress={contactDriverPhone}
            />
            {rideStatus !== "arrived_at_pickup" && rideStatus !== "in_progress" && (
            <CustomButton
                title="Cancel Ride"
                onPress={cancelRideRequest}
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