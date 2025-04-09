import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Ride } from '@/types/type';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { router } from 'expo-router';
import { Alert } from 'react-native';

interface RideRequestContextType {
  newRequest: Ride | null;
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  setNewRequest: (request: Ride | null) => void;
  acceptRide: (rideId: string) => Promise<void>;
  declineRide: (rideId: string) => Promise<void>;
}

const RideRequestContext = createContext<RideRequestContextType>({
  newRequest: null,
  modalVisible: false,
  setModalVisible: () => {},
  setNewRequest: () => {},
  acceptRide: async () => {},
  declineRide: async () => {},
});

export const RideRequestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [newRequest, setNewRequest] = useState<Ride | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const acceptRide = async (rideId: string) => {
    try {
      await updateDoc(doc(db, "rideRequests", rideId), {
        status: "accepted",
        accepted_at: new Date()
      });
      setModalVisible(false);

      const rideIdString = String(rideId);

      router.push({
        pathname: '/(root)/active-ride',
        params: {
          rideId: rideIdString
        }
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

  return (
    <RideRequestContext.Provider 
      value={{ 
        newRequest, 
        setNewRequest, 
        modalVisible, 
        setModalVisible,
        acceptRide,
        declineRide
      }}
    >
      {children}
    </RideRequestContext.Provider>
  );
};

export const useRideRequest = () => useContext(RideRequestContext);