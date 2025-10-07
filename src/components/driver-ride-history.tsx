'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Flag, User, Car, Phone, Star, Clock, Milestone } from 'lucide-react';
import { format } from 'date-fns';

interface RideHistory {
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
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  driverId?: string;
}

export function DriverRideHistory() {
  const { user } = useAuth();
  const [rideHistory, setRideHistory] = useState<RideHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState<RideHistory | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen for completed rides for this driver
  useEffect(() => {
    if (!user) return;

    // Query for rides that are completed or cancelled and assigned to this driver
    // Note: This query requires a composite index on driverId, status, and completedAt
    const q = query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['completed', 'cancelled'])
      // Removed orderBy for now to avoid the index requirement
      // orderBy('completedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const history: RideHistory[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          history.push({
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
            acceptedAt: data.acceptedAt?.toDate ? data.acceptedAt.toDate() : undefined,
            startedAt: data.startedAt?.toDate ? data.startedAt.toDate() : undefined,
            completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : undefined,
            driverId: data.driverId,
          });
        });
        
        // Sort by completedAt manually since we can't use orderBy
        // Most recent rides first (descending order)
        history.sort((a, b) => {
          // First, try to sort by completedAt if both have it
          if (a.completedAt && b.completedAt) {
            return b.completedAt.getTime() - a.completedAt.getTime();
          }
          
          // If only one has completedAt, it should come first
          if (a.completedAt && !b.completedAt) return -1;
          if (!a.completedAt && b.completedAt) return 1;
          
          // If neither has completedAt, try startedAt
          if (a.startedAt && b.startedAt) {
            return b.startedAt.getTime() - a.startedAt.getTime();
          }
          
          if (a.startedAt && !b.startedAt) return -1;
          if (!a.startedAt && b.startedAt) return 1;
          
          // If neither has startedAt, try acceptedAt
          if (a.acceptedAt && b.acceptedAt) {
            return b.acceptedAt.getTime() - a.acceptedAt.getTime();
          }
          
          if (a.acceptedAt && !b.acceptedAt) return -1;
          if (!a.acceptedAt && b.acceptedAt) return 1;
          
          // Fallback to requestedAt
          return b.requestedAt.getTime() - a.requestedAt.getTime();
        });
        
        setRideHistory(history);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching ride history:', err);
        setError('Failed to load ride history. Please try again later.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p>Loading ride history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (rideHistory.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No ride history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedRide ? (
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Ride Details
                </CardTitle>
                <CardDescription>
                  Detailed information about this ride
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedRide(null)}>
                Back to History
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Customer Information</h3>
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedRide.customerName}</span>
                  </p>
                  {selectedRide.customerPhone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${selectedRide.customerPhone}`} className="text-primary hover:underline">
                        {selectedRide.customerPhone}
                      </a>
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Ride Information</h3>
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Requested: {selectedRide.requestedAt ? format(selectedRide.requestedAt, 'MMM d, yyyy h:mm a') : 'N/A'}</span>
                  </p>
                  {selectedRide.acceptedAt && (
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Accepted: {format(selectedRide.acceptedAt, 'MMM d, yyyy h:mm a')}</span>
                    </p>
                  )}
                  {selectedRide.startedAt && (
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Started: {format(selectedRide.startedAt, 'MMM d, yyyy h:mm a')}</span>
                    </p>
                  )}
                  {selectedRide.completedAt && (
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Completed: {format(selectedRide.completedAt, 'MMM d, yyyy h:mm a')}</span>
                    </p>
                  )}
                  <p className={`flex items-center gap-2 ${getStatusColor(selectedRide.status)}`}>
                    <Star className="h-4 w-4" />
                    <span>Status: {getStatusText(selectedRide.status)}</span>
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Trip Details</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Pickup</p>
                    <p className="text-sm text-muted-foreground">{selectedRide.pickup.address}</p>
                  </div>
                </div>
                {selectedRide.dropoffs.map((dropoff, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Flag className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Destination {index + 1}</p>
                      <p className="text-sm text-muted-foreground">{dropoff.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-secondary rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="font-medium">{selectedRide.distance || 'N/A'}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-medium">{selectedRide.duration || 'N/A'}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Cost</p>
                <p className="font-medium">LKR {selectedRide.cost || '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Ride History</h3>
          {rideHistory.map((ride) => (
            <Card 
              key={ride.id} 
              className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedRide(ride)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Ride with {ride.customerName}</CardTitle>
                    <CardDescription>
                      {ride.completedAt ? format(ride.completedAt, 'MMM d, yyyy') : 
                       ride.startedAt ? format(ride.startedAt, 'MMM d, yyyy') :
                       ride.acceptedAt ? format(ride.acceptedAt, 'MMM d, yyyy') :
                       ride.requestedAt ? format(ride.requestedAt, 'MMM d, yyyy') : 'Date unknown'}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    {ride.cost && (
                      <p className="font-bold text-lg">LKR {ride.cost}</p>
                    )}
                    <p className={`text-sm ${getStatusColor(ride.status)}`}>
                      {getStatusText(ride.status)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span className="truncate">{ride.pickup.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Flag className="h-4 w-4 text-red-500" />
                    <span className="truncate">
                      {ride.dropoffs.map(d => d.address).join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Milestone className="h-4 w-4" />
                    <span>{ride.distance || 'N/A'} • {ride.duration || 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}