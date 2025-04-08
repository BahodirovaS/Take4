import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator
} from "react-native";
import { Ride } from "@/types/type";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CustomButton from "@/components/CustomButton";

interface RideRequestProps {
  visible: boolean;
  ride: Ride | null;
  onAccept: (rideId: string) => void;
  onDecline: (rideId: string) => void;
  onClose: () => void;
}

interface PassengerInfo {
  first_name: string;
  last_name: string;
  photo_url?: string;
}

const AnimatedView = Reanimated.createAnimatedComponent(View);

const RideRequestBottomSheet: React.FC<RideRequestProps> = ({
  visible,
  ride,
  onAccept,
  onDecline,
  onClose,
}) => {
  const [passengerInfo, setPassengerInfo] = useState<PassengerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  
  const insets = useSafeAreaInsets();
  const sheetHeight = 280;

  const translateY = useSharedValue(sheetHeight);
  const backdropOpacity = useSharedValue(0);
  const isSnappedToTop = useSharedValue(false);

  // Fetch passenger information when ride changes
  useEffect(() => {
    const fetchPassengerInfo = async () => {
      if (!ride || !ride.user_id) return;
      
      setLoading(true);
      try {
        // Query passengers collection where clerk_id matches the ride.user_id
        const passengersQuery = query(
          collection(db, "passengers"),
          where("clerkId", "==", ride.user_id),
          limit(1)
        );
        
        const passengersSnapshot = await getDocs(passengersQuery);
        
        if (!passengersSnapshot.empty) {
          const passengerDoc = passengersSnapshot.docs[0];
          const data = passengerDoc.data();
          setPassengerInfo({
            first_name: data.firstName || "Unknown",
            last_name: data.lastName || "",
            photo_url: data.photo_url
          });
        } else {
          console.log("No passenger found with clerk_id:", ride.user_id);
          setPassengerInfo({
            first_name: "Passenger",
            last_name: "",
          });
        }
      } catch (error) {
        console.error("Error fetching passenger info:", error);
        setPassengerInfo({
          first_name: "Passenger",
          last_name: "",
        });
      } finally {
        setLoading(false);
      }
    };

    if (visible && ride) {
      fetchPassengerInfo();
    }
  }, [ride, visible]);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
      backdropOpacity.value = withTiming(0.5, { duration: 300 });
      isSnappedToTop.value = true;
    } else {
      translateY.value = withTiming(sheetHeight, { duration: 300 });
      backdropOpacity.value = withTiming(0, { duration: 300 });
      isSnappedToTop.value = false;
    }
  }, [visible]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = Math.min(
          sheetHeight,
          context.value.y + event.translationY
        );

        backdropOpacity.value = 0.5 * (1 - Math.min(1, translateY.value / sheetHeight));
      }
    })
    .onEnd((event) => {
      if (translateY.value > sheetHeight * 0.6) {
        translateY.value = withTiming(sheetHeight, { duration: 300 });
        backdropOpacity.value = withTiming(0, { duration: 300 });
        runOnJS(onClose)();
        isSnappedToTop.value = false;
      } else {
        translateY.value = withSpring(0, { damping: 20 });
        backdropOpacity.value = withTiming(0.5);
        isSnappedToTop.value = true;
      }
    });

  const context = useSharedValue({ y: 0 });

  const handleBackdropPress = () => {
    if (visible) {
      onClose();
    }
  };

  const sheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value,
    };
  });

  if (!ride) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleBackdropPress}
          >
            <AnimatedView
              style={[styles.backdrop, backdropStyle]}
            />
          </TouchableOpacity>

          <GestureDetector gesture={panGesture}>
            <AnimatedView
              style={[
                styles.bottomSheet,
                sheetStyle,
                { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }
              ]}
            >
              <View style={styles.handle} />

              <Text style={styles.title}>New Ride Request!</Text>

              <View style={styles.infoContainer}>
                <Text style={styles.label}>Name:</Text>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#0000ff" />
                  </View>
                ) : (
                  <Text style={styles.value}>
                    {passengerInfo ? passengerInfo.first_name : "Unknown passenger"}
                  </Text>
                )}

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
                <CustomButton
                  title="Accept"
                  bgVariant="success"
                  onPress={() => ride.id && onAccept(ride.id)}
                  style={styles.actionButton}
                />
                <CustomButton
                  title="Decline"
                  bgVariant="danger"
                  onPress={() => ride.id && onDecline(ride.id)}
                  style={styles.actionButton}
                />
              </View>
            </AnimatedView>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  bottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DDDDDD',
    marginBottom: 10,
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
  actionButton: {
    width: 140,
  },
  loadingContainer: {
    paddingVertical: 8,
  },
});

export default RideRequestBottomSheet;