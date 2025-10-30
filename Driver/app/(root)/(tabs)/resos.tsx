import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  Image,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { useUser } from "@clerk/clerk-expo";
import { useReservationStore } from "@/store";
import { RideRequest } from '@/types/type';
import { images } from "@/constants";
import ReservationCard from '@/components/ReservationCard';
import { router } from 'expo-router';
import {
  fetchScheduledRides,
  startScheduledRide as startRideAction,
  cancelScheduledRide as cancelRideAction
} from '@/lib/fetch';

const Reservations = () => {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchComplete, setFetchComplete] = useState(false);
  const { user } = useUser();
  const { clearReservation } = useReservationStore();

  useEffect(() => {
    loadScheduledRides();
  }, [user]);


  const loadScheduledRides = async () => {
    if (!user?.id) {
      setIsLoading(false);
      setFetchComplete(true);
      return;
    }
    setIsLoading(true);
    const { rides: scheduledRides, error } = await fetchScheduledRides(user.id);
    const sorted = [...scheduledRides].sort(
      (a, b) =>
        (a.scheduled_datetime?.toDate?.() ?? new Date(a.scheduled_datetime)) -
        (b.scheduled_datetime?.toDate?.() ?? new Date(b.scheduled_datetime))
    );
    if (error) {
      Alert.alert('Error', 'Failed to fetch scheduled rides');
    } else {
      setRides(sorted);
    }
    setIsLoading(false);
    setFetchComplete(true);
  };

  const handleStartRide = async (rideId: string) => {
    const { success, error } = await startRideAction(rideId);
    if (success) {
      router.push({
        pathname: '/(root)/active-ride',
        params: {
          rideId: String(rideId)
        }
      });
    } else {
      Alert.alert("Error", "Failed to accept the ride. Please try again.");
    }
  };


  const handleCancelRide = async (rideId: string) => {
    const { success, error } = await cancelRideAction(rideId);
    if (success) {
      setRides(prevRides => prevRides.filter(ride => ride.id !== rideId));
      clearReservation();
      Alert.alert('Success', 'Ride reservation cancelled');
    } else {
      Alert.alert('Error', 'Failed to cancel ride');
    }
  };


  const confirmCancelRide = (rideId: string) => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes',
          onPress: () => handleCancelRide(rideId)
        }
      ]
    );
  };


  const renderRideItem = ({ item }: { item: RideRequest }) => {
    return (
      <ReservationCard
        ride={item}
        onStart={() => handleStartRide(item.id)}
        onCancel={() => confirmCancelRide(item.id)}
      />
    );
  };


  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      {fetchComplete && rides.length === 0 ? (
        <>
          <Image
            source={images.calendar}
            style={styles.image}
            alt="No scheduled rides"
            resizeMode="contain"
          />
          <Text style={styles.emptyText}>No scheduled rides</Text>
        </>
      ) : isLoading ? (
        <ActivityIndicator size="small" color="#000" />
      ) : null}
    </View>
  );


  const renderHeader = () => (
    <View>
      <Text style={styles.headerText}>Scheduled Rides</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={rides}
        renderItem={renderRideItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={renderHeader}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    fontFamily: 'DMSans',
    marginTop: 10,
  },
  image: {
    marginTop: 150,
    width: 160,
    height: 160,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    paddingLeft: 20,
    width: "100%",
  },
  carIcon: {
    width: 50,
    height: 50,
    borderRadius: 9999
  },
  headerText: {
    fontSize: 30,
    alignSelf: "center",
    fontFamily: "DMSans-Bold",
    marginTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});

export default Reservations;