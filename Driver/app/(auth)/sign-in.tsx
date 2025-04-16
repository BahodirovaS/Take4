import { useSignIn } from "@clerk/clerk-expo";
import { Link, router } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, Text, View, StyleSheet } from "react-native";

import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import OAuth from "@/components/OAuth";
import { icons, images } from "@/constants";
import { SafeAreaView } from "react-native-safe-area-context";


const SignIn = () => {
    const { signIn, setActive, isLoaded } = useSignIn();

    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const onSignInPress = useCallback(async () => {
        if (!isLoaded) return;

        try {
            const signInAttempt = await signIn.create({
                identifier: form.email,
                password: form.password,
            });

            if (signInAttempt.status === "complete") {
                await setActive({ session: signInAttempt.createdSessionId });
                router.replace("/(root)/(tabs)/home");
            } else {
                Alert.alert("Error", "Log in failed. Please try again.");
            }
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert("Error", error.message);
            } else {
                Alert.alert("Error", "An unknown error occurred.");
            }
        }
    }, [isLoaded, form]);

    return (
        <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Image source={images.icon} style={styles.carIcon} />
                    <Text style={styles.headerTitle}>RidePal Driver</Text>
                </View>
                <View style={styles.welcomeContainer}>
                    <Text style={styles.welcomeText}>Welcome Back 👋</Text>
                </View>

                <View style={styles.formContainer}>
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

                    <CustomButton title="Sign In" onPress={onSignInPress} style={styles.button} />

                    <OAuth />

                    <Link href="/sign-up" style={styles.link}>
                        Don't have an account? <Text style={styles.linkText}>Sign Up</Text>
                    </Link>
                </View>
            </View>
        </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#365b6d",
    },
    container: {
        flex: 1,
        backgroundColor: "transparent",
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
        fontFamily: "DMSans-SemiBold",
        color: "white",
    },
    welcomeContainer: {
        position: "relative",
        width: "100%",
        height: 150,
    },
    image: {
        width: "100%",
        height: "100%",
    },
    welcomeText: {
        position: "absolute",
        bottom: 20,
        left: 0,
        right: 0,
        fontSize: 40,
        color: "white",
        fontWeight: "bold",
        fontFamily: "DMSans--Medium",
        textAlign: "center"
    },
    formContainer: {
        padding: 20,
    },
    button: {
        marginTop: 24,
    },
    link: {
        fontSize: 18,
        textAlign: "center",
        color: "white",
        marginTop: 40,
    },
    linkText: {
        color: "#289dd2",
    },
});

export default SignIn;
