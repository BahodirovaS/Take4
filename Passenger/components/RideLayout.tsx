import React, { useRef } from "react";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { router, usePathname } from "expo-router";
import { Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import Map from "@/components/Map";
import { icons } from "@/constants";

interface RideLayoutProps {
  title: string;
  snapPoints?: string[];
  children: React.ReactNode;
  rideStatus?: string;
  driverLocation?: {latitude: number, longitude: number};
}

const RideLayout: React.FC<RideLayoutProps> = ({ 
  title, 
  snapPoints, 
  children, 
  rideStatus, 
  driverLocation 
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const pathname = usePathname();

  const defaultSnapPoints = rideStatus === "in_progress" 
  ? ["45%"]
  : ["50%", "60%"]

  const handleBackPress = () => {
    if (pathname.includes('book-ride')) {
      router.push('/(root)/confirm-ride');
    } else if (pathname.includes('confirm-ride')) {
      router.push('/(root)/find-ride');
    } else if (pathname.includes('find-ride')) {
      router.push('/(root)/(tabs)/home');
    } else {
      // Fallback - go to home or use router.back()
      router.push('/(root)/(tabs)/home');
    }
  };
  
  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.mainContainer}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Image source={icons.backArrow} resizeMode="contain" style={styles.backArrow} />
        </TouchableOpacity>
        <Map 
          showLocationButton={true}
          rideStatus={rideStatus}
          driverLocation={driverLocation}
        />
      </View>
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints || defaultSnapPoints}
        index={1}
      >
        <BottomSheetView style={styles.bottomSheetView}>
          <Text style={styles.bottomSheetTitle}>{title}</Text>
          {children}
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    backgroundColor: "white",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    width: 24,
    height: 24,
  },
  bottomSheetView: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontFamily: "DMSans-SemiBold",
    textAlign: "left",
    marginBottom: 20,
    fontWeight: "bold"
  },
});

export default RideLayout;
