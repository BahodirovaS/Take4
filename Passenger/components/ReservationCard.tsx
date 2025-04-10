import { icons } from "@/constants";
import { db } from "@/lib/firebase";
import { RideRequest } from "@/types/type";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import CustomButton from "./CustomButton";
import { formatReservationCardDate } from "@/lib/utils"

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
            const driversCollection = collection(db, "drivers");
                    const q = query(
                      driversCollection, 
                      where("clerkId", "==", ride.driver_id)
                    );
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                      const driverDoc = querySnapshot.docs[0];
                      const driverData = driverDoc.data();
                      
                      setDriverName(
                        driverData.firstName && driverData.lastName
                          ? `${driverData.firstName}`
                          : "Unknown Driver"
                      );
                    }
          } catch (error) {
            console.error("Error fetching driver name:", error);
          }
        }
      };
  
      fetchDriverName();
    }, [ride.driver_id]);

    const { dayOfWeek, monthName, dateNumber } = formatReservationCardDate(ride.scheduled_date);
  
    return (
      <View style={styles.cardContainer}>
        <View style={styles.cardContent}>
          <View style={styles.twoColumnContainer}>
            <View style={styles.dateColumn}>
            <Text style={styles.dayOfWeek}>{dayOfWeek},</Text>
            <Text style={styles.dayOfWeek}>{monthName}</Text>
            <Text style={styles.dateNumber}>{dateNumber}</Text>
            </View>
            <View style={styles.infoColumn}>
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
              <View style={styles.actionButtonsContainer}>
                <CustomButton 
                  title="Reschedule"
                  onPress={onReschedule}
                  bgVariant="primary"
                  style={styles.rescheduleButton}
                />
                <CustomButton 
                  title="Cancel"
                  onPress={onCancel}
                  bgVariant="danger"
                  style={styles.cancelButton}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "white",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginHorizontal: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 15,
  },
  twoColumnContainer: {
    flexDirection: 'row',
  },
  dateColumn: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    paddingRight: 10,
  },
  dayOfWeek: {
    fontSize: 20,
    color: '#666',
    marginBottom: 5,
  },
  dateNumber: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#333',
  },
  infoColumn: {
    width: '75%',
    paddingLeft: 15,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 15,
    color: "gray",
  },
  value: {
    fontSize: 14,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  detailsContainer: {
    marginBottom: 15,
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rescheduleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 5,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginLeft: 5,
  }
});

export default ReservationCard;