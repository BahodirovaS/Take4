import { router, useLocalSearchParams } from "expo-router";
import { FlatList, View, StyleSheet, Text } from "react-native";
import CustomButton from "@/components/CustomButton";
import DriverCard from "@/components/DriverCard";
import RideLayout from "@/components/RideLayout";
import { useDriverStore, useReservationStore } from "@/store";
import { useEffect } from "react";

const ConfirmRide = () => {

    const { reserved } = useLocalSearchParams();
    const { drivers, selectedDriver, setSelectedDriver, fetchDrivers } = useDriverStore();
    const { scheduledDate, scheduledTime } = useReservationStore();

    useEffect(() => {
        fetchDrivers();
    }, []);

    const driversToShow = reserved === "true"
        ? drivers
        : drivers?.filter((driver) => driver.status === true);

    const handleSelectRide = () => {
        if (reserved === "true") {
            router.push("/(root)/reserve-book-ride");
        } else {
            router.push("/(root)/book-ride");
        }
    };


    return (
        <RideLayout title={"Choose a Ride"} snapPoints={["65%", "85%"]}>

            {reserved === "true" && scheduledDate && scheduledTime && (
                <View style={styles.reservationInfo}>
                    <Text style={styles.reservationTitle}>Scheduled Ride</Text>
                    <Text style={styles.reservationText}>
                        {scheduledDate}, {scheduledTime}
                    </Text>
                </View>
            )}
            <FlatList
                data={driversToShow}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item, index }) => (
                    <DriverCard
                        item={item}
                        selected={selectedDriver!}
                        setSelected={() => setSelectedDriver(item.driver_id)}
                    />
                )}
                ListFooterComponent={() => (
                    <View style={styles.footer}>
                        <CustomButton
                            title={reserved === "true" ? "Reserve Ride" : "Select Ride"}
                            onPress={handleSelectRide}
                        />
                    </View>
                )}
            />
        </RideLayout>
    );
};

const styles = StyleSheet.create({
    reservationInfo: {
        backgroundColor: "#E8F5FF",
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        marginHorizontal: 20,
    },
    reservationTitle: {
        fontSize: 16,
        fontFamily: "JakartaSemiBold",
        color: "#0066CC",
        marginBottom: 5,
    },
    reservationText: {
        fontSize: 14,
        fontFamily: "JakartaRegular",
    },
    footer: {
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 40,
    },
});

export default ConfirmRide;
