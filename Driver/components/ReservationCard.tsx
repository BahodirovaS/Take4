import { icons } from "@/constants";
import { db } from "@/lib/firebase";
import { RideRequest } from "@/types/type";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const ReservationCard: React.FC<{ 
    ride: RideRequest, 
    onCancel: () => void, 
    onReschedule: () => void 
  }> = ({ ride, onCancel, onReschedule }) => {
    const [driverName, setDriverName] = useState('');
  
    useEffect(() => {
      const fetchDriverName = async () => {
        if (ride.driver_id) {
          try {
            const driverDoc = await getDoc(doc(db, "drivers", ride.driver_id));
            if (driverDoc.exists()) {
              const driverData = driverDoc.data();
              setDriverName(`${driverData.first_name} ${driverData.last_name}`);
            }
          } catch (error) {
            console.error("Error fetching driver name:", error);
          }
        }
      };
  
      fetchDriverName();
    }, [ride.driver_id]);
  
    return (
      <View style={styles.cardContainer}>
        <View style={styles.cardContent}>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value} numberOfLines={1}>
                {ride.scheduled_date}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Time</Text>
              <Text style={styles.value} numberOfLines={1}>
                {ride.scheduled_time}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Driver</Text>
              <Text style={styles.value}>
                {driverName || 'Not assigned'}
              </Text>
            </View>
            <View style={styles.row}>
              <Image
                source={{
                  uri: `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=600&height=400&center=lonlat:${ride.destination_longitude},${ride.destination_latitude}&zoom=14&apiKey=${process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY}`,
                }}
                style={styles.mapImage}
              />
              <View style={styles.detailsContainer}>
                <View style={styles.row}>
                  <Image source={icons.to} style={styles.icon} />
                  <Text style={styles.text} numberOfLines={1}>
                    {ride.origin_address}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Image source={icons.point} style={styles.icon} />
                  <Text style={styles.text} numberOfLines={1}>
                    {ride.destination_address}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={styles.rescheduleButton}
                onPress={onReschedule}
              >
                <Text style={styles.actionButtonText}>Reschedule</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={onCancel}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };


  const styles = StyleSheet.create({
    cardContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
        borderRadius: 10,
        marginBottom: 10,
      },
      cardContent: {
        flex: 1,
      },
      infoContainer: {
        marginTop: 10,
        backgroundColor: "#f0f0f0",
        borderRadius: 10,
        padding: 10,
      },
      infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      },
      label: {
        fontSize: 14,
        color: "gray",
      },
      value: {
        fontSize: 14,
        fontWeight: "bold",
      },
      row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 10,
      },
      mapImage: {
        width: 80,
        height: 90,
        borderRadius: 10,
      },
      detailsContainer: {
        flex: 1,
        marginLeft: 10,
      },
      icon: {
        width: 20,
        height: 20,
        marginRight: 5,
        marginLeft: 5,
      },
      text: {
        fontSize: 14,
        fontWeight: "500",
        flexShrink: 1,
      },
      actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
      },
      rescheduleButton: {
        flex: 1,
        backgroundColor: '#4CAF50',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 6,
        marginRight: 5,
      },
      cancelButton: {
        flex: 1,
        backgroundColor: '#FF6B6B',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 6,
        marginLeft: 5,
      },
      actionButtonText: {
        color: 'white',
        fontFamily: 'JakartaBold',
        fontSize: 14,
        textAlign: 'center',
      },
  })
  export default ReservationCard