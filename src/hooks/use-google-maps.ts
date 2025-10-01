import { useState, useEffect } from 'react';

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

export const useGoogleMaps = (apiKey: string) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // If no API key, don't load
    if (!apiKey) {
      setError('Google Maps API key is missing');
      return;
    }

    // Check if script is already loading
    const existingScript = document.querySelector(
      `script[src^="https://maps.googleapis.com/maps/api/js?key=${apiKey}"]`
    );
    
    if (existingScript) {
      // Script is already loading, wait for it
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval);
          setIsLoaded(true);
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isLoaded) {
          setError('Google Maps failed to load within 10 seconds');
        }
      }, 10000);
      
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=Function.prototype`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError('Failed to load Google Maps script');
    
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [apiKey]);

  return { isLoaded, error };
};