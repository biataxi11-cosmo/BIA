import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold">Welcome to BIA TaxiGo</h1>
        <p className="text-muted-foreground">Your reliable ride-hailing service.</p>
        <div className="flex gap-4 justify-center">
            <Button asChild>
                <Link href="/customer/login">Login as Customer</Link>
            </Button>
            <Button asChild>
                <Link href="/driver/login">Login as Driver</Link>
            </Button>
            <Button asChild>
                <Link href="/admin/login">Login as Admin</Link>
            </Button>
        </div>
        <div className="flex gap-4 justify-center">
             <Button asChild variant="secondary">
                <Link href="/ride">Go to Ride Flow</Link>
            </Button>
        </div>
      </div>
    </main>
  );
}
