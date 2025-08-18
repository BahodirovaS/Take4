const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
let app;
let db;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
} catch (initError) {
  console.error('Firebase initialization error:', initError);
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Function started, checking environment...');
    
    // Check Firebase config
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.error('Missing Firebase environment variables');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error - missing Firebase config' 
      });
    }

    if (!db) {
      console.error('Firebase not initialized');
      return res.status(500).json({ 
        success: false, 
        error: 'Database connection failed' 
      });
    }

    const { 
      rideId, 
      rideType, 
      pickupLatitude, 
      pickupLongitude,
      isScheduled = false 
    } = req.body;

    console.log('Request received:', {
      rideId,
      rideType,
      pickupLatitude,
      pickupLongitude,
      isScheduled
    });

    // Validate required fields
    if (!rideId || !rideType || pickupLatitude === undefined || pickupLongitude === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields',
        received: { rideId, rideType, pickupLatitude, pickupLongitude }
      });
    }

    // Map ride types to seat requirements
    const seatRequirement = rideType === 'xl' ? 7 : rideType === 'comfort' ? 6 : 4;

    console.log(`Searching for drivers with ${seatRequirement}+ seats for ${rideType} ride`);

    // Query for drivers with appropriate vehicle type
    const driversQuery = query(
      collection(db, 'drivers'),
      where('carSeats', '>=', seatRequirement),
      where('status', '==', true)
    );

    console.log('Executing Firestore query...');
    const driversSnapshot = await getDocs(driversQuery);
    
    console.log(`Found ${driversSnapshot.size} drivers in query`);
    
    if (driversSnapshot.empty) {
      console.log('No drivers found matching criteria');
      return res.status(404).json({ 
        success: false, 
        error: `No ${rideType} drivers available at this time`,
        searchCriteria: {
          rideType,
          seatRequirement,
          driversFound: 0
        }
      });
    }

    // Convert to array with distance calculation
    const availableDrivers = [];
    driversSnapshot.forEach(docSnapshot => {
      const driverData = docSnapshot.data();
      
      // Validate driver has required location data
      if (!driverData.latitude || !driverData.longitude) {
        console.warn(`Driver ${docSnapshot.id} missing location data`);
        return;
      }

      const distance = calculateDistance(
        pickupLatitude, 
        pickupLongitude, 
        driverData.latitude, 
        driverData.longitude
      );
      
      availableDrivers.push({
        id: docSnapshot.id,
        clerk_id: driverData.clerkId,
        firstName: driverData.firstName || 'Unknown',
        lastName: driverData.lastName || 'Driver',
        latitude: driverData.latitude,
        longitude: driverData.longitude,
        carSeats: driverData.carSeats,
        carMake: driverData.vMake || 'Vehicle',
        distance: distance,
        ...driverData
      });
    });

    if (availableDrivers.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No drivers with valid location data found' 
      });
    }

    // Sort by distance and find closest
    availableDrivers.sort((a, b) => a.distance - b.distance);
    const closestDriver = availableDrivers[0];

    console.log(`Found ${availableDrivers.length} valid drivers, closest is ${closestDriver.firstName} at ${closestDriver.distance.toFixed(2)}km`);

    // Update ride with assigned driver
    const rideRef = doc(db, 'rideRequests', rideId);
    const updateData = {
      driver_id: closestDriver.clerk_id,
      assigned_driver_name: `${closestDriver.firstName} ${closestDriver.lastName}`,
      assigned_driver_car: closestDriver.carMake,
      assigned_driver_seats: closestDriver.carSeats,
      assigned_at: new Date(),
      driver_distance: closestDriver.distance
    };

    // Set appropriate status
    if (isScheduled) {
      updateData.status = 'scheduled_driver_assigned';
    } else {
      updateData.status = 'driver_assigned';
    }

    console.log('Updating ride document...');
    await updateDoc(rideRef, updateData);

    console.log(`Successfully assigned driver ${closestDriver.clerk_id} to ride ${rideId}`);

    // Return success response
    return res.status(200).json({
      success: true,
      driver: {
        id: closestDriver.clerk_id,
        name: `${closestDriver.firstName} ${closestDriver.lastName}`,
        car: closestDriver.carMake,
        seats: closestDriver.carSeats,
        distance: closestDriver.distance,
        estimatedArrival: Math.ceil(closestDriver.distance * 2) // rough estimate: 2 mins per km
      }
    });

  } catch (error) {
    console.error('Detailed error in assign-driver:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });

    return res.status(500).json({ 
      success: false, 
      error: 'Failed to assign driver',
      details: error.message,
      errorType: error.name
    });
  }
};

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
  try {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    
    return distance;
  } catch (error) {
    console.error('Error calculating distance:', error);
    return 999; // Return high distance if calculation fails
  }
}