import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc, onSnapshot, collection, addDoc, query, where, getDocs, limit, deleteDoc, orderBy, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as Location from 'expo-location';
import {
  Ride,
  ActiveRideData,
  PassengerInfo,
  DriverProfileForm,
  RideRequest, Message,
  Payment,
  WalletData
} from '@/types/type';
import { Alert } from 'react-native';
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { API_ENDPOINTS } from '@/lib/config';
import { Linking } from 'react-native';

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
        photoUrl: data.photoUrl,
        phone: data.phoneNumber
      };
    } else {
      return {
        id: userId,
        firstName: "Passenger",
        lastName: "",
        phone: "",
      };
    }
  } catch (error) {
    console.error("Error fetching passenger info:", error);
    return {
      id: userId,
      firstName: "Passenger",
      lastName: "",
      phone: "",
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
    return () => { };
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
          user_name: data.user_name,
          ride_time: data.ride_time,
          fare_price: data.fare_price,
          payment_status: data.payment_status,
          driver_id: data.driver_id,
          created_at: data.createdAt?.toDate?.() || new Date(),
          driver: {
            first_name: data.driver?.first_name || "",
            last_name: data.driver?.last_name || "",
            car_seats: data.driver?.car_seats || 0,
            car_color: data.driver?.car_color || "",
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
    return () => { };
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
      arrived_at_pickup_time: serverTimestamp()
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
      ride_start_time: serverTimestamp()
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
    const rideRef = doc(db, "rideRequests", rideId);
    const snap = await getDoc(rideRef);

    if (!snap.exists()) throw new Error("Ride not found");

    const data = snap.data();

    const start = data.ride_start_time?.toDate?.();
    const end = new Date();

    let rideMinutes = 0;
    if (start instanceof Date) {
      const ms = end.getTime() - start.getTime();
      rideMinutes = Math.max(1, Math.round(ms / 60000)); // minimum 1 min
    }

    await updateDoc(rideRef, {
      status: "completed",
      ride_end_time: serverTimestamp(),
      ride_time_minutes: rideMinutes,
    });

    const completedRideData = {
      origin_address: locationData.userAddress,
      destination_address: locationData.destinationAddress,
      origin_latitude: locationData.userLatitude,
      origin_longitude: locationData.userLongitude,
      destination_latitude: locationData.destinationLatitude,
      destination_longitude: locationData.destinationLongitude,
      ride_time: rideMinutes,
      fare_price: ride?.fare_price || 0,
      payment_status: "paid",
      driver_id: ride?.driver_id,
      user_id: ride?.user_id,
      rideRequestId: rideId,
      created_at: new Date(),
      completed_at: new Date(),
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
    return () => { };
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
 * Claim any pending ride for a driver when they go online
 */

export const claimPendingRide = async (
  driverId: string,
  lat: number,
  lng: number
): Promise<{ claimed: boolean; rideId?: string; reason?: string }> => {
  try {
    const res = await fetch(API_ENDPOINTS.CLAIM_PENDING_RIDE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId, lat, lng }),
    });

    if (!res.ok) {
      console.error("claimPendingRide failed:", res.status, await res.text());
      return { claimed: false, reason: "network_error" };
    }

    const data = await res.json();
    if (data?.claimed) {
      console.log("✅ Claimed pending ride:", data.rideId);
      return { claimed: true, rideId: data.rideId };
    }

    console.log("ℹ️ No pending rides found:", data?.reason || "none");
    return { claimed: false, reason: data?.reason || "none" };
  } catch (error) {
    console.error("claimPendingRide error:", error);
    return { claimed: false, reason: "exception" };
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
            car_color: data.driver?.car_color || "",
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
    return () => { };
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
    return () => { };
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
          carColor: data.car_color || "",
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
export const fetchScheduledRides = async (userId: string) => {
  try {
    if (!userId) return { rides: [], error: null };

    // Only show rides accepted by this driver and still scheduled
    const q = query(
      collection(db, "rideRequests"),
      where("driver_id", "==", userId),
      where("status", "==", "scheduled_accepted")
    );

    const snap = await getDocs(q);
    const scheduledRides = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

    return { rides: scheduledRides, error: null };
  } catch (error) {
    console.error("Error fetching scheduled rides:", error);
    return { rides: [], error: error as Error };
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
 * Driver cancels a scheduled ride
 */
export const cancelDriverRide = async (rideId: string, driverId: string): Promise<{
  success: boolean;
  reassigned?: boolean;
  nextDriver?: any;
  error?: string;
}> => {
  try {
    const res = await fetch(API_ENDPOINTS.DECLINE_RIDE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rideId, driverId }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("cancelDriverRide failed:", text);
      return { success: false, error: "Network error" };
    }

    const data = await res.json();
    return {
      success: !!data.success,
      reassigned: data.reassigned,
      nextDriver: data.nextDriver,
      error: data.error || undefined,
    };
  } catch (error: any) {
    console.error("cancelDriverRide error:", error);
    return { success: false, error: error.message || "Unexpected error" };
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
    return () => { };
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
      rideId: rideId || null,
      context: context || "general",
      read: false,
      timestamp: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error sending message: ", error);
    return false;
  }
};

export function subscribeToUnreadCount(
  myId: string,
  otherId: string,
  rideId: string,
  onCount: (n: number) => void
) {
  const q = query(
    collection(db, "messages"),
    where("rideId", "==", rideId),
    where("recipientId", "==", myId),
    where("read", "==", false)
  );

  return onSnapshot(q, (snap) => onCount(snap.size));
}

export function watchAndMarkRead(myId: string, otherId: string, rideId: string) {
  const q = query(
    collection(db, "messages"),
    where("rideId", "==", rideId),
    where("recipientId", "==", myId),
    where("read", "==", false)
  );

  const unsub = onSnapshot(q, async (snap) => {
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.update(doc(db, "messages", d.id), { read: true }));
    await batch.commit();
  });

  return unsub;
}


/** True if the driver profile exists (doc or data present) */
export async function getDriverProfileExists(userId: string): Promise<boolean> {
  const driversRef = collection(db, "drivers");
  const q = query(driversRef, where("clerkId", "==", userId), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

/** Pulls driver email from the driver profile, if present */
export async function getDriverEmailFromProfile(
  userId: string
): Promise<string | null> {
  const { driverData } = await fetchDriverInfo(userId);
  return driverData?.email ?? null;
}

/** Stripe onboarding status for the driver */
export async function getDriverOnboardingStatus(userId: string): Promise<{
  onboardingCompleted: boolean;
  accountExists: boolean;
  accountId: string | null;
}> {
  const resp = await fetchAPI(API_ENDPOINTS.CHECK_DRIVER_STATUS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ driver_id: userId }),
  });

  const onboardingCompleted = !!resp.onboarding_completed;
  const accountExists = !!(resp.account_exists || resp.account_id);
  const accountId = resp.account_id ?? null;

  return { onboardingCompleted, accountExists, accountId };
}

/** Create a Stripe onboarding link (bank setup) */
export async function createStripeOnboardingLink(
  userId: string, 
  email: string
): Promise<{
  success: boolean; 
  url?: string; 
  error?: string;
}> {
  return fetchAPI(API_ENDPOINTS.ONBOARD_DRIVER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driver_id: userId, email }),
  });
}

