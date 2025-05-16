import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator, TextInput, TouchableOpacity, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { images } from "@/constants";
import CustomButton from "@/components/CustomButton";
import { CompletedRideDetails } from "@/types/type";
import { useStripe } from "@stripe/stripe-react-native";
import { AirbnbRating } from "react-native-ratings";
import { ReactNativeModal } from "react-native-modal";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  fetchCompletedRideDetails, 
  formatFarePrice,  
} from "@/lib/fetch";
import { processTipPayment } from "@/lib/tipService";


const RideCompleted = () => {
    const { rideId } = useLocalSearchParams();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const [rideDetails, setRideDetails] = useState<CompletedRideDetails | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showTipping, setShowTipping] = useState<boolean>(true);
    const [rating, setRating] = useState<number>(5);
    const [tipAmount, setTipAmount] = useState<string>("0");
    const [success, setSuccess] = useState<boolean>(false);
    const [driverName, setDriverName] = useState<string>("your driver");

    const tipOptions = ["0", "2", "5", "10"];

    useEffect(() => {
        fetchCompletedRideDetails(
            rideId as string,
            async (details) => {
                setRideDetails(details);
                if (details.rating > 0 || (details.tip_amount && parseFloat(details.tip_amount) > 0)) {
                    setShowTipping(false);
                }
                if (details.driver_id) {
                    try {
                        const driverRef = doc(db, "drivers", details.driver_id);
                        const driverSnap = await getDoc(driverRef);
                        
                        if (driverSnap.exists()) {
                            const driverData = driverSnap.data();
                            setDriverName(driverData.name || "your driver");
                        }
                    } catch (err) {
                        console.error("Error fetching driver details:", err);
                    }
                }
                
                setIsLoading(false);
            },
            (error) => {
                console.error("Error loading ride details:", error);
                setError("Could not load ride details. Please try again.");
                setIsLoading(false);
            }
        );
    }, [rideId]);

    const handleGoHome = () => {
        router.replace("/(root)/(tabs)/home");
    };

    const processTip = () => {
        processTipPayment({
          rideId: rideId as string,
          rideData: rideDetails,
          tipAmount,
          rating,
          setSuccess
        });
      };
    
    const handleSuccessButtonPress = () => {
        setSuccess(false);
        handleGoHome();
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

    
    const renderTipping = () => {
        return (
            <View style={styles.tippingContainer}>
                <View style={styles.tipSection}>
                    <Text style={styles.tipSectionTitle}>Enjoyed the ride? Add a tip for {driverName}</Text>
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
                </View>
                
                <View style={styles.tipButtonContainer}>
                    <CustomButton
                        title={`Submit Rating & ${parseFloat(tipAmount) > 0 ? `$${tipAmount} Tip` : 'No Tip'}`}
                        onPress={processTip}
                        bgVariant="primary"
                        style={styles.submitButton}
                    />
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#289dd2" />
                <Text style={styles.loadingText}>Loading ride details...</Text>
            </View>
        );
    }

    if (error || !rideDetails) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>{error || "Unable to load ride details"}</Text>
                <CustomButton 
                    title="Back to Home" 
                    onPress={handleGoHome}
                    bgVariant="primary"
                    style={styles.homeButton}
                />
            </View>
        );
    }
    
    return (
        <View style={styles.container}>
            <Image source={images.check} style={styles.checkImage} />
            <Text style={styles.titleText}>Ride Completed</Text>
            <View style={styles.rideDetailsContainer}>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>From:</Text>
                    <Text style={styles.detailValue}>{rideDetails.origin_address}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>To:</Text>
                    <Text style={styles.detailValue}>{rideDetails.destination_address}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ride Time:</Text>
                    <Text style={styles.detailValue}>
                        {rideDetails.ride_time} minutes
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fare:</Text>
                    <Text style={styles.detailValue}>
                        {formatFarePrice(rideDetails.fare_price)}
                    </Text>
                </View>
            </View>
            
            {renderTipping()}
            
            <ReactNativeModal
                isVisible={success}
                onBackdropPress={() => setSuccess(false)}
            >
                <View style={styles.modalContainer}>
                    <Image source={images.check} style={styles.modalCheckImage} />
                    <Text style={styles.modalTitle}>Thank You!</Text>
                    <Text style={styles.modalText}>
                        Your {parseFloat(tipAmount)} has been sent.
                    </Text>
                    <CustomButton
                        title="Done"
                        onPress={handleSuccessButtonPress}
                        bgVariant="primary"
                        style={styles.doneButton}
                    />
                </View>
            </ReactNativeModal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: 20,
        paddingTop: 50,
    },
    checkImage: {
        width: 100,
        height: 100,
        marginTop: 30,
        marginBottom: 20,
    },
    titleText: {
        fontSize: 24,
        fontFamily: "DMSans-Bold",
        marginBottom: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        fontFamily: "DMSans",
        color: "#666",
    },
    errorText: {
        fontSize: 16,
        fontFamily: "DMSans",
        color: "#FF3B30",
        marginBottom: 20,
        textAlign: "center",
    },
    rideDetailsContainer: {
        width: "100%",
        backgroundColor: "#F5F5F5",
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: "row",
        marginBottom: 10,
    },
    detailLabel: {
        fontFamily: "DMSans-SemiBold",
        width: 80,
        color: "#666",
    },
    detailValue: {
        fontFamily: "DMSans",
        flex: 1,
    },
    homeButton: {
        width: "100%",
    },
    
    tippingContainer: {
        width: "100%",
        backgroundColor: "#F5F5F5",
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
    },
    tipTitle: {
        fontSize: 18,
        fontFamily: "DMSans-Bold",
        textAlign: "center",
        marginBottom: 15,
    },
    tipSection: {
        marginBottom: 15,
    },
    tipSectionTitle: {
        fontSize: 16,
        fontFamily: "DMSans-Bold",
        marginBottom: 10,
    },
    tipOptionsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    tipButton: {
        flex: 1,
        marginHorizontal: 4,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#EEEEEE",
        padding: 10,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    tipButtonText: {
        fontSize: 14,
        fontFamily: "DMSans",
        color: "#000000",
    },
    selectedTipButton: {
        backgroundColor: "#289dd2",
        borderColor: "#289dd2",
    },
    selectedTipText: {
        color: "#FFFFFF",
    },
    customTipContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    customTipLabel: {
        fontSize: 14,
        fontFamily: "DMSans",
        width: 100,
    },
    customTipInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#EEEEEE",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#FFFFFF",
    },
    tipButtonContainer: {
        marginTop: 10,
    },
    skipButton: {
        marginBottom: 10,
        backgroundColor: "#F5F5F5",
    },
    submitButton: {
        marginBottom: 5,
    },
    modalContainer: {
        backgroundColor: "white",
        padding: 24,
        borderRadius: 16,
        alignItems: "center",
    },
    modalCheckImage: {
        width: 70,
        height: 70,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: "DMSans-Bold",
        marginBottom: 8,
    },
    modalText: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 20,
        color: "#666",
        fontFamily: "DMSans",
    },
    doneButton: {
        width: 180,
    },
});

export default RideCompleted;