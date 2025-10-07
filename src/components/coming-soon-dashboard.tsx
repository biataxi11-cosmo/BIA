'use client';

import DashboardLayout from '@/components/dashboard-layout';
import { withAuth } from '@/components/with-auth';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, User } from 'lucide-react';

interface ComingSoonDashboardProps {
  role: 'driver' | 'admin';
  title: string;
  description: string;
}

function ComingSoonDashboardContent({ role, title, description }: ComingSoonDashboardProps) {
  const { user, userProfile } = useAuth();

  const navLinks = [
    { href: `/${role}/dashboard`, icon: Home, label: 'Home', active: true },
    { href: `/${role}/profile`, icon: User, label: 'Profile' },
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
    <DashboardLayout
      desktopNav={<DesktopNav />}
      mainClassName="flex items-center justify-center"
    >
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto flex items-center justify-center">
            <span className="text-2xl">⏱️</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-4">{title}</h1>
        <p className="text-muted-foreground mb-8">{description}</p>
        <div className="space-y-4">
          <Button asChild>
            <Link href="/">Go to Home</Link>
          </Button>
          <div className="text-sm text-muted-foreground">
            <p>We're working hard to bring you an amazing experience!</p>
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

export function DriverComingSoonDashboard() {
  return (
    <ComingSoonDashboardContent
      role="driver"
      title="Driver Dashboard Coming Soon"
      description="We're building an amazing dashboard for drivers. Check back soon!"
    />
  );
}

export function AdminComingSoonDashboard() {
  return (
    <ComingSoonDashboardContent
      role="admin"
      title="Admin Dashboard Coming Soon"
      description="We're building an amazing dashboard for administrators. Check back soon!"
    />
  );
}

export const DriverComingSoonPage = withAuth(DriverComingSoonDashboard, ['driver']);
export const AdminComingSoonPage = withAuth(AdminComingSoonDashboard, ['admin']);