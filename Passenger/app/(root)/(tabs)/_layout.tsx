import { Tabs } from "expo-router";
import { Image, ImageSourcePropType, View, StyleSheet } from "react-native";

import { icons } from "@/constants";

const TabIcon = ({
    source,
    focused,
}: {
    source: ImageSourcePropType;
    focused: boolean;
}) => (
    <View style={[styles.tabIconContainer]}>
        <View style={[styles.innerCircle, focused && styles.innerCircleFocused]}>
            <Image
                source={source}
                tintColor="white"
                resizeMode="contain"
                style={styles.icon}
            />
        </View>
    </View>
);

export default function Layout() {
    return (
        <Tabs
            initialRouteName="home"
            screenOptions={{
                tabBarActiveTintColor: "white",
                tabBarInactiveTintColor: "white",
                tabBarShowLabel: false,
                tabBarStyle: styles.tabBar,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon source={icons.home} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    title: "Chat",
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon source={icons.chat} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="resos"
                options={{
                    title: "Reservations",
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon source={icons.clock} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon source={icons.profile} focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: "#333333",
        borderRadius: 50,
        paddingBottom: 0, // iOS only
        overflow: "hidden",
        marginHorizontal: 20,
        marginBottom: 20,
        height: 70,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexDirection: "row",
        position: "absolute",
    },
    tabIconContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 50,
        marginBottom:25,
    },
    innerCircle: {
        borderRadius: 50,
        width: 48,
        height: 48,
        justifyContent: "center",
        alignItems: "center",
    },
    innerCircleFocused: {
        backgroundColor: "#6B7280",
    },
    icon: {
        width: 28,
        height: 28,
        marginHorizontal: 8,
    },
});
