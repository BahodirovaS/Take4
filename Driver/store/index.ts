import { create } from "zustand";
import { DriverStore, LocationStore, MarkerData, ReservationStore } from "@/types/type";

export const useLocationStore = create<LocationStore & {
  userAccuracy: number | null;
  routingLatitude: number | null;
  routingLongitude: number | null;
  setUserLocation: (p: { latitude: number; longitude: number; address: string; accuracy?: number }) => void;
  setRoutingLocation: (p: { latitude: number; longitude: number }) => void;
}>((set) => ({
  userLatitude: null,
  userLongitude: null,
  userAddress: null,

  userAccuracy: null,
  routingLatitude: null,
  routingLongitude: null,

  destinationLatitude: null,
  destinationLongitude: null,
  destinationAddress: null,

  setUserLocation: ({ latitude, longitude, address, accuracy }) => {
    set(() => ({
      userLatitude: latitude,
      userLongitude: longitude,
      userAddress: address,
      userAccuracy: typeof accuracy === "number" ? accuracy : null,
    }));

    const { selectedDriver, clearSelectedDriver } = useDriverStore.getState();
    if (selectedDriver) clearSelectedDriver();
  },

  setRoutingLocation: ({ latitude, longitude }) => {
    set(() => ({
      routingLatitude: latitude,
      routingLongitude: longitude,
    }));
  },

  setDestinationLocation: ({ latitude, longitude, address }) => {
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
      const response = await fetch("/(api)/driverInfo");
      const result = await response.json();
      set({ drivers: result.data || result });
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  },


  setSelectedDriver: (driver_id: number) =>
    set(() => ({ selectedDriver: driver_id })),
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
