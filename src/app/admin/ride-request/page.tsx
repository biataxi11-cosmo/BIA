'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/dashboard-layout';
import { withAuth } from '@/components/with-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Home, List, Settings, Users } from 'lucide-react';

type RideStatus = 'requested' | 'driver_assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

interface RideItem {
  id: string;
  customerName: string;
  customerPhone?: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: RideStatus;
  cost?: number;
  requestedAt?: Date;
}

function AdminRidesPage() {
  const [rides, setRides] = useState<RideItem[]>([]);
  const [status, setStatus] = useState<RideStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const params = useSearchParams();
  const focusId = params.get('id');

  const navLinks = useMemo(() => ([
    { href: '/admin/dashboard', icon: Home, label: 'Home' },
    { href: '/admin/ride-request', icon: List, label: 'Rides', active: true },
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
  ]), []);

  useEffect(() => {
    const base = collection(db, 'rides');
    const q = status === 'all' ? query(base, orderBy('requestedAt', 'desc')) : query(base, where('status', '==', status), orderBy('requestedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: RideItem[] = [];
      snap.forEach(docSnap => {
        const d = docSnap.data() as any;
        const item: RideItem = {
          id: docSnap.id,
          customerName: d.customerName || 'Customer',
          customerPhone: d.customerPhone,
          pickupAddress: d?.pickup?.address || '-',
          dropoffAddress: (d?.dropoffs?.[0]?.address) || '-',
          status: (d.status as RideStatus) || 'requested',
          cost: d.cost,
          requestedAt: d.requestedAt?.toDate ? d.requestedAt.toDate() : undefined,
        };
        items.push(item);
      });
      setRides(items);
      setLoading(false);
    });
    return () => unsub();
  }, [status]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rides;
    return rides.filter(r =>
      r.customerName.toLowerCase().includes(s) ||
      r.pickupAddress.toLowerCase().includes(s) ||
      r.dropoffAddress.toLowerCase().includes(s) ||
      r.id.toLowerCase().includes(s)
    );
  }, [rides, search]);

  const updateStatus = async (rideId: string, next: RideStatus) => {
    const ref = doc(db, 'rides', rideId);
    await updateDoc(ref, { status: next, adminUpdatedAt: serverTimestamp() });
  };

  const cancelRide = async (rideId: string) => {
    const ref = doc(db, 'rides', rideId);
    await updateDoc(ref, { status: 'cancelled', adminUpdatedAt: serverTimestamp() });
  };

  const deleteRide = async (rideId: string) => {
    await deleteDoc(doc(db, 'rides', rideId));
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
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Rides</CardTitle>
            <CardDescription>Filter, search, and manage ride requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="flex gap-3 w-full md:w-auto">
                <Input placeholder="Search by customer, address, or ID" value={search} onChange={(e) => setSearch(e.target.value)} />
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="requested">Requested</SelectItem>
                    <SelectItem value="driver_assigned">Driver Assigned</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Dropoff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className={focusId === r.id ? 'bg-accent/30' : ''}>
                  <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}…</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{r.customerName}</span>
                      {r.customerPhone && <span className="text-xs text-muted-foreground">{r.customerPhone}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">{r.pickupAddress}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{r.dropoffAddress}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.status.replace('_',' ')}</Badge></TableCell>
                  <TableCell>{typeof r.cost === 'number' ? `$${r.cost.toFixed(2)}` : '—'}</TableCell>
                  <TableCell>{r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '—'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {r.status !== 'completed' && (
                      <Button size="sm" variant="secondary" onClick={() => updateStatus(r.id, 'completed')}>Mark Completed</Button>
                    )}
                    {r.status !== 'cancelled' && (
                      <Button size="sm" variant="destructive" onClick={() => cancelRide(r.id)}>Cancel</Button>
                    )}
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/ride-request?id=${r.id}`}>Open</Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteRide(r.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!loading && filtered.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">No rides found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
      </div>
    </DashboardLayout>
  );
}

export default withAuth(AdminRidesPage, ['admin']);