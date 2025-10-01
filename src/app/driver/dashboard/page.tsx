'use client';

import DashboardLayout from '@/components/dashboard-layout';
import { withAuth } from '@/components/with-auth';
import { useAuth } from '@/contexts/auth-context';

function DriverDashboard() {
  const { user, userProfile } = useAuth();

  return (
    <DashboardLayout>
      <div className="grid gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">
            Welcome, {userProfile?.displayName || user?.displayName || 'Driver'}!
          </h1>
          <p className="text-muted-foreground">Ready to start driving?</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Online Status</h3>
            <p className="text-sm text-muted-foreground">Currently offline</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Today's Earnings</h3>
            <p className="text-2xl font-bold text-green-600">$0.00</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Rides Completed</h3>
            <p className="text-2xl font-bold">0</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(DriverDashboard, ['driver']);
