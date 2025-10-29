import React, { useRef } from "react";
import { ActivityIndicator, View, StyleSheet, TouchableOpacity, Image } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { icons } from "@/constants";
import { useLocationStore } from "@/store";

const HomeMap = ({ showLocationButton }: { showLocationButton?: boolean }) => {
  const {
    userLongitude,
    userLatitude,
  } = useLocationStore();
  const mapRef = useRef<MapView>(null);

  const goToUserLocation = () => {
    if (userLatitude && userLongitude && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLatitude,
          longitude: userLongitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        },
        1000
      );
    }
  };

  if (!userLatitude || !userLongitude) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        tintColor="black"
        mapType="mutedStandard"
        showsPointsOfInterest={false}
        initialRegion={{
          latitude: userLatitude || 37.78825,
          longitude: userLongitude || -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        userInterfaceStyle="light"
      >
        {/* <Marker
          key="user"
          coordinate={{
            latitude: userLatitude!,
            longitude: userLongitude!,
          }}
          title="Your location"
          image={icons.marker}
        /> */}
      </MapView>

      {showLocationButton && (
        <TouchableOpacity style={styles.button} onPress={goToUserLocation}>
          <Image source={icons.to} style={styles.buttonIcon} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  map: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  button: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#edc985",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#fffff",
    zIndex: 10,
    transform: [{ rotate: "315deg" }]
  },
  buttonIcon: {
    width: 20,
    height: 20,
  },
});

export default HomeMap;