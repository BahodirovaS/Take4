import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useStripe } from "@stripe/stripe-react-native";
import { Ionicons } from "@expo/vector-icons";
import { AirbnbRating } from "react-native-ratings";
import { useUser } from "@clerk/clerk-expo";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ReactNativeModal } from "react-native-modal";
import { processTipPayment } from "@/lib/tipService";
import CustomButton from "@/components/CustomButton";
import { images } from "@/constants";
import { fetchAPI } from "@/lib/fetch";
import { db } from "@/lib/firebase";

const Tipping = () => {
  const { user } = useUser();
  const { rideId } = useLocalSearchParams();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [rating, setRating] = useState<number>(5);
  const [tipAmount, setTipAmount] = useState<string>("0");
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [rideData, setRideData] = useState<any>(null);
  const [driverName, setDriverName] = useState<string>("your driver");

  // Predefined tip options
  const tipOptions = ["0", "2", "5", "10"];

  useEffect(() => {
    const fetchRideDetails = async () => {
      try {
        if (!rideId) {
          Alert.alert("Error", "Ride ID is missing");
          router.back();
          return;
        }
        const rideRef = doc(db, "rideRequests", rideId as string);
        const rideSnap = await getDoc(rideRef);

        if (rideSnap.exists()) {
          const data = rideSnap.data();
          setRideData(data);
          if (data.driver_id) {
            try {
              const driverRef = doc(db, "drivers", data.driver_id);
              const driverSnap = await getDoc(driverRef);

              if (driverSnap.exists()) {
                const driverData = driverSnap.data();
                setDriverName(driverData.name || "your driver");
              }
            } catch (err) {
              console.error("Error fetching driver details:", err);
            }
          }
        } else {
          Alert.alert("Error", "Ride not found");
          router.back();
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching ride:", error);
        Alert.alert("Error", "Could not load ride details");
        setLoading(false);
      }
    };

    fetchRideDetails();
  }, [rideId]);

  const processTip = () => {
    processTipPayment({
      rideId: rideId as string,
      rideData: rideData,
      tipAmount,
      rating,
      setSuccess
    });
  };

  const handleRating = (rating: number) => {
    setRating(rating);
  };

  const handleSuccessButtonPress = () => {
    setSuccess(false);
    router.replace("/(root)/(tabs)/home");
  };

  const TipButton = ({ amount, isSelected, onPress }: { amount: string, isSelected: boolean, onPress: () => void }) => (
    <TouchableOpacity
      style={[
        styles.tipButton,
        isSelected ? styles.selectedTipButton : null
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.tipButtonText,
        isSelected ? styles.selectedTipText : null
      ]}>
        ${amount}
      </Text>
    </TouchableOpacity>
  );

  const handleGoBack = () => {
    router.push("/(root)/(tabs)/home");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading ride details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.topBarText}>Rate & Tip</Text>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>How was your ride with {driverName}?</Text>

          <View style={styles.ratingContainer}>
            <AirbnbRating
              count={5}
              defaultRating={rating}
              size={30}
              onFinishRating={handleRating}
              showRating={false}
            />
            <Text style={styles.ratingText}>
              {rating === 5 ? "Excellent!" :
                rating === 4 ? "Great!" :
                  rating === 3 ? "Good" :
                    rating === 2 ? "Okay" : "Poor"}
            </Text>
          </View>

          <View style={styles.tipContainer}>
            <Text style={styles.tipTitle}>Add a tip for {driverName}</Text>
            <View style={styles.tipOptionsContainer}>
              {tipOptions.map((option) => (
                <TipButton
                  key={option}
                  amount={option}
                  isSelected={tipAmount === option}
                  onPress={() => setTipAmount(option)}
                />
              ))}
            </View>

            <View style={styles.customTipContainer}>
              <Text style={styles.customTipLabel}>Custom Tip:</Text>
              <TextInput
                style={styles.customTipInput}
                value={!tipOptions.includes(tipAmount) ? tipAmount : ''}
                onChangeText={(text) => {
                  const filtered = text.replace(/[^0-9.]/g, '');
                  setTipAmount(filtered);
                }}
                keyboardType="numeric"
                placeholder="Enter custom amount"
              />
            </View>

            <View style={styles.rideDetailsContainer}>
              <Text style={styles.fareText}>
                Fare: ${rideData ? (rideData.fare_price / 100).toFixed(2) : '0.00'}
              </Text>
              {parseFloat(tipAmount) > 0 && (
                <Text style={styles.tipAmountText}>Tip: ${tipAmount}</Text>
              )}
            </View>
          </View>
          <View style={styles.buttonContainer}>
            <CustomButton
              title={`Submit Rating & ${parseFloat(tipAmount) > 0 ? `$${tipAmount} Tip` : 'No Tip'}`}
              style={styles.submitButton}
              onPress={processTip}
            />
          </View>
        </View>
      </View>
      <ReactNativeModal
        isVisible={success}
        onBackdropPress={() => setSuccess(false)}
      >
        <View style={styles.modalContainer}>
          <Image source={images.check} style={styles.checkImage} />
          <Text style={styles.modalTitle}>Thank You!</Text>
          <Text style={styles.modalText}>
            Your {parseFloat(tipAmount) > 0 ? 'rating and tip have' : 'rating has'} been submitted successfully.
          </Text>
          <CustomButton
            title="Done"
            onPress={handleSuccessButtonPress}
            style={styles.doneButton}
          />
        </View>
      </ReactNativeModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  topBar: {
    height: 36,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    zIndex: 10,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    paddingTop: 0,
  },
  topBarText: {
    fontSize: 18,
    fontFamily: "DMSans-SemiBold",
    color: '#333',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontFamily: 'DMSans-Bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingText: {
    fontSize: 18,
    fontFamily: 'DMSans',
    marginTop: 8,
  },
  tipContainer: {
    marginBottom: 20,
  },
  tipTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    marginBottom: 12,
  },
  tipOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  tipButton: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipButtonText: {
    fontSize: 16,
    fontFamily: 'DMSans',
    color: '#000000',
  },
  selectedTipButton: {
    backgroundColor: '#007BFF',
    borderColor: '#007BFF',
  },
  selectedTipText: {
    color: '#FFFFFF',
  },
  customTipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  customTipLabel: {
    fontSize: 16,
    fontFamily: 'DMSans',
    width: 100,
  },
  customTipInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  rideDetailsContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  fareText: {
    fontSize: 16,
    fontFamily: 'DMSans',
  },
  tipAmountText: {
    fontSize: 16,
    fontFamily: 'DMSans',
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 20,
  },
  skipButton: {
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
  },
  submitButton: {
    marginBottom: 10,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  checkImage: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'DMSans-Bold',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    fontFamily: 'DMSans',
  },
  doneButton: {
    width: 200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: "center",
    fontFamily: "DMSans",
  },
});

export default Tipping;