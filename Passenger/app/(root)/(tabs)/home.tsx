import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useUser } from '@clerk/clerk-expo';
import { useAuth } from '@clerk/clerk-react';
import { router } from 'expo-router';
import { icons } from '@/constants';

const Home = () => {
    const { user } = useUser();
    const { signOut } = useAuth();

    const handleSignOut = () => {
        signOut();
        router.replace("/(auth)/sign-up");
    };

    return (
        <SafeAreaView>
            <Text>Home</Text>
            <TouchableOpacity
                onPress={handleSignOut}
            >
                <Image source={icons.out} />
            </TouchableOpacity>
        </SafeAreaView>
    )
}

export default Home

const styles = StyleSheet.create({})
