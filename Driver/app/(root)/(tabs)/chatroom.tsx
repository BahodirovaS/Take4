import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { router } from "expo-router";
import { icons } from '@/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

const Chatroom = () => {

    const handleSignOut = () => {
        router.replace("/(root)/chat");
    };

    return (
        <SafeAreaView>
            <TouchableOpacity
                onPress={handleSignOut}
            >
                <Image source={icons.out} style={styles.signOutIcon} />
                </TouchableOpacity>
        </SafeAreaView>
    )
}

export default Chatroom

const styles = StyleSheet.create({
    signOutIcon: {
        width: 36,
        height: 36,
    },
})
