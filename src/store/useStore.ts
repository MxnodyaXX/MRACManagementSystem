import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, Vehicle, Owner, Booking, Inquiry, Expense, Driver, Notification, Commission, VehicleHandover, Customer } from '../types';
import { sampleData } from '../data/sampleData';
import { supabaseEnabled } from '../lib/supabase';
import { db, dbFetchAll } from '../lib/db';
import { resolveReferralFee } from '../lib/referral';
import cab1234Img from '../data/CAB-1234.png';

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
// Supabase returns PromiseLike (not full Promise), so wrap in Promise.resolve for .catch support
const sync = (fn: () => PromiseLike<unknown>) => {
  if (supabaseEnabled) Promise.resolve(fn()).catch(console.error);
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...sampleData,
      handovers: [],
      customers: [],
      loaded: false,

      // ── Supabase bootstrap ────────────────────────────────────────────────
      loadAll: async () => {
        if (!supabaseEnabled) { set({ loaded: true }); return; }
        try {
          const data = await dbFetchAll();
          set({ ...data, loaded: true });
        } catch (err) {
          console.error('Supabase load failed — using local data:', err);
          set({ loaded: true });
        }
      },

      // ── Vehicles ──────────────────────────────────────────────────────────
      addVehicle: (v) => {
        const newV: Vehicle = { ...v, id: uid(), createdAt: now(), revenue: 0, rentCount: 0 };
        set((s) => ({ vehicles: [...s.vehicles, newV] }));
        sync(() => db.insertVehicle(newV));
      },

      updateVehicle: (id, updates) => {
        set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v)) }));
        sync(() => db.updateVehicle(id, updates));
      },

      deleteVehicle: (id) => {
        set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) }));
        sync(() => db.deleteVehicle(id));
      },

      // ── Owners ────────────────────────────────────────────────────────────
      addOwner: (o) => {
        const newO: Owner = { ...o, id: uid(), createdAt: now(), totalEarnings: 0, pendingPayout: 0 };
        set((s) => ({ owners: [...s.owners, newO] }));
        sync(() => db.insertOwner(newO));
      },

      updateOwner: (id, updates) => {
        set((s) => ({ owners: s.owners.map((o) => (o.id === id ? { ...o, ...updates } : o)) }));
        sync(() => db.updateOwner(id, updates));
      },

      // ── Bookings ──────────────────────────────────────────────────────────
      addBooking: (b) => {
        const id = uid();
        const vehicle = get().vehicles.find((v) => v.id === b.vehicleId);

        // The referrer's fee is the only deduction — the owner keeps the rest of the total.
        const referralFee = resolveReferralFee(b.referralFeeType, b.referralFeeValue, b.totalAmount);
        const ownerPayout = Math.max(0, b.totalAmount - referralFee);

        const commission: Commission = {
          id: uid(),
          bookingId: id,
          vehicleId: b.vehicleId,
          ownerId: vehicle?.ownerId ?? '',
          referral: b.referral ?? 'Direct',
          totalIncome: b.totalAmount,
          commissionRate: 0,
          commissionAmount: 0,
          ownerPayout,
          coordinatorFee: referralFee,
          status: 'Pending',
          createdAt: now(),
        };

        const newBooking: Booking = { ...b, id, referralFee, createdAt: now() };
        const vehicleUpdates = {
          status: 'Reserved' as const,
          revenue: (vehicle?.revenue ?? 0) + b.totalAmount,
          rentCount: (vehicle?.rentCount ?? 0) + 1,
        };

        set((s) => ({
          bookings: [...s.bookings, newBooking],
          commissions: [...s.commissions, commission],
          vehicles: s.vehicles.map((v) =>
            v.id === b.vehicleId ? { ...v, ...vehicleUpdates } : v
          ),
        }));

        if (supabaseEnabled) {
          Promise.resolve(db.insertBooking(newBooking))
            .then(() => db.insertCommission(commission))
            .then(() => db.updateVehicle(b.vehicleId, vehicleUpdates))
            .catch(console.error);
        }

        get().addNotification({
          type: 'BookingReminder',
          title: 'New Booking Created',
          message: `Booking for ${b.customerName} confirmed (${b.startDate} – ${b.endDate})`,
          relatedId: id,
        });

        return id;
      },

      updateBooking: (id, updates) => {
        set((s) => ({ bookings: s.bookings.map((b) => (b.id === id ? { ...b, ...updates } : b)) }));
        sync(() => db.updateBooking(id, updates));
      },

      startBooking: (id) => {
        const booking = get().bookings.find((b) => b.id === id);
        if (!booking) return;
        set((s) => ({
          bookings: s.bookings.map((b) => b.id === id ? { ...b, status: 'Ongoing' as const } : b),
          vehicles: s.vehicles.map((v) => v.id === booking.vehicleId ? { ...v, status: 'Ongoing' as const } : v),
        }));
        if (supabaseEnabled) {
          Promise.resolve(db.updateBooking(id, { status: 'Ongoing' })).catch(console.error);
          Promise.resolve(db.updateVehicle(booking.vehicleId, { status: 'Ongoing' })).catch(console.error);
        }
      },

      completeBooking: (id) => {
        const booking = get().bookings.find((b) => b.id === id);
        if (!booking) return;
        set((s) => ({
          bookings: s.bookings.map((b) => b.id === id ? { ...b, status: 'Completed' as const } : b),
          vehicles: s.vehicles.map((v) => v.id === booking.vehicleId ? { ...v, status: 'Available' as const } : v),
        }));
        if (supabaseEnabled) {
          Promise.resolve(db.updateBooking(id, { status: 'Completed' })).catch(console.error);
          Promise.resolve(db.updateVehicle(booking.vehicleId, { status: 'Available' })).catch(console.error);
        }
      },

      cancelBooking: (id) => {
        const booking = get().bookings.find((b) => b.id === id);
        set((s) => {
          const vehicles = booking
            ? s.vehicles.map((v) => (v.id === booking.vehicleId ? { ...v, status: 'Available' as const } : v))
            : s.vehicles;
          return {
            bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: 'Cancelled' as const } : b)),
            vehicles,
          };
        });
        if (supabaseEnabled && booking) {
          Promise.resolve(db.updateBooking(id, { status: 'Cancelled' })).catch(console.error);
          Promise.resolve(db.updateVehicle(booking.vehicleId, { status: 'Available' })).catch(console.error);
        }
      },

      // ── Inquiries ─────────────────────────────────────────────────────────
      addInquiry: (i) => {
        const newI: Inquiry = { ...i, id: uid(), createdAt: now() };
        set((s) => ({ inquiries: [...s.inquiries, newI] }));
        sync(() => db.insertInquiry(newI));
      },

      updateInquiry: (id, updates) => {
        set((s) => ({ inquiries: s.inquiries.map((i) => (i.id === id ? { ...i, ...updates } : i)) }));
        sync(() => db.updateInquiry(id, updates));
      },

      // ── Expenses ──────────────────────────────────────────────────────────
      addExpense: (e) => {
        const newE: Expense = { ...e, id: uid(), createdAt: now() };
        set((s) => ({ expenses: [...s.expenses, newE] }));
        sync(() => db.insertExpense(newE));
      },

      deleteExpense: (id) => {
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
        sync(() => db.deleteExpense(id));
      },

      // ── Drivers ───────────────────────────────────────────────────────────
      addDriver: (d) => {
        const newD: Driver = { ...d, id: uid(), joinedAt: now(), totalEarnings: 0 };
        set((s) => ({ drivers: [...s.drivers, newD] }));
        sync(() => db.insertDriver(newD));
      },

      updateDriver: (id, updates) => {
        set((s) => ({ drivers: s.drivers.map((d) => (d.id === id ? { ...d, ...updates } : d)) }));
        sync(() => db.updateDriver(id, updates));
      },

      // ── Handovers ─────────────────────────────────────────────
      addHandover: (h) =>
        set((s) => ({
          handovers: [...s.handovers, { ...h, id: uid(), createdAt: now() }],
        })),

      // ── Notifications ─────────────────────────────────────────────────────
      addNotification: (n) => {
        const newN: Notification = { ...n, id: uid(), createdAt: now(), read: false };
        set((s) => ({ notifications: [newN, ...s.notifications] }));
        sync(() => db.insertNotification(newN));
      },

      markNotificationRead: (id) => {
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
        sync(() => db.updateNotification(id, { read: true }));
      },

      markAllRead: () => {
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
        if (supabaseEnabled) {
          get().notifications.forEach((n) => {
            if (!n.read) Promise.resolve(db.updateNotification(n.id, { read: true })).catch(console.error);
          });
        }
      },

      updateCommission: (id, updates) => {
        set((s) => ({
          commissions: s.commissions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
        sync(() => db.updateCommission(id, updates));
      },

      // ── Customers ─────────────────────────────────────────────────────────
      addCustomer: (c) => {
        const newC = { ...c, id: uid(), createdAt: now() };
        set((s) => ({ customers: [...s.customers, newC] }));
      },

      updateCustomer: (id, updates) => {
        set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...updates } : c)) }));
      },

      deleteCustomer: (id) => {
        set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
      },

      // ── Helpers ───────────────────────────────────────────────────────────
      isVehicleAvailable: (vehicleId, startDate, endDate, excludeBookingId) => {
        const { bookings } = get();
        const start = new Date(startDate).getTime();
        const end   = new Date(endDate).getTime();
        return !bookings.some((b) => {
          if (b.vehicleId !== vehicleId) return false;
          if (b.status === 'Cancelled') return false;
          if (excludeBookingId && b.id === excludeBookingId) return false;
          const bStart = new Date(b.startDate).getTime();
          const bEnd   = new Date(b.endDate).getTime();
          return start <= bEnd && end >= bStart;
        });
      },
    }),
    {
      name: 'emrac-store-v5',
      version: 1,
      // One-time patch: attach the CAB-1234 photo to already-saved data (no wipe).
      migrate: (persisted, _version) => {
        const s = persisted as Partial<AppState> | undefined;
        if (s?.vehicles) {
          s.vehicles = s.vehicles.map((v) =>
            v.vehicleNumber === 'CAB-1234' && !v.imageUrl ? { ...v, imageUrl: cab1234Img } : v
          );
        }
        return s as AppState;
      },
    }
  )
);
