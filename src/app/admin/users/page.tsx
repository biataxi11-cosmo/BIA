'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
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

type UserRole = 'customer' | 'driver' | 'admin';

interface UserItem {
  uid: string;
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  role: UserRole;
  isDisabled?: boolean;
  createdAt?: Date;
}

function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [role, setRole] = useState<UserRole | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const navLinks = useMemo(() => ([
    { href: '/admin/dashboard', icon: Home, label: 'Home' },
    { href: '/admin/ride-request', icon: List, label: 'Rides' },
    { href: '/admin/users', icon: Users, label: 'Users', active: true },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
  ]), []);

  useEffect(() => {
    const base = collection(db, 'users');
    const q = role === 'all' ? query(base, orderBy('createdAt', 'desc')) : query(base, where('role', '==', role), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: UserItem[] = [];
      snap.forEach(docSnap => {
        const d = docSnap.data() as any;
        items.push({
          uid: docSnap.id,
          displayName: d.displayName || d.fullName,
          email: d.email,
          phoneNumber: d.phoneNumber,
          role: (d.role as UserRole) || 'customer',
          isDisabled: !!d.isDisabled,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : undefined,
        });
      });
      setUsers(items);
      setLoading(false);
    });
    return () => unsub();
  }, [role]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return users;
    return users.filter(u =>
      (u.displayName || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s) ||
      (u.phoneNumber || '').toLowerCase().includes(s) ||
      u.uid.toLowerCase().includes(s)
    );
  }, [users, search]);

  const toggleDisable = async (uid: string, disable: boolean) => {
    await updateDoc(doc(db, 'users', uid), { isDisabled: disable });
  };

  const setUserRole = async (uid: string, next: UserRole) => {
    await updateDoc(doc(db, 'users', uid), { role: next });
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
            <CardTitle>Users</CardTitle>
            <CardDescription>Search and manage registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="flex gap-3 w-full md:w-auto">
                <Input placeholder="Search by name, email, or ID" value={search} onChange={(e) => setSearch(e.target.value)} />
                <Select value={role} onValueChange={(v) => setRole(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
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
                <TableHead>UID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.uid}>
                  <TableCell className="font-mono text-xs">{u.uid.slice(0,8)}…</TableCell>
                  <TableCell>{u.displayName || '—'}</TableCell>
                  <TableCell>{u.email || '—'}</TableCell>
                  <TableCell>{u.phoneNumber || '—'}</TableCell>
                  <TableCell className="capitalize"><Badge variant="outline">{u.role}</Badge></TableCell>
                  <TableCell>{u.isDisabled ? <Badge variant="destructive">Disabled</Badge> : <Badge variant="secondary">Active</Badge>}</TableCell>
                  <TableCell>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Select value={u.role} onValueChange={(v) => setUserRole(u.uid, v as UserRole)}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Set role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {u.isDisabled ? (
                      <Button size="sm" variant="secondary" onClick={() => toggleDisable(u.uid, false)}>Enable</Button>
                    ) : (
                      <Button size="sm" variant="destructive" onClick={() => toggleDisable(u.uid, true)}>Disable</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!loading && filtered.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">No users found</TableCell>
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

export default withAuth(AdminUsersPage, ['admin']);


