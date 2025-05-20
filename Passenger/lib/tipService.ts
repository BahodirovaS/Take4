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
    
    let stripeCustomerId = rideData.stripe_id;
    
    if (!stripeCustomerId) {
      stripeCustomerId = rideData.customer_id;
      console.log("Using stored customer ID:", stripeCustomerId);
    }
    
    if (!stripeCustomerId) {
      Alert.alert("Error", "Customer payment information not found. Please update your payment method.");
      return;
    }
    
    const requestData = {
      rideId: rideId,
      tipAmount: tipAmountFloat.toFixed(2),
      customer_id: stripeCustomerId,
      driver_id: rideData.driver_id,
      payment_method_id: rideData.payment_method_id
    };
    
    console.log("Sending request data:", JSON.stringify(requestData, null, 2));
    
    const response = await fetchAPI(
      "/(api)/(stripe)/createTip",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      }
    );
    
    if (response?.success) {
      try {
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
      } catch (updateError) {
        console.error("Error updating ride record:", updateError);
        Alert.alert("Error", "Payment processed but failed to update ride record");
      }
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