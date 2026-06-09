import { supabase } from './supabase'
import type {
  Vehicle, Owner, Booking, Inquiry, Commission,
  Expense, Driver, Notification, VehicleHandover,
} from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Mappers: DB row (snake_case) ↔ TS types (camelCase)
// ─────────────────────────────────────────────────────────────────────────────

function vFromDb(r: Record<string, unknown>): Vehicle {
  return {
    id: r.id as string, vehicleNumber: r.vehicle_number as string,
    brand: r.brand as string, model: r.model as string, year: r.year as number,
    ownerId: r.owner_id as string, dailyRent: r.daily_rent as number,
    extraKmRate: (r.extra_km_rate as number) ?? undefined,
    includedKmPerDay: (r.included_km_per_day as number) ?? undefined,
    status: r.status as Vehicle['status'],
    insurance: r.insurance as Vehicle['insurance'],
    revenue: r.revenue as number, rentCount: r.rent_count as number,
    imageUrl: (r.image_url as string) ?? undefined,
    color: (r.color as string) ?? undefined, seats: (r.seats as number) ?? undefined,
    fuelType: (r.fuel_type as string) ?? undefined,
    transmission: (r.transmission as string) ?? undefined,
    mileage: (r.mileage as number) ?? undefined, createdAt: r.created_at as string,
  }
}

function vToDb(v: Vehicle) {
  return {
    id: v.id, vehicle_number: v.vehicleNumber, brand: v.brand, model: v.model,
    year: v.year, owner_id: v.ownerId, daily_rent: v.dailyRent,
    extra_km_rate: v.extraKmRate ?? null, included_km_per_day: v.includedKmPerDay ?? null,
    status: v.status, insurance: v.insurance, revenue: v.revenue, rent_count: v.rentCount,
    image_url: v.imageUrl ?? null, color: v.color ?? null, seats: v.seats ?? null,
    fuel_type: v.fuelType ?? null, transmission: v.transmission ?? null,
    mileage: v.mileage ?? null, created_at: v.createdAt,
  }
}

function oFromDb(r: Record<string, unknown>): Owner {
  return {
    id: r.id as string, name: r.name as string, phone: r.phone as string,
    email: r.email as string, address: (r.address as string) ?? undefined,
    bankAccount: (r.bank_account as string) ?? undefined,
    commissionRate: r.commission_rate as number,
    totalEarnings: r.total_earnings as number, pendingPayout: r.pending_payout as number,
    createdAt: r.created_at as string,
  }
}

function oToDb(o: Owner) {
  return {
    id: o.id, name: o.name, phone: o.phone, email: o.email,
    address: o.address ?? null, bank_account: o.bankAccount ?? null,
    commission_rate: o.commissionRate, total_earnings: o.totalEarnings,
    pending_payout: o.pendingPayout, created_at: o.createdAt,
  }
}

function bFromDb(r: Record<string, unknown>): Booking {
  return {
    id: r.id as string, vehicleId: r.vehicle_id as string,
    customerId: r.customer_id as string, customerName: r.customer_name as string,
    customerPhone: r.customer_phone as string,
    customerEmail: (r.customer_email as string) ?? undefined,
    customerNIC: (r.customer_nic as string) ?? undefined,
    startDate: r.start_date as string, endDate: r.end_date as string,
    totalDays: r.total_days as number, totalAmount: r.total_amount as number,
    estimatedAmount: (r.estimated_amount as number) ?? undefined,
    paidAmount: r.paid_amount as number,
    status: r.status as Booking['status'],
    referral: (r.referral as string) ?? undefined,
    notes: (r.notes as string) ?? undefined, createdAt: r.created_at as string,
    pickupLocation: (r.pickup_location as string) ?? undefined,
    dropLocation: (r.drop_location as string) ?? undefined,
    driverId: (r.driver_id as string) ?? undefined,
    quotation: (r.quotation as Booking['quotation']) ?? undefined,
    depositAmount: (r.deposit_amount as number) ?? undefined,
    depositReturned: (r.deposit_returned as number) ?? undefined,
    depositDeduction: (r.deposit_deduction as number) ?? undefined,
    depositNotes: (r.deposit_notes as string) ?? undefined,
  }
}

