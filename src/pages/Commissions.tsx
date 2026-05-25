import { useStore } from '../store/useStore';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, DollarSign, Users, Percent } from 'lucide-react';

export default function Commissions() {
  const { commissions, bookings, vehicles, owners } = useStore();

  const totalIncome = commissions.reduce((s, c) => s + c.totalIncome, 0);
  const totalCommission = commissions.reduce((s, c) => s + c.commissionAmount, 0);
  const totalOwnerPayout = commissions.reduce((s, c) => s + c.ownerPayout, 0);
  const pendingCount = commissions.filter((c) => c.status === 'Pending').length;

  // Lead breakdown
  const leadMap: Record<string, { count: number; total: number; commission: number }> = {};
  commissions.forEach((c) => {
    const key = c.leadBy || 'Direct';
    if (!leadMap[key]) leadMap[key] = { count: 0, total: 0, commission: 0 };
    leadMap[key].count += 1;
    leadMap[key].total += c.totalIncome;
    leadMap[key].commission += c.commissionAmount;
  });

  const leadData = Object.entries(leadMap).map(([name, d]) => ({ name, ...d }));
  const BAR_COLORS = ['#4B7BE5', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

  // Owner payout breakdown
  const ownerPayouts = owners.map((o) => {
    const ownerComms = commissions.filter((c) => c.ownerId === o.id);
    return {
      owner: o,
      total: ownerComms.reduce((s, c) => s + c.ownerPayout, 0),
      pending: ownerComms.filter((c) => c.status === 'Pending').reduce((s, c) => s + c.ownerPayout, 0),
      count: ownerComms.length,
    };
  });

  return (
    <div>
      <Header title="Commissions & Leads" subtitle="Track earnings, payouts, and lead performance" />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Income', value: `Rs ${(totalIncome / 1000).toFixed(1)}k`, icon: DollarSign, color: 'bg-navy-700' },
          { label: 'Commission Earned', value: `Rs ${(totalCommission / 1000).toFixed(1)}k`, icon: Percent, color: 'bg-blue-500' },
          { label: 'Owner Payouts', value: `Rs ${(totalOwnerPayout / 1000).toFixed(1)}k`, icon: Users, color: 'bg-emerald-500' },
          { label: 'Pending Payouts', value: pendingCount, icon: TrendingUp, color: 'bg-amber-500' },
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
        {/* Lead performance chart */}
        <div className="card">
          <p className="section-title mb-4">Income by Lead Source</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={leadData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7FA3' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7FA3' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                formatter={(v: number) => [`Rs ${v.toLocaleString()}`, '']}
                contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {leadData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {leadData.map((d, i) => (
              <div key={d.name} className="bg-navy-50/60 rounded-xl p-2 text-center">
                <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
                <p className="text-xs font-medium text-navy-700">{d.name}</p>
                <p className="text-xs text-navy-400">{d.count} bookings</p>
              </div>
            ))}
          </div>
        </div>

        {/* Owner payouts */}
        <div className="card">
          <p className="section-title mb-4">Owner Payouts</p>
          <div className="space-y-3">
            {ownerPayouts.map(({ owner, total, pending, count }) => (
              <div key={owner.id} className="flex items-center gap-3 p-3 bg-navy-50/60 rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-navy-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {owner.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-800 truncate">{owner.name}</p>
                  <p className="text-xs text-navy-400">{count} bookings · {owner.commissionRate}% commission</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-navy-800">Rs {total.toLocaleString()}</p>
                  {pending > 0 && <p className="text-xs text-amber-600">Rs {pending.toLocaleString()} pending</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Commissions table */}
      <div className="card">
        <p className="section-title mb-4">All Commission Records</p>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr>
              <th className="table-head text-left pb-3">Booking</th>
              <th className="table-head text-left pb-3">Vehicle</th>
              <th className="table-head text-left pb-3">Owner</th>
              <th className="table-head text-center pb-3">Lead By</th>
              <th className="table-head text-right pb-3">Total</th>
              <th className="table-head text-right pb-3">Commission</th>
              <th className="table-head text-right pb-3">Owner Gets</th>
              <th className="table-head text-right pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((c) => {
              const booking = bookings.find((b) => b.id === c.bookingId);
              const vehicle = vehicles.find((v) => v.id === c.vehicleId);
              const owner = owners.find((o) => o.id === c.ownerId);
              return (
                <tr key={c.id} className="table-row">
                  <td className="py-3">
                    <p className="text-sm font-medium text-navy-800">{booking?.customerName ?? '—'}</p>
                    <p className="text-xs text-navy-400">{booking?.startDate} – {booking?.endDate}</p>
                  </td>
                  <td className="py-3">
                    <p className="text-sm text-navy-700">{vehicle?.brand} {vehicle?.model}</p>
                    <p className="text-xs text-navy-400">{vehicle?.vehicleNumber}</p>
                  </td>
                  <td className="py-3 text-sm text-navy-700">{owner?.name ?? '—'}</td>
                  <td className="py-3 text-center">
                    <span className="text-xs bg-navy-50 text-navy-600 px-2 py-0.5 rounded-full">{c.leadBy}</span>
                  </td>
                  <td className="py-3 text-right text-sm font-semibold text-navy-800">
                    Rs {c.totalIncome.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <p className="text-sm font-semibold text-blue-700">Rs {c.commissionAmount.toLocaleString()}</p>
                    <p className="text-xs text-navy-400">{c.commissionRate}%</p>
                  </td>
                  <td className="py-3 text-right text-sm font-semibold text-emerald-700">
                    Rs {c.ownerPayout.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              );
            })}
            {commissions.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-navy-400 text-sm">No commission records yet.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
