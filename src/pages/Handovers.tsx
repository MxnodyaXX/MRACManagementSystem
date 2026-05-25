import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import {
  Truck, RotateCcw, CheckCircle2, MapPin, Gauge, Fuel,
  CalendarDays, Clock, FileText, AlertTriangle, Car,
} from 'lucide-react';
import { Booking, VehicleHandover } from '../types';

const FUEL_LEVELS = ['Full', '3/4', '1/2', '1/4', 'Empty'] as const;
type FuelLevel = typeof FUEL_LEVELS[number];

const FUEL_COLOR: Record<FuelLevel, string> = {
  Full:    'text-emerald-600 bg-emerald-50',
  '3/4':   'text-blue-600   bg-blue-50',
  '1/2':   'text-amber-600  bg-amber-50',
  '1/4':   'text-orange-600 bg-orange-50',
  Empty:   'text-red-600    bg-red-50',
};

const emptyHandover = (type: 'delivery' | 'return', bookingId: string, vehicleId: string) => ({
  bookingId,
  vehicleId,
  type,
  location:  '',
  dateTime:  new Date().toISOString().slice(0, 16),
  mileage:   0,
  fuelLevel: 'Full' as FuelLevel,
  notes:     '',
  extraKm:        0,
  extraKmCharge:  0,
  finalAmount:    0,
});

