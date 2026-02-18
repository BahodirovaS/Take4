import { useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useState, useEffect, useRef } from "react";
import React from "react";
import {
    Text,
    View,
    TouchableOpacity,
    Image,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GoogleTextInput from "@/components/GoogleTextInput";
import Map from "@/components/Map";
import HomeMap from "@/components/HomeMap";
import RideCard from "@/components/RideCard";
import { icons, images } from "@/constants";
import { useLocationStore } from "@/store";
import { ActiveRideData, Ride } from "@/types/type";
import { Ionicons } from "@expo/vector-icons";
import { fetchRideHistory, checkActiveRides, determineRideStage, confirmRideCompletion } from "@/lib/fetch";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const Home = () => {
    const { user } = useUser();
    const { setUserLocation, setDestinationLocation } = useLocationStore();
    const [recentRides, setRecentRides] = useState<Ride[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasActiveRide, setHasActiveRide] = useState(false);
    const [activeRideData, setActiveRideData] = useState<ActiveRideData | null>(null);

    useEffect(() => {
        if (!user?.id) return;

        setLoading(true);
        const unsubscribe = fetchRideHistory(
            user.id,
            (rides) => {
                setRecentRides(rides);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching ride history:", error);
                setLoading(false);
            }
        );

        return unsubscribe;
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;

        const unsubscribe = checkActiveRides(
            user.id,
            (hasRide, rideData) => {
                setHasActiveRide(hasRide);
                setActiveRideData(rideData);
            },
            (error) => {
                console.error("Error checking active rides:", error);
            }
        );

        return unsubscribe;
    }, [user?.id]);


const promptedRef = useRef(false);

useEffect(() => {
  if (!user?.id) return;
  if (!activeRideData?.rideId) return;

  const rideRef = doc(db, "rideRequests", activeRideData.rideId);

  const unsub = onSnapshot(rideRef, (snap) => {
    const d: any = snap.data();
    const status = d?.status;

    if (status === "awaiting_passenger_confirm") {
      if (promptedRef.current) return;
      promptedRef.current = true;

      Alert.alert(
        "Are you at your destination?",
        "Your driver is trying to complete the ride.",
        [
          {
            text: "Not yet",
            style: "cancel",
            onPress: () => {
              promptedRef.current = false;
            },
          },
          {
            text: "Yes",
            onPress: async () => {
              try {
                await confirmRideCompletion(activeRideData.rideId, user.id);
              } catch (e: any) {
                promptedRef.current = false;
                Alert.alert("Error", e?.message || "Could not complete the ride.");
              }
            },
          },
        ],
        { cancelable: false }
      );
    } else {
      promptedRef.current = false;
    }

    if (status === "completed") {
      router.replace({
        pathname: "/(root)/ride-completed",
        params: { rideId: activeRideData.rideId },
      });
    }
  });

  return () => unsub();
}, [activeRideData?.rideId, user?.id]);


    const handleDestinationPress = (location: {
        latitude: number;
        longitude: number;
        address: string;
    }) => {
        setDestinationLocation(location);
        router.push("/(root)/find-ride");
    };

    const navigateToActiveRide = () => {
        if (!activeRideData) return;

        router.push({
            pathname: '/(root)/active-ride',
            params: {
                rideId: activeRideData.rideId,
                rideStage: determineRideStage(activeRideData.status)
            }
        });
    };

    const renderRideHistory = () => {
        if (loading) {
            return <ActivityIndicator size="small" color="#000" />;
        }

        if (recentRides.length === 0) {
            return (
                <View style={styles.emptyComponent}>
                    <Image
                        source={images.noRides}
                        style={styles.noResultImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.noResultText}>No recent rides found</Text>
                </View>
            );
        }

        return (
            <View style={styles.rideHistoryContainer}>
                <ScrollView
                    contentContainerStyle={styles.rideHistoryScrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {recentRides.map((ride) => (
                        <View key={ride.id} style={styles.rideCardContainer}>
                            <RideCard ride={ride} />
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={[{}]}
                renderItem={() => (
                    <>
                        <View style={styles.header}>
                            <Text style={styles.welcomeText}>
                                Welcome {user?.firstName}👋
                            </Text>
                        </View>
                        {hasActiveRide && activeRideData && (
                            <TouchableOpacity
                                style={styles.activeRideBanner}
                                onPress={navigateToActiveRide}
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
                                <HomeMap showLocationButton={true} />
                            </View>
                        </>
                        <Text style={styles.sectionTitle}>Ride History</Text>
                        {renderRideHistory()}
                    </>
                )}
                style={styles.flatList}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.flatListContent}
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
    rideHistoryContainer: {
        maxHeight: 250,
        borderWidth: 1,
        borderColor: '#c0c0c0',
        borderRadius: 10,
        overflow: "hidden",
    },
    rideHistoryScrollContent: {
        paddingVertical: 0,
    },
    rideCardContainer: {
        marginVertical: 0,
        marginBottom: 10,
        marginTop: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 20,
    },
    activeRideBanner: {
        backgroundColor: '#3f7564',
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
        fontFamily: "DMSans-Bold",
        fontSize: 16,
    },
    bannerSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontFamily: "DMSans-Medium",
        fontSize: 15,
        marginTop: 2,
    },
    welcomeText: {
        fontSize: 30,
        fontFamily: 'DMSans-Bold',
    },
    searchInput: {
        backgroundColor: 'white',
        borderColor: '#dcdcdc',
        borderWidth: 1,
        borderRadius: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'DMSans-Bold',
        marginTop: 20,
        marginBottom: 10,
    },
    mapContainer: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
        height: 450,
    },
    rideHistoryList: {
        paddingBottom: 20,
    }
});

export default Home;