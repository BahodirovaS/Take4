import { Ride } from "@/types/type";

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

const formatReservationCardDate = (dateString: string) => {
  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Try to parse the date string manually
  const match = dateString.match(/^(\w+), (\w+) (\d+)$/);
  
  if (match) {
    const dayOfWeek = match[1];
    const monthName = match[2];
    const day = parseInt(match[3]);

    // Determine the month index
    const monthIndex = monthNames.findIndex(m => m === monthName);
    
    // Use current year as default
    const currentYear = new Date().getFullYear();
    const date = new Date(currentYear, monthIndex, day);

    return {
      dayOfWeek: dayOfWeek,
      monthName: monthName,
      dateNumber: day
    };
  }

  // Fallback to standard date parsing
  const date = new Date(dateString);
  
  if (!isNaN(date.getTime())) {
    return {
      dayOfWeek: daysOfWeek[date.getDay()],
      monthName: monthNames[date.getMonth()],
      dateNumber: date.getDate()
    };
  }

  // If all parsing fails
  return {
    dayOfWeek: 'Unknown',
    dateNumber: 'N/A'
  };
};

export default formatReservationCardDate
