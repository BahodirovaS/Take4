import { useSignIn } from "@clerk/clerk-expo";
import { Link, router } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, Text, View, StyleSheet } from "react-native";

import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import OAuth from "@/components/OAuth";
import { icons, images } from "@/constants";

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
                console.log(JSON.stringify(signInAttempt, null, 2));
                Alert.alert("Error", "Log in failed. Please try again.");
            }
        } catch (error) {
            if (error instanceof Error) {
                console.log(JSON.stringify(error, null, 2));
                Alert.alert("Error", error.message);
            } else {
                Alert.alert("Error", "An unknown error occurred.");
            }
        }
    }, [isLoaded, form]);

    return (
        <ScrollView style={styles.container}>
            <View style={styles.container}>
                <View style={styles.imageContainer}>
                    <Image source={images.signUpCar} style={styles.image} />
                    <Text style={styles.welcomeText}>Welcome Back 👋</Text>
                </View>

                <View style={styles.formContainer}>
                    <InputField
                        label="Email"
                        placeholder="Enter email"
                        icon={icons.email}
                        textContentType="emailAddress"
                        value={form.email}
                        onChangeText={(value) => setForm({ ...form, email: value })}
                    />

                    <InputField
                        label="Password"
                        placeholder="Enter password"
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
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "white",
    },
    imageContainer: {
        position: "relative",
        width: "100%",
        height: 250,
    },
    image: {
        width: "100%",
        height: "100%",
    },
    welcomeText: {
        position: "absolute",
        bottom: 20,
        left: 20,
        fontSize: 24,
        color: "black",
        fontFamily: "JakartaSemiBold",
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
        color: "#6B7280", // Tailwind text-gray-500 equivalent
        marginTop: 40,
    },
    linkText: {
        color: "#3B82F6", // Tailwind text-blue-500 equivalent
    },
});

export default SignIn;
