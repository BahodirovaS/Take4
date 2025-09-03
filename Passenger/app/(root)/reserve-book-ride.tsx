import React, { useState } from "react";
import { Image, StyleSheet, Text, View, Alert } from "react-native";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useLocalSearchParams } from "expo-router";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import { Ionicons } from "@expo/vector-icons";
import Payment from "@/components/Payment";
import RideLayout from "@/components/RideLayout";
import { icons } from "@/constants";
import { formatTime } from "@/lib/utils";
import { useLocationStore, useReservationStore } from "@/store";
import { usePriceCalculator } from "@/lib/price";

const RIDE_TYPES = {
  standard: { name: "Standard", seats: 4, multiplier: 1.0, icon: "car" },
  comfort: { name: "Comfort", seats: 6, multiplier: 1.2, icon: "car-sport" },
  xl: { name: "XL", seats: 7, multiplier: 1.5, icon: "bus" },
};

const ReserveBookRide: React.FC = () => {
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
    const { scheduledDate, scheduledTime } = useReservationStore();

    const selectedRideTypeData = RIDE_TYPES[rideType as keyof typeof RIDE_TYPES] || RIDE_TYPES.standard;

    const { price, time } = usePriceCalculator(
        { latitude: userLatitude!, longitude: userLongitude! },
        { latitude: destinationLatitude!, longitude: destinationLongitude! },
        mileageAPI
    );

    const adjustedPrice = price * selectedRideTypeData.multiplier;

    return (
        <StripeProvider
            publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
            merchantIdentifier="merchant.com.uber"
            urlScheme="myapp"
        >
            <RideLayout title="Book Your Scheduled Ride">
                <>
                    <View style={styles.reservationBanner}>
                        <Text style={styles.reservationTitle}>Scheduled Ride</Text>
                        <Text style={styles.reservationDetails}>
                            {scheduledDate}, {scheduledTime}
                        </Text>
                        <View style={styles.rideTypeInfo}>
                            <Ionicons 
                                name={selectedRideTypeData.icon as any} 
                                size={18} 
                                color="#0066CC" 
                            />
                            <Text style={styles.rideTypeText}>
                                {selectedRideTypeData.name} • Up to {selectedRideTypeData.seats} passengers
                            </Text>
                        </View>
                    </View>

                    <View style={styles.infoCard}>
                        <View style={[styles.infoRow, styles.borderedRow]}>
                            <Text style={styles.infoText}>Ride Type</Text>
                            <Text style={[styles.infoText, styles.rideType]}>
                                {selectedRideTypeData.name}
                            </Text>
                        </View>

                        <View style={[styles.infoRow, styles.borderedRow]}>
                            <Text style={styles.infoText}>Ride Price</Text>
                            <Text style={[styles.infoText, styles.price]}>
                                ${adjustedPrice.toFixed(2)}
                            </Text>
                        </View>

                        <View style={[styles.infoRow, styles.borderedRow]}>
                            <Text style={styles.infoText}>Estimated Time</Text>
                            <Text style={styles.infoText}>{formatTime(time)}</Text>
                        </View>

                        {/* <View style={styles.infoRow}>
                            <Text style={styles.infoText}>Passenger Capacity</Text>
                            <Text style={styles.infoText}>Up to {selectedRideTypeData.seats} seats</Text>
                        </View> */}
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
                        driver_id={""} // No specific driver - will be assigned later
                        rideTime={time}
                        isScheduled={true}
                        scheduledDate={scheduledDate!}
                        scheduledTime={scheduledTime!}
                        rideType={rideType as string}
                        requiredSeats={selectedRideTypeData.seats}
                    />
                </>
            </RideLayout>
        </StripeProvider>
    );
};

const styles = StyleSheet.create({
    reservationBanner: {
        backgroundColor: "#E8F5FF",
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
    },
    reservationTitle: {
        fontSize: 18,
        fontFamily: "DMSans-SemiBold",
        color: "#0066CC",
    },
    reservationDetails: {
        fontSize: 17,
        fontFamily: "DMSans",
        marginTop: 5,
        marginBottom: 8,
    },
    rideTypeInfo: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
    },
    rideTypeText: {
        fontSize: 14,
        fontFamily: "DMSans-SemiBold",
        color: "#0066CC",
        marginLeft: 6,
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
    },
    rideType: {
        color: "#3f7564",
        fontFamily: "DMSans-SemiBold",
    },
    price: {
        color: "#0CC25F",
        fontFamily: "DMSans-Bold",
        fontSize: 18,
    },
    driverAssignmentCard: {
        backgroundColor: "#F0F9F5",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: "#3f7564",
    },
    driverAssignmentHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    driverAssignmentTitle: {
        fontSize: 16,
        fontFamily: "DMSans-SemiBold",
        color: "#3f7564",
        marginLeft: 8,
    },
    driverAssignmentText: {
        fontSize: 14,
        fontFamily: "DMSans",
        color: "#166534",
        lineHeight: 18,
        marginBottom: 6,
    },
    driverAssignmentSubtext: {
        fontSize: 13,
        fontFamily: "DMSans",
        color: "#15803D",
        lineHeight: 16,
        fontStyle: "italic",
    },
    addressContainer: {
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingBottom: 10,
        marginTop: 15,
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
        paddingLeft: 10,
        backgroundColor: "white",
    },
    addressText: {
        fontSize: 16,
        fontFamily: "DMSans",
        marginLeft: 8,
    },
    icon: {
        width: 24,
        height: 24,
    },
});

export default ReserveBookRide;