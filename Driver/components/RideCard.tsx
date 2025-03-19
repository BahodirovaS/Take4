import React from "react";
import { Image, Text, View, StyleSheet } from "react-native";
import { icons } from "@/constants";
import { formatDate, formatTime } from "@/lib/utils";
import { Ride } from "@/types/type";

const RideCard: React.FC<{ ride: Ride }> = ({ ride }) => {

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
          <View style={styles.row}>
            <Text style={styles.label}>
              OD
            </Text>
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
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 10,
  },
  cardContent: {
    flex: 1,
    // padding: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 10
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
  infoContainer: {
    marginTop: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    padding: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: "gray",
    marginRight: 10
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
