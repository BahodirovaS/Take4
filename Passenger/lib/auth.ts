import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";

import { fetchAPI } from "@/lib/fetch";
import { router } from "expo-router";
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";

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

        const passengerRef = collection(db, "passengers");
        const q = query(passengerRef, where("email", "==", userEmail));
        const querySnapshot = await getDocs(q);

        const passengerExists = !querySnapshot.empty;
        const isNewPassenger = !passengerExists;
        if (signUp.createdUserId) {
          if (querySnapshot.docs.length > 0) {
            const passengerDocId = querySnapshot.docs[0].id;
            await updateDoc(doc(db, "passengers", passengerDocId), {
              clerkId: signUp.createdUserId,
              firstName: signUp.firstName || "",
              lastName: signUp.lastName || "",
              updatedAt: new Date()
            });
          } else {
            // Create a new driver record in the drivers collection
            await addDoc(collection(db, "passengers"), {
              firstName: signUp.firstName || "",
              lastName: signUp.lastName || "",
              email: signUp.emailAddress,
              clerkId: signUp.createdUserId,
              phoneNumber: "",
              createdAt: new Date()
            });

            await addDoc(collection(db, "users"), {
              firstName: signUp.firstName || "",
              lastName: signUp.lastName || "",
              email: signUp.emailAddress,
              clerkId: signUp.createdUserId,
              isDriver: false,
              createdAt: new Date()
            });
          }
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
    }
  }
};
