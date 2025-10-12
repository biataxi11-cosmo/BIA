'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Flag, User, Car, Phone, Star, Clock, Milestone, ArrowLeft, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

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
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  carModel?: string;
  carLicensePlate?: string;
}

export function CustomerRideHistory() {
  const { user } = useAuth();
  const router = useRouter();
  const [rideHistory, setRideHistory] = useState<RideHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState<RideHistory | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen for rides for this customer
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'rides'),
      where('customerId', '==', user.uid)
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
            driverName: data.driverName,
            driverPhone: data.driverPhone,
            driverRating: data.driverRating,
            carModel: data.carModel,
            carLicensePlate: data.carLicensePlate,
          });
        });
        
        // Sort by most recent first
        history.sort((a, b) => {
          if (a.completedAt && b.completedAt) {
            return b.completedAt.getTime() - a.completedAt.getTime();
          }
          if (a.startedAt && b.startedAt) {
            return b.startedAt.getTime() - a.startedAt.getTime();
          }
          if (a.acceptedAt && b.acceptedAt) {
            return b.acceptedAt.getTime() - a.acceptedAt.getTime();
          }
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
        return 'bg-srilankan-green text-white';
      case 'cancelled':
        return 'bg-srilankan-red text-white';
      case 'in_progress':
        return 'bg-srilankan-teal text-white';
      case 'accepted':
        return 'bg-srilankan-orange text-white';
      case 'driver_assigned':
        return 'bg-srilankan-navy text-white';
      case 'requested':
        return 'bg-gray-100 text-srilankan-navy';
      default:
        return 'bg-gray-100 text-srilankan-navy';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'in_progress':
        return 'In Progress';
      case 'accepted':
        return 'Accepted';
      case 'driver_assigned':
        return 'Driver Assigned';
      case 'requested':
        return 'Requested';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'driver_assigned':
        return <Car className="h-4 w-4" />;
      case 'requested':
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Loading your rides...</p>
        </div>
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
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 bg-srilankan-gradient rounded-full flex items-center justify-center">
          <Car className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-srilankan-navy">No rides yet</h3>
        <p className="text-srilankan-navy/70 mb-4">Your ride history will appear here once you book your first ride.</p>
        <Button 
          onClick={() => window.location.href = '/customer/map'}
          className="bg-srilankan-red hover:bg-srilankan-red/90 text-white"
        >
          Book a Ride
        </Button>
      </div>
    );
  }

  // Function to view ride on map
  const viewRideOnMap = (ride: RideHistory) => {
    // Store ride information in localStorage or pass as query parameters
    localStorage.setItem('viewRideId', ride.id);
    // Navigate to the map page
    router.push('/customer/map');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-srilankan-navy">My Rides</h1>
        <Badge variant="outline" className="text-sm border-srilankan-teal text-srilankan-teal">
          {rideHistory.length} ride{rideHistory.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-3">
        {rideHistory.map((ride) => (
          <Card 
            key={ride.id} 
            className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-srilankan-red hover:border-l-srilankan-teal"
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getStatusColor(ride.status)}>
                      {getStatusIcon(ride.status)}
                      <span className="ml-1">{getStatusText(ride.status)}</span>
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">
                    {ride.pickup.address}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    to {ride.dropoffs.map(d => d.address).join(', ')}
                  </CardDescription>
                </div>
                <div className="text-right">
                  {ride.cost && (
                    <p className="font-bold text-lg text-srilankan-red">LKR {ride.cost}</p>
                  )}
                  <p className="text-sm text-srilankan-navy/70">
                    {ride.completedAt ? format(ride.completedAt, 'MMM d, yyyy') : 
                     ride.startedAt ? format(ride.startedAt, 'MMM d, yyyy') :
                     ride.acceptedAt ? format(ride.acceptedAt, 'MMM d, yyyy') :
                     format(ride.requestedAt, 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {ride.distance && (
                    <div className="flex items-center gap-1">
                      <Milestone className="h-4 w-4" />
                      <span>{ride.distance}</span>
                    </div>
                  )}
                  {ride.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{ride.duration}</span>
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-srilankan-teal text-srilankan-teal hover:bg-srilankan-teal hover:text-white"
                  onClick={() => viewRideOnMap(ride)}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Import missing icons
import { CheckCircle, XCircle } from 'lucide-react';
