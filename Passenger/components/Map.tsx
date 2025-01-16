import React, { useEffect, useRef } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, LatLng } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { icons } from "@/constants";
import { useLocationStore } from "@/store";

const directionsAPI = process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY;

const DriverMap = () => {
  const {
    userLongitude,
    userLatitude,
    destinationLatitude,
    destinationLongitude,
  } = useLocationStore();

  const mapRef = useRef<MapView>(null);

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
      }, 500);
    }
  }, [userLatitude, userLongitude, destinationLatitude, destinationLongitude]);

  if (!userLatitude || !userLongitude) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  return (
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
              longitude: destinationLongitude,
            }}
            apikey={directionsAPI!}
            strokeColor="#0286FF"
            strokeWidth={2}
          />
        </>
      )}
    </MapView>
  );
};

const styles = StyleSheet.create({
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
});

export default DriverMap;
