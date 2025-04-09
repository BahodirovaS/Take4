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
import { icons, images } from "@/constants";
import { useLocationStore } from "@/store";
import { ActiveRideData, Ride } from "@/types/type";
import { db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";

const Home = () => {
    const { user } = useUser();
    const { signOut } = useAuth();
    const { setUserLocation, setDestinationLocation } = useLocationStore();
    const [recentRides, setRecentRides] = useState<Ride[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [hasActiveRide, setHasActiveRide] = useState(false);
    const [activeRideData, setActiveRideData] = useState<ActiveRideData | null>(null);

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
                    where("status", "in", ["completed"])
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
                                first_name: data.driver?.firstName || "",
                                last_name: data.driver?.lastName || "",
                                car_seats: data.driver?.carSeats || 0,
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

    useEffect(() => {
        if (!user?.id) return;
        const activeRidesQuery = query(
            collection(db, "rideRequests"),
            where("user_id", "==", user.id),
            where("status", "in", ["accepted", "arrived_at_pickup", "in_progress"])
        );

        const unsubscribe = onSnapshot(activeRidesQuery, (snapshot) => {
            if (!snapshot.empty) {
                const rideDoc = snapshot.docs[0];
                const rideData = rideDoc.data();

                setHasActiveRide(true);
                setActiveRideData({
                    rideId: rideDoc.id,
                    status: rideData.status,
                    destination: rideData.destination_address
                });
            } else {
                setHasActiveRide(false);
                setActiveRideData(null);
            }
        });

        return unsubscribe;
    }, [user?.id]);

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
                                    source={images.noRides}
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
                        {hasActiveRide && activeRideData && (
                            <TouchableOpacity
                                style={styles.activeRideBanner}
                                onPress={() => {
                                    router.push({
                                        pathname: '/(root)/active-ride',
                                        params: {
                                            rideId: activeRideData.rideId,
                                            rideStage: activeRideData.status === 'accepted' 
                                                ? 'to_pickup' 
                                                : (activeRideData.status === 'arrived_at_pickup' 
                                                    ? 'to_destination' 
                                                    : 'to_destination')
                                        }
                                    });
                                }}
                            >
                                <View style={styles.bannerIconContainer}>
                                    <Ionicons name="car" size={20} color="#fff" />
                                </View>
                                <View style={styles.bannerTextContainer}>
                                    <Text style={styles.bannerTitle}>
                                        Active ride in progress
                                    </Text>
                                    <Text style={styles.bannerSubtitle}>
                                        Tap to return to ride
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#fff" />
                            </TouchableOpacity>
                        )}

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
        width: 100,
        height: 50,
        margin: 15,
    },
    noResultText: {
        fontSize: 15,
        textAlign: "center",
        margin: 15
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 20,
    },
    activeRideBanner: {
        backgroundColor: '#289dd2',
        padding: 12,
        marginVertical: 10,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
      bannerIconContainer: {
        width: 32,
        height: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      },
      bannerTextContainer: {
        flex: 1,
      },
      bannerTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
      },
      bannerSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
        marginTop: 2,
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
        height: 450,
    },
});

export default Home
