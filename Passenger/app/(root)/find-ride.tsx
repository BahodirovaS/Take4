import React from "react";
import { router } from "expo-router";
import { Text, View, StyleSheet } from "react-native";

import CustomButton from "@/components/CustomButton";
import GoogleTextInput from "@/components/GoogleTextInput";
import RideLayout from "@/components/RideLayout";
import { icons } from "@/constants";
import { useLocationStore } from "@/store";

const FindRide: React.FC = () => {
    const {
        userAddress,
        destinationAddress,
        setDestinationLocation,
        setUserLocation,
    } = useLocationStore();

    return (
        <RideLayout title="Ride Details">
            <View style={styles.inputContainer}>
                <Text style={styles.label}>From</Text>
                <GoogleTextInput
                    icon={icons.target}
                    initialLocation={userAddress!}
                    containerStyle="bg-neutral-100"
                    textInputBackgroundColor="#f5f5f5"
                    handlePress={(location) => setUserLocation(location)}
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>To</Text>
                <GoogleTextInput
                    icon={icons.map}
                    initialLocation={destinationAddress!}
                    containerStyle="bg-neutral-100"
                    textInputBackgroundColor="transparent"
                    handlePress={(location) => setDestinationLocation(location)}
                />
            </View>

            <View style={styles.buttonContainer}>
                <CustomButton
                    title="Find Now"
                    onPress={() => router.push(`/(root)/confirm-ride`)}
                    style={styles.button}
                />
                <CustomButton
                    title="Reserve for later"
                    onPress={() => router.push(`/(root)/confirm-ride`)}
                    style={styles.button}
                />
            </View>
        </RideLayout>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        marginVertical: 8,
    },
    label: {
        fontSize: 18,
        fontFamily: "JakartaSemiBold",
        marginBottom: 12,
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
        marginBottom: 70,
    },
    button: {
        flex: 1,
        marginHorizontal: 6,
    },
});

export default FindRide;
