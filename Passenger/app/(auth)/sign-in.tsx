import { useSignIn } from "@clerk/clerk-expo";
import { Link, router } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, Text, View, StyleSheet, SafeAreaView } from "react-native";

import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import OAuth from "@/components/OAuth";
import { icons, images } from "@/constants";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

const SignIn = () => {
    const { signIn, setActive, isLoaded } = useSignIn();

    const [form, setForm] = useState({
        email: "",
        password: "",
    });

   const onSignInPress = useCallback(async () => {
  if (!isLoaded) return;

  try {
    const usersQ = query(
      collection(db, "users"),
      where("email", "==", form.email),
      limit(1)
    );

    const snap = await getDocs(usersQ);

    if (!snap.empty) {
      const userData = snap.docs[0].data();
      if (userData.authorize === "google") {
        Alert.alert(
          "Use Google Sign-In",
          "This account was created with Google. Please sign in with Google."
        );
        return;
      }
    }

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
    console.error(error);
    if (error instanceof Error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Error", "An unknown error occurred.");
    }
  }
}, [isLoaded, form.email, form.password]);

    return (
        <SafeAreaView style={styles.safeArea}>

            <ScrollView style={styles.container}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Image source={images.favicon} style={styles.carIcon} />
                        <Text style={styles.headerTitle}>Cabbage</Text>
                    </View>
                    <View style={styles.welcomeContainer}>
                        <Text style={styles.welcomeText}>Welcome Back👋</Text>
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

                        <CustomButton
                            title="Sign In"
                            onPress={onSignInPress}
                            style={styles.button}
                        />

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
        borderRadius: 15,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: "DMSans-SemiBold",
        color: "black",
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
        color: "black",
        fontWeight: "bold",
        fontFamily: "DMSans-Medium",
        textAlign: "center"
    },
    formContainer: {
        padding: 20,
    },
    button: {
        marginTop: 24,
        width: "70%",
        alignSelf: "center",
    },
    link: {
        fontSize: 18,
        textAlign: "center",
        color: "#6B7280",
        marginTop: 40,
    },
    linkText: {
        color: "#289dd2",
    },
});

export default SignIn;
