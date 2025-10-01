'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export function withAuth(Component: React.ComponentType, allowedRoles: UserRole[]) {
  return function AuthenticatedComponent(props: any) {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading) {
        if (!user) {
          // If not loading and no user, redirect to home.
          // This should handle cases where a user logs out.
          router.replace('/'); 
        } else if (role && !allowedRoles.includes(role)) {
          // If there's a role but it's not allowed for this page,
          // redirect to that role's dashboard.
          router.replace(`/${role}/dashboard`);
        }
      }
    }, [user, role, loading, router, allowedRoles]);

    // While loading, show a loader
    if (loading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    // If no user after loading, redirect to home
    if (!user) {
      return null; // Will redirect via useEffect
    }

    // If user exists but no role yet, show a brief loading state
    if (!role) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Setting up your dashboard...</p>
          </div>
        </div>
      );
    }

    // If role doesn't match allowed roles, redirect
    if (!allowedRoles.includes(role)) {
      return null; // Will redirect via useEffect
    }

    // Once everything is loaded and verified, render the actual component.
    return <Component {...props} />;
  };
}
