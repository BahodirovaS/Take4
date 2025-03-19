import { create } from "zustand";

import { DriverStore, LocationStore, MarkerData, ReservationStore } from "@/types/type";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const useLocationStore = create<LocationStore>((set) => ({
  userLatitude: null,
  userLongitude: null,
  userAddress: null,
  destinationLatitude: null,
  destinationLongitude: null,
  destinationAddress: null,
  setUserLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    set(() => ({
      userLatitude: latitude,
      userLongitude: longitude,
      userAddress: address,
    }));

    const { selectedDriver, clearSelectedDriver } = useDriverStore.getState();
    if (selectedDriver) clearSelectedDriver();
  },

  setDestinationLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    set(() => ({
      destinationLatitude: latitude,
      destinationLongitude: longitude,
      destinationAddress: address,
    }));

    const { selectedDriver, clearSelectedDriver } = useDriverStore.getState();
    if (selectedDriver) clearSelectedDriver();
  },
}));

export const useDriverStore = create<DriverStore>((set) => ({
  drivers: [] as MarkerData[],
  selectedDriver: null,
  selectedPrice: 0,

  fetchDrivers: async () => {
    try {
      const driversRef = collection(db, "drivers");
      
      // You might want to add specific query conditions if needed
      const q = query(driversRef, where("status", "==", true));
      
      const querySnapshot = await getDocs(q);
      
      const drivers: MarkerData[] = querySnapshot.docs.map(doc => {
        const driverData = doc.data();
        return {
          id: Number(doc.id), // Convert Firestore doc ID to number
          clerk_id: driverData.clerkId || '',
          first_name: driverData.firstName || '',
          last_name: driverData.lastName || '',
          profile_image_url: driverData.profile_image_url || '',
          car_image_url: driverData.car_image_url || '',
          car_seats: Number(driverData.carSeats) || 0,
          pets: driverData.pets || false,
          status: driverData.status || false,
          latitude: driverData.latitude || 0,
          longitude: driverData.longitude || 0,
          title: `${driverData.firstName} ${driverData.lastName}`,
          time: driverData.time, // Default time
          price: driverData.price || "0" , // Default price
        } as MarkerData;
      });
      
      set({ drivers });
    } catch (error) {
      console.error("Error fetching drivers:", error);
      set({ drivers: [] }); // Ensure drivers is an empty array on error
    }
  },

  setSelectedDriver: (clerk_id: string) =>
    set(() => ({ selectedDriver: clerk_id })),
  setDrivers: (drivers: MarkerData[]) => set(() => ({ drivers })),
  clearSelectedDriver: () => set(() => ({ selectedDriver: null })),
}));


export const useReservationStore = create<ReservationStore>((set) => ({
  scheduledDate: null,
  scheduledTime: null,
  reservationId: null,
  
  setScheduledDateTime: (date, time) => set({ 
    scheduledDate: date,
    scheduledTime: time 
  }),
  
  setReservationId: (id) => set({ 
    reservationId: id 
  }),
  
  clearReservation: () => set({ 
    scheduledDate: null,
    scheduledTime: null,
    reservationId: null 
  }),
}));