function bToDb(b: Booking) {
  return {
    id: b.id, vehicle_id: b.vehicleId, customer_id: b.customerId,
    customer_name: b.customerName, customer_phone: b.customerPhone,
    customer_email: b.customerEmail ?? null, customer_nic: b.customerNIC ?? null,
    start_date: b.startDate, end_date: b.endDate, total_days: b.totalDays,
    total_amount: b.totalAmount, estimated_amount: b.estimatedAmount ?? null,
    paid_amount: b.paidAmount, status: b.status, referral: b.referral ?? null,
    notes: b.notes ?? null, created_at: b.createdAt,
    pickup_location: b.pickupLocation ?? null, drop_location: b.dropLocation ?? null,
    driver_id: b.driverId ?? null, quotation: b.quotation ?? null,
    deposit_amount: b.depositAmount ?? null,
    deposit_returned: b.depositReturned ?? null,
    deposit_deduction: b.depositDeduction ?? null,
    deposit_notes: b.depositNotes ?? null,
  }
}

function iFromDb(r: Record<string, unknown>): Inquiry {
  return {
    id: r.id as string, customerName: r.customer_name as string,
    customerPhone: r.customer_phone as string,
    requestedVehicle: r.requested_vehicle as string,
    preferredBrand: (r.preferred_brand as string) ?? undefined,
    startDate: r.start_date as string, endDate: r.end_date as string,
    referral: r.referral as string, status: r.status as Inquiry['status'],
    lostReason: (r.lost_reason as string) ?? undefined,
    notes: (r.notes as string) ?? undefined, createdAt: r.created_at as string,
  }
}

function iToDb(i: Inquiry) {
  return {
    id: i.id, customer_name: i.customerName, customer_phone: i.customerPhone,
    requested_vehicle: i.requestedVehicle, preferred_brand: i.preferredBrand ?? null,
    start_date: i.startDate, end_date: i.endDate, referral: i.referral,
    status: i.status, lost_reason: i.lostReason ?? null, notes: i.notes ?? null,
    created_at: i.createdAt,
  }
}

function cFromDb(r: Record<string, unknown>): Commission {
  return {
    id: r.id as string, bookingId: r.booking_id as string,
    vehicleId: r.vehicle_id as string, ownerId: r.owner_id as string,
    referral: r.referral as string, totalIncome: r.total_income as number,
    commissionRate: r.commission_rate as number,
    commissionAmount: r.commission_amount as number,
    ownerPayout: r.owner_payout as number,
    coordinatorFee: (r.coordinator_fee as number) ?? undefined,
    status: r.status as Commission['status'], createdAt: r.created_at as string,
  }
}

function cToDb(c: Commission) {
  return {
    id: c.id, booking_id: c.bookingId, vehicle_id: c.vehicleId, owner_id: c.ownerId,
    referral: c.referral, total_income: c.totalIncome, commission_rate: c.commissionRate,
    commission_amount: c.commissionAmount, owner_payout: c.ownerPayout,
    coordinator_fee: c.coordinatorFee ?? null, status: c.status, created_at: c.createdAt,
  }
}

function eFromDb(r: Record<string, unknown>): Expense {
  return {
    id: r.id as string, vehicleId: r.vehicle_id as string,
    category: r.category as Expense['category'], amount: r.amount as number,
    description: r.description as string, date: r.date as string,
    receipt: (r.receipt as string) ?? undefined, createdAt: r.created_at as string,
  }
}

function eToDb(e: Expense) {
  return {
    id: e.id, vehicle_id: e.vehicleId, category: e.category, amount: e.amount,
    description: e.description, date: e.date, receipt: e.receipt ?? null,
    created_at: e.createdAt,
  }
}

function dFromDb(r: Record<string, unknown>): Driver {
  return {
    id: r.id as string, name: r.name as string, phone: r.phone as string,
    licenseNumber: r.license_number as string, licenseExpiry: r.license_expiry as string,
    status: r.status as Driver['status'], dailyRate: r.daily_rate as number,
    totalEarnings: r.total_earnings as number,
    currentBookingId: (r.current_booking_id as string) ?? undefined,
    joinedAt: r.joined_at as string, address: (r.address as string) ?? undefined,
    nic: (r.nic as string) ?? undefined,
  }
}

function dToDb(d: Driver) {
  return {
    id: d.id, name: d.name, phone: d.phone, license_number: d.licenseNumber,
    license_expiry: d.licenseExpiry, status: d.status, daily_rate: d.dailyRate,
    total_earnings: d.totalEarnings, current_booking_id: d.currentBookingId ?? null,
    joined_at: d.joinedAt, address: d.address ?? null, nic: d.nic ?? null,
  }
}

function nFromDb(r: Record<string, unknown>): Notification {
  return {
    id: r.id as string, type: r.type as Notification['type'],
    title: r.title as string, message: r.message as string,
    relatedId: (r.related_id as string) ?? undefined,
    read: r.read as boolean, createdAt: r.created_at as string,
  }
}

function nToDb(n: Notification) {
  return {
    id: n.id, type: n.type, title: n.title, message: n.message,
    related_id: n.relatedId ?? null, read: n.read, created_at: n.createdAt,
  }
}

