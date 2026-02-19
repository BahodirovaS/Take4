import { useAuth, useUser } from "@clerk/clerk-expo";
import {
    Image,
    ScrollView,
    Text,
    View,
    StyleSheet,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    Alert,
    TouchableOpacity
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InputField from "@/components/InputField";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { useLocationStore } from "@/store";
import CustomButton from "@/components/CustomButton";
import { icons } from "@/constants";
import { ProfileForm } from "@/types/type"
import {
    fetchPassengerProfile,
    updatePassengerProfile,
    takeProfilePhoto,
    getCurrentLocation,
    formatPhoneNumber
} from "@/lib/fetch";

const Profile = () => {
    const { user } = useUser();
    const { signOut } = useAuth();
    const { setUserLocation } = useLocationStore();
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [form, setForm] = useState<ProfileForm>({
        name: "",
        email: "",
        phoneNumber: "",
        profilePhotoBase64: "",
        profilePhotoUrl: "",
    });
    const [passengerDocId, setPassengerDocId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);


    useEffect(() => {
        const setupLocation = async () => {
            const { location, hasPermission: permission } = await getCurrentLocation();
            setHasPermission(permission);
            if (location) {
                setUserLocation(location);
            }
        };
        setupLocation();
    }, []);


    useEffect(() => {
        const loadPassengerProfile = async () => {
            if (!user) return;
            try {
                setForm((prevForm) => ({
                    ...prevForm,
                    name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
                    email: user?.primaryEmailAddress?.emailAddress || "",
                }));
                const { data, docId, error } = await fetchPassengerProfile(user.id);
                if (error) {
                    Alert.alert("Error", "An error occurred while loading passenger information.");
                    return;
                }
                if (docId) {
                    setPassengerDocId(docId);
                }
                if (data) {
                    setForm({
                        name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
                        email: user?.primaryEmailAddress?.emailAddress || "",
                        phoneNumber: data.phoneNumber,
                        profilePhotoBase64: data.profilePhotoBase64,
                        profilePhotoUrl: data.profilePhotoUrl || "",
                    });
                }
            } catch (error) {
                console.error("Error in profile setup:", error);
                Alert.alert("Error", "An error occurred while setting up your profile.");
            }
        };
        loadPassengerProfile();
    }, [user]);

    useEffect(() => {
        const saveClerkPhotoUrlIfMissing = async () => {
            if (!user) return;
            if (!passengerDocId) return;
            if (form.profilePhotoBase64) return;
            if (form.profilePhotoUrl) return;
            const clerkPhotoUrl =
                user?.externalAccounts?.[0]?.imageUrl ?? user?.imageUrl ?? "";

            if (!clerkPhotoUrl) return;
            const res = await updatePassengerProfile(passengerDocId, user.id, {
                profilePhotoUrl: clerkPhotoUrl,
            });
            if (res?.success) {
                setForm((prev) => ({ ...prev, profilePhotoUrl: clerkPhotoUrl }));
            }
        };

        saveClerkPhotoUrlIfMissing();
    }, [user?.id, passengerDocId, form.profilePhotoBase64, form.profilePhotoUrl]);


    const handleSignOut = () => {
        signOut();
        router.replace("/(auth)/sign-up");
    };


    const pickImage = async () => {
        setUploading(true);
        const { base64Image, error } = await takeProfilePhoto();
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
        const { phoneNumber, profilePhotoBase64 } = form;
        if (!phoneNumber) {
            return Alert.alert("Error", "Please enter your phone number.");
        }
        const { success, newDocId, error } = await updatePassengerProfile(
            passengerDocId,
            user.id,
            {
                phoneNumber,
                profilePhotoBase64,
            }
        );
        if (success) {
            if (newDocId) {
                setPassengerDocId(newDocId);
            }
            Alert.alert("Success", "Information updated successfully.");
        } else {
            Alert.alert("Error", "An error occurred. Please try again.");
        }
    };


    const handlePhoneNumberChange = (value: string) => {
        const formattedNumber = formatPhoneNumber(value);
        setForm({ ...form, phoneNumber: formattedNumber });
    };


    const profileImageSource =
        form.profilePhotoBase64
            ? { uri: `data:image/jpeg;base64,${form.profilePhotoBase64}` }
            : form.profilePhotoUrl
                ? { uri: form.profilePhotoUrl }
                : { uri: user?.externalAccounts?.[0]?.imageUrl ?? user?.imageUrl };


    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior="padding"
                enabled
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView contentContainerStyle={styles.scrollViewContent}>
                        <Text style={styles.headerText}>My profile</Text>
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
                            <Text style={styles.tapToChangeText}>Tap to take a photo</Text>
                        </View>
                        <View style={styles.infoContainer}>
                            <View style={styles.infoContent}>
                                <InputField
                                    label="First name"
                                    icon={icons.lock}
                                    placeholder={user?.firstName || "Not Found"}
                                    containerStyle={styles.inputContainer}
                                    inputStyle={styles.input}
                                    editable={false}
                                />

                                <InputField
                                    label="Last name"
                                    icon={icons.lock}
                                    placeholder={user?.lastName || "Not Found"}
                                    containerStyle={styles.inputContainer}
                                    inputStyle={styles.input}
                                    editable={false}
                                />

                                <InputField
                                    label="Email"
                                    icon={icons.lock}
                                    placeholder={user?.primaryEmailAddress?.emailAddress || "Not Found"}
                                    containerStyle={styles.inputContainer}
                                    inputStyle={styles.input}
                                    editable={false}
                                />

                                <InputField
                                    label="Phone Number"
                                    placeholder="Format: 123-456-7890"
                                    containerStyle={styles.inputContainer}
                                    inputStyle={styles.input}
                                    editable={true}
                                    value={form.phoneNumber}
                                    onChangeText={handlePhoneNumberChange}
                                />

                                <CustomButton
                                    title="Update Phone Number"
                                    onPress={onSubmit}
                                    bgVariant="primary"
                                    style={styles.updateButton}
                                />
                            </View>
                        </View>
                        <CustomButton
                            title="Log Out"
                            onPress={handleSignOut}
                            bgVariant="danger"
                            style={styles.signOutButton}
                        />
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "white",
    },
    scrollViewContent: {
        paddingBottom: 120,
        paddingHorizontal: 20,
    },
    headerText: {
        fontSize: 30,
        fontFamily: "DMSans-Bold",
        marginBottom: 20,
        alignSelf: "center",
        marginTop: 20,
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
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
    },
    tapToChangeText: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
        fontFamily: 'DMSans',
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
    inputContainer: {
        width: "100%",
    },
    input: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        color: "#289dd2"
    },
    updateButton: {
        paddingVertical: 10,
        marginTop: 20,
    },
    signOutButton: {
        marginTop: 30,
        justifyContent: 'center',
        alignSelf: "center",
        width: "40%"
    },
});

export default Profile;