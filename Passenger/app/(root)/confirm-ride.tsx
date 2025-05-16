import { router, useLocalSearchParams } from "expo-router";
import { FlatList, View, StyleSheet, Text } from "react-native";
import CustomButton from "@/components/CustomButton";
import DriverCard from "@/components/DriverCard";
import RideLayout from "@/components/RideLayout";
import { useDriverStore, useReservationStore } from "@/store";
import { useEffect } from "react";

const ConfirmRide = () => {
  const { reserved } = useLocalSearchParams();
  const {
    drivers,
    selectedDriver,
    setSelectedDriver,
    fetchDrivers
  } = useDriverStore();
  const { scheduledDate, scheduledTime } = useReservationStore();

  useEffect(() => {
    fetchDrivers();
  }, []);

  const driversToShow = reserved === "true"
    ? drivers
    : drivers?.filter((driver) => driver.status === true);

  const handleSelectRide = () => {
    if (reserved === "true") {
      router.push("/(root)/reserve-book-ride");
    } else {
      router.push("/(root)/book-ride");
    }
  };

  const isDriverSelected = selectedDriver !== null && selectedDriver !== undefined;

  return (
    <RideLayout title={"Choose a Ride"}>
      {reserved === "true" && scheduledDate && scheduledTime && (
        <View style={styles.reservationInfo}>
          <Text style={styles.reservationTitle}>Scheduled Ride</Text>
          <Text style={styles.reservationText}>
            {scheduledDate}, {scheduledTime}
          </Text>
        </View>
      )}

      <FlatList
        data={driversToShow}
        keyExtractor={(item) => item.clerk_id.toString()}
        renderItem={({ item, index }) => (
          <DriverCard
            item={item}
            selected={selectedDriver!}
            setSelected={() => setSelectedDriver(item.clerk_id)}
          />
        )}
        ListFooterComponent={() => (
          <View style={styles.footer}>
            <CustomButton
              title={reserved === "true" ? "Reserve Ride" : "Select Ride"}
              onPress={handleSelectRide}
              disabled={!isDriverSelected}
              style={[
                styles.button,
                !isDriverSelected && styles.disabledButton
              ]}
            />
            {!isDriverSelected && (
              <Text style={styles.selectionHint}>
                Please select a driver to continue
              </Text>
            )}
          </View>
        )}
      />
    </RideLayout>
  );
};

const styles = StyleSheet.create({
  reservationInfo: {
    backgroundColor: "#E8F5FF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  reservationTitle: {
    fontSize: 18,
    fontFamily: "DMSans-SemiBold",
    color: "#0066CC",
    marginBottom: 5,
  },
  reservationText: {
    fontSize: 16,
    fontFamily: "DMSans",
  },
  footer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  button: {
    //  existing button styles
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: '#cccccc',
  },
  selectionHint: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666666',
    fontFamily: "DMSans",
    fontSize: 14,
  }
});

export default ConfirmRide;