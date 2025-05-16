import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View, StyleSheet, TouchableOpacity, Text, Image } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, LatLng } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { icons } from "@/constants";
import { useLocationStore } from "@/store";

const directionsAPI = process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY;

const DriverMap = ({ showLocationButton }: { showLocationButton?: boolean }) => {
  const {
    userLongitude,
    userLatitude,
    destinationLatitude,
    destinationLongitude,
  } = useLocationStore();
  const mapRef = useRef<MapView>(null);
  const [mapCentered, setMapCentered] = useState(false);
  const coordinates: LatLng[] = [
    {
      latitude: userLatitude!,
      longitude: userLongitude!,
    },
  ];

  if (destinationLatitude && destinationLongitude) {
    coordinates.push({
      latitude: destinationLatitude,
      longitude: destinationLongitude,
    });
  }

  useEffect(() => {
    if (coordinates.length > 1 && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 20, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
        setMapCentered(true);
      }, 500);
    }
  }, [userLatitude, userLongitude, destinationLatitude, destinationLongitude]);

  const goToUserLocation = () => {
    if (userLatitude && userLongitude && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLatitude,
          longitude: userLongitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        },
        1000 // Animation duration in ms
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
        <Marker
          key="driver"
          coordinate={{
            latitude: userLatitude!,
            longitude: userLongitude!,
          }}
          title="Your location"
          image={icons.marker}
        />

        {destinationLatitude && destinationLongitude && (
          <>
            <Marker
              key="destination"
              coordinate={{
                latitude: destinationLatitude,
                longitude: destinationLongitude,
              }}
              title="Destination"
              image={icons.pin}
            />
            <MapViewDirections
              origin={{
                latitude: userLatitude!,
                longitude: userLongitude!,
              }}
              destination={{
                latitude: destinationLatitude,
                longitude: destinationLongitude!,
              }}
              apikey={directionsAPI!}
              strokeColor="#0286FF"
              strokeWidth={2}
            />
          </>
        )}
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
    backgroundColor: "#7bc1ea",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 50,
    zIndex: 10,
    transform: [{ rotate: "315deg" }]
  },
  buttonIcon: {
    width: 20,
    height: 20,
  },
});

export default DriverMap;
