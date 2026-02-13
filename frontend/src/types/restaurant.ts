export interface Restaurant {
  id: string;
  name: string;
  description: string;
  image: string;
  rating: number;
  reviewCount: number;
  cuisine: string;
  zone: string;
  priceRange: '$' | '$$' | '$$$' | '$$$$';
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  address: string;
  hasOffers: boolean;
  offerText?: string;
}

export interface Mesa {
  id: string;
  number: number;
  capacity: number;
  status: 'disponible' | 'ocupada' | 'pendiente' | 'reservada';
  x: number;
  y: number;
  shape: 'round' | 'square' | 'rectangle';
  width: number;
  height: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  isPeak: boolean;
  requiresDeposit: boolean;
  depositAmount?: number;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  mesaId: string;
  date: string;
  time: string;
  guests: number;
  specialRequest?: string;
  occasion?: 'romantic' | 'birthday' | 'business' | 'family' | 'other';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  qrCode?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category: string;
  isHighlighted: boolean;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discount: string;
  validUntil: string;
  restaurantId: string;
}
