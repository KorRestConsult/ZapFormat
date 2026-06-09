export type UserRole = 'customer' | 'admin';

export type OrderStatus =
  | 'new'
  | 'checking'
  | 'price_confirmed'
  | 'awaiting_payment'
  | 'ordered_from_supplier'
  | 'in_transit'
  | 'ready_for_pickup'
  | 'issued'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type DeliveryMethod = 'pickup' | 'delivery';
export type SupplierPriceLevel = 'public' | 'authorized';

export interface AppUser {
  uid: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface BusinessSettings {
  markupPercent: number;
  companyName: string;
  phone: string;
  telegram: string;
  whatsapp: string;
  city: string;
  pickupAddress: string;
  workingHours: string;
  legalNote: string;
}

export interface SupplierPart {
  id: string;
  article: string;
  brand: string;
  name: string;
  publicBasePrice: number;
  authorizedBasePrice: number;
  basePrice: number;
  availability: number;
  deliveryTerm: string;
  supplier: string;
  priceLevel: SupplierPriceLevel;
}

export interface CartItem extends SupplierPart {
  clientPrice: number;
  quantity: number;
}

export interface OrderItem {
  article: string;
  brand: string;
  name: string;
  basePrice: number;
  clientPrice: number;
  quantity: number;
  availability: number;
  deliveryTerm: string;
  supplier: string;
}

export interface Order {
  id?: string;
  userId: string | null;
  customerName: string;
  phone: string;
  items: OrderItem[];
  totalClientPrice: number;
  totalBasePrice: number;
  markupPercent: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryMethod: DeliveryMethod;
  clientComment: string;
  adminComment: string;
  createdAt: string;
  updatedAt: string;
}

export interface VinRequest {
  id?: string;
  userId: string | null;
  vin: string;
  carBrand: string;
  carModel: string;
  year: string;
  requestedPart: string;
  phone: string;
  comment: string;
  status: 'new' | 'checking' | 'done' | 'cancelled';
  adminComment: string;
  photoUrl?: string;
  createdAt: string;
}

export interface Car {
  id?: string;
  userId: string;
  brand: string;
  model: string;
  year: string;
  vin: string;
  engine: string;
  comment: string;
}
