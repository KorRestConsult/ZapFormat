export type UserRole = 'client' | 'customer' | 'admin';

export type OrderStatus =
  | 'new'
  | 'checking'
  | 'awaiting_payment'
  | 'ordered'
  | 'in_transit'
  | 'arrived'
  | 'ready_for_pickup'
  | 'issued'
  | 'cancelled'
  | 'return';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type DeliveryMethod = 'pickup' | 'delivery';
export type PaymentMethod = 'cash' | 'transfer' | 'sbp';
export type SupplierMode = 'demo' | 'proxy' | 'live';
export type SearchKind = 'vin' | 'article' | 'brand' | 'name' | 'category' | 'garage';
export type ReturnReason = 'not_fit' | 'defect' | 'other';
export type ReturnStatus = 'new' | 'checking' | 'approved' | 'declined' | 'done';

export interface AppUser {
  uid: string;
  phone: string;
  name: string;
  telegram: string;
  city: string;
  comment: string;
  email?: string;
  role: UserRole;
  createdAt: string;
}

export interface BusinessSettings {
  defaultMarkupPercent: number;
  markupPercent: number;
  minMarginRub: number;
  roundingStep: number;
  companyName: string;
  phone: string;
  telegram: string;
  whatsapp: string;
  city: string;
  pickupAddress: string;
  workingHours: string;
  legalNote: string;
  telegramBotToken?: string;
  telegramOwnerChatId?: string;
  supplierMode: SupplierMode;
  proxyEnabled: boolean;
}

export interface SupplierPart {
  id: string;
  supplier: string;
  brand: string;
  article: string;
  name: string;
  description: string;
  imageUrl: string;
  purchasePrice: number;
  basePrice?: number;
  clientPrice: number;
  markupPercent: number;
  marginRub: number;
  availability: number;
  deliveryDays: number;
  deliveryText: string;
  warehouse: string;
  probability: number;
  isOriginal: boolean;
  analogs: string[];
  applicability: string[];
  category: string;
  updatedAt: string;
}

export interface CartItem extends SupplierPart {
  quantity: number;
  garageCarId?: string;
  vin?: string;
}

export interface OrderItem {
  brand: string;
  article: string;
  name: string;
  imageUrl: string;
  purchasePrice: number;
  basePrice?: number;
  clientPrice: number;
  markupPercent: number;
  marginRub: number;
  quantity: number;
  availability: number;
  deliveryText: string;
  deliveryTerm?: string;
  supplier: string;
  warehouse: string;
  probability: number;
  isOriginal: boolean;
}

export interface Order {
  id?: string;
  userId: string | null;
  garageCarId?: string;
  customerName: string;
  phone: string;
  telegram: string;
  vin: string;
  carLabel: string;
  items: OrderItem[];
  totalClientPrice: number;
  totalPurchasePrice: number;
  totalMargin: number;
  totalBasePrice?: number;
  markupPercent: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  contactMethod: 'phone' | 'telegram' | 'whatsapp';
  comment: string;
  clientComment?: string;
  internalComment: string;
  adminComment?: string;
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

export interface CarPartHistoryItem {
  article: string;
  brand: string;
  name: string;
  orderId?: string;
  replacedAt?: string;
  mileage?: string;
}

export interface Car {
  id?: string;
  userId: string;
  brand: string;
  model: string;
  generation: string;
  year: string;
  engine: string;
  vin: string;
  plate: string;
  mileage: string;
  photoUrl: string;
  comment: string;
  partsHistory: CarPartHistoryItem[];
  createdAt: string;
}

export interface ReturnRequest {
  id?: string;
  userId: string | null;
  orderId: string;
  reason: ReturnReason;
  comment: string;
  photos: string[];
  status: ReturnStatus;
  createdAt: string;
}
