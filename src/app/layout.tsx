import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/contexts/auth-context';
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata: Metadata = {
  title: 'BIA TaxiGo',
  description: 'Your reliable ride-hailing service.',
  keywords: ['taxi', 'ride', 'transportation', 'BIA', 'Sri Lanka'],
  authors: [{ name: 'BIA TaxiGo Team' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  robots: 'index, follow',
  openGraph: {
    title: 'BIA TaxiGo',
    description: 'Your reliable ride-hailing service.',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#000000" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={cn('font-body antialiased')}>
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}