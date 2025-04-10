import { useUser } from "@clerk/clerk-expo";
import { Image, ScrollView, Text, View, StyleSheet, Button, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InputField from "@/components/InputField";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";


const Profile = () => {
    const { user } = useUser();

    const [form, setForm] = useState({
        name: "",
        email: "",
        phoneNumber: "",
        profilePhotoBase64: "",
    });

    const [passengerDocId, setPassengerDocId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);


    useEffect(() => {
        const fetchPassengerInfo = async () => {
            if (user) {
                try {

                    setForm((prevForm) => ({
                        ...prevForm,
                        name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
                        email: user?.primaryEmailAddress?.emailAddress || "",
                    }));


                    const usersRef = collection(db, "passengers");
                    const q = query(usersRef, where("clerkId", "==", user.id));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {

                        const userDoc = querySnapshot.docs[0];
                        const userData = userDoc.data();

                        setPassengerDocId(userDoc.id);

                        setForm({
                            name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
                            email: user?.primaryEmailAddress?.emailAddress || "",
                            phoneNumber: userData.phoneNumber || "",
                            profilePhotoBase64: userData.profilePhotoBase64 || "",
                        });
                    } else {

                        try {
                            const newUserRef = await addDoc(collection(db, "users"), {
                                firstName: user?.firstName || "",
                                lastName: user?.lastName || "",
                                email: user?.primaryEmailAddress?.emailAddress || "",
                                clerkId: user.id,
                                phoneNumber: "",
                                isDriver: false,
                                createdAt: new Date()
                            });
                            setPassengerDocId(newUserRef.id);
                        } catch (createError) {
                            console.error("Error creating new passenger document:", createError);
                            Alert.alert("Error", "Failed to set up passenger profile.");
                        }
                    }
                } catch (error) {
                    console.error("Error fetching passenger info:", error);
                    Alert.alert("Error", "An error occurred while loading passenger information.");
                }
            }
        };

        fetchPassengerInfo();
    }, [user]);

    const pickImage = async () => {
        try {

            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permission Required', 'We need permission to access your photos');
                return;
            }


            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled) {
                setUploading(true);

                try {
                    let base64Image;


                    if (result.assets[0].base64) {
                        base64Image = result.assets[0].base64;
                    } else {


                        const fileUri = result.assets[0].uri;
                        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
                            encoding: FileSystem.EncodingType.Base64,
                        });
                        base64Image = fileContent;
                    }


                    const imageSizeInBytes = base64Image.length * 0.75;
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

            const { phoneNumber, profilePhotoBase64 } = form;

            if (!phoneNumber) {
                return Alert.alert("Error", "Please enter your phone number.");
            }

            const passengerData = {
                phoneNumber,
                profilePhotoBase64,
            }

            if (passengerDocId) {

                await updateDoc(doc(db, "passengers", passengerDocId), passengerData);
            } else {

                const docRef = await addDoc(collection(db, "passengers"), {
                    ...passengerData,
                    createdAt: new Date()
                });
                setPassengerDocId(docRef.id);
            }
            Alert.alert("Success", "Information updated successfully.");
        } catch (err) {
            console.error("Submission Error:", err);
            Alert.alert("Error", "An error occurred. Please try again.");
        }
    };

    const profileImageSource = form.profilePhotoBase64
        ? { uri: `data:image/jpeg;base64,${form.profilePhotoBase64}` }
        : { uri: user?.externalAccounts[0]?.imageUrl ?? user?.imageUrl };


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
                            <Text style={styles.tapToChangeText}>Tap to change photo</Text>
                        </View>

                        <View style={styles.infoContainer}>
                            <View style={styles.infoContent}>
                                <InputField
                                    label="First name"
                                    placeholder={user?.firstName || "Not Found"}
                                    containerStyle={styles.inputContainer}
                                    inputStyle={styles.input}
                                    editable={false}
                                />

                                <InputField
                                    label="Last name"
                                    placeholder={user?.lastName || "Not Found"}
                                    containerStyle={styles.inputContainer}
                                    inputStyle={styles.input}
                                    editable={false}
                                />

                                <InputField
                                    label="Email"
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
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.updateButtonContainer, styles.updateButton]}
                            onPress={onSubmit}
                        >
                            <Text style={styles.updateButtonText}>Update Phone Number</Text>
                        </TouchableOpacity>
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
        fontFamily: "JakartaBold",
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
        fontFamily: 'JakartaMedium',
        fontSize: 14,
    },
    tapToChangeText: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
        fontFamily: 'JakartaRegular',
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
    updateButtonContainer: {
        marginVertical: 10,
        alignItems: 'center',
    },
    updateButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    updateButtonText: {
        color: '#289dd2',
        textAlign: 'center',
        fontSize: 18,
    }
});

export default Profile;