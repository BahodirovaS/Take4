import { router, useLocalSearchParams } from "expo-router";
import { FlatList, View, StyleSheet, Text, TouchableOpacity } from "react-native";
import CustomButton from "@/components/CustomButton";
import DriverCard from "@/components/DriverCard";
import RideLayout from "@/components/RideLayout";
import { useDriverStore, useLocationStore, useReservationStore } from "@/store";
import { useEffect, useState } from "react";
import { usePriceCalculator } from "@/lib/price";
import RIDE_TYPES from "@/lib/ridetype";
import { Ionicons } from "@expo/vector-icons";

const ConfirmRide = () => {
  const { reserved } = useLocalSearchParams();
  const { scheduledDate, scheduledTime } = useReservationStore();
  const { 
    userLatitude, 
    userLongitude, 
    destinationLatitude, 
    destinationLongitude 
  } = useLocationStore();
  
  const [selectedRideType, setSelectedRideType] = useState<string | null>(null);
  const isScheduled = reserved === "true";
  
  const mileageAPI = process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY!;
  
  const { price, time } = usePriceCalculator(
    { latitude: userLatitude!, longitude: userLongitude! },
    { latitude: destinationLatitude!, longitude: destinationLongitude! },
    mileageAPI
  );

  const handleSelectRide = () => {
    if (isScheduled) {
      router.push({
        pathname: "/(root)/reserve-book-ride",
        params: { rideType: selectedRideType }
      });
    } else {
      router.push({
        pathname: "/(root)/book-ride",
        params: { rideType: selectedRideType }
      });
    }
  };

  const isSelectionValid = selectedRideType !== null;

  const renderRideTypeCard = (rideType: typeof RIDE_TYPES[0]) => {
    const isSelected = selectedRideType === rideType.id;
    const adjustedPrice = (price * rideType.priceMultiplier).toFixed(2);

    return (
      <TouchableOpacity
        key={rideType.id}
        style={[
          styles.rideTypeCard,
          isSelected && styles.selectedRideTypeCard
        ]}
        onPress={() => setSelectedRideType(rideType.id)}
      >
        <View style={styles.rideTypeContent}>
          <View style={[
            styles.rideTypeIcon,
            isSelected && styles.selectedIcon
          ]}>
            <Ionicons 
              name={rideType.icon} 
              size={28} 
              color={isSelected ? "#3f7564" : "#666"} 
            />
          </View>
          <View style={styles.rideTypeInfo}>
            <Text style={[
              styles.rideTypeName,
              isSelected && styles.selectedRideTypeText
            ]}>
              {rideType.name}
            </Text>
            <Text style={styles.rideTypeDescription}>
              {rideType.description}
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={[
              styles.rideTypePrice,
              isSelected && styles.selectedPrice
            ]}>
              ${adjustedPrice}
            </Text>
            {/* <Text style={styles.estimatedTime}>
              {Math.ceil(time)} min
            </Text> */}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <RideLayout title={isScheduled ? "Schedule a Ride" : "Book a Ride"}>
      {isScheduled && scheduledDate && scheduledTime && (
        <View style={styles.reservationInfo}>
          <Text style={styles.reservationTitle}>Scheduled for</Text>
          <Text style={styles.reservationText}>
            {scheduledDate}, {scheduledTime}
          </Text>
        </View>
      )}

      <View style={styles.rideTypeContainer}>
        {RIDE_TYPES.map(renderRideTypeCard)}
      </View>

      <View style={styles.footer}>
        <CustomButton
          title={isScheduled ? "Schedule Ride" : "Request Ride"}
          onPress={handleSelectRide}
          disabled={!isSelectionValid}
          style={[
            styles.button,
            !isSelectionValid && styles.disabledButton
          ]}
        />
        {!isSelectionValid && (
          <Text style={styles.selectionHint}>
            Please select a ride type to continue
          </Text>
        )}
      </View>
    </RideLayout>
  );
};

const styles = StyleSheet.create({
  reservationInfo: {
    backgroundColor: "#E8F5FF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  reservationTitle: {
    fontSize: 16,
    fontFamily: "DMSans-SemiBold",
    color: "#0066CC",
    marginBottom: 4,
  },
  reservationText: {
    fontSize: 18,
    fontFamily: "DMSans-Bold",
    color: "#000",
  },
  rideTypeContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  rideTypeTitle: {
    fontSize: 20,
    fontFamily: "DMSans-Bold",
    marginBottom: 8,
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "DMSans",
    color: "#666",
    marginBottom: 20,
    lineHeight: 22,
  },
  rideTypeCard: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedRideTypeCard: {
    borderColor: "#3f7564",
    backgroundColor: "#F0F9F5",
    shadowColor: "#3f7564",
    shadowOpacity: 0.15,
  },
  rideTypeContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  rideTypeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  selectedIcon: {
    backgroundColor: "#E8F5E8",
  },
  rideTypeInfo: {
    flex: 1,
  },
  rideTypeName: {
    fontSize: 20,
    fontFamily: "DMSans-Bold",
    color: "#000",
    marginBottom: 6,
  },
  selectedRideTypeText: {
    color: "#3f7564",
  },
  rideTypeDescription: {
    fontSize: 15,
    fontFamily: "DMSans",
    color: "#666",
    lineHeight: 20,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  rideTypePrice: {
    fontSize: 22,
    fontFamily: "DMSans-Bold",
    color: "#000",
  },
  selectedPrice: {
    color: "#3f7564",
  },
  estimatedTime: {
    fontSize: 13,
    fontFamily: "DMSans",
    color: "#666",
    marginTop: 4,
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 20,
    padding: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3f7564",
  },
  noteText: {
    fontSize: 14,
    fontFamily: "DMSans",
    color: "#666",
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    marginHorizontal: 20,
    // marginTop:30,
    marginBottom: 70,
  },
  button: {
    backgroundColor: "#3f7564",
    paddingVertical: 16,
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: '#cccccc',
  },
  selectionHint: {
    textAlign: 'center',
    marginTop: 12,
    color: '#666666',
    fontFamily: "DMSans",
    fontSize: 14,
  }
});

export default ConfirmRide;