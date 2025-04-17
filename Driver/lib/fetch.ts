import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc, onSnapshot, collection, addDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as Location from 'expo-location';
import { Ride, PassengerInfo } from '@/types/type';
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
