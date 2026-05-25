import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { Calendar, dateFnsLocalizer, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  Plus, CalendarDays, List, AlertTriangle, CheckCircle,
  XCircle, MapPin, RotateCcw, Calculator,
} from 'lucide-react';
import { Booking } from '../types';
import { differenceInDays, parseISO } from 'date-fns';

/* ── Calendar setup ─────────────────────────────────────────── */
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { 'en-US': enUS } });

type BookingStatus = 'Confirmed' | 'Ongoing' | 'Completed' | 'Cancelled';
const STATUS_TABS: (BookingStatus | 'All')[] = ['All', 'Confirmed', 'Ongoing', 'Completed', 'Cancelled'];

const STATUS_COLORS: Record<string, string> = {
  Confirmed: '#4B7BE5',
  Ongoing:   '#10B981',
  Completed: '#6B7280',
  Cancelled: '#EF4444',
};

const LOST_REASONS = [
  'No vehicle available',
  'Dates not available',
  'Budget mismatch',
  'Customer cancelled',
  'Found elsewhere',
  'Other',
];

const emptyForm = () => ({
  vehicleId: '',
  customerId: 'c_' + Math.random().toString(36).slice(2, 6),
  customerName: '',
  customerPhone: '',
  customerNIC: '',
  startDate: '',
  endDate: '',
  totalDays: 0,
  totalAmount: 0,
  estimatedAmount: 0,
  paidAmount: 0,
  status: 'Confirmed' as BookingStatus,
  referral: 'Direct',
  notes: '',
  pickupLocation: '',
  dropLocation: '',
  driverId: '',
  quotation: {
    startLocation: '',
    endLocation: '',
    stops: [] as string[],
    isRoundTrip: true,
    totalKm: 0,
  },
});

