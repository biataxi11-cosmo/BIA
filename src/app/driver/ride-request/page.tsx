'use client';

import DashboardLayout from '@/components/dashboard-layout';
import { withAuth } from '@/components/with-auth';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Home, List, User, MapPin } from 'lucide-react';
import { RidesIconWithBadge } from '@/components/ride-requests-badge';
import Link from 'next/link';
import { DriverRideRequests } from '@/components/driver-ride-requests';
import { DriverRideHistory } from '@/components/driver-ride-history';
import { DriverOngoingRides } from '@/components/driver-ongoing-rides';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function DriverRideRequest() {
  const { user, userProfile } = useAuth();
  const [assignedRide, setAssignedRide] = useState<any>(null);

  // Listen for ride assignments
  useEffect(() => {
    if (!user) return;
    
    // Query for rides assigned to this driver
    const q = query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid),
      where('status', '==', 'accepted')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const rideDoc = snapshot.docs[0];
        const rideData = rideDoc.data();
        setAssignedRide({
          id: rideDoc.id,
          ...rideData
        });
      } else {
        setAssignedRide(null);
      }
    });
    
    return () => unsubscribe();
  }, [user]);

  const navLinks = [
    { href: '/driver/dashboard', icon: Home, label: 'Home' },
    { href: '/driver/ride-request', icon: List, label: 'Rides', active: true },
    { href: '/driver/map', icon: MapPin, label: 'Map' },
    { href: '/driver/profile', icon: User, label: 'Profile' },
  ];

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

  return (
    <DashboardLayout desktopNav={<DesktopNav />}>
      <div className="container mx-auto py-6">
        {/* Show ride assignment notification if there's an assigned ride */}
        {assignedRide && (
          <div className="mb-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  New Ride Assignment
                </CardTitle>
                <CardDescription>
                  You have been assigned a new ride
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Customer:</strong> {assignedRide.customerName}</p>
                  <p><strong>Pickup:</strong> {assignedRide.pickup?.address}</p>
                  <p><strong>Destination:</strong> {assignedRide.dropoffs?.[0]?.address}</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button asChild className="flex-1">
                    <Link href="/driver/map">Navigate to Pickup</Link>
                  </Button>
                  <Button variant="outline" onClick={() => setAssignedRide(null)} className="flex-1">
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Ride Requests</h1>
            <p className="text-muted-foreground">Manage your ride requests</p>
          </div>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Active Ride Requests</CardTitle>
            <CardDescription>
              Accept or reject ride requests from customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DriverRideRequests />
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Ongoing Rides</CardTitle>
            <CardDescription>
              View your currently active rides
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DriverOngoingRides />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Ride History</CardTitle>
            <CardDescription>
              View your completed and cancelled rides
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DriverRideHistory />
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
    </DashboardLayout>
  );
}

export default withAuth(DriverRideRequest, ['driver']);