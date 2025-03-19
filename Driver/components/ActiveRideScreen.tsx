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
} from 'react-native';
import { doc, updateDoc, onSnapshot, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Ride } from '@/types/type'
import Map from "@/components/Map";
import { useLocationStore } from '@/store';
import { ActiveRideProps } from '@/types/type';
import { router } from 'expo-router';

const ActiveRideScreen: React.FC<ActiveRideProps> = ({ rideId, onComplete, onCancel }) => {
    const [ride, setRide] = useState<Ride | null>(null);
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [rideStage, setRideStage] = useState<'to_pickup' | 'to_destination'>('to_pickup');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const locationStore = useLocationStore();
    const { setUserLocation, setDestinationLocation } = locationStore;

    useEffect(() => {
        if (!rideId) {
            console.error("Error: rideId is undefined or null");
            setIsLoading(false);    
            Alert.alert("Error", "No ride ID provided");
            return () => { };
        }

        const fetchRideDetails = async () => {
            try {
                const rideRef = doc(db, "rideRequests", rideId);

                const unsubscribe = onSnapshot(rideRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setRide({
                            id: docSnap.id,
                            origin_address: data.origin_address,
                            destination_address: data.destination_address,
                            origin_latitude: data.origin_latitude,
                            origin_longitude: data.origin_longitude,
                            destination_latitude: data.destination_latitude,
                            destination_longitude: data.destination_longitude,
                            user_id: data.user_id,
                            ride_time: data.ride_time,
                            fare_price: data.fare_price,
                            payment_status: data.payment_status,
                            driver_id: data.driver_id,
                            created_at: data.createdAt?.toDate?.() || new Date(),
                            driver: {
                                first_name: data.driver?.first_name || "",
                                last_name: data.driver?.last_name || "",
                                car_seats: data.driver?.car_seats || 0,
                            },
                            status: data.status,
                        });

                        setDestinationLocation({
                            latitude: rideStage === 'to_pickup' 
                                ? data.origin_latitude 
                                : data.destination_latitude,
                            longitude: rideStage === 'to_pickup' 
                                ? data.origin_longitude 
                                : data.destination_longitude,
                            address: rideStage === 'to_pickup' 
                                ? data.origin_address 
                                : data.destination_address
                        });

                        if (data.status === 'cancelled') {
                            Alert.alert('Ride Cancelled', 'This ride has been cancelled by the passenger.');
                            onCancel();
                        }
                    }
                    setIsLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error fetching ride details:", error);
                setIsLoading(false);
                Alert.alert("Error", "Failed to load ride details");
            }
        };

        fetchRideDetails();
    }, [rideId, rideStage, setDestinationLocation]);

    useEffect(() => {
        let locationSubscription: any;

        const getLocationPermission = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required for navigation');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            // Update local state
            setCurrentLocation({ latitude, longitude });
            
            // Update user location in the store to enable route display
            const address = await Location.reverseGeocodeAsync({
                latitude,
                longitude
            }).catch(() => [{ name: "", region: "" }]);
            
            setUserLocation({
                latitude,
                longitude,
                address: `${address[0]?.name || ""}, ${address[0]?.region || ""}`,
            });

            // Subscribe to location updates
            locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 10, // Update every 10 meters
                },
                async (location) => {
                    const { latitude, longitude } = location.coords;
                    setCurrentLocation({ latitude, longitude });

                    // Update location store with current position
                    setUserLocation({
                        latitude,
                        longitude,
                        address: `${address[0]?.name || ""}, ${address[0]?.region || ""}`,
                    });

                    // Update driver location in Firestore
                    if (rideId) {
                        updateDoc(doc(db, "rideRequests", rideId), {
                            driver_current_latitude: latitude,
                            driver_current_longitude: longitude,
                            last_location_update: new Date(),
                        }).catch(err => console.error("Error updating driver location:", err));
                    }
                }
            );
        };

        getLocationPermission();

        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
            }
        };
    }, [rideId, setUserLocation]);

    const handleArriveAtPickup = async () => {
        try {
            await updateDoc(doc(db, "rideRequests", rideId), {
                status: 'arrived_at_pickup',
                arrived_at_pickup_time: new Date()
            });

            setRideStage('to_destination');

            if (ride) {
                setDestinationLocation({
                    latitude: ride.destination_latitude,
                    longitude: ride.destination_longitude,
                    address: ride.destination_address
                });
            }

            Alert.alert("Arrived", "Let the passenger know you've arrived");
        } catch (error) {
            console.error("Error updating ride status:", error);
            Alert.alert("Error", "Could not update ride status");
        }
    };

    const handleStartRide = async () => {
        try {
            await updateDoc(doc(db, "rideRequests", rideId), {
                status: 'in_progress',
                ride_start_time: new Date()
            });
            
            // Change ride stage to destination
            setRideStage('to_destination');

            // Update destination location to the ride's final destination
            if (ride) {
                setDestinationLocation({
                    latitude: ride.destination_latitude,
                    longitude: ride.destination_longitude,
                    address: ride.destination_address
                });
            }

            Alert.alert("Ride Started", "Navigate to destination");
        } catch (error) {
            console.error("Error updating ride status:", error);
            Alert.alert("Error", "Could not start the ride");
        }
    };

    const handleCompleteRide = async () => {
        try {
            const { 
                userLatitude, 
                userLongitude, 
                userAddress, 
                destinationLatitude, 
                destinationLongitude, 
                destinationAddress 
            } = locationStore;

            // Update current ride request status to completed
            await updateDoc(doc(db, "rideRequests", rideId), {
                status: 'completed',
                ride_end_time: new Date()
            });

            // Add completed ride to Firestore 'completedRides' collection
            const completedRideData = {
                origin_address: userAddress,
                destination_address: destinationAddress,
                origin_latitude: userLatitude,
                origin_longitude: userLongitude,
                destination_latitude: destinationLatitude,
                destination_longitude: destinationLongitude,
                ride_time: Math.round(Date.now() / 1000),
                fare_price: ride?.fare_price || 0,
                payment_status: "paid",
                driver_id: ride?.driver_id,
                user_id: ride?.user_id,
                rideRequestId: rideId, // Reference to original ride request
                created_at: new Date(),
                completed_at: new Date()
            };

            // Add to completedRides collection
            await addDoc(collection(db, "completedRides"), completedRideData);

            Alert.alert(
                "Ride Completed",
                "The ride has been marked as completed",
                [{
                    text: "OK",
                    onPress: () => {
                        router.replace('/(root)/(tabs)/home')
                    }
                }]
            );
        } catch (error) {
            console.error("Error completing ride:", error);
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
                console.log("Opening native maps app:", url);
                Linking.openURL(url as string);
            } else {
                console.log("Opening web URL:", webUrl);
                Linking.openURL(webUrl);
            }
        }).catch(err => {
            console.error("Error opening maps URL:", err);
            Linking.openURL(webUrl);
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
        <View style={styles.container}>
            <View style={styles.mapContainer}>
                <Map showLocationButton={true}/>
            </View>

            <View style={styles.rideInfoContainer}>
                <ScrollView style={styles.infoScroll}>
                    <Text style={styles.stageText}>
                        {rideStage === 'to_pickup' ? 'Heading to pickup passenger' : 'Taking passenger to destination'}
                    </Text>

                    <Text style={styles.addressText}>
                        {rideStage === 'to_pickup' ? ride.origin_address : ride.destination_address}
                    </Text>
                </ScrollView>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.navigationButton}
                        onPress={openGoogleMapsNavigation}
                    >
                        <Ionicons name="navigate" size={20} color="white" />
                        <Text style={styles.buttonText}>Navigate</Text>
                    </TouchableOpacity>

                    {rideStage === 'to_pickup' && ride.status !== 'arrived_at_pickup' ? (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleArriveAtPickup}
                        >
                            <Text style={styles.buttonText}>Arrived at Pickup</Text>
                        </TouchableOpacity>
                    ) : rideStage === 'to_pickup' && ride.status === 'arrived_at_pickup' ? (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleStartRide}
                        >
                            <Text style={styles.buttonText}>Start Ride</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleCompleteRide}
                        >
                            <Text style={styles.buttonText}>Complete Ride</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapContainer: {
        flex: 1,
    },
    infoScroll: {
        maxHeight: 100,
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
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    addressText: {
        fontSize: 20,
        marginBottom: 8,
        marginTop: 8,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 40,
        paddingTop: 20,
    },
    navigationButton: {
        backgroundColor: '#4285F4',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginRight: 8,
    },
    actionButton: {
        backgroundColor: '#34A853',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginLeft: 8,
    },
    startRideButton: {
        backgroundColor: '#EA4335',
        paddingVertical: 22,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 4,
    },
});

export default ActiveRideScreen;