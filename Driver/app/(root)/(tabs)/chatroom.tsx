import { useUser } from "@clerk/clerk-expo";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import MessageCard from "@/components/MessageCard";
import { Message } from "@/types/type";
import { images } from "@/constants";

const Chatroom = () => {
    const { user } = useUser();
    const [chats, setChats] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const messagesData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Message));
            setChats(messagesData);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={chats}
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
