'use client';

import DashboardLayout from '@/components/dashboard-layout';
import { withAuth } from '@/components/with-auth';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, User } from 'lucide-react';
import Link from 'next/link';

function AdminProfile() {
  const { user, userProfile } = useAuth();

  const navLinks = [
    { href: '/admin/dashboard', icon: Home, label: 'Home' },
    { href: '/admin/profile', icon: User, label: 'Profile', active: true },
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

  return (
    <DashboardLayout desktopNav={<DesktopNav />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your admin profile information.</p>
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
                <Input id="fullName" defaultValue={userProfile?.fullName || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={user?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" defaultValue={userProfile?.phoneNumber || ''} />
              </div>
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Update your password and security settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
            </div>
            <Button>Update Password</Button>
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

export default withAuth(AdminProfile, ['admin']);