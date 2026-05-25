import { useState } from 'react';
import { useStore } from '../store/useStore';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { Plus, MessageSquare } from 'lucide-react';
import { Inquiry } from '../types';

type IStatus = 'Pending' | 'Converted' | 'Lost';
const TABS: ('All' | IStatus)[] = ['All', 'Pending', 'Converted', 'Lost'];

const emptyForm = (): Omit<Inquiry, 'id' | 'createdAt'> => ({
  customerName: '',
  customerPhone: '',
  requestedVehicle: '',
  preferredBrand: '',
  startDate: '',
  endDate: '',
  leadBy: '',
  status: 'Pending',
  notes: '',
});

export default function Inquiries() {
  const { inquiries, addInquiry, updateInquiry } = useStore();
  const [tab, setTab] = useState<'All' | IStatus>('All');
  const [modal, setModal] = useState<'add' | 'view' | null>(null);
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [form, setForm] = useState(emptyForm());

  const filtered = tab === 'All' ? inquiries : inquiries.filter((i) => i.status === tab);
  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = () => {
    addInquiry(form);
    setModal(null);
    setForm(emptyForm());
  };

  const changeStatus = (id: string, status: IStatus) => {
    updateInquiry(id, { status });
    if (selected?.id === id) setSelected((s) => s ? { ...s, status } : s);
  };

  return (
    <div>
      <Header title="Inquiries" subtitle="Track every customer inquiry and lead" />

      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex-shrink-0 ${
                tab === t ? 'bg-navy-700 text-white' : 'bg-white text-navy-500 hover:bg-navy-50 shadow-card'
              }`}
            >
              {t}
              {t !== 'All' && <span className="ml-1.5 opacity-70">{inquiries.filter((i) => i.status === t).length}</span>}
            </button>
          ))}
        </div>
        <button onClick={() => { setForm(emptyForm()); setModal('add'); }} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Plus size={15} /> Add Inquiry
        </button>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((inq) => (
          <div
            key={inq.id}
            className="card hover:shadow-card-hover transition-shadow cursor-pointer"
            onClick={() => { setSelected(inq); setModal('view'); }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center">
                  <MessageSquare size={16} className="text-navy-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-800">{inq.customerName}</p>
                  <p className="text-xs text-navy-400">{inq.customerPhone}</p>
                </div>
              </div>
              <StatusBadge status={inq.status} />
            </div>

            <div className="grid grid-cols-2 gap-y-2 text-xs mb-3">
              <div>
                <p className="text-navy-400">Requested</p>
                <p className="font-medium text-navy-700">{inq.requestedVehicle}</p>
              </div>
              <div>
                <p className="text-navy-400">Lead By</p>
                <p className="font-medium text-navy-700">{inq.leadBy || '—'}</p>
              </div>
              <div>
                <p className="text-navy-400">From</p>
                <p className="font-medium text-navy-700">{inq.startDate || '—'}</p>
              </div>
              <div>
                <p className="text-navy-400">To</p>
                <p className="font-medium text-navy-700">{inq.endDate || '—'}</p>
              </div>
            </div>

            {inq.notes && (
              <p className="text-xs text-navy-400 bg-navy-50/60 rounded-lg px-3 py-2 mb-3 truncate">{inq.notes}</p>
            )}

            {/* Quick status actions */}
            {inq.status === 'Pending' && (
              <div className="flex gap-2 border-t border-navy-50 pt-3" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => changeStatus(inq.id, 'Converted')}
                  className="flex-1 text-xs py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
                >
                  ✓ Convert
                </button>
                <button
                  onClick={() => changeStatus(inq.id, 'Lost')}
                  className="flex-1 text-xs py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors"
                >
                  ✕ Mark Lost
                </button>
              </div>
            )}
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="col-span-3 text-center py-16 text-navy-400 text-sm">No inquiries found.</div>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Add Inquiry">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="label">Customer Name *</p>
            <input className="input" value={form.customerName} onChange={(e) => set('customerName', e.target.value)} />
          </div>
          <div>
            <p className="label">Phone</p>
            <input className="input" value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} />
          </div>
          <div>
            <p className="label">Requested Vehicle *</p>
            <input className="input" value={form.requestedVehicle} onChange={(e) => set('requestedVehicle', e.target.value)} placeholder="Axio, Prius, Van..." />
          </div>
          <div>
            <p className="label">Lead By</p>
            <input className="input" value={form.leadBy} onChange={(e) => set('leadBy', e.target.value)} placeholder="Brother / Facebook..." />
          </div>
          <div>
            <p className="label">Start Date</p>
            <input className="input" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </div>
          <div>
            <p className="label">End Date</p>
            <input className="input" type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
          </div>
          <div className="col-span-2">
            <p className="label">Notes</p>
            <textarea className="input resize-none" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary">Save Inquiry</button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title="Inquiry Details">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-navy-800">{selected.customerName}</p>
                <p className="text-sm text-navy-400">{selected.customerPhone}</p>
              </div>
              <StatusBadge status={selected.status} size="md" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Requested', selected.requestedVehicle],
                ['Lead By', selected.leadBy || '—'],
                ['Start Date', selected.startDate || '—'],
                ['End Date', selected.endDate || '—'],
              ].map(([l, v]) => (
                <div key={l} className="bg-navy-50/60 rounded-xl p-3">
                  <p className="text-xs text-navy-400">{l}</p>
                  <p className="text-sm font-semibold text-navy-800">{v}</p>
                </div>
              ))}
            </div>
            {selected.notes && (
              <div className="bg-navy-50/60 rounded-xl p-3">
                <p className="text-xs text-navy-400 mb-1">Notes</p>
                <p className="text-sm text-navy-700">{selected.notes}</p>
              </div>
            )}
            {selected.status === 'Pending' && (
              <div className="flex gap-3">
                <button onClick={() => { changeStatus(selected.id, 'Converted'); setModal(null); }} className="flex-1 py-2 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100">✓ Convert to Booking</button>
                <button onClick={() => { changeStatus(selected.id, 'Lost'); setModal(null); }} className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100">✕ Mark as Lost</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
