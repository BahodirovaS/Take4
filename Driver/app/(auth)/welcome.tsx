import { router } from "expo-router";
import { useRef, useState } from "react";
import { Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-swiper";

import CustomButton from "@/components/CustomButton";
import { onboarding } from "@/constants";

const Home = () => {
    const swiperRef = useRef<Swiper>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const isLastSlide = activeIndex === onboarding.length - 1;

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity
                onPress={() => {
                    router.replace("/(auth)/sign-up");
                }}
                style={styles.skipButton}
            >
                <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            <Swiper
                ref={swiperRef}
                loop={false}
                dot={<View style={styles.dot} />}
                activeDot={<View style={styles.activeDot} />}
                onIndexChanged={(index) => setActiveIndex(index)}
            >
                {onboarding.map((item) => (
                    <View key={item.id} style={styles.slide}>
                        <Image
                            source={item.image}
                            style={styles.image}
                            resizeMode="contain"
                        />
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>{item.title}</Text>
                        </View>
                        <Text style={styles.description}>{item.description}</Text>
                    </View>
                ))}
            </Swiper>

            <CustomButton
                title={isLastSlide ? "Get Started" : "Next"}
                onPress={() =>
                    isLastSlide
                        ? router.replace("/(auth)/sign-up")
                        : swiperRef.current?.scrollBy(1)
                }
                style={styles.customButton}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "white",
    },
    skipButton: {
        width: "100%",
        alignItems: "flex-end",
        padding: 20,
    },
    skipText: {
        color: "black",
        fontSize: 16,
        fontFamily: "Jakarta-Bold",
    },
    dot: {
        width: 32,
        height: 4,
        marginHorizontal: 4,
        backgroundColor: "#E2E8F0",
        borderRadius: 2,
    },
    activeDot: {
        width: 32,
        height: 4,
        marginHorizontal: 4,
        backgroundColor: "#0286FF",
        borderRadius: 2,
    },
    slide: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 10,
    },
    image: {
        width: "100%",
        height: 300,
    },
    titleContainer: {
        marginTop: 40,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
    },
    title: {
        color: "black",
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        marginHorizontal: 20,
    },
    description: {
        fontSize: 14,
        fontFamily: "Jakarta-SemiBold",
        color: "#858585",
        textAlign: "center",
        marginHorizontal: 20,
        marginTop: 10,
    },
    customButton: {
        width: "92%",
        marginTop: 20,
        marginBottom: 55,
    },
});

export default Home;
