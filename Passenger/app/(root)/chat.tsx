import { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    FlatList,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    StyleSheet
} from "react-native";
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@clerk/clerk-expo";
import { Message, Ride } from "@/types/type";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import CustomButton from "@/components/CustomButton";

const Chat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [rideDetails, setRideDetails] = useState<Partial<Ride> | null>(null);
    const { user } = useUser();
    const router = useRouter();
    const { 
        otherPersonId, 
        otherPersonName, 
        rideId, 
        context 
    } = useLocalSearchParams<{
        otherPersonId: string;
        otherPersonName: string;
        rideId?: string;
        context?: string;
    }>();


    useEffect(() => {
        if (rideId) {
            const fetchRideDetails = async () => {
                try {
                    const rideDoc = await getDoc(doc(db, "rideRequests", rideId));
                    if (rideDoc.exists()) {
                        const data = rideDoc.data();
                        setRideDetails({
                            id: rideDoc.id,
                            origin_address: data.origin_address,
                            destination_address: data.destination_address,
                            status: data.status
                        });
                    }
                } catch (error) {
                    console.error("Error fetching ride details:", error);
                }
            };
            
            fetchRideDetails();
        }
    }, [rideId]);

    useEffect(() => {
        if (!user?.id || !otherPersonId) return;
        const q = query(
            collection(db, "messages"),
            where("senderId", "in", [user.id, otherPersonId]),
            where("recipientId", "in", [user.id, otherPersonId]),
            orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const messagesData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            } as Message));
            setMessages(messagesData);
        });

        return unsubscribe;
    }, [user?.id, otherPersonId]);

    const sendMessage = async () => {
        if (!input.trim()) return;
        try {
            await addDoc(collection(db, "messages"), {
                text: input,
                senderId: user?.id || "guest",
                senderName: `${user?.firstName} ${user?.lastName}` || "Guest",
                recipientId: otherPersonId,
                recipientName: otherPersonName,
                timestamp: new Date(),
                rideId: rideId || null, // Associate message with ride if exists
                context: context || "general"
            });
            setInput("");
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    };

    const handleGoBack = () => {
        // If this chat was opened from an active ride, go back to the ride screen
        if (context === "active_ride" && rideId) {
            router.back();
        } else {
            router.replace("/chatroom");
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoiding}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleGoBack}>
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        {otherPersonName && (
                            <Text style={styles.otherPersonName}>{otherPersonName}</Text>
                        )}
                        {rideDetails && (
                            <Text style={styles.rideInfo}>
                                Ride to {rideDetails.destination_address?.split(',')[0]}
                            </Text>
                        )}
                    </View>
                </View>
                
                {/* Ride context banner if applicable */}
                {rideDetails && (
                    <View style={styles.rideBanner}>
                        <Ionicons name="car-outline" size={20} color="#333" />
                        <Text style={styles.rideBannerText}>
                            {rideDetails.status === 'in_progress' 
                                ? 'Active ride to: ' 
                                : 'Ride to: '}
                            {rideDetails.destination_address?.split(',')[0]}
                        </Text>
                    </View>
                )}
                
                <FlatList
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View
                            style={[
                                styles.messageContainer,
                                item.senderId === user?.id
                                    ? styles.myMessage
                                    : styles.otherMessage,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.message,
                                    item.senderId === user?.id
                                        ? styles.myMessageText
                                        : styles.otherMessageText,
                                ]}
                            >
                                {item.text}
                            </Text>
                        </View>
                    )}
                    inverted
                />
                <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            value={input}
                            onChangeText={setInput}
                            placeholder="Type a message..."
                            style={styles.input}
                        />
                        <CustomButton
                            title={"Send"}
                            bgVariant={"primary"}
                            onPress={sendMessage}
                            style={styles.sendButton}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#fff",
    },
    keyboardAvoiding: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
        backgroundColor: "#fff",
    },
    headerContent: {
        flex: 1,
        flexDirection: "column",
        alignItems: "center",
    },
    rideBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    rideBannerText: {
        fontSize: 14,
        color: "#333",
        marginLeft: 8,
    },
    messageContainer: {
        flexDirection: "row",
        marginVertical: 2,
        borderRadius: 20,
        maxWidth: "80%",
    },
    myMessage: {
        alignSelf: "flex-end",
        marginRight: 10,
        backgroundColor: "#289dd2",
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 10,
        position: "relative",
    },
    otherMessage: {
        alignSelf: "flex-start",
        marginLeft: 10,
        backgroundColor: "#f0f0f0",
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 10,
        position: "relative",
    },
    message: {
        flexShrink: 1,
        color: "#fff",
        fontSize: 18,
        marginLeft: 5,
        marginRight: 5
    },
    myMessageText: {
        color: "#fff",
    },
    otherMessageText: {
        color: "#333",
    },
    inputWrapper: {
        justifyContent: "flex-end",
        paddingBottom: 20,
        paddingTop: 10,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        paddingTop: 20,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#ddd",
    },
    input: {
        flex: 1,
        borderWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 18,
        marginRight: 10,
        borderRadius: 25,
        borderColor: "#ddd",
        backgroundColor: "#f4f4f4",
        fontSize: 18,
    },
    sendButton: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        width: "auto",
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
    },
    sendButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    otherPersonName: {
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center",
        color: "#333",
    },
    rideInfo: {
        fontSize: 14,
        color: "#666",
        marginTop: 2,
    },
});

export default Chat;