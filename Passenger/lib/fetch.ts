import { useState, useEffect, useCallback } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  getDoc, 
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  ActiveRideData, 
  Ride, 
  ProfileForm, 
  RideRequest, 
  Message, 
  CompletedRideDetails, 
  MarkerData, 
  CardPM, 
  PaymentMethodsResponse, 
  SetupIntentResponse 
} from "@/types/type";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Location from "expo-location";
import { Alert } from "react-native";
import { useLocationStore } from "@/store";
import { router } from "expo-router";
import { API_ENDPOINTS } from '@/lib/config';

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
 * Fetches and subscribes to passenger's ride history
 */
export const fetchRideHistory = (
  userId: string,
  onRidesUpdate: (rides: Ride[]) => void,
  onError: (error: any) => void
): (() => void) => {
  try {
    const ridesRef = collection(db, "rideRequests");
    const q = query(
      ridesRef,
      where("user_id", "==", userId),
      where("status", "in", ["completed"])
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
          driver_id: data.driver_id,
          user_id: data.user_id,
          tip_amount: data.tip_amount || 0,
          rating: data.rating || 0,
          driver_share: data.driver_share || 0,
          company_share: data.company_share || 0,
          total_amount: data.total_amount || data.fare_price,
          created_at: data.createdAt && typeof data.createdAt.toDate === 'function'
            ? data.createdAt.toDate().toISOString()
            : new Date().toISOString(),
          driver: {
            first_name: data.driver?.firstName || "",
            last_name: data.driver?.lastName || "",
            car_seats: data.driver?.carSeats || 0,
            car_color: data.driver?.carColor || "",
            v_plate: data.driver?.vPlate || "",
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
    console.error("Error setting up ride history subscription:", error);
    onError(error);
    return () => { };
  }
};

/**
 * Checks and subscribes to any active rides for the passenger
 */
export const checkActiveRides = (
  userId: string,
  onActiveRideUpdate: (hasActiveRide: boolean, activeRideData: ActiveRideData | null) => void,
  onError: (error: any) => void
): (() => void) => {
  try {
    const activeRidesQuery = query(
      collection(db, "rideRequests"),
      where("user_id", "==", userId),
      where("status", "in", ["requested", "accepted", "arrived_at_pickup", "in_progress", "awaiting_passenger_confirm"])
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
 * Determines the ride stage based on ride status
 */
export const determineRideStage = (status: string): string => {
  switch (status) {
    case 'requested':
    case 'accepted':
      return 'to_pickup';
    case 'arrived_at_pickup':
    case 'in_progress':
      return 'to_destination';
    default:
      return 'to_pickup';
  }
};


/**
 * Fetch passenger profile from Firestore
 */
export const fetchPassengerProfile = async (userId: string): Promise<{
  data: ProfileForm | null;
  docId: string | null;
  error: Error | null;
}> => {
  try {
    const usersRef = collection(db, "passengers");
    const q = query(usersRef, where("clerkId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      return {
        data: {
          name: "",
          email: "",
          phoneNumber: userData.phoneNumber || "",
          profilePhotoBase64: userData.profilePhotoBase64 || "",
          stripeCustomerId: userData.stripeCustomerId || "",
        },
        docId: userDoc.id,
        error: null
      };
    }
    return {
      data: null,
      docId: null,
      error: null
    };
  } catch (error) {
    console.error("Error fetching passenger profile:", error);
    return {
      data: null,
      docId: null,
      error: error as Error
    };
  }
};



/**
 * Create a new passenger document
 */
export const createPassengerProfile = async (
  userId: string,
  firstName: string,
  lastName: string,
  email: string
): Promise<{
  docId: string | null;
  error: Error | null;
}> => {
  try {
    const newUserRef = await addDoc(collection(db, "users"), {
      firstName: firstName || "",
      lastName: lastName || "",
      email: email || "",
      clerkId: userId,
      phoneNumber: "",
      isDriver: false,
      createdAt: new Date()
    });

    return {
      docId: newUserRef.id,
      error: null
    };
  } catch (error) {
    console.error("Error creating new passenger document:", error);
    return {
      docId: null,
      error: error as Error
    };
  }
};



/**
 * Update passenger profile
 */
export const updatePassengerProfile = async (
  docId: string | null,
  userId: string,
  data: Partial<{
    phoneNumber: string;
    profilePhotoBase64: string;
    stripeCustomerId: string;
  }>
): Promise<{
  success: boolean;
  newDocId: string | null;
  error: Error | null;
}> => {
  try {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );

    if (!docId) {
      const docRef = await addDoc(collection(db, "passengers"), {
        ...cleaned,
        clerkId: userId,
        createdAt: new Date(),
      });

      return { success: true, newDocId: docRef.id, error: null };
    } else {
      await updateDoc(doc(db, "passengers", docId), cleaned);
      return { success: true, newDocId: null, error: null };
    }
  } catch (error) {
    console.error("Error updating passenger profile:", error);
    return { success: false, newDocId: null, error: error as Error };
  }
};



/**
* Take a profile photo
*/

export const takeProfilePhoto = async (): Promise<{
  base64Image: string | null;
  error: Error | null;
}> => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission Required", "We need permission to use your camera");
      return { base64Image: null, error: new Error("Permission denied") };
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
      cameraType: ImagePicker.CameraType.front, // nice for profile photos
    });

    if (result.canceled) {
      return { base64Image: null, error: null };
    }

    const asset = result.assets?.[0];
    if (!asset) {
      return { base64Image: null, error: new Error("No image captured") };
    }

    let base64Image: string;

    if (asset.base64) {
      base64Image = asset.base64;
    } else {
      // fallback (same as your current logic)
      const fileUri = asset.uri;
      base64Image = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    // same size check you already had
    const imageSizeInBytes = base64Image.length * 0.75;
    const imageSizeInMB = imageSizeInBytes / (1024 * 1024);

    if (imageSizeInMB > 1) {
      Alert.alert(
        "Image Too Large",
        "Please take a smaller image (under 1MB). Try again with better lighting / less detail.",
        [{ text: "OK" }]
      );
      return { base64Image: null, error: new Error("Image too large") };
    }

    return { base64Image, error: null };
  } catch (error) {
    console.error("Error taking photo:", error);
    return { base64Image: null, error: error as Error };
  }
};



/**
 * Request and get current location
 */
export const getCurrentLocation = async (): Promise<{
  location: {
    latitude: number;
    longitude: number;
    address: string;
  } | null;
  hasPermission: boolean;
  error: Error | null;
}> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      return { location: null, hasPermission: false, error: null };
    }

    const location = await Location.getCurrentPositionAsync({});
    const lat = location.coords.latitude;
    const lng = location.coords.longitude;

    const googleApiKey = process.env.EXPO_PUBLIC_PLACES_API_KEY;
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&location_type=ROOFTOP&key=${googleApiKey}`
    );
    const data = await response.json();

    const formattedAddress = data.results[0]?.formatted_address || "Unknown location";

    return {
      location: {
        latitude: lat,
        longitude: lng,
        address: formattedAddress,
      },
      hasPermission: true,
      error: null,
    };
  } catch (error) {
    console.error("Error getting location:", error);
    return { location: null, hasPermission: false, error: error as Error };
  }
};


/**
 * Format phone number with dashes
 */
export const formatPhoneNumber = (value: string): string => {
  let formattedValue = value.replace(/\D/g, '');

  if (formattedValue.length > 3 && formattedValue.length <= 6) {
    formattedValue = `${formattedValue.slice(0, 3)}-${formattedValue.slice(3)}`;
  } else if (formattedValue.length > 6) {
    formattedValue = `${formattedValue.slice(0, 3)}-${formattedValue.slice(3, 6)}-${formattedValue.slice(6, 10)}`;
  }

  return formattedValue;
};


/**
 * Fetch scheduled rides for a passenger
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
      where("user_id", "==", userId),
      where("status", "in", ["scheduled_requested", "scheduled_accepted"])
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
 * Cancel a scheduled ride
 */
export const cancelRide = async (rideId: string): Promise<{
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
 * Find the most recent active ride for a user
 */
export const findActiveRide = async (
  userId: string,
  onSuccess: (rideData: { id: string, status: string } | null) => void,
  onError: (error: any) => void
) => {
  try {
    if (!userId) {
      onSuccess(null);
      return;
    }

    const ridesRef = collection(db, "rideRequests");
    const activeRidesQuery = query(
      ridesRef,
      where("user_id", "==", userId),
      where("status", "in", ["requested", "accepted", "arrived_at_pickup", "in_progress"])
    );

    const querySnapshot = await getDocs(activeRidesQuery);

    if (querySnapshot.empty) {
      onSuccess(null);
      return;
    }

    const rides = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        status: data.status,
        createdAt: data.createdAt
      };
    });

    rides.sort((a, b) => {
      const getTimestamp = (item: any) => {
        if (!item.createdAt) return 0;
        if (item.createdAt.toDate) {
          return item.createdAt.toDate().getTime();
        }
        if (item.createdAt instanceof Date) {
          return item.createdAt.getTime();
        }
        if (typeof item.createdAt === 'string') {
          return new Date(item.createdAt).getTime();
        }
        return 0;
      };
      return getTimestamp(b) - getTimestamp(a);
    });

    onSuccess(rides[0]);
  } catch (error) {
    console.error("Error finding active rides:", error);
    onError(error);
  }
};


/**
 * Subscribe to real-time ride updates
 */
export const subscribeToRideUpdates = (
  rideId: string,
  onRideUpdate: (
    status: string,
    driverId: string | null,
    driverLocation: { latitude: number, longitude: number },
    destinationInfo: { latitude: number, longitude: number, address: string } | null
  ) => void,
  onRideCompleted: (rideId: string) => void,
  onError: (error: any) => void
): (() => void) => {
  if (!rideId) return () => { };

  try {
    const rideRef = doc(db, "rideRequests", rideId);
    const unsubscribe = onSnapshot(rideRef, (snapshot) => {
      const data = snapshot.data();
      if (data) {
        const hasDest =
          data.destination_latitude != null &&
          data.destination_longitude != null &&
          data.destination_address;

        const destinationInfo = hasDest
          ? { latitude: Number(data.destination_latitude), longitude: Number(data.destination_longitude), address: String(data.destination_address) }
          : null;

        if (destinationInfo) {
          const { setDestinationLocation } = useLocationStore.getState();
          setDestinationLocation(destinationInfo);
        }

        if (data.status === "completed") {
          onRideCompleted(rideId);
        } else {
          const driverId =
            (data.status === "accepted" ||
              data.status === "arrived_at_pickup" ||
              data.status === "in_progress")
              ? data.driver_id : null;

          const driverLocation = {
            latitude: data.driver_current_latitude || 0,
            longitude: data.driver_current_longitude || 0
          };

          onRideUpdate(data.status, driverId, driverLocation, destinationInfo);
        }
      }
    }, (error) => {
      console.error("Error in ride subscription:", error);
      onError(error);
    });

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up ride subscription:", error);
    onError(error);
    return () => { };
  }
};


/**
 * Fetch ride details for a chat
 */
export const fetchRideDetails = (
  rideId: string,
  onSuccess: (rideDetails: Partial<Ride>) => void,
  onError: (error: any) => void
): void => {
  if (!rideId) return;

  try {
    const fetchData = async () => {
      const rideDoc = await getDoc(doc(db, "rideRequests", rideId));
      if (rideDoc.exists()) {
        const data = rideDoc.data();
        onSuccess({
          id: rideDoc.id,
          origin_address: data.origin_address,
          destination_address: data.destination_address,
          status: data.status,
        });
      }
    };

    fetchData().catch(error => {
      console.error("Error fetching ride details:", error);
      onError(error);
    });
  } catch (error) {
    console.error("Error in ride details fetch:", error);
    onError(error);
  }
};


/**
 * Subscribe to chat messages between two users
 */
export const subscribeToMessages = (
  userId: string | undefined,
  otherPersonId: string | undefined,
  onMessagesUpdate: (messages: Message[]) => void,
  onError: (error: any) => void
): (() => void) => {
  if (!userId || !otherPersonId) {
    return () => { };
  }
  try {
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
    }, (error) => {
      console.error("Error in messages subscription:", error);
      onError(error);
    });

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up message subscription:", error);
    onError(error);
    return () => { };
  }
};


/**
 * Send a message to another user
 */
export const sendMessage = (
  input: string,
  userId: string | undefined,
  userFirstName: string | undefined | null,
  otherPersonId: string | undefined,
  otherPersonName: string | undefined,
  rideId: string | undefined,
  context: string | undefined,
  onSuccess: () => void,
  onError: (error: any) => void
): void => {
  if (!input.trim() || !userId || !otherPersonId) {
    return;
  }

  try {
    const sendData = async () => {
      await addDoc(collection(db, "messages"), {
        text: input,
        senderId: userId,
        senderName: userFirstName || "Guest",
        recipientId: otherPersonId,
        recipientName: otherPersonName,
        timestamp: new Date(),
        rideId: rideId || null,
        context: context || "general"
      });
      onSuccess();
    };

    sendData().catch(error => {
      console.error("Error sending message:", error);
      onError(error);
    });
  } catch (error) {
    console.error("Error in message send:", error);
    onError(error);
  }
};


/**
 * Get a shortened version of a destination address
 */
export const getShortDestination = (address: string | undefined): string => {
  if (!address) return "destination";
  return address.split(',')[0];
};

/** 
 * Request to complete ride 
 */

export const requestRideCompletion = async (
  rideId: string,
  driverId?: string
): Promise<{ success: boolean;[key: string]: any }> => {
  if (!rideId) throw new Error("Missing rideId");

  const res = await fetch(API_ENDPOINTS.REQUEST_COMPLETE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rideId, driverId }),
  });

  const data = await res.json();

  if (!res.ok || !data?.success) {
    throw new Error(data?.error || "Request completion failed");
  }

  return data;
};

export const confirmRideCompletion = async (
  rideId: string,
  passengerId?: string
): Promise<{ success: boolean; payout?: any;[key: string]: any }> => {
  if (!rideId) throw new Error("Missing rideId");

  const res = await fetch(API_ENDPOINTS.CONFIRM_COMPLETE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rideId, passengerId }),
  });

  const data = await res.json();

  if (!res.ok || !data?.success) {
    throw new Error(data?.error || "Confirm completion failed");
  }

  return data;
};



/**
 * Fetch completed ride details
 */
export const fetchCompletedRideDetails = (
  rideId: string | undefined,
  onSuccess: (rideDetails: CompletedRideDetails) => void,
  onError: (error: any) => void
): void => {
  if (!rideId) {
    onError(new Error("No ride ID provided"));
    return;
  }
  try {
    const fetchData = async () => {
      const rideDocRef = doc(db, "rideRequests", rideId);
      const rideSnapshot = await getDoc(rideDocRef);

      if (rideSnapshot.exists()) {
        const data = rideSnapshot.data();

        onSuccess({
          origin_address: data.origin_address,
          destination_address: data.destination_address,
          ride_time: data.ride_time,
          ride_time_minutes: data.ride_time_minutes ?? null,
          fare_price: data.fare_price,
          status: data.status,
          driver_id: data.driver_id,
          user_id: data.user_id,
          rating: data.rating || 0,
          tip_amount: data.tip_amount || "0",
          customer_id: data.customer_id,
          payment_method_id: data.payment_method_id,
          driver_share: data.driver_share,
        });
      } else {
        onError(new Error("Ride not found"));
      }
    };

    fetchData().catch(error => {
      console.error("Error fetching ride details:", error);
      onError(error);
    });
  } catch (error) {
    console.error("Error in ride details lookup:", error);
    onError(error);
  }
};


/**
 * Format fare price from cents to dollars
 */
export const formatFarePrice = (priceInCents: number): string => {
  return `$${(priceInCents / 100).toFixed(2)}`;
};

/**
 * Fetch driver details
 */
export const fetchDriverDetails = (
  driverId: string,
  onSuccess: (driverName: string | null) => void,
  onError: (error: any) => void
): void => {
  if (!driverId) {
    onSuccess(null);
    return;
  }
  try {
    const fetchData = async () => {
      const driversRef = collection(db, "drivers");
      const driverQuery = query(driversRef, where("clerkId", "==", driverId));
      const querySnapshot = await getDocs(driverQuery);

      if (!querySnapshot.empty) {
        const driverData = querySnapshot.docs[0].data();
        onSuccess(
          driverData.firstName || null
        );
      } else {
        onSuccess(null);
      }
    };

    fetchData().catch(error => {
      console.error("Error fetching driver details:", error);
      onError(error);
    });
  } catch (error) {
    console.error("Error in driver details lookup:", error);
    onError(error);
  }
};


/**
 * Fetch driver information from Firestore
 */
export const fetchDriverInfo = (
  driverId: string | undefined,
  driverLocation: { latitude: number; longitude: number },
  onSuccess: (driver: MarkerData, phoneNumber: string | null, eta: string) => void,
  onError: (error: any) => void
): void => {
  if (!driverId) {
    onError(new Error("No driverId provided"));
    return;
  }

  try {
    const fetchData = async () => {
      const driversCollection = collection(db, "drivers");
      const q = query(driversCollection, where("clerkId", "==", driverId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const driverDoc = querySnapshot.docs[0];
        const driverData = driverDoc.data();

        const driverMarker: MarkerData = {
          id: parseInt(driverDoc.id) || 0,
          clerk_id: driverId,
          first_name: driverData.firstName || '',
          last_name: driverData.lastName || '',
          phone_number: driverData.phoneNumber || '',
          profile_image_url: driverData.profile_image_url || '',
          car_image_url: driverData.car_image_url || '',
          car_seats: driverData.carSeats || 4,
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          title: `${driverData.firstName || ''} ${driverData.lastName || ''}`,
          time: driverData.time || 0,
          price: driverData.price || "0",
          status: driverData.status || true,
          car_color: driverData.carColor || "",
          v_make: driverData.vMake || '',
          v_plate: driverData.vPlate || '',
          pets: driverData.pets
        };

        const randomMinutes = Math.floor(Math.random() * 10) + 5;
        const eta = `${randomMinutes} min`;

        onSuccess(driverMarker, driverData.phoneNumber || null, eta);
      } else {
        onError(new Error("Driver not found with clerkId: " + driverId));
      }
    };

    fetchData().catch(error => {
      console.error("Error fetching driver:", error);
      onError(error);
    });
  } catch (error) {
    console.error("Error in driver lookup:", error);
    onError(error);
  }
};


/**
 * Cancel a ride request
 */
export const cancelRideRequest = (
  rideId: string | string[] | undefined,
  onSuccess: () => void,
  onError: (error: any) => void
): void => {
  if (!rideId) {
    onError(new Error("No rideId provided"));
    return;
  }

  try {
    const cancelRide = async () => {
      const rideIdString = Array.isArray(rideId) ? rideId[0] : rideId as string;
      const rideRef = doc(db, "rideRequests", rideIdString);

      await updateDoc(rideRef, {
        status: "cancelled_by_user",
        cancelledAt: new Date()
      });

      onSuccess();
    };

    cancelRide().catch(error => {
      console.error("Error cancelling ride:", error);
      onError(error);
    });
  } catch (error) {
    console.error("Error in ride cancellation:", error);
    onError(error);
  }
};



/**
 * Navigate to chat with the driver
 */
export const navigateToDriverChat = (
  driver: MarkerData,
  rideId: string | string[] | undefined
): void => {
  if (!driver) return;

  router.push({
    pathname: "/(root)/chat",
    params: {
      otherPersonId: driver.clerk_id,
      otherPersonName: driver.first_name,
      rideId: rideId,
      context: "active_ride"
    }
  });
};

// --------------------
// Wallet / Payment Methods
// --------------------

export const fetchPaymentMethods = async (customerId: string): Promise<PaymentMethodsResponse> => {
  if (!customerId) return { paymentMethods: [], defaultPaymentMethodId: null };

  return await fetchAPI(`${API_ENDPOINTS.PAYMENT_METHODS}?customerId=${customerId}`, {
    method: "GET",
  });
};

export const createSetupIntent = async (payload: {
  customer_id?: string;
  name?: string;
  email?: string;
}): Promise<SetupIntentResponse> => {
  return await fetchAPI(API_ENDPOINTS.SETUP_INTENT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
};

export const setDefaultPaymentMethod = async (payload: {
  customerId: string;
  paymentMethodId: string | null;
}): Promise<any> => {
  return await fetchAPI(API_ENDPOINTS.DEFAULT_PAYMENT_METHOD, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
};

export const detachPaymentMethod = async (payload: {
  paymentMethodId: string;
}): Promise<any> => {
  return await fetchAPI(API_ENDPOINTS.DETACH_PAYMENT_METHOD, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
};
