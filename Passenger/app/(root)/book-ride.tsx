import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useLocalSearchParams } from "expo-router";
import { StripeProvider } from "@stripe/stripe-react-native";
import { Ionicons } from "@expo/vector-icons";
import Payment from "@/components/Payment";
import RideLayout from "@/components/RideLayout";
import { icons } from "@/constants";
import { formatTime } from "@/lib/utils";
import { useLocationStore } from "@/store";
import { usePriceCalculator } from "@/lib/price";
import { fetchPassengerProfile } from "@/lib/fetch";

const RIDE_TYPES = {
    standard: { name: "Standard", seats: 4, multiplier: 1.0, icon: "car" },
    comfort: { name: "Comfort", seats: 6, multiplier: 1.2, icon: "car-sport" },
    xl: { name: "XL", seats: 7, multiplier: 1.5, icon: "bus" },
};

const BookRide: React.FC = () => {
    const { rideType } = useLocalSearchParams<{ rideType: string }>();
    const mileageAPI = process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY!;
    const { user } = useUser();
    const {
        userLatitude,
        userLongitude,
        destinationLatitude,
        destinationLongitude,
        userAddress,
        destinationAddress
    } = useLocationStore();

    const selectedRideTypeData = RIDE_TYPES[rideType as keyof typeof RIDE_TYPES] || RIDE_TYPES.standard;

    const { price, distance, time, arrivalTime } = usePriceCalculator(
        { latitude: userLatitude!, longitude: userLongitude! },
        { latitude: destinationLatitude!, longitude: destinationLongitude! },
        mileageAPI
    );

    const adjustedPrice = price * selectedRideTypeData.multiplier;

    const { userId } = useAuth();
    const [passengerDocId, setPassengerDocId] = useState<string | null>(null);
    const [stripeCustomerId, setStripeCustomerId] = useState<string>("");

    useEffect(() => {
        const load = async () => {
            if (!userId) return;
            const { data, docId } = await fetchPassengerProfile(userId);
            if (docId) setPassengerDocId(docId);
            if (data?.stripeCustomerId) setStripeCustomerId(data.stripeCustomerId);
        };
        load();
    }, [userId]);

    return (
            <RideLayout title="Book Your Ride">
                <>
                    <View style={styles.rideTypeBanner}>
                        <View style={styles.rideTypeHeader}>
                            <View style={styles.rideTypeIconContainer}>
                                <Ionicons
                                    name={selectedRideTypeData.icon as any}
                                    size={24}
                                    color="#3f7564"
                                />
                            </View>
                            <View style={styles.rideTypeDetails}>
                                <Text style={styles.rideTypeName}>
                                    {selectedRideTypeData.name} Ride
                                </Text>
                                <Text style={styles.rideTypeSeats}>
                                    Up to {selectedRideTypeData.seats} passengers
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.infoCard}>
                        <View style={[styles.infoRow, styles.borderedRow]}>
                            <Text style={styles.infoText}>Ride Price</Text>
                            <Text style={[styles.infoText, styles.price]}>
                                ${adjustedPrice.toFixed(2)}
                            </Text>
                        </View>

                        {/* <View style={[styles.infoRow, styles.borderedRow]}>
                            <Text style={styles.infoText}>Pickup In</Text>
                            <Text style={styles.infoText}>{formatTime(5)}</Text>
                        </View> */}

                        {/* <View style={[styles.infoRow, styles.borderedRow]}>
                            <Text style={styles.infoText}>Arrival Time</Text>
                            <Text style={styles.infoText}>{arrivalTime}</Text>
                        </View> */}

                        <View style={[styles.infoRow, styles.borderedRow]}>
                            <Text style={styles.infoText}>Vehicle Type</Text>
                            <Text style={styles.infoText}>{selectedRideTypeData.name} - {selectedRideTypeData.seats} seats </Text>
                        </View>
                    </View>

                    <View style={styles.driverAssignmentCard}>
                        <View style={styles.driverAssignmentHeader}>
                            <Ionicons name="location" size={20} color="#3f7564" />
                            <Text style={styles.driverAssignmentTitle}>Driver Assignment</Text>
                        </View>
                        <Text style={styles.driverAssignmentSubtext}>
                            You'll receive driver details and can track their arrival.
                        </Text>
                    </View>

                    <View style={styles.addressContainer}>
                        <View style={styles.addressRow}>
                            <Image source={icons.to} style={styles.icon} />
                            <Text style={styles.addressText}>{userAddress}</Text>
                        </View>

                        <View style={styles.addressRow}>
                            <Image source={icons.point} style={styles.icon} />
                            <Text style={styles.addressText}>{destinationAddress}</Text>
                        </View>
                    </View>

                    <Payment
                        fullName={user?.fullName!}
                        email={user?.emailAddresses[0].emailAddress!}
                        amount={adjustedPrice.toFixed(2).toString()}
                        driver_id={""}
                        rideTime={time}
                        isScheduled={false}
                        rideType={rideType as string}
                        requiredSeats={selectedRideTypeData.seats}
                        passengerDocId={passengerDocId}
                        passengerStripeCustomerId={stripeCustomerId}
                    />
                </>
            </RideLayout>
    );
};

const styles = StyleSheet.create({
    rideTypeBanner: {
        backgroundColor: "#F0F9F5",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: "#3f7564",
    },
    rideTypeHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    rideTypeIconContainer: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: "#E8F5E8",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    rideTypeDetails: {
        flex: 1,
    },
    rideTypeName: {
        fontSize: 18,
        fontFamily: "DMSans-Bold",
        color: "#3f7564",
        marginBottom: 2,
    },
    rideTypeSeats: {
        fontSize: 14,
        fontFamily: "DMSans",
        color: "#666",
    },
    driverSearchText: {
        fontSize: 14,
        fontFamily: "DMSans",
        color: "#3f7564",
        fontStyle: "italic",
    },
    infoCard: {
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        borderRadius: 16,
        backgroundColor: "white",
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        paddingVertical: 12,
    },
    borderedRow: {
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    infoText: {
        fontSize: 16,
        fontFamily: "DMSans",
        color: "#000",
    },
    price: {
        color: "#0CC25F",
        fontFamily: "DMSans-Bold",
        fontSize: 18,
    },
    driverAssignmentCard: {
        backgroundColor: "#FFF7ED",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: "#F59E0B",
    },
    driverAssignmentHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    driverAssignmentTitle: {
        fontSize: 16,
        fontFamily: "DMSans-SemiBold",
        color: "#92400E",
        marginLeft: 8,
    },
    driverAssignmentText: {
        fontSize: 14,
        fontFamily: "DMSans",
        color: "#92400E",
        lineHeight: 18,
        marginBottom: 6,
    },
    driverAssignmentSubtext: {
        fontSize: 13,
        fontFamily: "DMSans",
        color: "#A16207",
        lineHeight: 16,
    },
    addressContainer: {
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingBottom: 10,
        marginBottom: 16,
    },
    addressRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#E5E7EB",
        width: "100%",
        paddingVertical: 15,
        paddingLeft: 12,
        backgroundColor: "white",
    },
    addressText: {
        fontSize: 16,
        fontFamily: "DMSans",
        marginLeft: 10,
        flex: 1,
    },
    icon: {
        width: 24,
        height: 24,
    },
});

export default BookRide;