import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    View,
    Alert,
    Text,
    SafeAreaView,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, addDoc, doc, updateDoc, setDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import { useUser } from "@clerk/clerk-expo";

const DriverInfo = () => {
    const router = useRouter();
    const { user } = useUser();

    const [form, setForm] = useState({
        name: "",
        email: "",
        phoneNumber: "",
        address: "",
        dob: "",
        licence: "",
        vMake: "",
        vPlate: "",
        vInsurance: "",
        pets: false,
        carSeats: 4,
        status: false,
    });

    const [driverDocId, setDriverDocId] = useState<string | null>(null);

    useEffect(() => {
        const fetchDriverInfo = async () => {
            if (user) {
                try {
                    // Set initial values from user object
                    setForm((prevForm) => ({
                        ...prevForm,
                        name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
                        email: user?.primaryEmailAddress?.emailAddress || "",
                    }));

                    // Query Firestore to get driver info
                    const driversRef = collection(db, "drivers");
                    const q = query(driversRef, where("clerkId", "==", user.id));
                    const querySnapshot = await getDocs(q);
                    
                    if (!querySnapshot.empty) {
                        // Driver info found
                        const driverDoc = querySnapshot.docs[0];
                        const driverData = driverDoc.data();
                        
                        setDriverDocId(driverDoc.id);
                        
                        setForm({
                            name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
                            email: user?.primaryEmailAddress?.emailAddress || "",
                            phoneNumber: driverData.phoneNumber || "",
                            address: driverData.address || "",
                            dob: driverData.dob || "",
                            licence: driverData.licence || "",
                            vMake: driverData.vMake || "",
                            vPlate: driverData.vPlate || "",
                            vInsurance: driverData.vInsurance || "",
                            pets: driverData.pets || false,
                            carSeats: driverData.carSeats || 4,
                            status: driverData.status || false,
                        });
                    }
                    // If no document found, no alert needed - this is normal for new drivers
                } catch (error) {
                    console.error("Error fetching driver info:", error);
                    // Only show alert if we attempted to load an existing document but failed
                    const driversRef = collection(db, "drivers");
                    const q = query(driversRef, where("clerkId", "==", user.id));
                    try {
                        const countSnapshot = await getDocs(q);
                        if (!countSnapshot.empty) {
                            Alert.alert("Error", "Failed to load driver information.");
                        }
                    } catch (countError) {
                        console.error("Error checking if driver exists:", countError);
                        Alert.alert("Error", "Failed to load driver information.");
                    }
                }
            }
        };

        fetchDriverInfo();
    }, [user]);

    const onSubmit = async () => {
        try {
            if (!user) {
                return Alert.alert("Error", "User not found. Please log in again.");
            }

            const { phoneNumber, address, dob, licence, vMake, vPlate, vInsurance, pets, carSeats } = form;

            if (
                !phoneNumber ||
                !address ||
                !dob ||
                !licence ||
                !vMake ||
                !vPlate ||
                !vInsurance ||
                carSeats === null ||
                carSeats === undefined
            ) {
                return Alert.alert("Error", "Please fill out all required fields.");
            }

            const driverData = {
                phoneNumber,
                address,
                dob,
                licence,
                vMake,
                vPlate,
                vInsurance,
                pets,
                carSeats,
                clerkId: user.id,
                status: false, // Default to offline when creating
                updatedAt: new Date(),
            };

            if (driverDocId) {
                // Update existing document
                await updateDoc(doc(db, "drivers", driverDocId), driverData);
            } else {
                // Create new document
                const docRef = await addDoc(collection(db, "drivers"), {
                    ...driverData,
                    createdAt: new Date()
                });
                setDriverDocId(docRef.id);
            }

            Alert.alert("Success", "Information updated successfully.");
        } catch (err) {
            console.error("Submission Error:", err);
            Alert.alert("Error", "An error occurred. Please try again.");
        }
    };

    const carSeatOptions = [
        { label: "Standard - 4 seats", value: 4 },
        { label: "Comfort - 6 seats", value: 6 },
        { label: "XL - 7 seats", value: 7 }
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoiding}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollViewContent}
                >
                    <Text
                        style={styles.title}>
                        Driver Information
                    </Text>
                    <InputField
                        label="Name"
                        value={form.name}
                        onChangeText={(value) => setForm({ ...form, name: value })}
                        editable={false}
                    />
                    <InputField
                        label="Email"
                        value={form.email}
                        onChangeText={(value) => setForm({ ...form, email: value })}
                        editable={false}
                    />
                    <InputField
                        label="Phone Number"
                        placeholder="Format 123-456-7890"
                        value={form.phoneNumber}
                        onChangeText={(value) => {
                            let formattedValue = value.replace(/\D/g, '');
                            if (formattedValue.length > 3 && formattedValue.length <= 6) {
                                formattedValue = `${formattedValue.slice(0, 3)}-${formattedValue.slice(3)}`;
                            } else if (formattedValue.length > 6) {
                                formattedValue = `${formattedValue.slice(0, 3)}-${formattedValue.slice(3, 6)}-${formattedValue.slice(6, 10)}`;
                            }
                            setForm({ ...form, phoneNumber: formattedValue });
                        }}
                    />
                    <InputField
                        label="Address"
                        placeholder="Enter your address"
                        value={form.address}
                        onChangeText={(value) => setForm({ ...form, address: value })}
                    />
                    <InputField
                        label="Date of Birth"
                        placeholder="YYYY-MM-DD"
                        value={form.dob}
                        onChangeText={(value) => setForm({ ...form, dob: value })}
                    />
                    <InputField
                        label="Driver's License"
                        placeholder="Enter license number"
                        value={form.licence}
                        onChangeText={(value) => setForm({ ...form, licence: value })}
                    />
                    <InputField
                        label="Vehicle Make"
                        placeholder="Enter vehicle make"
                        value={form.vMake}
                        onChangeText={(value) => setForm({ ...form, vMake: value })}
                    />
                    <InputField
                        label="Vehicle Plate"
                        placeholder="Enter license plate number"
                        value={form.vPlate}
                        onChangeText={(value) => setForm({ ...form, vPlate: value })}
                    />
                    <InputField
                        label="Insurance Number"
                        placeholder="Enter insurance number"
                        value={form.vInsurance}
                        onChangeText={(value) => setForm({ ...form, vInsurance: value })}
                    />
                    <Text style={styles.carSeatsTitle}>Car Seats</Text>
                    <View style={styles.carSeatOptions}>
                        {carSeatOptions.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                onPress={() => setForm({ ...form, carSeats: option.value })}
                                style={[styles.carSeatOption, form.carSeats === option.value ? styles.carSeatSelected : styles.carSeatUnselected]}
                            >
                                <Text style={[styles.carSeatText, form.carSeats === option.value ? styles.carSeatTextSelected : styles.carSeatTextUnselected]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.petsContainer}>
                        <Text style={styles.petsLabel}>Will you allow pets?</Text>
                        <TouchableOpacity
                            onPress={() => setForm({ ...form, pets: !form.pets })}
                            style={[styles.petsButton, form.pets ? styles.petsButtonSelected : styles.petsButtonUnselected]}
                        >
                            <Text style={styles.petsButtonText}>{form.pets ? 'Yes' : 'No'}</Text>
                        </TouchableOpacity>
                    </View>
                    <CustomButton title="Update" onPress={onSubmit} style={styles.updateButton} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default DriverInfo;

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "white",
    },
    keyboardAvoiding: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        backgroundColor: "white",
        padding: 20,
    },
    scrollViewContent: {
        paddingBottom: 150,
    },
    title: {
        fontSize: 32,
        fontFamily: "JakartaBold",
        marginBottom: 20,
    },
    carSeatsTitle: {
        marginTop: 16,
        marginBottom: 8,
        fontSize: 18,
        fontFamily: "JakartaSemiBold",
    },
    carSeatOptions: {
        marginBottom: 20,
    },
    carSeatOption: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 9999,
        padding: 12,
        marginBottom: 12,
    },
    carSeatText: {
        fontSize: 14,
        fontFamily: "JakartaSemiBold",
    },
    carSeatSelected: {
        backgroundColor: "#3b82f6",
    },
    carSeatUnselected: {
        backgroundColor: "#f3f4f6",
    },
    carSeatTextSelected: {
        color: "white",
    },
    carSeatTextUnselected: {
        color: "black",
    },
    petsContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    petsLabel: {
        fontSize: 18,
        fontFamily: "JakartaSemiBold",
        marginRight: 12,
    },
    petsButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 9999,
    },
    petsButtonSelected: {
        backgroundColor: "#34D399", //Green for yes
    },
    petsButtonUnselected: {
        backgroundColor: "#F87171", //Red for no
    },
    petsButtonText: {
        fontSize: 16,
        color: "white",
        fontFamily: "JakartaSemiBold",
    },
    updateButton: {
        marginTop: 20,
    },
});