export default function Bookings() {
  const { vehicles, bookings, drivers, owners, addBooking, updateBooking, cancelBooking, isVehicleAvailable } = useStore();
  const { currentUser, isAdmin, can } = useAuthStore();
  const location = useLocation();

  const [tab,          setTab]          = useState<BookingStatus | 'All'>('All');
  const [viewMode,     setViewMode]     = useState<'cards' | 'calendar'>('cards');
  const [modal,        setModal]        = useState<'add' | 'view' | null>(null);
  const [selected,     setSelected]     = useState<Booking | null>(null);
  const [form,         setForm]         = useState(emptyForm());
  const [availability, setAvailability] = useState<boolean | null>(null);
  const [error,        setError]        = useState('');

  // Auto-open booking form when navigated from an inquiry conversion
  useEffect(() => {
    const inq = (location.state as { fromInquiry?: { customerName: string; customerPhone: string; startDate: string; endDate: string; notes: string } } | null)?.fromInquiry;
    if (!inq) return;
    const f = emptyForm();
    f.customerName  = inq.customerName  ?? '';
    f.customerPhone = inq.customerPhone ?? '';
    f.startDate     = inq.startDate     ?? '';
    f.endDate       = inq.endDate       ?? '';
    f.notes         = inq.notes         ?? '';
    setForm(f);
    setModal('add');
    setAvailability(null);
    setError('');
    // Clear navigation state so refreshing doesn't re-open the modal
    window.history.replaceState({}, '');
  }, [location.state]);

  // Owner sees only their vehicle bookings
  const myVehicleIds = currentUser?.role === 'owner'
    ? vehicles.filter((v) => v.ownerId === currentUser.ownerId).map((v) => v.id)
    : null;

  const visibleBookings = myVehicleIds
    ? bookings.filter((b) => myVehicleIds.includes(b.vehicleId))
    : bookings;

  const filtered = tab === 'All' ? visibleBookings : visibleBookings.filter((b) => b.status === tab);
  const sorted   = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Vehicles available to book — owner sees only their own
  const bookableVehicles = myVehicleIds
    ? vehicles.filter((v) => myVehicleIds.includes(v.id))
    : vehicles;

  const set = (field: string, value: unknown) => {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      if (field === 'startDate' || field === 'endDate' || field === 'vehicleId') {
        const s   = field === 'startDate' ? value as string : updated.startDate;
        const e   = field === 'endDate'   ? value as string : updated.endDate;
        const vid = field === 'vehicleId' ? value as string : updated.vehicleId;
        if (s && e && s <= e) {
          const days    = differenceInDays(parseISO(e as string), parseISO(s as string)) + 1;
          const vehicle = vehicles.find((v) => v.id === vid);
          const amount  = days * (vehicle?.dailyRent ?? 0);
          updated.totalDays   = days;
          updated.totalAmount = amount;
          recalcEstimate(updated);
        }
        if (s && e && vid) setAvailability(isVehicleAvailable(vid, s as string, e as string));
      }
      return updated;
    });
  };

  const setQ = (field: string, value: unknown) =>
    setForm((f) => {
      const q = { ...f.quotation, [field]: value };
      const updated = { ...f, quotation: q };
      recalcEstimate(updated);
      return updated;
    });

  const recalcEstimate = (f: ReturnType<typeof emptyForm>) => {
    const vehicle = vehicles.find((v) => v.id === f.vehicleId);
    if (!vehicle || !f.totalDays || !f.quotation.totalKm) return;
    const includedKm = (vehicle.includedKmPerDay ?? 100) * f.totalDays;
    const extraKm    = Math.max(0, f.quotation.totalKm - includedKm);
    const extraCost  = extraKm * (vehicle.extraKmRate ?? 50);
    f.estimatedAmount = f.totalAmount + extraCost;
  };

  const openAdd = (startDate = '') => {
    const f = emptyForm();
    if (startDate) { f.startDate = startDate; f.endDate = startDate; }
    setForm(f);
    setModal('add');
    setAvailability(null);
    setError('');
  };

  const handleCreate = () => {
    setError('');
    if (!form.vehicleId || !form.customerName || !form.startDate || !form.endDate) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!isVehicleAvailable(form.vehicleId, form.startDate, form.endDate)) {
      setError('Vehicle is not available for selected dates.');
      return;
    }
    addBooking(form);
    setModal(null);
    setForm(emptyForm());
    setAvailability(null);
  };

  // Calendar events
  const calEvents = visibleBookings
    .filter((b) => b.status !== 'Cancelled')
    .map((b) => ({
      id:    b.id,
      title: `${vehicles.find((v) => v.id === b.vehicleId)?.brand ?? ''} — ${b.customerName}`,
      start: new Date(b.startDate),
      end:   new Date(b.endDate),
      resource: b,
    }));

  const eventStyleGetter = (ev: typeof calEvents[0]) => ({
    style: {
      backgroundColor: STATUS_COLORS[(ev.resource as Booking).status] ?? '#4B7BE5',
      borderRadius: 6,
      border: 'none',
      fontSize: 11,
      padding: '2px 6px',
    },
  });

  const onSelectSlot = useCallback((slot: SlotInfo) => {
    if (!can('canBook') && !isAdmin()) return;
    const d = format(slot.start, 'yyyy-MM-dd');
    openAdd(d);
  }, [can, isAdmin]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <Header title="Bookings" subtitle="Manage all vehicle reservations" />

      {/* Tabs + view toggle + Add */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex-shrink-0 ${
                tab === s ? 'bg-navy-700 text-white' : 'bg-white text-navy-500 hover:bg-navy-50 shadow-card'
              }`}
            >
              {s}
              {s !== 'All' && (
                <span className="ml-1.5 opacity-70">{visibleBookings.filter((b) => b.status === s).length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View toggle */}
          <div className="flex bg-navy-50 rounded-xl p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode('cards')}
              className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition-all ${
                viewMode === 'cards' ? 'bg-white shadow-sm text-navy-700' : 'text-navy-400'
              }`}
              title="Card view"
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition-all ${
                viewMode === 'calendar' ? 'bg-white shadow-sm text-navy-700' : 'text-navy-400'
              }`}
              title="Calendar view"
            >
              <CalendarDays size={15} />
            </button>
          </div>

          {(isAdmin() || can('canBook')) && (
            <button
              onClick={() => openAdd()}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={15} /> New Booking
            </button>
          )}
        </div>
      </div>

      {/* ── Calendar View ── */}
      {viewMode === 'calendar' && (
        <div className="card" style={{ height: 620 }}>
          <style>{`
            /* ── Toolbar ──────────────────────────────── */
            .rbc-toolbar { margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
            .rbc-toolbar-label { font-size: 15px; font-weight: 700; color: #1B2B6B; }
            .rbc-btn-group { display: flex; gap: 4px; }
            .rbc-btn-group button {
              font-size: 12px; border-radius: 8px !important; border: 1px solid #E8EFF8 !important;
              color: #1B2B6B; padding: 5px 13px; background: #fff; font-weight: 500;
              transition: background 0.15s, color 0.15s;
            }
            .rbc-btn-group button:hover { background: #F0F4FB; }
            .rbc-btn-group button.rbc-active {
              background: #1B2B6B !important; color: #fff !important;
              border-color: #1B2B6B !important;
              box-shadow: 0 2px 8px rgba(27,43,107,0.25);
            }
            /* ── Month grid ───────────────────────────── */
            .rbc-month-view { border: 1px solid #E8EFF8; border-radius: 12px; overflow: hidden; }
            .rbc-month-row { border-color: #E8EFF8; }
            .rbc-day-bg + .rbc-day-bg { border-color: #E8EFF8; }
            .rbc-header {
              font-size: 11px; font-weight: 600; color: #6B7FA3; letter-spacing: 0.04em;
              padding: 8px 0; background: #F8FAFC; border-bottom: 1px solid #E8EFF8 !important;
              text-transform: uppercase;
            }
            .rbc-header + .rbc-header { border-color: #E8EFF8; }
            .rbc-off-range-bg { background: #F8FAFC; }
            .rbc-today { background: rgba(75,123,229,0.04) !important; }
            .rbc-date-cell { padding: 5px 8px; }
            .rbc-date-cell > a { font-size: 12px; color: #1B2B6B; font-weight: 500; }
            .rbc-date-cell.rbc-off-range > a { color: #C0CAD8; }
            .rbc-date-cell.rbc-now > a { color: #4B7BE5; font-weight: 700; }
            /* ── Events ───────────────────────────────── */
            .rbc-event {
              cursor: pointer; font-size: 11px; font-weight: 500;
              border: none !important; padding: 2px 7px !important;
            }
            .rbc-event:focus { outline: none; }
            .rbc-event-label { font-size: 10px; opacity: 0.85; }
            .rbc-show-more { font-size: 11px; color: #4B7BE5; font-weight: 600; padding: 1px 6px; }
            /* ── Week / Day ───────────────────────────── */
            .rbc-time-view { border: 1px solid #E8EFF8; border-radius: 12px; overflow: hidden; }
            .rbc-time-header { border-color: #E8EFF8; background: #F8FAFC; }
            .rbc-time-header-content { border-color: #E8EFF8; }
            .rbc-timeslot-group { border-color: #F0F4FB; }
            .rbc-time-slot { font-size: 10px; color: #9BAAC0; }
            .rbc-current-time-indicator { background: #4B7BE5; height: 2px; }
            .rbc-slot-selection { background: rgba(75,123,229,0.12) !important; }
            /* ── Agenda ───────────────────────────────── */
            .rbc-agenda-view table { border: none; }
            .rbc-agenda-date-cell, .rbc-agenda-time-cell { font-size: 12px; color: #6B7FA3; }
            .rbc-agenda-event-cell { font-size: 12px; }
          `}</style>
          <Calendar
            localizer={localizer}
            events={calEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={(ev) => { setSelected((ev as typeof calEvents[0]).resource as Booking); setModal('view'); }}
            onSelectSlot={onSelectSlot}
            selectable
            popup
          />
        </div>
      )}

      {/* ── Cards View ── */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((b) => {
            const vehicle = vehicles.find((v) => v.id === b.vehicleId);
            const balance = b.totalAmount - b.paidAmount;
            return (
              <div
                key={b.id}
                className="card hover:shadow-card-hover transition-shadow cursor-pointer"
                onClick={() => { setSelected(b); setModal('view'); }}
              >
                {/* Status bar */}
                <div
                  className="h-1 rounded-full mb-3 -mt-1"
                  style={{ background: STATUS_COLORS[b.status] ?? '#E8EFF8' }}
                />

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-navy-800">{b.customerName}</p>
                    <p className="text-xs text-navy-400">{b.customerPhone}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>

                <div className="bg-navy-50/60 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                  <CalendarDays size={13} className="text-navy-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-navy-700">
                      {vehicle?.brand} {vehicle?.model}
                      <span className="font-normal text-navy-400 ml-1">· {vehicle?.vehicleNumber}</span>
                    </p>
                    <p className="text-xs text-navy-500">{b.startDate} → {b.endDate} ({b.totalDays}d)</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-navy-50/60 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-navy-400">Total</p>
                    <p className="text-xs font-bold text-navy-800">Rs {b.totalAmount.toLocaleString()}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-emerald-500">Paid</p>
                    <p className="text-xs font-bold text-emerald-700">Rs {b.paidAmount.toLocaleString()}</p>
                  </div>
                  <div className={`rounded-xl p-2 text-center ${balance > 0 ? 'bg-red-50' : 'bg-navy-50/60'}`}>
                    <p className={`text-[10px] ${balance > 0 ? 'text-red-400' : 'text-navy-400'}`}>Balance</p>
                    <p className={`text-xs font-bold ${balance > 0 ? 'text-red-600' : 'text-navy-600'}`}>
                      Rs {balance.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-navy-50 pt-2.5">
                  <span className="bg-navy-50 text-navy-600 px-2 py-0.5 rounded-full">
                    {b.referral ?? b.leadBy ?? 'Direct'}
                  </span>
                  {(b.status === 'Confirmed' || b.status === 'Ongoing') && (
                    <button
                      className="text-navy-400 hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (b.status === 'Ongoing') updateBooking(b.id, { status: 'Completed' });
                        else cancelBooking(b.id);
                      }}
                    >
                      {b.status === 'Ongoing' ? 'Complete' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <div className="col-span-3 text-center py-16 text-navy-400 text-sm">No bookings found.</div>
          )}
        </div>
      )}

      {/* ── Add Booking Modal ── */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="New Booking" width="max-w-2xl">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Vehicle + dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <p className="label">Select Vehicle *</p>
              <select className="input" value={form.vehicleId} onChange={(e) => set('vehicleId', e.target.value)}>
                <option value="">Choose a vehicle</option>
                {bookableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} — {v.vehicleNumber} (Rs {v.dailyRent.toLocaleString()}/day)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="label">Start Date *</p>
              <input className="input" type="date" min={today} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
            </div>
            <div>
              <p className="label">End Date *</p>
              <input className="input" type="date" min={form.startDate || today} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
            </div>
          </div>

          {/* Availability banner */}
          {availability !== null && form.vehicleId && form.startDate && form.endDate && (
            <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl ${availability ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {availability ? <CheckCircle size={15} /> : <XCircle size={15} />}
              {availability
                ? `Available · ${form.totalDays} days · Rs ${form.totalAmount.toLocaleString()} base`
                : 'Already reserved for these dates.'}
            </div>
          )}

          {/* ── Trip estimator ── */}
          {form.vehicleId && form.totalDays > 0 && (
            <div className="border border-navy-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Calculator size={14} className="text-navy-500" />
                <p className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Trip Cost Estimator</p>
                <span className="text-[10px] text-navy-400">(optional · adds to Maps later)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="label">Start Location</p>
                  <div className="relative">
                    <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
                    <input className="input pl-8" value={form.quotation.startLocation}
                      onChange={(e) => setQ('startLocation', e.target.value)} placeholder="Colombo" />
                  </div>
                </div>
                <div>
                  <p className="label">Destination</p>
                  <div className="relative">
                    <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                    <input className="input pl-8" value={form.quotation.endLocation}
                      onChange={(e) => setQ('endLocation', e.target.value)} placeholder="Katharagama" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="label">Estimated km</p>
                  <input className="input" type="number" value={form.quotation.totalKm || ''}
                    onChange={(e) => setQ('totalKm', +e.target.value)} placeholder="520" />
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setQ('isRoundTrip', !form.quotation.isRoundTrip)}
                      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${form.quotation.isRoundTrip ? 'bg-navy-700' : 'bg-navy-200'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.quotation.isRoundTrip ? 'left-4' : 'left-0.5'}`} />
                    </div>
                    <span className="text-xs text-navy-600 font-medium">Round trip</span>
                    <RotateCcw size={12} className="text-navy-400" />
                  </label>
                </div>
              </div>

              {/* Estimate breakdown */}
              {form.quotation.totalKm > 0 && (() => {
                const vehicle      = vehicles.find((v) => v.id === form.vehicleId)!;
                const includedKm   = (vehicle.includedKmPerDay ?? 100) * form.totalDays;
                const extraKm      = Math.max(0, form.quotation.totalKm - includedKm);
                const extraCost    = extraKm * (vehicle.extraKmRate ?? 50);
                const estimated    = form.totalAmount + extraCost;
                return (
                  <div className="bg-navy-50/80 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="flex justify-between text-navy-600">
                      <span>Base ({form.totalDays}d × Rs {vehicle.dailyRent.toLocaleString()})</span>
                      <span className="font-semibold">Rs {form.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-navy-600">
                      <span>Included: {includedKm} km · Extra: {extraKm} km × Rs {vehicle.extraKmRate ?? 50}</span>
                      <span className="font-semibold text-amber-600">Rs {extraCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-navy-800 font-bold border-t border-navy-100 pt-1.5">
                      <span>Estimated Total</span>
                      <span>Rs {estimated.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Customer info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="label">Customer Name *</p>
              <input className="input" value={form.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <p className="label">Phone</p>
              <input className="input" value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} placeholder="07X XXXXXXX" />
            </div>
            <div>
              <p className="label">NIC</p>
              <input className="input" value={form.customerNIC} onChange={(e) => set('customerNIC', e.target.value)} placeholder="NIC number" />
            </div>

            {/* Referral dropdown */}
            <div>
              <p className="label">Referral</p>
              <select className="input" value={form.referral} onChange={(e) => set('referral', e.target.value)}>
                <option value="Direct">Direct</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.name}>{o.name}</option>
                ))}
              </select>
            </div>

            <div>
              <p className="label">Pickup Location</p>
              <input className="input" value={form.pickupLocation} onChange={(e) => set('pickupLocation', e.target.value)} />
            </div>
            <div>
              <p className="label">Drop Location</p>
              <input className="input" value={form.dropLocation} onChange={(e) => set('dropLocation', e.target.value)} />
            </div>
            <div>
              <p className="label">Paid Amount (Rs)</p>
              <input className="input" type="number" value={form.paidAmount} onChange={(e) => set('paidAmount', +e.target.value)} />
            </div>
            <div>
              <p className="label">Assign Driver</p>
              <select className="input" value={form.driverId} onChange={(e) => set('driverId', e.target.value)}>
                <option value="">No driver</option>
                {drivers.filter((d) => d.status === 'Available').map((d) => (
                  <option key={d.id} value={d.id}>{d.name} (Rs {d.dailyRate}/day)</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <p className="label">Notes</p>
              <textarea className="input resize-none" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Additional notes..." />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleCreate} className="btn-primary">Confirm Booking</button>
        </div>
      </Modal>

      {/* ── View Modal ── */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title="Booking Details">
        {selected && (() => {
          const vehicle = vehicles.find((v) => v.id === selected.vehicleId);
          const driver  = drivers.find((d) => d.id === selected.driverId);
          const balance = selected.totalAmount - selected.paidAmount;
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-navy-800">{selected.customerName}</p>
                  <p className="text-sm text-navy-400">{selected.customerPhone} {selected.customerNIC && `· ${selected.customerNIC}`}</p>
                </div>
                <StatusBadge status={selected.status} size="md" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Vehicle',    `${vehicle?.brand} ${vehicle?.model}`],
                  ['Reg. No.',   vehicle?.vehicleNumber ?? '—'],
                  ['Start Date', selected.startDate],
                  ['End Date',   selected.endDate],
                  ['Duration',   `${selected.totalDays} days`],
                  ['Referral',   selected.referral ?? selected.leadBy ?? 'Direct'],
                  ['Pickup',     selected.pickupLocation || '—'],
                  ['Drop',       selected.dropLocation || '—'],
                ].map(([l, v]) => (
                  <div key={l} className="bg-navy-50/60 rounded-xl p-3">
                    <p className="text-xs text-navy-400">{l}</p>
                    <p className="text-sm font-semibold text-navy-800">{v}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-navy-700 rounded-xl p-3 text-white">
                  <p className="text-xs opacity-70">Total</p>
                  <p className="text-base font-bold">Rs {selected.totalAmount.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-xs text-emerald-600">Paid</p>
                  <p className="text-base font-bold text-emerald-700">Rs {selected.paidAmount.toLocaleString()}</p>
                </div>
                <div className={`rounded-xl p-3 ${balance > 0 ? 'bg-red-50' : 'bg-navy-50'}`}>
                  <p className={`text-xs ${balance > 0 ? 'text-red-500' : 'text-navy-400'}`}>Balance</p>
                  <p className={`text-base font-bold ${balance > 0 ? 'text-red-700' : 'text-navy-700'}`}>
                    Rs {balance.toLocaleString()}
                  </p>
                </div>
              </div>

              {driver && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-500">Assigned Driver</p>
                  <p className="text-sm font-semibold text-blue-700">{driver.name} · {driver.phone}</p>
                </div>
              )}
              {selected.notes && (
                <div className="bg-navy-50/60 rounded-xl p-3">
                  <p className="text-xs text-navy-400">Notes</p>
                  <p className="text-sm text-navy-700">{selected.notes}</p>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
