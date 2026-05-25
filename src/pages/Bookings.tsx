import { useState } from 'react';
import { useStore } from '../store/useStore';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { Plus, CalendarDays, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Booking } from '../types';
import { differenceInDays, format, parseISO } from 'date-fns';

type BookingStatus = 'Confirmed' | 'Ongoing' | 'Completed' | 'Cancelled';
const STATUS_TABS: (BookingStatus | 'All')[] = ['All', 'Confirmed', 'Ongoing', 'Completed', 'Cancelled'];

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
  paidAmount: 0,
  status: 'Confirmed' as BookingStatus,
  leadBy: '',
  notes: '',
  pickupLocation: '',
  dropLocation: '',
  driverId: '',
});

export default function Bookings() {
  const { vehicles, bookings, drivers, addBooking, updateBooking, cancelBooking, isVehicleAvailable } = useStore();
  const [tab, setTab] = useState<BookingStatus | 'All'>('All');
  const [modal, setModal] = useState<'add' | 'view' | null>(null);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [availability, setAvailability] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  const filtered = tab === 'All' ? bookings : bookings.filter((b) => b.status === tab);
  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const set = (field: string, value: unknown) => {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      // auto-calc
      if (field === 'startDate' || field === 'endDate' || field === 'vehicleId') {
        const s = field === 'startDate' ? value as string : updated.startDate;
        const e = field === 'endDate' ? value as string : updated.endDate;
        const vid = field === 'vehicleId' ? value as string : updated.vehicleId;
        if (s && e && s <= e) {
          const days = differenceInDays(parseISO(e as string), parseISO(s as string)) + 1;
          const vehicle = vehicles.find((v) => v.id === vid);
          const amount = days * (vehicle?.dailyRent ?? 0);
          updated.totalDays = days;
          updated.totalAmount = amount;
        }
        if (s && e && vid) {
          setAvailability(isVehicleAvailable(vid, s as string, e as string));
        }
      }
      return updated;
    });
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

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <Header title="Bookings" subtitle="Manage all vehicle reservations" />

      {/* Tabs + Add */}
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
                <span className="ml-1.5 opacity-70">{bookings.filter((b) => b.status === s).length}</span>
              )}
            </button>
          ))}
        </div>
        <button onClick={() => { setForm(emptyForm()); setModal('add'); setAvailability(null); setError(''); }} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Plus size={15} /> New Booking
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="table-head text-left pb-3">Booking</th>
              <th className="table-head text-left pb-3">Vehicle</th>
              <th className="table-head text-left pb-3">Dates</th>
              <th className="table-head text-right pb-3">Amount</th>
              <th className="table-head text-center pb-3">Lead By</th>
              <th className="table-head text-right pb-3">Status</th>
              <th className="table-head text-right pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => {
              const vehicle = vehicles.find((v) => v.id === b.vehicleId);
              return (
                <tr key={b.id} className="table-row cursor-pointer" onClick={() => { setSelected(b); setModal('view'); }}>
                  <td className="py-3">
                    <p className="text-sm font-semibold text-navy-800">{b.customerName}</p>
                    <p className="text-xs text-navy-400">{b.customerPhone}</p>
                  </td>
                  <td className="py-3">
                    <p className="text-sm text-navy-700">{vehicle?.brand} {vehicle?.model}</p>
                    <p className="text-xs text-navy-400">{vehicle?.vehicleNumber}</p>
                  </td>
                  <td className="py-3">
                    <p className="text-sm text-navy-700">{b.startDate}</p>
                    <p className="text-xs text-navy-400">→ {b.endDate} ({b.totalDays}d)</p>
                  </td>
                  <td className="py-3 text-right">
                    <p className="text-sm font-semibold text-navy-800">Rs {b.totalAmount.toLocaleString()}</p>
                    <p className="text-xs text-navy-400">Paid: Rs {b.paidAmount.toLocaleString()}</p>
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-xs bg-navy-50 text-navy-600 px-2 py-0.5 rounded-full">{b.leadBy || 'Direct'}</span>
                  </td>
                  <td className="py-3 text-right">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {(b.status === 'Confirmed' || b.status === 'Ongoing') && (
                      <button
                        onClick={() => {
                          if (b.status === 'Ongoing') {
                            updateBooking(b.id, { status: 'Completed' });
                          } else {
                            cancelBooking(b.id);
                          }
                        }}
                        className="text-xs text-navy-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        {b.status === 'Ongoing' ? 'Complete' : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-navy-400 text-sm">No bookings found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Booking Modal */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="New Booking" width="max-w-2xl">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            <AlertTriangle size={15} /> {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="label">Select Vehicle *</p>
            <select className="input" value={form.vehicleId} onChange={(e) => set('vehicleId', e.target.value)}>
              <option value="">Choose a vehicle</option>
              {vehicles.map((v) => (
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

          {/* Availability indicator */}
          {availability !== null && form.vehicleId && form.startDate && form.endDate && (
            <div className={`col-span-2 flex items-center gap-2 text-sm px-4 py-3 rounded-xl ${availability ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {availability ? <CheckCircle size={15} /> : <XCircle size={15} />}
              {availability
                ? `Vehicle available · ${form.totalDays} days · Rs ${form.totalAmount.toLocaleString()} total`
                : 'Vehicle is already reserved for these dates. Choose different dates.'}
            </div>
          )}

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
          <div>
            <p className="label">Lead By</p>
            <input className="input" value={form.leadBy} onChange={(e) => set('leadBy', e.target.value)} placeholder="Brother / Sister / Direct" />
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
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleCreate} className="btn-primary">Confirm Booking</button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title="Booking Details">
        {selected && (() => {
          const vehicle = vehicles.find((v) => v.id === selected.vehicleId);
          const driver = drivers.find((d) => d.id === selected.driverId);
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
                  ['Vehicle', `${vehicle?.brand} ${vehicle?.model}`],
                  ['Reg. No.', vehicle?.vehicleNumber ?? '—'],
                  ['Start Date', selected.startDate],
                  ['End Date', selected.endDate],
                  ['Duration', `${selected.totalDays} days`],
                  ['Lead By', selected.leadBy || 'Direct'],
                  ['Pickup', selected.pickupLocation || '—'],
                  ['Drop', selected.dropLocation || '—'],
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
