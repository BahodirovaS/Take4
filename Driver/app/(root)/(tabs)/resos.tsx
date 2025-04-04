import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Image, SafeAreaView } from 'react-native';
import { useAuth, useUser } from "@clerk/clerk-expo";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { useReservationStore } from "@/store";
import { RideRequest } from '@/types/type';
import { icons, images } from "@/constants";
import { formatDate } from "@/lib/utils";
import ReservationCard from '@/components/ReservationCard';

const Reservations = () => {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const { clearReservation, setReservationId } = useReservationStore();

  useEffect(() => {
    fetchScheduledRides();
  }, [user]);

  const fetchScheduledRides = async () => {
    try {
      const q = query(
        collection(db, "rideRequests"),
        where("user_id", "==", user?.id),
        where("status", "==", "scheduled")
      );

      const querySnapshot = await getDocs(q);
      const scheduledRides: RideRequest[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RideRequest));

      setRides(scheduledRides);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching scheduled rides:", error);
      Alert.alert('Error', 'Failed to fetch scheduled rides');
      setIsLoading(false);
    }
  };

  const cancelRide = async (rideId: string) => {
    try {
      await deleteDoc(doc(db, "rideRequests", rideId));
      setRides(prevRides => prevRides.filter(ride => ride.id !== rideId));
      clearReservation();

      Alert.alert('Success', 'Ride reservation cancelled');
    } catch (error) {
      console.error("Error cancelling ride:", error);
      Alert.alert('Error', 'Failed to cancel ride');
    }
  };

  const rescheduleRide = (ride: RideRequest) => {
    // Set the reservation details in the store for re-booking
    setReservationId(ride.id);

    // Navigate to the booking/scheduling screen
    // You might want to adjust the navigation based on your app's routing
    // router.push('/(root)/(tabs)/schedule-ride');
  };

  const renderRideItem = ({ item }: { item: RideRequest }) => {
    return (
      <ReservationCard
        ride={item}
        onCancel={() => {
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
                onPress: () => cancelRide(item.id)
              }
            ]
          );
        }}
        onReschedule={() => rescheduleRide(item)}
      />
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading scheduled rides...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeView}>
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Scheduled Rides</Text>
        {rides.length === 0 ? (
          <View style={styles.emptyState}>
            <Image source={images.noResult} style={styles.image} />
            <Text style={styles.emptyStateText}>No scheduled rides</Text>
          </View>
        ) : (
          <FlatList
            data={rides}
            renderItem={renderRideItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeView: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 20,
  },
  screenTitle: {
    fontSize: 30,
    textAlign: 'center',
    fontFamily: 'JakartaBold',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    fontFamily: 'JakartaRegular',
  },
  image: {
    width: 160,
    height: 160,
  },
});

export default Reservations;