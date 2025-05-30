import React, { useState } from "react";
import { Image, StyleSheet, Text, View, Alert } from "react-native";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import Payment from "@/components/Payment";
import RideLayout from "@/components/RideLayout";
import { icons } from "@/constants";
import { formatTime } from "@/lib/utils";
import { useDriverStore, useLocationStore, useReservationStore } from "@/store";
import { usePriceCalculator } from "@/lib/price";

const ReserveBookRide: React.FC = () => {
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
    const { drivers, selectedDriver } = useDriverStore();
    const { scheduledDate, scheduledTime } = useReservationStore();

    const driverDetails = drivers?.find(
        (driver) => driver.clerk_id === selectedDriver
    );

    const driverClerkId = driverDetails?.clerk_id

    const { price, time } = usePriceCalculator(
        { latitude: userLatitude!, longitude: userLongitude! },
        { latitude: destinationLatitude!, longitude: destinationLongitude! },
        mileageAPI
    );

    let adjustedPrice = price;
    if (driverDetails) {
        if (driverDetails.car_seats === 6) {
            adjustedPrice *= 1.2;
        } else if (driverDetails.car_seats >= 7) {
            adjustedPrice *= 1.5;
        }
    }

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
                    </View>

                    <View style={styles.infoCard}>
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

                        <View style={styles.infoRow}>
                            <Text style={styles.infoText}>Car Seats</Text>
                            <Text style={styles.infoText}>{driverDetails?.car_seats}</Text>
                        </View>
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
                        driver_id={driverClerkId?.toString() ?? ""}
                        rideTime={time}
                        isScheduled={true}
                        scheduledDate={scheduledDate!}
                        scheduledTime={scheduledTime!}
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
    },
    infoCard: {
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        borderRadius: 30,
        backgroundColor: "white",
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
        borderBottomColor: "#CED4DA",
    },
    infoText: {
        fontSize: 16,
        fontFamily: "DMSans",
    },
    price: {
        color: "#0CC25F",
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
        borderColor: "#CED4DA",
        width: "100%",
        paddingVertical: 15,
        paddingLeft: 10,
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
    confirmButton: {
        marginVertical: 10,
        marginBottom: 70,
    },
    modalContainer: {
        height: 400,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
        padding: 20,
        borderRadius: 20,
    },
    checkImage: {
        width: 112,
        height: 112,
        marginTop: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontFamily: "DMSans-Bold",
        marginTop: 20,
        textAlign: "center",
    },
    modalText: {
        fontSize: 16,
        color: "#A0A0A0",
        fontFamily: "DMSans",
        textAlign: "center",
        marginTop: 10,
    },
    backButton: {
        marginTop: 20,
        width: 200,
        paddingVertical: 20,
    },
});

export default ReserveBookRide;