'use client';

import { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  Loader2,
  MapPin,
  Star,
  Clock,
  Milestone,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/icons';
import { calculateTip } from '@/ai/flows/payment-tip-calculation';
import type { CalculateTipOutput } from '@/ai/flows/payment-tip-calculation';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

type RideState =
  | 'INITIAL'
  | 'SEARCHING'
  | 'DRIVER_ASSIGNED'
  | 'IN_PROGRESS'
  | 'PAYMENT'
  | 'COMPLETE';

type LatLng = { lat: number; lng: number };

type SelectionMode = 'pickup' | 'dropoff';

const tipFormSchema = z.object({
  rideFare: z.coerce.number().min(1, { message: 'Fare must be at least 1.' }),
  location: z.string().min(2, { message: 'Location is required.' }),
});

const driver = {
  name: 'John D.',
  rating: 4.9,
  car: {
    model: 'Toyota Prius',
    licensePlate: 'BIA-123',
  },
  eta: 5,
};

function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-10 p-4 md:p-6 bg-gradient-to-b from-black/60 to-transparent">
      <div className="flex items-center gap-3 text-white">
        <Logo className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-headline font-bold">BIA TaxiGo</h1>
      </div>
    </header>
  );
}

function RideRequestForm({
  onRideRequest,
  pickupAddress,
  dropoffAddress,
  selectionMode,
  setSelectionMode,
  pickup,
  dropoff,
  onPickupSelect,
  onDropoffSelect,
  tripDistance,
  tripDuration,
}: {
  onRideRequest: () => void;
  pickupAddress: string;
  dropoffAddress: string;
  selectionMode: SelectionMode;
  setSelectionMode: (mode: SelectionMode) => void;
  pickup: LatLng | null;
  dropoff: LatLng | null;
  onPickupSelect: (address: string, coordinates: LatLng | null) => void;
  onDropoffSelect: (address: string, coordinates: LatLng | null) => void;
  tripDistance: string | null;
  tripDuration: string | null;
}) {
  return (
    <>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Where to?</CardTitle>
        <CardDescription>
          Enter your pickup and drop-off locations.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={pickupAddress}
            onChange={(e) => onPickupSelect(e.target.value, null)}
            onFocus={() => setSelectionMode('pickup')}
            placeholder="Enter pickup location"
            className={cn("pl-10", selectionMode === 'pickup' && 'ring-2 ring-primary')}
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={dropoffAddress}
            onChange={(e) => onDropoffSelect(e.target.value, null)}
            onFocus={() => setSelectionMode('dropoff')}
            placeholder="Enter destination"
            className={cn("pl-10", selectionMode === 'dropoff' && 'ring-2 ring-primary')}
          />
        </div>
        {tripDistance && tripDuration && (
            <div className="flex justify-around p-2 bg-secondary rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Milestone className="w-4 h-4 text-muted-foreground" />
                    <span>{tripDistance}</span>
                </div>
                 <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{tripDuration}</span>
                </div>
            </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={onRideRequest}
          className="w-full"
          size="lg"
          disabled={!pickup || !dropoff}
        >
          Request Ride
          <ArrowRight className="ml-2" />
        </Button>
      </CardFooter>
    </>
  );
}

function SearchingForDriver() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 10));
    }, 300);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <CardHeader className="items-center text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <CardTitle className="font-headline text-2xl pt-4">
          Searching for Driver
        </CardTitle>
        <CardDescription>
          Connecting you with a nearby driver...
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={progress} />
      </CardContent>
    </>
  );
}

function DriverDetails() {
  const driverAvatar = PlaceHolderImages.find((p) => p.id === 'driver-avatar');
  return (
    <>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          Driver on the way
        </CardTitle>
        <CardDescription>{driver.eta} min ETA</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary">
            {driverAvatar && (
              <AvatarImage
                src={driverAvatar.imageUrl}
                alt={driver.name}
                data-ai-hint={driverAvatar.imageHint}
              />
            )}
            <AvatarFallback>{driver.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <p className="font-bold text-lg">{driver.name}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{driver.rating}</span>
            </div>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="flex justify-between items-center text-sm">
          <div className="grid gap-1">
            <span className="text-muted-foreground">Car</span>
            <span className="font-medium">{driver.car.model}</span>
          </div>
          <div className="grid gap-1 text-right">
            <span className="text-muted-foreground">License Plate</span>
            <span className="font-medium font-mono tracking-widest bg-muted px-2 py-1 rounded-md">
              {driver.car.licensePlate}
            </span>
          </div>
        </div>
      </CardContent>
    </>
  );
}

function InProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 1.25));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">On your way</CardTitle>
        <CardDescription>Estimated arrival in 8 minutes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-primary" />
          <p className="truncate text-sm">{/* TODO: Dropoff address */}</p>
        </div>
        <Progress value={progress} />
      </CardContent>
    </>
  );
}

