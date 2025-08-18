import { useAuth } from "@clerk/clerk-expo";
import { useStripe } from "@stripe/stripe-react-native";
import { router } from "expo-router";
import React, { useState } from "react";
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
  driverCommissionRate = 0.80,
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

  const buttonTitle = isScheduled ? "Pay & Confirm Reservation" : "Confirm Ride";
  const modalTitle = isScheduled ? "Reservation Confirmed" : "Booking placed successfully";
  const modalText = isScheduled
    ? `Thank you for your booking. Your ${rideType} ride has been scheduled for ${scheduledDate} at ${scheduledTime}. We'll notify you when your driver is assigned.`
    : `Thank you for your booking. We're finding the closest ${rideType} driver for you now.`;
  const buttonText = isScheduled ? "View My Rides" : "View Ride Status";

  const driverShare = (parseFloat(amount) * driverCommissionRate).toFixed(2);
  const companyShare = (parseFloat(amount) * (1 - driverCommissionRate)).toFixed(2);

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
      merchantDisplayName: "Cabbage Rides",
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
            "/api/stripe/create",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: fullName || email.split("@")[0],
                email: email,
                amount: amount,
                driverCommissionRate: driverCommissionRate,
                driver_id: driver_id
              }),
            }
          );

          if (paymentIntent.client_secret) {
            const { result } = await fetchAPI("/api/stripe/pay", {
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
              const rideData = {
                origin_address: userAddress,
                destination_address: destinationAddress,
                origin_latitude: userLatitude,
                origin_longitude: userLongitude,
                destination_latitude: destinationLatitude,
                destination_longitude: destinationLongitude,
                ride_time: rideTime.toFixed(0),
                fare_price: Math.round(parseFloat(amount) * 100),
                driver_share: Math.round(parseFloat(driverShare) * 100),
                company_share: Math.round(parseFloat(companyShare) * 100),
                payment_status: "paid",
                user_id: userId,
                user_name: fullName,
                driver_id: "",
                createdAt: new Date(),
                payment_intent_id: paymentIntent.id,
                payment_method_id: paymentMethod.id,
                stripe_id: customer,
                ride_type: rideType,
                required_seats: requiredSeats,
              };

              if (isScheduled && scheduledDate && scheduledTime) {
                try {
                  const dateParts = scheduledDate.split(', ');
                  const dateString = dateParts.length > 1 ? dateParts[1] : scheduledDate;

                  const months = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ];

                  const [month, day] = dateString.split(' ');
                  const monthIndex = months.indexOf(month);
                  const currentYear = new Date().getFullYear();

                  const [timePart, modifier] = scheduledTime.split(' ');
                  const [hour, minute] = timePart.split(':').map(Number);

                  let adjustedHour = hour;
                  if (modifier === 'PM' && hour !== 12) {
                    adjustedHour += 12;
                  } else if (modifier === 'AM' && hour === 12) {
                    adjustedHour = 0;
                  }

                  const scheduledDateTime = new Date(
                    currentYear,
                    monthIndex,
                    parseInt(day),
                    adjustedHour,
                    minute
                  );

                  Object.assign(rideData, {
                    status: "scheduled_pending_driver",
                    scheduled_date: scheduledDate,
                    scheduled_time: scheduledTime,
                    scheduled_datetime: scheduledDateTime,
                  });

                } catch (error) {
                  console.error('Error parsing scheduled date/time:', error);
                  return;
                }
              } else {
                Object.assign(rideData, {
                  status: "requested_pending_driver",
                });
              }

              const rideDoc = await addDoc(collection(db, "rideRequests"), rideData);
              setRideId(rideDoc.id);

              if (!isScheduled) {
                try {
                  console.log('Calling driver assignment API for immediate ride...');
                  
                  const assignmentResponse = await fetchAPI(API_ENDPOINTS.ASSIGN_DRIVER, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      rideId: rideDoc.id,
                      rideType: rideType,
                      pickupLatitude: userLatitude,
                      pickupLongitude: userLongitude,
                      isScheduled: false
                    }),
                  });

                  const assignmentResult = await assignmentResponse.json();
                  
                  if (assignmentResult.success) {
                    console.log('Driver assigned successfully:', assignmentResult.driver);
                  } else {
                    console.warn('Driver assignment failed:', assignmentResult.error);
                  }
                } catch (assignmentError) {
                  console.error('Error calling driver assignment API:', assignmentError);
                }
              }

              intentCreationCallback({
                clientSecret: result.client_secret,
              });
            }
          }
        },
      },
      returnURL: isScheduled ? "myapp://reserve-book-ride" : "myapp://book-ride",
    });

    if (!error) {
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
        params: { rideId: rideId || undefined }
      });
    }
  };

  return (
    <>
      <CustomButton
        title={buttonTitle}
        style={styles.confirmButton}
        onPress={openPaymentSheet}
      />

      <ReactNativeModal
        isVisible={success}
        onBackdropPress={() => setSuccess(false)}
      >
        <View style={styles.modalContainer}>
          <Image source={images.check} style={styles.checkImage} />

          <Text style={styles.modalTitle}>{modalTitle}</Text>

          <Text style={styles.modalText}>{modalText}</Text>

          <CustomButton
            title={buttonText}
            onPress={handleSuccessButtonPress}
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