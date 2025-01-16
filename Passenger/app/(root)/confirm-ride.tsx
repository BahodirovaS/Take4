import { router } from "expo-router";
import { FlatList, View, StyleSheet } from "react-native";
import CustomButton from "@/components/CustomButton";
import DriverCard from "@/components/DriverCard";
import RideLayout from "@/components/RideLayout";
import { useDriverStore } from "@/store";
import { useEffect } from "react";

const ConfirmRide = () => {
    const { drivers, selectedDriver, setSelectedDriver, fetchDrivers } = useDriverStore();

    useEffect(() => {
        fetchDrivers();
    }, []);

    const availableDrivers = drivers?.filter((driver) => driver.status === true);

    return (
        <RideLayout title={"Choose a Ride"} snapPoints={["65%", "85%"]}>
            <FlatList
                data={availableDrivers}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item, index }) => (
                    <DriverCard
                        item={item}
                        selected={selectedDriver!}
                        setSelected={() => setSelectedDriver(item.id)}
                    />
                )}
                ListFooterComponent={() => (
                    <View style={styles.footer}>
                        <CustomButton
                            title="Select Ride"
                            onPress={() => router.push("/(root)/book-ride")}
                        />
                    </View>
                )}
            />
        </RideLayout>
    );
};

const styles = StyleSheet.create({
    footer: {
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 10,
    },
});

export default ConfirmRide;
