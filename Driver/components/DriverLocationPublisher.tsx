import * as Location from "expo-location";
import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-expo";
import { collection, getDocs, query, where, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DriverLocationPublisher() {
  const { user } = useUser();
  const watchSub = useRef<Location.LocationSubscription | null>(null);
  const driverDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const start = async () => {
      const snap = await getDocs(query(collection(db, "drivers"), where("clerkId", "==", user.id)));
      if (snap.empty) return;
      const driverDoc = snap.docs[0];
      driverDocIdRef.current = driverDoc.id;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      await updateDoc(doc(db, "drivers", driverDoc.id), {
        status: true,
        last_online: serverTimestamp(),
      });

      watchSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 25 },
        async (pos) => {
          if (!isMounted) return;
          const { latitude, longitude } = pos.coords;
          if (driverDocIdRef.current) {
            await updateDoc(doc(db, "drivers", driverDocIdRef.current), {
              latitude,
              longitude,
              last_online: serverTimestamp(),
              status: true,
            });
          }
        }
      );
    };

    start();

    return () => {
      isMounted = false;
      if (watchSub.current) {
        watchSub.current.remove();
        watchSub.current = null;
      }
      if (driverDocIdRef.current) {
        updateDoc(doc(db, "drivers", driverDocIdRef.current), {
          status: false,
          last_offline: serverTimestamp(),
        }).catch(() => {});
      }
    };
  }, [user?.id]);

  return null;
}
