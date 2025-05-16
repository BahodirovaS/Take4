
import { fetchAPI } from "@/lib/fetch";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Alert } from "react-native";

export async function processTipPayment({
  rideId,
  rideData,
  tipAmount,
  rating,
  setSuccess
}: {
  rideId: string,
  rideData: any,
  tipAmount: string,
  rating: number,
  setSuccess: (value: boolean) => void
}) {
  try {
    if (!rideId || !rideData) {
      Alert.alert("Error", "Ride information is missing");
      return;
    }
    
    const tipAmountFloat = parseFloat(tipAmount);
    if (isNaN(tipAmountFloat) || tipAmountFloat <= 0) {
      const rideRef = doc(db, "rideRequests", rideId);
      await updateDoc(rideRef, {
        rating: rating,
        rated_at: new Date(),
      });
      setSuccess(true);
      return;
    }
    
    if (!rideData.payment_method_id) {
      Alert.alert("Error", "Payment method information is missing");
      return;
    }
    let stripeCustomerId = null;    
    if (rideData.user_id) {
      console.log("Fetching Stripe customer ID for user:", rideData.user_id);
      try {
        const userDocRef = doc(db, "users", rideData.user_id);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          stripeCustomerId = userDoc.data().stripe_customer_id;
          console.log("Found stripe_customer_id:", stripeCustomerId);
        } else {
          console.error("User document not found");
        }
      } catch (err) {
        console.error("Error fetching user document:", err);
      }
    }
    
    if (!stripeCustomerId) {
      Alert.alert("Error", "Customer payment information not found. Please update your payment method.");
      return;
    }
    console.log("Using stored customer ID:", rideData.customer_id);

    const response = await fetchAPI(
      "/(api)/(stripe)/createTip",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rideId: rideId,
          tipAmount: tipAmountFloat.toFixed(2),
          customer_id: stripeCustomerId,
          driver_id: rideData.driver_id,
          payment_method_id: rideData.payment_method_id
        }),
      }
    );
    
    const requestData = {
      rideId: rideId,
      tipAmount: tipAmountFloat.toFixed(2),
      customer_id: rideData.user_id,
      driver_id: rideData.driver_id,
      payment_method_id: rideData.payment_method_id
    };
    console.log("Sending request data:", JSON.stringify(requestData, null, 2));

    if (response?.success) {
      const tipAmountCents = Math.round(tipAmountFloat * 100);
      const rideRef = doc(db, "rideRequests", rideId);
      
      const driverShare = rideData.driver_share || 0;
      const farePrice = rideData.fare_price || 0;
      
      await updateDoc(rideRef, {
        tip_amount: tipAmount,
        tip_payment_intent_id: response.paymentIntent?.id,
        rating: rating,
        driver_share: driverShare + tipAmountCents,
        total_amount: farePrice + tipAmountCents,
        tipped_at: new Date(),
        rated_at: new Date(),
      });
      setSuccess(true);
    } else {
      const errorMessage = response?.error || "Failed to process tip payment";
      console.error("Payment error:", errorMessage);
      Alert.alert("Payment Failed", errorMessage);
    }
  } catch (error) {
    console.error("Error processing tip:", error);
    
    let errorMessage = "There was an issue processing your payment. Please try again.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    Alert.alert("Payment Failed", errorMessage);
  }
}