import { useOAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { Alert, Image, Text, View, StyleSheet, Platform } from "react-native";

import CustomButton from "@/components/CustomButton";
import { icons } from "@/constants";
import { googleOAuth } from "@/lib/auth";

const OAuth = () => {
  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({
    strategy: "oauth_google",
  });

  const { startOAuthFlow: startAppleOAuthFlow } = useOAuth({
    strategy: "oauth_apple",
  });

  const handleOAuthSignIn = async (startOAuthFlow: any) => {
    const result = await googleOAuth(startOAuthFlow);

    if (result.code === "cancelled") return;

    if (result.code === "session_exists" || result.success) {
      router.replace("/(root)/(tabs)/home");
      return;
    }

    Alert.alert("Error", result.message);
  };

  return (
    <View>
      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>Or</Text>
        <View style={styles.divider} />
      </View>

      <CustomButton
        title="Sign In with Google"
        style={styles.googleButton}
        IconLeft={() => (
          <Image
            source={icons.google}
            resizeMode="contain"
            style={styles.googleIcon}
          />
        )}
        bgVariant="outline"
        textVariant="primary"
        onPress={() => handleOAuthSignIn(startGoogleOAuthFlow)}
      />

      {Platform.OS === "ios" && (
        <CustomButton
          title="Sign In with Apple"
          style={styles.appleButton}
           IconLeft={() => (
          <Image
            source={icons.apple}
            resizeMode="contain"
            style={styles.googleIcon}
          />
        )}
          bgVariant="outline"
          textVariant="primary"
          onPress={() => handleOAuthSignIn(startAppleOAuthFlow)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dividerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    fontSize: 18,
    color: "#000000",
  },
  googleButton: {
    marginTop: 20,
    width: "70%",
    alignSelf: "center",
  },
  appleButton: {
    marginTop: 12,
    width: "70%",
    alignSelf: "center",
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginHorizontal: 8,
  },
});

export default OAuth;