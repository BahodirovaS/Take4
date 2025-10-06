import { useAuth } from "@clerk/clerk-expo";
import { useStripe } from "@stripe/stripe-react-native";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { Alert, Image, Text, View, StyleSheet } from "react-native";
import { ReactNativeModal } from "react-native-modal";

import CustomButton from "@/components/CustomButton";
import { images } from "@/constants";
import { fetchAPI } from "@/lib/fetch";
import { useLocationStore, useReservationStore } from "@/store";
import { PaymentProps } from "@/types/type";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { API_ENDPOINTS } from "@/lib/config";

interface EnhancedPaymentProps extends PaymentProps {
  isScheduled?: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  driverCommissionRate?: number;
  rideType?: string;
  requiredSeats?: number;
}

const Payment: React.FC<EnhancedPaymentProps> = ({
  fullName,
  email,
  amount,
  driver_id,
  rideTime,
  isScheduled = false,
  scheduledDate,
  scheduledTime,
  rideType,
  requiredSeats,
  driverCommissionRate = 0.8,
}) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const {
    userAddress,
    userLongitude,
    userLatitude,
    destinationLatitude,
    destinationAddress,
    destinationLongitude,
  } = useLocationStore();
  const { clearReservation } = useReservationStore();
  const { userId } = useAuth();

  const [success, setSuccess] = useState<boolean>(false);
  const [rideId, setRideId] = useState<string | null>(null);

  const lastPIRef = useRef<{ id: string; clientSecret: string; customer: string } | null>(null);
  const lastPMRef = useRef<string | null>(null);

  const buttonTitle = isScheduled ? "Pay & Confirm Reservation" : "Confirm Ride";
  const modalTitle = isScheduled ? "Reservation Confirmed" : "Booking placed successfully";
  const modalText = isScheduled
    ? `Thank you for your booking. Your ${rideType} ride has been scheduled for ${scheduledDate} at ${scheduledTime}. We'll notify you when your driver is assigned.`
    : `Thank you for your booking. We're finding the closest ${rideType} driver for you now.`;
  const buttonText = isScheduled ? "View My Rides" : "View Ride Status";

  const driverShare = (parseFloat(amount) * driverCommissionRate).toFixed(2);
  const companyShare = (parseFloat(amount) * (1 - driverCommissionRate)).toFixed(2);
  const initializePaymentSheet = async () => {
    const { error } = await initPaymentSheet({
      merchantDisplayName: "Cabbage Rides",
      intentConfiguration: {
        mode: {
          amount: Math.round(parseFloat(amount) * 100),
          currencyCode: "usd",
        },
        confirmHandler: async (paymentMethod, _shouldSave, intentCreationCallback) => {
          const { paymentIntent, customer } = await fetchAPI(API_ENDPOINTS.CREATE_PAYMENT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: fullName || email.split("@")[0],
              email,
              amount,
              driverCommissionRate,
              driver_id,
            }),
          });

          lastPIRef.current = {
            id: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            customer,
          };
          lastPMRef.current = paymentMethod.id;

          intentCreationCallback({ clientSecret: paymentIntent.client_secret });
        },
      },
      returnURL: isScheduled ? "myapp://reserve-book-ride" : "myapp://book-ride",
    });

    if (!error) {
      // ready
    }
  };

  const openPaymentSheet = async () => {
    await initializePaymentSheet();

    const { error } = await presentPaymentSheet();

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
      return;
    }

    try {
      const fareCents = Math.round(parseFloat(amount) * 100);
      const driverShareCents = Math.round(parseFloat(driverShare) * 100);
      const companyShareCents = Math.round(parseFloat(companyShare) * 100);

      const baseRideData: any = {
        origin_address: userAddress ?? null,
        destination_address: destinationAddress ?? null,
        origin_latitude: userLatitude ?? null,
        origin_longitude: userLongitude ?? null,
        destination_latitude: destinationLatitude ?? null,
        destination_longitude: destinationLongitude ?? null,
        ride_time: Number.isFinite(Number(rideTime)) ? String(Math.trunc(Number(rideTime))) : null,
        fare_price: fareCents,
        driver_share: driverShareCents,
        company_share: companyShareCents,
        payment_status: "paid",
        user_id: userId ?? null,
        user_name: fullName ?? (email ? email.split("@")[0] : null),
        driver_id: "",
        createdAt: new Date(),
        ride_type: rideType ?? null,
        required_seats: typeof requiredSeats === "number" ? requiredSeats : null,
      };

      if (lastPIRef.current?.id) baseRideData.payment_intent_id = lastPIRef.current.id;
      if (lastPMRef.current) baseRideData.payment_method_id = lastPMRef.current;
      if (lastPIRef.current?.customer) baseRideData.stripe_id = lastPIRef.current.customer;

      if (isScheduled && scheduledDate && scheduledTime) {
        const dateParts = scheduledDate.split(", ");
        const dateString = dateParts.length > 1 ? dateParts[1] : scheduledDate;
        const months = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        const [month, day] = dateString.split(" ");
        const monthIndex = months.indexOf(month);
        const currentYear = new Date().getFullYear();
        const [timePart, modifier] = scheduledTime.split(" ");
        const [hour, minute] = timePart.split(":").map(Number);
        let adjustedHour = hour;
        if (modifier === "PM" && hour !== 12) adjustedHour += 12;
        if (modifier === "AM" && hour === 12) adjustedHour = 0;
        const scheduledDateTime = new Date(currentYear, monthIndex, parseInt(day), adjustedHour, minute);

        baseRideData.status = "scheduled_pending_driver";
        baseRideData.scheduled_date = scheduledDate;
        baseRideData.scheduled_time = scheduledTime;
        baseRideData.scheduled_datetime = scheduledDateTime;
      } else {
        baseRideData.status = "requested";
      }

      const rideDoc = await addDoc(collection(db, "rideRequests"), baseRideData);
      setRideId(rideDoc.id);

      try {
        const assignmentResult = await fetchAPI(API_ENDPOINTS.ASSIGN_DRIVER, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rideId: rideDoc.id,
            rideType: rideType || "standard",
            pickupLatitude: userLatitude,
            pickupLongitude: userLongitude,
            isScheduled: !!isScheduled,
          }),
        });

        if (!assignmentResult?.success) {
          console.warn("Driver assignment failed:", assignmentResult?.error);
        } else {
          console.log(
            isScheduled ? "Scheduled reservation sent to driver:" : "Driver request published:",
            assignmentResult.driver
          );
        }
      } catch (assignmentError: any) {
        console.error("Error calling ASSIGN_DRIVER:", assignmentError?.message || assignmentError);
      }

      setSuccess(true);
    } catch (persistErr: any) {
      console.error("Post-payment persist/assign error:", persistErr);
      Alert.alert(
        "Payment succeeded, but booking failed",
        "We’ll refund automatically if needed. Please contact support."
      );
    }
  };

  const handleSuccessButtonPress = () => {
    setSuccess(false);

    if (isScheduled) {
      clearReservation();
      router.push("/(root)/(tabs)/resos");
    } else {
      router.push({
        pathname: "/(root)/active-ride",
        params: { rideId: rideId || undefined },
      });
    }
  };

  return (
    <>
      <CustomButton title={buttonTitle} style={styles.confirmButton} onPress={openPaymentSheet} />
      <ReactNativeModal isVisible={success} onBackdropPress={() => setSuccess(false)}>
        <View style={styles.modalContainer}>
          <Image source={images.check} style={styles.checkImage} />
          <Text style={styles.modalTitle}>{modalTitle}</Text>
          <Text style={styles.modalText}>{modalText}</Text>
          <CustomButton title={buttonText} onPress={handleSuccessButtonPress} style={styles.backButton} />
        </View>
      </ReactNativeModal>
    </>
  );
};

const styles = StyleSheet.create({
  confirmButton: {
    marginVertical: 10,
    marginBottom: 70,
  },
  modalContainer: {
    height: 400,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
  },
  checkImage: {
    width: 112,
    height: 112,
    marginTop: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "DMSans-Bold",
    marginTop: 20,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    color: "#A0A0A0",
    fontFamily: "DMSans",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },
  backButton: {
    marginTop: 20,
    width: 200,
    paddingVertical: 20,
  },
});

export default Payment;
