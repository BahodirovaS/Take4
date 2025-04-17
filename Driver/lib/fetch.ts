import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc, onSnapshot, collection, addDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as Location from 'expo-location';
import { Ride, ActiveRideData, PassengerInfo } from '@/types/type';
import { Alert } from 'react-native';

const DEFAULT_TIMEOUT = 5000;

export const fetchAPI = async (url: string, options?: RequestInit) => {
  const updatedOptions = {
      ...options,
      headers: {
          ...options?.headers,
          Connection: "keep-alive",
      },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
      const response = await fetch(url, { ...updatedOptions, signal: controller.signal });

      clearTimeout(timeoutId); // Clear timeout on successful response

      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      // Return the parsed JSON response directly
      return await response.json();
  } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
          console.error("Fetch aborted due to timeout");
          throw new Error("Fetch request timed out");
      }

      console.error("Fetch error:", error);
      throw error instanceof Error ? error : new Error("Unknown error occurred");
  }
};


export const useFetch = <T>(url: string, options?: RequestInit) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAPI(url, options);
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error('API call failed');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};


/**
 * Fetches passenger information from Firestore
 */
export const fetchPassengerInfo = async (userId: string): Promise<PassengerInfo | null> => {
  if (!userId) return null;

  try {
      const passengersQuery = query(
          collection(db, "passengers"),
          where("clerkId", "==", userId),
          limit(1)
      );

      const passengersSnapshot = await getDocs(passengersQuery);

      if (!passengersSnapshot.empty) {
          const passengerDoc = passengersSnapshot.docs[0];
          const data = passengerDoc.data();
          return {
              id: userId,
              firstName: data.firstName || "Unknown",
              lastName: data.lastName || "",
              photoUrl: data.photoUrl
          };
      } else {
          return {
              id: userId,
              firstName: "Passenger",
              lastName: "",
          };
      }
  } catch (error) {
      console.error("Error fetching passenger info:", error);
      return {
          id: userId,
          firstName: "Passenger",
          lastName: "",
      };
  }
};

/**
* Sets up a subscription to ride details and returns the unsubscribe function
*/
export const subscribeToRideDetails = (
  rideId: string, 
  onRideUpdate: (ride: Ride) => void,
  onRideStatusChange: (status: string) => void,
  onError: (message: string) => void
) => {
  if (!rideId) {
      onError("No ride ID provided");
      return () => {};
  }

  try {
      const rideRef = doc(db, "rideRequests", rideId);
      
      const unsubscribe = onSnapshot(rideRef, (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data();
              const ride: Ride = {
                  id: docSnap.id,
                  origin_address: data.origin_address,
                  destination_address: data.destination_address,
                  origin_latitude: data.origin_latitude,
                  origin_longitude: data.origin_longitude,
                  destination_latitude: data.destination_latitude,
                  destination_longitude: data.destination_longitude,
                  user_id: data.user_id,
                  ride_time: data.ride_time,
                  fare_price: data.fare_price,
                  payment_status: data.payment_status,
                  driver_id: data.driver_id,
                  created_at: data.createdAt?.toDate?.() || new Date(),
                  driver: {
                      first_name: data.driver?.first_name || "",
                      last_name: data.driver?.last_name || "",
                      car_seats: data.driver?.car_seats || 0,
                  },
                  status: data.status,
              };

              onRideUpdate(ride);
              
              if (data.status) {
                  onRideStatusChange(data.status);
              }
              
              if (data.status === 'cancelled') {
                  Alert.alert('Ride Cancelled', 'This ride has been cancelled by the passenger.');
              }
          }
      });

      return unsubscribe;
  } catch (error) {
      console.error("Error fetching ride details:", error);
      onError("Failed to load ride details");
      return () => {};
  }
};

