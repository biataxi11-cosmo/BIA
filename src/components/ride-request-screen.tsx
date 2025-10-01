'use client';

import {
  ArrowLeft,
  Car,
  Check,
  ChevronRight,
  CircleDot,
  Heart,
  Plus,
  LocateFixed,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';

export function RideRequestScreen() {
  const router = useRouter();

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Header */}
      <div className="absolute top-4 left-4 z-20">
        <Button variant="outline" size="icon" className="rounded-full h-12 w-12 bg-card" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </div>

      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
         <Button variant="outline" size="icon" className="rounded-full h-12 w-12 bg-card">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-orange-500"><path d="M5.5 13.5h13m-13 3h13m-13 3h13"/><path d="M4.5 20.5a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2z"/><path d="M15.5 10.5a2 2 0 0 0-4 0m2-3v3m-3-10l-3 3m13-3l3 3"/></svg>
        </Button>
      </div>
       <div className="absolute top-20 right-4 z-20 flex flex-col gap-2">
         <Button variant="outline" size="icon" className="rounded-full h-12 w-12 bg-card">
         <LocateFixed className="h-6 w-6" />
        </Button>
      </div>


      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
        <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
                <Button variant="outline" className="rounded-full">
                    <Car className="mr-2 h-4 w-4" />
                    Later
                </Button>
                 <RadioGroup defaultValue="one-way" className="flex items-center">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="one-way" id="one-way" />
                        <Label htmlFor="one-way" className="font-normal">One way</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="return" id="return" />
                        <Label htmlFor="return" className="font-normal">Return trip*</Label>
                    </div>
                </RadioGroup>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                    <CircleDot className="text-primary h-4 w-4"/>
                    <div className="w-px h-6 bg-border my-1"></div>
                    <div className="h-1 w-1 bg-foreground rounded-full"></div>
                    <div className="h-1 w-1 bg-foreground rounded-full my-1"></div>
                    <div className="h-1 w-1 bg-foreground rounded-full"></div>
                     <div className="w-px h-6 bg-border my-1"></div>
                    <Car className="text-orange-500 h-4 w-4"/>
                </div>

                <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-primary font-semibold">PICKUP</p>
                            <p>Your Location</p>
                        </div>
                        <Button variant="ghost" size="icon">
                            <Heart className="h-5 w-5" />
                        </Button>
                    </div>
                    <Separator />
                     <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-orange-500 font-semibold">DROP</p>
                            <p className="text-muted-foreground">Where are you going?</p>
                        </div>
                        <Button variant="ghost" size="icon">
                            <Plus className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}