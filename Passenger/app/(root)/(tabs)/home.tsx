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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from "firebase/firestore";
import GoogleTextInput from "@/components/GoogleTextInput";
import Map from "@/components/Map";
import RideCard from "@/components/RideCard";
import { data, icons, images } from "@/constants";
import { useLocationStore } from "@/store";
import { Ride } from "@/types/type";
import { db } from "@/lib/firebase";

const Home = () => {
    const { user } = useUser();
    const { signOut } = useAuth();
    const { setUserLocation, setDestinationLocation } = useLocationStore();
    const [recentRides, setRecentRides] = useState<Ride[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const handleSignOut = () => {
        signOut();
        router.replace("/(auth)/sign-up");
    };


    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                setHasPermission(false);
                return;
            }

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
        })();
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        
        const fetchRideHistory = async () => {
            try {
                setLoading(true);
                
                const ridesRef = collection(db, "rideRequests");
                const q = query(
                    ridesRef, 
                    where("user_id", "==", user.id),
                    where("status", "in", ["completed", "accepted"])
                );
                
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const rides = snapshot.docs.map((doc) => {
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
                            driver_id: data.driver_id,
                            user_id: data.user_id,
                            created_at: data.created_at && typeof data.created_at.toDate === 'function' 
                                ? data.created_at.toDate().toISOString() 
                                : new Date().toISOString(),
                            driver: {
                                first_name: data.driver?.first_name || "",
                                last_name: data.driver?.last_name || "",
                                car_seats: data.driver?.car_seats || 0,
                            },
                            status: data.status
                        } as Ride;
                    });
                    
                    // Sort by created_at date, most recent first
                    rides.sort((a, b) => {
                        // Parse the ISO string dates
                        const timeA = new Date(a.created_at).getTime();
                        const timeB = new Date(b.created_at).getTime();
                        return timeB - timeA;
                    });
                    
                    setRecentRides(rides);
                    setLoading(false);
                });
                
                return unsubscribe;
            } catch (error) {
                console.error("Error fetching ride history:", error);
                setLoading(false);
            }
        };
        
        fetchRideHistory();
    }, [user?.id]);

    const handleDestinationPress = (location: {
        latitude: number;
        longitude: number;
        address: string;
    }) => {
        setDestinationLocation(location);

        router.push("/(root)/find-ride");
    };

    return (
        <SafeAreaView style={styles.container}>
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

                        <GoogleTextInput
                            icon={icons.search}
                            containerStyle={styles.searchInput}
                            handlePress={handleDestinationPress}
                        />

                        <>
                            <Text style={styles.sectionTitle}>Your current location</Text>
                            <View style={styles.mapContainer}>
                                <Map showLocationButton={true} />
                            </View>
                        </>

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
        height: 300,
    },
});

export default Home
