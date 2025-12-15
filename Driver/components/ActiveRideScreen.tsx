import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
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
  completeRide,
  subscribeToUnreadCount,
  payoutDriverForRide,
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
  const [loadingPassenger, setLoadingPassenger] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useUser();
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  const locationStore = useLocationStore();
  const { setUserLocation, setDestinationLocation } = locationStore;

  const handleRideStatusChange = (status: string) => {
    const newRideStage =
      status === 'accepted'
        ? 'to_pickup'
        : status === 'arrived_at_pickup'
        ? 'to_destination'
        : status === 'in_progress'
        ? 'to_destination'
        : 'to_pickup';
    setRideStage(newRideStage);
  };

  const loadPassengerInfo = async (userId: string) => {
    if (!userId) return;
    setLoadingPassenger(true);
    const info = await fetchPassengerInfo(userId);
    if (info) setPassengerInfo(info);
    setLoadingPassenger(false);
    if (info?.phone || info?.phone) {
      setPhoneNumber(info.phone ?? info.phone);
    }
  };

  useEffect(() => {
    if (!user?.id || !passengerInfo?.id || !rideId) return;
    const unsub = subscribeToUnreadCount(user.id, passengerInfo.id, rideId as string, setUnreadCount);
    return unsub;
  }, [user?.id, passengerInfo?.id, rideId]);

  const handleRideUpdate = (updatedRide: Ride) => {
    setRide(updatedRide);
    if (updatedRide.user_id) {
      loadPassengerInfo(updatedRide.user_id);
    }
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
      return () => {};
    }

    const unsubscribeRide = subscribeToRideDetails(
      rideId,
      handleRideUpdate,
      handleRideStatusChange,
      errorMsg => {
        setIsLoading(false);
        Alert.alert('Error', errorMsg);
      }
    );

    const setupLocation = async () => {
      const locationSubscription = await setupLocationTracking(
        rideId,
        location => {
          setCurrentLocation(location);
          setUserLocation({
            latitude: location.latitude,
            longitude: location.longitude,
            address: '',
          });
        },
        address => {
          const updatedLocation = {
            ...currentLocation,
            latitude: currentLocation?.latitude || 0,
            longitude: currentLocation?.longitude || 0,
            address,
          };
          setUserLocation(updatedLocation);
        },
        errorMsg => Alert.alert('Location Error', errorMsg)
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
        latitude: rideStage === 'to_pickup' ? ride.origin_latitude : ride.destination_latitude,
        longitude: rideStage === 'to_pickup' ? ride.origin_longitude : ride.destination_longitude,
        address: rideStage === 'to_pickup' ? ride.origin_address : ride.destination_address,
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
          address: ride.destination_address,
        });
      }
      Alert.alert('Arrived', "Let the passenger know you've arrived");
    } else {
      Alert.alert('Error', 'Could not update ride status');
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
          address: ride.destination_address,
        });
      }
      Alert.alert('Ride Started', 'Navigate to destination');
    } else {
      Alert.alert('Error', 'Could not start the ride');
    }
  };

  const handleCompleteRide = async () => {
    if (!ride) return;
    const success = await completeRide(rideId, ride, {
      userLatitude: locationStore.userLatitude,
      userLongitude: locationStore.userLongitude,
      userAddress: locationStore.userAddress || '',
      destinationLatitude: locationStore.destinationLatitude,
      destinationLongitude: locationStore.destinationLongitude,
      destinationAddress: locationStore.destinationAddress || '',
    });

    if (!success) {
    Alert.alert("Error", "Could not complete the ride");
    return;
  }

  try {
    await payoutDriverForRide(rideId);
  } catch (err: any) {
    console.error("Driver payout failed:", err?.message || err);

    Alert.alert(
      "Ride completed",
      "Ride was completed, but driver payout failed. Support has been notified."
    );
  }

  Alert.alert("Ride Completed", "The ride has been marked as completed", [
    {
      text: "OK",
      onPress: () => {
        router.replace("/(root)/(tabs)/home");
      },
    },
  ]);
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

  const handleMessagePassenger = () => {
    if (!passengerInfo || !passengerInfo.id) {
      Alert.alert('Error', 'Cannot find passenger information');
      return;
    }

    router.push({
      pathname: '/chat',
      params: {
        otherPersonId: passengerInfo.id,
        otherPersonName: passengerInfo.firstName,
        rideId: rideId,
        context: 'active_ride',
      },
    });
  };

  const handleContactPassengerPhone = async () => {
    try {
      let phone = phoneNumber;

      if (!phone) {
        if (!ride?.user_id) {
          Alert.alert('Contact Info', 'Passenger ID is missing');
          return;
        }
        const q = query(collection(db, 'passengers'), where('clerkId', '==', ride.user_id), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data() as any;
          phone = data.phoneNumber || data.phone || null;
          if (phone) setPhoneNumber(phone);
        }
      }

      if (!phone) {
        Alert.alert('Contact Info', 'Phone number is not available');
        return;
      }

      const raw = phone.toString().trim();
      const digits = raw.replace(/[^\d+]/g, '');
      const normalized = digits.startsWith('+') ? digits : digits.length === 10 ? `+1${digits}` : digits;

      if (!normalized) {
        Alert.alert('Contact Info', 'Phone number format is invalid');
        return;
      }

      const url = `tel:${normalized}`;
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Error', 'Calling is not supported on this device');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open phone dialer');
    }
  };

  const handleGoToHome = () => {
    router.push({ pathname: '/(root)/(tabs)/home' });
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

  const originShort = useMemo(
    () => (ride?.origin_address ? String(ride.origin_address).split(',')[0] : 'Origin'),
    [ride?.origin_address]
  );
  const destinationShort = useMemo(
    () => (ride?.destination_address ? String(ride.destination_address).split(',')[0] : 'Destination'),
    [ride?.destination_address]
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
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoToHome}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={styles.topBarText}>Active Ride</Text>
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.routeText}>
            {originShort} → {destinationShort}
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.mapContainer}>
        <DriverMap showLocationButton={true} />
      </View>

      <View style={styles.rideInfoContainer}>
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

        {currentLocation && target ? (
          etaMin != null ? (
            <Text style={styles.etaText}>
              {rideStage === 'to_pickup' ? 'ETA to pickup' : 'ETA to dropoff'}: {etaMin} min (~{arrivalText})
            </Text>
          ) : (
            <Text style={styles.etaText}>Calculating ETA…</Text>
          )
        ) : (
          <Text style={styles.etaText}>Waiting for location…</Text>
        )}

        <View style={styles.buttonContainer}>
          <CustomButton
            title="Navigate"
            bgVariant="tertiary"
            textVariant="primary"
            onPress={openNavigation}
            IconLeft={() => <Ionicons name="navigate" size={20} color="black" marginRight="5" />}
            style={styles.navigationButton}
          />

          <View style={styles.messageWrapper}>
            <CustomButton
              title="Call Passenger"
              bgVariant="tertiary"
              textVariant="primary"
              onPress={handleContactPassengerPhone}
              IconLeft={() => <Ionicons name="call-outline" size={20} color="black" marginRight="5" />}
              style={styles.messageButton}
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionButtonContainer}>
          {rideStage === 'to_pickup' && ride.status !== 'arrived_at_pickup' ? (
            <CustomButton
              title="Arrived at Pickup"
              bgVariant="primary"
              onPress={handleArriveAtPickup}
              style={styles.customActionButton}
            />
          ) : ride.status === 'arrived_at_pickup' ? (
            <CustomButton title="Start Ride" bgVariant="primary" onPress={handleStartRide} style={styles.customActionButton} />
          ) : (
            <CustomButton
              title="Complete Ride"
              bgVariant="primary"
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
    paddingHorizontal: 16,
    zIndex: 10,
    marginBottom: 15,
    marginTop: 15,
  },
  topBarText: {
    fontSize: 18,
    fontFamily: 'DMSans-SemiBold',
    color: '#333',
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  routeText: {
    fontSize: 14,
    fontFamily: 'DMSans',
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: '80%',
  },
  headerSpacer: {
    width: 40,
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
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  stageText: {
    fontSize: 20,
    fontFamily: 'DMSans-Bold',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 20,
    marginBottom: 8,
    marginTop: 8,
    fontFamily: 'DMSans-Medium',
  },
  etaText: {
    fontSize: 16,
    marginTop: 4,
    paddingBottom: 10,
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
  },
  messageWrapper: {
    flex: 1,
    marginLeft: 10,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
  },
  customActionButton: {
    width: '100%',
  },
});

export default ActiveRideScreen;