function PaymentForm({ onPaymentComplete }: { onPaymentComplete: () => void }) {
  const { toast } = useToast();
  const [tipResult, setTipResult] = useState<CalculateTipOutput | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const totalFare = 55;

  const form = useForm<z.infer<typeof tipFormSchema>>({
    resolver: zodResolver(tipFormSchema),
    defaultValues: {
      rideFare: totalFare,
      location: 'New York, USA',
    },
  });

  async function onSubmit(values: z.infer<typeof tipFormSchema>) {
    setIsCalculating(true);
    setTipResult(null);
    try {
      const result = await calculateTip(values);
      setTipResult(result);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error calculating tip',
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsCalculating(false);
    }
  }

  const finalAmount = totalFare + (tipResult?.suggestedTipAmount || 0);

  return (
    <>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Trip Complete!</CardTitle>
        <CardDescription>Please complete your payment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-baseline">
          <span className="text-muted-foreground">Ride Fare</span>
          <span className="font-bold text-2xl font-headline">
            ${totalFare.toFixed(2)}
          </span>
        </div>
        <Separator />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ride Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., New York, USA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isCalculating} className="w-full">
              {isCalculating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Calculate Tip
            </Button>
          </form>
        </Form>
        {tipResult && (
          <div className="p-4 bg-accent/10 rounded-lg text-center animate-in fade-in duration-300">
            {tipResult.isTippingCustomary ? (
              <>
                <p className="text-sm">
                  Tipping is customary in {form.getValues('location')}.
                </p>
                <p className="font-bold text-accent-foreground text-lg">
                  Suggested tip: ${tipResult.suggestedTipAmount.toFixed(2)} (
                  {tipResult.suggestedTipPercentage}%)
                </p>
              </>
            ) : (
              <p>Tipping is not customary in {form.getValues('location')}.</p>
            )}
          </div>
        )}
        <Separator />
        <div className="flex justify-between items-baseline text-primary">
          <span className="text-lg">Total</span>
          <span className="font-bold text-3xl font-headline">
            ${finalAmount.toFixed(2)}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onPaymentComplete} className="w-full" size="lg">
          Pay ${finalAmount.toFixed(2)}
        </Button>
      </CardFooter>
    </>
  );
}

function RatingForm({ onComplete }: { onComplete: () => void }) {
  const [rating, setRating] = useState(0);
  return (
    <>
      <CardHeader className="items-center text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <CardTitle className="font-headline text-2xl pt-4">
          Payment Successful
        </CardTitle>
        <CardDescription>Thank you for riding with us!</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm font-medium mb-2">Rate your driver</p>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => setRating(star)}>
              <Star
                className={cn(
                  'h-8 w-8 transition-colors',
                  rating >= star
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-muted-foreground/50'
                )}
              />
            </button>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onComplete} className="w-full">
          Done
        </Button>
      </CardFooter>
    </>
  );
}

export function RideFlow() {
  const [rideState, setRideState] = useState<RideState>('INITIAL');
  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('pickup');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');

  const [tripDistance, setTripDistance] = useState<string | null>(null);
  const [tripDuration, setTripDuration] = useState<string | null>(null);

  const handlePickupSelect = (address: string, latLng: LatLng | null) => {
    setPickupAddress(address);
    setTripDistance(null);
    setTripDuration(null);
    if (latLng) {
      setPickup(latLng);
    } else {
      setPickup(null);
    }
  };

  const handleDropoffSelect = (
    address: string,
    latLng: LatLng | null
  ) => {
    setDropoffAddress(address);
    setTripDistance(null);
    setTripDuration(null);
    if (latLng) {
      setDropoff(latLng);
    } else {
      setDropoff(null);
    }
  };

  const handleRequestRide = () => {
    setRideState('SEARCHING');
    setTimeout(() => {
      setRideState('DRIVER_ASSIGNED');
      setTimeout(() => {
        setRideState('IN_PROGRESS');
        setTimeout(() => {
          setRideState('PAYMENT');
        }, 8000);
      }, 5000);
    }, 3000);
  };

  const handlePaymentComplete = () => {
    setRideState('COMPLETE');
  };

  const handleRatingComplete = () => {
    resetRide();
  };

  const handleBackToInitial = () => {
    setRideState('INITIAL');
  };

  const resetRide = () => {
    setRideState('INITIAL');
    setPickup(null);
    setDropoff(null);
    setPickupAddress('');
    setDropoffAddress('');
    setSelectionMode('pickup');
    setTripDistance(null);
    setTripDuration(null);
  };

  const renderContent = () => {
    switch (rideState) {
      case 'INITIAL':
        return (
          <RideRequestForm
            onRideRequest={handleRequestRide}
            pickupAddress={pickupAddress}
            dropoffAddress={dropoffAddress}
            selectionMode={selectionMode}
            setSelectionMode={setSelectionMode}
            pickup={pickup}
            dropoff={dropoff}
            onPickupSelect={handlePickupSelect}
            onDropoffSelect={handleDropoffSelect}
            tripDistance={tripDistance}
            tripDuration={tripDuration}
          />
        );
      case 'SEARCHING':
        return <SearchingForDriver />;
      case 'DRIVER_ASSIGNED':
        return <DriverDetails />;
      case 'IN_PROGRESS':
        return <InProgress />;
      case 'PAYMENT':
        return <PaymentForm onPaymentComplete={handlePaymentComplete} />;
      case 'COMPLETE':
        return <RatingForm onComplete={handleRatingComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      <Header />
      <div className="absolute inset-0 flex items-end md:items-center justify-center md:justify-end p-4 md:p-8">
        <Card
          key={rideState}
          className="w-full max-w-md shadow-2xl animate-in fade-in-20 slide-in-from-bottom-10 md:slide-in-from-right-10 duration-500"
        >
          {rideState !== 'INITIAL' && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 left-3"
              onClick={
                rideState === 'SEARCHING' ? resetRide : handleBackToInitial
              }
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          {renderContent()}
        </Card>
      </div>
    </div>
  );
}
