import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { useAuth, useUser } from "@clerk/clerk-expo";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useLocationStore, useReservationStore } from "@/store";
import { RideRequest } from '@/types/type';
import { icons, images } from "@/constants";
import { formatDate } from "@/lib/utils";
import ReservationCard from '@/components/ReservationCard';
import { router } from 'expo-router';

const Reservations = () => {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchComplete, setFetchComplete] = useState(false);
  const { user } = useUser();
  const { clearReservation, setReservationId } = useReservationStore();

  useEffect(() => {
    fetchScheduledRides();
  }, [user]);

  const fetchScheduledRides = async () => {
    if (!user?.id) {
      setIsLoading(false);
      setFetchComplete(true);
      return;
    }

    try {
      const q = query(
        collection(db, "rideRequests"),
        where("user_id", "==", user.id),
        where("status", "==", "scheduled")
      );

      const querySnapshot = await getDocs(q);
      const scheduledRides: RideRequest[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RideRequest));

      setRides(scheduledRides);
      setIsLoading(false);
      setFetchComplete(true);
    } catch (error) {
      console.error("Error fetching scheduled rides:", error);
      Alert.alert('Error', 'Failed to fetch scheduled rides');
      setIsLoading(false);
      setFetchComplete(true);
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
    setReservationId(ride.id);
    useLocationStore.getState().setUserLocation({
      latitude: ride.origin_latitude,
      longitude: ride.origin_longitude,
      address: ride.origin_address
    });

    useLocationStore.getState().setDestinationLocation({
      latitude: ride.destination_latitude,
      longitude: ride.destination_longitude,
      address: ride.destination_address
    });

    router.push(`/(root)/reserve-confirm-ride?reschedule=true`);
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

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={rides}
        renderItem={renderRideItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
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
        )}
        ListHeaderComponent={
          <View>
            <Text style={styles.headerText}>Scheduled Rides</Text>
            <View style={styles.header}>
              <Image source={images.icon} style={styles.carIcon} />
            </View>
          </View>
        }
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
    fontFamily: 'JakartaRegular',
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
  },
  headerText: {
    fontSize: 30,
    alignSelf: "center",
    fontFamily: "JakartaBold",
    marginTop: 20,
    paddingHorizontal: 20,
  },
});

export default Reservations;