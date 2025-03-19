import { useUser } from "@clerk/clerk-expo";
import { Image, ScrollView, Text, View, StyleSheet, Button, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InputField from "@/components/InputField";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const Profile = () => {
    const { user } = useUser();

    const [form, setForm] = useState({
        name: "",
        email: "",
        phoneNumber: "",
    });
    
    const [passengerDocId, setPassengerDocId] = useState<string | null>(null);

    useEffect(() => {
        const fetchPassengerInfo = async () => {
            if (user) {
                try {
                    // Set initial values from user object
                    setForm((prevForm) => ({
                        ...prevForm,
                        name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
                        email: user?.primaryEmailAddress?.emailAddress || "",
                    }));

                    // Query Firestore to get user info
                    const usersRef = collection(db, "passengers");
                    const q = query(usersRef, where("clerkId", "==", user.id));
                    const querySnapshot = await getDocs(q);
                    
                    if (!querySnapshot.empty) {
                        // User info found
                        const userDoc = querySnapshot.docs[0];
                        const userData = userDoc.data();
                        
                        setPassengerDocId(userDoc.id);
                        
                        setForm({
                            name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
                            email: user?.primaryEmailAddress?.emailAddress || "",
                            phoneNumber: userData.phoneNumber || "",
                        });
                    } else {
                        // No user info found - create a new user document
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

    const onSubmit = async () => {
        try {
            if (!user) {
                return Alert.alert("Error", "User not found. Please log in again.");
            }

            const { phoneNumber } = form;

            if (!phoneNumber) {
                return Alert.alert("Error", "Please enter your phone number.");
            }

            const passengerData = {
                phoneNumber
            }

            if (passengerDocId) {
                // update existing document
                await updateDoc(doc(db, "passengers", passengerDocId), passengerData);
            } else {
                // Create new document
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
                            <Image
                                source={{
                                    uri: user?.externalAccounts[0]?.imageUrl ?? user?.imageUrl,
                                }}
                                style={styles.profileImage}
                            />
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

                        <View style={styles.updateButtonContainer}>
                            <Button title="Update Phone Number" onPress={onSubmit} />
                        </View>
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
        fontSize: 24,
        fontFamily: "JakartaBold",
        marginVertical: 20,
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
    },
    updateButtonContainer: {
        marginTop: 20,
    },
});

export default Profile;