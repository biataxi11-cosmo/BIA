'use client';

import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { useGoogleMapsLoader } from '@/hooks/use-google-maps-loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  GeoPoint,
  setDoc
} from 'firebase/firestore';
import { Home, MapPin, User, UserCheck, Locate, Car, Navigation, List, Route, ChevronRight, UserCircle, MapPinned, Clock, Coins, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard-layout';
import { withAuth } from '@/components/with-auth';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 6.9271, // Colombo, Sri Lanka
  lng: 79.8612,
};

type LatLng = { lat: number; lng: number };

type Ride = {
  id: string;
  customerId: string;
  customerName: string;
  pickup: {
    lat: number;
    lng: number;
    address: string;
  };
  dropoffs: Array<{
    lat: number;
    lng: number;
    address: string;
  }>;
  status: 'requested' | 'driver_assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  distance?: string;
  duration?: string;
  cost?: number;
  requestedAt: Date;
  driverId?: string;
};

// Define different colors for route segments
const routeColors = [
  '#FF0000', // Red for pickup segment
  '#00FF00', // Green for first dropoff
  '#0000FF', // Blue for second dropoff
  '#FF00FF', // Magenta for third dropoff
  '#00FFFF', // Cyan for fourth dropoff
  '#FFFF00', // Yellow for fifth dropoff
];

