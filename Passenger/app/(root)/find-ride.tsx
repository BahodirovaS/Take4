import React, { useEffect } from "react";
import { router } from "expo-router";
import { Text, View, StyleSheet } from "react-native";

import CustomButton from "@/components/CustomButton";
import GoogleTextInput from "@/components/GoogleTextInput";
import RideLayout from "@/components/RideLayout";
import { icons } from "@/constants";
import { useLocationStore, useRidePrefsStore } from "@/store";
import { getCurrentLocation } from "@/lib/fetch";

const FindRide: React.FC = () => {

  const {
    userAddress,
    destinationAddress,
    setDestinationLocation,
    setUserLocation,
  } = useLocationStore();

  const { travelingWithPet, setTravelingWithPet } = useRidePrefsStore();

  useEffect(() => {
    const loadLocation = async () => {
      const { location } = await getCurrentLocation();
      if (location) {
        setUserLocation(location);
      }
    };

    loadLocation();
  }, []);

  return (
    <RideLayout title="Ride Details">
      <View style={styles.inputContainer}>
        <Text style={styles.label}>From</Text>
        <GoogleTextInput
          icon={icons.target}
          initialLocation={userAddress ?? "Fetching current location..."}
          containerStyle="bg-neutral-100"
          textInputBackgroundColor="#f5f5f5"
          handlePress={(location) => setUserLocation(location)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>To</Text>
        <GoogleTextInput
          icon={icons.map}
          initialLocation={destinationAddress ?? ""}
          containerStyle="bg-neutral-100"
          textInputBackgroundColor="#f5f5f5"
          handlePress={(location) => setDestinationLocation(location)}
        />
      </View>
      <View style={styles.petsContainer}>
        <Text style={styles.petsLabel}>Traveling with a pet?</Text>
        <CustomButton
          title={travelingWithPet ? "Yes" : "No"}
          onPress={() => setTravelingWithPet(!travelingWithPet)}
          bgVariant={travelingWithPet ? "primary" : "danger"}
          style={styles.petsButton}
        />
      </View>
      <View style={styles.buttonContainer}>
        <CustomButton
          title="Find Now"
          onPress={() => router.push(`/(root)/confirm-ride`)}
          style={styles.button}
        />
        <CustomButton
          title="Reserve for Later"
          onPress={() => router.push(`/(root)/reserve-confirm-ride`)}
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
    fontFamily: "DMSans-SemiBold",
    marginBottom: 12,
  },
  petsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  petsLabel: {
    fontSize: 18,
    fontFamily: "DMSans-SemiBold",
    marginRight: 12,
  },
  petsButton: {
    width: "20%",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 9999,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 70,
    gap: 10,
  },
  button: {
    flex: 1,
  },
});

export default FindRide;
