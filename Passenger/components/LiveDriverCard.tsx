import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { icons } from "@/constants";
import { MarkerData } from "@/types/type";

interface DriverCardProps {
  driver: MarkerData;
  eta: string;
  rideStatus?: string;
  onMessagePress: () => void;
  onCallPress: () => void;

  driverName?: string | null;
  driverPhotoBase64?: string;
  driverPhotoUrl?: string;
}

const LiveDriverCard: React.FC<DriverCardProps> = ({
  driver,
  eta,
  rideStatus,
  onMessagePress,
  onCallPress,
  driverName,
  driverPhotoBase64,
  driverPhotoUrl,
}) => {
  const displayName = driverName ?? driver.first_name ?? "Your driver";

  const avatarSource =
    driverPhotoBase64
      ? { uri: `data:image/jpeg;base64,${driverPhotoBase64}` }
      : driverPhotoUrl
        ? { uri: driverPhotoUrl }
        : driver.profile_image_url
          ? { uri: driver.profile_image_url }
          : icons.person;

  return (
    <View style={styles.card}>
      <View style={styles.driverRow}>
        <Image source={avatarSource} style={styles.driverImage} />

        <View style={styles.driverDetails}>
          <Text style={styles.driverName}>Your driver's name is {displayName}</Text>
          <Text style={styles.carInfo}>
            {driver.car_color} {driver.v_make} {"\n"}
            License plate: {driver.v_plate}
          </Text>
        </View>
      </View>

      {rideStatus !== "in_progress" && (
        <View style={styles.contactContainer}>
          <Text style={styles.contactHeader}>Contact Driver</Text>
          <View style={styles.contactOptions}>
            <TouchableOpacity style={styles.contactOption} onPress={onCallPress}>
              <View style={styles.contactIconContainer}>
                <Ionicons name="call" size={20} color="#289dd2" />
              </View>
              <Text style={styles.contactLabel}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  driverRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  driverImage: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  driverDetails: { flex: 1 },
  driverName: { fontSize: 18, fontFamily: "DMSans-SemiBold", marginBottom: 4 },
  carInfo: { fontSize: 16, fontFamily: "DMSans", color: "#666" },
  contactContainer: { marginTop: 16, borderTopWidth: 1, borderTopColor: "#E6E6E6", paddingTop: 16 },
  contactHeader: { fontSize: 16, fontFamily: "DMSans-SemiBold", marginBottom: 12, color: "#333" },
  contactOptions: { flexDirection: "row", justifyContent: "space-around" },
  contactOption: { alignItems: "center", padding: 10 },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  contactLabel: { fontSize: 15, fontFamily: "DMSans", color: "#333" },
});

export default LiveDriverCard;
