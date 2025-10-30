import React, { createContext, useState, useContext, ReactNode } from "react";
import { Alert } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { router } from "expo-router";

import { db } from "@/lib/firebase";
import { API_ENDPOINTS } from "@/lib/config";
import { fetchAPI } from "@/lib/fetch";
import { Ride } from "@/types/type";

type Maybe<T> = T | null;

export type ScheduledRide = {
  id: string;
  origin_address?: string;
  destination_address?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  scheduled_datetime?: any;
  fare_price?: number;
  status?: string;
  driver_id?: string;
  user_id?: string;
  [key: string]: any;
};

interface RideRequestContextType {
  // Live requests
  newRequest: Maybe<Ride>;
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  setNewRequest: (request: Maybe<Ride>) => void;
  acceptRide: (rideId: string) => Promise<void>;
  declineRide: (rideId: string) => Promise<void>;

  // Scheduled requests
  scheduledRequest: Maybe<ScheduledRide>;
  scheduledModalVisible: boolean;
  setScheduledModalVisible: (visible: boolean) => void;
  setScheduledRequest: (request: Maybe<ScheduledRide>) => void;
  clearScheduledRequest: () => void;
  acceptScheduledRide: (rideId: string, driverId: string) => Promise<void>;
  declineScheduledRide: () => Promise<void>;
}

const RideRequestContext = createContext<RideRequestContextType>({
  // live defaults
  newRequest: null,
  modalVisible: false,
  setModalVisible: () => {},
  setNewRequest: () => {},
  acceptRide: async () => {},
  declineRide: async () => {},

  // scheduled defaults
  scheduledRequest: null,
  scheduledModalVisible: false,
  setScheduledModalVisible: () => {},
  setScheduledRequest: () => {},
  clearScheduledRequest: () => {},
  acceptScheduledRide: async () => {},
  declineScheduledRide: async () => {},
});

export const RideRequestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Live request state
  const [newRequest, setNewRequest] = useState<Maybe<Ride>>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Scheduled request state
  const [scheduledRequest, setScheduledRequest] = useState<Maybe<ScheduledRide>>(null);
  const [scheduledModalVisible, setScheduledModalVisible] = useState(false);

  // ===== Live rides (on-demand) =====
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

  const declineRide = async (rideId: string) => {
    try {
      await updateDoc(doc(db, "rideRequests", rideId), { status: "declined" });
      setModalVisible(false);
      Alert.alert("Declined", "You have declined the ride.");
    } catch (error) {
      console.error("Error declining ride:", error);
      Alert.alert("Error", "Failed to decline the ride. Please try again.");
    }
  };

  // ===== Scheduled rides =====
  const clearScheduledRequest = () => setScheduledRequest(null);

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

  const declineScheduledRide = async () => {
    setScheduledModalVisible(false);
    clearScheduledRequest();
    return Promise.resolve();
  };

  return (
    <RideRequestContext.Provider
      value={{
        // live
        newRequest,
        setNewRequest,
        modalVisible,
        setModalVisible,
        acceptRide,
        declineRide,

        // scheduled
        scheduledRequest,
        setScheduledRequest,
        scheduledModalVisible,
        setScheduledModalVisible,
        clearScheduledRequest,
        acceptScheduledRide,
        declineScheduledRide,
      }}
    >
      {children}
    </RideRequestContext.Provider>
  );
};

export const useRideRequest = () => useContext(RideRequestContext);
