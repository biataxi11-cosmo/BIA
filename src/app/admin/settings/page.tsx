'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { withAuth } from '@/components/with-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Home, List, Settings, Users } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

function AdminSettingsPage() {
  const { toast } = useToast();
  const [baseFare, setBaseFare] = useState<string>('');
  const [perKmRate, setPerKmRate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const navLinks = useMemo(() => ([
    { href: '/admin/dashboard', icon: Home, label: 'Home' },
    { href: '/admin/ride-request', icon: List, label: 'Rides' },
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/settings', icon: Settings, label: 'Settings', active: true },
  ]), []);

  // Load current fare settings
  useEffect(() => {
    const loadFareSettings = async () => {
      try {
        setLoading(true);
        const fareSettingsDoc = doc(db, 'settings', 'fare');
        const docSnap = await getDoc(fareSettingsDoc);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBaseFare(data.baseFare?.toString() || '300');
          setPerKmRate(data.perKmRate?.toString() || '150');
        } else {
          // Set default values if no settings exist
          setBaseFare('300');
          setPerKmRate('150');
        }
      } catch (error) {
        console.error('Error loading fare settings:', error);
        // Use default values
        setBaseFare('300');
        setPerKmRate('150');
        toast({
          title: 'Error',
          description: 'Failed to load fare settings. Using default values.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadFareSettings();
  }, [toast]);

  const handleSaveFareSettings = async () => {
    try {
      setSaving(true);
      
      // Validate inputs
      const baseFareValue = parseFloat(baseFare);
      const perKmRateValue = parseFloat(perKmRate);
      
      if (isNaN(baseFareValue) || isNaN(perKmRateValue)) {
        toast({
          title: 'Error',
          description: 'Please enter valid numbers for fare settings.',
          variant: 'destructive',
        });
        return;
      }
      
      if (baseFareValue < 0 || perKmRateValue < 0) {
        toast({
          title: 'Error',
          description: 'Fare values must be non-negative.',
          variant: 'destructive',
        });
        return;
      }
      
      const fareSettingsDoc = doc(db, 'settings', 'fare');
      const updateData = {
        baseFare: baseFareValue,
        perKmRate: perKmRateValue,
        updatedAt: new Date().toISOString(),
      };
      
      // Try to update the document, if it doesn't exist, create it
      try {
        await updateDoc(fareSettingsDoc, updateData);
      } catch (updateError) {
        // If update fails because document doesn't exist, create it
        await setDoc(fareSettingsDoc, updateData);
      }
      
      toast({
        title: 'Success',
        description: 'Fare settings saved successfully.',
      });
    } catch (error) {
      console.error('Error saving fare settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save fare settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <DashboardLayout desktopNav={<DesktopNav />}> 
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-secondary/10 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card backdrop-blur-sm bg-background/30 border border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle>Fare Settings</CardTitle>
            <CardDescription>Configure base fare and per-km rate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Base Fare (LKR)</label>
              <Input 
                type="number" 
                value={baseFare} 
                onChange={(e) => setBaseFare(e.target.value)} 
                placeholder="300.00"
                disabled={loading || saving}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Per KM Rate (LKR)</label>
              <Input 
                type="number" 
                value={perKmRate} 
                onChange={(e) => setPerKmRate(e.target.value)} 
                placeholder="150.00"
                disabled={loading || saving}
              />
            </div>
            <Button 
              onClick={handleSaveFareSettings}
              disabled={loading || saving}
            >
              {saving ? 'Saving...' : 'Save Fare Settings'}
            </Button>
          </CardContent>
        </Card>
        <Card className="glass-card backdrop-blur-sm bg-background/30 border border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle>Service Areas</CardTitle>
            <CardDescription>Stub for configuring allowed cities/areas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Cities</label>
              <Input placeholder="Add cities (comma-separated)" />
            </div>
            <Button disabled>Save (connect Firestore later)</Button>
          </CardContent>
        </Card>
      </div>

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

export default withAuth(AdminSettingsPage, ['admin']);