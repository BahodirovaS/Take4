import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CustomButton from "@/components/CustomButton";
import { useRideRequest } from "@/contexts/RideRequestContext";
import { fetchAPI } from "@/lib/fetch";
import { API_ENDPOINTS } from "@/lib/config";
import { router } from "expo-router"

interface PassengerInfo {
  first_name: string;
  last_name: string;
  photo_url?: string;
}

const AnimatedView = Reanimated.createAnimatedComponent(View);

const RideRequestBottomSheet: React.FC = () => {
  const { user } = useUser();
  const { newRequest: ride, modalVisible, setModalVisible } = useRideRequest();
  const [passengerInfo, setPassengerInfo] = useState<PassengerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<null | "accept" | "decline">(null);
  const insets = useSafeAreaInsets();
  const sheetHeight = 280;
  const translateY = useSharedValue(sheetHeight);
  const backdropOpacity = useSharedValue(0);
  const isSnappedToTop = useSharedValue(false);


  useEffect(() => {
    const fetchPassengerInfo = async () => {
      if (!ride || !ride.user_id) return;

      setLoading(true);
      try {
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
            photo_url: data.photo_url,
          });
        } else {
          setPassengerInfo({ first_name: "Passenger", last_name: "" });
        }
      } catch {
        setPassengerInfo({ first_name: "Passenger", last_name: "" });
      } finally {
        setLoading(false);
      }
    };

    if (modalVisible && ride) {
      fetchPassengerInfo();
    }
  }, [ride, modalVisible]);

  useEffect(() => {
    if (modalVisible) {
      translateY.value = withTiming(0, { duration: 300 });
      backdropOpacity.value = withTiming(0.5, { duration: 300 });
      isSnappedToTop.value = true;
    } else {
      translateY.value = withTiming(sheetHeight, { duration: 300 });
      backdropOpacity.value = withTiming(0, { duration: 300 });
      isSnappedToTop.value = false;
    }
  }, [modalVisible]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = Math.min(sheetHeight, context.value.y + event.translationY);
        backdropOpacity.value = 0.5 * (1 - Math.min(1, translateY.value / sheetHeight));
      }
    })
    .onEnd(() => {
      if (translateY.value > sheetHeight * 0.6) {
        translateY.value = withTiming(sheetHeight, { duration: 300 });
        backdropOpacity.value = withTiming(0, { duration: 300 });
        runOnJS(setModalVisible)(false);
        isSnappedToTop.value = false;
      } else {
        translateY.value = withSpring(0, { damping: 20 });
        backdropOpacity.value = withTiming(0.5);
        isSnappedToTop.value = true;
      }
    });

  const context = useSharedValue({ y: 0 });

  const handleBackdropPress = () => {
    if (modalVisible && busy === null) {
      setModalVisible(false);
    }
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));


  const onAccept = async () => {
    if (!ride?.id || !user?.id || busy) return;
    try {
      setBusy("accept");
      const res = await fetchAPI(API_ENDPOINTS.ACCEPT_RIDE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rideId: ride.id, 
          driverId: user.id 
        }),
      });
      if (res?.success) {
        setModalVisible(false);
        router.replace({ pathname: "/(root)/active-ride", params: { rideId: ride.id } });
      } else {
        Alert.alert("Couldn’t accept ride", res?.error || "Please try again.");
      }
    } catch (e: any) {
      Alert.alert("Ride unavailable", e?.message || "This ride may have been taken.");
    } finally {
      setBusy(null);
    }
  };

  const onDecline = async () => {
    if (!ride?.id || !user?.id || busy) return;
    try {
      setBusy("decline");
      const res = await fetchAPI(API_ENDPOINTS.DECLINE_RIDE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rideId: ride.id, 
          driverId: user.id 
        }),
      });
      if (res?.success) {
        setModalVisible(false);
      } else {
        Alert.alert("Couldn’t decline ride", res?.error || "Please try again.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  if (!ride) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={() => (busy ? null : setModalVisible(false))}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleBackdropPress}
          >
            <AnimatedView style={[styles.backdrop, backdropStyle]} />
          </TouchableOpacity>

          <GestureDetector gesture={panGesture}>
            <AnimatedView
              style={[
                styles.bottomSheet,
                sheetStyle,
                { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 },
              ]}
            >
              <View style={styles.handle} />

              <Text style={styles.title}>New Ride Request!</Text>

              <View style={styles.infoContainer}>
                <Text style={styles.label}>Passenger Name:</Text>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" />
                  </View>
                ) : (
                  <Text style={styles.value}>
                    {passengerInfo ? passengerInfo.first_name : "Passenger"}
                  </Text>
                )}

                <Text style={styles.label}>Pickup Location:</Text>
                <Text style={styles.value}>{ride.origin_address}</Text>

                <Text style={styles.label}>Dropoff Location:</Text>
                <Text style={styles.value}>{ride.destination_address}</Text>

                <Text style={styles.label}>Ride Time:</Text>
                <Text style={styles.value}>{ride.ride_time} min</Text>

                <Text style={styles.label}>Fare Price:</Text>
                <Text style={styles.value}>
                  ${((ride.fare_price ?? 0) / 100).toFixed(2)}
                </Text>
              </View>

              <View style={styles.buttonContainer}>
                <CustomButton
                  title={busy === "accept" ? "Accepting…" : "Accept"}
                  bgVariant="success"
                  onPress={onAccept}
                  disabled={busy !== null}
                  style={styles.actionButton}
                />
                <CustomButton
                  title={busy === "decline" ? "Declining…" : "Decline"}
                  bgVariant="danger"
                  onPress={onDecline}
                  disabled={busy !== null}
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
    justifyContent: "flex-end"
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#000"
  },
  bottomSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#DDDDDD",
    marginBottom: 10,
  },
  infoContainer: {
    marginVertical: 10
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 10
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 10,
    color: "#666"
  },
  value: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: "500"
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    marginBottom: 10,
  },
  actionButton: {
    width: 140
  },
  loadingContainer: {
    paddingVertical: 8
  },
});

export default RideRequestBottomSheet;
