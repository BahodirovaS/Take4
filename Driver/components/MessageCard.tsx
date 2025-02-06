import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatDate } from "@/lib/utils";
import { Message } from "@/types/type";

const MessageCard: React.FC<{ message: Message }> = ({ message }) => {
    return (
        <View style={styles.cardContainer}>
            <View style={styles.cardContent}>
            <Text style={styles.senderName}>{message.senderName}</Text>
            <Text style={styles.timestamp}>{formatDate(message.timestamp)}</Text>
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
