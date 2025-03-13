import { useUser } from "@clerk/clerk-expo";
import { useAuth } from "@clerk/clerk-expo";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import React from "react";
import {
    Text,
    View,
    TouchableOpacity,
    Image,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import messaging from "@react-native-firebase/messaging";
import GoogleTextInput from "@/components/GoogleTextInput";
import Map from "@/components/Map";
import RideCard from "@/components/RideCard";
import { data, icons, images } from "@/constants";
import { useFetch } from "@/lib/fetch";
import { useLocationStore } from "@/store";
import { Ride } from "@/types/type";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import RideRequestBottomSheet from "@/components/RideRequest";


const Home = () => {

    const { user } = useUser();
    const { signOut } = useAuth();
    const { setUserLocation, setDestinationLocation } = useLocationStore();
    const { data: recentRides, loading, error } = useFetch<Ride[]>(`/(api)/ride/${user?.id}`);
    const [isOnline, setIsOnline] = useState<boolean>(false);
    const [rideRequests, setRideRequests] = useState<Ride[]>([]);
    const [newRequest, setNewRequest] = useState<Ride | null>(null);
    const [modalVisible, setModalVisible] = useState(false);


    useEffect(() => {
        const fetchLocation = async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") return;

            let location = await Location.getCurrentPositionAsync({});
            const address = await Location.reverseGeocodeAsync({
                latitude: location.coords?.latitude!,
                longitude: location.coords?.longitude!,
            });

            setUserLocation({
                latitude: location.coords?.latitude,
                longitude: location.coords?.longitude,
                address: `${address[0].name}, ${address[0].region}`,
            });
        }
        fetchLocation()
    }, []);

    useEffect(() => {
        if (!user?.id) return;

        const q = query(
            collection(db, "rideRequests"),
            where("driver_id", "==", user.id),
            where("status", "==", "pending")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map((doc) => {
                const data = doc.data();

                return {
                    id: doc.id,
                    origin_address: data.origin_address,
                    destination_address: data.destination_address,
                    origin_latitude: data.origin_latitude,
                    origin_longitude: data.origin_longitude,
                    destination_latitude: data.destination_latitude,
                    destination_longitude: data.destination_longitude,
                    ride_time: data.ride_time,
                    fare_price: data.fare_price,
                    payment_status: data.payment_status,
                    driver_id: String(data.driver_id),
                    user_id: data.user_id,
                    created_at: data.created_at?.toDate() || new Date(),
                    driver: {
                        first_name: data.driver?.first_name || "",
                        last_name: data.driver?.last_name || "",
                        car_seats: data.driver?.car_seats || 0,
                    },
                } as Ride;
            });
            setRideRequests(requests);

            if (requests.length > 0) {
                setNewRequest(requests[0]);
                setModalVisible(true);
            }
        });

        return () => unsubscribe();
    }, [user?.id]);

    const acceptRide = async (rideId: string) => {
        console.log("Accepting ride:", rideId);
        try {
            await updateDoc(doc(db, "rideRequests", rideId), { status: "accepted" });
            setModalVisible(false);
            Alert.alert("Success", "You have accepted the ride.");
        } catch (error) {
            console.error("Error accepting ride:", error);
            Alert.alert("Error", "Failed to accept the ride. Please try again.");
        }
    };

    const declineRide = async (rideId: string) => {
        console.log("Declining ride:", rideId);
        try {
            await updateDoc(doc(db, "rideRequests", rideId), { status: "declined" });
            setModalVisible(false);
            Alert.alert("Declined", "You have declined the ride.");
        } catch (error) {
            console.error("Error declining ride:", error);
            Alert.alert("Error", "Failed to decline the ride. Please try again.");
        }
    };


    const handleSignOut = async () => {
        try {
            const response = await fetch('/(api)/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: false,
                    clerkId: user?.id,
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to update status to offline');
            }
            await signOut();
            router.replace("/(auth)/sign-in");
        } catch (error) {
            console.error('Error during sign out:', error);
        }
    };

    // const handleSignOut = async () => {
    //     signOut()
    //     router.replace("/(auth)/sign-in")
    // }

    const toggleOnlineStatus = async () => {
        try {
            const newStatus = !isOnline;
            setIsOnline(newStatus);
            const response = await fetch('/(api)/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    clerkId: user?.id,
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to update status');
            }
            const data = await response.json();
        } catch (error) {
            console.error('Error updating status:', error);
            setIsOnline(prevStatus => !prevStatus);
        }
    };
    

    return (
        <SafeAreaView style={styles.container}>
            <RideRequestBottomSheet
                visible={modalVisible}
                ride={newRequest}
                onAccept={acceptRide}
                onDecline={declineRide}
                onClose={() => setModalVisible(false)}
            />
            <FlatList
                data={recentRides?.slice(0, 5)}
                renderItem={({ item }) => <RideCard ride={item} />}
                keyExtractor={(item, index) => index.toString()}
                style={styles.flatList}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.flatListContent}
                ListEmptyComponent={() => (
                    <View style={styles.emptyComponent}>
                        {!loading ? (
                            <>
                                <Image
                                    source={images.noResult}
                                    style={styles.noResultImage}
                                    resizeMode="contain"
                                />
                                <Text style={styles.noResultText}>No recent rides found</Text>
                            </>
                        ) : (
                            <ActivityIndicator size="small" color="#000" />
                        )}
                    </View>
                )}
                ListHeaderComponent={
                    <>
                        <View style={styles.header}>
                            <Text style={styles.welcomeText}>
                                Welcome {user?.firstName}👋
                            </Text>
                            <TouchableOpacity
                                onPress={handleSignOut}
                                style={styles.signOutButton}
                            >
                                <Image source={icons.out} style={styles.signOutIcon} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.statusContainer}>
                            <Text style={styles.statusText}>
                                Status: {isOnline ? "Online" : "Offline"}
                            </Text>
                            <TouchableOpacity
                                onPress={toggleOnlineStatus}
                                style={[styles.toggleButton, isOnline ? styles.online : styles.offline]}
                            >
                                <Text style={styles.toggleButtonText}>
                                    {isOnline ? "Go Offline" : "Go Online"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.sectionTitle}>Your current location</Text>
                        <View style={styles.mapContainer}>
                            <Map showLocationButton={true} />
                        </View>
                        <Text style={styles.sectionTitle}>Ride History</Text>
                    </>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
    },
    modalContent: {
        width: 320,
        padding: 25,
        backgroundColor: "white",
        borderRadius: 15,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 15,
    },
    modalDetails: {
        width: "100%",
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: "#F3F4F6",
        borderRadius: 10,
        marginBottom: 15,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#555",
        marginBottom: 2,
    },
    modalText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#222",
        marginBottom: 10,
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        marginHorizontal: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    acceptButton: {
        backgroundColor: "#34D399",
    },
    declineButton: {
        backgroundColor: "#F87171",
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
    flatList: {
        paddingHorizontal: 20,
    },
    flatListContent: {
        paddingBottom: 100,
    },
    emptyComponent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noResultImage: {
        width: 160,
        height: 160,
    },
    noResultText: {
        fontSize: 12,
        textAlign: "center",
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 20,
        borderRadius: 15,
    },
    welcomeText: {
        fontSize: 24,
        fontFamily: 'JakartaExtraBold',
    },
    signOutButton: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'white',
    },
    signOutIcon: {
        width: 16,
        height: 16,
    },
    statusContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 15,
        backgroundColor: "#f0f0f0",
        borderRadius: 16,
    },
    statusText: {
        fontSize: 18,
        fontWeight: "bold",
        paddingVertical: 8,
    },
    toggleButton: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        justifyContent: "center",
    },
    online: {
        backgroundColor: "#F87171", // Red for when driver wants to go offline
    },
    offline: {
        backgroundColor: "#34D399", // Green for when driver wants to go online
    },
    toggleButtonText: {
        color: "#ffff",
        fontWeight: "bold",
    },
    searchInput: {
        backgroundColor: 'white',
        borderColor: '#dcdcdc',
        borderWidth: 1,
        borderRadius: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'JakartaBold',
        marginTop: 20,
        marginBottom: 10,
    },
    mapContainer: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
        height: 450,
    },
});

export default Home
