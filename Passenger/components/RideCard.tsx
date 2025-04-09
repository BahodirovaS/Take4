import React, { useEffect, useState } from "react";
import { Image, Text, View, StyleSheet } from "react-native";
import { icons } from "@/constants";
import { formatDate, formatTime } from "@/lib/utils";
import { Ride } from "@/types/type";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

const RideCard: React.FC<{ ride: Ride }> = ({ ride }) => {

  const [driverName, setDriverName] = useState<string>("Unknown Driver");

  useEffect(() => {
    const fetchDriver = async () => {
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
              ? `${driverData.firstName} ${driverData.lastName}`
              : "Unknown Driver"
          );
        }
      } catch (error) {
        console.error("Error fetching driver:", error);
        setDriverName("Unknown Driver");
      }
    };

    fetchDriver();
  }, [ride.driver_id]);

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardContent}>
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value} numberOfLines={1}>
              {formatDate(ride.created_at)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Driver</Text>
            <Text style={styles.value}>
              {driverName}
            </Text>
          </View>
          <View style={styles.row}>
          <Text style={styles.label}>OD</Text>
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
          {/* <View style={styles.infoRow}>
            <Text style={styles.label}>Payment Status</Text>
            <Text
              style={[
                styles.value,
                ride.payment_status === "paid"
                  ? styles.paymentPaid
                  : styles.paymentUnpaid,
              ]}
            >
              {ride.payment_status}
            </Text>
          </View> */}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
  },
  cardContent: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 10,
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 5,
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },
  infoContainer: {
    backgroundColor: "#f0f0f0",
    borderRadius: 0,
    padding: 10,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: " ",
    marginRight: 10,
    width: 60,
  },
  value: {
    fontSize: 14,
    fontWeight: "bold",
    flex: 1,
    marginLeft: 10,
  },
  paymentPaid: {
    color: "green",
    textTransform: "capitalize",
  },
  paymentUnpaid: {
    color: "red",
    textTransform: "capitalize",
  },
});

export default RideCard;
