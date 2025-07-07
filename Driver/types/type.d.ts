import { TextInputProps, TextStyle, TouchableOpacityProps } from "react-native";

declare interface Driver {
  id: number;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  pets: boolean;
  rating: number;
  status: boolean;
  clerk_id:string;
  time: number;
  price: string;
}

declare interface MarkerData {
  latitude: number;
  longitude: number;
  id: number;
  title: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  rating: number;
  first_name: string;
  last_name: string;
  clerk_id: string;
  time: number;
  price: string;
  status: boolean;
}

declare interface DriverProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  dob: string;
  licence: string;
  vMake: string;
  vPlate: string;
  vInsurance: string;
  pets: boolean;
  carSeats: number;
  status: boolean;
  profilePhotoBase64: string;
}

declare interface PassengerInfo {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
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
  driver_share?: number;
  tip_amount?: string | number;
  payment_status: string;
  driver_id: string;
  user_id: string;
  user_name: string;
  created_at: any;
  tipped_at?: any;
  rated_at?: any;
  status: string;
  driver: {
    first_name: string;
    last_name: string;
    car_seats: number;
  };
}

interface RideRequest {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  origin_address: string;
  destination_address: string;
  origin_longitude: number;
  origin_latitude: number;
  destination_longitude: number;
  destination_latitude: number;
  fare_price: number;
  status: string;
  user_id: string;
  createdAt: Date;
}

interface ActiveRideProps {
  rideId: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface ActiveRideData {
  rideId: string;
  status: 'accepted' | 'arrived_at_pickup' | 'in_progress';
  destination: string;
}

interface ReservationStore {
  scheduledDate: string | null;
  scheduledTime: string | null;
  reservationId: string | null;
  setScheduledDateTime: (date: string, time: string) => void;
  setReservationId: (id: string) => void;
  clearReservation: () => void;
}

declare interface Message {
  id: string;
  text: string;
  senderName: string;
  senderId: string;
  recipientId: string;
  recipientName: string;
  timestamp: Date | any;
}

declare interface ButtonProps extends TouchableOpacityProps {
  title: string;
  bgVariant?: "primary" | "secondary" | "tertiary" | "danger" | "outline" | "success";
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
  inputWrapperStyle?: TextStyle | ViewStyle | object;
}

declare interface PaymentProps {
  fullName: string;
  email: string;
  amount: string;
  driver_id: string;
  rideTime: number;
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
  selectedDriver: number | null;
  setSelectedDriver: (driver_id: number) => void;
  setDrivers: (drivers: MarkerData[]) => void;
  clearSelectedDriver: () => void;
  fetchDrivers: () => Promise<void>;
}

declare interface DriverCardProps {
  item: MarkerData;
  selected: number;
  setSelected: () => void;
}

declare interface ChatMessage {
  id: string;
  senderName: string;
  messagePreview: string;
  avatar: string;
  timestamp: string;
}

declare interface Payment {
  id: string;
  amount: number;
  driverShare: number;
  createdAt: Date;
  rideId: string;
  passengerName: string;
  status: string;
  type: 'ride' | 'tip';
}

declare interface WalletData {
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  recentPayments: Payment[];
}