import { useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useState, useEffect, useCallback } from "react";
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
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import HomeMap from "@/components/HomeMap";
import RideCard from "@/components/RideCard";
import { images } from "@/constants";
import { useLocationStore } from "@/store";
import { ActiveRideData, Ride } from "@/types/type";
import CustomButton from "@/components/CustomButton";
import { Ionicons } from "@expo/vector-icons";
import {
    getUserLocation,
    getDriverStatus,
    updateDriverStatus,
    getRideHistory,
    checkActiveRides,
} from "@/lib/fetch";
import {
    getDriverProfileExists,
    getDriverOnboardingStatus,
} from "@/lib/fetch";
import DriverLocationPublisher from "@/components/DriverLocationPublisher";

const Home = () => {
    const { user } = useUser();
    const { setUserLocation } = useLocationStore();
    const [recentRides, setRecentRides] = useState<Ride[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState<boolean>(false);
    const [driverDocId, setDriverDocId] = useState<string | null>(null);
    const [hasActiveRide, setHasActiveRide] = useState(false);
    const [activeRideData, setActiveRideData] = useState<ActiveRideData | null>(null);
    const [hasDriverProfile, setHasDriverProfile] = useState<boolean>(false);
    const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);
    const [checkingSetup, setCheckingSetup] = useState<boolean>(true);

    useEffect(() => {
        const fetchLocation = async () => {
            await getUserLocation((locationData) => setUserLocation(locationData));
        };
        fetchLocation();
    }, []);

    useEffect(() => {
        if (!user?.id) return;

        const unsubscribe = getDriverStatus(
            user.id,
            (driverId, status) => {
                setDriverDocId(driverId);
                setIsOnline(status);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching driver status:", error);
                setLoading(false);
            }
        );

        return unsubscribe;
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;

        setLoading(true);
        const unsubscribe = getRideHistory(
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

    const checkSetup = useCallback(async () => {
        if (!user?.id) return;
        try {
            setCheckingSetup(true);
            const [profileExists, onboarding] = await Promise.all([
                getDriverProfileExists(user.id),
                getDriverOnboardingStatus(user.id),
            ]);
            setHasDriverProfile(profileExists);
            setOnboardingCompleted(onboarding.onboardingCompleted);
        } catch (e) {
            console.error("Setup check failed:", e);
            setHasDriverProfile(false);
            setOnboardingCompleted(false);
        } finally {
            setCheckingSetup(false);
        }
    }, [user?.id]);

    useEffect(() => {
        checkSetup();
    }, [checkSetup]);

    const toggleOnlineStatus = async () => {
        if (!hasDriverProfile || !onboardingCompleted) {
            Alert.alert(
                "Action needed",
                !hasDriverProfile
                    ? "Please complete your driver profile first."
                    : "Please finish setting up your bank account to go online."
            );
            return;
        }

        if (!driverDocId) {
            Alert.alert("Error", "Please complete your driver profile first.");
            return;
        }

        try {
            const newStatus = !isOnline;
            setIsOnline(newStatus);
            const success = await updateDriverStatus(driverDocId, newStatus);

            if (!success) {
                setIsOnline((prev) => !prev);
                Alert.alert("Error", "Failed to update your status. Please try again.");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            setIsOnline((prev) => !prev);
            Alert.alert("Error", "Failed to update your status. Please try again.");
        }
    };

    const renderRideHistory = () => {
        if (loading) return <ActivityIndicator size="small" color="#000" />;

        if (recentRides.length === 0) {
            return (
                <View style={styles.emptyComponent}>
                    <Image source={images.noRides} style={styles.noResultImage} resizeMode="contain" />
                    <Text style={styles.noResultText}>No recent rides found</Text>
                </View>
            );
        }

        return (
            <View style={styles.rideHistoryContainer}>
                <ScrollView
                    contentContainerStyle={styles.rideHistoryScrollContent}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
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

    const navigateToActiveRide = () => {
        if (!activeRideData) return;

        router.push({
            pathname: "/(root)/active-ride",
            params: {
                rideId: activeRideData.rideId,
                rideStage: activeRideData.status === "accepted" ? "to_pickup" : "to_destination",
            },
        });
    };

    const shouldShowSetupFlag =
        !checkingSetup && (!hasDriverProfile || !onboardingCompleted);

    return (
        <SafeAreaView style={styles.container}>
            <DriverLocationPublisher isOnline={isOnline} />
            <FlatList
                data={[{}]}
                renderItem={() => (
                    <>
                        <View style={styles.header}>
                            <Text style={styles.welcomeText}>Welcome {user?.firstName}👋</Text>
                        </View>

                        {hasActiveRide && activeRideData && (
                            <TouchableOpacity style={styles.activeRideBanner} onPress={navigateToActiveRide}>
                                <View style={styles.bannerIconContainer}>
                                    <Ionicons name="car" size={20} color="#fff" />
                                </View>
                                <View style={styles.bannerTextContainer}>
                                    <Text style={styles.bannerTitle}>Active ride in progress</Text>
                                    <Text style={styles.bannerSubtitle}>Tap to return to ride</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#fff" />
                            </TouchableOpacity>
                        )}

                        <View style={styles.statusContainer}>
                            <Text style={styles.statusText}>You are {isOnline ? "Online" : "Offline"}</Text>
                            <CustomButton
                                title={isOnline ? "Go Offline" : "Go Online"}
                                onPress={toggleOnlineStatus}
                                bgVariant={isOnline ? "danger" : "success"}
                                style={styles.statusButton}
                            />
                        </View>

                        {shouldShowSetupFlag && (
                            <View style={styles.setupPromptCard}>
                                <Ionicons name="warning" size={20} color="#B45309" />
                                <View style={styles.setupPromptTextWrap}>
                                    <Text style={styles.setupPromptTitle}>Action needed</Text>
                                    <Text style={styles.setupPromptDesc}>
                                        Please complete your profile and bank account information to go online.
                                    </Text>
                                </View>
                                <View style={styles.setupPromptActions}>
                                    <TouchableOpacity onPress={() => router.push("/(root)/(tabs)/profile")}>
                                        <Text style={styles.setupPromptLink}>Complete Profile</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => router.push("/(root)/(tabs)/wallet")}>
                                        <Text style={styles.setupPromptLink}>Set Up Bank</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <Text style={styles.sectionTitle}>Your current location</Text>
                        <View style={styles.mapContainer}>
                            <HomeMap showLocationButton />
                        </View>

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
    container: { flex: 1, backgroundColor: "white" },
    flatList: { paddingHorizontal: 20 },
    flatListContent: { paddingBottom: 100 },

    emptyComponent: { flex: 1, alignItems: "center", justifyContent: "center" },
    noResultImage: { width: 100, height: 50, margin: 15 },
    noResultText: { fontSize: 15, textAlign: "center", margin: 15 },

    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 20, borderRadius: 15 },
    activeRideBanner: {
        backgroundColor: "#289dd2", padding: 12, marginVertical: 10, borderRadius: 15,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
    },
    bannerIconContainer: {
        width: 32, height: 32, backgroundColor: "rgba(255, 255, 255, 0.2)", borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 12,
    },
    bannerTextContainer: { flex: 1 },
    bannerTitle: { color: "#fff", fontFamily: "DMSans-Bold", fontSize: 16 },
    bannerSubtitle: { color: "rgba(255, 255, 255, 0.8)", fontFamily: "DMSans-Medium", fontSize: 15, marginTop: 2 },
    welcomeText: { fontSize: 24, fontFamily: "DMSans-ExtraBold" },

    statusContainer: { flexDirection: "row", justifyContent: "space-between", padding: 15, backgroundColor: "#f0f0f0", borderRadius: 16 },
    statusText: { fontSize: 18, fontWeight: "bold", paddingVertical: 8 },
    statusButton: { paddingVertical: 8, paddingHorizontal: 20, width: "auto", borderRadius: 20, justifyContent: "center" },

    setupPromptCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#FFF7ED",
        borderLeftWidth: 4,
        borderLeftColor: "#F59E0B",
        padding: 12,
        borderRadius: 12,
        marginTop: 12,
    },
    setupPromptTextWrap: { flex: 1, marginLeft: 10 },
    setupPromptTitle: { fontFamily: "DMSans-Bold", fontSize: 15, color: "#B45309", marginBottom: 2 },
    setupPromptDesc: { fontFamily: "DMSans", fontSize: 14, color: "#92400E", lineHeight: 18 },
    setupPromptActions: { marginLeft: 8, alignItems: "flex-end", gap: 6 },
    setupPromptLink: { fontFamily: "DMSans-Bold", fontSize: 14, color: "#B45309" },

    sectionTitle: { fontSize: 20, fontFamily: "DMSans-Bold", marginTop: 20, marginBottom: 10 },
    mapContainer: { flexDirection: "row", backgroundColor: "transparent", height: 300 },
    rideHistoryContainer: { maxHeight: 250, borderWidth: 1, borderColor: "#c0c0c0", borderRadius: 10, overflow: "hidden" },
    rideHistoryScrollContent: { paddingVertical: 0 },
    rideCardContainer: { marginVertical: 0, marginBottom: 10, marginTop: 0 },
});

export default Home;
