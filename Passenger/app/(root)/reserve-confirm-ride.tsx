import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Ionicons } from "@expo/vector-icons";
import { doc, updateDoc } from "firebase/firestore";

import CustomButton from "@/components/CustomButton";
import RideLayout from "@/components/RideLayout";
import { useLocationStore, useReservationStore } from "@/store";
import { db } from "@/lib/firebase";

const ReserveRide: React.FC = () => {
    const { userAddress, destinationAddress } = useLocationStore();
    const { setScheduledDateTime, reservationId, setReservationId } = useReservationStore();
    const params = useLocalSearchParams();
    const isReschedule = params.reschedule === "true";
    
    const [isDateTimePickerVisible, setDateTimePickerVisible] = useState(false);
    const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatDateTime = (date: Date) => {
        // Format date part
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const formattedDate = `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
        
        // Format time part
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        const formattedTime = `${hours}:${formattedMinutes} ${ampm}`;
        
        return { formattedDate, formattedTime };
    };

    const handleDateTimeConfirm = (dateTime: Date) => {
        setSelectedDateTime(dateTime);
        setDateTimePickerVisible(false);
    };

    const handleNext = async () => {
        if (!selectedDateTime) return;

        const { formattedDate, formattedTime } = formatDateTime(selectedDateTime);
        setScheduledDateTime(formattedDate, formattedTime);
        
        if (isReschedule && reservationId) {
            // Handle reschedule case
            setIsSubmitting(true);
            try {
                const rideRef = doc(db, "rideRequests", reservationId);
                await updateDoc(rideRef, {
                    scheduled_date: formattedDate,
                    scheduled_time: formattedTime,
                    pickup_time: selectedDateTime.getTime(),
                    updated_at: new Date().getTime()
                });
                
                // Clear the reservation ID after successful update
                setReservationId(null);
                
                Alert.alert(
                    "Success", 
                    "Your ride has been rescheduled successfully",
                    [
                        {
                            text: "OK",
                            onPress: () => router.push("/(root)/(tabs)/resos")
                        }
                    ]
                );
            } catch (error) {
                console.error("Error rescheduling ride:", error);
                Alert.alert("Error", "Failed to reschedule ride. Please try again.");
            } finally {
                setIsSubmitting(false);
            }
        } else {
            router.push(`/(root)/confirm-ride?reserved=true`);
        }
    };

    return (
        <RideLayout title={isReschedule ? "Reschedule Your Ride" : "Schedule Your Ride"}>
            <View style={styles.locationContainer}>
                <View style={styles.locationRow}>
                    <View style={styles.locationDot} />
                    <Text style={styles.locationText} numberOfLines={1}>
                        {userAddress}
                    </Text>
                </View>
                <View style={styles.locationLine} />
                <View style={styles.locationRow}>
                    <View style={[styles.locationDot, styles.destinationDot]} />
                    <Text style={styles.locationText} numberOfLines={1}>
                        {destinationAddress}
                    </Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Select Date & Time</Text>
            <TouchableOpacity 
                style={styles.selector}
                onPress={() => setDateTimePickerVisible(true)}
            >
                <View>
                    <Text style={styles.selectorText}>
                        {selectedDateTime 
                            ? formatDateTime(selectedDateTime).formattedDate 
                            : "Select a date and time"}
                    </Text>
                    {selectedDateTime && (
                        <Text style={styles.timeText}>
                            {formatDateTime(selectedDateTime).formattedTime}
                        </Text>
                    )}
                </View>
                <Ionicons name="calendar-outline" size={24} color="#333" />
            </TouchableOpacity>

            <DateTimePickerModal
                isVisible={isDateTimePickerVisible}
                mode="datetime"
                onConfirm={handleDateTimeConfirm}
                onCancel={() => setDateTimePickerVisible(false)}
                minimumDate={new Date()}
                maximumDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                date={selectedDateTime ?? new Date()}
                is24Hour={false}
                minuteInterval={10}
                display={Platform.OS === "ios" ? "inline" : "default"}
            />

            <View style={styles.infoContainer}>
                <Ionicons name="information-circle-outline" size={18} color="#666" />
                <Text style={styles.infoText}>
                    You can schedule a ride up to 30 days in advance.
                </Text>
            </View>

            <View style={styles.buttonContainer}>
                <CustomButton
                    title={isReschedule ? "Reschedule" : "Next"}
                    onPress={handleNext}
                    disabled={!selectedDateTime || isSubmitting}
                    style={[
                        styles.button,
                        (!selectedDateTime || isSubmitting) && styles.disabledButton
                    ]}
                />
                {isSubmitting && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="small" color="#FFF" />
                    </View>
                )}
            </View>
        </RideLayout>
    );
};

const styles = StyleSheet.create({
    locationContainer: {
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
    },
    locationDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#0CC25F",
        marginRight: 10,
    },
    destinationDot: {
        backgroundColor: "#FF4545",
    },
    locationLine: {
        width: 2,
        height: 20,
        backgroundColor: "#CED4DA",
        marginLeft: 5,
    },
    locationText: {
        fontSize: 16,
        fontFamily: "JakartaRegular",
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: "JakartaSemiBold",
        marginBottom: 12,
        marginTop: 20,
    },
    selector: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        padding: 15,
        marginBottom: 16,
    },
    selectorText: {
        fontSize: 16,
        fontFamily: "JakartaRegular",
    },
    timeText: {
        fontSize: 14,
        fontFamily: "JakartaRegular",
        color: "#0066CC",
        marginTop: 4,
    },
    disabledText: {
        color: "#999",
    },
    infoContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 20,
        paddingHorizontal: 5,
    },
    infoText: {
        fontSize: 14,
        fontFamily: "JakartaRegular",
        color: "#666",
        marginLeft: 8,
    },
    buttonContainer: {
        marginTop: 30,
        marginBottom: 20,
    },
    button: {
        width: "100%",
    },
    disabledButton: {
        opacity: 0.6,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center'
    }
});

export default ReserveRide;