/** Create a Stripe Express dashboard link */
export async function createStripeDashboardLink(
  userId: string, 
  accountId?: string | null
): Promise<{
  success: boolean; 
  url?: string; 
  error?: string;
}> {
  const payload: any = { driver_id: userId };
  if (accountId) payload.account_id = accountId;

  return fetchAPI(API_ENDPOINTS.EXPRESS_DASHBOARD, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/** Build WalletData summary from Firestore rides */
export async function getWalletSummary(
  userId: string
): Promise<WalletData> {
  if (!userId) {
    return {
      totalEarnings: 0, 
      availableBalance: 0, 
      pendingBalance: 0, 
      recentPayments: [] 
    };
  }

  const ridesQ = query(
    collection(db, 'rideRequests'),
    where('driver_id', '==', userId),
    where('payment_status', '==', 'paid')
  );
  const snap = await getDocs(ridesQ);
  const allRides: Ride[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Ride));

  const pendingRides = allRides.filter(r =>
    r.status === 'accepted' || r.status === 'arrived_at_pickup' || r.status === 'in_progress'
  );
  const completedRides = allRides.filter(r =>
    r.status === 'completed' || r.status === 'rated'
  );

  const pendingEarnings = pendingRides.reduce((sum, r: any) => sum + (r.driver_share || 0), 0);
  const availableEarnings = completedRides.reduce((sum, r: any) => sum + (r.driver_share || 0), 0);
  const totalEarnings = pendingEarnings + availableEarnings;

  const toDate = (ts: any): Date => {
    if (ts?.toDate) return ts.toDate();
    if (ts?.seconds) return new Date(ts.seconds * 1000);
    if (ts?._seconds) return new Date(ts._seconds * 1000);
    return new Date();
  };

  const recentPayments: Payment[] = [];

  for (const ride of allRides as any[]) {
    const baseFarePrice = ride.fare_price || 0;
    const tipAmountCents = ride.tip_amount ? parseFloat(ride.tip_amount.toString()) * 100 : 0;
    const baseDriverShare = (ride.driver_share || 0) - tipAmountCents;

    const createdAt = toDate(ride.createdAt);

    if (baseDriverShare > 0) {
      let paymentStatus: 'pending' | 'completed' =
        (ride.status === 'completed' || ride.status === 'rated') ? 'completed' : 'pending';

      recentPayments.push({
        id: ride.id,
        amount: baseFarePrice / 100,
        driverShare: baseDriverShare / 100,
        createdAt,
        rideId: ride.id,
        passengerName: ride.user_name || 'Unknown',
        status: paymentStatus,
        type: 'ride',
      });
    }

    if (ride.tip_amount && parseFloat(ride.tip_amount.toString()) > 0 &&
      (ride.status === 'completed' || ride.status === 'rated')) {
      const tipDate =
        ride.tipped_at?.toDate?.() ??
        ride.rated_at?.toDate?.() ??
        createdAt;

      recentPayments.push({
        id: `${ride.id}_tip`,
        amount: parseFloat(ride.tip_amount.toString()),
        driverShare: parseFloat(ride.tip_amount.toString()),
        createdAt: tipDate,
        rideId: ride.id,
        passengerName: ride.user_name || 'Unknown',
        status: 'completed',
        type: 'tip',
      });
    }
  }

  recentPayments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const limitedPayments = recentPayments.slice(0, 10);

  return {
    totalEarnings: totalEarnings / 100,
    availableBalance: availableEarnings / 100,
    pendingBalance: pendingEarnings / 100,
    recentPayments: limitedPayments,
  };
}


