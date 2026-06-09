import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import {
  Plus, Search, User, Phone, Mail, MapPin, CreditCard,
  ChevronDown, Edit2, Trash2, CalendarDays, Car, AlertTriangle,
} from 'lucide-react';
import { Customer } from '../types';

const emptyForm = (): Omit<Customer, 'id' | 'createdAt'> => ({
  name: '',
  phone: '',
  email: '',
  nic: '',
  address: '',
  notes: '',
});

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500',  'bg-cyan-500',   'bg-indigo-500',  'bg-teal-500',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Customers() {
  const { customers, bookings, vehicles, addCustomer, updateCustomer, deleteCustomer } = useStore();

  const [search,     setSearch]     = useState('');
  const [modal,      setModal]      = useState<'add' | 'edit' | 'delete' | null>(null);
  const [selected,   setSelected]   = useState<Customer | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form,       setForm]       = useState(emptyForm());
  const [error,      setError]      = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...customers]
      .filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.nic ?? '').toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [customers, search]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const openAdd = () => {
    setForm(emptyForm());
    setError('');
    setModal('add');
  };

  const openEdit = (c: Customer) => {
    setSelected(c);
    setForm({ name: c.name, phone: c.phone, email: c.email ?? '', nic: c.nic ?? '', address: c.address ?? '', notes: c.notes ?? '' });
    setError('');
    setModal('edit');
  };

  const openDelete = (c: Customer) => {
    setSelected(c);
    setModal('delete');
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required.');
      return;
    }
    // Prevent duplicate phone
    const duplicate = customers.find(
      (c) => c.phone === form.phone.trim() && c.id !== selected?.id
    );
    if (duplicate) {
      setError('A customer with this phone number already exists.');
      return;
    }
    if (modal === 'add') {
      addCustomer({ ...form, name: form.name.trim(), phone: form.phone.trim() });
    } else if (modal === 'edit' && selected) {
      updateCustomer(selected.id, { ...form, name: form.name.trim(), phone: form.phone.trim() });
    }
    setModal(null);
  };

  const handleDelete = () => {
    if (selected) deleteCustomer(selected.id);
    setModal(null);
    setSelected(null);
  };

  // Match bookings by phone number
  const getHistory = (c: Customer) =>
    bookings
      .filter((b) => b.customerPhone === c.phone)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalSpend = (c: Customer) =>
    getHistory(c).reduce((sum, b) => sum + b.paidAmount, 0);

  // Summary stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) =>
    bookings.some((b) => b.customerPhone === c.phone && (b.status === 'Confirmed' || b.status === 'Ongoing'))
  ).length;
  const totalRevenue = customers.reduce((sum, c) => sum + totalSpend(c), 0);

  return (
    <div>
      <Header title="Customers" subtitle="Manage customer profiles and rental history" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center py-4">
          <p className="text-2xl font-black text-navy-800">{totalCustomers}</p>
          <p className="text-xs text-navy-400 mt-0.5">Total Customers</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-black text-emerald-600">{activeCustomers}</p>
          <p className="text-xs text-navy-400 mt-0.5">Active Renters</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-black text-navy-800">Rs {totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-navy-400 mt-0.5">Total Revenue</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            className="input pl-9"
            placeholder="Search by name, phone, email or NIC…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Plus size={15} /> Add Customer
        </button>
      </div>

      {/* Customer list */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16 text-navy-400 text-sm">
          {search ? 'No customers match your search.' : 'No customers yet. Click "Add Customer" to get started.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const history  = getHistory(c);
            const spend    = totalSpend(c);
            const expanded = expandedId === c.id;

            return (
              <div key={c.id} className="card overflow-hidden transition-shadow hover:shadow-card-hover">
                {/* ── Customer row ── */}
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${avatarColor(c.name)}`}>
                    {initials(c.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-navy-800">{c.name}</p>
                      {history.some((b) => b.status === 'Confirmed' || b.status === 'Ongoing') && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      <span className="flex items-center gap-1 text-xs text-navy-400">
                        <Phone size={10} /> {c.phone}
                      </span>
                      {c.email && (
                        <span className="flex items-center gap-1 text-xs text-navy-400">
                          <Mail size={10} /> {c.email}
                        </span>
                      )}
                      {c.nic && (
                        <span className="flex items-center gap-1 text-xs text-navy-400">
                          <CreditCard size={10} /> {c.nic}
                        </span>
                      )}
                      {c.address && (
                        <span className="flex items-center gap-1 text-xs text-navy-400">
                          <MapPin size={10} /> {c.address}
                        </span>
                      )}
                    </div>

                    {c.notes && (
                      <p className="text-xs text-navy-400 mt-1 truncate italic">{c.notes}</p>
                    )}
                  </div>

                  {/* Right side — stats + actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-400 hover:bg-navy-50 hover:text-navy-700 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => openDelete(c)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xs font-bold text-navy-800">{history.length} booking{history.length !== 1 ? 's' : ''}</p>
                        <p className="text-[10px] text-navy-400">Rs {spend.toLocaleString()} paid</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Accordion toggle ── */}
                <button
                  onClick={() => setExpandedId(expanded ? null : c.id)}
                  className="flex items-center gap-2 mt-3 pt-3 border-t border-navy-50 w-full text-left group"
                >
                  <CalendarDays size={13} className="text-navy-400" />
                  <span className="text-xs font-semibold text-navy-500 group-hover:text-navy-700 transition-colors flex-1">
                    Rental History
                    {history.length > 0 && (
                      <span className="ml-1.5 text-navy-400 font-normal">({history.length})</span>
                    )}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-navy-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* ── Accordion content ── */}
                {expanded && (
                  <div className="mt-2">
                    {history.length === 0 ? (
                      <div className="text-center py-6 text-xs text-navy-400">
                        No rental history found for this customer.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {history.map((b) => {
                          const vehicle = vehicles.find((v) => v.id === b.vehicleId);
                          const balance = b.totalAmount - b.paidAmount;
                          return (
                            <div
                              key={b.id}
                              className="flex items-center gap-3 bg-navy-50/60 rounded-xl px-3 py-2.5"
                            >
                              {/* Vehicle icon */}
                              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Car size={14} className="text-navy-500" />
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-navy-800 truncate">
                                  {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Unknown Vehicle'}
                                  {vehicle && (
                                    <span className="font-normal text-navy-400 ml-1">· {vehicle.vehicleNumber}</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-navy-400 mt-0.5">
                                  {b.startDate} → {b.endDate}
                                  <span className="mx-1">·</span>
                                  {b.totalDays}d
                                </p>
                              </div>

                              {/* Amount */}
                              <div className="text-right flex-shrink-0 mr-2">
                                <p className="text-xs font-bold text-navy-800">Rs {b.totalAmount.toLocaleString()}</p>
                                {balance > 0 ? (
                                  <p className="text-[10px] text-red-500">Bal: Rs {balance.toLocaleString()}</p>
                                ) : (
                                  <p className="text-[10px] text-emerald-600">Settled</p>
                                )}
                              </div>

                              {/* Status */}
                              <StatusBadge status={b.status} size="sm" />
                            </div>
                          );
                        })}

                        {/* History summary row */}
                        <div className="flex items-center justify-between px-3 py-2 border-t border-navy-100 mt-1">
                          <span className="text-xs text-navy-400">{history.length} rental{history.length !== 1 ? 's' : ''} total</span>
                          <span className="text-xs font-bold text-navy-700">
                            Rs {history.reduce((s, b) => s + b.totalAmount, 0).toLocaleString()} gross
                            <span className="font-normal text-navy-400 ml-1">
                              · Rs {spend.toLocaleString()} paid
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add Customer' : 'Edit Customer'}
      >
        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="label">Full Name *</p>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
              <input
                className="input pl-8"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Amila Jayasinghe"
              />
            </div>
          </div>
          <div>
            <p className="label">Phone *</p>
            <div className="relative">
              <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
              <input
                className="input pl-8"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="07X XXXXXXX"
              />
            </div>
          </div>
          <div>
            <p className="label">Email</p>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
              <input
                className="input pl-8"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="customer@email.com"
              />
            </div>
          </div>
          <div>
            <p className="label">NIC</p>
            <div className="relative">
              <CreditCard size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
              <input
                className="input pl-8"
                value={form.nic}
                onChange={(e) => set('nic', e.target.value)}
                placeholder="901234567V"
              />
            </div>
          </div>
          <div className="col-span-2">
            <p className="label">Address</p>
            <div className="relative">
              <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
              <input
                className="input pl-8"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="No. 12, Temple Road, Kandy"
              />
            </div>
          </div>
          <div className="col-span-2">
            <p className="label">Notes</p>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any notes about this customer…"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim() || !form.phone.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {modal === 'add' ? 'Save Customer' : 'Update Customer'}
          </button>
        </div>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Delete Customer">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-50 rounded-xl p-4">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Delete {selected.name}?</p>
                <p className="text-xs text-red-600 mt-1">
                  This removes the customer profile only. Their booking history will remain intact.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
