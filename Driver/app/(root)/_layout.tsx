import { Stack } from "expo-router";

const Layout = () => {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
                name="chat"
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="active-ride"
                options={{ 
                    headerShown: false,
                    headerLeft: () => null,
                    gestureEnabled: false 
                }}
            />
        </Stack>
    );
};

export default Layout;
