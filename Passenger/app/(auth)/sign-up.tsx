import { useSignUp } from "@clerk/clerk-expo";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { ReactNativeModal } from "react-native-modal";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import OAuth from "@/components/OAuth";
import { icons, images } from "@/constants";

const SignUp = () => {
    const { isLoaded, signUp, setActive } = useSignUp();
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
    });
    const [verification, setVerification] = useState({
        state: "default",
        error: "",
        code: "",
    });

    const onSignUpPress = async () => {
        if (!isLoaded) return;
        try {
            await signUp.create({
                emailAddress: form.email,
                password: form.password,
                firstName: form.firstName,
                lastName: form.lastName,
            });
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            setVerification({
                ...verification,
                state: "pending",
            });
        } catch (err) {
            const error = err as { errors: { longMessage: string }[] };
            Alert.alert("Error", error.errors[0].longMessage);
        }
    };

    const onPressVerify = async () => {
        if (!isLoaded) return;
        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code: verification.code,
            });
            if (completeSignUp.status === "complete") {
                // Create a new user record in Firestore instead of calling the API
                try {
                    await addDoc(collection(db, "passengers"), {
                        firstName: form.firstName,
                        lastName: form.lastName,
                        email: form.email,
                        clerkId: completeSignUp.createdUserId,
                        phoneNumber: "",
                        createdAt: new Date()
                    });

                    await addDoc(collection(db, "users"), {
                        firstName: form.firstName,
                        lastName: form.lastName,
                        email: form.email,
                        clerkId: completeSignUp.createdUserId,
                        isDriver: false, // This is a regular user, not a driver
                        createdAt: new Date()
                    });

                    await setActive({ session: completeSignUp.createdSessionId });
                    setVerification({
                        ...verification,
                        state: "success",
                    });
                } catch (firestoreErr) {
                    console.error("Firestore error:", firestoreErr);
                    Alert.alert("Error", "Failed to create user account. Please try again.");
                    setVerification({
                        ...verification,
                        error: "Failed to create user account",
                        state: "failed",
                    });
                }
            } else {
                setVerification({
                    ...verification,
                    error: "Verification failed. Please try again.",
                    state: "failed",
                });
            }
        } catch (err) {
            const error = err as { errors: { longMessage: string }[] };
            setVerification({
                ...verification,
                error: error.errors[0].longMessage,
                state: "failed",
            });
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <SafeAreaView style={styles.safeArea}>

                <ScrollView style={styles.container}>
                    <View style={styles.container}>
                        <View style={styles.header}>
                            <Image source={images.icon} style={styles.carIcon} />
                            <Text style={styles.headerTitle}>RidePal Passenger</Text>
                        </View>
                        <View style={styles.createContainer}>
                            <Text style={styles.createText}>Create Your Account</Text>
                        </View>
                        <View style={styles.formContainer}>
                            <InputField
                                label="First Name"
                                // placeholder="Enter first name"
                                icon={icons.person}
                                value={form.firstName}
                                onChangeText={(value) => setForm({ ...form, firstName: value })}
                            />
                            <InputField
                                label="Last Name"
                                // placeholder="Enter last name"
                                icon={icons.person}
                                value={form.lastName}
                                onChangeText={(value) => setForm({ ...form, lastName: value })}
                            />
                            <InputField
                                label="Email"
                                // placeholder="Enter email"
                                icon={icons.email}
                                textContentType="emailAddress"
                                value={form.email}
                                onChangeText={(value) => setForm({ ...form, email: value })}
                            />
                            <InputField
                                label="Password"
                                // placeholder="Enter password"
                                icon={icons.lock}
                                secureTextEntry={true}
                                textContentType="password"
                                value={form.password}
                                onChangeText={(value) => setForm({ ...form, password: value })}
                            />
                            <CustomButton title="Sign Up" onPress={onSignUpPress} style={styles.signUpButton} />
                            <OAuth />
                            <Link href="/sign-in" style={styles.linkText}>
                                Already have an account? <Text style={styles.linkHighlight}>Log In</Text>
                            </Link>
                        </View>
                        <ReactNativeModal
                            isVisible={verification.state === "pending"}
                            onModalHide={() => {
                                if (verification.state === "success") {
                                    setShowSuccessModal(true);
                                }
                            }}
                        >
                            <View style={styles.modalContainer}>
                                <Text style={styles.modalTitle}>Verification</Text>
                                <Text style={styles.modalDescription}>
                                    We've sent a verification code to {form.email}.
                                </Text>
                                <InputField
                                    label={"Code"}
                                    icon={icons.lock}
                                    placeholder={"12345"}
                                    value={verification.code}
                                    keyboardType="numeric"
                                    onChangeText={(code) =>
                                        setVerification({ ...verification, code })
                                    }
                                />
                                {verification.error && (
                                    <Text style={styles.errorText}>{verification.error}</Text>
                                )}
                                <CustomButton
                                    title="Verify Email"
                                    onPress={onPressVerify}
                                    style={styles.verifyButton}
                                />
                            </View>
                        </ReactNativeModal>
                        <ReactNativeModal isVisible={showSuccessModal}>
                            <View style={styles.modalContainer}>
                                <Image
                                    source={images.check}
                                    style={styles.successImage}
                                />
                                <Text style={styles.successTitle}>Verified</Text>
                                <Text style={styles.successDescription}>
                                    You have successfully verified your account.
                                </Text>
                                <CustomButton
                                    title="Browse Home"
                                    onPress={() => {
                                        setShowSuccessModal(false);
                                        router.push(`/(root)/(tabs)/home`);
                                    }}
                                    style={styles.browseButton}
                                />
                            </View>
                        </ReactNativeModal>
                    </View>
                </ScrollView>
            </SafeAreaView>

        </KeyboardAvoidingView>
    );
};


