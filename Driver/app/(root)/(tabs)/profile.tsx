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
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import { useUser } from "@clerk/clerk-expo";

const DriverInfo = () => {
    const router = useRouter();
    const { user } = useUser();

    const [form, setForm] = useState({
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
        profilePhotoBase64: "", // Store base64 image directly
    });

    const [driverDocId, setDriverDocId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchDriverInfo = async () => {
            if (user) {
                try {
                    // Set initial values from user object
                    setForm((prevForm) => ({
                        ...prevForm,
                        firstName: user?.firstName || "",
                        lastName: user?.lastName || "",
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
                            firstName: user?.firstName || driverData.firstName || "",
                            lastName: user?.lastName || driverData.lastName || "",
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
                            profilePhotoBase64: driverData.profilePhotoBase64 || "",
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

    const pickImage = async () => {
        try {
            // Request permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permission Required', 'We need permission to access your photos');
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5, // Reduced quality for smaller size
                base64: true, // Request base64 data directly
            });

            if (!result.canceled) {
                setUploading(true);

                try {
                    let base64Image;

                    // Check if base64 is available directly
                    if (result.assets[0].base64) {
                        base64Image = result.assets[0].base64;
                    } else {
                        // If not available (older versions of expo-image-picker),
                        // read the file and convert to base64
                        const fileUri = result.assets[0].uri;
                        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
                            encoding: FileSystem.EncodingType.Base64,
                        });
                        base64Image = fileContent;
                    }

                    // Optional: Validate image size
                    const imageSizeInBytes = base64Image.length * 0.75; // Approximate size calculation
                    const imageSizeInMB = imageSizeInBytes / (1024 * 1024);

                    if (imageSizeInMB > 1) {
                        Alert.alert(
                            "Image Too Large",
                            "Please select a smaller image (under 1MB)",
                            [{ text: "OK" }]
                        );
                        setUploading(false);
                        return;
                    }

                    // Update form state with the base64 image data
                    setForm(prevForm => ({
                        ...prevForm,
                        profilePhotoBase64: base64Image
                    }));

                } catch (error) {
                    console.error("Error processing image:", error);
                    Alert.alert("Error", "Failed to process image");
                } finally {
                    setUploading(false);
                }
            }
        } catch (error) {
            console.error("Error picking image:", error);
            Alert.alert("Error", "Failed to select image");
            setUploading(false);
        }
    };

    const onSubmit = async () => {
        try {
            if (!user) {
                return Alert.alert("Error", "User not found. Please log in again.");
            }

            const {
                firstName, lastName, email, phoneNumber, address, dob, licence, 
                vMake, vPlate,vInsurance, pets, carSeats, profilePhotoBase64
            } = form;

            if (
                !firstName! ||
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

            const driverData = {
                firstName,
                lastName,
                email,
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
                profilePhotoBase64, // Store base64 image directly in Firestore
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

    // Determine which profile image to use
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
                        My Profile
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
                        <CustomButton
                            title={form.pets ? 'Yes' : 'No'}
                            onPress={() => setForm({ ...form, pets: !form.pets })}
                            bgVariant={form.pets ? "success" : "danger"}
                            style={styles.petsButton}
                        />
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
    },
    scrollViewContent: {
        paddingBottom: 150,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 30,
        fontFamily: "JakartaBold",
        marginBottom: 20,
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
        fontFamily: 'JakartaMedium',
        fontSize: 14,
    },
    tapToChangeText: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
        fontFamily: 'JakartaRegular',
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
        backgroundColor: "#AED6EB",
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
        fontFamily: "JakartaSemiBold",
        marginRight: 12,
    },
    petsButton: {
        width: "auto",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 9999,
    },
    petsButtonSelected: {
        backgroundColor: "#2E7D32", //Green for yes
    },
    petsButtonUnselected: {
        backgroundColor: "#E53935", //Red for no
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