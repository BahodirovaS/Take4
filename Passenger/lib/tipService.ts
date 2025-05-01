
import { fetchAPI } from "@/lib/fetch";
import { doc, updateDoc } from "firebase/firestore";
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
    
    if (parseFloat(tipAmount) <= 0) {
      
      const rideRef = doc(db, "rideRequests", rideId as string);
      await updateDoc(rideRef, {
        rating: rating,
        rated_at: new Date(),
      });
      setSuccess(true);
      return;
    }
    
    
    const response = await fetchAPI(
      "/(api)/(stripe)/create-tip",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rideId: rideId,
          tipAmount: tipAmount,
          customer_id: rideData.customer_id,
          driver_id: rideData.driver_id,
          payment_method_id: rideData.payment_method_id
        }),
      }
    );
    
    if (response.success) {
      
      const tipAmountCents = Math.round(parseFloat(tipAmount) * 100);
      const rideRef = doc(db, "rideRequests", rideId as string);
      await updateDoc(rideRef, {
        tip_amount: tipAmountCents,
        tip_payment_intent_id: response.paymentIntent?.id,
        rating: rating,
        driver_share: rideData.driver_share + tipAmountCents,
        total_amount: rideData.fare_price + tipAmountCents,
        tipped_at: new Date(),
        rated_at: new Date(),
      });
      
      setSuccess(true);
    } else {
      Alert.alert("Error", response.error || "Failed to process tip payment");
    }
  } catch (error) {
    console.error("Error processing tip:", error);
    Alert.alert("Payment Failed", "There was an issue processing your payment. Please try again.");
  }
}