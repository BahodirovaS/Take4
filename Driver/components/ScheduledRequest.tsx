import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useRideRequest } from "@/contexts/RideRequestContext";
import CustomButton from "./CustomButton";
import { API_ENDPOINTS } from "@/lib/config";
import { fetchAPI } from "@/lib/fetch";
import { ReactNativeModal } from "react-native-modal";
import { router } from "expo-router";

const ScheduledRequestBottomSheet: React.FC = () => {
    const { user } = useUser();
    const {
        scheduledRequest,
        scheduledModalVisible,
        setScheduledModalVisible,
        clearScheduledRequest,
    } = useRideRequest() as any;
    const [busy, setBusy] = useState<null | "accept" | "decline">(null);

    const details = useMemo(() => {
        if (!scheduledRequest) return null;
        const s = scheduledRequest;
        return {
            pickup: s.origin_address || "Pickup",
            dropoff: s.destination_address || "Destination",
            when: s.scheduled_date && s.scheduled_time
                ? `${s.scheduled_date} • ${s.scheduled_time}`
                : "Scheduled ride",
            fare: s.fare_price ? `$${(s.fare_price / 100).toFixed(2)}` : "",
            id: s.id,
        };
    }, [scheduledRequest]);

    if (!details) return null;

    const onDecline = () => {
        setScheduledModalVisible(false);
        clearScheduledRequest();
    };

    const onAccept = async () => {
        if (!details?.id || !user?.id || busy) return;
        try {
            setBusy("accept");
            const resp = await fetchAPI(API_ENDPOINTS.ACCEPT_SCHEDULED_RIDE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rideId: details.id, driverId: user?.id }),
            });

            if (!resp?.success) {
                Alert.alert("Unavailable", resp?.error || "Ride is no longer available.");
            } else {
                Alert.alert("Booked", "This reservation is now yours. Find it in Reservations.");
                setScheduledModalVisible(false)
                router.replace({ pathname: "/(root)/(tabs)/home"})
            }
        } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to accept scheduled ride.");
        } finally {
            setScheduledModalVisible(false);
            clearScheduledRequest();
        }
    };

    return (
        <ReactNativeModal
            isVisible={scheduledModalVisible}
            onBackdropPress={() => setScheduledModalVisible(false)}
            useNativeDriver
        >
            <View style={styles.sheet}>
                <Text style={styles.title}>Scheduled Ride Request</Text>
                <Text style={styles.row}><Text style={styles.label}>When: </Text>{details.when}</Text>
                <Text style={styles.row}><Text style={styles.label}>From: </Text>{details.pickup}</Text>
                <Text style={styles.row}><Text style={styles.label}>To: </Text>{details.dropoff}</Text>
                {!!details.fare && (
                    <Text style={styles.row}><Text style={styles.label}>Fare: </Text>{details.fare}</Text>
                )}

                <View style={styles.actions}>
                    <CustomButton title="Decline" bgVariant="danger" onPress={onDecline} style={{ flex: 1, marginRight: 8 }} />
                    <CustomButton title="Accept" bgVariant="success" onPress={onAccept} style={{ flex: 1, marginLeft: 8 }} />
                </View>
            </View>
        </ReactNativeModal>
    );
};

const styles = StyleSheet.create({
    sheet: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
    },
    title: { fontFamily: "DMSans-Bold", fontSize: 18, marginBottom: 12 },
    row: { fontFamily: "DMSans", fontSize: 16, marginVertical: 2 },
    label: { fontFamily: "DMSans-Bold" },
    actions: { flexDirection: "row", marginTop: 16 },
});

export default ScheduledRequestBottomSheet;