function DriverMap() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [driverLocation, setDriverLocation] = useState<LatLng | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const [assignedRide, setAssignedRide] = useState<Ride | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState<number | null>(null); // For continuous location tracking
  const [routeSegments, setRouteSegments] = useState<google.maps.DirectionsResult[]>([]); // For step-by-step route visualization
  const [drivingMode, setDrivingMode] = useState(false); // For driving mode toggle
  const [currentStep, setCurrentStep] = useState(0); // Current driving step
  const [currentSegment, setCurrentSegment] = useState(0); // Current route segment
  const [drivingInstructions, setDrivingInstructions] = useState<google.maps.DirectionsStep[]>([]); // Driving instructions
  const [isRideDetailsCollapsed, setIsRideDetailsCollapsed] = useState(true); // For collapsing ride details

  // Use our shared custom hook to ensure Google Maps is loaded consistently
  const { isLoaded, loadError } = useGoogleMapsLoader();

  // Get API key from environment variable
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  // Check if API key is missing
  useEffect(() => {
    if (!apiKey) {
      console.error('Google Maps API key is missing');
      toast({
        title: "Configuration Error",
        description: "Google Maps API key is missing. Please check your environment variables.",
        variant: "destructive",
      });
    }
  }, [apiKey, toast]);

  // Navigation links
  const navLinks = [
    { href: '/driver/dashboard', icon: Home, label: 'Home' },
    { href: '/driver/ride-request', icon: List, label: 'Rides' },
    { href: '/driver/map', icon: MapPin, label: 'Map', active: true },
    { href: '/driver/profile', icon: User, label: 'Profile' },
  ];

  // Desktop navigation component
  const DesktopNav = () => (
    <nav className="hidden md:flex items-center gap-4">
      {navLinks.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
            link.active
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <link.icon className="h-4 w-4" />
          <span>{link.label}</span>
        </Link>
      ))}
    </nav>
  );

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = { lat: latitude, lng: longitude };
          setDriverLocation(location);
          setCenter(location); // Center the map on the driver's location
          setIsOnline(true);
          
          // Update location in Firestore
          updateDriverLocationInFirestore({ lat: latitude, lng: longitude }, true);
        },
        (error) => {
          console.error('Error getting current location:', error);
          toast({
            title: "Location Error",
            description: "Unable to get your current location. Please enable location services.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Location Not Supported",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Watch position continuously when driver is online
  const watchPosition = useCallback(() => {
    if (navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = { lat: latitude, lng: longitude };
          setDriverLocation(location);
          setCenter(location);
          
          // Update location in Firestore
          updateDriverLocationInFirestore(location, true);
        },
        (error) => {
          console.error('Error watching position:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000, // 5 seconds
          timeout: 10000 // 10 seconds
        }
      );
      
      setWatchId(id);
      return id;
    }
    return null;
  }, []);

  // Stop watching position
  const stopWatchingPosition = useCallback(() => {
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  // Update driver location in Firestore
  const updateDriverLocationInFirestore = async (location: LatLng, isOnline: boolean) => {
    if (!user) return;
    
    try {
      const driverLocationRef = doc(db, 'driverLocations', user.uid);
      await setDoc(driverLocationRef, {
        driverId: user.uid,
        location: new GeoPoint(location.lat, location.lng),
        isOnline: isOnline,
        updatedAt: serverTimestamp(),
        name: userProfile?.fullName || user.displayName || 'Driver',
        rating: userProfile?.rating || 5.0,
        car: userProfile?.vehicleMake ? `${userProfile.vehicleMake} ${userProfile.vehicleModel}` : 'Unknown Car',
        licensePlate: userProfile?.licensePlate || 'Unknown',
        phoneNumber: userProfile?.phoneNumber || '',
        vehicleMake: userProfile?.vehicleMake || '',
        vehicleModel: userProfile?.vehicleModel || '',
        vehicleYear: userProfile?.vehicleYear || '',
        vehicleColor: userProfile?.vehicleColor || '',
      }, { merge: true });
    } catch (error) {
      console.error('Error updating driver location:', error);
    }
  };

  // Listen for assigned rides
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['accepted', 'in_progress'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const rideDoc = snapshot.docs[0];
        const rideData = rideDoc.data();
        console.log('Ride data received:', rideData);
        
        // Validate that we have the required data
        if (!rideData.pickup || !rideData.pickup.lat || !rideData.pickup.lng) {
          console.error('Invalid pickup location data:', rideData.pickup);
          toast({
            title: "Ride Data Error",
            description: "Invalid pickup location data. Please contact support.",
            variant: "destructive",
          });
          setAssignedRide(null);
          setDirections(null);
          setRouteSegments([]);
          return;
        }
        
        const ride: Ride = {
          id: rideDoc.id,
          customerId: rideData.customerId || '',
          customerName: rideData.customerName || '',
          pickup: rideData.pickup ? {
            lat: rideData.pickup.lat || 0,
            lng: rideData.pickup.lng || 0,
            address: rideData.pickup.address || ''
          } : { lat: 0, lng: 0, address: '' },
          dropoffs: Array.isArray(rideData.dropoffs) ? rideData.dropoffs.map(dropoff => ({
            lat: dropoff.lat || 0,
            lng: dropoff.lng || 0,
            address: dropoff.address || ''
          })) : [],
          status: rideData.status || 'requested',
          distance: rideData.distance,
          duration: rideData.duration,
          cost: rideData.cost,
          requestedAt: rideData.requestedAt?.toDate ? rideData.requestedAt.toDate() : new Date(),
          driverId: rideData.driverId,
        };
        
        console.log('Processed ride data:', ride);
        setAssignedRide(ride);
      } else {
        console.log('No assigned rides found');
        setAssignedRide(null);
        setDirections(null);
        setRouteSegments([]);
      }
    }, (error) => {
      console.error('Error fetching assigned rides:', error);
      // Handle permission denied error specifically
      if (error.code === 'permission-denied') {
        toast({
          title: "Permission Error",
          description: "You don't have permission to access ride data. Please contact support.",
          variant: "destructive",
        });
        // Set assignedRide to null to prevent errors
        setAssignedRide(null);
      }
    });

    return () => unsubscribe();
  }, [user, toast]);

  // Calculate directions when we have all required data
  useEffect(() => {
    if (assignedRide && isOnline && driverLocation && (assignedRide.status === 'accepted' || assignedRide.status === 'in_progress')) {
      console.log('Calculating directions from driver to pickup location', {
        driverLocation,
        pickupLocation: assignedRide.pickup
      });
      
      // Validate pickup location
      if (!assignedRide.pickup || isNaN(assignedRide.pickup.lat) || isNaN(assignedRide.pickup.lng)) {
        console.error('Invalid pickup location:', assignedRide.pickup);
        toast({
          title: "Navigation Error",
          description: "Invalid pickup location. Please contact support.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate driver location
      if (!driverLocation || isNaN(driverLocation.lat) || isNaN(driverLocation.lng)) {
        console.error('Invalid driver location:', driverLocation);
        toast({
          title: "Navigation Error",
          description: "Invalid driver location. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }
      
      // Check if Google Maps API is loaded
      if (typeof google === 'undefined' || !google.maps) {
        console.error('Google Maps API not loaded');
        toast({
          title: "Map Error",
          description: "Google Maps API not loaded. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }
      
      // Show loading indicator
      setDirections(null);
      setRouteSegments([]);
      
      // Add a small delay to ensure map is fully loaded
      const timer = setTimeout(() => {
        calculateCompleteRoute();
      }, 500); // Small delay to ensure map is ready
      
      return () => clearTimeout(timer);
    } else if (assignedRide && assignedRide.status !== 'accepted' && assignedRide.status !== 'in_progress') {
      // Clear directions if ride is no longer in accepted or in_progress status
      setDirections(null);
      setRouteSegments([]);
      setDrivingInstructions([]);
    } else if (assignedRide && (assignedRide.status === 'accepted' || assignedRide.status === 'in_progress') && (!isOnline || !driverLocation)) {
      // Show message if driver is not online or location is not available
      console.log('Cannot calculate directions: driver not online or location not available');
    }
  }, [assignedRide, isOnline, driverLocation, toast]);

  // Calculate complete route with all waypoints
  const calculateCompleteRoute = useCallback(() => {
    if (!assignedRide || !driverLocation) return;
    
    const directionsService = new google.maps.DirectionsService();
    
    // Create waypoints for all locations (pickup + dropoffs)
    const allWaypoints = [
      // First waypoint is the pickup location
      new google.maps.LatLng(assignedRide.pickup.lat, assignedRide.pickup.lng),
      // Then all dropoff locations
      ...assignedRide.dropoffs.map(dropoff => new google.maps.LatLng(dropoff.lat, dropoff.lng))
    ];
    
    // If there's only one location (pickup), just show a marker
    if (allWaypoints.length === 1) {
      setDirections(null);
      setRouteSegments([]);
      setDrivingInstructions([]);
      return;
    }
    
    // Calculate route segments step by step
    const segments: google.maps.DirectionsResult[] = [];
    
    // Calculate each segment of the route
    const calculateSegment = (startIndex: number, endIndex: number) => {
      if (startIndex >= allWaypoints.length - 1 || endIndex >= allWaypoints.length) {
        setRouteSegments(segments);
        // Set driving instructions for the first segment
        if (segments.length > 0 && segments[0].routes.length > 0 && segments[0].routes[0].legs.length > 0) {
          setDrivingInstructions(segments[0].routes[0].legs[0].steps);
        }
        return;
      }
      
      directionsService.route(
        {
          origin: allWaypoints[startIndex],
          destination: allWaypoints[endIndex],
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            segments.push(result);
            // Calculate next segment
            calculateSegment(startIndex + 1, endIndex + 1);
          } else {
            console.error('Error fetching directions for segment:', status);
            toast({
              title: "Navigation Error",
              description: `Unable to calculate route segment: ${status}`,
              variant: "destructive",
            });
            setRouteSegments(segments);
          }
        }
      );
    };
    
    // Start calculating segments from driver location to pickup, then pickup to first dropoff, etc.
    directionsService.route(
      {
        origin: new google.maps.LatLng(driverLocation.lat, driverLocation.lng),
        destination: allWaypoints[0], // Pickup location
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          segments.push(result);
          // Set driving instructions for the first segment
          if (result.routes.length > 0 && result.routes[0].legs.length > 0) {
            setDrivingInstructions(result.routes[0].legs[0].steps);
          }
          // Now calculate segments between waypoints
          if (allWaypoints.length > 1) {
            calculateSegment(0, 1);
          } else {
            setRouteSegments(segments);
          }
        } else {
          console.error('Error fetching directions to pickup:', status);
          toast({
            title: "Navigation Error",
            description: `Unable to calculate directions to pickup: ${status}`,
            variant: "destructive",
          });
        }
      }
    );
  }, [assignedRide, driverLocation, toast]);

  // Toggle driving mode
  const toggleDrivingMode = () => {
    setDrivingMode(!drivingMode);
    if (!drivingMode && routeSegments.length > 0) {
      // When entering driving mode, set instructions for the first segment
      if (routeSegments[0].routes.length > 0 && routeSegments[0].routes[0].legs.length > 0) {
        setDrivingInstructions(routeSegments[0].routes[0].legs[0].steps);
        setCurrentStep(0);
        setCurrentSegment(0);
      }
    }
  };

  // Move to next driving step
  const nextStep = () => {
    if (drivingInstructions.length > 0 && currentStep < drivingInstructions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (currentSegment < routeSegments.length - 1) {
      // Move to next segment
      setCurrentSegment(currentSegment + 1);
      setCurrentStep(0);
      if (routeSegments[currentSegment + 1].routes.length > 0 && 
          routeSegments[currentSegment + 1].routes[0].legs.length > 0) {
        setDrivingInstructions(routeSegments[currentSegment + 1].routes[0].legs[0].steps);
      }
    }
  };

  // Move to previous driving step
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else if (currentSegment > 0) {
      // Move to previous segment
      setCurrentSegment(currentSegment - 1);
      setCurrentStep(0);
      if (routeSegments[currentSegment - 1].routes.length > 0 && 
          routeSegments[currentSegment - 1].routes[0].legs.length > 0) {
        const steps = routeSegments[currentSegment - 1].routes[0].legs[0].steps;
        setDrivingInstructions(steps);
        setCurrentStep(steps.length - 1);
      }
    }
  };

  // Force map resize when directions are calculated
  useEffect(() => {
    if (directions || routeSegments.length > 0) {
      // Trigger a resize event to ensure the map renders correctly
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  }, [directions, routeSegments]);

  // Get driver location from driverLocations collection
  useEffect(() => {
    if (!user || !isLoaded) return;

    const driverLocationRef = doc(db, 'driverLocations', user.uid);
    
    const unsubscribe = onSnapshot(driverLocationRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.location && data.location instanceof GeoPoint) {
          // Validate location data
          if (isNaN(data.location.latitude) || isNaN(data.location.longitude)) {
            console.error('Invalid driver location data:', data.location);
            toast({
              title: "Location Error",
              description: "Invalid driver location data. Please refresh the page.",
              variant: "destructive",
            });
            return;
          }
          
          const location = {
            lat: data.location.latitude,
            lng: data.location.longitude
          };
          setDriverLocation(location);
          setCenter(location); // Center the map on the driver's location
          setIsOnline(data.isOnline || false);
          console.log('Driver location updated:', location);
        }
      } else {
        // If no document exists, try to get location from browser
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              // Validate location data
              if (isNaN(latitude) || isNaN(longitude)) {
                console.error('Invalid browser location data:', { latitude, longitude });
                toast({
                  title: "Location Error",
                  description: "Invalid browser location data.",
                  variant: "destructive",
                });
                return;
              }
              
              const location = { lat: latitude, lng: longitude };
              setDriverLocation(location);
              setCenter(location); // Center the map on the driver's location
              console.log('Driver location from browser:', location);
            },
            (error) => {
              console.error('Error getting current location:', error);
              toast({
                title: "Location Error",
                description: "Unable to get your current location. Please enable location services.",
                variant: "destructive",
              });
            }
          );
        }
      }
      setLoading(false);
    }, (error) => {
      console.error('Error subscribing to driver location:', error);
      // Handle permission denied error specifically
      if (error.code === 'permission-denied') {
        toast({
          title: "Permission Error",
          description: "You don't have permission to access this data. Please contact support.",
          variant: "destructive",
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isLoaded, toast]);

  // Start trip function
  const handleStartTrip = async () => {
    if (!assignedRide || !user) return;
    
    try {
      const rideRef = doc(db, 'rides', assignedRide.id);
      await updateDoc(rideRef, {
        status: 'in_progress',
        startedAt: serverTimestamp(),
      });
      
      toast({
        title: "Trip Started",
        description: "You have started the trip to the destination.",
      });
    } catch (error) {
      console.error('Error starting trip:', error);
      toast({
        title: "Error",
        description: "Failed to start trip. Please try again.",
        variant: "destructive",
      });
    }
  };

  // End trip function
  const handleEndTrip = async () => {
    if (!assignedRide || !user) return;
    
    try {
      const rideRef = doc(db, 'rides', assignedRide.id);
      await updateDoc(rideRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
      });
      
      // Also update driver status to available
      const driverRef = doc(db, 'users', user.uid);
      await updateDoc(driverRef, {
        isBusy: false,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Trip Ended",
        description: "Trip has been completed. Please collect payment.",
      });
    } catch (error) {
      console.error('Error ending trip:', error);
      toast({
        title: "Error",
        description: "Failed to end trip. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Go online function
  const goOnline = () => {
    getCurrentLocation();
    // Start continuous location tracking
    watchPosition();
  };

  // Go offline function
  const goOffline = async () => {
    setIsOnline(false);
    setDriverLocation(null);
    setDirections(null);
    setRouteSegments([]); // Clear route segments when going offline
    setDrivingInstructions([]); // Clear driving instructions
    setDrivingMode(false); // Exit driving mode
    // Stop continuous location tracking
    stopWatchingPosition();
    
    if (user) {
      try {
        const driverRef = doc(db, 'users', user.uid);
        await updateDoc(driverRef, {
          isOnline: false,
          updatedAt: serverTimestamp()
        });
        
        const publicDriverLocationRef = doc(db, 'driverLocations', user.uid);
        await updateDoc(publicDriverLocationRef, {
          isOnline: false,
          updatedAt: serverTimestamp(),
        });
        
        toast({
          title: "You're now offline",
          description: "Customers can no longer see you on the map.",
        });
      } catch (error) {
        console.error('Error updating driver status:', error);
        toast({
          title: "Error",
          description: "Failed to update your status. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatchingPosition();
    };
  }, [stopWatchingPosition]);

  if (loadError) {
    console.error('Google Maps load error:', loadError);
    return (
      <DashboardLayout desktopNav={<DesktopNav />}>
        <div className="flex items-center justify-center h-full">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle>Error Loading Map</CardTitle>
              <CardDescription>
                Please check your API key and try again.
              </CardDescription>
              <CardContent>
                <p className="text-sm text-muted-foreground">Error: {loadError.message}</p>
                <p className="text-sm text-muted-foreground mt-2">API Key present: {apiKey ? 'Yes' : 'No'}</p>
              </CardContent>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!isLoaded || loading) {
    console.log('Map loading state:', { isLoaded, loading });
    return (
      <DashboardLayout desktopNav={<DesktopNav />}>
        <div className="flex items-center justify-center h-full">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle>Loading Map</CardTitle>
              <CardDescription>
                Please wait while we load the map...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Loading Google Maps...</p>
              <p className="text-sm text-muted-foreground mt-2">API Key present: {apiKey ? 'Yes' : 'No'}</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout desktopNav={<DesktopNav />}>
      <div className="relative h-screen w-full">
        {/* Map Container */}
        <div className="absolute inset-0" style={{ height: '100vh' }}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={13}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              streetViewControl: true,
              gestureHandling: 'greedy', // Enable scroll zoom without Ctrl key
              scrollwheel: true, // Explicitly enable scroll wheel zooming
            }}
          >
            {/* Show driver location if online */}
            {isOnline && driverLocation && (
              <Marker 
                position={driverLocation} 
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#00FF00",
                  fillOpacity: 1,
                  strokeColor: "#FFFFFF",
                  strokeWeight: 2,
                }} 
              />
            )}
            
            {/* Show pickup location marker if ride is assigned */}
            {assignedRide && (
              <Marker 
                position={{ lat: assignedRide.pickup.lat, lng: assignedRide.pickup.lng }} 
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#FF0000",
                  fillOpacity: 1,
                  strokeColor: "#FFFFFF",
                  strokeWeight: 2,
                }} 
                label={{
                  text: "P",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold"
                }}
              />
            )}
            
            {/* Show dropoff location markers if ride is assigned */}
            {assignedRide && assignedRide.dropoffs.map((dropoff, index) => (
              <Marker 
                key={index}
                position={{ lat: dropoff.lat, lng: dropoff.lng }} 
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#0000FF",
                  fillOpacity: 1,
                  strokeColor: "#FFFFFF",
                  strokeWeight: 2,
                }} 
                label={{
                  text: `${index + 1}`,
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold"
                }}
              />
            ))}
            
            {/* Show route segments with different colors */}
            {routeSegments.map((segment, index) => (
              <DirectionsRenderer 
                key={index}
                directions={segment} 
                options={{
                  polylineOptions: {
                    strokeColor: routeColors[index % routeColors.length],
                    strokeWeight: 5,
                    strokeOpacity: 0.8
                  },
                  suppressMarkers: true,
                  preserveViewport: true
                }} 
              />
            ))}
          </GoogleMap>
        </div>
        
        {/* Collapsible Assigned Ride Summary */}
        {assignedRide && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <Card className="max-w-md mx-auto shadow-lg">
              <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsRideDetailsCollapsed(!isRideDetailsCollapsed)}>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Car className="h-5 w-5" />
                    Assigned Ride
                  </CardTitle>
                  {isRideDetailsCollapsed ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronUp className="h-5 w-5" />
                  )}
                </div>
                <CardDescription className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  {assignedRide.customerName}
                </CardDescription>
              </CardHeader>
              
              {isRideDetailsCollapsed ? (
                // Collapsed view with summary
                <CardContent className="pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPinned className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{assignedRide.pickup.address}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Route className="h-4 w-4 text-muted-foreground" />
                      <span>{assignedRide.dropoffs.length} destinations</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">
                        {assignedRide.status === 'accepted' ? 'Navigate to pickup' : 
                         assignedRide.status === 'in_progress' ? 'In progress' : 
                         assignedRide.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    {assignedRide.status === 'completed' && assignedRide.cost && (
                      <div className="flex items-center gap-2 text-sm">
                        <Coins className="h-4 w-4 text-muted-foreground" />
                        <span>LKR {assignedRide.cost}</span>
                      </div>
                    )}
                    
                    <div className="pt-2">
                      {assignedRide.status === 'accepted' && (
                        <Button 
                          onClick={handleStartTrip}
                          className="w-full"
                          size="sm"
                        >
                          Start Trip
                        </Button>
                      )}
                      {assignedRide.status === 'in_progress' && (
                        <Button 
                          onClick={handleEndTrip}
                          className="w-full"
                          size="sm"
                          variant="destructive"
                        >
                          End Trip
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              ) : (
                // Expanded view with full details
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm mb-2">
                        <strong>Customer:</strong> {assignedRide.customerName}
                      </p>
                      <p className="text-sm mb-2">
                        <strong>Pickup:</strong> {assignedRide.pickup.address}
                      </p>
                      <div className="text-sm mb-2">
                        <strong>Destinations:</strong>
                        <div className="ml-2 mt-1 space-y-1">
                          {assignedRide.dropoffs.map((dropoff, index) => (
                            <div key={index} className="flex items-center">
                              <span className="mr-2">{index + 1}.</span>
                              <span>{dropoff.address}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm">
                        <strong>Status:</strong> 
                        {assignedRide.status === 'accepted' ? 'Navigate to pickup' : 
                         assignedRide.status === 'in_progress' ? 'In progress' : 
                         assignedRide.status.replace('_', ' ')}
                      </p>
                    </div>
                    
                    {assignedRide.status === 'accepted' && (
                      <Button 
                        onClick={handleStartTrip}
                        className="w-full"
                        size="sm"
                      >
                        Start Trip
                      </Button>
                    )}
                    {assignedRide.status === 'in_progress' && (
                      <Button 
                        onClick={handleEndTrip}
                        className="w-full"
                        size="sm"
                        variant="destructive"
                      >
                        End Trip
                      </Button>
                    )}
                    {assignedRide.status === 'completed' && (
                      <div className="p-3 bg-secondary rounded-lg">
                        <h4 className="font-medium mb-2">Trip Completed</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Distance:</span>
                            <span className="font-medium">{assignedRide.distance || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Duration:</span>
                            <span className="font-medium">{assignedRide.duration || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                            <span>Total:</span>
                            <span>LKR {assignedRide.cost || '0'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {/* Driving Mode Toggle Button - Show after trip starts */}
        {assignedRide && routeSegments.length > 0 && (
          <div className="absolute top-4 right-4 z-10">
            <Button 
              onClick={toggleDrivingMode}
              variant={drivingMode ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Navigation className="h-4 w-4" />
              {drivingMode ? "Exit Navigation" : "Start Navigation"}
            </Button>
          </div>
        )}

        {/* Collapsible Driving Instructions Panel */}
        {drivingMode && drivingInstructions.length > 0 && (
          <div className="absolute bottom-20 left-4 right-4 z-10">
            <Card className="max-w-2xl mx-auto shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Navigation className="h-5 w-5" />
                  Driving Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-4">
                  {/* Current instruction */}
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                        {currentStep + 1}
                      </div>
                      <div>
                        <p className="font-medium text-lg">
                          {drivingInstructions[currentStep]?.instructions.replace(/<[^>]*>/g, '')}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {drivingInstructions[currentStep]?.distance?.text} • {drivingInstructions[currentStep]?.duration?.text}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Next instruction preview */}
                  {currentStep < drivingInstructions.length - 1 && (
                    <div className="p-3 bg-secondary/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Next:</p>
                      <p className="font-medium">
                        {drivingInstructions[currentStep + 1]?.instructions.replace(/<[^>]*>/g, '')}
                      </p>
                    </div>
                  )}
                  
                  {/* Progress indicator */}
                  <div className="flex items-center justify-between text-sm">
                    <span>Step {currentStep + 1} of {drivingInstructions.length}</span>
                    <span>Segment {currentSegment + 1} of {routeSegments.length}</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${((currentStep + 1) / drivingInstructions.length) * 100}%` }}
                    ></div>
                  </div>
                  
                  {/* Navigation controls */}
                  <div className="flex justify-between gap-2">
                    <Button 
                      onClick={prevStep}
                      disabled={currentStep === 0 && currentSegment === 0}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Button 
                      onClick={nextStep}
                      disabled={currentStep === drivingInstructions.length - 1 && currentSegment === routeSegments.length - 1}
                      size="sm"
                    >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bottom Navigation for Mobile */}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-2 md:hidden z-10">
          <div className="flex justify-around">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`flex flex-col items-center gap-1 ${
                  link.active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <link.icon className="h-6 w-6" />
                <span className="text-xs">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(DriverMap, ['driver']);