export default function Handovers() {
  const { bookings, vehicles, handovers, addHandover, updateBooking } = useStore();
  const { currentUser, isAdmin, can } = useAuthStore();

  const [tab,      setTab]      = useState<'active' | 'records'>('active');
  const [modal,    setModal]    = useState<'delivery' | 'return' | 'view' | null>(null);
  const [form,     setForm]     = useState(emptyHandover('delivery', '', ''));
  const [viewItem, setViewItem] = useState<VehicleHandover | null>(null);

  // Owner sees only their vehicle bookings
  const isOwnerRole   = !isAdmin() && currentUser?.role === 'owner';
  const myVehicleIds  = isOwnerRole
    ? vehicles.filter((v) => v.ownerId === currentUser?.ownerId).map((v) => v.id)
    : null;

  const relevantBookings = (myVehicleIds
    ? bookings.filter((b) => myVehicleIds.includes(b.vehicleId))
    : bookings
  ).filter((b) => b.status === 'Confirmed' || b.status === 'Ongoing' || b.status === 'Completed');

  const activeBookings = relevantBookings.filter((b) => b.status === 'Confirmed' || b.status === 'Ongoing');

  const getHandovers = (bookingId: string) => ({
    delivery: handovers.find((h) => h.bookingId === bookingId && h.type === 'delivery'),
    return:   handovers.find((h) => h.bookingId === bookingId && h.type === 'return'),
  });

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const openDelivery = (b: Booking) => {
    setForm(emptyHandover('delivery', b.id, b.vehicleId));
    setModal('delivery');
  };

  const openReturn = (b: Booking) => {
    const delivery = handovers.find((h) => h.bookingId === b.id && h.type === 'delivery');
    const vehicle  = vehicles.find((v) => v.id === b.vehicleId);
    const base     = { ...emptyHandover('return', b.id, b.vehicleId) };
    base.finalAmount = b.totalAmount;
    setForm(base);
    setModal('return');
  };

  const recalcReturn = (f: typeof form) => {
    const delivery = handovers.find((h) => h.bookingId === f.bookingId && h.type === 'delivery');
    const vehicle  = vehicles.find((v) => v.id === f.vehicleId);
    const booking  = bookings.find((b) => b.id === f.bookingId);
    if (!delivery || !vehicle || !booking) return f;

    const extraKm     = Math.max(0, f.mileage - delivery.mileage);
    const extraCharge = extraKm * (vehicle.extraKmRate ?? 50);
    return { ...f, extraKm, extraKmCharge: extraCharge, finalAmount: booking.totalAmount + extraCharge };
  };

  const setReturn = (field: string, value: unknown) => {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      if (field === 'mileage') return recalcReturn(updated);
      return updated;
    });
  };

  const handleSaveDelivery = () => {
    if (!form.location || !form.dateTime || !form.mileage) return;
    addHandover(form);
    // Move booking to Ongoing when vehicle is delivered
    updateBooking(form.bookingId, { status: 'Ongoing' });
    setModal(null);
  };

  const handleSaveReturn = () => {
    if (!form.location || !form.dateTime || !form.mileage) return;
    addHandover(form);
    // Mark booking Completed on return
    updateBooking(form.bookingId, { status: 'Completed' });
    setModal(null);
  };

  const allRecords = [...handovers]
    .filter((h) => !myVehicleIds || myVehicleIds.includes(h.vehicleId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div>
      <Header title="Vehicle Handovers" subtitle="Record delivery and return conditions for every booking" />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['active', 'records'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-colors capitalize ${
              tab === t ? 'bg-navy-700 text-white' : 'bg-white text-navy-500 hover:bg-navy-50 shadow-card'
            }`}
          >
            {t === 'active' ? `Active Bookings (${activeBookings.length})` : 'Handover Records'}
          </button>
        ))}
      </div>

      {/* ── Active Bookings ── */}
      {tab === 'active' && (
        <div className="space-y-4">
          {activeBookings.length === 0 && (
            <div className="card text-center py-16 text-navy-400 text-sm">
              No active bookings requiring handover.
            </div>
          )}
          {activeBookings.map((b) => {
            const vehicle  = vehicles.find((v) => v.id === b.vehicleId);
            const { delivery, return: ret } = getHandovers(b.id);
            const balance  = b.totalAmount - b.paidAmount;

            return (
              <div key={b.id} className="card">
                {/* Booking header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                      <Car size={18} className="text-navy-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-navy-800">{b.customerName}</p>
                      <p className="text-xs text-navy-400">{b.customerPhone}</p>
                    </div>
                  </div>
                  <StatusBadge status={b.status} size="md" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <InfoChip label="Vehicle" value={`${vehicle?.brand} ${vehicle?.model}`} />
                  <InfoChip label="Reg No." value={vehicle?.vehicleNumber ?? '—'} />
                  <InfoChip label="From"    value={b.startDate} />
                  <InfoChip label="To"      value={b.endDate} />
                </div>

                {/* Handover timeline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Delivery */}
                  <div className={`rounded-xl p-4 border-2 ${delivery ? 'border-emerald-200 bg-emerald-50/50' : 'border-dashed border-navy-200 bg-navy-50/40'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Truck size={15} className={delivery ? 'text-emerald-600' : 'text-navy-400'} />
                      <p className={`text-xs font-semibold uppercase tracking-wide ${delivery ? 'text-emerald-700' : 'text-navy-500'}`}>
                        Vehicle Delivery
                      </p>
                      {delivery && <CheckCircle2 size={14} className="text-emerald-500 ml-auto" />}
                    </div>

                    {delivery ? (
                      <div className="space-y-1.5">
                        <HandoverDetail icon={MapPin}  value={delivery.location} />
                        <HandoverDetail icon={Clock}   value={delivery.dateTime.replace('T', ' ')} />
                        <HandoverDetail icon={Gauge}   value={`${delivery.mileage.toLocaleString()} km`} />
                        <HandoverDetail icon={Fuel}    value={delivery.fuelLevel}
                          className={FUEL_COLOR[delivery.fuelLevel as FuelLevel] ?? ''} />
                        {delivery.notes && (
                          <HandoverDetail icon={FileText} value={delivery.notes} />
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-navy-400 mb-3">Not recorded yet</p>
                        {(isAdmin() || can('canBook')) && (
                          <button
                            onClick={() => openDelivery(b)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-navy-700 text-white hover:bg-navy-800 transition-colors"
                          >
                            <Truck size={13} />
                            Record Delivery
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Return */}
                  <div className={`rounded-xl p-4 border-2 ${ret ? 'border-blue-200 bg-blue-50/50' : delivery ? 'border-dashed border-amber-300 bg-amber-50/30' : 'border-dashed border-navy-100 bg-navy-50/20 opacity-50'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <RotateCcw size={15} className={ret ? 'text-blue-600' : delivery ? 'text-amber-500' : 'text-navy-300'} />
                      <p className={`text-xs font-semibold uppercase tracking-wide ${ret ? 'text-blue-700' : delivery ? 'text-amber-600' : 'text-navy-300'}`}>
                        Vehicle Return
                      </p>
                      {ret && <CheckCircle2 size={14} className="text-blue-500 ml-auto" />}
                    </div>

                    {ret ? (
                      <div className="space-y-1.5">
                        <HandoverDetail icon={MapPin}  value={ret.location} />
                        <HandoverDetail icon={Clock}   value={ret.dateTime.replace('T', ' ')} />
                        <HandoverDetail icon={Gauge}   value={`${ret.mileage.toLocaleString()} km`} />
                        <HandoverDetail icon={Fuel}    value={ret.fuelLevel}
                          className={FUEL_COLOR[ret.fuelLevel as FuelLevel] ?? ''} />
                        {(ret.extraKm ?? 0) > 0 && (
                          <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-2">
                            <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
                            <p className="text-xs text-amber-700">
                              +{ret.extraKm} km · Rs {ret.extraKmCharge?.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {ret.finalAmount && (
                          <div className="mt-2 pt-2 border-t border-blue-100 flex justify-between">
                            <span className="text-xs text-blue-600">Final Amount</span>
                            <span className="text-xs font-bold text-blue-800">Rs {ret.finalAmount.toLocaleString()}</span>
                          </div>
                        )}
                        {ret.notes && <HandoverDetail icon={FileText} value={ret.notes} />}
                      </div>
                    ) : delivery ? (
                      <div>
                        <p className="text-xs text-navy-400 mb-3">Awaiting customer return</p>
                        {(isAdmin() || can('canBook')) && (
                          <button
                            onClick={() => openReturn(b)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                          >
                            <RotateCcw size={13} />
                            Record Return
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-navy-300">Record delivery first</p>
                    )}
                  </div>
                </div>

                {/* Amount footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-navy-50 text-xs">
                  <div className="flex gap-4">
                    <span className="text-navy-400">Total: <span className="font-semibold text-navy-700">Rs {b.totalAmount.toLocaleString()}</span></span>
                    <span className="text-navy-400">Paid: <span className="font-semibold text-emerald-700">Rs {b.paidAmount.toLocaleString()}</span></span>
                    {balance > 0 && <span className="text-red-600">Balance: <span className="font-semibold">Rs {balance.toLocaleString()}</span></span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── All Records ── */}
      {tab === 'records' && (
        <div className="space-y-3">
          {allRecords.length === 0 && (
            <div className="card text-center py-16 text-navy-400 text-sm">No handover records yet.</div>
          )}
          {allRecords.map((h) => {
            const booking = bookings.find((b) => b.id === h.bookingId);
            const vehicle = vehicles.find((v) => v.id === h.vehicleId);
            return (
              <div
                key={h.id}
                className="card hover:shadow-card-hover transition-shadow cursor-pointer"
                onClick={() => { setViewItem(h); setModal('view'); }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    h.type === 'delivery' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {h.type === 'delivery' ? <Truck size={18} /> : <RotateCcw size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-navy-800 truncate">
                        {booking?.customerName ?? '—'}
                      </p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${
                        h.type === 'delivery' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {h.type}
                      </span>
                    </div>
                    <p className="text-xs text-navy-400 truncate">
                      {vehicle?.brand} {vehicle?.model} · {vehicle?.vehicleNumber}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-navy-700">{h.location}</p>
                    <p className="text-xs text-navy-400">{h.dateTime.replace('T', ' ')}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs font-bold text-navy-700">{h.mileage.toLocaleString()} km</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${FUEL_COLOR[h.fuelLevel as FuelLevel] ?? 'bg-navy-50 text-navy-500'}`}>
                      {h.fuelLevel}
                    </span>
                  </div>
                </div>

                {h.type === 'return' && (h.extraKm ?? 0) > 0 && (
                  <div className="mt-3 flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2">
                    <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
                    <span className="text-xs text-amber-700">
                      +{h.extraKm} extra km · Rs {h.extraKmCharge?.toLocaleString()} charge ·
                      Final: <span className="font-bold">Rs {h.finalAmount?.toLocaleString()}</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Delivery Modal ── */}
      <Modal open={modal === 'delivery'} onClose={() => setModal(null)} title="Record Vehicle Delivery">
        {(() => {
          const booking = bookings.find((b) => b.id === form.bookingId);
          const vehicle = vehicles.find((v) => v.id === form.vehicleId);
          return (
            <div className="space-y-5">
              {/* Booking info banner */}
              <div className="bg-navy-50/80 rounded-xl p-4 flex items-center gap-3">
                <Truck size={18} className="text-navy-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-navy-800">{booking?.customerName}</p>
                  <p className="text-xs text-navy-500">
                    {vehicle?.brand} {vehicle?.model} · {vehicle?.vehicleNumber} · {booking?.startDate} → {booking?.endDate}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="label">Handover Location *</p>
                  <div className="relative">
                    <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
                    <input className="input pl-8" value={form.location}
                      onChange={(e) => set('location', e.target.value)}
                      placeholder="e.g. Colombo 03, Galle Road" />
                  </div>
                </div>
                <div>
                  <p className="label">Date & Time *</p>
                  <input className="input" type="datetime-local" value={form.dateTime}
                    onChange={(e) => set('dateTime', e.target.value)} />
                </div>
                <div>
                  <p className="label">Odometer Reading (km) *</p>
                  <div className="relative">
                    <Gauge size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
                    <input className="input pl-8" type="number" value={form.mileage || ''}
                      onChange={(e) => set('mileage', +e.target.value)} placeholder="85000" />
                  </div>
                </div>
                <div>
                  <p className="label">Fuel Level</p>
                  <select className="input" value={form.fuelLevel}
                    onChange={(e) => set('fuelLevel', e.target.value)}>
                    {FUEL_LEVELS.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <p className="label">Condition / Notes</p>
                  <input className="input" value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder="Any scratches, remarks..." />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
                <button
                  onClick={handleSaveDelivery}
                  disabled={!form.location || !form.dateTime || !form.mileage}
                  className="flex items-center gap-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Truck size={14} />
                  Save Delivery
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Return Modal ── */}
      <Modal open={modal === 'return'} onClose={() => setModal(null)} title="Record Vehicle Return">
        {(() => {
          const booking  = bookings.find((b) => b.id === form.bookingId);
          const vehicle  = vehicles.find((v) => v.id === form.vehicleId);
          const delivery = handovers.find((h) => h.bookingId === form.bookingId && h.type === 'delivery');

          return (
            <div className="space-y-5">
              {/* Booking info banner */}
              <div className="bg-navy-50/80 rounded-xl p-4 flex items-center gap-3">
                <RotateCcw size={18} className="text-navy-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-navy-800">{booking?.customerName}</p>
                  <p className="text-xs text-navy-500">
                    {vehicle?.brand} {vehicle?.model} · {vehicle?.vehicleNumber} · {booking?.startDate} → {booking?.endDate}
                  </p>
                </div>
              </div>

              {/* Delivery reference */}
              {delivery && (
                <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                  <p className="text-xs text-emerald-700">
                    Delivered at <span className="font-semibold">{delivery.mileage.toLocaleString()} km</span> from {delivery.location}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="label">Return Location *</p>
                  <div className="relative">
                    <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
                    <input className="input pl-8" value={form.location}
                      onChange={(e) => setReturn('location', e.target.value)}
                      placeholder="e.g. Kandy, Temple Road" />
                  </div>
                </div>
                <div>
                  <p className="label">Date & Time *</p>
                  <input className="input" type="datetime-local" value={form.dateTime}
                    onChange={(e) => setReturn('dateTime', e.target.value)} />
                </div>
                <div>
                  <p className="label">Odometer Reading (km) *</p>
                  <div className="relative">
                    <Gauge size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
                    <input className="input pl-8" type="number" value={form.mileage || ''}
                      onChange={(e) => setReturn('mileage', +e.target.value)} placeholder="86500" />
                  </div>
                </div>
                <div>
                  <p className="label">Fuel Level at Return</p>
                  <select className="input" value={form.fuelLevel}
                    onChange={(e) => setReturn('fuelLevel', e.target.value)}>
                    {FUEL_LEVELS.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <p className="label">Condition / Notes</p>
                  <input className="input" value={form.notes}
                    onChange={(e) => setReturn('notes', e.target.value)}
                    placeholder="Any damage, remarks..." />
                </div>
              </div>

              {/* Extra km + final amount */}
              {form.mileage > 0 && delivery && (
                <div className="bg-navy-50/80 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-navy-600 uppercase tracking-wide mb-3">Trip Summary</p>
                  <div className="flex justify-between text-xs text-navy-600">
                    <span>Odometer at delivery</span>
                    <span className="font-semibold">{delivery.mileage.toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between text-xs text-navy-600">
                    <span>Odometer at return</span>
                    <span className="font-semibold">{form.mileage.toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between text-xs text-navy-600 border-t border-navy-100 pt-2">
                    <span>Total km driven</span>
                    <span className="font-bold text-navy-800">{(form.mileage - delivery.mileage).toLocaleString()} km</span>
                  </div>
                  {(form.extraKm ?? 0) > 0 ? (
                    <>
                      <div className="flex justify-between text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                        <span>Extra km (+{form.extraKm} × Rs {vehicle?.extraKmRate ?? 50}/km)</span>
                        <span className="font-bold">Rs {form.extraKmCharge?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-navy-800 font-bold border-t border-navy-100 pt-2">
                        <span>Final Amount</span>
                        <span className="text-navy-700">Rs {form.finalAmount?.toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5">
                      <CheckCircle2 size={12} />
                      Within included km — no extra charge
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
                <button
                  onClick={handleSaveReturn}
                  disabled={!form.location || !form.dateTime || !form.mileage}
                  className="flex items-center gap-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={14} />
                  Complete Return
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── View Record Modal ── */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title="Handover Record">
        {viewItem && (() => {
          const booking = bookings.find((b) => b.id === viewItem.bookingId);
          const vehicle = vehicles.find((v) => v.id === viewItem.vehicleId);
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  viewItem.type === 'delivery' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {viewItem.type === 'delivery' ? <Truck size={20} /> : <RotateCcw size={20} />}
                </div>
                <div>
                  <p className="text-base font-bold text-navy-800 capitalize">{viewItem.type} Record</p>
                  <p className="text-xs text-navy-400">{booking?.customerName} · {vehicle?.brand} {vehicle?.model}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Location',  viewItem.location],
                  ['Date/Time', viewItem.dateTime.replace('T', ' ')],
                  ['Odometer',  `${viewItem.mileage.toLocaleString()} km`],
                  ['Fuel Level',viewItem.fuelLevel],
                ].map(([l, v]) => (
                  <div key={l} className="bg-navy-50/60 rounded-xl p-3">
                    <p className="text-xs text-navy-400">{l}</p>
                    <p className="text-sm font-semibold text-navy-800">{v}</p>
                  </div>
                ))}
              </div>

              {viewItem.notes && (
                <div className="bg-navy-50/60 rounded-xl p-3">
                  <p className="text-xs text-navy-400">Notes</p>
                  <p className="text-sm text-navy-700">{viewItem.notes}</p>
                </div>
              )}

              {viewItem.type === 'return' && (viewItem.extraKm ?? 0) > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Extra Charges</p>
                  <div className="flex justify-between text-xs text-amber-700">
                    <span>Extra km</span><span className="font-bold">+{viewItem.extraKm} km</span>
                  </div>
                  <div className="flex justify-between text-xs text-amber-700">
                    <span>Extra km charge</span><span className="font-bold">Rs {viewItem.extraKmCharge?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-amber-800 border-t border-amber-200 pt-2">
                    <span>Final Amount</span><span>Rs {viewItem.finalAmount?.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <button onClick={() => setModal(null)} className="btn-primary w-full">Close</button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

/* Small helpers */
function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-navy-50/60 rounded-xl p-2.5">
      <p className="text-[10px] text-navy-400 uppercase tracking-wide">{label}</p>
      <p className="text-xs font-semibold text-navy-800 mt-0.5 truncate">{value}</p>
    </div>
  );
}

function HandoverDetail({
  icon: Icon, value, className = '',
}: {
  icon: React.ElementType; value: string; className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1 ${className || 'text-navy-600'}`}>
      <Icon size={11} className="flex-shrink-0 opacity-70" />
      <span className="truncate">{value}</span>
    </div>
  );
}
