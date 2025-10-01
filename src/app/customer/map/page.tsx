'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Flag, Car, User, CreditCard, X, Check, Locate, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';
import { useAuth } from '@/contexts/auth-context';
import { useGoogleMaps } from '@/hooks/use-google-maps';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 6.9271, // Colombo, Sri Lanka
  lng: 79.8612,
};

type LatLng = { lat: number; lng: number };
type TripStatus = 'selecting' | 'requested' | 'driver_assigned' | 'in_progress' | 'completed' | 'driver_rejected';
type Driver = {
  id: string;
  name: string;
  rating: number;
  car: string;
  licensePlate: string;
  location: LatLng;
  isOnline: boolean;
};

const MapContent = ({ 
  center, 
  pickup, 
  dropoff, 
  directions,
  isLoaded, 
  loadError,
  onlineDrivers,
  onMapClick,
  selectingLocation
}: { 
  center: { lat: number; lng: number }; 
  pickup: { lat: number; lng: number } | null;
  dropoff: { lat: number; lng: number } | null;
  directions: google.maps.DirectionsResult | null;
  isLoaded: boolean;
  loadError: Error | undefined;
  onlineDrivers: Driver[];
  onMapClick?: (e: google.maps.MapMouseEvent) => void;
  selectingLocation: 'pickup' | 'dropoff' | null;
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
    <>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={pickup || dropoff ? 15 : 10}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: true,
        }}
        onClick={onMapClick}
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
        {directions && <DirectionsRenderer directions={directions} options={{
          polylineOptions: {
            strokeColor: '#0000FF',
            strokeWeight: 5,
            strokeOpacity: 0.8
          },
          suppressMarkers: true
        }} />}
        {onlineDrivers.map((driver) => (
          <Marker 
            key={driver.id} 
            position={driver.location} 
            icon={{
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 5,
              fillColor: "#0000FF",
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 1,
            }} 
          />
        ))}
      </GoogleMap>
      
      {/* Location selection indicator */}
      {selectingLocation && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-card text-card-foreground px-4 py-2 rounded-lg shadow-lg">
          <p className="font-medium">
            Click on the map to select {selectingLocation} location
          </p>
        </div>
      )}
    </>
  );
};

