import React, { createContext, useState, useContext, ReactNode } from "react";
import { Alert } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { router } from "expo-router";

import { db } from "@/lib/firebase";
import { API_ENDPOINTS } from "@/lib/config";
import { fetchAPI } from "@/lib/fetch";
import { Ride, ScheduledRide, RideRequestContextType } from "@/types/type";

type Maybe<T> = T | null;

const RideRequestContext = createContext<RideRequestContextType>({
  newRequest: null,
  modalVisible: false,
  setModalVisible: () => {},
  setNewRequest: () => {},
  acceptRide: async () => {},
  declineRide: async () => {},
  scheduledRequest: null,
  scheduledModalVisible: false,
  setScheduledModalVisible: () => {},
  setScheduledRequest: () => {},
  clearScheduledRequest: () => {},
  acceptScheduledRide: async () => {},
});

export const RideRequestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [newRequest, setNewRequest] = useState<Maybe<Ride>>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [scheduledRequest, setScheduledRequest] = useState<Maybe<ScheduledRide>>(null);
  const [scheduledModalVisible, setScheduledModalVisible] = useState(false);

  // ===== Accept Ride (live) =====
  const acceptRide = async (rideId: string) => {
    try {
      await updateDoc(doc(db, "rideRequests", rideId), {
        status: "accepted",
        accepted_at: new Date(),
      });
      setModalVisible(false);
      router.push({
        pathname: "/(root)/active-ride",
        params: { rideId: String(rideId) },
      });
    } catch (error) {
      console.error("Error accepting ride:", error);
      Alert.alert("Error", "Failed to accept the ride. Please try again.");
    }
  };

  // ===== Decline Ride (works for both realtime + scheduled) =====
  const declineRide = async (rideId: string, driverId: string) => {
    try {
      const resp = await fetchAPI(API_ENDPOINTS.DECLINE_RIDE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId, driverId }),
      });

      if (!resp?.success) {
        Alert.alert("Couldn’t decline", resp?.error || "Please try again.");
      }
    } catch (error) {
      console.error("Error declining ride:", error);
      Alert.alert("Error", "Failed to decline the ride. Please try again.");
    } finally {
      setModalVisible(false);
      setScheduledModalVisible(false);
      clearScheduledRequest();
    }
  };

  // ===== Accept Scheduled Ride =====
  const acceptScheduledRide = async (rideId: string, driverId: string) => {
    try {
      const resp: { success: boolean; error?: string } = await fetchAPI(
        API_ENDPOINTS.ACCEPT_SCHEDULED_RIDE,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rideId, driverId }),
        }
      );

      if (!resp?.success) {
        Alert.alert("Unavailable", resp?.error || "Ride is no longer available.");
        return;
      }

      setScheduledModalVisible(false);
      clearScheduledRequest();
      Alert.alert("Booked", "This reservation is now yours. Find it in Reservations.");
    } catch (error) {
      console.error("Error accepting scheduled ride:", error);
      Alert.alert("Error", "Failed to accept the scheduled ride. Please try again.");
    }
  };

  const clearScheduledRequest = () => setScheduledRequest(null);

  return (
    <RideRequestContext.Provider
      value={{
        newRequest,
        setNewRequest,
        modalVisible,
        setModalVisible,
        acceptRide,
        declineRide,
        scheduledRequest,
        setScheduledRequest,
        scheduledModalVisible,
        setScheduledModalVisible,
        clearScheduledRequest,
        acceptScheduledRide,
      }}
    >
      {children}
    </RideRequestContext.Provider>
  );
};

export const useRideRequest = () => useContext(RideRequestContext);
