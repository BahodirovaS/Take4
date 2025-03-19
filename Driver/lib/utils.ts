import { Ride } from "@/types/type";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";


export const sortRides = (rides: Ride[]): Ride[] => {
  const result = rides.sort((a, b) => {
    const dateA = new Date(`${a.created_at}T${a.ride_time}`);
    const dateB = new Date(`${b.created_at}T${b.ride_time}`);
    return dateB.getTime() - dateA.getTime();
  });

  return result.reverse();
};

export function formatTime(minutes: number): string {
  const formattedMinutes = Math.round(minutes);

  if (formattedMinutes < 60) {
    return `${formattedMinutes} min`;
  } else {
    const hours = Math.floor(formattedMinutes / 60);
    const remainingMinutes = formattedMinutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day < 10 ? "0" + day : day} ${month} ${year}`;
}

export const createDriver = async (driverData: any) => {
  try {
    const driversRef = collection(db, "drivers");
    const docRef = await addDoc(driversRef, {
      ...driverData,
      createdAt: new Date(),
      status: false // Default to offline
    });
    
    return {
      id: docRef.id,
      ...driverData
    };
  } catch (error) {
    console.error("Error creating driver record:", error);
    throw error;
  }
};

export const checkDriverExists = async (email: string) => {
  try {
    // Query drivers collection by email
    const driversRef = collection(db, "drivers");
    const q = query(driversRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return {
        exists: false,
        data: null
      };
    }
    
    // Return driver data if found
    const driverDoc = querySnapshot.docs[0];
    return {
      exists: true,
      data: {
        id: driverDoc.id,
        ...driverDoc.data()
      }
    };
  } catch (error) {
    console.error("Error checking if driver exists:", error);
    throw error;
  }
};