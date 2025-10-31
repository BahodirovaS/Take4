import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View, StyleSheet, TouchableOpacity, Image } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, LatLng } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { icons } from "@/constants";
import { useLocationStore } from "@/store";

const directionsAPI = process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY || "";

const isNum = (v: any): v is number => typeof v === "number" && Number.isFinite(v);

const Map = ({
  showLocationButton,
  rideStatus,
  driverLocation
}: {
  showLocationButton?: boolean;
  rideStatus?: string;
  driverLocation?: { latitude: number; longitude: number };
}) => {
  const {
    userLongitude,
    userLatitude,
    destinationLatitude,
    destinationLongitude,
  } = useLocationStore();

  const mapRef = useRef<MapView>(null);
  const [didFit, setDidFit] = useState(false);
  const activeRide = rideStatus === "accepted" || rideStatus === "arrived_at_pickup" || rideStatus === "in_progress";

  const hasUser = isNum(userLatitude) && isNum(userLongitude);
  const hasDest = isNum(destinationLatitude) && isNum(destinationLongitude);
  const hasDriver = rideStatus === "accepted" && driverLocation && isNum(driverLocation.latitude) && isNum(driverLocation.longitude);

  useEffect(() => {
    setDidFit(false);
  }, [userLatitude, userLongitude, destinationLatitude, destinationLongitude, driverLocation, rideStatus]);

  const goToUserLocation = () => {
    if (hasUser && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLatitude as number,
          longitude: userLongitude as number,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        800
      );
    }
  };

  if (!hasUser) {
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
          latitude: userLatitude as number,
          longitude: userLongitude as number,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
        userInterfaceStyle="light"
      >
        {/* <Marker
          key="user"
          coordinate={{ latitude: userLatitude as number, longitude: userLongitude as number }}
          title="Your location"
          tracksViewChanges={false}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={{ width: 28, height: 28 }}>
            <Image source={icons.marker} style={{ width: "100%", height: "100%", resizeMode: "contain" }} />
          </View>
        </Marker> */}

        {hasDest && (
          <Marker
            key="destination"
            coordinate={{ latitude: destinationLatitude as number, longitude: destinationLongitude as number }}
            title="Destination"
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={{ width: 28, height: 28 }}>
              <Image source={icons.pin} style={{ width: "100%", height: "100%", resizeMode: "contain" }} />
            </View>
          </Marker>
        )}

        {/* {hasDriver && (
          <Marker
            key="driver"
            coordinate={{ latitude: driverLocation!.latitude, longitude: driverLocation!.longitude }}
            title="Driver"
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={{ width: 28, height: 28 }}>
              <Image source={icons.marker} style={{ width: "100%", height: "100%", resizeMode: "contain" }} />
            </View>
          </Marker>
        )} */}


        {hasDriver && directionsAPI && (
          <MapViewDirections
            origin={{ latitude: driverLocation!.latitude, longitude: driverLocation!.longitude }}
            destination={{ latitude: userLatitude as number, longitude: userLongitude as number }}
            apikey={directionsAPI}
            strokeColor="#0286FF"
            strokeWidth={2}
            lineDashPattern={[5, 4]}
            mode="DRIVING"
            timePrecision="now"
            onReady={(res) => {
              if (!didFit && mapRef.current) {
                mapRef.current.fitToCoordinates(res.coordinates, {
                  edgePadding: { top: 60, right: 60, bottom: 120, left: 60 },
                  animated: true,
                });
                setDidFit(true);
              }
            }}
          />
        )}

        {(!rideStatus || rideStatus === "arrived_at_pickup" || rideStatus === "in_progress") && hasDest && directionsAPI && (
          <MapViewDirections
            origin={{ latitude: userLatitude as number, longitude: userLongitude as number }}
            destination={{ latitude: destinationLatitude as number, longitude: destinationLongitude as number }}
            apikey={directionsAPI}
            strokeColor="#0286FF"
            strokeWidth={2}
            mode="DRIVING"
            timePrecision="now"
            onReady={(res) => {
              if (!didFit && mapRef.current) {
                mapRef.current.fitToCoordinates(res.coordinates, {
                  edgePadding: { top: 60, right: 60, bottom: 120, left: 60 },
                  animated: true,
                });
                setDidFit(true);
              }
            }}
          />
        )}
      </MapView>

      {showLocationButton && (
        <TouchableOpacity
          style={[styles.button, activeRide && styles.buttonHigh]}
          onPress={goToUserLocation}
        >
          <Image source={icons.to} style={styles.buttonIcon} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", width: "100%", height: "100%" },
  map: { width: "100%", height: "100%", borderRadius: 16 },
  driverMarkerContainer: { width: 50, height: 24 },
  driverMarkerImage: { width: "100%", height: "100%", resizeMode: "contain" },
  button: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "#edc985",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#ffffff",
    zIndex: 10,
    transform: [{ rotate: "315deg" }],
  },
  buttonHigh: {
    top: 16,
  },
  buttonIcon: { width: 20, height: 20 },
});

export default Map;
