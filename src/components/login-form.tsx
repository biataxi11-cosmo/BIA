'use client';

import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { auth, db } from '@/lib/firebase';
import { useAuth, UserRole } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
});

export function LoginForm({ role }: { role: UserRole }) {
  const { setRole } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      if (isRegister) {
        // Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        
        // Update user profile with display name
        if (userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: values.email.split('@')[0], // Use email prefix as display name
          });

          // Create user profile in Firestore with the correct role
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: values.email,
            displayName: values.email.split('@')[0],
            role: role,
            createdAt: new Date(),
            updatedAt: new Date(),
            emergencyContacts: [],
          });

          toast({
            title: 'Registration successful',
            description: 'You can now sign in with your credentials.',
          });
          setIsRegister(false); // Switch to sign-in form
        }
      } else {
        // Sign in the user
        const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
        
        // Check if user's registered role matches the role they're trying to log in as
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userRole = userData.role;
          
          // If user is trying to log in with a different role than registered
          if (userRole !== role) {
            // Sign out the user
            await auth.signOut();
            
            // Show appropriate error message
            let errorMessage = '';
            if (userRole === 'customer') {
              errorMessage = 'This account is registered as a customer. Please log in through the customer portal.';
            } else if (userRole === 'driver') {
              errorMessage = 'This account is registered as a driver. Please log in through the driver portal.';
            } else if (userRole === 'admin') {
              errorMessage = 'This account is registered as an admin. Please log in through the admin portal.';
            } else {
              errorMessage = `This account is registered as ${userRole}. Please log in through the correct portal.`;
            }
            
            toast({
              variant: 'destructive',
              title: 'Login Restricted',
              description: errorMessage,
            });
            return;
          }
        }
        
        // If role matches or user doc doesn't exist (shouldn't happen), proceed with login
        setRole(role);
        toast({
          title: 'Login successful',
          description: `Welcome to BIA TaxiGo as ${role}!`,
        });
        router.push(`/${role}/dashboard`);
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      // Handle specific Firebase auth errors with user-friendly messages
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'auth/internal-error':
          errorMessage = 'Authentication service error. Please try again.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid credentials. Please check your email and password.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        default:
          // For any other Firebase errors, show a generic message
          errorMessage = 'Authentication failed. Please check your credentials and try again.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const roleName = role.charAt(0).toUpperCase() + role.slice(1);
  const pageTitle = isRegister ? `Register as ${roleName}` : `Sign in as ${roleName}`;
  const buttonText = isRegister ? 'Register' : 'Sign in';
  const toggleText = isRegister
    ? 'Already have an account? Sign in'
    : "Don't have an account? Register";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>
            Enter your email and password to continue.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@example.com"
                        {...field}
                        type="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        {...field}
                        type="password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {buttonText}
              </Button>
              <Button
                variant="link"
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-sm"
              >
                {toggleText}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

export const signOut = async () => {
  await firebaseSignOut(auth);
  // Ensure this runs only on the client
  if (typeof window !== 'undefined') {
    localStorage.removeItem('userRole');
  }
};