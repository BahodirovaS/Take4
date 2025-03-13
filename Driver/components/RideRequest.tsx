import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, SafeAreaView } from "react-native";
import { Ride } from "@/types/type";

interface RideRequestProps {
  visible: boolean;
  ride: Ride | null;
  onAccept: (rideId: string) => void;
  onDecline: (rideId: string) => void;
  onClose: () => void;
}

const RideRequestBottomSheet: React.FC<RideRequestProps> = ({
  visible,
  ride,
  onAccept,
  onDecline,
  onClose,
}) => {
  if (!ride) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.overlay} />
        <View style={styles.sheetContent}>
          <View style={styles.handle} />
          
          <Text style={styles.title}>New Ride Request!</Text>
          
          <View style={styles.infoContainer}>
            <Text style={styles.label}>Pickup:</Text>
            <Text style={styles.value}>{ride.origin_address}</Text>

            <Text style={styles.label}>Dropoff:</Text>
            <Text style={styles.value}>{ride.destination_address}</Text>

            <Text style={styles.label}>Ride Time:</Text>
            <Text style={styles.value}>{ride.ride_time} min</Text>

            <Text style={styles.label}>Fare Price:</Text>
            <Text style={styles.value}>${((ride.fare_price ?? 0) / 100).toFixed(2)}</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              onPress={() => ride.id && onAccept(ride.id)} 
              style={styles.acceptButton}
            >
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => ride.id && onDecline(ride.id)} 
              style={styles.declineButton}
            >
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DDDDDD',
    marginBottom: 10,
  },
  sheetContent: {
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  infoContainer: {
    marginVertical: 10,
  },
  title: { 
    fontSize: 18, 
    fontWeight: "bold", 
    textAlign: "center", 
    marginVertical: 10,
  },
  label: { 
    fontSize: 14, 
    fontWeight: "600", 
    marginTop: 10, 
    color: '#666',
  },
  value: { 
    fontSize: 16, 
    marginBottom: 5,
    fontWeight: '500',
  },
  buttonContainer: { 
    flexDirection: "row", 
    justifyContent: "space-around", 
    marginTop: 20,
    marginBottom: 10,
  },
  acceptButton: { 
    backgroundColor: "#22c55e", 
    padding: 15, 
    borderRadius: 8,
    width: 140,
    alignItems: "center",
  },
  declineButton: { 
    backgroundColor: "#ef4444", 
    padding: 15, 
    borderRadius: 8,
    width: 140, 
    alignItems: "center",
  },
  buttonText: { 
    color: "white", 
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default RideRequestBottomSheet;