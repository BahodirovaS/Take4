import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert, Linking } from "react-native";
import { router } from "expo-router";
import CustomButton from "@/components/CustomButton";
import { MarkerData, DriverInfoProps, CancelReason } from "@/types/type";
import LiveDriverCard from "./LiveDriverCard";
import { fetchDriverInfo, cancelRideRequest, navigateToDriverChat } from "@/lib/fetch";
import CancelRideSheet from "@/components/CancelRideSheet";

interface ExtendedDriverInfoProps extends DriverInfoProps {
  rideStatus?: string;
  eta?: string;
  driverName?: string | null;
  driverPhotoBase64?: string;
  driverPhotoUrl?: string;
}

const LiveDriver: React.FC<ExtendedDriverInfoProps> = ({
  driverId,
  rideId,
  driverLocation,
  rideStatus = "",
  driverName,
  driverPhotoBase64,
  driverPhotoUrl,
}) => {
  const [driver, setDriver] = useState<MarkerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState("Calculating...");
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    fetchDriverInfo(
      driverId,
      driverLocation,
      (driverData, phone, estimatedTime) => {
        setDriver(driverData);
        setPhoneNumber(phone);
        setEta(estimatedTime);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching driver:", err);
        setError("Could not load driver information");
        setLoading(false);
      }
    );
  }, [driverId, driverLocation]);

  const handleContactDriverMessage = () => {
    if (!driver) return;
    navigateToDriverChat(driver, rideId);
  };

  const handleContactDriverPhone = () => {
    if (!phoneNumber) {
      Alert.alert("Contact Info", "Phone number is not available");
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch((err) => {
      Alert.alert("Error", "Could not open phone dialer");
      console.error("An error occurred", err);
    });
  };

  const onConfirmCancel = async (reason: CancelReason | null) => {
    await new Promise<void>((resolve, reject) => {
      // If you later update cancelRideRequest to accept `reason`, pass it here.
      cancelRideRequest(
        rideId,
        () => resolve(),
        (err) => reject(err)
      );
    });
    // IMPORTANT: do NOT navigate here; let the sheet show success + Done
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading driver details...</Text>
      </View>
    );
  }

  if (error || !driver) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error || "Couldn't load driver information"}</Text>
        <CustomButton title="Try Again" onPress={() => router.back()} style={styles.retryButton} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LiveDriverCard
        driver={driver}
        eta={eta}
        rideStatus={rideStatus}
        onMessagePress={handleContactDriverMessage}
        onCallPress={handleContactDriverPhone}
        // driverName={driverName}
        driverPhotoBase64={driverPhotoBase64}
        driverPhotoUrl={driverPhotoUrl}
      />

      {rideStatus !== "arrived_at_pickup" && rideStatus !== "in_progress" && (
        <CustomButton
          title="Cancel Ride"
          onPress={() => setCancelOpen(true)}
          bgVariant="danger"
          style={styles.cancelButton}
        />
      )}

      <CancelRideSheet
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        rideStatus={rideStatus}
        onConfirmCancel={onConfirmCancel}
        onDone={() => {
          setCancelOpen(false);
          router.replace("/(root)/(tabs)/home");
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 0 },
  loadingContainer: { alignItems: "center", justifyContent: "center", padding: 30 },
  loadingText: { marginTop: 10, fontFamily: "DMSans", color: "#666" },
  errorText: {
    marginBottom: 15,
    fontFamily: "DMSans-Medium",
    color: "#FF3B30",
    textAlign: "center",
  },
  retryButton: { backgroundColor: "#000" },
  cancelButton: { marginTop: 20 },
});

export default LiveDriver;