function hFromDb(r: Record<string, unknown>): VehicleHandover {
  return {
    id: r.id as string, bookingId: r.booking_id as string,
    vehicleId: r.vehicle_id as string, type: r.type as VehicleHandover['type'],
    location: r.location as string, dateTime: r.date_time as string,
    mileage: r.mileage as number, fuelLevel: r.fuel_level as string,
    notes: (r.notes as string) ?? undefined, extraKm: (r.extra_km as number) ?? undefined,
    extraKmCharge: (r.extra_km_charge as number) ?? undefined,
    finalAmount: (r.final_amount as number) ?? undefined, createdAt: r.created_at as string,
  }
}

function hToDb(h: VehicleHandover) {
  return {
    id: h.id, booking_id: h.bookingId, vehicle_id: h.vehicleId, type: h.type,
    location: h.location, date_time: h.dateTime, mileage: h.mileage,
    fuel_level: h.fuelLevel, notes: h.notes ?? null, extra_km: h.extraKm ?? null,
    extra_km_charge: h.extraKmCharge ?? null, final_amount: h.finalAmount ?? null,
    created_at: h.createdAt,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic fetch helper
// ─────────────────────────────────────────────────────────────────────────────

async function fetchTable<T>(
  table: string,
  mapper: (r: Record<string, unknown>) => T,
  ascending = true,
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('created_at', { ascending })
  if (error) throw error
  return (data ?? []).map(mapper)
}

// ─────────────────────────────────────────────────────────────────────────────
// DB API
// ─────────────────────────────────────────────────────────────────────────────

export async function dbFetchAll() {
  const [vehicles, owners, bookings, inquiries, commissions, expenses, drivers, notifications, handovers] =
    await Promise.all([
      fetchTable<Vehicle>('vehicles', vFromDb),
      fetchTable<Owner>('owners', oFromDb),
      fetchTable<Booking>('bookings', bFromDb),
      fetchTable<Inquiry>('inquiries', iFromDb),
      fetchTable<Commission>('commissions', cFromDb),
      fetchTable<Expense>('expenses', eFromDb),
      fetchTable<Driver>('drivers', dFromDb),
      fetchTable<Notification>('notifications', nFromDb, false),
      fetchTable<VehicleHandover>('handovers', hFromDb),
    ])
  return { vehicles, owners, bookings, inquiries, commissions, expenses, drivers, notifications, handovers }
}

export const db = {
  // ── Vehicles ──────────────────────────────────────────────────────────────
  insertVehicle: (v: Vehicle) => supabase.from('vehicles').insert(vToDb(v)),
  updateVehicle: (id: string, u: Partial<Vehicle>) => {
    const row: Record<string, unknown> = {}
    if (u.vehicleNumber !== undefined) row.vehicle_number = u.vehicleNumber
    if (u.brand !== undefined) row.brand = u.brand
    if (u.model !== undefined) row.model = u.model
    if (u.year !== undefined) row.year = u.year
    if (u.ownerId !== undefined) row.owner_id = u.ownerId
    if (u.dailyRent !== undefined) row.daily_rent = u.dailyRent
    if (u.extraKmRate !== undefined) row.extra_km_rate = u.extraKmRate
    if (u.includedKmPerDay !== undefined) row.included_km_per_day = u.includedKmPerDay
    if (u.status !== undefined) row.status = u.status
    if (u.insurance !== undefined) row.insurance = u.insurance
    if (u.revenue !== undefined) row.revenue = u.revenue
    if (u.rentCount !== undefined) row.rent_count = u.rentCount
    if (u.imageUrl !== undefined) row.image_url = u.imageUrl
    if (u.color !== undefined) row.color = u.color
    if (u.seats !== undefined) row.seats = u.seats
    if (u.fuelType !== undefined) row.fuel_type = u.fuelType
    if (u.transmission !== undefined) row.transmission = u.transmission
    if (u.mileage !== undefined) row.mileage = u.mileage
    return supabase.from('vehicles').update(row).eq('id', id)
  },
  deleteVehicle: (id: string) => supabase.from('vehicles').delete().eq('id', id),

  // ── Owners ────────────────────────────────────────────────────────────────
  insertOwner: (o: Owner) => supabase.from('owners').insert(oToDb(o)),
  updateOwner: (id: string, u: Partial<Owner>) => {
    const row: Record<string, unknown> = {}
    if (u.name !== undefined) row.name = u.name
    if (u.phone !== undefined) row.phone = u.phone
    if (u.email !== undefined) row.email = u.email
    if (u.address !== undefined) row.address = u.address
    if (u.bankAccount !== undefined) row.bank_account = u.bankAccount
    if (u.commissionRate !== undefined) row.commission_rate = u.commissionRate
    if (u.totalEarnings !== undefined) row.total_earnings = u.totalEarnings
    if (u.pendingPayout !== undefined) row.pending_payout = u.pendingPayout
    return supabase.from('owners').update(row).eq('id', id)
  },

  // ── Bookings ──────────────────────────────────────────────────────────────
  insertBooking: (b: Booking) => supabase.from('bookings').insert(bToDb(b)),
  updateBooking: (id: string, u: Partial<Booking>) => {
    const row: Record<string, unknown> = {}
    if (u.status !== undefined) row.status = u.status
    if (u.paidAmount !== undefined) row.paid_amount = u.paidAmount
    if (u.totalAmount !== undefined) row.total_amount = u.totalAmount
    if (u.estimatedAmount !== undefined) row.estimated_amount = u.estimatedAmount
    if (u.notes !== undefined) row.notes = u.notes
    if (u.driverId !== undefined) row.driver_id = u.driverId
    if (u.pickupLocation !== undefined) row.pickup_location = u.pickupLocation
    if (u.dropLocation !== undefined) row.drop_location = u.dropLocation
    if (u.quotation !== undefined) row.quotation = u.quotation
    if (u.depositAmount !== undefined) row.deposit_amount = u.depositAmount
    if (u.depositReturned !== undefined) row.deposit_returned = u.depositReturned
    if (u.depositDeduction !== undefined) row.deposit_deduction = u.depositDeduction
    if (u.depositNotes !== undefined) row.deposit_notes = u.depositNotes
    return supabase.from('bookings').update(row).eq('id', id)
  },

  // ── Inquiries ─────────────────────────────────────────────────────────────
  insertInquiry: (i: Inquiry) => supabase.from('inquiries').insert(iToDb(i)),
  updateInquiry: (id: string, u: Partial<Inquiry>) => {
    const row: Record<string, unknown> = {}
    if (u.status !== undefined) row.status = u.status
    if (u.notes !== undefined) row.notes = u.notes
    if (u.lostReason !== undefined) row.lost_reason = u.lostReason
    if (u.customerName !== undefined) row.customer_name = u.customerName
    if (u.customerPhone !== undefined) row.customer_phone = u.customerPhone
    if (u.requestedVehicle !== undefined) row.requested_vehicle = u.requestedVehicle
    if (u.startDate !== undefined) row.start_date = u.startDate
    if (u.endDate !== undefined) row.end_date = u.endDate
    return supabase.from('inquiries').update(row).eq('id', id)
  },

  // ── Commissions ───────────────────────────────────────────────────────────
  insertCommission: (c: Commission) => supabase.from('commissions').insert(cToDb(c)),
  updateCommission: (id: string, u: Partial<Commission>) => {
    const row: Record<string, unknown> = {}
    if (u.status !== undefined) row.status = u.status
    if (u.coordinatorFee !== undefined) row.coordinator_fee = u.coordinatorFee
    return supabase.from('commissions').update(row).eq('id', id)
  },

  // ── Expenses ──────────────────────────────────────────────────────────────
  insertExpense: (e: Expense) => supabase.from('expenses').insert(eToDb(e)),
  deleteExpense: (id: string) => supabase.from('expenses').delete().eq('id', id),

  // ── Drivers ───────────────────────────────────────────────────────────────
  insertDriver: (d: Driver) => supabase.from('drivers').insert(dToDb(d)),
  updateDriver: (id: string, u: Partial<Driver>) => {
    const row: Record<string, unknown> = {}
    if (u.name !== undefined) row.name = u.name
    if (u.phone !== undefined) row.phone = u.phone
    if (u.status !== undefined) row.status = u.status
    if (u.licenseNumber !== undefined) row.license_number = u.licenseNumber
    if (u.licenseExpiry !== undefined) row.license_expiry = u.licenseExpiry
    if (u.dailyRate !== undefined) row.daily_rate = u.dailyRate
    if (u.totalEarnings !== undefined) row.total_earnings = u.totalEarnings
    if (u.currentBookingId !== undefined) row.current_booking_id = u.currentBookingId ?? null
    if (u.address !== undefined) row.address = u.address
    return supabase.from('drivers').update(row).eq('id', id)
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  insertNotification: (n: Notification) => supabase.from('notifications').insert(nToDb(n)),
  updateNotification: (id: string, u: Partial<Notification>) => {
    const row: Record<string, unknown> = {}
    if (u.read !== undefined) row.read = u.read
    return supabase.from('notifications').update(row).eq('id', id)
  },

  // ── Handovers ─────────────────────────────────────────────────────────────
  insertHandover: (h: VehicleHandover) => supabase.from('handovers').insert(hToDb(h)),
}
