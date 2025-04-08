import { useLocalSearchParams, router } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ActiveRideScreen from '@/components/ActiveRideScreen';

 const ActiveRidePage = () => {
    const params = useLocalSearchParams();
    const rideId = params.rideId as string;

    useEffect(() => {
        if (!rideId) {
            console.error("No rideId provided in URL params");
        }
    }, []);

    const handleComplete = useCallback(() => {
        router.replace('/(root)/(tabs)/home');
      }, []);

    const handleCancel = () => {
        router.replace('/(root)/(tabs)/home');
    };

    if (!rideId) {
        return (
            <View style={styles.errorContainer}>
                <Text>Error: No ride ID provided</Text>
            </View>
        );
    }

    return (
        
        <ActiveRideScreen
            rideId={rideId}
            onComplete={handleComplete}
            onCancel={handleCancel}
        />
    );
}

const styles = StyleSheet.create({
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
});

export default ActiveRidePage