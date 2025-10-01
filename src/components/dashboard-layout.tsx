'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/components/login-form';
import { useAuth } from '@/contexts/auth-context';
import { Logo } from './icons';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
  desktopNav,
  mainClassName,
  contentClassName,
}: {
  children: React.ReactNode;
  desktopNav?: React.ReactNode;
  mainClassName?: string;
  contentClassName?: string;
}) {
  const { user, role } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };
  
  const roleName = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-10">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="h-8 w-8" />
          <span className="hidden md:inline-block">BIA TaxiGo</span>
        </Link>
        
        <div className="flex-1 flex justify-center">
            {desktopNav}
        </div>
        
        <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground hidden lg:block">
                {roleName} Dashboard
            </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || ''} />}
                  <AvatarFallback>
                    {user?.displayName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className={cn('flex-1', mainClassName)}>
        <div className={cn('flex flex-col flex-1 h-full p-4 md:p-8', contentClassName)}>
         {children}
        </div>
      </main>
    </div>
  );
}
