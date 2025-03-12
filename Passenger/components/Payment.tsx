import { useAuth } from "@clerk/clerk-expo";
import { useStripe } from "@stripe/stripe-react-native";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Image, Text, View, StyleSheet } from "react-native";
import { ReactNativeModal } from "react-native-modal";

import CustomButton from "@/components/CustomButton";
import { images } from "@/constants";
import { fetchAPI } from "@/lib/fetch";
import { useLocationStore } from "@/store";
import { PaymentProps } from "@/types/type";
import { db } from "@/lib/firebase"
import { collection, addDoc } from "firebase/firestore";


const Payment: React.FC<PaymentProps> = ({
  fullName,
  email,
  amount,
  driver_id,
  rideTime,
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

  const { userId } = useAuth();
  const [success, setSuccess] = useState<boolean>(false);

  console.log(userId)

  const openPaymentSheet = async () => {
    await initializePaymentSheet();

    const { error } = await presentPaymentSheet();

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message);
    } else {
      setSuccess(true);
    }
  };

  const initializePaymentSheet = async () => {
    const { error } = await initPaymentSheet({
      merchantDisplayName: "Example, Inc.",
      intentConfiguration: {
        mode: {
          amount: Math.round(parseFloat(amount) * 100),
          currencyCode: "usd",
        },
        confirmHandler: async (
          paymentMethod,
          shouldSavePaymentMethod,
          intentCreationCallback
        ) => {
          const { paymentIntent, customer } = await fetchAPI(
            "/(api)/(stripe)/create",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: fullName || email.split("@")[0],
                email: email,
                amount: amount,
                paymentMethodId: paymentMethod.id,
              }),
            }
          );

          if (paymentIntent.client_secret) {
            const { result } = await fetchAPI("/(api)/(stripe)/pay", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                payment_method_id: paymentMethod.id,
                payment_intent_id: paymentIntent.id,
                customer_id: customer,
                client_secret: paymentIntent.client_secret,
              }),
            });

            if (result.client_secret) {
              await addDoc(collection(db, "rideRequests"), {
                origin_address: userAddress,
                destination_address: destinationAddress,
                origin_latitude: userLatitude,
                origin_longitude: userLongitude,
                destination_latitude: destinationLatitude,
                destination_longitude: destinationLongitude,
                ride_time: rideTime.toFixed(0),
                fare_price: parseInt(amount) * 100,
                payment_status: "paid",
                driver_id: driver_id,
                user_id: userId,
                status: "pending",
                createdAt: new Date(),
              });

              intentCreationCallback({
                clientSecret: result.client_secret,
              });
            }
          }
        },
      },
      returnURL: "myapp://book-ride",
    });

    if (!error) {
      // setLoading(true);
    }
  };

  return (
    <>
      <CustomButton
        title="Confirm Ride"
        style={styles.confirmButton}
        onPress={openPaymentSheet}
      />

      <ReactNativeModal
        isVisible={success}
        onBackdropPress={() => setSuccess(false)}
      >
        <View style={styles.modalContainer}>
          <Image source={images.check} style={styles.checkImage} />

          <Text style={styles.modalTitle}>Booking placed successfully</Text>

          <Text style={styles.modalText}>
            Thank you for your booking. Your reservation has been successfully
            placed. Please proceed with your trip.
          </Text>

          <CustomButton
            title="View Ride Status"
            onPress={() => {
              setSuccess(false);
              router.push("/(root)/ride-requested");
            }}
            style={styles.backButton}
          />

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
    fontFamily: "JakartaBold",
    marginTop: 20,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    color: "#A0A0A0",
    fontFamily: "JakartaRegular",
    textAlign: "center",
    marginTop: 10,
  },
  backButton: {
    marginTop: 20,
    width: 200,
    paddingVertical: 20,
  },
});

export default Payment;
