import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatDate } from "@/lib/utils";
import { Message } from "@/types/type";

const MessageCard: React.FC<{ message: Message }> = ({ message }) => {

    const timestamp = message.timestamp ? new Date(message.timestamp) : null;
    let formattedDate = "Unknown Date";

    if (timestamp) {
        const now = new Date();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);

        if (timestamp > oneWeekAgo) {
            formattedDate = timestamp.toLocaleDateString("en-US", { weekday: "long" });
        } else {
            formattedDate = timestamp.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
        }
    }


    return (
        <View style={styles.cardContainer}>
            <View style={styles.cardContent}>
            <Text style={styles.senderName}>{message.senderName}</Text>
            <Text style={styles.timestamp}>{formattedDate}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: "white",
        padding: 15,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
        borderBottomStartRadius: 30,
        borderBottomEndRadius: 30,

    },
    cardContent: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 10,
    },
    senderName: {
        fontSize: 16,
        fontWeight: "bold",
    },
    timestamp: {
        fontSize: 14,
        color: "gray",
    },
});

export default MessageCard;
