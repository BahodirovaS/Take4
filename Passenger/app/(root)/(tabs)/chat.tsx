import React from "react";
import { Image, ScrollView, Text, View, StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { images } from "@/constants";

const Chat: React.FC = () => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <Text style={styles.headerText}>Chat</Text>
                <View style={styles.centeredContainer}>
                    <Image
                        source={images.message}
                        style={styles.image}
                        resizeMode="contain"
                    />
                    <Text style={styles.noMessagesText}>No Messages Yet</Text>
                    <Text style={styles.instructionText}>
                        Start a conversation with your friends and family
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "white",
        padding: 20,
    } as ViewStyle,
    scrollViewContent: {
        flexGrow: 1,
    } as ViewStyle,
    headerText: {
        fontSize: 24,
        fontFamily: "JakartaBold",
    } as TextStyle,
    centeredContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    } as ViewStyle,
    image: {
        width: "100%",
        height: 160,
    } as ImageStyle,
    noMessagesText: {
        fontSize: 24,
        fontFamily: "JakartaBold",
        marginTop: 12,
    } as TextStyle,
    instructionText: {
        fontSize: 16,
        marginTop: 8,
        textAlign: "center",
        paddingHorizontal: 28,
    } as TextStyle,
});

export default Chat;
