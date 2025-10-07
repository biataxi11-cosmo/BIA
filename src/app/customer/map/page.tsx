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
  type HookReturn,
  type Suggestion
} from 'use-places-autocomplete';
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';
import { useAuth } from '@/contexts/auth-context';
import { useGoogleMaps } from '@/hooks/use-google-maps';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, onSnapshot, query, where, GeoPoint } from 'firebase/firestore';

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
  // Additional driver details
  phoneNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleColor?: string;
};

// Add a new type for waypoints
type Waypoint = {
  location: LatLng;
  stopover: boolean;
};

const MapContent = ({ 
  center, 
  pickup, 
  dropoffs, // Changed from single dropoff to array
  directions,
  isLoaded, 
  loadError,
  onlineDrivers,
  driversLoading,
  driversError,
  onMapClick,
  selectingLocation
}: { 
  center: { lat: number; lng: number }; 
  pickup: { lat: number; lng: number } | null;
  dropoffs: Array<{ lat: number; lng: number; address?: string }>; // Updated to array
  directions: google.maps.DirectionsResult | null;
  isLoaded: boolean;
  loadError: Error | undefined;
  onlineDrivers: Driver[];
  driversLoading: boolean;
  driversError: string | null;
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

  console.log('Rendering map with drivers:', onlineDrivers);

  return (
    <>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={pickup || dropoffs.length > 0 ? 15 : 10}
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
        {/* Render all dropoff points with red markers */}
        {dropoffs.map((dropoff, index) => (
          dropoff && dropoff.lat !== 0 && dropoff.lng !== 0 ? (
            <Marker 
              key={index} 
              position={{ lat: dropoff.lat, lng: dropoff.lng }} 
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: "#FF0000",
                fillOpacity: 1,
                strokeColor: "#FFFFFF",
                strokeWeight: 2,
              }} 
              label={{
                text: (index + 1).toString(),
                color: "white",
                fontSize: "12px",
                fontWeight: "bold"
              }}
            />
          ) : null
        ))}
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
      
      {/* Driver loading indicator */}
      {driversLoading && (
        <div className="absolute top-4 right-4 z-10 bg-card text-card-foreground px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <p className="text-sm font-medium">Loading drivers...</p>
          </div>
        </div>
      )}
      
      {/* Driver error indicator */}
      {driversError && (
        <div className="absolute top-4 right-4 z-10 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm font-medium">{driversError}</p>
        </div>
      )}
      
      {/* Driver count indicator */}
      {!driversLoading && !driversError && (
        <div className="absolute bottom-4 right-4 z-10 bg-card text-card-foreground px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm font-medium">
            {onlineDrivers.length} driver{onlineDrivers.length !== 1 ? 's' : ''} online
          </p>
          {onlineDrivers.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Showing {onlineDrivers.length} driver{onlineDrivers.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </>
  );
};

const MapWithLoader = ({ 
  center, 
  pickup, 
  dropoffs, // Changed from single dropoff to array
  directions,
  apiKey,
  onlineDrivers,
  driversLoading,
  driversError,
  onMapClick,
  selectingLocation
}: { 
  center: { lat: number; lng: number }; 
  pickup: { lat: number; lng: number } | null;
  dropoffs: Array<{ lat: number; lng: number; address?: string }>; // Updated to array
  directions: google.maps.DirectionsResult | null;
  apiKey: string;
  onlineDrivers: Driver[];
  driversLoading: boolean;
  driversError: string | null;
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
      dropoffs={dropoffs} // Pass array instead of single dropoff
      directions={directions}
      isLoaded={isLoaded} 
      loadError={loadError} 
      onlineDrivers={onlineDrivers}
      driversLoading={driversLoading}
      driversError={driversError}
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
  const [dropoffs, setDropoffs] = useState<Array<{ lat: number; lng: number; address?: string }>>([{ lat: 0, lng: 0, address: '' }]);
  const [tripStatus, setTripStatus] = useState<TripStatus>('selecting');
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [cost, setCost] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [onlineDrivers, setOnlineDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driversError, setDriversError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [rejectedDrivers, setRejectedDrivers] = useState<string[]>([]);
  const [eta, setEta] = useState<number | null>(null);
  const [isCurrentLocation, setIsCurrentLocation] = useState(false);
  const [selectingLocation, setSelectingLocation] = useState<'pickup' | 'dropoff' | null>(null);
  const [dropoffInputs, setDropoffInputs] = useState<string[]>(['']);
  const [rideId, setRideId] = useState<string | null>(null);

  // Get API key from environment variable
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  // Use our custom hook to ensure Google Maps is loaded
  const { isLoaded: isGoogleMapsLoaded, error: googleMapsError } = useGoogleMaps(apiKey);

  // Load online drivers from Firebase
  useEffect(() => {
    setDriversLoading(true);
    setDriversError(null);
    
    console.log('Starting to fetch online drivers...');
    
    // Query for all online drivers from the dedicated driverLocations collection
    // This provides better security and performance for real-time updates
    const driversQuery = query(
      collection(db, 'driverLocations'),
      where('isOnline', '==', true)
    );
    
    const unsubscribe = onSnapshot(driversQuery, 
      (snapshot) => {
        console.log('Received snapshot update for online drivers:', snapshot.size);
        const drivers: Driver[] = [];
        
        if (snapshot.empty) {
          console.log('No drivers found in snapshot');
        }
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Driver document data:', doc.id, data);
          
          // Check if location exists and handle GeoPoint format
          let locationData = null;
          if (data.location && data.location instanceof GeoPoint) {
            locationData = {
              lat: data.location.latitude,
              lng: data.location.longitude
            };
          }
          
          // Log for debugging
          console.log('Location data check for driver', doc.id, ':', {
            hasLocation: !!data.location,
            isGeoPoint: data.location instanceof GeoPoint,
            locationData: locationData,
            isOnline: data.isOnline
          });
          
          if (locationData && data.isOnline) {
            const driver: Driver = {
              id: data.driverId || doc.id,
              name: data.name || 'Unknown Driver',
              rating: data.rating || 5.0,
              car: data.car || 'Unknown Car',
              licensePlate: data.licensePlate || 'Unknown',
              location: locationData,
              isOnline: data.isOnline || false,
              // Additional driver details
              phoneNumber: data.phoneNumber || '',
              vehicleMake: data.vehicleMake || '',
              vehicleModel: data.vehicleModel || '',
              vehicleYear: data.vehicleYear || '',
              vehicleColor: data.vehicleColor || '',
            };
            
            console.log('Adding driver to list:', driver);
            drivers.push(driver);
          } else {
            console.log('Skipping driver due to missing location data or offline status:', doc.id);
          }
        });
        
        console.log('Final drivers list:', drivers);
        setOnlineDrivers(drivers);
        setDriversLoading(false);
      },
      (error) => {
        console.error('Error fetching online drivers:', error);
        setDriversError('Failed to load driver locations. Please try again.');
        setDriversLoading(false);
      }
    );
    
    return () => {
      console.log('Unsubscribing from driver locations');
      unsubscribe();
    };
  }, []);

  // Only render map after component is mounted to avoid SSR issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Single pickup autocomplete
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

  // Create a fixed array of dropoff autocomplete hooks (max 5 dropoff points)
  const maxDropoffs = 5;
  const dropoffAutocomplete1 = usePlacesAutocomplete({
    callbackName: 'Function.prototype',
    requestOptions: {
      componentRestrictions: { country: 'lk' },
    },
    debounce: 300,
    initOnMount: isGoogleMapsLoaded,
  });
  
  const dropoffAutocomplete2 = usePlacesAutocomplete({
    callbackName: 'Function.prototype',
    requestOptions: {
      componentRestrictions: { country: 'lk' },
    },
    debounce: 300,
    initOnMount: isGoogleMapsLoaded,
  });
  
  const dropoffAutocomplete3 = usePlacesAutocomplete({
    callbackName: 'Function.prototype',
    requestOptions: {
      componentRestrictions: { country: 'lk' },
    },
    debounce: 300,
    initOnMount: isGoogleMapsLoaded,
  });
  
  const dropoffAutocomplete4 = usePlacesAutocomplete({
    callbackName: 'Function.prototype',
    requestOptions: {
      componentRestrictions: { country: 'lk' },
    },
    debounce: 300,
    initOnMount: isGoogleMapsLoaded,
  });
  
  const dropoffAutocomplete5 = usePlacesAutocomplete({
    callbackName: 'Function.prototype',
    requestOptions: {
      componentRestrictions: { country: 'lk' },
    },
    debounce: 300,
    initOnMount: isGoogleMapsLoaded,
  });

  // Array of dropoff autocomplete hooks
  const dropoffAutocompleteHooks = [
    dropoffAutocomplete1,
    dropoffAutocomplete2,
    dropoffAutocomplete3,
    dropoffAutocomplete4,
    dropoffAutocomplete5
  ];

  const handlePickupInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPickupValue(e.target.value);
  };

  const handleDropoffInput = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const newDropoffInputs = [...dropoffInputs];
    newDropoffInputs[index] = e.target.value;
    setDropoffInputs(newDropoffInputs);
    
    // Update the corresponding autocomplete hook
    if (dropoffAutocompleteHooks[index]) {
      dropoffAutocompleteHooks[index].setValue(e.target.value);
    }
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
    if (dropoffInputs[index] && (dropoffs.length <= index || !dropoffs[index] || !dropoffs[index].lat)) {
      getGeocode({ address: dropoffInputs[index] })
        .then((results) => {
          const { lat, lng } = getLatLng(results[0]);
          const newDropoffs = [...dropoffs];
          // Ensure the array has enough elements
          while (newDropoffs.length <= index) {
            newDropoffs.push({ lat: 0, lng: 0 });
          }
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
        // Ensure the array has enough elements
        while (newDropoffs.length <= index) {
          newDropoffs.push({ lat: 0, lng: 0 });
        }
        newDropoffs[index] = { lat, lng, address: description };
        setDropoffs(newDropoffs);
      })
      .catch((error) => {
        console.error('Error getting dropoff coordinates: ', error);
      });
  };

  // Function to add a new dropoff field - only allowed when all existing fields are filled
  const addDropoffField = () => {
    // Check if all existing fields are filled (not lat:0, lng:0)
    const allFieldsFilled = dropoffs.every(d => d && d.lat !== 0 && d.lng !== 0);
    
    if (allFieldsFilled && dropoffInputs.length < maxDropoffs) {
      setDropoffInputs([...dropoffInputs, '']);
      setDropoffs([...dropoffs, { lat: 0, lng: 0, address: '' }]); // Add empty dropoff object
    } else if (!allFieldsFilled) {
      // Alert user that they need to fill all fields first
      alert("Please fill all existing destination fields before adding a new one.");
    }
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
      
      // Clear the autocomplete value for the removed field
      if (dropoffAutocompleteHooks[index]) {
        dropoffAutocompleteHooks[index].setValue('');
      }
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
        // Reverse geocode to get address first
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location }, (results, status) => {
          const address = status === 'OK' && results && results[0] 
            ? results[0].formatted_address 
            : `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`;
          
          // Check if we have an empty dropoff field we can use (fields without valid coordinates)
          // Consider a field empty if it has lat:0 and lng:0 (our initial state)
          let emptyIndex = dropoffs.findIndex(d => d && d.lat === 0 && d.lng === 0);
          
          if (emptyIndex !== -1) {
            // Use existing empty field
            const newDropoffs = [...dropoffs];
            newDropoffs[emptyIndex] = { ...location, address };
            setDropoffs(newDropoffs);
            
            const newDropoffInputs = [...dropoffInputs];
            newDropoffInputs[emptyIndex] = address;
            setDropoffInputs(newDropoffInputs);
          } else {
            // Check if we can add a new field (only if all existing fields are filled and we haven't reached the limit)
            const allFieldsFilled = dropoffs.every(d => d && d.lat !== 0 && d.lng !== 0);
            if (allFieldsFilled && dropoffInputs.length < maxDropoffs) {
              // Add new field for this dropoff
              const newDropoffs = [...dropoffs, { ...location, address }];
              setDropoffs(newDropoffs);
              
              const newDropoffInputs = [...dropoffInputs, address];
              setDropoffInputs(newDropoffInputs);
            } else if (!allFieldsFilled) {
              // Alert user that they need to fill all fields first
              alert("Please fill all existing destination fields before adding a new one.");
            } else {
              // Reached max dropoffs
              console.log("Maximum number of destinations reached.");
            }
          }
        });
      }
    }
  };

  // Calculate directions when both pickup and dropoff are set
  useEffect(() => {
    if (pickup && dropoffs.length > 0 && apiKey) {
      // Filter out any empty dropoff points
      const validDropoffs = dropoffs.filter(d => d && d.lat && d.lng);
      if (validDropoffs.length === 0) {
        setDirections(null);
        setDistance(null);
        setDuration(null);
        setCost(null);
        return;
      }
      
      const directionsService = new google.maps.DirectionsService();
      
      // Create waypoints for all dropoffs except the last one
      const waypoints: google.maps.DirectionsWaypoint[] = validDropoffs
        .slice(0, -1) // All dropoffs except the last one
        .map(dropoff => ({
          location: new google.maps.LatLng(dropoff.lat, dropoff.lng),
          stopover: true
        }));

      directionsService.route(
        {
          origin: new google.maps.LatLng(pickup.lat, pickup.lng),
          destination: new google.maps.LatLng(validDropoffs[validDropoffs.length - 1].lat, validDropoffs[validDropoffs.length - 1].lng),
          waypoints: waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
            
            // Calculate total distance and duration from all legs
            let totalDistance = 0;
            let totalDuration = 0;
            
            result.routes[0].legs.forEach(leg => {
              if (leg.distance) totalDistance += leg.distance.value;
              if (leg.duration) totalDuration += leg.duration.value;
            });
            
            // Format distance and duration
            const distanceInKm = totalDistance / 1000;
            const durationInMinutes = Math.round(totalDuration / 60);
            
            setDistance(`${distanceInKm.toFixed(1)} km`);
            setDuration(`${durationInMinutes} min`);
            
            // Calculate cost (50 LKR per km)
            const calculatedCost = Math.round(distanceInKm * 50);
            setCost(calculatedCost);
          } else {
            console.error('Error fetching directions:', status);
            setDirections(null);
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

  // Function to handle ride request
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
    
    // If dropoff locations are not set but we have dropoff values, geocode them
    const newDropoffs = [...dropoffs];
    for (let i = 0; i < dropoffInputs.length; i++) {
      if ((!dropoffs[i] || !dropoffs[i].lat) && dropoffInputs[i]) {
        try {
          const results = await getGeocode({ address: dropoffInputs[i] });
          const { lat, lng } = getLatLng(results[0]);
          // Ensure the array has enough elements
          while (newDropoffs.length <= i) {
            newDropoffs.push({ lat: 0, lng: 0 });
          }
          newDropoffs[i] = { lat, lng, address: dropoffInputs[i] };
        } catch (error) {
          console.error('Error geocoding dropoff address: ', error);
          alert(`Unable to locate destination ${i + 1}. Please select from the suggestions or try another address.`);
          return;
        }
      }
    }
    setDropoffs(newDropoffs);
    
    // Check if we have valid pickup and at least one valid dropoff
    const validDropoffs = newDropoffs.filter(d => d && d.lat && d.lng);
    if (pickup && validDropoffs.length > 0 && user) {
      setTripStatus('requested');
      setRejectedDrivers([]); // Reset rejected drivers list
      
      try {
        // Create a ride request in Firestore
        const rideData = {
          customerId: user.uid,
          customerName: userProfile?.fullName || user.displayName || 'Customer',
          customerPhone: userProfile?.phoneNumber || '',
          pickup: {
            lat: pickup.lat,
            lng: pickup.lng,
            address: pickupValue
          },
          dropoffs: validDropoffs.map((dropoff, index) => ({
            lat: dropoff.lat,
            lng: dropoff.lng,
            address: dropoff.address || dropoffInputs[index] || `Destination ${index + 1}`
          })),
          status: 'requested',
          distance: distance || null,
          duration: duration || null,
          cost: cost || null,
          requestedAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(collection(db, 'rides'), rideData);
        setRideId(docRef.id);
        console.log('Ride request created with ID:', docRef.id);
      } catch (error) {
        console.error('Error creating ride request:', error);
        alert('Failed to request ride. Please try again.');
        setTripStatus('selecting');
        return;
      }
    }
  };

  // Listen for ride status updates
  useEffect(() => {
    if (!rideId) return;
    
    const rideRef = doc(db, 'rides', rideId);
    const unsubscribe = onSnapshot(rideRef, (doc) => {
      if (doc.exists()) {
        const rideData = doc.data();
        console.log('Ride status updated:', rideData.status);
        
        switch (rideData.status) {
          case 'requested':
            setTripStatus('requested');
            break;
          case 'accepted':
            setSelectedDriver({
              id: rideData.driverId,
              name: rideData.driverName || 'Driver',
              rating: rideData.driverRating || 5.0,
              car: rideData.vehicle || 'Unknown Vehicle',
              licensePlate: rideData.licensePlate || 'Unknown',
              location: { lat: 0, lng: 0 }, // Will be updated with real location
              isOnline: true,
              phoneNumber: rideData.driverPhone || '',
              vehicleMake: rideData.vehicleMake || '',
              vehicleModel: rideData.vehicleModel || '',
              vehicleYear: rideData.vehicleYear || '',
              vehicleColor: rideData.vehicleColor || '',
            });
            setTripStatus('driver_assigned');
            break;
          case 'in_progress':
            setTripStatus('in_progress');
            break;
          case 'completed':
            setTripStatus('completed');
            break;
          case 'cancelled':
            alert('Your ride request was cancelled.');
            setTripStatus('selecting');
            setRideId(null);
            break;
        }
      }
    });
    
    return () => unsubscribe();
  }, [rideId]);

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
    setDropoffs([{ lat: 0, lng: 0, address: '' }]); // Reset to one empty dropoff
    setDirections(null);
    setDistance(null);
    setDuration(null);
    setCost(null);
    setTripStatus('selecting');
    setSelectedDriver(null);
    setRejectedDrivers([]);
    setEta(null);
    setPickupValue('');
    setDropoffInputs(['']); // Reset to one empty input
  };

  // Use the last valid dropoff for centering the map, or default center
  const center = (() => {
    // Find the last valid dropoff point
    for (let i = dropoffs.length - 1; i >= 0; i--) {
      const dropoff = dropoffs[i];
      if (dropoff && dropoff.lat && dropoff.lng) {
        return { lat: dropoff.lat, lng: dropoff.lng };
      }
    }
    // If no valid dropoffs, use pickup or default
    return pickup || defaultCenter;
  })();

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
            dropoffs={dropoffs} // Pass array of dropoffs
            directions={directions}
            apiKey={apiKey}
            onlineDrivers={onlineDrivers}
            driversLoading={driversLoading}
            driversError={driversError}
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

      {/* Location selection indicator */}
      {selectingLocation && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-card text-card-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <p className="font-medium">
            {selectingLocation === 'pickup' 
              ? 'Click on the map to select pickup location' 
              : 'Click on the map to add destination stops'}
          </p>
          {selectingLocation === 'dropoff' && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setSelectingLocation(null)}
              className="h-6 text-xs"
            >
              Finish Adding Stops
            </Button>
          )}
        </div>
      )}

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
        <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl">
          {tripStatus === 'selecting' && (
            <>
              <CardHeader>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                  <Input
                    value={pickupValue}
                    onChange={(e) => {
                      handlePickupInput(e);
                      setIsCurrentLocation(false);
                    }}
                    onBlur={handlePickupBlur}
                    disabled={!pickupReady}
                    placeholder="Enter pickup location"
                    className="pl-10 pr-20"
                  />
                  {/* Green location icon for pickup on the right side */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`absolute right-10 top-1/2 -translate-y-1/2 h-6 w-6 ${selectingLocation === 'pickup' ? 'text-green-600 bg-green-100 rounded-full' : 'text-green-500 hover:text-green-600'}`}
                    onClick={() => setSelectingLocation(selectingLocation === 'pickup' ? null : 'pickup')}
                    title="Set pickup location on map"
                  >
                    <MapPin className="h-5 w-5" />
                  </Button>
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
                      className="pl-10 pr-20"
                    />
                    {/* Red location icon for dropoff on the right side */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`absolute right-10 top-1/2 -translate-y-1/2 h-6 w-6 ${selectingLocation === 'dropoff' ? 'text-red-600 bg-red-100 rounded-full' : 'text-red-500 hover:text-red-600'}`}
                      onClick={() => setSelectingLocation(selectingLocation === 'dropoff' ? null : 'dropoff')}
                      title="Set destination on map"
                    >
                      <Flag className="h-5 w-5" />
                    </Button>
                    {/* Show remove button only for fields beyond the first that have values */}
                    {index > 0 && dropoffValue && (
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
                    {/* Show plus button only on the last field if it has a value and we haven't reached the limit */}
                    {index === dropoffInputs.length - 1 && 
                     dropoffValue && 
                     dropoffInputs.length < maxDropoffs && (
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
                    {dropoffAutocompleteHooks[index] && dropoffAutocompleteHooks[index].suggestions.status === 'OK' && (
                      <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {dropoffAutocompleteHooks[index].suggestions.data.map((suggestion: Suggestion) => (
                          <div
                            key={suggestion.place_id}
                            onClick={() => handleDropoffSelect(index, suggestion.structured_formatting.main_text + ', ' + suggestion.structured_formatting.secondary_text)}
                            className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                          >
                            <p className="font-medium">{suggestion.structured_formatting.main_text}</p>
                            <p className="text-sm text-muted-foreground">{suggestion.structured_formatting.secondary_text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
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
                  disabled={!pickup || dropoffs.filter(d => d && d.lat && d.lng).length === 0}
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
                <div>
                  <span className="text-sm font-medium">
                    {selectedDriver?.vehicleYear && selectedDriver?.vehicleMake && selectedDriver?.vehicleModel 
                      ? `${selectedDriver.vehicleYear} ${selectedDriver.vehicleMake} ${selectedDriver.vehicleModel}` 
                      : selectedDriver?.car || 'Unknown Vehicle'}
                  </span>
                  <span className="text-sm block">
                    {selectedDriver?.licensePlate ? `License: ${selectedDriver.licensePlate}` : 'License: Unknown'}
                  </span>
                </div>
                <span className="text-sm font-medium">{eta || '5'} min away</span>
              </div>
              {selectedDriver?.phoneNumber && (
                <div className="p-3 bg-secondary rounded-lg mb-4">
                  <p className="text-sm">
                    Contact: <a href={`tel:${selectedDriver.phoneNumber}`} className="text-primary hover:underline">{selectedDriver.phoneNumber}</a>
                  </p>
                </div>
              )}
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

          {tripStatus === 'in_progress' && (
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">On the way</h3>
                <Navigation className="h-6 w-6 text-primary" />
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
                <div>
                  <span className="text-sm font-medium">
                    {selectedDriver?.vehicleYear && selectedDriver?.vehicleMake && selectedDriver?.vehicleModel 
                      ? `${selectedDriver.vehicleYear} ${selectedDriver.vehicleMake} ${selectedDriver.vehicleModel}` 
                      : selectedDriver?.car || 'Unknown Vehicle'}
                  </span>
                  <span className="text-sm block">
                    {selectedDriver?.licensePlate ? `License: ${selectedDriver.licensePlate}` : 'License: Unknown'}
                  </span>
                </div>
                <span className="text-sm font-medium">{duration || 'N/A'}</span>
              </div>
              {selectedDriver?.phoneNumber && (
                <div className="p-3 bg-secondary rounded-lg mb-4">
                  <p className="text-sm">
                    Contact: <a href={`tel:${selectedDriver.phoneNumber}`} className="text-primary hover:underline">{selectedDriver.phoneNumber}</a>
                  </p>
                </div>
              )}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="text-sm truncate">{pickupValue || 'Pickup location'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-red-500" />
                  <span className="text-sm truncate">
                    {dropoffs.length > 0 
                      ? dropoffs.map((d, i) => d?.address || `Destination ${i + 1}`).join(' → ') 
                      : 'Destination'}
                  </span>
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