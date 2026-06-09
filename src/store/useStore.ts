import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, Vehicle, Owner, Booking, Inquiry, Expense, Driver, Notification, Commission, VehicleHandover, Customer } from '../types';
import { sampleData } from '../data/sampleData';

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...sampleData,

      // ── Vehicles ──────────────────────────────────────────────
      addVehicle: (v) =>
        set((s) => ({
          vehicles: [
            ...s.vehicles,
            { ...v, id: uid(), createdAt: now(), revenue: 0, rentCount: 0 } as Vehicle,
          ],
        })),

      updateVehicle: (id, updates) =>
        set((s) => ({
          vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        })),

      deleteVehicle: (id) =>
        set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) })),

      // ── Owners ────────────────────────────────────────────────
      addOwner: (o) =>
        set((s) => ({
          owners: [
            ...s.owners,
            { ...o, id: uid(), createdAt: now(), totalEarnings: 0, pendingPayout: 0 },
          ],
        })),

      updateOwner: (id, updates) =>
        set((s) => ({
          owners: s.owners.map((o) => (o.id === id ? { ...o, ...updates } : o)),
        })),

      // ── Bookings ──────────────────────────────────────────────
      addBooking: (b) => {
        const id = uid();
        const vehicle = get().vehicles.find((v) => v.id === b.vehicleId);
        const owner   = get().owners.find((o) => o.id === vehicle?.ownerId);

        const commission: Commission = {
          id: uid(),
          bookingId: id,
          vehicleId: b.vehicleId,
          ownerId: vehicle?.ownerId ?? '',
          referral: b.referral ?? 'Direct',
          totalIncome: b.totalAmount,
          commissionRate: owner?.commissionRate ?? 15,
          commissionAmount: b.totalAmount * ((owner?.commissionRate ?? 15) / 100),
          ownerPayout: b.totalAmount * (1 - (owner?.commissionRate ?? 15) / 100),
          status: 'Pending',
          createdAt: now(),
        };

        set((s) => {
          const vehicles = s.vehicles.map((v) =>
            v.id === b.vehicleId
              ? { ...v, status: 'Reserved' as const, revenue: v.revenue + b.totalAmount, rentCount: (v.rentCount ?? 0) + 1 }
              : v
          );
          return {
            bookings:    [...s.bookings, { ...b, id, createdAt: now() }],
            commissions: [...s.commissions, commission],
            vehicles,
          };
        });

        get().addNotification({
          type: 'BookingReminder',
          title: 'New Booking Created',
          message: `Booking for ${b.customerName} confirmed (${b.startDate} – ${b.endDate})`,
          relatedId: id,
        });

        return id;
      },

      updateBooking: (id, updates) =>
        set((s) => ({
          bookings: s.bookings.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),

      cancelBooking: (id) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === id);
          const vehicles = booking
            ? s.vehicles.map((v) =>
                v.id === booking.vehicleId ? { ...v, status: 'Available' as const } : v
              )
            : s.vehicles;
          return {
            bookings: s.bookings.map((b) =>
              b.id === id ? { ...b, status: 'Cancelled' as const } : b
            ),
            vehicles,
          };
        }),

      // ── Inquiries ─────────────────────────────────────────────
      addInquiry: (i) =>
        set((s) => ({
          inquiries: [...s.inquiries, { ...i, id: uid(), createdAt: now() }],
        })),

      updateInquiry: (id, updates) =>
        set((s) => ({
          inquiries: s.inquiries.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),

      // ── Expenses ──────────────────────────────────────────────
      addExpense: (e) =>
        set((s) => ({
          expenses: [...s.expenses, { ...e, id: uid(), createdAt: now() }],
        })),

      deleteExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      // ── Drivers ───────────────────────────────────────────────
      addDriver: (d) =>
        set((s) => ({
          drivers: [...s.drivers, { ...d, id: uid(), joinedAt: now(), totalEarnings: 0 }],
        })),

      updateDriver: (id, updates) =>
        set((s) => ({
          drivers: s.drivers.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),

      // ── Customers ─────────────────────────────────────────────
      addCustomer: (c) =>
        set((s) => ({
          customers: [...s.customers, { ...c, id: uid(), createdAt: now() } as Customer],
        })),

      updateCustomer: (id, updates) =>
        set((s) => ({
          customers: s.customers.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteCustomer: (id) =>
        set((s) => ({ customers: s.customers.filter((c) => c.id !== id) })),

      // ── Handovers ─────────────────────────────────────────────
      addHandover: (h) =>
        set((s) => ({
          handovers: [...s.handovers, { ...h, id: uid(), createdAt: now() }],
        })),

      // ── Notifications ─────────────────────────────────────────
      addNotification: (n) =>
        set((s) => ({
          notifications: [
            { ...n, id: uid(), createdAt: now(), read: false },
            ...s.notifications,
          ],
        })),

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      updateCommission: (id, updates) =>
        set((s) => ({
          commissions: s.commissions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      // ── Helpers ───────────────────────────────────────────────
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
    { name: 'emrac-store-v4' }
  )
);
