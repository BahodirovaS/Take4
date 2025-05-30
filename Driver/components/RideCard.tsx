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
                <Text style={styles.text} numberOfLines={2}>
                  {ride.origin_address}
                </Text>
              </View>
              <View style={styles.row}>
                <Image source={icons.point} style={styles.icon} />
                <Text style={styles.text} numberOfLines={2}>
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
    marginTop: 7,
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
    fontFamily: "DMSans-Medium",
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
    fontFamily: "DMSans-Medium",
    marginRight: 10,
    width: 60,
  },
  value: {
    fontSize: 14,
    fontFamily: "DMSans-Medium",
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
