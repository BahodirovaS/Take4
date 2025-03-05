import { useUser } from "@clerk/clerk-expo";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import MessageCard from "@/components/MessageCard";
import { Message, Ride } from "@/types/type";
import { images } from "@/constants";
import { useFetch } from "@/lib/fetch";

const Chatroom = () => {
    const { user } = useUser();
    const [chats, setChats] = useState<Map<string, Message>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const messagesData = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp ? data.timestamp.toDate() : null,
                } as Message;
            });

            const groupedChats = new Map<string, Message>();

            messagesData.forEach((message) => {
                const otherPersonId = message.senderId === user?.id ? message.receiverId : message.senderId;
                const chatId = `${user?.id}-${otherPersonId}`; // Create a unique chat ID based on the pair

                if (!groupedChats.has(chatId)) {
                    groupedChats.set(chatId, message);
                } else {
                    const existingMessage = groupedChats.get(chatId);
                    // Only update the chat if the current message is newer
                    if (existingMessage && message.timestamp > existingMessage.timestamp) {
                        groupedChats.set(chatId, message);
                    }
                }
            });

            setChats(groupedChats);
            setLoading(false);
        });

        return unsubscribe;
    }, [user?.id]);

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={Array.from(chats.values())}  // Convert the map to an array for FlatList
                renderItem={({ item }) => <MessageCard message={item} />}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        {!loading ? (
                            <>
                                <Image
                                    source={images.noResult}
                                    style={styles.image}
                                    alt="No chats found"
                                    resizeMode="contain"
                                />
                                <Text style={styles.emptyText}>No chats found</Text>
                            </>
                        ) : (
                            <ActivityIndicator size="small" color="#000" />
                        )}
                    </View>
                )}
                ListHeaderComponent={<Text style={styles.headerText}>All Chats</Text>}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "white",
    },
    listContent: {
        paddingBottom: 100,
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    image: {
        width: 160,
        height: 160,
    },
    emptyText: {
        fontSize: 14,
    },
    headerText: {
        fontSize: 24,
        fontFamily: "JakartaBold",
        marginVertical: 20,
        paddingHorizontal: 20,
    },
});

export default Chatroom;
