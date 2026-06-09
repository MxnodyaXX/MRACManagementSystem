import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import TripCalculatorModal from '../components/ui/TripCalculatorModal';
import { Calendar, dateFnsLocalizer, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Plus, CalendarDays, List, AlertTriangle, CheckCircle,
  XCircle, Calculator, MessageCircle, Shield, PlayCircle,
  ChevronDown, Search as SearchIcon,
} from 'lucide-react';
import AvailabilityModal from '../components/ui/AvailabilityModal';
import { Booking } from '../types';
import { differenceInDays, parseISO, addDays, isValid } from 'date-fns';

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

// Marketing channels the customer can come through — these do NOT earn a referral fee.
// Only owner referrals or a named third party are paid a fee.
const REFERRAL_SOURCES = ['WhatsApp', 'Facebook', 'Instagram', 'TikTok', 'Google', 'Word of Mouth'];

const emptyForm = () => ({
  vehicleId: '',
  customerId: 'c_' + Math.random().toString(36).slice(2, 6),
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerNIC: '',
  startDate: '',
  endDate: '',
  totalDays: 0,
  totalAmount: 0,
  estimatedAmount: 0,
  paidAmount: 0,
  status: 'Confirmed' as BookingStatus,
  referral: 'Direct',
  referralFeeType: 'fixed' as 'fixed' | 'percent',
  referralFeeValue: 0,
  notes: '',
  pickupLocation: '',
  dropLocation: '',
  driverId: '',
  depositAmount: 0,
  depositReturned: 0,
  depositDeduction: 0,
  depositNotes: '',
  quotation: {
    startLocation: '',
    endLocation: '',
    stops: [] as string[],
    isRoundTrip: true,
    totalKm: 0,
  },
});

