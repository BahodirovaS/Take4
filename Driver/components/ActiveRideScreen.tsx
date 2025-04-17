import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Linking,
    Platform,
    ScrollView,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Ride, PassengerInfo, ActiveRideProps } from '@/types/type';
import DriverMap from "@/components/DriverMap";
import { useLocationStore } from '@/store';
import { router } from 'expo-router';
import CustomButton from './CustomButton';
import {
    fetchPassengerInfo,
    subscribeToRideDetails,
    setupLocationTracking,
    markArrivedAtPickup,
    startRide,
    completeRide
} from '@/lib/fetch';

const ActiveRideScreen: React.FC<ActiveRideProps> = ({ rideId, onComplete, onCancel }) => {
    const [ride, setRide] = useState<Ride | null>(null);
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [rideStage, setRideStage] = useState<'to_pickup' | 'to_destination'>('to_pickup');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [passengerInfo, setPassengerInfo] = useState<PassengerInfo | null>(null);
    const [loadingPassenger, setLoadingPassenger] = useState<boolean>(false);

    const locationStore = useLocationStore();
    const { setUserLocation, setDestinationLocation } = locationStore;

    const handleRideStatusChange = (status: string) => {
        const newRideStage =
            status === 'accepted' ? 'to_pickup' :
                status === 'arrived_at_pickup' ? 'to_destination' :
                    status === 'in_progress' ? 'to_destination' :
                        'to_pickup';

        setRideStage(newRideStage);
    };

    const loadPassengerInfo = async (userId: string) => {
        if (!userId) return;
        setLoadingPassenger(true);
        const info = await fetchPassengerInfo(userId);
        if (info) setPassengerInfo(info);
        setLoadingPassenger(false);
    };


    const handleRideUpdate = (updatedRide: Ride) => {
        setRide(updatedRide);
        if (updatedRide.user_id) {
            loadPassengerInfo(updatedRide.user_id);
        }
        setDestinationLocation({
            latitude: rideStage === 'to_pickup'
                ? updatedRide.origin_latitude
                : updatedRide.destination_latitude,
            longitude: rideStage === 'to_pickup'
                ? updatedRide.origin_longitude
                : updatedRide.destination_longitude,
            address: rideStage === 'to_pickup'
                ? updatedRide.origin_address
                : updatedRide.destination_address
        });
    };
    useEffect(() => {
        if (!rideId) {
            console.error("Error: rideId is undefined or null");
            setIsLoading(false);
            Alert.alert("Error", "No ride ID provided");
            return () => { };
        }
        const unsubscribeRide = subscribeToRideDetails(
            rideId,
            handleRideUpdate,
            handleRideStatusChange,
            (errorMsg) => {
                setIsLoading(false);
                Alert.alert("Error", errorMsg);
            }
        );

        const setupLocation = async () => {
            const locationSubscription = await setupLocationTracking(
                rideId,
                (location) => {
                    setCurrentLocation(location);
                    setUserLocation({
                        latitude: location.latitude,
                        longitude: location.longitude,
                        address: "",
                    });
                },
                (address) => {
                    const updatedLocation = {
                        ...currentLocation,
                        latitude: currentLocation?.latitude || 0,
                        longitude: currentLocation?.longitude || 0,
                        address
                    };
                    setUserLocation(updatedLocation);
                },
                (errorMsg) => Alert.alert("Location Error", errorMsg)
            );

            setIsLoading(false);
            return locationSubscription;
        };

        let locationSubscription: any;
        setupLocation().then(sub => {
            locationSubscription = sub;
        });

        return () => {
            unsubscribeRide();
            if (locationSubscription) {
                locationSubscription.remove();
            }
        };
    }, [rideId]);

    useEffect(() => {
        if (ride) {
            setDestinationLocation({
                latitude: rideStage === 'to_pickup'
                    ? ride.origin_latitude
                    : ride.destination_latitude,
                longitude: rideStage === 'to_pickup'
                    ? ride.origin_longitude
                    : ride.destination_longitude,
                address: rideStage === 'to_pickup'
                    ? ride.origin_address
                    : ride.destination_address
            });
        }
    }, [rideStage, ride, setDestinationLocation]);

    const handleArriveAtPickup = async () => {
        const success = await markArrivedAtPickup(rideId);

        if (success) {
            setRideStage('to_destination');

            if (ride) {
                setDestinationLocation({
                    latitude: ride.destination_latitude,
                    longitude: ride.destination_longitude,
                    address: ride.destination_address
                });
            }

            Alert.alert("Arrived", "Let the passenger know you've arrived");
        } else {
            Alert.alert("Error", "Could not update ride status");
        }
    };

    const handleStartRide = async () => {
        const success = await startRide(rideId);

        if (success) {
            setRideStage('to_destination');

            if (ride) {
                setDestinationLocation({
                    latitude: ride.destination_latitude,
                    longitude: ride.destination_longitude,
                    address: ride.destination_address
                });
            }

            Alert.alert("Ride Started", "Navigate to destination");
        } else {
            Alert.alert("Error", "Could not start the ride");
        }
    };

    const handleCompleteRide = async () => {
        if (!ride) return;

        const success = await completeRide(
            rideId,
            ride,
            {
                userLatitude: locationStore.userLatitude,
                userLongitude: locationStore.userLongitude,
                userAddress: locationStore.userAddress || "",
                destinationLatitude: locationStore.destinationLatitude,
                destinationLongitude: locationStore.destinationLongitude,
                destinationAddress: locationStore.destinationAddress || ""
            }
        );

        if (success) {
            Alert.alert(
                "Ride Completed",
                "The ride has been marked as completed",
                [{
                    text: "OK",
                    onPress: () => {
                        router.replace('/(root)/(tabs)/home');
                    }
                }]
            );
        } else {
            Alert.alert("Error", "Could not complete the ride");
        }
    };

    const openGoogleMapsNavigation = () => {
        if (!ride) return;

        const lat = rideStage === 'to_pickup' ? ride.origin_latitude : ride.destination_latitude;
        const lng = rideStage === 'to_pickup' ? ride.origin_longitude : ride.destination_longitude;

        const url = Platform.select({
            ios: `comgooglemaps://?daddr=${lat},${lng}&dirflg=d`,
            android: `google.navigation:q=${lat},${lng}`,
        });

        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

        Linking.canOpenURL(url as string).then(supported => {
            if (supported) {
                Linking.openURL(url as string);
            } else {
                Linking.openURL(webUrl);
            }
        }).catch(err => {
            console.error("Error opening maps URL:", err);
            Linking.openURL(webUrl);
        });
    };

    const handleMessagePassenger = () => {
        if (!passengerInfo || !passengerInfo.id) {
            Alert.alert("Error", "Cannot find passenger information");
            return;
        }

        router.push({
            pathname: "/chat",
            params: {
                otherPersonId: passengerInfo.id,
                otherPersonName: passengerInfo.firstName,
                rideId: rideId,
                context: "active_ride"
            }
        });
    };

    const handleGoToHome = () => {
        router.push({
            pathname: '/(root)/(tabs)/home',
        });
    };

    if (isLoading || !ride) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading ride details...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleGoToHome}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.topBarText}>Active Ride</Text>
            </View>

            <View style={styles.mapContainer}>
                <DriverMap showLocationButton={true} />
            </View>

            <View style={styles.rideInfoContainer}>
                <ScrollView style={styles.infoScroll}>
                    <View style={styles.headerContainer}>
                        <Text style={styles.stageText}>
                            {rideStage === 'to_pickup'
                                ? `Heading to pickup ${passengerInfo?.firstName || 'passenger'}`
                                : `Taking ${passengerInfo?.firstName || 'passenger'} to destination`}
                        </Text>
                    </View>

                    <Text style={styles.addressText}>
                        {rideStage === 'to_pickup' ? ride.origin_address : ride.destination_address}
                    </Text>
                </ScrollView>

                <View style={styles.buttonContainer}>
                    <CustomButton
                        title="Navigate"
                        bgVariant="primary"
                        onPress={openGoogleMapsNavigation}
                        IconLeft={() => <Ionicons name="navigate" size={20} color="white" marginRight="5" />}
                        style={styles.navigationButton}
                    />

                    <CustomButton
                        title="Message"
                        bgVariant="secondary"
                        onPress={handleMessagePassenger}
                        IconLeft={() => <Ionicons name="chatbubble-ellipses-outline" size={20} color="white" marginRight="5" />}
                        style={styles.messageButton}
                    />
                </View>

                <View style={styles.actionButtonContainer}>
                    {rideStage === 'to_pickup' && ride.status !== 'arrived_at_pickup' ? (
                        <CustomButton
                            title="Arrived at Pickup"
                            bgVariant="success"
                            onPress={handleArriveAtPickup}
                            style={styles.customActionButton}
                        />
                    ) : rideStage === 'to_pickup' && ride.status === 'arrived_at_pickup' ? (
                        <CustomButton
                            title="Start Ride"
                            bgVariant="success"
                            onPress={handleStartRide}
                            style={styles.customActionButton}
                        />
                    ) : (
                        <CustomButton
                            title="Complete Ride"
                            bgVariant="success"
                            onPress={handleCompleteRide}
                            style={styles.customActionButton}
                        />
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButton: {
        padding: 8,
    },
    topBar: {
        height: 36,
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        paddingHorizontal: 16,
        zIndex: 10,
    },
    topBarText: {
        fontSize: 18,
        fontFamily: "DMSans-SemiBold",
        color: '#333',
    },
    mapContainer: {
        flex: 1,
    },
    infoScroll: {
        maxHeight: 100,
    },
    headerContainer: {
        marginBottom: 8,
    },
    rideInfoContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: 16,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
        elevation: 6,
    },
    stageText: {
        fontSize: 20,
        fontFamily: "DMSans-Bold",
        marginBottom: 4,
    },
    addressText: {
        fontSize: 20,
        marginBottom: 8,
        marginTop: 8,
        fontFamily: "DMSans-Medium",
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 20,
    },
    actionButtonContainer: {
        marginTop: 15,
        marginBottom: 40,
    },
    navigationButton: {
        flex: 1,
        marginRight: 10,
    },
    messageButton: {
        flex: 1,
        marginLeft: 10,
    },
    customActionButton: {
        width: '100%',
    }
});

export default ActiveRideScreen;