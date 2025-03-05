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
import messaging from "@react-native-firebase/messaging";
import GoogleTextInput from "@/components/GoogleTextInput";
import Map from "@/components/Map";
import RideCard from "@/components/RideCard";
import { data, icons, images } from "@/constants";
import { useFetch } from "@/lib/fetch";
import { useLocationStore } from "@/store";
import { Ride } from "@/types/type";

const Home = () => {

    const { user } = useUser();
    const { signOut } = useAuth();
    const { setUserLocation, setDestinationLocation } = useLocationStore();
    const { data: recentRides, loading, error } = useFetch<Ride[]>(`/(api)/ride/${user?.id}`);
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [isOnline, setIsOnline] = useState<boolean>(false);

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
