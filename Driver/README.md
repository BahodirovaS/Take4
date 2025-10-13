Driver App (React Native / Expo)

A React Native (Expo) driver client for a rideshare system. The app listens for incoming ride requests in real time, lets the driver accept/decline, publishes live GPS, provides navigation handoff, and manages the ride lifecycle from to_pickup → to_destination → complete.
    Companion app: Passenger (books & pays).
    This README covers the Driver app.

Features
- Real-time ride requests via Firestore onSnapshot (driver-scoped query)
- Animated decision surface (Reanimated bottom sheet) with pre-computed ETAs (pickup + trip)
- Active ride lifecycle: arrived → start → complete (status synced to Firestore)
- Live GPS publishing and ETA polling (throttled)
- Native navigation handoff (Apple Maps / Google Maps)
- Clerk authentication & profile bootstrap
- Expo Router navigation and screen layout
- Resilient UI states (loading/last-known values under spotty connectivity)

Core Flows
- Listen: query Firestore rideRequests for driver_id == currentUser & status in [requested,…] → open sheet
- Decide: compute pickup/trip/total ETA → Accept posts to API → navigate to Active Ride
- Execute: subscribe to ride document + publish GPS → show ETAs (polled) → status actions (arrived/start/complete)

Tech Stack
- React Native (Expo), TypeScript
- Expo Router, expo-location, expo-splash-screen
- Clerk (auth)
- Firebase Firestore (real-time data)
- React Native Reanimated & RNGH (gestures)
- Google Directions API (ETA / routing)
- Linking (Apple/Google Maps handoff)

















Attributes:
- hqrloveq for checkmark icon
- kemalmoe for messages bubble
- srip for schedule
- erix for no result
- muhammad_usman for no rides
- Freepik for stripe
- Pixel perfect for paypal
- muhammad atho' for wallet
