import { ClerkLoaded, ClerkProvider, useUser } from "@clerk/clerk-expo";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { LogBox } from "react-native";
import { tokenCache } from "@/lib/auth";
import { RideRequestProvider, useRideRequest } from "@/contexts/RideRequestContext";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import RideRequestBottomSheet from "@/components/RideRequest";
import { Ride } from "@/types/type";
import { useLocationStore } from "@/store";
import * as Location from "expo-location";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env",
  );
}

LogBox.ignoreLogs(["Clerk:"]);

const RideRequestListener: React.FC = () => {
  const { user } = useUser();
  const { setNewRequest, setModalVisible } = useRideRequest();

  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, "rideRequests"),
      where("driver_id", "==", user.id),
      where("status", "==", "requested")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          origin_address: data.origin_address || '',
          destination_address: data.destination_address || '',
          origin_latitude: data.origin_latitude || 0,
          origin_longitude: data.origin_longitude || 0,
          destination_latitude: data.destination_latitude || 0,
          destination_longitude: data.destination_longitude || 0,
          ride_time: data.ride_time || 0,
          fare_price: data.fare_price || 0,
          payment_status: data.payment_status || '',
          driver_id: String(data.driver_id || ''),
          user_id: data.user_id || '',
          created_at: data.created_at?.toDate()?.toISOString() || new Date().toISOString(),
          status: data.status || 'requested',
          driver: {
            first_name: data.driver?.first_name || '',
            last_name: data.driver?.last_name || '',
            car_seats: data.driver?.car_seats || 0
          }
        } as Ride;
      });

      if (requests.length > 0) {
        setNewRequest(requests[0]);
        setModalVisible(true);
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  return <RideRequestBottomSheet />;
};

export default function RootLayout() {

  useEffect(() => {
    const initializeLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync();
        let address = "Current Location";
        const { setUserLocation } = useLocationStore.getState();
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address
        });
      }
    };
    
    initializeLocation();
  }, []);

  const [loaded] = useFonts({
    "DMSans-Bold": require("../assets/fonts/DMSans-Bold.ttf"),
    "DMSans-ExtraBold": require("../assets/fonts/DMSans-ExtraBold.ttf"),
    "DMSans-ExtraLight": require("../assets/fonts/DMSans-ExtraLight.ttf"),
    "DMSans-Light": require("../assets/fonts/DMSans-Light.ttf"),
    "DMSans-Medium": require("../assets/fonts/DMSans-Medium.ttf"),
    DMSans: require("../assets/fonts/DMSans-Regular.ttf"),
    "DMSans-SemiBold": require("../assets/fonts/DMSans-SemiBold.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <RideRequestProvider>

        <ClerkLoaded>
          <RideRequestListener />

          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(root)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </ClerkLoaded>
      </RideRequestProvider>

    </ClerkProvider>
  );
}
