import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Ride, PassengerInfo, ActiveRideProps } from '@/types/type';
import DriverMap from '@/components/DriverMap';
import { useLocationStore } from '@/store';
import { router } from 'expo-router';
import CustomButton from './CustomButton';
import {
  fetchPassengerInfo,
  subscribeToRideDetails,
  setupLocationTracking,
  markArrivedAtPickup,
  startRide,
  subscribeToUnreadCount,
  requestRideCompletion,
} from '@/lib/fetch';
import { useUser } from '@clerk/clerk-expo';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRealtimeETA } from '@/lib/realTimeEta';

const ActiveRideScreen: React.FC<ActiveRideProps> = ({ rideId }) => {
  const [ride, setRide] = useState<Ride | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [rideStage, setRideStage] = useState<'to_pickup' | 'to_destination'>('to_pickup');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [passengerInfo, setPassengerInfo] = useState<PassengerInfo | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useUser();
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isRequestingComplete, setIsRequestingComplete] = useState(false);
  const [completionRequested, setCompletionRequested] = useState(false);
  const cancelHandledRef = useRef(false);
  const locationStore = useLocationStore();
  const { setUserLocation, setDestinationLocation } = locationStore;

  const handleRideStatusChange = (status: string) => {
    const newRideStage =
      status === 'accepted'
        ? 'to_pickup'
        : status === 'arrived_at_pickup' || status === 'in_progress'
        ? 'to_destination'
        : 'to_pickup';
    setRideStage(newRideStage);
  };

  const loadPassengerInfo = async (userId: string) => {
    if (!userId) return;
    const info = await fetchPassengerInfo(userId);
    if (info) {
      setPassengerInfo(info);
      if (info.phone) setPhoneNumber(info.phone);
    }
  };

  useEffect(() => {
    if (!user?.id || !passengerInfo?.id || !rideId) return;
    const unsub = subscribeToUnreadCount(user.id, passengerInfo.id, rideId as string, setUnreadCount);
    return unsub;
  }, [user?.id, passengerInfo?.id, rideId]);

  const handleRideUpdate = (updatedRide: Ride) => {
    setRide(updatedRide);
    if (updatedRide.user_id) loadPassengerInfo(updatedRide.user_id);

    setDestinationLocation({
      latitude: rideStage === 'to_pickup' ? updatedRide.origin_latitude : updatedRide.destination_latitude,
      longitude: rideStage === 'to_pickup' ? updatedRide.origin_longitude : updatedRide.destination_longitude,
      address: rideStage === 'to_pickup' ? updatedRide.origin_address : updatedRide.destination_address,
    });
  };

  useEffect(() => {
    if (!rideId) {
      setIsLoading(false);
      Alert.alert('Error', 'No ride ID provided');
      return;
    }

    const unsubscribeRide = subscribeToRideDetails(
      rideId,
      handleRideUpdate,
      handleRideStatusChange,
      (msg) => Alert.alert("Error", msg)
    );

    let locationSubscription: any;

    setupLocationTracking(
      rideId,
      location => {
        setCurrentLocation(location);
        setUserLocation({ latitude: location.latitude, longitude: location.longitude, address: '' });
      },
      address => {
        if (!currentLocation) return;
        setUserLocation({ ...currentLocation, address });
      },
      errorMsg => Alert.alert('Location Error', errorMsg)
    ).then(sub => {
      locationSubscription = sub;
      setIsLoading(false);
    });

    return () => {
      unsubscribeRide();
      if (locationSubscription) locationSubscription.remove();
    };
  }, [rideId]);

  useEffect(() => {
    if (!ride) return;
    setDestinationLocation({
      latitude: rideStage === 'to_pickup' ? ride.origin_latitude : ride.destination_latitude,
      longitude: rideStage === 'to_pickup' ? ride.origin_longitude : ride.destination_longitude,
      address: rideStage === 'to_pickup' ? ride.origin_address : ride.destination_address,
    });
  }, [rideStage, ride]);

  useEffect(() => {
    if (ride?.status === "completed") {
      Alert.alert("Ride Completed", "Passenger confirmed arrival.", [
        { text: "OK", onPress: () => router.replace("/(root)/(tabs)/home") },
      ]);
    }
  }, [ride?.status]);

  useEffect(() => {
    if (ride?.status === "cancelled_by_user" && !cancelHandledRef.current) {
      cancelHandledRef.current = true;
      Alert.alert("Ride Cancelled", "The passenger cancelled the ride.", [
        { text: "OK", onPress: () => router.replace("/(root)/(tabs)/home") },
      ]);
    }
  }, [ride?.status]);

  const handleArriveAtPickup = async () => {
    const success = await markArrivedAtPickup(rideId);
    if (!success) {
      Alert.alert('Error', 'Could not update ride status');
      return;
    }
    setRideStage('to_destination');
    if (ride) {
      setDestinationLocation({
        latitude: ride.destination_latitude,
        longitude: ride.destination_longitude,
        address: ride.destination_address,
      });
    }
    Alert.alert('Arrived', "Let the passenger know you've arrived");
  };

  const handleStartRide = async () => {
    const success = await startRide(rideId);
    if (!success) {
      Alert.alert('Error', 'Could not start the ride');
      return;
    }
    setRideStage('to_destination');
    if (ride) {
      setDestinationLocation({
        latitude: ride.destination_latitude,
        longitude: ride.destination_longitude,
        address: ride.destination_address,
      });
    }
    Alert.alert('Ride Started', 'Navigate to destination');
  };

  const handleCompleteRide = async () => {
    if (!rideId) return;
    setIsRequestingComplete(true);
    try {
      await requestRideCompletion(rideId, user?.id);
      setCompletionRequested(true);
      Alert.alert("Waiting for passenger", "We’ve asked the passenger to confirm they’re at the destination.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not request completion");
    } finally {
      setIsRequestingComplete(false);
    }
  };

  const openNavigation = () => {
    if (!ride) return;
    const toLat = rideStage === 'to_pickup' ? ride.origin_latitude : ride.destination_latitude;
    const toLng = rideStage === 'to_pickup' ? ride.origin_longitude : ride.destination_longitude;
    const fromLat = currentLocation?.latitude;
    const fromLng = currentLocation?.longitude;

    if (Platform.OS === 'ios') {
      const url =
        `http://maps.apple.com/?` +
        (fromLat != null && fromLng != null ? `saddr=${fromLat},${fromLng}&` : '') +
        `daddr=${toLat},${toLng}&dirflg=d`;
      Linking.openURL(url);
    } else {
      const appUrl = `google.navigation:q=${toLat},${toLng}`;
      const webUrl =
        `https://www.google.com/maps/dir/?api=1` +
        (fromLat != null && fromLng != null ? `&origin=${fromLat},${fromLng}` : '') +
        `&destination=${toLat},${toLng}&travelmode=driving`;
      Linking.canOpenURL(appUrl)
        .then(supported => Linking.openURL(supported ? appUrl : webUrl))
        .catch(() => Linking.openURL(webUrl));
    }
  };

  const target = useMemo(() => {
    if (!ride) return null;
    return rideStage === 'to_pickup'
      ? { latitude: ride.origin_latitude, longitude: ride.origin_longitude }
      : { latitude: ride.destination_latitude, longitude: ride.destination_longitude };
  }, [ride, rideStage]);

  const { etaMin, arrivalText } = useRealtimeETA(
    currentLocation && target ? currentLocation : null,
    currentLocation && target ? target : null,
    { pollMs: 15000 }
  );

  if (isLoading || !ride) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading ride details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <DriverMap showLocationButton />
      </View>
      <View style={styles.rideInfoContainer}>
        <Text style={styles.addressText}>
          {rideStage === 'to_pickup' ? ride.origin_address : ride.destination_address}
        </Text>
        {etaMin != null ? (
          <Text style={styles.etaText}>
            {rideStage === 'to_pickup' ? 'ETA to pickup' : 'ETA to dropoff'}: {etaMin} min (~{arrivalText})
          </Text>
        ) : (
          <Text style={styles.etaText}>Calculating ETA…</Text>
        )}
        <View style={styles.actionButtonContainer}>
          {rideStage === 'to_pickup' && ride.status !== 'arrived_at_pickup' ? (
            <CustomButton title="Arrived at Pickup" bgVariant="primary" onPress={handleArriveAtPickup} />
          ) : ride.status === 'arrived_at_pickup' ? (
            <CustomButton title="Start Ride" bgVariant="primary" onPress={handleStartRide} />
          ) : (
            <CustomButton
              title={completionRequested ? "Waiting for passenger…" : "Complete Ride"}
              bgVariant="primary"
              onPress={handleCompleteRide}
              disabled={isRequestingComplete || completionRequested}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapContainer: { flex: 1 },
  rideInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  addressText: { fontSize: 18, marginBottom: 8 },
  etaText: { fontSize: 16, marginBottom: 12 },
  actionButtonContainer: { marginTop: 10, marginBottom: 30 },
});

export default ActiveRideScreen;