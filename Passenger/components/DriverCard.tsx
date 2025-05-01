import React from "react";
import { Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { icons } from "@/constants";
import { formatTime } from "@/lib/utils";
import { DriverCardProps } from "@/types/type";
import { useUser } from "@clerk/clerk-expo";
import { useLocationStore } from "@/store";
import { usePriceCalculator } from "@/lib/price";

const DriverCard = ({ item, selected, setSelected }: DriverCardProps) => {
  const roundedMinutes = Math.round(item.time! * 10) / 10;

  const getSeatCategory = (carSeats: number) => {
    const seats = typeof carSeats === 'string' ? parseInt(carSeats) : carSeats;

    switch (seats) {
      case 4:
        return "Standard";
      case 6:
        return "Comfort";
      case 7:
        return "XL";
      default:
        return `${seats} seats`;
    }
  };

  const mileageAPI = process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY!;
  const { user } = useUser();
  const { userLatitude, userLongitude, destinationLatitude, destinationLongitude } = useLocationStore();

  const { price } = usePriceCalculator(
    { latitude: userLatitude!, longitude: userLongitude! },
    { latitude: destinationLatitude!, longitude: destinationLongitude! },
    mileageAPI
  );

  const calculatePrice = (carSeats: number) => {
    const seatCategory = getSeatCategory(carSeats);
    if (seatCategory === "Comfort") {
      return price * 1.2;
    }
    if (seatCategory === "XL") {
      return price * 1.5;
    }
    return price;
  };

  const adjustedPrice = calculatePrice(item.car_seats);

  return (
    <TouchableOpacity
      onPress={() => {
        setSelected();
      }} style={[styles.card, selected === item.clerk_id && styles.selectedCard]}
    >
      <View style={styles.cardContent}>
        <View style={styles.seatCategoryContainer}>
          <Text style={styles.seatCategoryText}>
            {getSeatCategory(item.car_seats)}
          </Text>
        </View>

        <View style={styles.priceTimeContainer}>
          <View style={styles.priceContainer}>
            <Image source={icons.dollar} style={styles.dollarIcon} />
            <Text style={styles.priceText}>{adjustedPrice.toFixed(2)}</Text>
          </View>

          <Text style={styles.separator}>|</Text>

          <Text style={styles.seatText}>{item.car_seats} seats</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "white",
  },
  selectedCard: {
    backgroundColor: "#D9E4FF",
  },
  cardContent: {
    flex: 1,
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    marginHorizontal: 12,
  },
  seatCategoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 5,
  },
  seatCategoryText: {
    fontSize: 18,
    fontFamily: "DMSans",
  },
  priceTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dollarIcon: {
    width: 16,
    height: 16,
  },
  priceText: {
    fontSize: 14,
    fontFamily: "DMSans",
    marginLeft: 4,
  },
  separator: {
    fontSize: 14,
    fontFamily: "DMSans",
    color: "#6B6B6B",
    marginHorizontal: 4,
  },
  timeText: {
    fontSize: 14,
    fontFamily: "DMSans",
    color: "#6B6B6B",
  },
  seatText: {
    fontSize: 14,
    fontFamily: "DMSans",
    color: "#6B6B6B",
  },
});

export default DriverCard;
