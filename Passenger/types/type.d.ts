import { Timestamp } from "firebase/firestore";
import { TextInputProps, TouchableOpacityProps } from "react-native";

declare interface Driver {
  id: number;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  car_color: string;
  pets: boolean;
  rating: number;
  status: boolean;
  clerk_id:string;
  time: number;
  price: string;
  v_make: string;
  v_plate: string
}

declare interface MarkerData {
  id: number;
  clerk_id: string;
  first_name: string;
  last_name: string;
  phone_number?: string | null;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  car_color: string;
  latitude: number;
  longitude: number;
  title: string;
  time: number;
  price: string;
  status: boolean;
  v_make: string;
  v_plate: string;
  pets: boolean;
}

declare interface ProfileForm {
  name: string;
  email: string;
  phoneNumber: string;
  profilePhotoBase64: string;
}

declare interface Message {
  id: string;
  rideId?: string; 
  context?: string;
  text: string;
  senderName: string;
  senderId: string;
  recipientId: string;
  recipientName: string;
  timestamp: Date | any;
}


declare interface MapProps {
  destinationLatitude?: number;
  destinationLongitude?: number;
  onDriverTimesCalculated?: (driversWithTimes: MarkerData[]) => void;
  selectedDriver?: number | null;
  onMapReady?: () => void;
}

declare interface Ride {
  id: string;
  origin_address: string;
  destination_address: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  ride_time: number;
  fare_price: number;
  tip_amount?: string | number;
  payment_status: string;
  driver_id: number;
  user_id: string;
  created_at: string;
  status: string;
  driver: {
    first_name: string;
    last_name: string;
    car_seats: number;
    car_color: string;

  };
}

declare interface RideRequest {
  id: string;
  scheduled_date: string;
  scheduled_datetime?: Timestamp | Date;
  scheduled_time: string;
  origin_address: string;
  destination_address: string;
  origin_longitude: number;
  origin_latitude: number;
  destination_longitude: number;
  destination_latitude: number;
  fare_price: number;
  status: string;
  driver_id: string;
  createdAt: Date;
}

declare interface ActiveRideData {
  rideId: string;
  status: string;
  destination?: string;
  driver_id?: string;
  driver_latitude?: number;
  driver_longitude?: number;
}

declare interface CompletedRideDetails {
  origin_address: string;
  destination_address: string;
  ride_time: number;
  fare_price: number;
  status: string;
  driver_id?: string;
  user_id?: string;
  rating: number;
  tip_amount: string;
  customer_id?: string;
  payment_method_id?: string;
  driver_share?: number;
}

declare interface ReservationStore {
  scheduledDate: string | null;
  scheduledTime: string | null;
  reservationId: string | null;
  setScheduledDateTime: (date: string, time: string) => void;
  setReservationId: (id: string | null) => void;
  clearReservation: () => void;
}

declare interface ButtonProps extends TouchableOpacityProps {
  title: string;
  bgVariant?: "primary" | "secondary" | "danger" | "outline" | "success";
  textVariant?: "primary" | "default" | "secondary" | "danger" | "success";
  size?: "small" | "medium" | "large";
  IconLeft?: React.ComponentType<any>;
  IconRight?: React.ComponentType<any>;
  className?: string;
}

declare interface GoogleInputProps {
  icon?: string;
  initialLocation?: string;
  containerStyle?: StyleProp<ViewStyle>;
  textInputBackgroundColor?: string;
  handlePress: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
}

declare interface InputFieldProps extends TextInputProps {
  label: string;
  icon?: any;
  secureTextEntry?: boolean;
  labelStyle?: TextStyle | ViewStyle | object;
  containerStyle?: TextStyle | ViewStyle | object;
  inputStyle?: TextStyle | ViewStyle | object;
  iconStyle?: TextStyle | ViewStyle | object;
  className?: string;
}

declare interface PaymentProps {
  fullName: string;
  email: string;
  amount: string;
  driver_id: string;
  rideTime: number;
  isScheduled?: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
}

declare interface LocationStore {
  userLatitude: number | null;
  userLongitude: number | null;
  userAddress: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  destinationAddress: string | null;
  setUserLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  setDestinationLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
}

declare interface DriverStore {
  drivers: MarkerData[];
  selectedDriver: string | null;
  setSelectedDriver: (clerk_id: string) => void;
  setDrivers: (drivers: MarkerData[]) => void;
  clearSelectedDriver: () => void;
  fetchDrivers: () => Promise<void>;
}

declare interface DriverCardProps {
  item: MarkerData;
  selected: string;
  setSelected: () => void;
}

declare interface ChatMessage {
  id: string;
  senderName: string;
  messagePreview: string;
  avatar: string;
  timestamp: string;
}

declare interface DriverInfoProps {
  driverId: string;
  rideId: string | string[];
  driverLocation: {
      latitude: number;
      longitude: number;
  };
}