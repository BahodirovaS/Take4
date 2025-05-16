import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { router } from "expo-router";

export const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
      } else {
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

        const driversRef = collection(db, "drivers");
        const q = query(driversRef, where("email", "==", userEmail));
        const querySnapshot = await getDocs(q);
        
        const driverExists = !querySnapshot.empty;
        const isNewDriver = !driverExists;

        if (signUp.createdUserId) {
          if (querySnapshot.docs.length > 0) {
            const driverDocId = querySnapshot.docs[0].id;
            await updateDoc(doc(db, "drivers", driverDocId), {
              clerkId: signUp.createdUserId,
              firstName: signUp.firstName || "",
              lastName: signUp.lastName || "",
              updatedAt: new Date()
            });
          } else {
            await addDoc(collection(db, "drivers"), {
              firstName: signUp.firstName || "",
              lastName: signUp.lastName || "",
              email: signUp.emailAddress,
              clerkId: signUp.createdUserId,
              phoneNumber: "",
              address: "",
              dob: "",
              licence: "",
              vMake: "",
              vPlate: "",
              vInsurance: "",
              pets: false,
              carSeats: 4,
              status: false,
              createdAt: new Date()
            });
            
            await addDoc(collection(db, "users"), {
              firstName: signUp.firstName || "",
              lastName: signUp.lastName || "",
              email: signUp.emailAddress,
              clerkId: signUp.createdUserId,
              isDriver: true,
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
    };
  }
};