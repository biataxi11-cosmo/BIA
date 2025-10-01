'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, Flag, Car, User, CreditCard, Play, Square, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 6.9271, // Colombo, Sri Lanka
  lng: 79.8612,
};

type LatLng = { lat: number; lng: number };
type TripStatus = 'offline' | 'online' | 'assigned' | 'pickup' | 'in_progress' | 'completed';
type Trip = {
  id: string;
  pickup: LatLng;
  dropoff: LatLng;
  pickupAddress: string;
  dropoffAddress: string;
  customerName: string;
  customerPhone: string;
  distance: string;
  duration: string;
  cost: number;
};

const MapContent = ({ 
  center, 
  pickup, 
  dropoff, 
  directions,
  isLoaded, 
  loadError,
  customerLocation
}: { 
  center: { lat: number; lng: number }; 
  pickup: { lat: number; lng: number } | null;
  dropoff: { lat: number; lng: number } | null;
  directions: google.maps.DirectionsResult | null;
  isLoaded: boolean;
  loadError: Error | undefined;
  customerLocation: LatLng | null;
}) => {
  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Map</h2>
          <p className="text-muted-foreground mb-4">Please check your API key and try again.</p>
          <p className="text-sm text-muted-foreground">Error: {loadError.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={pickup || dropoff ? 15 : 10}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        streetViewControl: true,
      }}
    >
      {pickup && <Marker position={pickup} icon={{
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#00FF00",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
      }} />}
      {dropoff && <Marker position={dropoff} icon={{
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#FF0000",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
      }} />}
      {customerLocation && <Marker position={customerLocation} icon={{
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#0000FF",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
      }} />}
      {directions && <DirectionsRenderer directions={directions} options={{
        polylineOptions: {
          strokeColor: '#0000FF',
          strokeWeight: 5,
          strokeOpacity: 0.8
        },
        suppressMarkers: true
      }} />}
    </GoogleMap>
  );
};

const MapWithLoader = ({ 
  center, 
  pickup, 
  dropoff, 
  directions,
  apiKey,
  customerLocation
}: { 
  center: { lat: number; lng: number }; 
  pickup: { lat: number; lng: number } | null;
  dropoff: { lat: number; lng: number } | null;
  directions: google.maps.DirectionsResult | null;
  apiKey: string;
  customerLocation: LatLng | null;
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script-driver-map',
    googleMapsApiKey: apiKey,
    libraries: ['places', 'routes']
  });

  return (
    <MapContent 
      center={center} 
      pickup={pickup}
      dropoff={dropoff}
      directions={directions}
      isLoaded={isLoaded} 
      loadError={loadError} 
      customerLocation={customerLocation}
    />
  );
};

