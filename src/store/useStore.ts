import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, Vehicle, Owner, Booking, Inquiry, Expense, Driver, Notification, Commission, VehicleHandover, Customer } from '../types';
import { sampleData } from '../data/sampleData';
import { supabaseEnabled } from '../lib/supabase';
import { db, dbFetchAll } from '../lib/db';
import { resolveReferralFee } from '../lib/referral';
import { sendSms, smsTemplates, ADMIN_PHONE } from '../lib/sms';
import { toast } from './useToast';
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
      // When Supabase is connected the database is the single source of truth —
      // start empty and hydrate from it. Sample/dummy data is only used in the
      // offline/demo mode (no Supabase env configured).
      ...(supabaseEnabled
        ? { vehicles: [], owners: [], bookings: [], inquiries: [], commissions: [], expenses: [], drivers: [], notifications: [] }
        : sampleData),
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
          console.error('Supabase load failed:', err);
          toast.error('Could not load data', 'Failed to reach the database — check your connection.');
          set({ loaded: true });
        }
      },

      // ── Vehicles ──────────────────────────────────────────────────────────
      addVehicle: (v) => {
        const newV: Vehicle = { ...v, id: uid(), createdAt: now(), revenue: 0, rentCount: 0 };
        set((s) => ({ vehicles: [...s.vehicles, newV] }));
        sync(() => db.insertVehicle(newV));
        toast.success('Vehicle added', `${newV.brand} ${newV.model} (${newV.vehicleNumber}) is now in the fleet.`);
      },

      updateVehicle: (id, updates) => {
        set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v)) }));
        sync(() => db.updateVehicle(id, updates));
        toast.success('Vehicle updated', 'Changes have been saved.');
      },

      deleteVehicle: (id) => {
        set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) }));
        sync(() => db.deleteVehicle(id));
        toast.warning('Vehicle removed', 'The vehicle has been deleted from the fleet.');
      },

      // ── Owners ────────────────────────────────────────────────────────────
      addOwner: (o) => {
        const newO: Owner = { ...o, id: uid(), createdAt: now(), totalEarnings: 0, pendingPayout: 0 };
        set((s) => ({ owners: [...s.owners, newO] }));
        sync(() => db.insertOwner(newO));
        toast.success('Owner added', `${newO.name} has been registered.`);
      },

      updateOwner: (id, updates) => {
        set((s) => ({ owners: s.owners.map((o) => (o.id === id ? { ...o, ...updates } : o)) }));
        sync(() => db.updateOwner(id, updates));
        toast.success('Owner updated', 'Changes have been saved.');
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

        // ── SMS fan-out (all no-op if SMS not configured / recipient opted out) ──
        const vehicleLabel = vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.vehicleNumber})` : 'your vehicle';
        const customerOptIn = get().customers.find((c) => c.phone === b.customerPhone)?.smsOptIn;

        // 1. Confirmation to the customer
        sendSms(b.customerPhone, smsTemplates.bookingConfirmation(b.customerName, vehicleLabel, b.startDate, b.endDate, b.totalAmount),
          { category: 'bookingConfirmation', role: 'customer', relatedId: id, optIn: customerOptIn, transactional: true });

        // 2. The vehicle owner — their car was booked (income incoming)
        const vehicleOwner = get().owners.find((o) => o.id === vehicle?.ownerId);
        if (vehicleOwner?.phone) {
          sendSms(vehicleOwner.phone, smsTemplates.ownerVehicleBooked(vehicleOwner.name, vehicleLabel, b.startDate, b.endDate, b.totalAmount),
            { category: 'ownerVehicleBooked', role: 'owner', relatedId: id, optIn: vehicleOwner.smsOptIn, transactional: true });
        }

        // 3. The referrer — they earned a fee (only if a registered owner, so we have a phone)
        if (referralFee > 0 && b.referral && b.referral !== 'Direct') {
          const referrer = get().owners.find((o) => o.name.trim().toLowerCase() === b.referral!.trim().toLowerCase());
          if (referrer?.phone) {
            sendSms(referrer.phone, smsTemplates.referralConverted(referrer.name, referralFee),
              { category: 'referralConverted', role: 'referrer', relatedId: id, optIn: referrer.smsOptIn, transactional: true });
          }
        }

        // 4. Admin — new booking alert
        if (ADMIN_PHONE) {
          sendSms(ADMIN_PHONE, smsTemplates.adminNewBooking(b.customerName, vehicleLabel, b.startDate, b.endDate, b.totalAmount),
            { category: 'adminNewBooking', role: 'admin', relatedId: id, transactional: true });
        }

        toast.success('Booking created', `Booking for ${b.customerName} confirmed (${b.startDate} → ${b.endDate}).`);

        return id;
      },

      updateBooking: (id, updates) => {
        const prev = get().bookings.find((b) => b.id === id);
        set((s) => ({ bookings: s.bookings.map((b) => (b.id === id ? { ...b, ...updates } : b)) }));
        sync(() => db.updateBooking(id, updates));
        toast.success('Booking updated', 'Changes have been saved.');

        // Payment-received receipt to the customer when the paid amount increases.
        if (prev && updates.paidAmount !== undefined && updates.paidAmount > prev.paidAmount) {
          const paidNow = updates.paidAmount - prev.paidAmount;
          const balance = Math.max(0, prev.totalAmount - updates.paidAmount);
          const optIn = get().customers.find((c) => c.phone === prev.customerPhone)?.smsOptIn;
          sendSms(prev.customerPhone, smsTemplates.paymentReceived(prev.customerName, paidNow, balance),
            { category: 'paymentReceived', role: 'customer', relatedId: id, optIn, transactional: true });
        }
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
        toast.success('Rental started', `${booking.customerName}'s vehicle is now on rent.`);
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
        toast.success('Rental completed', `${booking.customerName}'s booking is closed and the vehicle is available.`);
      },

      markReferralPaid: (bookingId, paid) => {
        const updates: Partial<Booking> = { referralPaid: paid, referralPaidAt: paid ? now() : undefined };
        set((s) => ({ bookings: s.bookings.map((b) => (b.id === bookingId ? { ...b, ...updates } : b)) }));
        sync(() => db.updateBooking(bookingId, updates));

        if (!paid) return;

        // Tell the referrer their fee has been received (only if a registered owner).
        const settledBk = get().bookings.find((b) => b.id === bookingId);
        if (settledBk?.referral && settledBk.referral !== 'Direct') {
          const referrer = get().owners.find((o) => o.name.trim().toLowerCase() === settledBk.referral!.trim().toLowerCase());
          if (referrer?.phone) {
            sendSms(referrer.phone, smsTemplates.referralReceived(referrer.name, settledBk.referralFee ?? 0),
              { category: 'referralReceived', role: 'referrer', relatedId: bookingId, optIn: referrer.smsOptIn, transactional: true });
          }
        }
        // Once the paying owner has no referral fees left outstanding, resolve their
        // "referral payout due" alert so the settlement reflects on the owner's side.
        const st = get();
        const booking = st.bookings.find((b) => b.id === bookingId);
        const ownerId = st.vehicles.find((v) => v.id === booking?.vehicleId)?.ownerId;
        if (!ownerId) return;
        const ownerVehicleIds = new Set(st.vehicles.filter((v) => v.ownerId === ownerId).map((v) => v.id));
        const stillOwes = st.bookings.some((b) =>
          ownerVehicleIds.has(b.vehicleId) &&
          (b.referralFee ?? 0) > 0 && b.referral && b.referral !== 'Direct' &&
          (b.status === 'Ongoing' || b.status === 'Completed') && !b.referralPaid,
        );
        if (stillOwes) return;
        const toResolve = st.notifications.filter((n) => n.type === 'ReferralPayout' && n.ownerId === ownerId && !n.read);
        if (toResolve.length === 0) return;
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.type === 'ReferralPayout' && n.ownerId === ownerId && !n.read ? { ...n, read: true } : n,
          ),
        }));
        toResolve.forEach((n) => sync(() => db.updateNotification(n.id, { read: true })));
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
        toast.warning('Booking cancelled', booking ? `${booking.customerName}'s booking was cancelled.` : 'The booking was cancelled.');
      },

      // ── Inquiries ─────────────────────────────────────────────────────────
      addInquiry: (i) => {
        const newI: Inquiry = { ...i, id: uid(), createdAt: now() };
        set((s) => ({ inquiries: [...s.inquiries, newI] }));
        sync(() => db.insertInquiry(newI));
        toast.success('Inquiry added', `Lead from ${newI.customerName} captured.`);
        if (ADMIN_PHONE) {
          sendSms(ADMIN_PHONE, smsTemplates.adminNewInquiry(newI.customerName, newI.customerPhone, newI.requestedVehicle),
            { category: 'adminNewInquiry', role: 'admin', relatedId: newI.id, transactional: true });
        }
      },

      updateInquiry: (id, updates) => {
        set((s) => ({ inquiries: s.inquiries.map((i) => (i.id === id ? { ...i, ...updates } : i)) }));
        sync(() => db.updateInquiry(id, updates));
        toast.success('Inquiry updated', 'Changes have been saved.');
      },

      // ── Expenses ──────────────────────────────────────────────────────────
      addExpense: (e) => {
        const newE: Expense = { ...e, id: uid(), createdAt: now() };
        set((s) => ({ expenses: [...s.expenses, newE] }));
        sync(() => db.insertExpense(newE));
        toast.success('Expense added', `${newE.category} · Rs ${newE.amount.toLocaleString()} recorded.`);
        // Notify the vehicle's owner that an expense was logged against their vehicle.
        const exV = get().vehicles.find((x) => x.id === newE.vehicleId);
        const exOwner = get().owners.find((o) => o.id === exV?.ownerId);
        if (exOwner?.phone) {
          const label = exV ? `${exV.brand} ${exV.model} (${exV.vehicleNumber})` : 'your vehicle';
          sendSms(exOwner.phone, smsTemplates.ownerExpenseLogged(exOwner.name, label, newE.category, newE.amount),
            { category: 'ownerExpenseLogged', role: 'owner', relatedId: newE.id, optIn: exOwner.smsOptIn, transactional: true });
        }
      },

      deleteExpense: (id) => {
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
        sync(() => db.deleteExpense(id));
        toast.warning('Expense removed', 'The expense has been deleted.');
      },

      // ── Drivers ───────────────────────────────────────────────────────────
      addDriver: (d) => {
        const newD: Driver = { ...d, id: uid(), joinedAt: now(), totalEarnings: 0 };
        set((s) => ({ drivers: [...s.drivers, newD] }));
        sync(() => db.insertDriver(newD));
        toast.success('Driver added', `${newD.name} has been registered.`);
      },

      updateDriver: (id, updates) => {
        set((s) => ({ drivers: s.drivers.map((d) => (d.id === id ? { ...d, ...updates } : d)) }));
        sync(() => db.updateDriver(id, updates));
        toast.success('Driver updated', 'Changes have been saved.');
      },

      // ── Handovers ─────────────────────────────────────────────
      addHandover: (h) => {
        set((s) => ({
          handovers: [...s.handovers, { ...h, id: uid(), createdAt: now() }],
        }));
        toast.success('Handover recorded', `Vehicle ${h.type} logged successfully.`);
      },

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
        sync(() => db.insertCustomer(newC));
        toast.success('Customer added', `${newC.name} has been saved.`);
      },

      updateCustomer: (id, updates) => {
        set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...updates } : c)) }));
        sync(() => db.updateCustomer(id, updates));
        toast.success('Customer updated', 'Changes have been saved.');
      },

      deleteCustomer: (id) => {
        set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
        sync(() => db.deleteCustomer(id));
        toast.warning('Customer removed', 'The customer has been deleted.');
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
      name: 'emrac-store-v7',
      version: 1,
    }
  )
);
