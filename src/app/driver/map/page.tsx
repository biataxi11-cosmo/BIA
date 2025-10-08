'use client';

import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, Marker, useJsApiLoader, DirectionsRenderer } from '@react-google-maps/api';
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
  GeoPoint 
} from 'firebase/firestore';
import { Home, MapPin, User, UserCheck, Locate, Car, Navigation, List } from 'lucide-react';
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

function DriverMap() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [driverLocation, setDriverLocation] = useState<LatLng | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const [assignedRide, setAssignedRide] = useState<Ride | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Get API key from environment variable
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  // Load Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script-driver-map',
    googleMapsApiKey: apiKey,
    libraries: ['places', 'routes']
  });

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
    if (assignedRide && isOnline && driverLocation && assignedRide.status === 'accepted') {
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
      
      // Add a small delay to ensure map is fully loaded
      const timer = setTimeout(() => {
        // Always calculate directions when we have the required data
        const directionsService = new google.maps.DirectionsService();
        directionsService.route(
          {
            origin: new google.maps.LatLng(driverLocation.lat, driverLocation.lng),
            destination: new google.maps.LatLng(assignedRide.pickup.lat, assignedRide.pickup.lng),
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            console.log('Directions service response:', status, result);
            if (status === google.maps.DirectionsStatus.OK && result) {
              console.log('Directions calculated successfully');
              setDirections(result);
            } else {
              console.error('Error fetching directions:', status);
              toast({
                title: "Navigation Error",
                description: `Unable to calculate directions to pickup: ${status}`,
                variant: "destructive",
              });
            }
          }
        );
      }, 500); // Small delay to ensure map is ready
      
      return () => clearTimeout(timer);
    } else if (assignedRide && assignedRide.status !== 'accepted') {
      // Clear directions if ride is no longer in accepted status
      setDirections(null);
    } else if (assignedRide && assignedRide.status === 'accepted' && (!isOnline || !driverLocation)) {
      // Show message if driver is not online or location is not available
      console.log('Cannot calculate directions: driver not online or location not available');
    }
  }, [assignedRide, isOnline, driverLocation, toast]);

  // Force map resize when directions are calculated
  useEffect(() => {
    if (directions) {
      // Trigger a resize event to ensure the map renders correctly
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  }, [directions]);

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
  };

  // Go offline function
  const goOffline = async () => {
    setIsOnline(false);
    setDriverLocation(null);
    setDirections(null); // Clear directions when going offline
    
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
              />
            )}
            
            {/* Show directions if available */}
            {directions && (
              <DirectionsRenderer 
                directions={directions} 
                options={{
                  polylineOptions: {
                    strokeColor: '#0000FF',
                    strokeWeight: 5,
                    strokeOpacity: 0.8
                  },
                  suppressMarkers: true
                }} 
              />
            )}
          </GoogleMap>
        </div>
        
        {/* Assigned Ride Details */}
        {assignedRide && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <Card className="max-w-md mx-auto shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Assigned Ride
                </CardTitle>
                <CardDescription>
                  Ride details and actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm mb-2">
                      <strong>Customer:</strong> {assignedRide.customerName}
                    </p>
                    <p className="text-sm mb-2">
                      <strong>Pickup:</strong> {assignedRide.pickup.address}
                    </p>
                    <p className="text-sm mb-2">
                      <strong>Destination:</strong> {assignedRide.dropoffs.map(d => d.address).join(', ')}
                    </p>
                    <p className="text-sm">
                      <strong>Status:</strong> {assignedRide.status === 'accepted' ? 'Navigate to pickup' : assignedRide.status === 'in_progress' ? 'In progress' : 'Completed'}
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
            </Card>
          </div>
        )}

        {/* Bottom Navigation for Mobile */}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-2 md:hidden z-20">
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