'use client';

import DashboardLayout from '@/components/dashboard-layout';
import { withAuth } from '@/components/with-auth';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Bell, Home, List, User } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

function CustomerDashboard() {
  const router = useRouter();
  const { user, userProfile } = useAuth();

  const navLinks = [
    { href: '/customer/dashboard', icon: Home, label: 'Home', active: true },
    { href: '/customer/ride-request', icon: List, label: 'My Rides' },
    { href: '/customer/profile', icon: User, label: 'Profile' },
    { href: '#', icon: Bell, label: 'Notifications' },
  ];

  const handleRideNow = () => {
    router.push('/customer/map');
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
    <DashboardLayout
      desktopNav={<DesktopNav />}
      mainClassName="flex items-center justify-center"
    >
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">
          Welcome, {userProfile?.displayName || user?.displayName || 'Customer'}!
        </h1>
        <p className="text-muted-foreground mb-8">Ready to go somewhere?</p>
        <div className="space-y-4">
          <Button onClick={handleRideNow} size="lg" className="w-full max-w-xs">
            Ride Now
          </Button>
          <div className="text-sm text-muted-foreground">
            <p>Quick access to your ride history and preferences</p>
          </div>
        </div>
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

export default withAuth(CustomerDashboard, ['customer']);