/**
* Sets up location tracking and updates ride location in Firestore
*/
export const setupLocationTracking = async (
  rideId: string,
  onLocationChange: (location: { latitude: number; longitude: number }) => void,
  onAddressResolved: (address: string) => void,
  onError: (message: string) => void
) => {
  try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
          onError('Location permission is required for navigation');
          return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      onLocationChange({ latitude, longitude });

      const address = await Location.reverseGeocodeAsync({
          latitude,
          longitude
      }).catch(() => [{ name: "", region: "" }]);

      onAddressResolved(`${address[0]?.name || ""}, ${address[0]?.region || ""}`);

      const locationSubscription = await Location.watchPositionAsync(
          {
              accuracy: Location.Accuracy.High,
              distanceInterval: 10, // Update every 10 meters
          },
          async (location) => {
              const { latitude, longitude } = location.coords;
              onLocationChange({ latitude, longitude });
              if (rideId) {
                  updateDoc(doc(db, "rideRequests", rideId), {
                      driver_current_latitude: latitude,
                      driver_current_longitude: longitude,
                      last_location_update: new Date(),
                  }).catch(err => console.error("Error updating driver location:", err));
              }
          }
      );

      return locationSubscription;
  } catch (error) {
      console.error("Error setting up location tracking:", error);
      onError("Failed to set up location tracking");
      return null;
  }
};

/**
* Updates ride status to 'arrived_at_pickup'
*/
export const markArrivedAtPickup = async (rideId: string) => {
  try {
      await updateDoc(doc(db, "rideRequests", rideId), {
          status: 'arrived_at_pickup',
          arrived_at_pickup_time: new Date()
      });
      return true;
  } catch (error) {
      console.error("Error updating ride status:", error);
      return false;
  }
};

/**
* Updates ride status to 'in_progress'
*/
export const startRide = async (rideId: string) => {
  try {
      await updateDoc(doc(db, "rideRequests", rideId), {
          status: 'in_progress',
          ride_start_time: new Date()
      });
      return true;
  } catch (error) {
      console.error("Error updating ride status:", error);
      return false;
  }
};

/**
* Completes a ride and adds it to completedRides collection
*/
export const completeRide = async (
  rideId: string, 
  ride: Ride,
  locationData: {
    userLatitude: number | null;
    userLongitude: number | null;
    userAddress: string | null;
    destinationLatitude: number | null;
    destinationLongitude: number | null;
    destinationAddress: string | null;
  }
) => {
  try {
      const {
          userLatitude,
          userLongitude,
          userAddress,
          destinationLatitude,
          destinationLongitude,
          destinationAddress
      } = locationData;

      await updateDoc(doc(db, "rideRequests", rideId), {
          status: 'completed',
          ride_end_time: new Date()
      });

      const completedRideData = {
          origin_address: userAddress,
          destination_address: destinationAddress,
          origin_latitude: userLatitude,
          origin_longitude: userLongitude,
          destination_latitude: destinationLatitude,
          destination_longitude: destinationLongitude,
          ride_time: Math.round(Date.now() / 1000),
          fare_price: ride?.fare_price || 0,
          payment_status: "paid",
          driver_id: ride?.driver_id,
          user_id: ride?.user_id,
          rideRequestId: rideId, // Reference to original ride request
          created_at: new Date(),
          completed_at: new Date()
      };

      await addDoc(collection(db, "completedRides"), completedRideData);
      return true;
  } catch (error) {
      console.error("Error completing ride:", error);
      return false;
  }
};

/**
 * Fetches and subscribes to user's current location
 */
export const getUserLocation = async (
  onLocationUpdate: (location: { 
    latitude: number; 
    longitude: number; 
    address: string;
  }) => void
) => {
  try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return null;
    }

    let location = await Location.getCurrentPositionAsync({});
    const address = await Location.reverseGeocodeAsync({
      latitude: location.coords?.latitude!,
      longitude: location.coords?.longitude!,
    }).catch(() => [{ name: "", region: "" }]);

    const locationData = {
      latitude: location.coords?.latitude || 0,
      longitude: location.coords?.longitude || 0,
      address: `${address[0]?.name || ""}, ${address[0]?.region || ""}`,
    };

    onLocationUpdate(locationData);
    return locationData;
  } catch (error) {
    console.error("Error fetching location:", error);
    return null;
  }
};

