import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { Plus, Users, Car, Lock } from 'lucide-react';
import { Owner } from '../types';

const emptyOwner = (): Omit<Owner, 'id' | 'createdAt' | 'totalEarnings' | 'pendingPayout'> => ({
  name: '',
  phone: '',
  email: '',
  address: '',
  bankAccount: '',
  commissionRate: 15,
});

export default function Owners() {
  const { owners, vehicles, bookings, commissions, addOwner, updateOwner } = useStore();
  const { currentUser, isAdmin } = useAuthStore();

  const [modal, setModal]       = useState<'add' | 'edit' | 'view' | null>(null);
  const [selected, setSelected] = useState<Owner | null>(null);
  const [form, setForm]         = useState(emptyOwner());

  const isOwnerRole  = !isAdmin() && currentUser?.role === 'owner';
  const myOwnerId    = currentUser?.ownerId ?? '';

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (modal === 'add') addOwner(form);
    else if (modal === 'edit' && selected) updateOwner(selected.id, form);
    setModal(null);
  };

  const openView = (o: Owner) => { setSelected(o); setModal('view'); };
  const openEdit = (o: Owner) => { setSelected(o); setForm({ ...o }); setModal('edit'); };

  const OwnerCard = ({ o, clickable = true }: { o: Owner; clickable?: boolean }) => {
    const ownerVehicles = vehicles.filter((v) => v.ownerId === o.id);
    const ownerBookings = bookings.filter((b) => ownerVehicles.some((v) => v.id === b.vehicleId));
    const ownerRevenue  = ownerVehicles.reduce((s, v) => s + v.revenue, 0);
    const ownerComms    = commissions.filter((c) => c.ownerId === o.id);
    const pendingPayout = ownerComms.filter((c) => c.status === 'Pending').reduce((s, c) => s + c.ownerPayout, 0);
    const isMine        = o.id === myOwnerId;

    return (
      <div
        className={`card transition-shadow ${clickable ? 'hover:shadow-card-hover cursor-pointer' : 'cursor-default'}`}
        onClick={() => clickable && openView(o)}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${isMine ? 'bg-navy-700' : 'bg-navy-400'}`}>
            {o.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-navy-800 truncate">{o.name}</p>
            <p className="text-xs text-navy-400">{isMine || isAdmin() ? o.phone : '••••••••••'}</p>
            {(isMine || isAdmin()) && o.email && <p className="text-xs text-navy-400 truncate">{o.email}</p>}
          </div>
          <div className="flex-shrink-0">
            {isAdmin() || isMine ? (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {o.commissionRate}% commission
              </span>
            ) : (
              <Lock size={14} className="text-navy-300" />
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-navy-50/60 rounded-xl p-2.5 text-center">
            <p className="text-base font-bold text-navy-800">{ownerVehicles.length}</p>
            <p className="text-xs text-navy-400">Vehicles</p>
          </div>
          <div className="bg-navy-50/60 rounded-xl p-2.5 text-center">
            <p className="text-base font-bold text-navy-800">{ownerBookings.length}</p>
            <p className="text-xs text-navy-400">Bookings</p>
          </div>
          <div className="bg-navy-50/60 rounded-xl p-2.5 text-center">
            <p className="text-base font-bold text-navy-800">
              Rs {(ownerRevenue / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-navy-400">Revenue</p>
          </div>
        </div>

        {/* Vehicles list */}
        <div className="space-y-1.5 mb-3">
          {ownerVehicles.map((v) => (
            <div key={v.id} className="flex items-center gap-2">
              <Car size={12} className="text-navy-400 flex-shrink-0" />
              <span className="text-xs text-navy-600 flex-1 truncate">{v.brand} {v.model} · {v.vehicleNumber}</span>
              <StatusBadge status={v.status} />
            </div>
          ))}
        </div>

        {/* Pending payout */}
        {(isMine || isAdmin()) && pendingPayout > 0 && (
          <div className="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2 mt-2">
            <span className="text-xs text-amber-700">Pending payout</span>
            <span className="text-xs font-bold text-amber-700">Rs {pendingPayout.toLocaleString()}</span>
          </div>
        )}

        {/* Action button */}
        {(isAdmin() || isMine) && (
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(o); }}
            className="mt-3 w-full text-xs py-2 rounded-xl bg-navy-50 text-navy-600 hover:bg-navy-100 font-medium transition-colors"
          >
            Edit Profile
          </button>
        )}
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

  const myOwner    = owners.find((o) => o.id === myOwnerId);
  const otherOwners = owners.filter((o) => o.id !== myOwnerId);

  return (
    <div>
      <Header
        title="Owners"
        subtitle={isAdmin() ? 'Per-owner fleet, earnings, and payout summary' : 'Your profile and fleet co-owners'}
      />

      {isAdmin() && (
        <div className="flex justify-end mb-5">
          <button onClick={() => { setForm(emptyOwner()); setModal('add'); }} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> Add Owner
          </button>
        </div>
      )}

      {/* Owner role: "My Profile" then "Other Owners" */}
      {isOwnerRole ? (
        <>
          {myOwner && (
            <>
              <SectionLabel count={1}>My Profile</SectionLabel>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                <OwnerCard o={myOwner} clickable={true} />
              </div>
            </>
          )}

          {otherOwners.length > 0 && (
            <>
              <SectionLabel count={otherOwners.length}>Other Owners</SectionLabel>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {otherOwners.map((o) => (
                  <OwnerCard key={o.id} o={o} clickable={false} />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        /* Admin view: show all owners */
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {owners.map((o) => <OwnerCard key={o.id} o={o} clickable={true} />)}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add Owner' : 'Edit Profile'}
      >
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
            <p className="label">Email</p>
            <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="col-span-2">
            <p className="label">Address</p>
            <input className="input" value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div>
            <p className="label">Bank Account</p>
            <input className="input" value={form.bankAccount ?? ''} onChange={(e) => set('bankAccount', e.target.value)} />
          </div>
          {isAdmin() && (
            <div>
              <p className="label">Commission Rate (%)</p>
              <input className="input" type="number" min={0} max={100} value={form.commissionRate} onChange={(e) => set('commissionRate', +e.target.value)} />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary">{modal === 'add' ? 'Add Owner' : 'Save'}</button>
        </div>
      </Modal>

      {/* View Modal — only shown to admin or own profile */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title="Owner Details" width="max-w-lg">
        {selected && (isAdmin() || selected.id === myOwnerId) && (() => {
          const ownerVehicles = vehicles.filter((v) => v.ownerId === selected.id);
          const ownerComms    = commissions.filter((c) => c.ownerId === selected.id);
          const pendingPayout = ownerComms.filter((c) => c.status === 'Pending').reduce((s, c) => s + c.ownerPayout, 0);
          const totalPaid     = ownerComms.filter((c) => c.status === 'Paid').reduce((s, c) => s + c.ownerPayout, 0);

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-navy-700 flex items-center justify-center text-white font-bold text-lg">
                  {selected.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-lg font-bold text-navy-800">{selected.name}</p>
                  <p className="text-sm text-navy-400">{selected.phone} · {selected.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-navy-700 rounded-xl p-3 text-white text-center">
                  <p className="text-xs opacity-70">Paid Out</p>
                  <p className="text-base font-bold">Rs {(totalPaid / 1000).toFixed(0)}k</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-amber-600">Pending</p>
                  <p className="text-base font-bold text-amber-700">Rs {(pendingPayout / 1000).toFixed(0)}k</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-500">Vehicles</p>
                  <p className="text-base font-bold text-blue-700">{ownerVehicles.length}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="section-title">Vehicles</p>
                {ownerVehicles.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 bg-navy-50/60 rounded-xl p-3">
                    <Car size={16} className="text-navy-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-navy-800">{v.brand} {v.model}</p>
                      <p className="text-xs text-navy-400">{v.vehicleNumber} · Rs {v.dailyRent.toLocaleString()}/day</p>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>
                ))}
              </div>

              {selected.bankAccount && (
                <div className="bg-navy-50/60 rounded-xl p-3">
                  <p className="text-xs text-navy-400">Bank Account</p>
                  <p className="text-sm font-medium text-navy-800">{selected.bankAccount}</p>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
