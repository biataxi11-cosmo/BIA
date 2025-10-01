'use client';

import DashboardLayout from '@/components/dashboard-layout';
import { withAuth } from '@/components/with-auth';
import { useAuth } from '@/contexts/auth-context';

function AdminDashboard() {
  const { user, userProfile } = useAuth();

  return (
    <DashboardLayout>
      <div className="grid gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">
            Welcome, {userProfile?.displayName || user?.displayName || 'Admin'}!
          </h1>
          <p className="text-muted-foreground">Manage your taxi platform</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Total Rides</h3>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Active Drivers</h3>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Total Customers</h3>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Revenue</h3>
            <p className="text-2xl font-bold text-green-600">$0.00</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(AdminDashboard, ['admin']);