/**
 * Fetches driver status and subscribes to changes
 */
export const getDriverStatus = (
  userId: string,
  onStatusUpdate: (driverId: string, status: boolean) => void,
  onError: (error: any) => void
) => {
  try {
    const driversRef = collection(db, "drivers");
    const q = query(driversRef, where("clerkId", "==", userId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const driverDoc = snapshot.docs[0];
        const driverData = driverDoc.data();

        onStatusUpdate(driverDoc.id, driverData.status || false);
      }
    }, onError);

    return unsubscribe;
  } catch (error) {
    console.error("Error subscribing to driver status:", error);
    onError(error);
    return () => {};
  }
};

/**
 * Updates the driver's online status
 */
export const updateDriverStatus = async (
  driverDocId: string,
  newStatus: boolean
): Promise<boolean> => {
  try {
    await updateDoc(doc(db, "drivers", driverDocId), {
      status: newStatus,
      [newStatus ? 'last_online' : 'last_offline']: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error updating status:', error);
    return false;
  }
};

/**
 * Fetches and subscribes to ride history
 */
export const getRideHistory = (
  userId: string,
  onRidesUpdate: (rides: Ride[]) => void,
  onError: (error: any) => void
) => {
  try {
    const ridesRef = collection(db, "rideRequests");
    const q = query(
      ridesRef,
      where("driver_id", "==", userId),
      where("status", "in", ["completed", "accepted"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rides = snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          origin_address: data.origin_address,
          destination_address: data.destination_address,
          origin_latitude: data.origin_latitude,
          origin_longitude: data.origin_longitude,
          destination_latitude: data.destination_latitude,
          destination_longitude: data.destination_longitude,
          ride_time: data.ride_time,
          fare_price: data.fare_price,
          payment_status: data.payment_status,
          driver_id: String(data.driver_id),
          user_id: data.user_id,
          created_at: data.createdAt && typeof data.createdAt.toDate === 'function'
            ? data.createdAt.toDate().toISOString()
            : new Date().toISOString(),
          driver: {
            first_name: data.driver?.first_name || "",
            last_name: data.driver?.last_name || "",
            car_seats: data.driver?.car_seats || 0,
          },
          status: data.status
        } as Ride;
      });

      // Sort by created_at date, most recent first
      rides.sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeB - timeA;
      });

      onRidesUpdate(rides);
    }, onError);

    return unsubscribe;
  } catch (error) {
    console.error("Error subscribing to ride history:", error);
    onError(error);
    return () => {};
  }
};

/**
 * Checks and subscribes to any active rides
 */
export const checkActiveRides = (
  userId: string,
  onActiveRideUpdate: (hasActiveRide: boolean, activeRideData: ActiveRideData | null) => void,
  onError: (error: any) => void
) => {
  try {
    const activeRidesQuery = query(
      collection(db, "rideRequests"),
      where("driver_id", "==", userId),
      where("status", "in", ["accepted", "arrived_at_pickup", "in_progress"])
    );

    const unsubscribe = onSnapshot(activeRidesQuery, (snapshot) => {
      if (!snapshot.empty) {
        const rideDoc = snapshot.docs[0];
        const rideData = rideDoc.data();

        onActiveRideUpdate(true, {
          rideId: rideDoc.id,
          status: rideData.status,
          destination: rideData.destination_address
        });
      } else {
        onActiveRideUpdate(false, null);
      }
    }, onError);

    return unsubscribe;
  } catch (error) {
    console.error("Error checking active rides:", error);
    onError(error);
    return () => {};
  }
};

/**
 * Updates driver status during sign out
 */
export const updateDriverStatusOnSignOut = async (
  driverDocId: string | null
): Promise<boolean> => {
  if (!driverDocId) return true;
  
  try {
    await updateDoc(doc(db, "drivers", driverDocId), {
      status: false,
      last_offline: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error updating status during sign out:', error);
    return false;
  }
};