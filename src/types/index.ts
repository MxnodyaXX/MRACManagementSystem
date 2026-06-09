export type VehicleStatus = 'Available' | 'Reserved' | 'Ongoing' | 'Maintenance';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nic?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface Insurance {
  provider: string;
  policyNumber: string;
  expiryDate: string;
  premium: number;
}

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  brand: string;
  model: string;
  year: number;
  ownerId: string;
  dailyRent: number;
  extraKmRate?: number;      // Rs per km beyond included km
  includedKmPerDay?: number; // free km per rental day (default 100)
  status: VehicleStatus;
  insurance: Insurance;
  revenue: number;
  rentCount: number;
  imageUrl?: string;
  color?: string;
  seats?: number;
  fuelType?: string;
  transmission?: string;
  mileage?: number;
  createdAt: string;
}

export interface Owner {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  bankAccount?: string;
  commissionRate: number;
  totalEarnings: number;
  pendingPayout: number;
  createdAt: string;
}

export interface BookingQuotation {
  startLocation: string;
  endLocation: string;
  stops: string[];
  isRoundTrip: boolean;
  totalKm: number;          // manually entered estimated km
}

export interface VehicleHandover {
  id: string;
  bookingId: string;
  vehicleId: string;
  type: 'delivery' | 'return';
  location: string;
  dateTime: string;
  mileage: number;
  fuelLevel: string;
  notes?: string;
  extraKm?: number;
  extraKmCharge?: number;
  finalAmount?: number;
  createdAt: string;
}

export interface Booking {
  id: string;
  vehicleId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerNIC?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalAmount: number;
  estimatedAmount?: number;  // from quotation calculator
  paidAmount: number;
  status: 'Confirmed' | 'Ongoing' | 'Completed' | 'Cancelled';
  referral?: string;         // owner name / 'Direct'
  notes?: string;
  createdAt: string;
  pickupLocation?: string;
  dropLocation?: string;
  driverId?: string;
  quotation?: BookingQuotation;
  depositAmount?: number;
  depositReturned?: number;
  depositDeduction?: number;
  depositNotes?: string;
}

export interface Inquiry {
  id: string;
  customerName: string;
  customerPhone: string;
  requestedVehicle: string;
  preferredBrand?: string;
  startDate: string;
  endDate: string;
  referral: string;
  status: 'Pending' | 'Converted' | 'Lost';
  lostReason?: string;
  notes?: string;
  createdAt: string;
}

export interface Commission {
  id: string;
  bookingId: string;
  vehicleId: string;
  ownerId: string;
  referral: string;
  totalIncome: number;
  commissionRate: number;
  commissionAmount: number;
  ownerPayout: number;
  coordinatorFee?: number;
  status: 'Pending' | 'Paid' | 'Credit';
  createdAt: string;
}

export type ExpenseCategory = 'Service' | 'Repair' | 'Fine' | 'Damage' | 'Tire' | 'Insurance' | 'Fuel' | 'Other';

export interface Expense {
  id: string;
  vehicleId: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
  receipt?: string;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: 'Available' | 'On Duty' | 'Off';
  dailyRate: number;
  totalEarnings: number;
  currentBookingId?: string;
  joinedAt: string;
  address?: string;
  nic?: string;
}

export interface Notification {
  id: string;
  type: 'BookingReminder' | 'ReturnReminder' | 'Overdue' | 'ServiceReminder' | 'InsuranceExpiry' | 'General';
  title: string;
  message: string;
  relatedId?: string;
  read: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nic?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface AppState {
  vehicles: Vehicle[];
  owners: Owner[];
  bookings: Booking[];
  inquiries: Inquiry[];
  commissions: Commission[];
  expenses: Expense[];
  drivers: Driver[];
  notifications: Notification[];
  handovers: VehicleHandover[];
  customers: Customer[];

  loaded: boolean;
  loadAll: () => Promise<void>;

  addHandover: (h: Omit<VehicleHandover, 'id' | 'createdAt'>) => void;

  addCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  addVehicle: (v: Omit<Vehicle, 'id' | 'createdAt' | 'revenue' | 'rentCount'>) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;

  addOwner: (o: Omit<Owner, 'id' | 'createdAt' | 'totalEarnings' | 'pendingPayout'>) => void;
  updateOwner: (id: string, updates: Partial<Owner>) => void;

  addBooking: (b: Omit<Booking, 'id' | 'createdAt'>) => string;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  cancelBooking: (id: string) => void;
  startBooking: (id: string) => void;
  completeBooking: (id: string) => void;

  addInquiry: (i: Omit<Inquiry, 'id' | 'createdAt'>) => void;
  updateInquiry: (id: string, updates: Partial<Inquiry>) => void;

  addExpense: (e: Omit<Expense, 'id' | 'createdAt'>) => void;
  deleteExpense: (id: string) => void;

  addDriver: (d: Omit<Driver, 'id' | 'joinedAt' | 'totalEarnings'>) => void;
  updateDriver: (id: string, updates: Partial<Driver>) => void;

  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;

  isVehicleAvailable: (vehicleId: string, startDate: string, endDate: string, excludeBookingId?: string) => boolean;
  updateCommission: (id: string, updates: Partial<Commission>) => void;
}