export default function DriverMapPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [driverLocation, setDriverLocation] = useState<LatLng | null>(null);
  const [customerLocation, setCustomerLocation] = useState<LatLng | null>(null);
  const [tripStatus, setTripStatus] = useState<TripStatus>('online');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Get API key from environment variable
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Only render map after component is mounted to avoid SSR issues
  useEffect(() => {
    setIsMounted(true);
    
    // Get driver's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setDriverLocation(location);
        },
        (error) => {
          console.error('Error getting driver location:', error);
          // Fallback to default location
          setDriverLocation(defaultCenter);
        }
      );
    } else {
      // Fallback to default location
      setDriverLocation(defaultCenter);
    }
    
    // Simulate a trip assignment
    setTimeout(() => {
      const mockTrip: Trip = {
        id: 'trip_123',
        pickup: { lat: 6.9271 + Math.random() * 0.01, lng: 79.8612 + Math.random() * 0.01 },
        dropoff: { lat: 6.9271 + Math.random() * 0.01, lng: 79.8612 + Math.random() * 0.01 },
        pickupAddress: '123 Main St, Colombo',
        dropoffAddress: '456 Market St, Colombo',
        customerName: 'Alex Johnson',
        customerPhone: '+94 77 123 4567',
        distance: '5.2 km',
        duration: '12 min',
        cost: 260
      };
      
      setTrip(mockTrip);
      setCustomerLocation(mockTrip.pickup);
      setTripStatus('assigned');
    }, 2000);
  }, []);

  // Check if Google Maps is loaded
  const isGoogleMapsLoaded = typeof google !== 'undefined' && google.maps;

  // Calculate directions when locations change
  useEffect(() => {
    if (driverLocation && customerLocation && apiKey && tripStatus === 'assigned') {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: driverLocation,
          destination: customerLocation,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
          } else {
            console.error('Error fetching directions:', status);
          }
        }
      );
    } else if (trip?.pickup && trip?.dropoff && apiKey && tripStatus === 'pickup') {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: trip.pickup,
          destination: trip.dropoff,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
          } else {
            console.error('Error fetching directions:', status);
          }
        }
      );
    } else {
      setDirections(null);
    }
  }, [driverLocation, customerLocation, trip, tripStatus, apiKey]);

  const handleAcceptTrip = () => {
    setTripStatus('pickup');
  };

  const handleRejectTrip = () => {
    // In a real app, this would notify the backend to assign to another driver
    alert('Trip rejected. Looking for another driver...');
    setTripStatus('online');
    setTrip(null);
    setCustomerLocation(null);
  };

  const handleStartTrip = () => {
    setTripStatus('in_progress');
    setCustomerLocation(trip?.dropoff || null);
  };

  const handleEndTrip = () => {
    setTripStatus('completed');
  };

  const handleConfirmPayment = () => {
    // In a real app, this would process the payment
    alert('Payment confirmed! Trip completed.');
    resetTrip();
  };

  const resetTrip = () => {
    setTripStatus('online');
    setTrip(null);
    setCustomerLocation(null);
    setDirections(null);
  };

  const center = driverLocation || defaultCenter;

  // Don't render map if API key is missing
  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Google Maps API Key Missing</h2>
          <p className="text-muted-foreground">Please configure your Google Maps API key in the environment variables.</p>
        </div>
      </div>
    );
  }

  // Show loading state while component is mounting
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Map Container */}
      <div className="absolute inset-0">
        {isMounted && apiKey ? (
          <MapWithLoader 
            center={center} 
            pickup={tripStatus === 'pickup' ? trip?.pickup || null : null}
            dropoff={tripStatus === 'in_progress' ? trip?.dropoff || null : null}
            directions={directions}
            apiKey={apiKey}
            customerLocation={customerLocation}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        )}
      </div>
      
      {/* Header */}
      <div className="absolute top-4 left-4 z-20">
        <Button variant="outline" size="icon" className="rounded-full h-12 w-12 bg-card" onClick={() => router.back()}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
          </svg>
        </Button>
      </div>
      
      {/* Status Indicator */}
      <div className="absolute top-4 right-4 z-20">
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          tripStatus === 'online' ? 'bg-green-100 text-green-800' : 
          tripStatus === 'assigned' ? 'bg-yellow-100 text-yellow-800' : 
          tripStatus === 'pickup' || tripStatus === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
          'bg-gray-100 text-gray-800'
        }`}>
          {tripStatus === 'online' ? 'Online' : 
           tripStatus === 'assigned' ? 'Trip Assigned' : 
           tripStatus === 'pickup' ? 'Heading to Pickup' : 
           tripStatus === 'in_progress' ? 'In Progress' : 'Offline'}
        </div>
      </div>

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
        <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl">
          {tripStatus === 'online' && (
            <CardContent className="p-6 text-center">
              <Map className="h-12 w-12 text-primary mx-auto mb-2" />
              <h3 className="text-xl font-semibold mb-2">Waiting for Rides</h3>
              <p className="text-muted-foreground mb-4">You're online and ready to accept rides</p>
              <div className="flex justify-center">
                <div className="animate-pulse flex space-x-2">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                </div>
              </div>
            </CardContent>
          )}
          
          {tripStatus === 'assigned' && trip && (
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">New Ride Request</h3>
                <Car className="h-6 w-6 text-primary" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-primary rounded-full p-2">
                  <User className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium">{trip.customerName}</p>
                  <p className="text-sm text-muted-foreground">{trip.customerPhone}</p>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="text-sm truncate">{trip.pickupAddress}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-red-500" />
                  <span className="text-sm truncate">{trip.dropoffAddress}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 p-2 bg-secondary rounded-lg mb-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="font-medium">{trip.distance}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">{trip.duration}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="font-medium">LKR {trip.cost}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleRejectTrip} variant="outline" className="flex-1">
                  Reject
                </Button>
                <Button onClick={handleAcceptTrip} className="flex-1">
                  Accept
                </Button>
              </div>
            </CardContent>
          )}
          
          {tripStatus === 'pickup' && trip && (
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Heading to Pickup</h3>
                <Navigation className="h-6 w-6 text-primary" />
              </div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="text-sm truncate">{trip.pickupAddress}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-red-500" />
                  <span className="text-sm truncate">{trip.dropoffAddress}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 p-2 bg-secondary rounded-lg mb-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="font-medium">{trip.distance}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">{trip.duration}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="font-medium">LKR {trip.cost}</p>
                </div>
              </div>
              <Button onClick={handleStartTrip} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Arrived - Start Trip
              </Button>
            </CardContent>
          )}
          
          {tripStatus === 'in_progress' && trip && (
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Trip in Progress</h3>
                <Car className="h-6 w-6 text-primary" />
              </div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="text-sm truncate">{trip.pickupAddress}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-red-500" />
                  <span className="text-sm truncate">{trip.dropoffAddress}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 p-2 bg-secondary rounded-lg mb-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="font-medium">{trip.distance}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">{trip.duration}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="font-medium">LKR {trip.cost}</p>
                </div>
              </div>
              <Button onClick={handleEndTrip} className="w-full">
                <Square className="h-4 w-4 mr-2" />
                End Trip
              </Button>
            </CardContent>
          )}
          
          {tripStatus === 'completed' && trip && (
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <CreditCard className="h-12 w-12 text-primary mx-auto mb-2" />
                <h3 className="text-xl font-semibold">Trip Completed</h3>
                <p className="text-muted-foreground">Please confirm payment</p>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Distance:</span>
                  <span className="font-medium">{trip.distance}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{trip.duration}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total:</span>
                  <span>LKR {trip.cost}</span>
                </div>
              </div>
              <Button onClick={handleConfirmPayment} className="w-full">
                Confirm Payment
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}