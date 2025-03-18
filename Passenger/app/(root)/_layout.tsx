import { Stack } from "expo-router";

const Layout = () => {
    return (
        <Stack>
            <Stack.Screen
                name="(tabs)"
                options={{
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="find-ride"
                options={{
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="confirm-ride"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="book-ride"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="chat"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="ride-requested"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="ride-confirmed"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="reserve-ride"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="reserve-book-ride"
                options={{
                    headerShown: false,
                }}
            />
            
        </Stack>
    );
};

export default Layout;
