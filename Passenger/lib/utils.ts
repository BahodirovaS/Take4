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

export const formatReservationCardDate = (dateString: string) => {
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const tryParse = (s: string): Date | null => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  let date = tryParse(dateString);

  if (!date) {
    const m = dateString.match(/^(\w+),\s+(\w+)\s+(\d{1,2})$/);
    if (m) {
      const [, , monthName, dayStr] = m;
      const monthIndex = monthNames.findIndex(
        (mn) => mn.toLowerCase() === monthName.toLowerCase()
      );
      if (monthIndex >= 0) {
        const year = new Date().getFullYear();
        date = new Date(year, monthIndex, parseInt(dayStr, 10));
      }
    }
  }

  if (date) {
    return {
      dayOfWeek: date.toLocaleDateString(undefined, { weekday: "short" }),
      monthName: monthNames[date.getMonth()],
      dateNumber: date.getDate(),
    };
  }

  return {
    dayOfWeek: "—",
    monthName: "",
    dateNumber: 0,
  };
};

