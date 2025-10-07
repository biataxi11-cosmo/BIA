'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Flag, User, Car, Phone, Clock, Milestone } from 'lucide-react';
import Link from 'next/link';

interface OngoingRide {
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
  status: 'accepted' | 'in_progress';
  distance?: string;
  duration?: string;
  cost?: number;
  requestedAt: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  driverId?: string;
}

export function DriverOngoingRides() {
  const { user } = useAuth();
  const [ongoingRides, setOngoingRides] = useState<OngoingRide[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen for ongoing rides for this driver
  useEffect(() => {
    if (!user) return;

    // Query for rides that are accepted or in progress and assigned to this driver
    const q = query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['accepted', 'in_progress'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rides: OngoingRide[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        rides.push({
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
          driverId: data.driverId,
        });
      });
      setOngoingRides(rides);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Accepted - Navigating to Pickup';
      case 'in_progress':
        return 'In Progress - En Route to Destination';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p>Loading ongoing rides...</p>
      </div>
    );
  }

  if (ongoingRides.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No ongoing rides at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Ongoing Rides</h3>
      {ongoingRides.map((ride) => (
        <Card key={ride.id} className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">Ride with {ride.customerName}</CardTitle>
                <CardDescription>
                  {getStatusText(ride.status)}
                </CardDescription>
              </div>
              <div className="text-right">
                {ride.cost && (
                  <p className="font-bold text-lg">LKR {ride.cost}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
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
              <div className="flex gap-2 pt-2">
                <Button asChild className="flex-1">
                  <Link href="/driver/map">View Ride</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}