import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { images } from '@/constants'

const SignIn = () => {
    return (
        <ScrollView style={styles.container}>
            <View style={styles.innerContainer}>
                <View style={styles.welcomeContainer}>
                    <Text style={styles.welcomeText}>Welcome 👋</Text>
                </View>
            </View>
        </ScrollView>
    )
}

export default SignIn

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    innerContainer: {
        flex: 1,
        backgroundColor: 'white',
    },
    welcomeContainer: {
        position: 'relative',
        width: '100%',
        height: 250,
    },
    image: {
        zIndex: 0,
        width: '100%',
        height: 250,
    },
    welcomeText: {
        fontSize: 54,
        color: 'black',
        fontFamily: 'JakartaSemiBold',
        position: 'absolute',
        bottom: 5,
        left: 5,
    },
    formContainer: {
        padding: 20,
    },
    button: {
        marginTop: 24,
    },
    signUpLink: {
        fontSize: 18,
        textAlign: 'center',
        color: '#858585',
        marginTop: 40,
    },
    signUpText: {
        color: '#0286FF',
    },
});
