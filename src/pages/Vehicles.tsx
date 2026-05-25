import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import VehicleImage from '../components/ui/VehicleImage';
import { vehicleBodyColor } from '../components/ui/CarSVG';
import { Plus, Car, Pencil, Trash2, Shield, CalendarDays, Wrench, TrendingUp, Hash } from 'lucide-react';
import { Vehicle, VehicleStatus } from '../types';

const STATUS_OPTIONS: VehicleStatus[] = ['Available', 'Reserved', 'Ongoing', 'Maintenance'];
const FUEL_TYPES    = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG'];
const TRANSMISSIONS = ['Manual', 'Automatic', 'CVT', 'Semi-Automatic'];

const empty = (): Omit<Vehicle, 'id' | 'createdAt' | 'revenue' | 'rentCount'> => ({
  vehicleNumber: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  ownerId: '',
  dailyRent: 0,
  extraKmRate: 50,
  includedKmPerDay: 100,
  status: 'Available',
  color: '',
  seats: 5,
  fuelType: 'Petrol',
  transmission: 'Manual',
  mileage: 0,
  insurance: { provider: '', policyNumber: '', expiryDate: '', premium: 0 },
});

export default function Vehicles() {
  const { vehicles, owners, bookings, expenses, addVehicle, updateVehicle, deleteVehicle } = useStore();
  const { currentUser, can, isAdmin } = useAuthStore();

  const [filter,   setFilter]   = useState<VehicleStatus | 'All'>('All');
  const [modal,    setModal]    = useState<'add' | 'edit' | 'view' | null>(null);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [form,     setForm]     = useState(empty());

  const isOwnerRole = !isAdmin() && currentUser?.role === 'owner';
  const canActOn    = (v: Vehicle) => isAdmin() || v.ownerId === currentUser?.ownerId;

  const filtered = filter === 'All' ? vehicles : vehicles.filter((v) => v.status === filter);

  // For owner role: split into mine vs others
  const myFiltered     = isOwnerRole ? filtered.filter((v) => v.ownerId === currentUser?.ownerId) : filtered;
  const othersFiltered = isOwnerRole ? filtered.filter((v) => v.ownerId !== currentUser?.ownerId) : [];

  const openAdd = () => { setForm(empty()); setModal('add'); };
  const openEdit = (v: Vehicle) => { setSelected(v); setForm({ ...v }); setModal('edit'); };
  const openView = (v: Vehicle, allowView = true) => {
    if (!allowView) return;
    setSelected(v);
    setModal('view');
  };

  const handleSave = () => {
    if (modal === 'add') addVehicle(form);
    else if (modal === 'edit' && selected) updateVehicle(selected.id, form);
    setModal(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this vehicle?')) deleteVehicle(id);
  };

  const set    = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));
  const setIns = (field: string, value: unknown) =>
    setForm((f) => ({ ...f, insurance: { ...f.insurance, [field]: value } }));

  const renderCard = (v: Vehicle, clickable = true) => {
    const owner         = owners.find((o) => o.id === v.ownerId);
    const activeBooking = bookings.find((b) => b.vehicleId === v.id && (b.status === 'Confirmed' || b.status === 'Ongoing'));
    const mainExp       = expenses.find((e) => e.vehicleId === v.id);
    const mine          = canActOn(v);

    return (
      <div
        key={v.id}
        className={`card transition-shadow ${clickable ? 'hover:shadow-card-hover cursor-pointer' : 'cursor-default opacity-80'}`}
        onClick={() => clickable && openView(v)}
      >
        {/* Vehicle image */}
        <div className="w-full h-32 rounded-xl overflow-hidden bg-navy-50 mb-3 relative">
          <VehicleImage brand={v.brand} model={v.model} color={v.color}
            bodyColor={vehicleBodyColor(v.color ?? '')} className="w-full h-full object-cover" />
          <div className="absolute top-2 right-2">
            <StatusBadge status={v.status} />
          </div>
          {!mine && (
            <div className="absolute top-2 left-2">
              <span className="text-[10px] bg-navy-700/70 text-white px-2 py-0.5 rounded-full">View only</span>
            </div>
          )}
        </div>

        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
              <Car size={16} className="text-navy-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy-800 truncate">{v.brand} {v.model}</p>
              <p className="text-xs text-navy-400">{v.vehicleNumber} · {v.year}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-2 text-xs mb-3">
          <div>
            <p className="text-navy-400">Owner</p>
            <p className="font-medium text-navy-700">{owner?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-navy-400">Daily Rent</p>
            <p className="font-medium text-navy-700">Rs {v.dailyRent.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-navy-400">Fuel</p>
            <p className="font-medium text-navy-700">{v.fuelType ?? '—'}</p>
          </div>
          <div>
            <p className="text-navy-400">Transmission</p>
            <p className="font-medium text-navy-700">{v.transmission ?? '—'}</p>
          </div>
        </div>

        {/* Status context strips */}
        {v.status === 'Reserved' && activeBooking && (
          <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2 mb-3">
            <CalendarDays size={13} className="text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-700 truncate">{activeBooking.customerName}</p>
              <p className="text-[10px] text-blue-500">{activeBooking.startDate} → {activeBooking.endDate}</p>
            </div>
          </div>
        )}
        {v.status === 'Ongoing' && activeBooking && (
          <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-2 mb-3">
            <TrendingUp size={13} className="text-emerald-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-700 truncate">{activeBooking.customerName}</p>
              <p className="text-[10px] text-emerald-500">Ongoing since {activeBooking.startDate}</p>
            </div>
          </div>
        )}
        {v.status === 'Maintenance' && mainExp && (
          <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2 mb-3">
            <Wrench size={13} className="text-red-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-600 truncate">{mainExp.category} — {mainExp.description}</p>
              <p className="text-[10px] text-red-400">{mainExp.date}</p>
            </div>
          </div>
        )}

        {/* Footer: revenue + actions */}
        <div className="flex items-center justify-between border-t border-navy-50 pt-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-navy-400">Revenue</p>
              <p className="text-sm font-bold text-navy-700">Rs {v.revenue.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1 text-navy-400">
              <Hash size={11} />
              <span className="text-xs font-semibold text-navy-500">{v.rentCount ?? 0} rentals</span>
            </div>
          </div>
          {mine && (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              {can('canEditVehicle') && (
                <button
                  onClick={() => openEdit(v)}
                  className="w-8 h-8 rounded-lg hover:bg-navy-50 flex items-center justify-center text-navy-400 hover:text-navy-700 transition-colors"
                >
                  <Pencil size={14} />
                </button>
              )}
              {isAdmin() && (
                <button
                  onClick={() => handleDelete(v.id)}
                  className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-navy-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const SectionLabel = ({ children, count }: { children: string; count: number }) => (
    <div className="flex items-center gap-3 mb-4 mt-2">
      <p className="text-xs font-semibold text-navy-500 uppercase tracking-widest">{children}</p>
      <span className="text-xs bg-navy-100 text-navy-500 px-2 py-0.5 rounded-full font-medium">{count}</span>
      <div className="flex-1 h-px bg-navy-100" />
    </div>
  );

  return (
    <div>
      <Header title="Vehicles" subtitle={`${vehicles.length} vehicles in your fleet`} />

      {/* Filter tabs + Add */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(['All', ...STATUS_OPTIONS] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex-shrink-0 ${
                filter === s ? 'bg-navy-700 text-white' : 'bg-white text-navy-500 hover:bg-navy-50 shadow-card'
              }`}
            >
              {s}
              {s !== 'All' && (
                <span className="ml-1.5 opacity-70">{vehicles.filter((v) => v.status === s).length}</span>
              )}
            </button>
          ))}
        </div>
        {(isAdmin() || can('canEditVehicle')) && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 flex-shrink-0">
            <Plus size={15} /> Add Vehicle
          </button>
        )}
      </div>

      {/* Grid — owner sees own vehicles first, then others */}
      {isOwnerRole ? (
        <>
          <SectionLabel count={myFiltered.length}>My Vehicles</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {myFiltered.length > 0
              ? myFiltered.map((v) => renderCard(v, true))
              : <div className="col-span-3 text-center py-10 text-navy-400 text-sm">No vehicles under your ownership.</div>
            }
          </div>

          {othersFiltered.length > 0 && (
            <>
              <SectionLabel count={othersFiltered.length}>Other Fleet Vehicles</SectionLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {othersFiltered.map((v) => renderCard(v, false))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((v) => renderCard(v, true))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-navy-400 text-sm">No vehicles found.</div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add New Vehicle' : 'Edit Vehicle'}
        width="max-w-2xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Vehicle Number">
            <input className="input" value={form.vehicleNumber} onChange={(e) => set('vehicleNumber', e.target.value)} placeholder="CAB-1234" />
          </Field>
          <Field label="Brand">
            <input className="input" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Toyota" />
          </Field>
          <Field label="Model">
            <input className="input" value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="Prius" />
          </Field>
          <Field label="Year">
            <input className="input" type="number" value={form.year} onChange={(e) => set('year', +e.target.value)} />
          </Field>
          <Field label="Owner">
            <select className="input" value={form.ownerId} onChange={(e) => set('ownerId', e.target.value)}>
              <option value="">Select owner</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Daily Rent (Rs)">
            <input className="input" type="number" value={form.dailyRent} onChange={(e) => set('dailyRent', +e.target.value)} />
          </Field>
          <Field label="Included km / day">
            <input className="input" type="number" value={form.includedKmPerDay ?? 100} onChange={(e) => set('includedKmPerDay', +e.target.value)} placeholder="100" />
          </Field>
          <Field label="Extra km rate (Rs/km)">
            <input className="input" type="number" value={form.extraKmRate ?? 50} onChange={(e) => set('extraKmRate', +e.target.value)} placeholder="50" />
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as VehicleStatus)}>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Color">
            <input className="input" value={form.color ?? ''} onChange={(e) => set('color', e.target.value)} placeholder="Silver" />
          </Field>
          <Field label="Fuel Type">
            <select className="input" value={form.fuelType ?? ''} onChange={(e) => set('fuelType', e.target.value)}>
              {FUEL_TYPES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Transmission">
            <select className="input" value={form.transmission ?? ''} onChange={(e) => set('transmission', e.target.value)}>
              {TRANSMISSIONS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Seats">
            <input className="input" type="number" value={form.seats ?? 5} onChange={(e) => set('seats', +e.target.value)} />
          </Field>
          <Field label="Mileage (km)">
            <input className="input" type="number" value={form.mileage ?? 0} onChange={(e) => set('mileage', +e.target.value)} />
          </Field>

          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3 mt-1">
              <Shield size={14} className="text-navy-400" />
              <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide">Insurance Details</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Provider">
                <input className="input" value={form.insurance.provider} onChange={(e) => setIns('provider', e.target.value)} />
              </Field>
              <Field label="Policy Number">
                <input className="input" value={form.insurance.policyNumber} onChange={(e) => setIns('policyNumber', e.target.value)} />
              </Field>
              <Field label="Expiry Date">
                <input className="input" type="date" value={form.insurance.expiryDate} onChange={(e) => setIns('expiryDate', e.target.value)} />
              </Field>
              <Field label="Premium (Rs)">
                <input className="input" type="number" value={form.insurance.premium} onChange={(e) => setIns('premium', +e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary">
            {modal === 'add' ? 'Add Vehicle' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title="Vehicle Details" width="max-w-lg">
        {selected && (() => {
          const owner = owners.find((o) => o.id === selected.ownerId);
          return (
            <div className="space-y-4">
              <div className="w-full h-40 rounded-xl overflow-hidden bg-navy-50">
                <VehicleImage brand={selected.brand} model={selected.model} color={selected.color}
                  bodyColor={vehicleBodyColor(selected.color ?? '')} className="w-full h-full object-cover" />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-navy-800">{selected.brand} {selected.model}</h3>
                  <p className="text-sm text-navy-400">{selected.vehicleNumber} · {selected.year}</p>
                </div>
                <StatusBadge status={selected.status} size="md" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Owner',         owner?.name ?? '—'],
                  ['Daily Rent',    `Rs ${selected.dailyRent.toLocaleString()}`],
                  ['Included km',   `${selected.includedKmPerDay ?? 100} km/day`],
                  ['Extra km rate', `Rs ${selected.extraKmRate ?? 50}/km`],
                  ['Color',         selected.color ?? '—'],
                  ['Fuel',          selected.fuelType ?? '—'],
                  ['Transmission',  selected.transmission ?? '—'],
                  ['Seats',         selected.seats ?? '—'],
                  ['Mileage',       selected.mileage ? `${selected.mileage.toLocaleString()} km` : '—'],
                  ['Revenue',       `Rs ${selected.revenue.toLocaleString()}`],
                  ['Total Rentals', selected.rentCount ?? 0],
                ].map(([label, val]) => (
                  <div key={String(label)} className="bg-navy-50/60 rounded-xl p-3">
                    <p className="text-xs text-navy-400">{label}</p>
                    <p className="text-sm font-semibold text-navy-800 mt-0.5">{val}</p>
                  </div>
                ))}
              </div>

              <div className="bg-navy-50/60 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={14} className="text-navy-400" />
                  <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide">Insurance</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-xs text-navy-400">Provider</p><p className="font-medium text-navy-700">{selected.insurance.provider || '—'}</p></div>
                  <div><p className="text-xs text-navy-400">Policy #</p><p className="font-medium text-navy-700">{selected.insurance.policyNumber || '—'}</p></div>
                  <div><p className="text-xs text-navy-400">Expiry</p><p className="font-medium text-navy-700">{selected.insurance.expiryDate || '—'}</p></div>
                  <div><p className="text-xs text-navy-400">Premium</p><p className="font-medium text-navy-700">Rs {selected.insurance.premium.toLocaleString()}</p></div>
                </div>
              </div>

              <div className="flex gap-3">
                {canActOn(selected) && can('canEditVehicle') && (
                  <button onClick={() => { setModal(null); openEdit(selected); }} className="btn-secondary flex-1">Edit</button>
                )}
                <button onClick={() => setModal(null)} className="btn-primary flex-1">Close</button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label">{label}</p>
      {children}
    </div>
  );
}
