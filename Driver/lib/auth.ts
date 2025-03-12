import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";

import { fetchAPI } from "@/lib/fetch";
import { router } from "expo-router";

export const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log(`${key} was used 🔐 \n`);
      } else {
        console.log("No values stored under key: " + key);
      }
      return item;
    } catch (error) {
      console.error("SecureStore get item error: ", error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

export const googleOAuth = async (startOAuthFlow: any) => {
  try {
    const { createdSessionId, setActive, signUp } = await startOAuthFlow({
      redirectUrl: Linking.createURL("/(root)/(tabs)/home"),
    });

    if (createdSessionId) {
      if (setActive) {
        await setActive({ session: createdSessionId });

        const userEmail = signUp.emailAddress;

        // Check if user exists in the drivers table
        const response = await fetchAPI("/(api)/driverGet", {
          method: "POST",
          body: JSON.stringify({ email: userEmail }),
        });

        const { exists } = await response.json();

        if (!exists) {
          return {
            success: false,
            message: "No driver account found with these credentials.",
          };
        }

        if (signUp.createdUserId) {
          await fetchAPI("/(api)/user", {
            method: "POST",
            body: JSON.stringify({
              firstName: signUp.firstName,
              lastName: signUp.lastName,
              email: signUp.emailAddress,
              clerkId: signUp.createdUserId,
            }),
          });
        }
        router.push("/(root)/(tabs)/home");

        return {
          success: true,
          code: "success",
          message: "You have successfully signed in with Google",
        };
      }
    }

    return {
      success: false,
      message: "An error occurred while signing in with Google",
    };
  } catch (err: any) {
    console.error(err);
    return {
      success: false,
      code: err.code,
      message: err?.errors?.[0]?.longMessage || "An unknown error occurred",
    };
  }
};

