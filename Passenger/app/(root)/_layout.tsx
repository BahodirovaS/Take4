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
            {/* <Stack.Screen
                name="reservations"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="confirm-reservation"
                options={{
                    headerShown: false,
                }}
            /> */}
        </Stack>
    );
};

export default Layout;
