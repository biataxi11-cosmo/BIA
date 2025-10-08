import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface FareSettings {
  baseFare: number;
  perKmRate: number;
  updatedAt: string;
}

// Default fare settings
export const DEFAULT_FARE_SETTINGS: FareSettings = {
  baseFare: 300, // LKR
  perKmRate: 150, // LKR per km
  updatedAt: new Date().toISOString(),
};

/**
 * Fetch current fare settings from Firestore
 * @returns Promise<FareSettings>
 */
export async function getFareSettings(): Promise<FareSettings> {
  try {
    const fareSettingsDoc = doc(db, 'settings', 'fare');
    const docSnap = await getDoc(fareSettingsDoc);
    
    if (docSnap.exists()) {
      return docSnap.data() as FareSettings;
    } else {
      // Return default values if no settings exist
      return DEFAULT_FARE_SETTINGS;
    }
  } catch (error) {
    console.error('Error fetching fare settings:', error);
    // Return defaults if there's an error
    return DEFAULT_FARE_SETTINGS;
  }
}

/**
 * Calculate fare based on distance
 * @param distanceInKm Distance in kilometers
 * @param fareSettings Fare settings to use for calculation
 * @returns Calculated fare
 */
export function calculateFare(distanceInKm: number, fareSettings: FareSettings): number {
  const { baseFare, perKmRate } = fareSettings;
  const calculatedFare = baseFare + (distanceInKm * perKmRate);
  return Math.round(calculatedFare);
}