const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "white",
    },
    container: {
        flex: 1,
        backgroundColor: "white",
    },
    header: {
        flexDirection: "row",
        justifyContent: "flex-start",
        paddingVertical: 10,
        paddingLeft: 20,
        width: "100%",
    },
    carIcon: {
        width: 30,
        height: 30,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: "JakartaSemiBold",
        color: "black",
    },
    createContainer: {
        position: "relative",
        width: "100%",
        height: 90,
    },
    createText: {
        position: "absolute",
        bottom: 20,
        left: 0,
        right: 0,
        fontSize: 35,
        fontFamily: "JakartaSemiBold",
        color: "black",
        textAlign: "center",
    },
    formContainer: {
        padding: 20,
    },
    signUpButton: {
        marginTop: 24,
    },
    linkText: {
        fontSize: 18,
        textAlign: "center",
        color: "#888",
        marginTop: 40,
    },
    linkHighlight: {
        color: "#289dd2",
    },
    modalContainer: {
        backgroundColor: "white",
        padding: 30,
        borderRadius: 20,
        minHeight: 300,
    },
    modalTitle: {
        fontFamily: "JakartaExtraBold",
        fontSize: 24,
        marginBottom: 10,
    },
    modalDescription: {
        fontFamily: "Jakarta",
        marginBottom: 20,
    },
    errorText: {
        color: "red",
        fontSize: 14,
        marginTop: 5,
    },
    verifyButton: {
        marginTop: 20,
        backgroundColor: "#0f0",
    },
    successImage: {
        width: 110,
        height: 110,
        alignSelf: "center",
        marginVertical: 20,
    },
    successTitle: {
        fontFamily: "JakartaBold",
        fontSize: 24,
        textAlign: "center",
    },
    successDescription: {
        fontFamily: "Jakarta",
        fontSize: 16,
        color: "#888",
        textAlign: "center",
        marginTop: 10,
    },
    browseButton: {
        marginTop: 20,
    },
});

export default SignUp;