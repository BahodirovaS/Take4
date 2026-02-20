import { useSignUp } from "@clerk/clerk-expo";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Linking,
} from "react-native";
import { ReactNativeModal } from "react-native-modal";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fetchAPI } from "@/lib/fetch";

import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import OAuth from "@/components/OAuth";
import { icons, images } from "@/constants";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_ENDPOINTS } from "@/lib/config";

const SignUp = () => {
    const { isLoaded, signUp, setActive } = useSignUp();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showStripeOnboardingModal, setShowStripeOnboardingModal] = useState(false);
    const [stripeOnboardingUrl, setStripeOnboardingUrl] = useState("");

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

    const createStripeOnboardingLink = async (userId: string) => {
        try {
            const response = await fetchAPI(API_ENDPOINTS.ONBOARD_DRIVER, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    driver_id: userId,
                    email: form.email,
                }),
            });

            if (response?.success && response?.url) return response.url;

            throw new Error(response?.error || "Failed to create onboarding link");
        } catch (error) {
            console.error("Error creating Stripe onboarding:", error);
            return null;
        }
    };

    const onPressVerify = async () => {
        if (!isLoaded) return;
        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code: verification.code,
            });
            if (completeSignUp.status === "complete") {
                try {
                    const userId = completeSignUp.createdUserId;

                    if (!userId) {
                        throw new Error("Failed to get user ID from signup");
                    }

                    // Create driver record in Firestore
                    await addDoc(collection(db, "drivers"), {
                        firstName: form.firstName,
                        lastName: form.lastName,
                        email: form.email,
                        clerkId: userId,
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
                        createdAt: new Date(),
                        // Stripe Connect fields
                        stripe_connect_account_id: null,
                        onboarding_completed: false,
                    });

                    // Create user record for reference
                    await addDoc(collection(db, "users"), {
                        firstName: form.firstName,
                        lastName: form.lastName,
                        email: form.email,
                        clerkId: userId,
                        isDriver: true,
                        createdAt: new Date()
                    });

                    // Create Stripe Connect onboarding link
                    const onboardingUrl = await createStripeOnboardingLink(userId);

                    if (onboardingUrl) {
                        setStripeOnboardingUrl(onboardingUrl);
                    }

                    await setActive({ session: completeSignUp.createdSessionId });
                    setVerification({
                        ...verification,
                        state: "success",
                    });
                } catch (firestoreErr) {
                    console.error("Firestore error:", firestoreErr);
                    Alert.alert("Error", "Failed to create driver account. Please try again.");
                    setVerification({
                        ...verification,
                        error: "Failed to create driver account",
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

    const handleStripeOnboarding = () => {
        if (stripeOnboardingUrl) {
            Linking.openURL(stripeOnboardingUrl);
            setShowStripeOnboardingModal(false);
            setShowSuccessModal(false);
            router.push(`/(root)/(tabs)/home`);
        }
    };

    const skipStripeOnboarding = () => {
        setShowStripeOnboardingModal(false);
        setShowSuccessModal(false);
        router.push(`/(root)/(tabs)/home`);
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
                            <Text style={styles.headerTitle}>Cabbage Driver</Text>
                        </View>
                        <View style={styles.createContainer}>
                            <Text style={styles.createText}>Create Your Account</Text>
                        </View>
                        <View style={styles.formContainer}>
                            <InputField
                                label="First Name"
                                icon={icons.person}
                                value={form.firstName}
                                onChangeText={(value) => setForm({ ...form, firstName: value })}
                            />
                            <InputField
                                label="Last Name"
                                icon={icons.person}
                                value={form.lastName}
                                onChangeText={(value) => setForm({ ...form, lastName: value })}
                            />
                            <InputField
                                label="Email"
                                icon={icons.email}
                                textContentType="emailAddress"
                                value={form.email}
                                onChangeText={(value) => setForm({ ...form, email: value })}
                            />
                            <InputField
                                label="Password"
                                icon={icons.lock}
                                secureTextEntry={true}
                                textContentType="password"
                                value={form.password}
                                onChangeText={(value) => setForm({ ...form, password: value })}
                            />
                            <CustomButton
                                title="Sign Up"
                                onPress={onSignUpPress}
                                style={styles.signUpButton}
                            />
                            <OAuth />
                            <Link href="/sign-in" style={styles.linkText}>
                                Already have an account? <Text style={styles.linkHighlight}>Log In</Text>
                            </Link>
                        </View>

                        {/* Email Verification Modal */}
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

                        {/* Success Modal */}
                        <ReactNativeModal
                            isVisible={showSuccessModal}
                            onModalHide={() => {
                                if (stripeOnboardingUrl) {
                                    setShowStripeOnboardingModal(true);
                                }
                            }}
                        >
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
                                    title="Continue"
                                    onPress={() => {
                                        setShowSuccessModal(false);
                                        router.replace("/(root)/(tabs)/home");

                                    }}
                                    style={styles.browseButton}
                                />
                            </View>
                        </ReactNativeModal>

                        {/* Stripe Onboarding Modal */}
                        <ReactNativeModal isVisible={showStripeOnboardingModal}>
                            <View style={styles.modalContainer}>
                                <Image
                                    source={images.icon}
                                    style={styles.stripeIcon}
                                />
                                <Text style={styles.stripeTitle}>Set Up Your Payments</Text>
                                <Text style={styles.stripeDescription}>
                                    To receive payments from rides, you'll need to set up your bank account through Stripe. This is secure and takes just a few minutes.
                                </Text>
                                <View style={styles.stripeButtons}>
                                    <CustomButton
                                        title="Set Up Now"
                                        onPress={handleStripeOnboarding}
                                        style={styles.setupButton}
                                    />
                                    <CustomButton
                                        title="Skip for Now"
                                        onPress={skipStripeOnboarding}
                                        bgVariant="outline"
                                        style={styles.skipButton}
                                    />
                                </View>
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
        fontFamily: "DMSans-Medium",
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
        fontFamily: "DMSans-Light",
        color: "black",
        textAlign: "center",
    },
    formContainer: {
        padding: 20,
    },
    signUpButton: {
        marginTop: 24,
        width: "70%",
        alignSelf: "center",
    },
    linkText: {
        fontSize: 18,
        fontFamily: "DMSans-Light",
        textAlign: "center",
        color: "#888",
        marginTop: 20,
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
        fontFamily: "DMSans-ExtraBold",
        fontSize: 24,
        marginBottom: 10,
    },
    modalDescription: {
        fontFamily: "DMSans",
        marginBottom: 20,
    },
    errorText: {
        color: "red",
        fontSize: 14,
        marginTop: 5,
    },
    verifyButton: {
        marginTop: 20,
        backgroundColor: "#3f7564",
    },
    successImage: {
        width: 110,
        height: 110,
        alignSelf: "center",
        marginVertical: 20,
    },
    successTitle: {
        fontFamily: "DMSans-Bold",
        fontSize: 24,
        textAlign: "center",
    },
    successDescription: {
        fontFamily: "DMSans",
        fontSize: 16,
        color: "#888",
        textAlign: "center",
        marginTop: 10,
    },
    browseButton: {
        marginTop: 20,
    },
    stripeIcon: {
        width: 80,
        height: 80,
        alignSelf: "center",
        marginBottom: 20,
    },
    stripeTitle: {
        fontFamily: "DMSans-Bold",
        fontSize: 22,
        textAlign: "center",
        marginBottom: 10,
    },
    stripeDescription: {
        fontFamily: "DMSans",
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginBottom: 30,
        lineHeight: 22,
    },
    stripeButtons: {
        gap: 12,
    },
    setupButton: {
        backgroundColor: "#3f7564",
    },
    skipButton: {
        marginTop: 0,
        backgroundColor: "#3f7564",

    },
});

export default SignUp;