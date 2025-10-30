import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useRideRequest } from "@/contexts/RideRequestContext";
import CustomButton from "./CustomButton";
import { ReactNativeModal } from "react-native-modal";
import { router } from "expo-router";

const ScheduledRequestBottomSheet: React.FC = () => {
    const { user } = useUser();
    const {
        scheduledRequest,
        scheduledModalVisible,
        setScheduledModalVisible,
        clearScheduledRequest,
        acceptScheduledRide,
        declineRide,
    } = useRideRequest() as any;

    const [busy, setBusy] = useState<null | "accept" | "decline">(null);

    const details = useMemo(() => {
        if (!scheduledRequest) return null;
        const s = scheduledRequest;
        return {
            id: s.id,
            pickup: s.origin_address || "Pickup",
            dropoff: s.destination_address || "Destination",
            when:
                s.scheduled_date && s.scheduled_time
                    ? `${s.scheduled_date} • ${s.scheduled_time}`
                    : "Scheduled ride",
            fare: s.fare_price ? `$${(s.fare_price / 100).toFixed(2)}` : "",
        };
    }, [scheduledRequest]);

    if (!details) return null;

    const onDecline = async () => {
        if (!user?.id || !details.id || busy) return;
        try {
            setBusy("decline");
            await declineRide(details.id, user.id);
            setScheduledModalVisible(false);
            clearScheduledRequest();
        } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to decline the ride.");
        } finally {
            setBusy(null);
        }
    };

    const onAccept = async () => {
        if (!user?.id || !details.id || busy) return;
        try {
            setBusy("accept");
            await acceptScheduledRide(details.id, user.id);
            setScheduledModalVisible(false);
            clearScheduledRequest();
            router.replace({ pathname: "/(root)/(tabs)/home" });
        } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to accept scheduled ride.");
        } finally {
            setBusy(null);
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
                <Text style={styles.row}>
                    <Text style={styles.label}>
                        When:
                    </Text> {details.when}</Text>
                <Text style={styles.row}>
                    <Text style={styles.label}>
                        From:
                    </Text> {details.pickup}</Text>
                <Text style={styles.row}>
                    <Text style={styles.label}>
                        To:
                    </Text> {details.dropoff}</Text>
                {!!details.fare && (
                    <Text style={styles.row}>
                        <Text style={styles.label}>
                            Fare:
                        </Text> {details.fare}</Text>
                )}
                <View style={styles.actions}>
                    <CustomButton
                        title={busy === "decline" ? "Declining..." : "Decline"}
                        bgVariant="danger"
                        onPress={onDecline}
                        disabled={!!busy}
                        style={{ flex: 1, marginRight: 8 }}
                    />
                    <CustomButton
                        title={busy === "accept" ? "Accepting..." : "Accept"}
                        bgVariant="success"
                        onPress={onAccept}
                        disabled={!!busy}
                        style={{ flex: 1, marginLeft: 8 }}
                    />
                </View>
            </View>
        </ReactNativeModal>
    );
};

const styles = StyleSheet.create({
    sheet: { 
        backgroundColor: "white", 
        borderRadius: 16, 
        padding: 16 
    },
    title: { 
        fontFamily: "DMSans-Bold", 
        fontSize: 20, 
        marginBottom: 12 
    },
    row: { 
        fontFamily: "DMSans", 
        fontSize: 18, 
        marginVertical: 2 
    },
    label: { 
        fontFamily: "DMSans-Bold" 
    },
    actions: { 
        flexDirection: "row", marginTop: 16 
    },
});

export default ScheduledRequestBottomSheet;
