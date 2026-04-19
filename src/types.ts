export interface Material {
  id: string;
  name: string;
  brand: string;
  category: string; // PLA, PETG, etc. (Maps to category in Firestore)
  color: string;    // Maps to color in Firestore
  colorHex?: string; // Maps to colorHex in Firestore
  imageUrl: string;
  inStock: boolean;
  pricePerKg?: number; // New field from screenshot
  updatedAt?: any;
}

export type MaterialType = 'ALL' | 'PLA' | 'PETG' | 'PETG-CF' | 'ABS' | 'ASA' | 'TPU' | 'RESIN';
