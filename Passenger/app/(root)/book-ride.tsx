import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { StripeProvider } from "@stripe/stripe-react-native";
import Payment from "@/components/Payment";
import RideLayout from "@/components/RideLayout";
import { icons } from "@/constants";
import { formatTime } from "@/lib/utils";
import { useDriverStore, useLocationStore } from "@/store";
import { PriceCalculator } from "@/lib/price";

const BookRide: React.FC = () => {
    const mileageAPI = process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY!;
    const { user } = useUser();
    const { userAddress, destinationAddress } = useLocationStore();
    const { drivers, selectedDriver } = useDriverStore();


    const driverDetails = drivers?.find(
        (driver) => +driver.id === selectedDriver
    );

    const { price, distance, time, arrivalTime } = PriceCalculator(
        userAddress!,
        destinationAddress!,
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
            <RideLayout title="Book Your Ride">
                <>
                    <View style={styles.infoCard}>
                        <View style={[styles.infoRow, styles.borderedRow]}>
                            <Text style={styles.infoText}>Ride Price</Text>
                            <Text style={[styles.infoText, styles.price]}>
                                ${adjustedPrice.toFixed(2)}
                            </Text>
                        </View>

                        <View style={[styles.infoRow, styles.borderedRow]}>
                            <Text style={styles.infoText}>Pickup In</Text>
                            <Text style={styles.infoText}>{formatTime(5)}</Text>
                        </View>

                        <View style={[styles.infoRow, styles.borderedRow]}>
                            <Text style={styles.infoText}>Arrival Time</Text>
                            <Text style={styles.infoText}>{arrivalTime}</Text>
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

                        {/* <View style={styles.addressRow}>
                            <Image source={icons.point} style={styles.icon} />
                            <Text style={styles.addressText}>Need mileage</Text>
                        </View> */}
                    </View>

                    <Payment
                        fullName={user?.fullName!}
                        email={user?.emailAddresses[0].emailAddress!}
                        amount={adjustedPrice.toFixed(2).toString()}
                        driver_id={driverDetails?.id?.toString() ?? ""}
                        rideTime={time}
                    />
                </>
            </RideLayout>
        </StripeProvider>
    );
};

const styles = StyleSheet.create({
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
        fontFamily: "JakartaRegular",
    },
    price: {
        color: "#0CC25F",
    },
    addressContainer: {
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingBottom: 10,
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
        fontFamily: "JakartaRegular",
        marginLeft: 8,
    },
    icon: {
        width: 24,
        height: 24,
    },
});

export default BookRide;
