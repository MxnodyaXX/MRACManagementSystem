import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/useAuthStore';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, TrendingUp, Percent, Bell, Car, Send } from 'lucide-react';

const BAR_COLORS = ['#4B7BE5', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899'];

export default function OwnerView() {
  const { commissions, vehicles, bookings, addNotification } = useStore();
  const { currentUser } = useAuthStore();
  const ownerId = currentUser?.ownerId ?? '';

  const [alertOpen,    setAlertOpen]    = useState(false);
  const [alertRemarks, setAlertRemarks] = useState('');

  const myCommissions    = commissions.filter((c) => c.ownerId === ownerId);
  const myVehicles       = vehicles.filter((v) => v.ownerId === ownerId);
  const pendingPayouts   = myCommissions.filter((c) => c.status === 'Pending');

  const totalRevenue     = myCommissions.reduce((s, c) => s + c.totalIncome, 0);
  const totalReferralFee = myCommissions.reduce((s, c) => s + (c.coordinatorFee ?? 0), 0);
  const totalEarnings    = myCommissions.reduce((s, c) => s + c.ownerPayout, 0);
  const pendingAmount    = pendingPayouts.reduce((s, c) => s + c.ownerPayout, 0);

  // Per-vehicle revenue chart data
  const vehicleChart = myVehicles.map((v, i) => {
    const vComms = myCommissions.filter((c) => c.vehicleId === v.id);
    return {
      name:     `${v.brand} ${v.model}`,
      revenue:  vComms.reduce((s, c) => s + c.totalIncome, 0),
      payout:   vComms.reduce((s, c) => s + c.ownerPayout, 0),
      bookings: vComms.length,
      color:    BAR_COLORS[i % BAR_COLORS.length],
    };
  }).filter((d) => d.revenue > 0);

  const confirmAlert = () => {
    addNotification({
      type:    'General',
      title:   'Payout Requested',
      message: `${currentUser?.name ?? 'Owner'} is requesting payout for Rs ${pendingAmount.toLocaleString()} pending earnings.${alertRemarks.trim() ? ` Remarks: ${alertRemarks.trim()}` : ''}`,
    });
    setAlertOpen(false);
    setAlertRemarks('');
  };

  return (
    <>
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue',     value: `Rs ${(totalRevenue / 1000).toFixed(1)}k`,     icon: DollarSign, color: 'bg-navy-700'    },
          { label: 'Referral Fees',     value: `Rs ${(totalReferralFee / 1000).toFixed(1)}k`, icon: Percent,    color: 'bg-amber-500'   },
          { label: 'Your Earnings',     value: `Rs ${(totalEarnings / 1000).toFixed(1)}k`,    icon: TrendingUp, color: 'bg-emerald-500' },
          { label: 'Pending Payout',    value: `Rs ${(pendingAmount / 1000).toFixed(1)}k`,   icon: Bell,       color: pendingAmount > 0 ? 'bg-amber-500' : 'bg-navy-300' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${color}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xs text-navy-400 font-medium">{label}</p>
              <p className="text-xl font-bold text-navy-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Per-vehicle revenue chart */}
        <div className="card">
          <p className="section-title mb-4">Revenue by Vehicle</p>
          {vehicleChart.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={vehicleChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7FA3' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7FA3' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [`Rs ${v.toLocaleString()}`, name === 'revenue' ? 'Total Revenue' : 'Your Payout']}
                    contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {vehicleChart.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                  <Bar dataKey="payout" radius={[6, 6, 0, 0]} fill="#10B981" opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {vehicleChart.map((d) => (
                  <div key={d.name} className="bg-navy-50/60 rounded-xl p-2.5 flex items-center gap-2">
                    <Car size={14} className="text-navy-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-navy-700 truncate">{d.name}</p>
                      <p className="text-xs text-navy-400">{d.bookings} rentals · Rs {d.payout.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-navy-400 text-sm">
              No revenue data for your vehicles yet.
            </div>
          )}
        </div>

        {/* Pending payouts + alert */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title">Pending Payouts</p>
            {pendingAmount > 0 && (
              <button
                onClick={() => setAlertOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <Bell size={13} />
                Alert Admin
              </button>
            )}
          </div>

          {pendingPayouts.length > 0 ? (
            <div className="space-y-2 flex-1 overflow-y-auto">
              {pendingPayouts.map((c) => {
                const booking = bookings.find((b) => b.id === c.bookingId);
                const vehicle = vehicles.find((v) => v.id === c.vehicleId);
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 bg-amber-50/60 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy-800 truncate">
                        {booking?.customerName ?? '—'}
                      </p>
                      <p className="text-xs text-navy-400">
                        {vehicle?.brand} {vehicle?.model} · {booking?.startDate}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-amber-700">Rs {c.ownerPayout.toLocaleString()}</p>
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-navy-400 text-sm">
              No pending payouts — all settled!
            </div>
          )}

          {pendingAmount > 0 && (
            <div className="mt-4 pt-3 border-t border-navy-50 flex justify-between items-center">
              <p className="text-xs text-navy-400">Total pending</p>
              <p className="text-base font-bold text-amber-700">Rs {pendingAmount.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Alert Admin Modal */}
      <Modal open={alertOpen} onClose={() => setAlertOpen(false)} title="Request Payout Alert">
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800">Pending Amount</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">Rs {pendingAmount.toLocaleString()}</p>
            <p className="text-xs text-amber-600 mt-1">{pendingPayouts.length} unpaid commission record{pendingPayouts.length !== 1 ? 's' : ''}</p>
          </div>
          <div>
            <p className="label">Remarks <span className="text-navy-400 font-normal">(optional)</span></p>
            <textarea
              className="input resize-none"
              rows={3}
              value={alertRemarks}
              onChange={(e) => setAlertRemarks(e.target.value)}
              placeholder="Add any notes or context for the admin (e.g. urgent, preferred payment method)..."
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setAlertOpen(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={confirmAlert}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              <Send size={14} />
              Send Alert
            </button>
          </div>
        </div>
      </Modal>

      {/* My commission records */}
      <div className="card">
        <p className="section-title mb-4">My Commission Records</p>
        {myCommissions.length > 0 ? (
          <div className="space-y-3">
            {[...myCommissions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((c) => {
              const booking = bookings.find((b) => b.id === c.bookingId);
              const vehicle = vehicles.find((v) => v.id === c.vehicleId);
              return (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-navy-50/60 rounded-xl">
                  <div className="w-9 h-9 rounded-xl bg-navy-100 flex items-center justify-center flex-shrink-0">
                    <Car size={15} className="text-navy-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-800 truncate">{booking?.customerName ?? '—'}</p>
                    <p className="text-xs text-navy-400">
                      {vehicle?.brand} {vehicle?.model} · {booking?.startDate} – {booking?.endDate}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-emerald-700">Rs {c.ownerPayout.toLocaleString()}</p>
                    <p className="text-xs text-navy-400">of Rs {c.totalIncome.toLocaleString()}</p>
                    {(c.coordinatorFee ?? 0) > 0 && (
                      <p className="text-xs text-amber-600">− Rs {(c.coordinatorFee ?? 0).toLocaleString()} referral ({c.referral})</p>
                    )}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-navy-400 text-sm">No commission records yet.</div>
        )}
      </div>
    </>
  );
}
