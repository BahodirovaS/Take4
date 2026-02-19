import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { router } from "expo-router";

export const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
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
    } catch {
      return;
    }
  },
};

export const googleOAuth = async (startOAuthFlow: any) => {
  try {
    const { createdSessionId, setActive, signUp, signIn } = await startOAuthFlow({
      redirectUrl: Linking.createURL("/(root)/(tabs)/home"),
    });

    if (!createdSessionId || !setActive) {
      return { success: false, message: "An error occurred while signing in with Google" };
    }

    await setActive({ session: createdSessionId });

    const clerkId =
      signUp?.createdUserId ||
      signIn?.createdUserId ||
      signIn?.userId ||
      null;

    const email =
      signUp?.emailAddress ||
      signIn?.emailAddress ||
      "";

    const firstName = signUp?.firstName || "";
    const lastName = signUp?.lastName || "";

    if (!clerkId) {
      return { success: false, message: "Missing Clerk user id" };
    }
    if (!email) {
      return { success: false, message: "Google sign-in did not return an email" };
    }

    
    const usersRef = collection(db, "users");
    const usersQ = query(usersRef, where("email", "==", email), limit(1));
    const usersSnap = await getDocs(usersQ);

    if (!usersSnap.empty) {
      
      const userDoc = usersSnap.docs[0];
      const userData = userDoc.data();
      const isDriver = !!userData.isDriver;

      await updateDoc(doc(db, "users", userDoc.id), {
        clerkId,
        updatedAt: new Date(),
      });

      const roleCollection = isDriver ? "drivers" : "passengers";
      const roleRef = collection(db, roleCollection);
      const roleQ = query(roleRef, where("email", "==", email), limit(1));
      const roleSnap = await getDocs(roleQ);

      if (!roleSnap.empty) {
        await updateDoc(doc(db, roleCollection, roleSnap.docs[0].id), {
          clerkId,
          updatedAt: new Date(),
        });
      }

      router.replace("/(root)/(tabs)/home");
      return { success: true, code: "success", message: "Signed in with Google" };
    }

    
    await addDoc(collection(db, "drivers"), {
      firstName,
      lastName,
      email,
      clerkId,
      phoneNumber: "",
      address: "",
      dob: "",
      licence: "",
      vMake: "",
      vPlate: "",
      vInsurance: "",
      pets: false,
      carSeats: 4,
      carColor: "",               
      status: false,
      createdAt: new Date(),
      stripe_connect_account_id: null,
      onboarding_completed: false,
    });

    await addDoc(collection(db, "users"), {
      firstName,
      lastName,
      email,
      clerkId,
      isDriver: true,
      authorize: "google",         
      createdAt: new Date(),
    });

    router.replace("/(root)/(tabs)/home");
    return { success: true, code: "success", message: "Signed in with Google" };
  } catch (err: any) {
    console.error(err);
    return {
      success: false,
      code: err.code,
      message: err?.errors?.[0]?.longMessage || "An unknown error occurred",
    };
  }
};
