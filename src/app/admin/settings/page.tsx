'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { withAuth } from '@/components/with-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Home, List, Settings, Users } from 'lucide-react';

function AdminSettingsPage() {
  const navLinks = useMemo(() => ([
    { href: '/admin/dashboard', icon: Home, label: 'Home' },
    { href: '/admin/ride-request', icon: List, label: 'Rides' },
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/settings', icon: Settings, label: 'Settings', active: true },
  ]), []);

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Fare Settings</CardTitle>
            <CardDescription>Stub inputs for base fare and per-km rate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Base Fare</label>
              <Input placeholder="$3.00" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Per KM</label>
              <Input placeholder="$1.50" />
            </div>
            <Button disabled>Save (connect Firestore later)</Button>
          </CardContent>
        </Card>
        <Card>
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


