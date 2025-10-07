'use client';

import DashboardLayout from '@/components/dashboard-layout';
import { withAuth } from '@/components/with-auth';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, User, MapPin, List } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

function DriverProfile() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    driverLicense: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleColor: '',
    licensePlate: '',
  });

  // Initialize form data with existing profile data
  useEffect(() => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.fullName || user?.displayName || '',
        phoneNumber: userProfile.phoneNumber || '',
        driverLicense: userProfile.driverLicense || '',
        vehicleMake: userProfile.vehicleMake || '',
        vehicleModel: userProfile.vehicleModel || '',
        vehicleYear: userProfile.vehicleYear || '',
        vehicleColor: userProfile.vehicleColor || '',
        licensePlate: userProfile.licensePlate || '',
      });
    }
  }, [userProfile, user]);

  const navLinks = [
    { href: '/driver/dashboard', icon: Home, label: 'Home' },
    { href: '/driver/ride-request', icon: List, label: 'Rides' },
    { href: '/driver/map', icon: MapPin, label: 'Map' },
    { href: '/driver/profile', icon: User, label: 'Profile', active: true },
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
          <link.icon className="h-4 w-4" />
          <span>{link.label}</span>
        </Link>
      ))}
    </nav>
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSavePersonalInfo = async () => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        driverLicense: formData.driverLicense,
        updatedAt: new Date(),
      });
      
      toast({
        title: "Personal information saved",
        description: "Your personal information has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating personal info:', error);
      toast({
        title: "Error",
        description: "Failed to save personal information. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveVehicleInfo = async () => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        vehicleMake: formData.vehicleMake,
        vehicleModel: formData.vehicleModel,
        vehicleYear: formData.vehicleYear,
        vehicleColor: formData.vehicleColor,
        licensePlate: formData.licensePlate,
        updatedAt: new Date(),
      });
      
      toast({
        title: "Vehicle information saved",
        description: "Your vehicle information has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating vehicle info:', error);
      toast({
        title: "Error",
        description: "Failed to save vehicle information. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout desktopNav={<DesktopNav />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your driver profile information.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal details here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  value={formData.fullName} 
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={user?.email || ''} 
                  disabled 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input 
                  id="phoneNumber" 
                  type="tel" 
                  value={formData.phoneNumber} 
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driverLicense">Driver License</Label>
                <Input 
                  id="driverLicense" 
                  value={formData.driverLicense} 
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <Button onClick={handleSavePersonalInfo}>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
            <CardDescription>
              Manage your vehicle details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vehicleMake">Make</Label>
                <Input 
                  id="vehicleMake" 
                  value={formData.vehicleMake} 
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleModel">Model</Label>
                <Input 
                  id="vehicleModel" 
                  value={formData.vehicleModel} 
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleYear">Year</Label>
                <Input 
                  id="vehicleYear" 
                  value={formData.vehicleYear} 
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleColor">Color</Label>
                <Input 
                  id="vehicleColor" 
                  value={formData.vehicleColor} 
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licensePlate">License Plate</Label>
                <Input 
                  id="licensePlate" 
                  value={formData.licensePlate} 
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <Button onClick={handleSaveVehicleInfo}>Save Vehicle Information</Button>
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
              <link.icon className="h-6 w-6" />
              <span className="text-xs">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(DriverProfile, ['driver']);