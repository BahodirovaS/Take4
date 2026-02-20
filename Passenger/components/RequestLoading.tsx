import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

import CustomButton from "@/components/CustomButton";
import CancelRideSheet from "@/components/CancelRideSheet";
import type { CancelReason } from "@/types/type";

interface RequestLoadingProps {
  rideId: string;
}

const TIMEOUT_SECONDS = 10 * 60; // 10 minutes

const RequestLoading: React.FC<RequestLoadingProps> = ({ rideId }) => {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rideStatus, setRideStatus] = useState<string>("requested");
  const timedOutRef = useRef(false);

  const rideRef = useMemo(() => (rideId ? doc(db, "rideRequests", rideId) : null), [rideId]);

  useEffect(() => {
    const timer = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!rideRef) return;

    const unsub = onSnapshot(rideRef, (snap) => {
      if (!snap.exists()) return;

      const data: any = snap.data();
      const status = String(data.status || "");
      setRideStatus(status);

      if (status === "accepted") {
        router.replace({
          pathname: "/(root)/active-ride",
          params: { rideId: String(rideId) },
        });
        return;
      }

      if (status === "no_drivers_available") {
        Alert.alert(
          "No drivers available",
          "We couldn’t find a driver right now. Please try again later.",
          [{ text: "OK", onPress: () => router.replace("/(root)/(tabs)/home") }]
        );
        return;
      }

      if (status.startsWith("cancelled")) {
        router.replace("/(root)/(tabs)/home");
      }
    });

    return () => unsub();
  }, [rideRef, rideId]);

  useEffect(() => {
    if (!rideRef) return;
    if (timedOutRef.current) return;
    if (elapsedTime < TIMEOUT_SECONDS) return;

    if (!(rideStatus === "requested" || rideStatus === "requested_driver_pending")) return;

    timedOutRef.current = true;

    (async () => {
      try {
        await updateDoc(rideRef, {
          status: "no_drivers_available",
          no_drivers_at: new Date(),
        });
      } catch (e) {
        console.error("Failed to set no_drivers_available:", e);
      } finally {
        Alert.alert(
          "No drivers available",
          "We couldn’t find a driver right now. Please try again later.",
          [{ text: "OK", onPress: () => router.replace("/(root)/(tabs)/home") }]
        );
      }
    })();
  }, [elapsedTime, rideRef, rideStatus]);

  const formatElapsedTime = () => {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const onConfirmCancel = async (reason: CancelReason | null) => {
    if (!rideRef) return;

    try {
      await updateDoc(rideRef, {
        status: "cancelled_by_user",
        cancelledAt: new Date(),
        cancelReason: reason ?? null,
      });

      setCancelOpen(false);
      router.replace("/(root)/(tabs)/home");
    } catch (error) {
      console.error("Error cancelling ride:", error);
      Alert.alert("Error", "Failed to cancel ride. Please try again.");
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Finding You a Driver</Text>
      <ActivityIndicator size="large" color="#000" />

      <Text style={styles.statusText}>Waiting for a driver to accept your ride...</Text>
      <Text style={styles.timeText}>Waiting time: {formatElapsedTime()}</Text>

      <CustomButton
        title="Cancel Request"
        onPress={() => setCancelOpen(true)}
        bgVariant="danger"
        style={styles.cancelButton}
      />

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
  container: { flex: 1, alignItems: "center" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    fontFamily: "DMSans-Bold",
  },
  statusText: {
    fontSize: 16,
    marginTop: 20,
    textAlign: "center",
    color: "#666",
    fontFamily: "DMSans",
  },
  timeText: {
    fontSize: 14,
    marginTop: 10,
    color: "#888",
    fontFamily: "DMSans",
  },
  cancelButton: { marginTop: 30 },
});

export default RequestLoading;