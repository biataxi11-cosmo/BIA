'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Flag, User, Car, Phone, Star } from 'lucide-react';

interface RideRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
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
}

export function DriverRideRequests() {
  const { user, userProfile } = useAuth();
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen for new ride requests
  useEffect(() => {
    if (!user) return;

    // Query for ride requests that are in 'requested' status
    const q = query(
      collection(db, 'rides'),
      where('status', '==', 'requested')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests: RideRequest[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          customerId: data.customerId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          pickup: data.pickup,
          dropoffs: data.dropoffs,
          status: data.status,
          distance: data.distance,
          duration: data.duration,
          cost: data.cost,
          requestedAt: data.requestedAt?.toDate ? data.requestedAt.toDate() : new Date(),
          driverId: data.driverId,
        });
      });
      setRideRequests(requests);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAcceptRide = async (rideId: string) => {
    if (!user) return;

    try {
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        status: 'accepted',
        driverId: user.uid,
        driverName: userProfile?.fullName || user.displayName || 'Unknown Driver',
        driverPhone: userProfile?.phoneNumber || '',
        driverRating: userProfile?.rating || 5.0,
        vehicle: userProfile?.vehicleMake && userProfile?.vehicleModel 
          ? `${userProfile.vehicleMake} ${userProfile.vehicleModel}` 
          : 'Unknown Vehicle',
        licensePlate: userProfile?.licensePlate || 'Unknown',
        vehicleMake: userProfile?.vehicleMake || '',
        vehicleModel: userProfile?.vehicleModel || '',
        vehicleYear: userProfile?.vehicleYear || '',
        vehicleColor: userProfile?.vehicleColor || '',
        acceptedAt: serverTimestamp(),
      });

      // Also update driver status to busy
      const driverRef = doc(db, 'users', user.uid);
      await updateDoc(driverRef, {
        isBusy: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error accepting ride:', error);
    }
  };

  const handleRejectRide = async (rideId: string) => {
    if (!user) return;

    try {
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        status: 'requested', // Make it available for other drivers
        driverId: null,
      });
    } catch (error) {
      console.error('Error rejecting ride:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p>Loading ride requests...</p>
      </div>
    );
  }

  if (rideRequests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No ride requests at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rideRequests.map((request) => (
        <Card key={request.id} className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">New Ride Request</CardTitle>
                <CardDescription>
                  Requested {request.requestedAt.toLocaleTimeString()}
                </CardDescription>
              </div>
              <div className="text-right">
                {request.cost && (
                  <p className="font-bold text-lg">LKR {request.cost}</p>
                )}
                {request.distance && request.duration && (
                  <p className="text-sm text-muted-foreground">
                    {request.distance} • {request.duration}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Pickup</p>
                  <p className="text-sm text-muted-foreground">{request.pickup.address}</p>
                </div>
              </div>
              {request.dropoffs.map((dropoff, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Flag className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Destination {index + 1}</p>
                    <p className="text-sm text-muted-foreground">{dropoff.address}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{request.customerName}</span>
              {request.customerPhone && (
                <a 
                  href={`tel:${request.customerPhone}`} 
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Phone className="h-3 w-3" />
                  Call
                </a>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                onClick={() => handleAcceptRide(request.id)}
                className="flex-1"
              >
                Accept Ride
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleRejectRide(request.id)}
                className="flex-1"
              >
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}