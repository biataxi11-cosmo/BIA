'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Timestamp, collection, getCountFromServer, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { withAuth } from '@/components/with-auth';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Home, List, Settings, Users } from 'lucide-react';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Pie, PieChart, Cell, ResponsiveContainer } from 'recharts';

type RideStatus = 'requested' | 'driver_assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

interface RideListItem {
  id: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: RideStatus;
  requestedAt?: Date;
}

function AdminDashboardPage() {
  const [counts, setCounts] = useState<{ customers: number; drivers: number; admins: number; rides: number; activeDrivers?: number } | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<RideStatus, number> | null>(null);
  const [recentRides, setRecentRides] = useState<RideListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<{ rides: number; completed: number; revenue: number }>({ rides: 0, completed: 0, revenue: 0 });
  
  const chartConfig: ChartConfig = useMemo(() => ({
    requested: { label: 'Requested', color: 'hsl(var(--chart-1))' },
    driver_assigned: { label: 'Driver Assigned', color: 'hsl(var(--chart-2))' },
    accepted: { label: 'Accepted', color: 'hsl(var(--chart-3))' },
    in_progress: { label: 'In Progress', color: 'hsl(var(--chart-4))' },
    completed: { label: 'Completed', color: 'hsl(var(--chart-5))' },
    cancelled: { label: 'Cancelled', color: '#ef4444' },
  }), []);
  
  const chartData = useMemo(() => (
    (['requested','driver_assigned','accepted','in_progress','completed','cancelled'] as RideStatus[])
      .map((s) => ({
        status: s,
        value: statusCounts?.[s] ?? 0,
      }))
      // Filter out items with 0 values
      .filter((item) => item.value > 0)
  ), [statusCounts]);

  const navLinks = useMemo(() => ([
    { href: '/admin/dashboard', icon: Home, label: 'Home', active: true },
    { href: '/admin/ride-request', icon: List, label: 'Rides' },
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
  ]), []);

  useEffect(() => {
    let unsubscribes: Array<() => void> = [];

    async function fetchCounts() {
      try {
        const [customersSnap, driversSnap, adminsSnap, ridesSnap, activeDriversSnap] = await Promise.all([
          getCountFromServer(query(collection(db, 'users'), where('role', '==', 'customer'))),
          getCountFromServer(query(collection(db, 'users'), where('role', '==', 'driver'))),
          getCountFromServer(query(collection(db, 'users'), where('role', '==', 'admin'))),
          getCountFromServer(collection(db, 'rides')),
          getCountFromServer(query(collection(db, 'users'), where('role', '==', 'driver'), where('isOnline', '==', true))),
        ]);
        setCounts({
          customers: customersSnap.data().count,
          drivers: driversSnap.data().count,
          admins: adminsSnap.data().count,
          rides: ridesSnap.data().count,
          activeDrivers: activeDriversSnap.data().count,
        });

        const statuses: RideStatus[] = ['requested', 'driver_assigned', 'accepted', 'in_progress', 'completed', 'cancelled'];
        const statusPromises = statuses.map(s => getCountFromServer(query(collection(db, 'rides'), where('status', '==', s))));
        const results = await Promise.all(statusPromises);
        const statusMap: Record<RideStatus, number> = statuses.reduce((acc, s, idx) => {
          acc[s] = results[idx].data().count;
          return acc;
        }, {} as Record<RideStatus, number>);
        setStatusCounts(statusMap);
      } catch (e) {
        // Best-effort; keep page usable
      }
    }

    function listenRecentRides() {
      const q = query(collection(db, 'rides'), orderBy('requestedAt', 'desc'), limit(10));
      const unsub = onSnapshot(q, (snap) => {
        const items: RideListItem[] = [];
        snap.forEach(docSnap => {
          const d = docSnap.data() as any;
          items.push({
            id: docSnap.id,
            customerName: d.customerName || 'Customer',
            pickupAddress: d?.pickup?.address || '-',
            dropoffAddress: (d?.dropoffs?.[0]?.address) || '-',
            status: (d.status as RideStatus) || 'requested',
            requestedAt: d.requestedAt?.toDate ? d.requestedAt.toDate() : undefined,
          });
        });
        setRecentRides(items);
        setLoading(false);
      });
      unsubscribes.push(unsub);
    }

    function listenTodayStats() {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startTs = Timestamp.fromDate(start);

      // Listen to all rides requested today
      const qToday = query(collection(db, 'rides'), where('requestedAt', '>=', startTs), orderBy('requestedAt', 'desc'));
      const unsub = onSnapshot(qToday, (snap) => {
        let rides = 0;
        let completed = 0;
        let revenue = 0;
        snap.forEach(docSnap => {
          rides += 1;
          const d = docSnap.data() as any;
          if (d.status === 'completed') {
            completed += 1;
            const amt = typeof d.cost === 'number' ? d.cost : 0;
            revenue += amt;
          }
        });
        setTodayStats({ rides, completed, revenue });
      });
      unsubscribes.push(unsub);
    }

    // Live fallback listeners for role counts in case count aggregation isn't available
    function listenRoleCounts() {
      const base = collection(db, 'users');
      const customerUnsub = onSnapshot(query(base, where('role', '==', 'customer')), (snap) => {
        setCounts((prev) => ({ ...(prev || { customers: 0, drivers: 0, admins: 0, rides: 0, activeDrivers: 0 }), customers: snap.size }));
      });
      const driverUnsub = onSnapshot(query(base, where('role', '==', 'driver')), (snap) => {
        setCounts((prev) => ({ ...(prev || { customers: 0, drivers: 0, admins: 0, rides: 0, activeDrivers: 0 }), drivers: snap.size }));
      });
      const adminUnsub = onSnapshot(query(base, where('role', '==', 'admin')), (snap) => {
        setCounts((prev) => ({ ...(prev || { customers: 0, drivers: 0, admins: 0, rides: 0, activeDrivers: 0 }), admins: snap.size }));
      });
      const activeDriverUnsub = onSnapshot(query(base, where('role', '==', 'driver'), where('isOnline', '==', true)), (snap) => {
        setCounts((prev) => ({ ...(prev || { customers: 0, drivers: 0, admins: 0, rides: 0, activeDrivers: 0 }), activeDrivers: snap.size }));
      });
      unsubscribes.push(customerUnsub, driverUnsub, adminUnsub, activeDriverUnsub);
    }

    fetchCounts();
    listenRoleCounts();
    listenRecentRides();
    listenTodayStats();

    return () => {
      unsubscribes.forEach(u => u());
    };
  }, []);

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

  // Status badge variant based on status
  const getStatusVariant = (status: RideStatus) => {
    switch (status) {
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      case 'requested': return 'outline';
      case 'in_progress': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <DashboardLayout desktopNav={<DesktopNav />}> 
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-secondary/10 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Summary Cards Section with Glassmorphism Effect */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="glass-card backdrop-blur-sm bg-background/30 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Total Customers
            </CardDescription>
            <CardTitle className="text-2xl">{counts?.customers ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card backdrop-blur-sm bg-background/30 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Total Drivers
            </CardDescription>
            <CardTitle className="text-2xl">{counts?.drivers ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card backdrop-blur-sm bg-background/30 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Total Admins
            </CardDescription>
            <CardTitle className="text-2xl">{counts?.admins ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card backdrop-blur-sm bg-background/30 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm flex items-center">
              <List className="mr-2 h-4 w-4" />
              Total Rides
            </CardDescription>
            <CardTitle className="text-2xl">{counts?.rides ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Stats and Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Today's Stats with Gradient Border */}
        <Card className="lg:col-span-1 glass-card backdrop-blur-sm bg-background/30 border border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Today's Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-white/20">
              <span className="text-muted-foreground flex items-center">
                <List className="mr-2 h-4 w-4" />
                Rides
              </span>
              <span className="font-bold text-lg">{todayStats.rides}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-white/20">
              <span className="text-muted-foreground flex items-center">
                <Home className="mr-2 h-4 w-4" />
                Completed
              </span>
              <span className="font-bold text-lg">{todayStats.completed}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-white/20">
              <span className="text-muted-foreground flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Revenue
              </span>
              <span className="font-bold text-lg">${todayStats.revenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-white/20">
              <span className="text-muted-foreground flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Online Drivers
              </span>
              <span className="font-bold text-lg">{counts?.activeDrivers ?? '—'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Ride Status Distribution - Pie Chart */}
        <Card className="lg:col-span-2 glass-card backdrop-blur-sm bg-background/30 border border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Ride Status Distribution</CardTitle>
            <CardDescription>Breakdown of rides by current status</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={chartData} 
                      dataKey="value" 
                      nameKey="status" 
                      cx="50%" 
                      cy="50%"
                      outerRadius={100}
                      innerRadius={60}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`var(--color-${entry.status})`} 
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={
                        <ChartTooltipContent 
                          nameKey="status" 
                          indicator="line"
                          className="backdrop-blur-sm bg-background/80 border border-white/20"
                        />
                      } 
                    />
                    <ChartLegend 
                      content={
                        <ChartLegendContent 
                          nameKey="status" 
                          className="flex-wrap gap-2"
                        />
                      } 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No ride data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Rides Section */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="glass-card backdrop-blur-sm bg-background/30 border border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Recent Rides</CardTitle>
            <CardDescription>Last 10 ride requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-white/20 backdrop-blur-sm bg-background/30">
              <Table>
                <TableHeader>
                  <TableRow className="backdrop-blur-sm bg-background/50 hover:bg-background/50">
                    <TableHead>Customer</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Dropoff</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRides.map(r => (
                    <TableRow 
                      key={r.id} 
                      className="backdrop-blur-sm bg-background/30 hover:bg-background/50 border-b-white/10"
                    >
                      <TableCell className="font-medium">{r.customerName}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{r.pickupAddress}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{r.dropoffAddress}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStatusVariant(r.status)}
                          className="capitalize text-xs"
                        >
                          {r.status.replace('_',' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.requestedAt ? new Date(r.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          asChild 
                          size="sm" 
                          className="bg-green-500/20 text-green-700 hover:bg-green-500/30 border border-green-500/30 backdrop-blur-sm"
                        >
                          <Link href={`/admin/ride-request?id=${r.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!loading && recentRides.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No rides yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-sm p-2 md:hidden z-20">
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

export default withAuth(AdminDashboardPage, ['admin']);