export default function Bookings() {
  const { vehicles, bookings, drivers, owners, customers, addBooking, updateBooking, cancelBooking, startBooking, completeBooking, isVehicleAvailable } = useStore();
  const { currentUser, isAdmin, can } = useAuthStore();
  const location = useLocation();

  const [tab,               setTab]               = useState<BookingStatus | 'All'>('All');
  const [viewMode,          setViewMode]          = useState<'cards' | 'calendar'>('cards');
  const [modal,             setModal]             = useState<'add' | 'view' | 'calculator' | null>(null);
  const [completedOpen,     setCompletedOpen]     = useState(false);
  const [availabilityOpen,  setAvailabilityOpen]  = useState(false);
  const [selected,     setSelected]     = useState<Booking | null>(null);
  const [form,         setForm]         = useState(emptyForm());
  const [availability, setAvailability] = useState<boolean | null>(null);
  const [error,        setError]        = useState('');
  const [startWarn,       setStartWarn]       = useState('');
  const [endWarn,         setEndWarn]         = useState('');
  const [customerMode,    setCustomerMode]    = useState<'new' | 'existing'>('new');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [referralCustom,   setReferralCustom]   = useState(false);

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

  // Only an owner referral or a named third party earns a fee — not Direct or a marketing source.
  const isPersonReferral =
    !!form.referral && form.referral !== 'Direct' && !REFERRAL_SOURCES.includes(form.referral);

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

  // Returns true if this date is NOT blocked by an existing booking for the selected vehicle
  const isDateAvailable = (date: Date): boolean => {
    if (!form.vehicleId) return true;
    const dateStr = format(date, 'yyyy-MM-dd');
    return !bookings.some(
      (b) => b.vehicleId === form.vehicleId &&
             b.status !== 'Cancelled' &&
             b.status !== 'Completed' &&
             dateStr >= b.startDate &&
             dateStr <= b.endDate
    );
  };

  const handleStartDate = (date: Date | null) => {
    if (!date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    if (!isDateAvailable(date)) {
      setStartWarn('This date is not available — vehicle is already booked on this day.');
    } else {
      setStartWarn('');
    }
    set('startDate', dateStr);
    setEndWarn('');
  };

  const handleEndDate = (date: Date | null) => {
    if (!date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    if (!isDateAvailable(date)) {
      setEndWarn('This date is not available — vehicle is already booked on this day.');
    } else {
      setEndWarn('');
    }
    set('endDate', dateStr);
  };

  const openAdd = (startDate = '') => {
    const f = emptyForm();
    if (startDate) { f.startDate = startDate; f.endDate = startDate; }
    setForm(f);
    setModal('add');
    setAvailability(null);
    setError('');
    setStartWarn('');
    setEndWarn('');
    setCustomerMode('new');
    setSelectedCustomer('');
    setReferralCustom(false);
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

  // Vehicle availability status — computed safely outside the render tree
  const vehicleStatus = useMemo(() => {
    if (!form.vehicleId) return null;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const vBookings = bookings
        .filter((b) => b.vehicleId === form.vehicleId && b.status !== 'Cancelled' && b.status !== 'Completed')
        .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));

      const currentHire   = vBookings.find((b) => b.startDate && b.endDate && b.startDate <= today && b.endDate >= today);
      const upcomingHires = vBookings.filter((b) => b.startDate && b.startDate > today);

      // Chain-walk to find first truly free date
      let nextFree = today;
      let iterations = 0;
      let changed = true;
      while (changed && iterations++ < 200) {
        changed = false;
        for (const b of vBookings) {
          if (b.startDate && b.endDate && b.startDate <= nextFree && b.endDate >= nextFree) {
            const parsed = parseISO(b.endDate);
            if (isValid(parsed)) {
              nextFree = addDays(parsed, 1).toISOString().slice(0, 10);
              changed = true;
            }
            break;
          }
        }
      }

      return { currentHire, upcomingHires, nextFree };
    } catch {
      return null;
    }
  }, [form.vehicleId, bookings]);

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

          <button
            onClick={() => setAvailabilityOpen(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <SearchIcon size={15} /> Check Availability
          </button>
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
      {viewMode === 'cards' && (() => {
        const activeList    = sorted.filter((b) => b.status !== 'Completed');
        const completedList = sorted.filter((b) => b.status === 'Completed');

        const renderCard = (b: Booking) => {
          const vehicle = vehicles.find((v) => v.id === b.vehicleId);
          const owner   = owners.find((o) => o.id === vehicle?.ownerId);
          const balance = b.totalAmount - b.paidAmount;
          return (
            <div
              key={b.id}
              className="card hover:shadow-card-hover transition-shadow cursor-pointer"
              onClick={() => { setSelected(b); setModal('view'); }}
            >
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-navy-700 truncate">
                      {vehicle?.brand} {vehicle?.model}
                      <span className="font-normal text-navy-400 ml-1">· {vehicle?.vehicleNumber}</span>
                    </p>
                    {owner && (
                      <span className="text-[10px] text-navy-400 bg-white border border-navy-100 rounded-full px-2 py-0.5 flex-shrink-0">
                        {owner.name}
                      </span>
                    )}
                  </div>
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
                  {b.referral ?? 'Direct'}
                </span>
                <div className="flex gap-1.5">
                  {b.status === 'Confirmed' && (
                    <>
                      <button
                        className="flex items-center gap-1 text-emerald-600 hover:bg-emerald-50 px-2 py-0.5 rounded-lg font-medium transition-colors"
                        onClick={(e) => { e.stopPropagation(); startBooking(b.id); }}
                        title="Mark vehicle as On Rent"
                      >
                        <PlayCircle size={11} /> Start
                      </button>
                      <button
                        className="text-red-400 hover:bg-red-50 px-2 py-0.5 rounded-lg transition-colors"
                        onClick={(e) => { e.stopPropagation(); cancelBooking(b.id); }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {b.status === 'Ongoing' && (
                    <button
                      className="text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded-lg font-medium transition-colors"
                      onClick={(e) => { e.stopPropagation(); completeBooking(b.id); }}
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        };

        return (
          <>
            {/* Active bookings grid */}
            {activeList.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeList.map(renderCard)}
              </div>
            )}
            {activeList.length === 0 && completedList.length === 0 && (
              <div className="text-center py-16 text-navy-400 text-sm">No bookings found.</div>
            )}

            {/* Completed bookings accordion */}
            {completedList.length > 0 && (
              <div className={activeList.length > 0 ? 'mt-4' : ''}>
                <button
                  onClick={() => setCompletedOpen((v) => !v)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-navy-100 hover:bg-navy-50/60 transition-colors shadow-card"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-navy-700 flex-1 text-left">
                    Completed Bookings
                  </span>
                  <span className="text-xs text-navy-400 bg-navy-50 px-2.5 py-0.5 rounded-full">
                    {completedList.length}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-navy-400 transition-transform duration-300 flex-shrink-0 ${completedOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {completedOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                    {completedList.map(renderCard)}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

      {/* ── Add Booking Modal ── */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="New Booking" width="max-w-2xl">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Customer mode toggle */}
          <div className="flex gap-2 p-1 bg-navy-50 rounded-xl">
            <button
              type="button"
              onClick={() => { setCustomerMode('new'); setSelectedCustomer(''); setForm((f) => ({ ...f, customerName: '', customerPhone: '', customerEmail: '', customerNIC: '' })); }}
              className={`flex-1 py-2 rounded-[10px] text-xs font-semibold transition-all ${
                customerMode === 'new'
                  ? 'bg-navy-700 text-white shadow-sm'
                  : 'text-navy-500 hover:text-navy-700'
              }`}
            >
              New Customer
            </button>
            <button
              type="button"
              onClick={() => { setCustomerMode('existing'); setSelectedCustomer(''); }}
              className={`flex-1 py-2 rounded-[10px] text-xs font-semibold transition-all ${
                customerMode === 'existing'
                  ? 'bg-navy-700 text-white shadow-sm'
                  : 'text-navy-500 hover:text-navy-700'
              }`}
            >
              Existing Customer
            </button>
          </div>

          {/* Vehicle select */}
          <div>
            <p className="label">Select Vehicle *</p>
            <Select
              value={form.vehicleId}
              onChange={(val) => { set('vehicleId', val); setStartWarn(''); setEndWarn(''); }}
              placeholder="Choose a vehicle"
              options={bookableVehicles.map((v) => ({
                value: v.id,
                label: `${v.brand} ${v.model} · ${v.vehicleNumber}`,
                sub: `Rs ${v.dailyRent.toLocaleString()} / day · ${v.status}`,
              }))}
            />
          </div>

          {/* Vehicle status — shows immediately after vehicle is selected */}
          {vehicleStatus && (
            !vehicleStatus.currentHire && vehicleStatus.upcomingHires.length === 0 ? (
              <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                <p className="text-sm font-medium text-emerald-700">Vehicle is available — select your dates below</p>
              </div>
            ) : (
              <div className="border border-red-200 rounded-xl overflow-hidden text-xs">
                {vehicleStatus.currentHire && (
                  <div className="bg-red-50 px-4 py-3">
                    <p className="font-bold text-red-700 uppercase tracking-wide text-[10px] mb-2">Currently in Hire</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-red-400 mb-0.5">Customer</p>
                        <p className="font-semibold text-red-800">{vehicleStatus.currentHire.customerName}</p>
                      </div>
                      <div>
                        <p className="text-red-400 mb-0.5">Phone</p>
                        <p className="font-semibold text-red-800">{vehicleStatus.currentHire.customerPhone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-red-400 mb-0.5">Hire Period</p>
                        <p className="font-semibold text-red-800">{vehicleStatus.currentHire.startDate} → {vehicleStatus.currentHire.endDate}</p>
                      </div>
                      <div>
                        <p className="text-red-400 mb-0.5">Next Free</p>
                        <p className="font-bold text-emerald-700">{vehicleStatus.nextFree}</p>
                      </div>
                    </div>
                  </div>
                )}
                {vehicleStatus.upcomingHires.length > 0 && (
                  <div className={`px-4 py-3 ${vehicleStatus.currentHire ? 'border-t border-amber-200 bg-amber-50/70' : 'bg-amber-50/70'}`}>
                    <p className="font-bold text-amber-700 uppercase tracking-wide text-[10px] mb-2">Upcoming Bookings</p>
                    <div className="space-y-1">
                      {vehicleStatus.upcomingHires.map((b) => (
                        <div key={b.id} className="flex justify-between">
                          <span className="text-amber-800 font-medium">{b.customerName}</span>
                          <span className="text-amber-700">{b.startDate} → {b.endDate}</span>
                        </div>
                      ))}
                    </div>
                    {!vehicleStatus.currentHire && (
                      <p className="text-emerald-700 font-semibold mt-2">Next free: {vehicleStatus.nextFree}</p>
                    )}
                  </div>
                )}
              </div>
            )
          )}

          {/* Date pickers — blocked dates are greyed out in the calendar */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="label">Start Date *</p>
              <DatePicker
                selected={form.startDate ? parseISO(form.startDate) : null}
                onChange={handleStartDate}
                minDate={new Date()}
                filterDate={isDateAvailable}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select start date"
                className={`input w-full ${startWarn ? 'border-red-400 focus:border-red-500' : ''}`}
                calendarClassName="emrac-datepicker"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
              />
              {startWarn && (
                <p className="flex items-center gap-1.5 text-xs text-red-600 mt-1.5">
                  <XCircle size={12} /> {startWarn}
                </p>
              )}
            </div>
            <div>
              <p className="label">End Date *</p>
              <DatePicker
                selected={form.endDate ? parseISO(form.endDate) : null}
                onChange={handleEndDate}
                minDate={form.startDate ? parseISO(form.startDate) : new Date()}
                filterDate={isDateAvailable}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select end date"
                className={`input w-full ${endWarn ? 'border-red-400 focus:border-red-500' : ''}`}
                calendarClassName="emrac-datepicker"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
              />
              {endWarn && (
                <p className="flex items-center gap-1.5 text-xs text-red-600 mt-1.5">
                  <XCircle size={12} /> {endWarn}
                </p>
              )}
            </div>
          </div>

          {/* Full date-range conflict banner — shown after both dates are picked */}
          {form.vehicleId && form.startDate && form.endDate && availability !== null && (
            availability ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
                <CheckCircle size={15} className="flex-shrink-0" />
                <span>
                  Available · <span className="font-semibold">{form.totalDays} day{form.totalDays !== 1 ? 's' : ''}</span>
                  {' · '}Base cost: <span className="font-semibold">Rs {form.totalAmount.toLocaleString()}</span>
                </span>
              </div>
            ) : (() => {
              const conflict = bookings.find(
                (b) => b.vehicleId === form.vehicleId && b.status !== 'Cancelled'
                  && form.startDate <= b.endDate && form.endDate >= b.startDate
              );
              const allVB = bookings
                .filter((b) => b.vehicleId === form.vehicleId && b.status !== 'Cancelled' && b.status !== 'Completed')
                .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
              let nextFree: string | null = null;
              try {
                if (conflict?.endDate) {
                  const parsed = parseISO(conflict.endDate);
                  if (isValid(parsed)) {
                    nextFree = addDays(parsed, 1).toISOString().slice(0, 10);
                    let changed = true;
                    let iter = 0;
                    while (changed && iter++ < 200) {
                      changed = false;
                      for (const b of allVB) {
                        if (b.startDate && b.endDate && b.startDate <= nextFree! && b.endDate >= nextFree!) {
                          const d = parseISO(b.endDate);
                          if (isValid(d)) {
                            nextFree = addDays(d, 1).toISOString().slice(0, 10);
                            changed = true;
                          }
                          break;
                        }
                      }
                    }
                  }
                }
              } catch { /* leave nextFree null */ }
              return (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle size={14} className="text-red-500 flex-shrink-0" />
                    <span className="text-sm font-bold text-red-700">Selected dates not available</span>
                  </div>
                  {conflict && (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs pl-1">
                      <span className="text-red-400">Booked by</span><span className="font-semibold text-red-800">{conflict.customerName}</span>
                      <span className="text-red-400">Booked period</span><span className="font-semibold text-red-800">{conflict.startDate} → {conflict.endDate}</span>
                      {nextFree && <><span className="text-red-400">Next free date</span><span className="font-bold text-emerald-700">{nextFree}</span></>}
                    </div>
                  )}
                </div>
              );
            })()
          )}

          {/* Customer info */}
          <div className="grid grid-cols-2 gap-4">

            {/* ── Existing customer picker ── */}
            {customerMode === 'existing' ? (
              <div className="col-span-2">
                <p className="label">Select Customer *</p>
                <Select
                  value={selectedCustomer}
                  onChange={(id) => {
                    const c = customers.find((x) => x.id === id);
                    if (!c) return;
                    setSelectedCustomer(id);
                    setForm((f) => ({
                      ...f,
                      customerName:  c.name,
                      customerPhone: c.phone,
                      customerEmail: c.email  ?? '',
                      customerNIC:   c.nic    ?? '',
                    }));
                  }}
                  placeholder="Search and select a customer…"
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.name,
                    sub:   c.phone + (c.nic ? ` · ${c.nic}` : ''),
                  }))}
                />
                {selectedCustomer && (() => {
                  const c = customers.find((x) => x.id === selectedCustomer);
                  if (!c) return null;
                  return (
                    <div className="mt-2 bg-navy-50/70 border border-navy-100 rounded-xl px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                      <div>
                        <p className="text-navy-400">Phone</p>
                        <p className="font-semibold text-navy-800">{c.phone}</p>
                      </div>
                      {c.email && (
                        <div>
                          <p className="text-navy-400">Email</p>
                          <p className="font-semibold text-navy-800">{c.email}</p>
                        </div>
                      )}
                      {c.nic && (
                        <div>
                          <p className="text-navy-400">NIC</p>
                          <p className="font-semibold text-navy-800">{c.nic}</p>
                        </div>
                      )}
                      {c.address && (
                        <div>
                          <p className="text-navy-400">Address</p>
                          <p className="font-semibold text-navy-800">{c.address}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* ── New customer fields ── */
              <>
                <div>
                  <p className="label">Customer Name *</p>
                  <input className="input" value={form.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <p className="label">Phone</p>
                  <input className="input" value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} placeholder="07X XXXXXXX" />
                </div>
                <div>
                  <p className="label">Email <span className="text-navy-400 font-normal">(for receipt)</span></p>
                  <input className="input" type="email" value={form.customerEmail} onChange={(e) => set('customerEmail', e.target.value)} placeholder="customer@email.com" />
                </div>
                <div>
                  <p className="label">NIC</p>
                  <input className="input" value={form.customerNIC} onChange={(e) => set('customerNIC', e.target.value)} placeholder="NIC number" />
                </div>
              </>
            )}

            {/* Referral — pick a registered owner, or enter a third party */}
            <div className="col-span-2">
              <p className="label">Referral <span className="text-navy-400 font-normal">(who sent this hire)</span></p>
              {referralCustom ? (
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={form.referral === 'Direct' ? '' : form.referral}
                    onChange={(e) => set('referral', e.target.value || 'Direct')}
                    placeholder="Third-party name (e.g. a friend not in the system)"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => { setReferralCustom(false); set('referral', 'Direct'); }}
                    className="btn-secondary flex-shrink-0 text-xs"
                  >
                    Pick from list
                  </button>
                </div>
              ) : (
                <Select
                  value={form.referral}
                  onChange={(val) => {
                    if (val === '__custom__') { setReferralCustom(true); setForm((f) => ({ ...f, referral: '', referralFeeValue: 0 })); return; }
                    // Marketing sources & Direct never carry a fee — clear any entered fee.
                    const isSource = REFERRAL_SOURCES.includes(val);
                    setForm((f) => ({
                      ...f,
                      referral: val || 'Direct',
                      ...((val === 'Direct' || val === '' || isSource) ? { referralFeeValue: 0 } : {}),
                    }));
                  }}
                  placeholder="Direct"
                  options={[
                    { value: 'Direct', label: 'Direct' },
                    ...owners.map((o) => ({ value: o.name, label: o.name, sub: 'Owner referral · earns a fee' })),
                    ...REFERRAL_SOURCES.map((s) => ({ value: s, label: s, sub: 'Marketing source' })),
                    { value: '__custom__', label: 'Other / third party…', sub: 'Type a name · earns a fee' },
                  ]}
                />
              )}
            </div>

            {/* Referral fee — only owner / third-party referrals are paid; deducted from the owner payout */}
            {isPersonReferral && (
              <div className="col-span-2 bg-navy-50/60 rounded-xl p-3">
                <p className="label">Referral Fee for {form.referral}</p>
                <div className="flex gap-2 items-center">
                  <div className="flex bg-white rounded-xl p-0.5 gap-0.5 border border-navy-100 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => set('referralFeeType', 'fixed')}
                      className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${form.referralFeeType === 'fixed' ? 'bg-navy-700 text-white' : 'text-navy-500'}`}
                    >
                      Rs
                    </button>
                    <button
                      type="button"
                      onClick={() => set('referralFeeType', 'percent')}
                      className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${form.referralFeeType === 'percent' ? 'bg-navy-700 text-white' : 'text-navy-500'}`}
                    >
                      %
                    </button>
                  </div>
                  <input
                    className="input flex-1"
                    type="number"
                    min={0}
                    value={form.referralFeeValue || ''}
                    onChange={(e) => set('referralFeeValue', +e.target.value)}
                    placeholder={form.referralFeeType === 'percent' ? 'e.g. 5' : 'e.g. 2000'}
                  />
                </div>
                {form.referralFeeValue > 0 && (
                  <p className="text-xs text-navy-500 mt-2">
                    Referrer gets <span className="font-semibold text-navy-800">Rs {(
                      form.referralFeeType === 'percent'
                        ? Math.round(form.totalAmount * (form.referralFeeValue / 100))
                        : Math.round(form.referralFeeValue)
                    ).toLocaleString()}</span>
                    {form.referralFeeType === 'percent' && ` (${form.referralFeeValue}% of Rs ${form.totalAmount.toLocaleString()})`}
                    {' · '}deducted from owner payout
                  </p>
                )}
              </div>
            )}

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

            {/* Security Deposit row */}
            <div>
              <p className="label flex items-center gap-1"><Shield size={11} className="text-amber-500" /> Security Deposit (Rs)</p>
              <input className="input" type="number" value={form.depositAmount || ''} onChange={(e) => set('depositAmount', +e.target.value)} placeholder="0" />
            </div>

            <div>
              <p className="label">Assign Driver</p>
              <Select
                value={form.driverId}
                onChange={(val) => set('driverId', val)}
                placeholder="No driver"
                options={drivers
                  .filter((d) => d.status === 'Available')
                  .map((d) => ({
                    value: d.id,
                    label: d.name,
                    sub: `Rs ${d.dailyRate.toLocaleString()} / day`,
                  }))}
              />
            </div>
            <div className="col-span-2">
              <p className="label">Notes</p>
              <textarea className="input resize-none" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Additional notes..." />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button
            onClick={() => setModal('calculator')}
            className="btn-secondary flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Calculator size={14} /> Calculate Total Bill
          </button>
          <button onClick={handleCreate} className="btn-primary">Confirm Booking</button>
        </div>
      </Modal>

      {/* ── Availability Check Modal ── */}
      <AvailabilityModal open={availabilityOpen} onClose={() => setAvailabilityOpen(false)} />

      {/* ── Trip Bill Calculator Modal ── */}
      <TripCalculatorModal
        open={modal === 'calculator'}
        onBack={() => setModal('add')}
        onConfirm={() => { handleCreate(); }}
        form={form}
        vehicle={vehicles.find((v) => v.id === form.vehicleId)}
        updateQuotation={(updates) =>
          setForm((f) => {
            const q = { ...f.quotation, ...updates };
            const updated = { ...f, quotation: q };
            recalcEstimate(updated);
            return updated;
          })
        }
      />

      {/* ── View Modal ── */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title="Booking Details">
        {selected && (() => {
          const vehicle = vehicles.find((v) => v.id === selected.vehicleId);
          const owner   = owners.find((o) => o.id === vehicle?.ownerId);
          const driver  = drivers.find((d) => d.id === selected.driverId);
          const balance = selected.totalAmount - selected.paidAmount;
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-navy-800">{selected.customerName}</p>
                  <p className="text-sm text-navy-400">
                    {selected.customerPhone}
                    {selected.customerNIC && ` · ${selected.customerNIC}`}
                    {selected.customerEmail && ` · ${selected.customerEmail}`}
                  </p>
                </div>
                <StatusBadge status={selected.status} size="md" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Vehicle',    `${vehicle?.brand} ${vehicle?.model}`],
                  ['Reg. No.',   vehicle?.vehicleNumber ?? '—'],
                  ['Owner',      owner?.name ?? '—'],
                  ['Owner Phone',owner?.phone ?? '—'],
                  ['Start Date', selected.startDate],
                  ['End Date',   selected.endDate],
                  ['Duration',   `${selected.totalDays} days`],
                  ['Referral',   selected.referral ?? 'Direct'],
                  ...((selected.referralFee ?? 0) > 0
                    ? [['Referral Fee', `Rs ${(selected.referralFee ?? 0).toLocaleString()}`] as [string, string]]
                    : []),
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

              {/* Security Deposit section */}
              {(selected.depositAmount ?? 0) > 0 && (
                <div className="border border-amber-200 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                    <Shield size={12} /> Security Deposit
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-amber-50 rounded-lg p-2">
                      <p className="text-amber-500">Collected</p>
                      <p className="font-bold text-amber-800">Rs {(selected.depositAmount ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2">
                      <p className="text-emerald-500">Returned</p>
                      <p className="font-bold text-emerald-700">Rs {(selected.depositReturned ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2">
                      <p className="text-red-400">Deducted</p>
                      <p className="font-bold text-red-700">Rs {(selected.depositDeduction ?? 0).toLocaleString()}</p>
                    </div>
                  </div>
                  {selected.depositNotes && (
                    <p className="text-xs text-amber-600 pl-1">{selected.depositNotes}</p>
                  )}
                  {(selected.status === 'Completed' || selected.status === 'Ongoing') && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <p className="label text-[11px]">Return Amount</p>
                        <input className="input text-xs py-1" type="number"
                          defaultValue={selected.depositReturned ?? ''}
                          onBlur={(e) => updateBooking(selected.id, { depositReturned: +e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <p className="label text-[11px]">Deduction</p>
                        <input className="input text-xs py-1" type="number"
                          defaultValue={selected.depositDeduction ?? ''}
                          onBlur={(e) => updateBooking(selected.id, { depositDeduction: +e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-2">
                        <p className="label text-[11px]">Deduction Notes</p>
                        <input className="input text-xs py-1"
                          defaultValue={selected.depositNotes ?? ''}
                          onBlur={(e) => updateBooking(selected.id, { depositNotes: e.target.value })}
                          placeholder="Damage, cleaning fee, etc."
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

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

              {/* Action footer */}
              <div className="flex items-center gap-2 pt-2 border-t border-navy-100">
                {/* WhatsApp button — always shown */}
                <button
                  className="flex items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                  onClick={() => {
                    const v = vehicles.find((vv) => vv.id === selected.vehicleId);
                    const balance = selected.totalAmount - selected.paidAmount;
                    const msg = [
                      `Hello ${selected.customerName},`,
                      ``,
                      `Your booking with *MRAC* is confirmed.`,
                      ``,
                      `*Vehicle:* ${v?.brand ?? ''} ${v?.model ?? ''} (${v?.vehicleNumber ?? ''})`,
                      `*Period:* ${selected.startDate} → ${selected.endDate} (${selected.totalDays} days)`,
                      `*Total:* Rs ${selected.totalAmount.toLocaleString()}`,
                      `*Paid:* Rs ${selected.paidAmount.toLocaleString()}`,
                      ...(balance > 0 ? [`*Balance due:* Rs ${balance.toLocaleString()}`] : []),
                      ...(selected.pickupLocation ? [`*Pickup:* ${selected.pickupLocation}`] : []),
                      ``,
                      `Thank you for choosing MRAC!`,
                    ].join('\n');
                    const phone = selected.customerPhone.replace(/[^0-9]/g, '');
                    const intlPhone = phone.startsWith('0') ? '94' + phone.slice(1) : phone;
                    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                >
                  <MessageCircle size={13} /> WhatsApp
                </button>

                <div className="flex-1" />

                {selected.status === 'Confirmed' && (
                  <>
                    <button
                      className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                      onClick={() => { startBooking(selected.id); setModal(null); }}
                    >
                      <PlayCircle size={13} /> Start Trip
                    </button>
                    <button
                      className="text-xs text-red-500 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
                      onClick={() => { cancelBooking(selected.id); setModal(null); }}
                    >
                      Cancel Booking
                    </button>
                  </>
                )}
                {selected.status === 'Ongoing' && (
                  <button
                    className="text-xs bg-navy-700 hover:bg-navy-800 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                    onClick={() => { completeBooking(selected.id); setModal(null); }}
                  >
                    Complete Trip
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
