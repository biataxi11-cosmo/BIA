import { useJsApiLoader } from '@react-google-maps/api';

// Shared configuration for Google Maps loader
const GOOGLE_MAPS_CONFIG = {
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  libraries: ['places', 'routes'] as const,
};

// Custom hook to ensure consistent Google Maps loading across the app
export function useGoogleMapsLoader() {
  return useJsApiLoader({
    id: 'google-map-script-shared',
    ...GOOGLE_MAPS_CONFIG,
  });
}