const MapWithLoader = ({ 
  center, 
  pickup, 
  dropoff, 
  directions,
  apiKey,
  onlineDrivers,
  onMapClick,
  selectingLocation
}: { 
  center: { lat: number; lng: number }; 
  pickup: { lat: number; lng: number } | null;
  dropoff: { lat: number; lng: number } | null;
  directions: google.maps.DirectionsResult | null;
  apiKey: string;
  onlineDrivers: Driver[];
  onMapClick?: (e: google.maps.MapMouseEvent) => void;
  selectingLocation: 'pickup' | 'dropoff' | null;
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script-map-page',
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
      onlineDrivers={onlineDrivers}
      onMapClick={onMapClick}
      selectingLocation={selectingLocation}
    />
  );
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

export default function MapPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [pickup, setPickup] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffs, setDropoffs] = useState<Array<{ lat: number; lng: number; address?: string }>>([]); // Array of dropoff points
  const [tripStatus, setTripStatus] = useState<TripStatus>('selecting');
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [cost, setCost] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [onlineDrivers, setOnlineDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [rejectedDrivers, setRejectedDrivers] = useState<string[]>([]);
  const [eta, setEta] = useState<number | null>(null);
  const [isCurrentLocation, setIsCurrentLocation] = useState(false); // Track if location was set via current location button
  const [selectingLocation, setSelectingLocation] = useState<'pickup' | 'dropoff' | null>(null); // Track which location is being selected
  const [dropoffInputs, setDropoffInputs] = useState<string[]>(['']); // Array of dropoff input values

  // Get API key from environment variable
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  // Use our custom hook to ensure Google Maps is loaded
  const { isLoaded: isGoogleMapsLoaded, error: googleMapsError } = useGoogleMaps(apiKey);

  // Only render map after component is mounted to avoid SSR issues
  useEffect(() => {
    setIsMounted(true);
    
    // Simulate fetching online drivers
    // In a real app, this would come from Firebase or an API
    const mockDrivers: Driver[] = [
      { 
        id: '1', 
        name: 'John D.', 
        rating: 4.9, 
        car: 'Toyota Prius', 
        licensePlate: 'BIA-123',
        location: { lat: 6.9271 + Math.random() * 0.1 - 0.05, lng: 79.8612 + Math.random() * 0.1 - 0.05 },
        isOnline: true
      },
      { 
        id: '2', 
        name: 'Sarah M.', 
        rating: 4.8, 
        car: 'Honda Civic', 
        licensePlate: 'BIA-456',
        location: { lat: 6.9271 + Math.random() * 0.1 - 0.05, lng: 79.8612 + Math.random() * 0.1 - 0.05 },
        isOnline: true
      },
      { 
        id: '3', 
        name: 'Michael T.', 
        rating: 4.7, 
        car: 'Nissan Sunny', 
        licensePlate: 'BIA-789',
        location: { lat: 6.9271 + Math.random() * 0.1 - 0.05, lng: 79.8612 + Math.random() * 0.1 - 0.05 },
        isOnline: true
      },
    ];
    
    setOnlineDrivers(mockDrivers);
  }, []);

  // Pickup autocomplete
  const {
    ready: pickupReady,
    value: pickupValue,
    suggestions: { status: pickupStatus, data: pickupData },
    setValue: setPickupValue,
    clearSuggestions: clearPickupSuggestions,
  } = usePlacesAutocomplete({
    callbackName: 'Function.prototype',
    requestOptions: {
      componentRestrictions: { country: 'lk' }, // Restrict to Sri Lanka
    },
    debounce: 300,
    initOnMount: isGoogleMapsLoaded,
  });

  // Dropoff autocomplete - now we need one for each dropoff input
  const dropoffAutocompleteHooks = dropoffInputs.map((_, index) => {
    return usePlacesAutocomplete({
      callbackName: 'Function.prototype',
      requestOptions: {
        componentRestrictions: { country: 'lk' }, // Restrict to Sri Lanka
      },
      debounce: 300,
      initOnMount: isGoogleMapsLoaded,
    });
  });

  const handlePickupInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPickupValue(e.target.value);
  };

  const handleDropoffInput = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const newDropoffInputs = [...dropoffInputs];
    newDropoffInputs[index] = e.target.value;
    setDropoffInputs(newDropoffInputs);
  };

  // Handle when user finishes typing in pickup field (e.g., onBlur)
  const handlePickupBlur = () => {
    // Only geocode if the user hasn't selected from autocomplete and we have a value
    if (pickupValue && !pickup) {
      getGeocode({ address: pickupValue })
        .then((results) => {
          const { lat, lng } = getLatLng(results[0]);
          setPickup({ lat, lng });
        })
        .catch((error) => {
          console.error('Error geocoding pickup address: ', error);
          // Optionally alert the user that we couldn't find the location
        });
    }
  };

  // Handle when user finishes typing in dropoff field (e.g., onBlur)
  const handleDropoffBlur = (index: number) => {
    // Only geocode if the user hasn't selected from autocomplete and we have a value
    if (dropoffInputs[index] && (dropoffs.length <= index || !dropoffs[index])) {
      getGeocode({ address: dropoffInputs[index] })
        .then((results) => {
          const { lat, lng } = getLatLng(results[0]);
          const newDropoffs = [...dropoffs];
          newDropoffs[index] = { lat, lng, address: dropoffInputs[index] };
          setDropoffs(newDropoffs);
        })
        .catch((error) => {
          console.error('Error geocoding dropoff address: ', error);
          // Optionally alert the user that we couldn't find the location
        });
    }
  };

  const handlePickupSelect = (description: string) => {
    setPickupValue(description, false);
    clearPickupSuggestions();

    getGeocode({ address: description })
      .then((results) => {
        const { lat, lng } = getLatLng(results[0]);
        setPickup({ lat, lng });
      })
      .catch((error) => {
        console.error('Error getting pickup coordinates: ', error);
      });
  };

  const handleDropoffSelect = (index: number, description: string) => {
    const newDropoffInputs = [...dropoffInputs];
    newDropoffInputs[index] = description;
    setDropoffInputs(newDropoffInputs);
    
    // Clear suggestions for this specific autocomplete
    if (dropoffAutocompleteHooks[index]) {
      dropoffAutocompleteHooks[index].clearSuggestions();
    }

    getGeocode({ address: description })
      .then((results) => {
        const { lat, lng } = getLatLng(results[0]);
        const newDropoffs = [...dropoffs];
        newDropoffs[index] = { lat, lng, address: description };
        setDropoffs(newDropoffs);
      })
      .catch((error) => {
        console.error('Error getting dropoff coordinates: ', error);
      });
  };

  // Function to add a new dropoff field
  const addDropoffField = () => {
    setDropoffInputs([...dropoffInputs, '']);
  };

  // Function to remove a dropoff field
  const removeDropoffField = (index: number) => {
    if (dropoffInputs.length > 1) {
      const newDropoffInputs = [...dropoffInputs];
      newDropoffInputs.splice(index, 1);
      setDropoffInputs(newDropoffInputs);
      
      const newDropoffs = [...dropoffs];
      newDropoffs.splice(index, 1);
      setDropoffs(newDropoffs);
    }
  };

  // Function to get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const currentLocation = { lat: latitude, lng: longitude };
          setPickup(currentLocation);
          setIsCurrentLocation(true); // Set flag when using current location
          
          // Reverse geocode to get address
          const geocoder = new google.maps.Geocoder();
          const latLng = new google.maps.LatLng(latitude, longitude);
          
          geocoder.geocode({ location: latLng }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              setPickupValue(results[0].formatted_address);
            } else {
              setPickupValue('Current Location');
              console.error('Geocoder failed due to: ' + status);
            }
          });
        },
        (error) => {
          console.error('Error getting current location:', error);
          alert('Unable to get your current location. Please try again or enter manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  // Function to handle map click
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (selectingLocation && e.latLng) {
      const location = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      };
      
      if (selectingLocation === 'pickup') {
        setPickup(location);
        // Reverse geocode to get address
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            setPickupValue(results[0].formatted_address);
          } else {
            setPickupValue(`Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`);
          }
        });
      } else if (selectingLocation === 'dropoff') {
        // Add to the last dropoff field or create a new one if all are filled
        const lastEmptyIndex = dropoffs.findIndex(d => !d.lat && !d.lng);
        const indexToUse = lastEmptyIndex >= 0 ? lastEmptyIndex : dropoffs.length;
        
        // Update dropoff inputs
        const newDropoffInputs = [...dropoffInputs];
        if (indexToUse >= newDropoffInputs.length) {
          newDropoffInputs.push('');
        }
        setDropoffInputs(newDropoffInputs);
        
        // Update dropoffs
        const newDropoffs = [...dropoffs];
        if (indexToUse >= newDropoffs.length) {
          newDropoffs.push({ lat: 0, lng: 0 });
        }
        newDropoffs[indexToUse] = { ...newDropoffs[indexToUse], ...location };
        setDropoffs(newDropoffs);
        
        // Reverse geocode to get address
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const newDropoffInputs = [...dropoffInputs];
            if (indexToUse >= newDropoffInputs.length) {
              newDropoffInputs.push('');
            }
            newDropoffInputs[indexToUse] = results[0].formatted_address;
            setDropoffInputs(newDropoffInputs);
            
            const newDropoffs = [...dropoffs];
            if (indexToUse >= newDropoffs.length) {
              newDropoffs.push({ lat: 0, lng: 0 });
            }
            newDropoffs[indexToUse] = { ...newDropoffs[indexToUse], address: results[0].formatted_address };
            setDropoffs(newDropoffs);
          } else {
            const newDropoffInputs = [...dropoffInputs];
            if (indexToUse >= newDropoffInputs.length) {
              newDropoffInputs.push('');
            }
            newDropoffInputs[indexToUse] = `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`;
            setDropoffInputs(newDropoffInputs);
          }
        });
        
        // Reset selecting location state
        setSelectingLocation(null);
      }
    }
  };

  // Calculate directions when both pickup and dropoff are set
  useEffect(() => {
    if (pickup && dropoffs.length > 0 && apiKey) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: pickup,
          destination: dropoffs[dropoffs.length - 1],
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
            
            // Extract distance and duration
            if (result.routes[0].legs[0]) {
              const leg = result.routes[0].legs[0];
              setDistance(leg.distance?.text || null);
              setDuration(leg.duration?.text || null);
              
              // Calculate cost (50 LKR per km)
              const distanceInKm = leg.distance?.value ? leg.distance.value / 1000 : 0;
              const calculatedCost = Math.round(distanceInKm * 50);
              setCost(calculatedCost);
            }
          } else {
            console.error('Error fetching directions:', status);
          }
        }
      );
    } else {
      setDirections(null);
      setDistance(null);
      setDuration(null);
      setCost(null);
    }
  }, [pickup, dropoffs, apiKey]);

  // Find nearest driver
  const findNearestDriver = useCallback(() => {
    if (!pickup || onlineDrivers.length === 0) return null;
    
    // Filter out rejected drivers
    const availableDrivers = onlineDrivers.filter(driver => 
      driver.isOnline && !rejectedDrivers.includes(driver.id)
    );
    
    if (availableDrivers.length === 0) return null;
    
    // Find the nearest driver based on pickup location
    let nearestDriver = availableDrivers[0];
    let shortestDistance = calculateDistance(
      pickup.lat, 
      pickup.lng, 
      nearestDriver.location.lat, 
      nearestDriver.location.lng
    );
    
    for (let i = 1; i < availableDrivers.length; i++) {
      const driver = availableDrivers[i];
      const distance = calculateDistance(
        pickup.lat, 
        pickup.lng, 
        driver.location.lat, 
        driver.location.lng
      );
      
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestDriver = driver;
      }
    }
    
    // Estimate ETA (simplified calculation)
    const estimatedEta = Math.round(shortestDistance * 2); // 2 minutes per km
    setEta(estimatedEta);
    
    return nearestDriver;
  }, [pickup, onlineDrivers, rejectedDrivers]);

  const handleRequestRide = async () => {
    // If pickup location is not set but we have a pickup value, geocode it
    if (!pickup && pickupValue) {
      try {
        const results = await getGeocode({ address: pickupValue });
        const { lat, lng } = getLatLng(results[0]);
        setPickup({ lat, lng });
      } catch (error) {
        console.error('Error geocoding pickup address: ', error);
        alert('Unable to locate the pickup address. Please select from the suggestions or try another address.');
        return;
      }
    }
    
    // If dropoff location is not set but we have dropoff values, geocode them
    const newDropoffs = [...dropoffs];
    for (let i = 0; i < dropoffInputs.length; i++) {
      if ((!dropoffs[i] || !dropoffs[i].lat) && dropoffInputs[i]) {
        try {
          const results = await getGeocode({ address: dropoffInputs[i] });
          const { lat, lng } = getLatLng(results[0]);
          newDropoffs[i] = { lat, lng, address: dropoffInputs[i] };
        } catch (error) {
          console.error('Error geocoding dropoff address: ', error);
          alert(`Unable to locate destination ${i + 1}. Please select from the suggestions or try another address.`);
          return;
        }
      }
    }
    setDropoffs(newDropoffs);
    
    if (pickup && newDropoffs.length > 0 && newDropoffs.every(d => d && d.lat)) {
      setTripStatus('requested');
      setRejectedDrivers([]); // Reset rejected drivers list
      
      // Simulate driver assignment
      setTimeout(() => {
        const nearestDriver = findNearestDriver();
        if (nearestDriver) {
          setSelectedDriver(nearestDriver);
          setTripStatus('driver_assigned');
          
          // Simulate driver acceptance after 3 seconds
          setTimeout(() => {
            // Randomly simulate driver acceptance or rejection for demo
            const driverAccepts = Math.random() > 0.3; // 70% chance of acceptance
            if (driverAccepts) {
              setTripStatus('in_progress');
            } else {
              handleDriverRejection();
            }
          }, 3000);
        } else {
          // No drivers available
          alert('No drivers available at the moment. Please try again later.');
          setTripStatus('selecting');
        }
      }, 2000);
    }
  };

  const handleDriverRejection = () => {
    setTripStatus('driver_rejected');
    
    // Add current driver to rejected list
    if (selectedDriver) {
      setRejectedDrivers(prev => [...prev, selectedDriver.id]);
    }
    
    // Try to find another driver after a short delay
    setTimeout(() => {
      const nextDriver = findNearestDriver();
      if (nextDriver) {
        setSelectedDriver(nextDriver);
        setTripStatus('driver_assigned');
        
        // Simulate next driver's decision
        setTimeout(() => {
          const driverAccepts = Math.random() > 0.3; // 70% chance of acceptance
          if (driverAccepts) {
            setTripStatus('in_progress');
          } else {
            handleDriverRejection();
          }
        }, 3000);
      } else {
        // No more drivers available
        alert('No drivers available at the moment. Please try again later.');
        setTripStatus('selecting');
      }
    }, 2000);
  };

  const handleStartTrip = () => {
    // In a real app, this would update the trip status in the backend
    setTripStatus('in_progress');
  };

  const handleEndTrip = () => {
    // In a real app, this would update the trip status in the backend
    setTripStatus('completed');
  };

  const handleConfirmPayment = () => {
    // In a real app, this would process the payment
    alert('Payment confirmed! Trip completed.');
    resetTrip();
  };

  const resetTrip = () => {
    setPickup(null);
    setDropoffs([]);
    setDirections(null);
    setDistance(null);
    setDuration(null);
    setCost(null);
    setTripStatus('selecting');
    setSelectedDriver(null);
    setRejectedDrivers([]);
    setEta(null);
    setPickupValue('');
    setDropoffInputs(['']);
  };

  const center = pickup || dropoffs[dropoffs.length - 1] || defaultCenter;

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
            pickup={pickup} 
            dropoff={dropoffs[dropoffs.length - 1]}
            directions={directions}
            apiKey={apiKey}
            onlineDrivers={onlineDrivers}
            onMapClick={handleMapClick}
            selectingLocation={selectingLocation}
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

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
        <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl">
          {tripStatus === 'selecting' && (
            <>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Where to?</CardTitle>
                <CardDescription>
                  Enter your pickup and dropoff locations.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex gap-2">
                  <Button
                    variant={selectingLocation === 'pickup' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectingLocation(selectingLocation === 'pickup' ? null : 'pickup')}
                    className="flex-1"
                  >
                    <MapPin className="h-4 w-4 mr-2 text-green-500" />
                    Set Pickup
                  </Button>
                  <Button
                    variant={selectingLocation === 'dropoff' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectingLocation(selectingLocation === 'dropoff' ? null : 'dropoff')}
                    className="flex-1"
                  >
                    <Flag className="h-4 w-4 mr-2 text-red-500" />
                    Set Dropoff
                  </Button>
                </div>
                
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                  <Input
                    value={pickupValue}
                    onChange={(e) => {
                      handlePickupInput(e);
                      setIsCurrentLocation(false); // Reset flag when user types
                    }}
                    onBlur={handlePickupBlur}
                    disabled={!pickupReady}
                    placeholder="Enter pickup location"
                    className="pl-10 pr-10" // Added padding for the button
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={getCurrentLocation}
                    title="Use current location"
                  >
                    <Locate className="h-4 w-4" />
                  </Button>
                  {pickupStatus === 'OK' && !isCurrentLocation && (
                    <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {pickupData.map(({ place_id, structured_formatting }) => (
                        <div
                          key={place_id}
                          onClick={() => handlePickupSelect(structured_formatting.main_text + ', ' + structured_formatting.secondary_text)}
                          className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                        >
                          <p className="font-medium">{structured_formatting.main_text}</p>
                          <p className="text-sm text-muted-foreground">{structured_formatting.secondary_text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Multiple Dropoff Fields */}
                {dropoffInputs.map((dropoffValue, index) => (
                  <div key={index} className="relative">
                    {index === 0 ? (
                      <Flag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                    ) : (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                    )}
                    <Input
                      value={dropoffValue}
                      onChange={(e) => handleDropoffInput(index, e)}
                      onBlur={() => handleDropoffBlur(index)}
                      disabled={!dropoffAutocompleteHooks[index] || !dropoffAutocompleteHooks[index].ready}
                      placeholder={`Enter destination ${index + 1}`}
                      className="pl-10 pr-16" // Increased padding for both buttons
                    />
                    {index === 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={addDropoffField}
                        title="Add another destination"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => removeDropoffField(index)}
                        title="Remove this destination"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                    {dropoffAutocompleteHooks[index] && dropoffAutocompleteHooks[index].suggestions.status === 'OK' && (
                      <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {dropoffAutocompleteHooks[index].suggestions.data.map(({ place_id, structured_formatting }) => (
                          <div
                            key={place_id}
                            onClick={() => handleDropoffSelect(index, structured_formatting.main_text + ', ' + structured_formatting.secondary_text)}
                            className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                          >
                            <p className="font-medium">{structured_formatting.main_text}</p>
                            <p className="text-sm text-muted-foreground">{structured_formatting.secondary_text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Show Add Button if no extra fields yet */}
                {dropoffInputs.length === 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addDropoffField}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Destination
                  </Button>
                )}
                
                {(distance || duration || cost) && (
                  <div className="grid grid-cols-3 gap-2 p-2 bg-secondary rounded-lg">
                    {distance && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Distance</p>
                        <p className="font-medium">{distance}</p>
                      </div>
                    )}
                    {duration && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-medium">{duration}</p>
                      </div>
                    )}
                    {cost && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Cost</p>
                        <p className="font-medium">LKR {cost}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleRequestRide} 
                  className="w-full" 
                  disabled={!pickup || dropoffs.length === 0 || !dropoffs.every(d => d && d.lat)}
                >
                  Request Ride
                </Button>
              </CardFooter>
            </>
          )}
          
          {tripStatus === 'requested' && (
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Finding a driver</h3>
              <p className="text-muted-foreground">We're searching for the nearest available driver</p>
            </CardContent>
          )}
          
          {tripStatus === 'driver_assigned' && (
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Driver Assigned</h3>
                <Car className="h-6 w-6 text-primary" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-primary rounded-full p-2">
                  <User className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium">{selectedDriver?.name || 'Driver'}</p>
                  <p className="text-sm text-muted-foreground">{selectedDriver?.rating} ★ ({Math.floor(Math.random() * 100) + 50} trips)</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary rounded-lg mb-4">
                <span className="text-sm">{selectedDriver?.car} • {selectedDriver?.licensePlate}</span>
                <span className="text-sm font-medium">{eta || '5'} min away</span>
              </div>
              <p className="text-center text-sm text-muted-foreground mb-4">
                Waiting for driver to accept...
              </p>
              <div className="flex justify-center">
                <div className="animate-pulse flex space-x-2">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                </div>
              </div>
            </CardContent>
          )}
          
          {tripStatus === 'driver_rejected' && (
            <CardContent className="p-6 text-center">
              <X className="h-12 w-12 text-red-500 mx-auto mb-2" />
              <h3 className="text-xl font-semibold mb-2">Driver Unavailable</h3>
              <p className="text-muted-foreground mb-4">Looking for another driver...</p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          )}
          
          {tripStatus === 'in_progress' && (
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">On the way</h3>
                <Navigation className="h-6 w-6 text-primary" />
              </div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="text-sm truncate">{pickupValue || 'Pickup location'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-red-500" />
                  <span className="text-sm truncate">{dropoffValue || 'Destination'}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 p-2 bg-secondary rounded-lg mb-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="font-medium">{distance || 'N/A'}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">{duration || 'N/A'}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="font-medium">LKR {cost || '0'}</p>
                </div>
              </div>
              <Button onClick={handleEndTrip} className="w-full">
                End Trip
              </Button>
            </CardContent>
          )}
          
          {tripStatus === 'completed' && (
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <CreditCard className="h-12 w-12 text-primary mx-auto mb-2" />
                <h3 className="text-xl font-semibold">Trip Completed</h3>
                <p className="text-muted-foreground">Please confirm payment</p>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Distance:</span>
                  <span className="font-medium">{distance || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{duration || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total:</span>
                  <span>LKR {cost || '0'}</span>
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