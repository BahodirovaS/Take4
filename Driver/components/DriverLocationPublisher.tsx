import * as Location from "expo-location";
import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-expo";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { pingDriverAdmin } from "@/lib/driverPing";

const ADMIN_BASE_URL = "https://take4admin-n2wr.vercel.app/"; // change later to Vercel URL

export default function DriverLocationPublisher({ isOnline }: { isOnline: boolean }) {
  const { user } = useUser();
  const watchSub = useRef<Location.LocationSubscription | null>(null);
  const driverDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let active = true;
    (async () => {
      const snap = await getDocs(query(collection(db, "drivers"), where("clerkId", "==", user.id)));
      if (!active || snap.empty) return;
      driverDocIdRef.current = snap.docs[0].id;
    })();

    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    const startWatch = async () => {
      if (!isOnline) return;
      if (!driverDocIdRef.current) return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      watchSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 25 },
        async (pos) => {
          if (cancelled) return;
          const { latitude, longitude } = pos.coords;
          const id = driverDocIdRef.current;
          if (!id || !user?.id) return;

          
          try {
            await updateDoc(doc(db, "drivers", id), {
              latitude,
              longitude,
              last_location_at: new Date(),
            });
          } catch (e) {
            console.warn("Failed to publish location to Firestore:", e);
          }

          
          await pingDriverAdmin({
            adminBaseUrl: ADMIN_BASE_URL,
            driverId: user.id,
            name: user.fullName ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
            email: user.primaryEmailAddress?.emailAddress,
            lat: latitude,
            lng: longitude,
            status: isOnline ? "available" : "offline",
          });
        }
      );
    };

    const stopWatch = () => {
      if (watchSub.current) {
        try { watchSub.current.remove(); } catch {}
        watchSub.current = null;
      }
    };

    if (isOnline) startWatch();
    else stopWatch();

    return () => {
      cancelled = true;
      stopWatch();
    };
  }, [isOnline, user?.id]);

  return null;
}