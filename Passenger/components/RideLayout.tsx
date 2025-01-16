import React, { useRef } from "react";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { Image, Text, TouchableOpacity, View, StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import Map from "@/components/Map";
import { icons } from "@/constants";

// Define the props type for the RideLayout component
interface RideLayoutProps {
  title: string;
  snapPoints?: string[];
  children: React.ReactNode;
}

const RideLayout: React.FC<RideLayoutProps> = ({ title, snapPoints, children }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.mainContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <View style={styles.backButton}>
              <Image
                source={icons.backArrow}
                resizeMode="contain"
                style={styles.backArrow}
              />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerText}>
            {title || "Go Back"}
          </Text>
        </View>

        <Map />
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints || ["60%", "85%"]}
        index={0}
      >
        {title === "Choose a Ride" ? (
          <BottomSheetView style={styles.bottomSheetView}>
            {children}
          </BottomSheetView>
        ) : (
          <BottomSheetScrollView style={styles.bottomSheetScrollView}>
            {children}
          </BottomSheetScrollView>
        )}
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
  header: {
    flexDirection: "row",
    position: "absolute",
    zIndex: 10,
    top: 60,
    paddingLeft: 20,
    paddingRight: 20,
  },
  backButton: {
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
  headerText: {
    fontSize: 18,
    fontFamily: "JakartaSemiBold",
    marginLeft: 20,
  },
  bottomSheetView: {
    flex: 1,
    padding: 40,
  },
  bottomSheetScrollView: {
    flex: 1,
    padding: 20,
  },
});

export default RideLayout;
