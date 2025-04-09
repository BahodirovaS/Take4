import { useUser } from "@clerk/clerk-expo";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import MessageCard from "@/components/MessageCard";
import { Message, Ride } from "@/types/type";
import { images } from "@/constants";
import { useRouter } from "expo-router";


const Chatroom = () => {
    const router = useRouter();
    const { user } = useUser();
    const [chats, setChats] = useState<Map<string, Message>>(new Map());
    const [loading, setLoading] = useState(true);
    const [fetchComplete, setFetchComplete] = useState(false);

    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            setFetchComplete(true);
            return;
        }

        const senderQuery = query(
            collection(db, "messages"),
            where("senderId", "==", user.id),
            orderBy("timestamp", "desc")
        );

        const recipientQuery = query(
            collection(db, "messages"),
            where("recipientId", "==", user.id),
            orderBy("timestamp", "desc")
        );

        const unsubscribeSender = onSnapshot(senderQuery, (snapshot) => {
            const messagesData = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp ? data.timestamp.toDate() : null,
                } as Message;
            });

            setChats((prevChats) => {
                const updatedChats = new Map(prevChats);
                messagesData.forEach((message) => {
                    const otherPersonId = message.senderId === user?.id
                        ? message.recipientId
                        : message.senderId;
                    const chatId = `${user?.id}-${otherPersonId}`;
                    updatedChats.set(chatId, message);
                });
                return updatedChats;
            });

            setLoading(false);
            setFetchComplete(true);
        }, (error) => {
            console.error("Error fetching sender messages:", error);
            setLoading(false);
            setFetchComplete(true);
        });

        const unsubscribeRecipient = onSnapshot(recipientQuery, (snapshot) => {
            const messagesData = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp ? data.timestamp.toDate() : null,
                } as Message;
            });

            setChats((prevChats) => {
                const updatedChats = new Map(prevChats);
                messagesData.forEach((message) => {
                    const otherPersonId = message.senderId === user?.id
                        ? message.recipientId
                        : message.senderId;
                    const chatId = `${user?.id}-${otherPersonId}`;
                    updatedChats.set(chatId, message);
                });
                return updatedChats;
            });

            setLoading(false);
            setFetchComplete(true);
        }, (error) => {
            console.error("Error fetching recipient messages:", error);
            setLoading(false);
            setFetchComplete(true);
        });

        return () => {
            unsubscribeSender();
            unsubscribeRecipient();
        };
    }, [user?.id]);

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={Array.from(chats.values())}
                renderItem={({ item }) => <MessageCard message={item} />}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        {fetchComplete && chats.size === 0 ? (
                            <>
                                <Image
                                    source={images.message}
                                    style={styles.image}
                                    alt="No chats found"
                                    resizeMode="contain"
                                />
                                <Text style={styles.emptyText}>No messages</Text>
                            </>
                        ) : loading ? (
                            <ActivityIndicator size="small" color="#000" />
                        ) : null}
                    </View>
                )}
                ListHeaderComponent={<Text style={styles.headerText}>Messages</Text>}
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
    emptyText: {
        fontSize: 18,
        color: '#666',
        fontFamily: 'JakartaRegular',
    },
    image: {
        marginTop: 150,
        width: 160,
        height: 160,
        alignItems: "center",
    },
    headerText: {
        fontSize: 30,
        alignSelf: "center",
        fontFamily: "JakartaBold",
        marginVertical: 20,
        paddingHorizontal: 20,
    },
});

export default Chatroom;