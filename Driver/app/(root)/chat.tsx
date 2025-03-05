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
import { collection, addDoc, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@clerk/clerk-expo";
import { Message, Ride } from "@/types/type";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";


const Chat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const { user } = useUser();
    const router = useRouter();
    const { otherPersonId, otherPersonName } = useLocalSearchParams<{
        otherPersonId: string;
        otherPersonName: string;
    }>();

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
            });
            setInput("");
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    };



    const handleGoBack = () => {
        router.replace("/chatroom");
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
                    {otherPersonName && (
                        <Text style={styles.otherPersonName}>{otherPersonName}</Text>
                    )}
                </View>
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
                        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
                            <Text style={styles.sendButtonText}>Send</Text>
                        </TouchableOpacity>
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
        justifyContent: "space-between",
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
        backgroundColor: "#fff",
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
        backgroundColor: "#3b82f6",
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
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#ddd",
    },
    input: {
        flex: 1,
        borderWidth: 1,
        padding: 12,
        marginRight: 10,
        borderRadius: 25,
        borderColor: "#ddd",
        backgroundColor: "#f4f4f4",
    },
    sendButton: {
        backgroundColor: "#3b82f6",
        paddingVertical: 12,
        paddingHorizontal: 18,
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
        flex: 1,
        fontWeight: "bold",
        textAlign: "center",
        marginVertical: 10,
        color: "#333",
    },
});

export default Chat;
