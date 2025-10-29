import { fetchAPI } from "@/lib/fetch";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Alert } from "react-native";
import { API_ENDPOINTS } from "./config";

export async function processTipPayment({
  rideId,
  rideData,
  tipAmount,
  rating,
  setSuccess
}: {
  rideId: string;
  rideData: any;
  tipAmount: string;
  rating: number;
  setSuccess: (value: boolean) => void;
}) {
  try {
    if (!rideId || !rideData) {
      Alert.alert("Error", "Ride information is missing");
      return;
    }

    const tipAmountFloat = parseFloat(tipAmount);
    if (isNaN(tipAmountFloat) || tipAmountFloat <= 0) {
      const rideRef = doc(db, "rideRequests", rideId);
      await updateDoc(rideRef, { rating, rated_at: new Date() });
      setSuccess(true);
      return;
    }

    const customer_id =
      rideData.stripe_id ||
      rideData.customer_id ||
      rideData.stripeCustomerId ||
      null;

    const driver_id =
      rideData.driver_clerk_id ||
      rideData.driver?.clerk_id ||
      rideData.driver?.clerkId ||
      rideData.driverId ||
      rideData.driver_id ||
      null;

    const name = rideData.user_name || rideData.name || null;
    const email = rideData.user_email || rideData.email || null;

    const body: any = {
      rideId,
      tipAmount: tipAmountFloat.toFixed(2),
      driver_id,
      customer_id,
      name,
      email,
    };

    if (!body.customer_id && !(body.name && body.email)) {
      Alert.alert(
        "Payment Error",
        "Missing customer info. Please complete a fare payment once to save your card, then try tipping again."
      );
      return;
    }

    if (!body.driver_id) {
      Alert.alert(
        "Payment Error",
        "Missing driver ID. Please update the ride record with the driver’s Clerk ID."
      );
      return;
    }

    const response = await fetchAPI(API_ENDPOINTS.CREATE_TIP, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response?.success) {
      const tipAmountCents = Math.round(tipAmountFloat * 100);
      const rideRef = doc(db, "rideRequests", rideId);
      const driverShare = rideData.driver_share || 0;
      const farePrice = rideData.fare_price || 0;

      await updateDoc(rideRef, {
        tip_amount: tipAmountFloat.toFixed(2),
        tip_payment_intent_id: response.paymentIntent?.id || null,
        rating,
        driver_share: driverShare + tipAmountCents,
        total_amount: farePrice + tipAmountCents,
        tipped_at: new Date(),
        rated_at: new Date(),
      });

      setSuccess(true);
    } else {
      const msg = response?.message || response?.error || "Failed to process tip payment";
      Alert.alert("Payment Failed", msg);
    }
  } catch (err: any) {
    const msg = err?.message || "There was an issue processing your payment. Please try again.";
    Alert.alert("Payment Failed", msg);
  }
}
