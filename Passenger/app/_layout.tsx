import { ClerkLoaded, ClerkProvider } from "@clerk/clerk-expo";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { LogBox } from "react-native";
import { useLocationStore } from "@/store";
import * as Location from "expo-location";
import { tokenCache } from "@/lib/auth";
import { StripeProvider } from "@stripe/stripe-react-native";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env",
  );
}

LogBox.ignoreLogs(["Clerk:"]);

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
      <ClerkLoaded>
        <StripeProvider
          publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
          merchantIdentifier="merchant.com.uber"
          urlScheme="myapp"
        >
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(root)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </StripeProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
