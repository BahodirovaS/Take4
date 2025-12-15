import React, { useEffect, useRef } from "react";
import { Stack, router, usePathname } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

const Layout = () => {
  const { user } = useUser();
  const pathname = usePathname();
  const lastForcedRideId = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, "rideRequests"),
      where("user_id", "==", user.id),
      where("status", "==", "completed"),
      where("passenger_completed_ack", "==", false),
      limit(1)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          lastForcedRideId.current = null;
          return;
        }

        const rideId = snap.docs[0].id;

        // prevent replace loops / spam
        if (pathname?.includes("ride-completed") && lastForcedRideId.current === rideId) return;

        lastForcedRideId.current = rideId;

        router.replace({
          pathname: "/(root)/ride-completed",
          params: { rideId },
        });
      },
      (err) => {
        console.error("completion gate snapshot error:", err);
      }
    );

    return unsub;
  }, [user?.id, pathname]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="find-ride" />
      <Stack.Screen name="confirm-ride" />
      <Stack.Screen name="book-ride" />
      <Stack.Screen name="reserve-confirm-ride" />
      <Stack.Screen name="reserve-book-ride" />
      <Stack.Screen name="active-ride" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="ride-completed" />
    </Stack>
  );
};

export default Layout;
