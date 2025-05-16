import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc, onSnapshot, collection, addDoc, query, where, getDocs, limit, deleteDoc, orderBy, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as Location from 'expo-location';
import { Ride, ActiveRideData, PassengerInfo, DriverProfileForm, RideRequest, Message } from '@/types/type';
import { Alert } from 'react-native';
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

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

      clearTimeout(timeoutId);

      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

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
          rideRequestId: rideId,
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
* Fetch driver information from Firestore
*/
export const fetchDriverInfo = async (userId: string): Promise<{
  driverData: DriverProfileForm | null;
  driverDocId: string | null;
  error: Error | null;
}> => {
  try {
      const driversRef = collection(db, "drivers");
      const q = query(driversRef, where("clerkId", "==", userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
          const driverDoc = querySnapshot.docs[0];
          const data = driverDoc.data();

          return {
              driverData: {
                  firstName: data.firstName || "",
                  lastName: data.lastName || "",
                  email: data.email || "",
                  phoneNumber: data.phoneNumber || "",
                  address: data.address || "",
                  dob: data.dob || "",
                  licence: data.licence || "",
                  vMake: data.vMake || "",
                  vPlate: data.vPlate || "",
                  vInsurance: data.vInsurance || "",
                  pets: data.pets || false,
                  carSeats: data.carSeats || 4,
                  status: data.status || false,
                  profilePhotoBase64: data.profilePhotoBase64 || "",
              },
              driverDocId: driverDoc.id,
              error: null
          };
      }

      return {
          driverData: null,
          driverDocId: null,
          error: null
      };
  } catch (error) {
      console.error("Error fetching driver info:", error);
      return {
          driverData: null,
          driverDocId: null,
          error: error as Error
      };
  }
};

/**
* Select an image from the device gallery
*/
export const selectProfileImage = async (): Promise<{
  base64Image: string | null;
  error: Error | null;
}> => {
  try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
          Alert.alert('Permission Required', 'We need permission to access your photos');
          return { base64Image: null, error: new Error('Permission denied') };
      }

      const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          base64: true,
      });

      if (result.canceled) {
          return { base64Image: null, error: null };
      }

      let base64Image;

      if (result.assets[0].base64) {
          base64Image = result.assets[0].base64;
      } else {
          const fileUri = result.assets[0].uri;
          const fileContent = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
          });
          base64Image = fileContent;
      }

      const imageSizeInBytes = base64Image.length * 0.75;
      const imageSizeInMB = imageSizeInBytes / (1024 * 1024);

      if (imageSizeInMB > 1) {
          Alert.alert(
              "Image Too Large",
              "Please select a smaller image (under 1MB)",
              [{ text: "OK" }]
          );
          return { base64Image: null, error: new Error('Image too large') };
      }

      return {
          base64Image,
          error: null
      };
  } catch (error) {
      console.error("Error picking image:", error);
      return {
          base64Image: null,
          error: error as Error
      };
  }
};

/**
* Save driver profile to Firestore
*/
export const saveDriverProfile = async (
  userId: string,
  driverData: DriverProfileForm,
  driverDocId: string | null
): Promise<{
  success: boolean;
  newDocId: string | null;
  error: Error | null;
}> => {
  try {
      const formattedDriverData = {
          ...driverData,
          clerkId: userId,
          updatedAt: new Date(),
      };

      if (driverDocId) {
          await updateDoc(doc(db, "drivers", driverDocId), formattedDriverData);
          return {
              success: true,
              newDocId: driverDocId,
              error: null
          };
      } else {
          const docRef = await addDoc(collection(db, "drivers"), {
              ...formattedDriverData,
              createdAt: new Date()
          });
          return {
              success: true,
              newDocId: docRef.id,
              error: null
          };
      }
  } catch (error) {
      console.error("Error saving driver profile:", error);
      return {
          success: false,
          newDocId: null,
          error: error as Error
      };
  }
};

/**
* Update driver status during sign out
*/
export const updateDriverStatusOnSignOut = async (driverDocId: string | null): Promise<boolean> => {
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

/**
 * Fetch scheduled rides for a driver
 */
export const fetchScheduledRides = async (userId: string): Promise<{
  rides: RideRequest[];
  error: Error | null;
}> => {
  try {
    if (!userId) {
      return { rides: [], error: null };
    }

    const q = query(
      collection(db, "rideRequests"),
      where("driver_id", "==", userId),
      where("status", "==", "scheduled")
    );

    const querySnapshot = await getDocs(q);
    const scheduledRides: RideRequest[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RideRequest));

    return { 
      rides: scheduledRides, 
      error: null 
    };
  } catch (error) {
    console.error("Error fetching scheduled rides:", error);
    return { 
      rides: [], 
      error: error as Error 
    };
  }
};

/**
 * Update ride status to "accepted" and start the ride
 */
export const startScheduledRide = async (rideId: string): Promise<{
  success: boolean;
  error: Error | null;
}> => {
  try {
    await updateDoc(doc(db, "rideRequests", rideId), {
      status: "accepted",
      accepted_at: new Date()
    });
    
    return { 
      success: true, 
      error: null 
    };
  } catch (error) {
    console.error("Error accepting ride:", error);
    return { 
      success: false, 
      error: error as Error 
    };
  }
};

/**
 * Cancel a scheduled ride
 */
export const cancelScheduledRide = async (rideId: string): Promise<{
  success: boolean;
  error: Error | null;
}> => {
  try {
    await deleteDoc(doc(db, "rideRequests", rideId));
    
    return { 
      success: true, 
      error: null 
    };
  } catch (error) {
    console.error("Error cancelling ride:", error);
    return { 
      success: false, 
      error: error as Error 
    };
  }
};

/**
 * Subscribe to messages between two users
 */
export const subscribeToMessages = (
  userId: string | undefined,
  otherPersonId: string | undefined,
  onMessagesUpdate: (messages: Message[]) => void
): (() => void) => {
  if (!userId || !otherPersonId) {
    return () => {};
  }

  const q = query(
    collection(db, "messages"),
    where("senderId", "in", [userId, otherPersonId]),
    where("recipientId", "in", [userId, otherPersonId]),
    orderBy("timestamp", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messagesData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    } as Message));
    onMessagesUpdate(messagesData);
  });

  return unsubscribe;
};

/**
 * Fetch details of a specific ride
 */
export const fetchRideDetails = async (
  rideId: string
): Promise<Partial<Ride> | null> => {
  try {
    const rideDoc = await getDoc(doc(db, "rideRequests", rideId));
    if (rideDoc.exists()) {
      const data = rideDoc.data();
      return {
        id: rideDoc.id,
        origin_address: data.origin_address,
        destination_address: data.destination_address,
        status: data.status
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching ride details:", error);
    return null;
  }
};

/**
 * Send a message to another user
 */
export const sendMessage = async (
  message: string,
  senderId: string,
  senderName: string,
  recipientId: string,
  recipientName: string,
  rideId?: string,
  context?: string
): Promise<boolean> => {
  if (!message.trim()) return false;
  
  try {
    await addDoc(collection(db, "messages"), {
      text: message,
      senderId: senderId || "guest",
      senderName: senderName || "Guest",
      recipientId: recipientId,
      recipientName: recipientName,
      timestamp: new Date(),
      rideId: rideId || null,
      context: context || "general"
    });
    return true;
  } catch (error) {
    console.error("Error sending message: ", error);
    return false;
  }
};