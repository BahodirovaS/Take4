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
    Image,
} from "react-native";
import { useRouter } from "expo-router";
import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import { useAuth, useUser } from "@clerk/clerk-expo";
import {
    fetchDriverInfo,
    selectProfileImage,
    saveDriverProfile,
    updateDriverStatusOnSignOut,
} from "@/lib/fetch";
import { DriverProfileForm } from "@/types/type"

const DriverInfo = () => {
    const router = useRouter();
    const { user } = useUser();
    const { signOut } = useAuth();

    const [form, setForm] = useState<DriverProfileForm>({
        firstName: "",
        lastName: "",
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
        profilePhotoBase64: "",
    });

    const [driverDocId, setDriverDocId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const loadDriverInfo = async () => {
            if (!user) return;

            setForm((prevForm) => ({
                ...prevForm,
                firstName: user?.firstName || "",
                lastName: user?.lastName || "",
                email: user?.primaryEmailAddress?.emailAddress || "",
            }));

            const { driverData, driverDocId: docId, error } = await fetchDriverInfo(user.id);

            if (error) {
                Alert.alert("Error", "Failed to load driver information.");
                return;
            }

            if (driverData) {
                setDriverDocId(docId);

                setForm({
                    ...driverData,
                    firstName: user?.firstName || driverData.firstName || "",
                    lastName: user?.lastName || driverData.lastName || "",
                    email: user?.primaryEmailAddress?.emailAddress || "",
                });
            }
        };

        loadDriverInfo();
    }, [user]);

    const handleSignOut = async () => {
        try {
            await updateDriverStatusOnSignOut(driverDocId);
            await signOut();
            router.replace("/(auth)/sign-in");
        } catch (error) {
            console.error('Error during sign out:', error);
        }
    };

    const pickImage = async () => {
        setUploading(true);
        const { base64Image, error } = await selectProfileImage();

        if (base64Image) {
            setForm(prevForm => ({
                ...prevForm,
                profilePhotoBase64: base64Image
            }));
        } else if (error && error.message !== 'Permission denied') {
            Alert.alert("Error", "Failed to select image");
        }

        setUploading(false);
    };

    const onSubmit = async () => {
        if (!user) {
            return Alert.alert("Error", "User not found. Please log in again.");
        }

        const {
            firstName, lastName, email, phoneNumber, address, dob, licence,
            vMake, vPlate, vInsurance, carSeats
        } = form;

        if (
            !firstName ||
            !lastName ||
            !email ||
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

        const { success, newDocId, error } = await saveDriverProfile(user.id, form, driverDocId);

        if (success) {
            if (newDocId && !driverDocId) {
                setDriverDocId(newDocId);
            }
            Alert.alert("Success", "Information updated successfully.");
        } else {
            Alert.alert("Error", "An error occurred. Please try again.");
        }
    };

    const formatPhoneNumber = (value: string) => {
        let formattedValue = value.replace(/\D/g, '');
        if (formattedValue.length > 3 && formattedValue.length <= 6) {
            formattedValue = `${formattedValue.slice(0, 3)}-${formattedValue.slice(3)}`;
        } else if (formattedValue.length > 6) {
            formattedValue = `${formattedValue.slice(0, 3)}-${formattedValue.slice(3, 6)}-${formattedValue.slice(6, 10)}`;
        }
        return formattedValue;
    };

    const carSeatOptions = [
        { label: "Standard - 4 seats", value: 4 },
        { label: "Comfort - 6 seats", value: 6 },
        { label: "XL - 7 seats", value: 7 }
    ];

    const profileImageSource = form.profilePhotoBase64
        ? { uri: `data:image/jpeg;base64,${form.profilePhotoBase64}` }
        : { uri: user?.externalAccounts[0]?.imageUrl ?? user?.imageUrl };

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
                        My Cabbage Profile
                    </Text>
                    <View style={styles.profileImageContainer}>
                        <TouchableOpacity onPress={pickImage} disabled={uploading}>
                            <Image
                                source={profileImageSource}
                                style={styles.profileImage}
                            />
                            <View style={styles.editIconContainer}>
                                <Text style={styles.editIcon}>📷</Text>
                            </View>
                            {uploading && (
                                <View style={styles.uploadingOverlay}>
                                    <Text style={styles.uploadingText}>Processing...</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.tapToChangeText}>Tap to change photo</Text>
                    </View>

                    <View style={styles.infoContainer}>
                        <View style={styles.infoContent}>
                            <InputField
                                label="First Name"
                                value={form.firstName}
                                onChangeText={(value) => setForm({ ...form, firstName: value })}
                                editable={false}
                            />
                            <InputField
                                label="Last Name"
                                value={form.lastName}
                                onChangeText={(value) => setForm({ ...form, lastName: value })}
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
                                onChangeText={(value) => setForm({
                                    ...form,
                                    phoneNumber: formatPhoneNumber(value)
                                })}
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
                                <CustomButton
                                    title={form.pets ? 'Yes' : 'No'}
                                    onPress={() => setForm({ ...form, pets: !form.pets })}
                                    bgVariant={form.pets ? "primary" : "danger"}
                                    style={styles.petsButton}
                                />
                            </View>
                            <CustomButton title="Update Profile" onPress={onSubmit} style={styles.updateButton} />
                        </View>
                    </View>
                    <CustomButton
                        title="Log Out"
                        onPress={handleSignOut}
                        bgVariant="danger"
                        style={styles.signOutButton}
                    />
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
    },
    scrollViewContent: {
        paddingBottom: 150,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 30,
        fontFamily: "DMSans-Bold",
        marginBottom: 20,
        marginTop: 30,
        alignSelf: "center",
    },
    profileImageContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 20,
    },
    profileImage: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 3,
        borderColor: "white",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
    },
    editIcon: {
        fontSize: 16,
    },
    infoContainer: {
        backgroundColor: "white",
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    infoContent: {
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 55,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadingText: {
        color: 'white',
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
    },
    tapToChangeText: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
        fontFamily: 'DMSans',
    },
    carSeatsTitle: {
        marginTop: 16,
        marginBottom: 8,
        fontSize: 18,
        fontFamily: "DMSans-SemiBold",
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
        fontFamily: "DMSans-SemiBold",
    },
    carSeatSelected: {
        backgroundColor: "#edc985",
    },
    carSeatUnselected: {
        backgroundColor: "#f3f4f6",
    },
    carSeatTextSelected: {
        color: "black",
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
        fontFamily: "DMSans-SemiBold",
        marginRight: 12,
    },
    petsButton: {
        width: "auto",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 9999,
    },
    updateButton: {
        marginTop: 20,
        marginBottom: 20,
        justifyContent: 'center',
        alignSelf: "center",
        width: "70%"
    },
    signOutButton: {
        marginTop: 30,
        justifyContent: 'center',
        alignSelf: "center",
        width: "70%"
    },
});