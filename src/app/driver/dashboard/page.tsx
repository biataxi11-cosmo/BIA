'use client';

import { useState, useEffect } from 'react';
import { MapPin, Locate, Car, UserCheck, Home, List, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, GeoPoint, setDoc, deleteDoc } from 'firebase/firestore';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard-layout';
import { RidesIconWithBadge } from '@/components/ride-requests-badge';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 6.9271, // Colombo, Sri Lanka
  lng: 79.8612,
};

type LatLng = { lat: number; lng: number };

type Driver = {
  id: string;
  name: string;
  rating: number;
  car: string;
  licensePlate: string;
  location: LatLng;
  isOnline: boolean;
};

export default function DriverDashboard() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [driverLocation, setDriverLocation] = useState<LatLng | null>(null);
  const [onlineDrivers, setOnlineDrivers] = useState<Driver[]>([]);
  const [center, setCenter] = useState(defaultCenter);

  // Get API key from environment variable
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  // Use our custom hook to ensure Google Maps is loaded
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script-driver-dashboard',
    googleMapsApiKey: apiKey,
    libraries: ['places']
  });

  // Load online drivers from Firebase using driverLocations collection
  useEffect(() => {
    if (!user) return;
    
    // Query for all online drivers from the driverLocations collection
    const driversQuery = query(
      collection(db, 'driverLocations'),
      where('isOnline', '==', true)
    );
    
    const unsubscribe = onSnapshot(driversQuery, 
      (snapshot) => {
        console.log('Driver dashboard - Received snapshot update for online drivers:', snapshot.size);
        const drivers: Driver[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Driver dashboard - Driver data:', doc.id, data);
          // Check if location exists and handle both GeoPoint and custom object formats
          let locationData = null;
          if (data.location) {
            // Handle GeoPoint format (Firestore's native geolocation type)
            if (data.location instanceof GeoPoint) {
              locationData = {
                lat: data.location.latitude,
                lng: data.location.longitude
              };
            }
            // Handle custom object format
            else if (data.location.latitude !== undefined && data.location.longitude !== undefined) {
              locationData = {
                lat: data.location.latitude,
                lng: data.location.longitude
              };
            }
          }
          
          if (locationData) {
            drivers.push({
              id: doc.id,
              name: data.name || 'Unknown Driver',
              rating: data.rating || 5.0,
              car: data.car || 'Unknown Car',
              licensePlate: data.licensePlate || 'Unknown',
              location: locationData,
              isOnline: data.isOnline || false
            });
          } else {
            console.log('Driver dashboard - Skipping driver due to missing location data:', doc.id);
          }
        });
        console.log('Driver dashboard - Updating online drivers state:', drivers);
        setOnlineDrivers(drivers);
      },
      (error) => {
        console.error('Error fetching online drivers:', error);
        // Handle permission denied error specifically
        if (error.code === 'permission-denied') {
          toast({
            title: "Permission Error",
            description: "You don't have permission to access driver data. Please contact support.",
            variant: "destructive",
          });
          // Set onlineDrivers to empty array to prevent errors
          setOnlineDrivers([]);
        }
        // Show a user-friendly message without exposing technical details
        // In a real app, you might want to show a toast notification or similar
      }
    );
    
    return () => unsubscribe();
  }, [user, toast]);

  // Check current driver's online status from database
  useEffect(() => {
    if (!user) return;
    
    const driverRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(driverRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        // Update local state based on database value
        setIsOnline(data.isOnline || false);
        
        // If driver is online, update location
        if (data.isOnline && data.location) {
          if (data.location instanceof GeoPoint) {
            setDriverLocation({
              lat: data.location.latitude,
              lng: data.location.longitude
            });
            setCenter({
              lat: data.location.latitude,
              lng: data.location.longitude
            });
          } else if (data.location.lat && data.location.lng) {
            setDriverLocation({
              lat: data.location.lat,
              lng: data.location.lng
            });
            setCenter({
              lat: data.location.lat,
              lng: data.location.lng
            });
          }
        } else if (!data.isOnline) {
          setDriverLocation(null);
        }
      }
    }, (error) => {
      console.error('Error fetching driver data:', error);
      // Handle permission denied error specifically
      if (error.code === 'permission-denied') {
        toast({
          title: "Permission Error",
          description: "You don't have permission to access your driver data. Please contact support.",
          variant: "destructive",
        });
      }
    });
    
    return () => unsubscribe();
  }, [user, toast]);

  // Listen for assigned rides
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['accepted', 'in_progress'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Driver dashboard - Received snapshot update for rides:', snapshot.size);
    }, (error) => {
      console.error('Error fetching assigned rides:', error);
      // Handle permission denied error specifically
      if (error.code === 'permission-denied') {
        toast({
          title: "Permission Error",
          description: "You don't have permission to access ride data. Please contact support.",
          variant: "destructive",
        });
      }
    });

    return () => unsubscribe();
  }, [user, toast]);

  // Get current location when going online
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const location = { lat: latitude, lng: longitude };
          setDriverLocation(location);
          setCenter(location);
          setIsOnline(true);
          
          // Update driver status in Firebase
          if (user) {
            try {
              console.log('Updating driver status to online:', user.uid, {
                isOnline: true,
                location: new GeoPoint(latitude, longitude)
              });
              const driverRef = doc(db, 'users', user.uid);
              await updateDoc(driverRef, {
                isOnline: true,
                location: new GeoPoint(latitude, longitude),
                updatedAt: serverTimestamp()
              });
              
              // Also update the public driver locations collection for better real-time updates
              const publicDriverLocationRef = doc(db, 'driverLocations', user.uid);
              await setDoc(publicDriverLocationRef, {
                driverId: user.uid,
                location: new GeoPoint(latitude, longitude),
                isOnline: true,
                updatedAt: serverTimestamp(),
                name: userProfile?.fullName || user.displayName || 'Unknown Driver',
                rating: userProfile?.rating || 5.0, // Use user profile rating or default to 5.0
                car: userProfile?.vehicleMake && userProfile?.vehicleModel 
                  ? `${userProfile.vehicleMake} ${userProfile.vehicleModel}` 
                  : 'Unknown Car',
                licensePlate: userProfile?.licensePlate || 'Unknown',
                // Additional driver details
                phoneNumber: userProfile?.phoneNumber || '',
                vehicleMake: userProfile?.vehicleMake || '',
                vehicleModel: userProfile?.vehicleModel || '',
                vehicleYear: userProfile?.vehicleYear || '',
                vehicleColor: userProfile?.vehicleColor || '',
              });
              
              console.log('Driver is now online at:', location);
              toast({
                title: "You're now online!",
                description: "Customers can now see you on the map.",
              });
            } catch (error: any) {
              console.error('Error updating driver status:', error);
              setIsOnline(false);
              setDriverLocation(null);
              
              // Check if it's a permission error
              if (error.code === 'permission-denied') {
                toast({
                  title: "Permission Error",
                  description: "Unable to update your status. Please contact support.",
                  variant: "destructive",
                });
              } else {
                toast({
                  title: "Error",
                  description: "Failed to update your status. Please try again.",
                  variant: "destructive",
                });
              }
            }
          }
        },
        (error) => {
          console.error('Error getting current location:', error);
          alert('Unable to get your current location. Please try again.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  // Go offline
  const goOffline = async () => {
    setIsOnline(false);
    setDriverLocation(null);
    
    // Update driver status in Firebase
    if (user) {
      try {
        const driverRef = doc(db, 'users', user.uid);
        await updateDoc(driverRef, {
          isOnline: false,
          updatedAt: serverTimestamp()
        });
        
        // Also remove from public driver locations collection
        const publicDriverLocationRef = doc(db, 'driverLocations', user.uid);
        await deleteDoc(publicDriverLocationRef);
        
        console.log('Driver is now offline');
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

  // Define navigation links for the dashboard
  const navLinks = [
    { href: '/driver/dashboard', icon: Home, label: 'Home', active: true },
    { href: '/driver/ride-request', icon: List, label: 'Rides' },
    { href: '/driver/map', icon: MapPin, label: 'Map' }, // Added Map link for consistency
    { href: '/driver/profile', icon: User, label: 'Profile' },
  ];

  // Desktop navigation component
  const DesktopNav = () => (
    <nav className="hidden md:flex items-center gap-4">
      {navLinks.map((link) => (
        <Link
          key={link.label}
          href={user ? link.href : '#'}
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
            link.active
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {link.label === 'Rides' ? (
            <RidesIconWithBadge sizeClass="h-4 w-4" />
          ) : (
            <link.icon className="h-4 w-4" />
          )}
          <span>{link.label}</span>
        </Link>
      ))}
    </nav>
  );

  if (loadError) {
    return (
      <DashboardLayout
        desktopNav={<DesktopNav />}
      >
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Error Loading Map</h2>
            <p className="text-muted-foreground mb-4">Please check your API key and try again.</p>
            <p className="text-sm text-muted-foreground">Error: {loadError.message}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isLoaded) {
    return (
      <DashboardLayout
        desktopNav={<DesktopNav />}
      >
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-muted-foreground">Loading Google Maps...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      desktopNav={<DesktopNav />}
    >
      <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
        {/* Map Container */}
        <div className="absolute inset-0">
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
            {/* Show all online drivers */}
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
            
            {/* Show current driver location if online */}
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
          </GoogleMap>
        </div>
        
        {/* Status Card */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <Card className="max-w-md mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Driver Dashboard
              </CardTitle>
              <CardDescription>
                {isOnline 
                  ? "You are currently online and available for rides" 
                  : "Go online to start receiving ride requests"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {!isOnline ? (
                  <Button 
                    onClick={getCurrentLocation}
                    className="w-full"
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    Go Online
                  </Button>
                ) : (
                  <Button 
                    onClick={goOffline}
                    variant="destructive"
                    className="w-full"
                  >
                    Go Offline
                  </Button>
                )}
                
                {isOnline && driverLocation && (
                  <div className="text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Locate className="h-4 w-4" />
                      Current Location: 
                      Lat {driverLocation.lat.toFixed(6)}, 
                      Lng {driverLocation.lng.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
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
                {link.label === 'Rides' ? (
                  <RidesIconWithBadge sizeClass="h-6 w-6" />
                ) : (
                  <link.icon className="h-6 w-6" />
                )}
                <span className="text-xs">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}