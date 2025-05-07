import React, { useEffect, useState } from "react";
import { View, Image, StyleSheet } from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { icons } from "@/constants";
import { GoogleInputProps } from "@/types/type";

const googlePlacesApiKey = process.env.EXPO_PUBLIC_PLACES_API_KEY;

const GoogleTextInput = ({
  icon,
  initialLocation,
  containerStyle,
  textInputBackgroundColor,
  handlePress,
}: GoogleInputProps) => {
  // Add state to control rendering
  const [isReady, setIsReady] = useState(false);
  
  // Delay rendering to ensure proper initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <View style={[styles.container, containerStyle]} />;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <GooglePlacesAutocomplete
        fetchDetails={true}
        placeholder="Search"
        debounce={200}
        enablePoweredByContainer={false}
        minLength={2}
        predefinedPlaces={[]}
        keyboardShouldPersistTaps="always"
        styles={{
          textInputContainer: {
            ...styles.textInputContainer,
          },
          textInput: {
            ...styles.textInput,
            backgroundColor: textInputBackgroundColor || "white",
          },
          listView: {
            ...styles.listView,
            backgroundColor: textInputBackgroundColor || "white",
            zIndex: 9999,
          },
          row: {
            backgroundColor: textInputBackgroundColor || "white",
            padding: 13,
            height: 44,
            flexDirection: 'row',
          },
          separator: {
            height: 0.5,
            backgroundColor: '#c8c7cc',
          },
        }}
        onPress={(data, details = null) => {
          if (details && details.geometry && details.geometry.location) {
            handlePress({
              latitude: details.geometry.location.lat,
              longitude: details.geometry.location.lng,
              address: data.description,
            });
          }
        }}
        query={{
          key: googlePlacesApiKey,
          language: "en",
          types: "",
        }}
        renderLeftButton={() => (
          <View style={styles.iconContainer}>
            <Image
              source={icon || icons.search}
              style={styles.icon}
              resizeMode="contain"
            />
          </View>
        )}
        textInputProps={{
          placeholderTextColor: "gray",
          placeholder: initialLocation ?? "Where do you want to go?",
          autoCorrect: false,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    borderRadius: 20,
    minHeight: 50,
  },
  textInputContainer: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    marginHorizontal: 20,
    shadowColor: "#d4d4d4",
  },
  textInput: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 5,
    width: "100%",
    borderRadius: 200,
    height: 40,
  },
  listView: {
    position: "relative",
    top: 0,
    width: "100%",
    borderRadius: 10,
    shadowColor: "#d4d4d4",
    zIndex: 9999,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 24,
    height: 24,
    marginRight: 10,
  },
  icon: {
    width: 24,
    height: 24,
  },
});

export default GoogleTextInput;