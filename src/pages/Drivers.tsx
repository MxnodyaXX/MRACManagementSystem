import { useState } from 'react';
import { useStore } from '../store/useStore';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { Plus, UserCheck, Phone, CreditCard, AlertTriangle } from 'lucide-react';
import { Driver } from '../types';
import { differenceInDays, parseISO } from 'date-fns';

const emptyForm = (): Omit<Driver, 'id' | 'joinedAt' | 'totalEarnings'> => ({
  name: '',
  phone: '',
  licenseNumber: '',
  licenseExpiry: '',
  status: 'Available',
  dailyRate: 1500,
  nic: '',
  address: '',
});

export default function Drivers() {
  const { drivers, bookings, vehicles, addDriver, updateDriver } = useStore();
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Driver | null>(null);
  const [form, setForm] = useState(emptyForm());

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (modal === 'add') addDriver(form);
    else if (modal === 'edit' && selected) updateDriver(selected.id, form);
    setModal(null);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <Header title="Drivers" subtitle="Manage driver assignments and availability" />

      <div className="flex justify-end mb-5">
        <button onClick={() => { setForm(emptyForm()); setModal('add'); }} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Add Driver
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(['Available', 'On Duty', 'Off'] as const).map((s) => {
          const count = drivers.filter((d) => d.status === s).length;
          return (
            <div key={s} className="card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                s === 'Available' ? 'bg-emerald-50 text-emerald-600' :
                s === 'On Duty' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
              }`}>
                <UserCheck size={18} />
              </div>
              <div>
                <p className="text-xl font-bold text-navy-800">{count}</p>
                <p className="text-xs text-navy-400">{s}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Driver cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {drivers.map((d) => {
          const currentBooking = bookings.find((b) => b.id === d.currentBookingId);
          const currentVehicle = currentBooking
            ? vehicles.find((v) => v.id === currentBooking.vehicleId)
            : null;

          const daysToExpiry = d.licenseExpiry
            ? differenceInDays(parseISO(d.licenseExpiry), new Date())
            : 999;
          const licenseWarning = daysToExpiry < 60;

          return (
            <div key={d.id} className="card hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-navy-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {d.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-navy-800">{d.name}</p>
                    <p className="text-xs text-navy-400 flex items-center gap-1">
                      <Phone size={10} /> {d.phone}
                    </p>
                  </div>
                </div>
                <StatusBadge status={d.status} />
              </div>

              <div className="grid grid-cols-2 gap-y-2 text-xs mb-3">
                <div>
                  <p className="text-navy-400">License #</p>
                  <p className="font-medium text-navy-700">{d.licenseNumber}</p>
                </div>
                <div>
                  <p className="text-navy-400">Expiry</p>
                  <p className={`font-medium ${licenseWarning ? 'text-red-600' : 'text-navy-700'}`}>
                    {d.licenseExpiry || '—'}
                    {licenseWarning && <span className="ml-1">⚠</span>}
                  </p>
                </div>
                <div>
                  <p className="text-navy-400">Daily Rate</p>
                  <p className="font-medium text-navy-700">Rs {d.dailyRate.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-navy-400">Total Earned</p>
                  <p className="font-medium text-navy-700">Rs {d.totalEarnings.toLocaleString()}</p>
                </div>
              </div>

              {currentBooking && currentVehicle && (
                <div className="bg-blue-50 rounded-xl px-3 py-2 mb-3">
                  <p className="text-xs text-blue-500">Currently driving</p>
                  <p className="text-xs font-semibold text-blue-700">
                    {currentVehicle.brand} {currentVehicle.model} · {currentVehicle.vehicleNumber}
                  </p>
                  <p className="text-xs text-blue-400">for {currentBooking.customerName}</p>
                </div>
              )}

              {licenseWarning && (
                <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2 mb-3 text-xs text-red-600">
                  <AlertTriangle size={13} />
                  License expires in {daysToExpiry} days
                </div>
              )}

              <div className="flex gap-2">
                <select
                  className="input flex-1 text-xs py-1.5"
                  value={d.status}
                  onChange={(e) => updateDriver(d.id, { status: e.target.value as Driver['status'] })}
                >
                  <option>Available</option>
                  <option>On Duty</option>
                  <option>Off</option>
                </select>
                <button
                  onClick={() => { setSelected(d); setForm({ ...d }); setModal('edit'); }}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Edit
                </button>
              </div>
            </div>
          );
        })}
        {drivers.length === 0 && (
          <div className="col-span-3 text-center py-16 text-navy-400 text-sm">No drivers added yet.</div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Driver' : 'Edit Driver'}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="label">Full Name *</p>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <p className="label">Phone</p>
            <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div>
            <p className="label">NIC</p>
            <input className="input" value={form.nic ?? ''} onChange={(e) => set('nic', e.target.value)} />
          </div>
          <div>
            <p className="label">License Number *</p>
            <input className="input" value={form.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)} />
          </div>
          <div>
            <p className="label">License Expiry</p>
            <input className="input" type="date" value={form.licenseExpiry} onChange={(e) => set('licenseExpiry', e.target.value)} />
          </div>
          <div>
            <p className="label">Daily Rate (Rs)</p>
            <input className="input" type="number" value={form.dailyRate} onChange={(e) => set('dailyRate', +e.target.value)} />
          </div>
          <div>
            <p className="label">Status</p>
            <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option>Available</option>
              <option>On Duty</option>
              <option>Off</option>
            </select>
          </div>
          <div className="col-span-2">
            <p className="label">Address</p>
            <input className="input" value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary">{modal === 'add' ? 'Add Driver' : 'Save'}</button>
        </div>
      </Modal>
    </div>
  );
}
