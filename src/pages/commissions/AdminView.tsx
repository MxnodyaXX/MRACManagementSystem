import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import StatusBadge from '../../components/ui/StatusBadge';
import Select from '../../components/ui/Select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, DollarSign, Users, Percent, Search, X, FileSpreadsheet, FileText } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export default function AdminView() {
  const { commissions, bookings, vehicles, owners } = useStore();

  const totalIncome      = commissions.reduce((s, c) => s + c.totalIncome, 0);
  const totalReferralFee = commissions.reduce((s, c) => s + (c.coordinatorFee ?? 0), 0);
  const totalOwnerPayout = commissions.reduce((s, c) => s + c.ownerPayout, 0);
  const pendingCount     = commissions.filter((c) => c.status === 'Pending').length;

  // ── Income by referral ────────────────────────────────────────────────────
  // Direct is split per owner (which owners get non-referred business); owner /
  // third-party referrals and marketing sources each get their own bar.
  const REFERRAL_SOURCES = ['WhatsApp', 'Facebook', 'Instagram', 'TikTok', 'Google', 'Word of Mouth'];
  const ownerNameById = (id: string) => owners.find((o) => o.id === id)?.name ?? 'Unknown';

  const directByOwner: Record<string, { count: number; total: number }> = {};
  const referralMap:   Record<string, { count: number; total: number }> = {};
  const sourceMap:     Record<string, { count: number; total: number }> = {};
  commissions.forEach((c) => {
    const ref = c.referral || 'Direct';
    const bucket =
      ref === 'Direct'                 ? (directByOwner[c.ownerId] ??= { count: 0, total: 0 })
      : REFERRAL_SOURCES.includes(ref) ? (sourceMap[ref]           ??= { count: 0, total: 0 })
      :                                  (referralMap[ref]          ??= { count: 0, total: 0 });
    bucket.count += 1;
    bucket.total += c.totalIncome;
  });

  const REFERRAL_COLOR = '#F59E0B';
  const SOURCE_COLORS  = ['#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#64748B'];
  const OWNER_COLORS   = ['#4B7BE5', '#2563EB', '#1D4ED8', '#3B82F6', '#60A5FA', '#0EA5E9'];

  // Direct = a single bar made of stacked owner segments (sub-bars).
  const directOwnerBars = Object.entries(directByOwner).map(([oid, d], i) => ({
    id: oid,
    key: `ow_${oid}`,
    name: ownerNameById(oid),
    color: OWNER_COLORS[i % OWNER_COLORS.length],
    total: d.total,
    count: d.count,
  }));
  const directTotal = directOwnerBars.reduce((s, b) => s + b.total, 0);
  const directCount = directOwnerBars.reduce((s, b) => s + b.count, 0);

  // Referrers + marketing sources each render as one bar (the "other" stack slot).
  const otherBars = [
    ...Object.entries(referralMap).map(([n, d]) => ({ name: n, fullName: `${n} (referral)`, group: 'Referral' as const, color: REFERRAL_COLOR, ...d })),
    ...Object.entries(sourceMap).map(([n, d], i) => ({ name: n, fullName: n, group: 'Source' as const, color: SOURCE_COLORS[i % SOURCE_COLORS.length], ...d })),
  ];
  const otherColorByName: Record<string, string> = Object.fromEntries(otherBars.map((b) => [b.name, b.color]));

  // One chart row per x-category. Direct row carries each owner's value; other
  // rows carry a single "other" value (owner keys zeroed so the stack lines up).
  const directRow: Record<string, string | number> = { name: 'Direct', other: 0 };
  directOwnerBars.forEach((b) => { directRow[b.key] = b.total; });
  const chartRows: Record<string, string | number>[] = [
    directRow,
    ...otherBars.map((b) => {
      const row: Record<string, string | number> = { name: b.name, other: b.total };
      directOwnerBars.forEach((ob) => { row[ob.key] = 0; });
      return row;
    }),
  ];

  // Hover Direct → total + each owner's slice; hover any other bar → that referral.
  const renderReferralTooltip = ({ active, label }: { active?: boolean; label?: string }) => {
    if (!active) return null;
    if (label === 'Direct') {
      return (
        <div className="bg-white rounded-xl shadow-card border border-navy-100 px-3 py-2 text-xs">
          <p className="font-bold text-navy-800 mb-1.5">
            Direct · Rs {directTotal.toLocaleString()}
            <span className="font-normal text-navy-400"> · {directCount} booking{directCount !== 1 ? 's' : ''}</span>
          </p>
          {directOwnerBars.filter((b) => b.total > 0).map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-5">
              <span className="flex items-center gap-1.5 text-navy-600">
                <span className="w-2 h-2 rounded-full" style={{ background: b.color }} />{b.name}
              </span>
              <span className="font-semibold text-navy-800">Rs {b.total.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    const ob = otherBars.find((b) => b.name === label);
    if (!ob) return null;
    return (
      <div className="bg-white rounded-xl shadow-card border border-navy-100 px-3 py-2 text-xs">
        <p className="font-semibold text-navy-800">{ob.fullName}</p>
        <p className="text-navy-600 mt-0.5">Rs {ob.total.toLocaleString()} · {ob.count} booking{ob.count !== 1 ? 's' : ''}</p>
      </div>
    );
  };

  // ── Payout-table filters ────────────────────────────────────────────────
  const [fOwner, setFOwner]       = useState('');
  const [fVehicle, setFVehicle]   = useState('');
  const [fReferral, setFReferral] = useState('');
  const [fStatus, setFStatus]     = useState('');
  const [search, setSearch]       = useState('');
  const [period, setPeriod]       = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  const referralOptions = Array.from(new Set(commissions.map((c) => c.referral || 'Direct'))).sort();
  const vehiclesInUse   = vehicles.filter((v) => commissions.some((c) => c.vehicleId === v.id));

  // The date a record is filtered on = its rental (booking) start date, else the record date.
  const recordDate = (c: typeof commissions[number]) =>
    bookings.find((b) => b.id === c.bookingId)?.startDate || c.createdAt.slice(0, 10);

  // Resolve the active [from, to] window (yyyy-MM-dd strings) from the period preset.
  const dateRange = useMemo<{ from: string; to: string }>(() => {
    const now = new Date();
    const f = (d: Date) => format(d, 'yyyy-MM-dd');
    switch (period) {
      case 'week':   return { from: f(startOfWeek(now, { weekStartsOn: 1 })), to: f(endOfWeek(now, { weekStartsOn: 1 })) };
      case 'month':  return { from: f(startOfMonth(now)), to: f(endOfMonth(now)) };
      case 'year':   return { from: f(startOfYear(now)),  to: f(endOfYear(now)) };
      case 'custom': return { from: dateFrom, to: dateTo };
      default:       return { from: '', to: '' };
    }
  }, [period, dateFrom, dateTo]);

  const filteredCommissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return commissions.filter((c) => {
      if (fOwner && c.ownerId !== fOwner) return false;
      if (fVehicle && c.vehicleId !== fVehicle) return false;
      if (fReferral && (c.referral || 'Direct') !== fReferral) return false;
      if (fStatus && c.status !== fStatus) return false;
      if (dateRange.from || dateRange.to) {
        const d = recordDate(c);
        if (dateRange.from && d < dateRange.from) return false;
        if (dateRange.to && d > dateRange.to) return false;
      }
      if (q) {
        const booking = bookings.find((b) => b.id === c.bookingId);
        const vehicle = vehicles.find((v) => v.id === c.vehicleId);
        const owner   = owners.find((o) => o.id === c.ownerId);
        const hay = [
          booking?.customerName, booking?.customerPhone,
          vehicle?.brand, vehicle?.model, vehicle?.vehicleNumber,
          owner?.name, c.referral,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [commissions, bookings, vehicles, owners, fOwner, fVehicle, fReferral, fStatus, search, dateRange]);

  const filtersActive = !!(fOwner || fVehicle || fReferral || fStatus || search.trim() || period !== 'all');
  const clearFilters  = () => { setFOwner(''); setFVehicle(''); setFReferral(''); setFStatus(''); setSearch(''); setPeriod('all'); setDateFrom(''); setDateTo(''); };
  const filteredTotal      = filteredCommissions.reduce((s, c) => s + c.totalIncome, 0);
  const filteredReferral   = filteredCommissions.reduce((s, c) => s + (c.coordinatorFee ?? 0), 0);
  const filteredOwnerTotal = filteredCommissions.reduce((s, c) => s + c.ownerPayout, 0);

  // ── Export (Excel/CSV + PDF) of the currently filtered records ──────────────
  const EXPORT_COLS = ['Customer', 'Period', 'Vehicle', 'Reg No', 'Owner', 'Referral', 'Total', 'Referral Fee', 'Owner Gets', 'Status'] as const;
  const exportRows = () =>
    filteredCommissions.map((c) => {
      const booking = bookings.find((b) => b.id === c.bookingId);
      const vehicle = vehicles.find((v) => v.id === c.vehicleId);
      const owner   = owners.find((o) => o.id === c.ownerId);
      return {
        Customer: booking?.customerName ?? '',
        Period: booking ? `${booking.startDate} to ${booking.endDate}` : '',
        Vehicle: vehicle ? `${vehicle.brand} ${vehicle.model}` : '',
        'Reg No': vehicle?.vehicleNumber ?? '',
        Owner: owner?.name ?? '',
        Referral: c.referral || 'Direct',
        Total: c.totalIncome,
        'Referral Fee': c.coordinatorFee ?? 0,
        'Owner Gets': c.ownerPayout,
        Status: c.status,
      } as Record<(typeof EXPORT_COLS)[number], string | number>;
    });

  const periodLabel: Record<typeof period, string> = { all: '', week: 'This Week', month: 'This Month', year: 'This Year', custom: 'Custom' };
  const filterSummary = () =>
    [
      (dateRange.from || dateRange.to) && `Period: ${periodLabel[period]}${dateRange.from || dateRange.to ? ` (${dateRange.from || '…'} → ${dateRange.to || '…'})` : ''}`,
      fOwner    && `Owner: ${owners.find((o) => o.id === fOwner)?.name ?? ''}`,
      fVehicle  && (() => { const v = vehicles.find((x) => x.id === fVehicle); return v ? `Vehicle: ${v.brand} ${v.model} (${v.vehicleNumber})` : ''; })(),
      fReferral && `Referral: ${fReferral}`,
      fStatus   && `Status: ${fStatus}`,
      search.trim() && `Search: "${search.trim()}"`,
    ].filter(Boolean).join('  ·  ') || 'All records';

  const stamp = () => new Date().toISOString().slice(0, 10);

  const exportCSV = () => {
    const rows = exportRows();
    const esc = (v: string | number) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      EXPORT_COLS.join(','),
      ...rows.map((r) => EXPORT_COLS.map((h) => esc(r[h])).join(',')),
      esc('TOTALS') + ',,,,,,' + filteredTotal + ',' + filteredReferral + ',' + filteredOwnerTotal + ',',
    ];
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout-records-${stamp()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const rows = exportRows();
    const fmt = (n: number) => 'Rs ' + n.toLocaleString();
    const body = rows
      .map(
        (r) => `<tr>
          <td>${r.Customer}<br><small>${r.Period}</small></td>
          <td>${r.Vehicle}<br><small>${r['Reg No']}</small></td>
          <td>${r.Owner}</td>
          <td>${r.Referral}</td>
          <td class="num">${fmt(Number(r.Total))}</td>
          <td class="num">${Number(r['Referral Fee']) > 0 ? fmt(Number(r['Referral Fee'])) : '—'}</td>
          <td class="num">${fmt(Number(r['Owner Gets']))}</td>
          <td class="ctr"><span class="badge">${r.Status}</span></td>
        </tr>`
      )
      .join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Payout Records — EMRAC</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b;padding:28px 32px}
  @media print{@page{margin:12mm;size:A4 landscape}}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e3a5f;padding-bottom:12px;margin-bottom:6px}
  .brand{font-size:22px;font-weight:900;color:#1e3a5f}
  .sub{font-size:11px;color:#64748b}
  h1{font-size:15px;color:#1e3a5f;margin-top:14px}
  .meta{font-size:11px;color:#64748b;margin:4px 0 14px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#1e3a5f;color:#fff;text-align:left;padding:7px 9px;font-size:10px;text-transform:uppercase;letter-spacing:.04em}
  th.num,td.num{text-align:right}
  th.ctr,td.ctr{text-align:center}
  td{padding:7px 9px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  td small{color:#94a3b8;font-size:9px}
  tr:nth-child(even) td{background:#f8fafc}
  .badge{background:#eef2f9;color:#475569;border-radius:999px;padding:2px 8px;font-size:9px;font-weight:600}
  tfoot td{background:#1e3a5f;color:#fff;font-weight:700;padding:9px;border:none}
  .footer{margin-top:16px;text-align:center;font-size:10px;color:#94a3b8}
</style></head><body>
  <div class="head">
    <div><div class="brand">EMRAC</div><div class="sub">Vehicle Rental Management</div></div>
    <div style="text-align:right"><div class="sub">Generated</div><div style="font-weight:700">${new Date().toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' })}</div></div>
  </div>
  <h1>Payout Records</h1>
  <div class="meta">${filterSummary()} &nbsp;·&nbsp; ${rows.length} record${rows.length !== 1 ? 's' : ''}</div>
  <table>
    <thead><tr>
      <th>Booking</th><th>Vehicle</th><th>Owner</th><th>Referral</th>
      <th class="num">Total</th><th class="num">Referral Fee</th><th class="num">Owner Gets</th><th class="ctr">Status</th>
    </tr></thead>
    <tbody>${body || '<tr><td colspan="8" style="text-align:center;padding:24px;color:#94a3b8">No records.</td></tr>'}</tbody>
    <tfoot><tr>
      <td colspan="4">TOTALS · ${rows.length} record${rows.length !== 1 ? 's' : ''}</td>
      <td class="num">${fmt(filteredTotal)}</td>
      <td class="num">${fmt(filteredReferral)}</td>
      <td class="num">${fmt(filteredOwnerTotal)}</td>
      <td></td>
    </tr></tfoot>
  </table>
  <div class="footer">EMRAC · emrac.lk</div>
</body></html>`;
    const win = window.open('', '_blank', 'width=1100,height=720');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const ownerPayouts = owners.map((o) => {
    const ownerComms = commissions.filter((c) => c.ownerId === o.id);
    return {
      owner:   o,
      total:   ownerComms.reduce((s, c) => s + c.ownerPayout, 0),
      pending: ownerComms.filter((c) => c.status === 'Pending').reduce((s, c) => s + c.ownerPayout, 0),
      count:   ownerComms.length,
    };
  });

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Income',       value: `Rs ${(totalIncome / 1000).toFixed(1)}k`,      icon: DollarSign, color: 'bg-navy-700'    },
          { label: 'Referral Fees',      value: `Rs ${(totalReferralFee / 1000).toFixed(1)}k`, icon: Percent,    color: 'bg-amber-500'   },
          { label: 'Owner Payouts',      value: `Rs ${(totalOwnerPayout / 1000).toFixed(1)}k`, icon: Users,      color: 'bg-emerald-500' },
          { label: 'Pending Payouts',    value: pendingCount,                                    icon: TrendingUp, color: 'bg-blue-500'    },
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
        {/* Income by referral — Direct split per owner, then referrers & sources */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title">Income by Referral</p>
            <div className="flex items-center gap-3 text-[10px] text-navy-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: OWNER_COLORS[0] }} /> Direct</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: REFERRAL_COLOR }} /> Referral</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-navy-300" /> Source</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={chartRows} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" interval={0} tick={{ fontSize: 10, fill: '#6B7FA3' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7FA3' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip cursor={{ fill: 'rgba(75,123,229,0.06)' }} content={renderReferralTooltip} />
              {/* Direct = stacked owner segments (sub-bars) */}
              {directOwnerBars.map((b) => (
                <Bar key={b.key} dataKey={b.key} stackId="ref" fill={b.color} stroke="#fff" strokeWidth={1} />
              ))}
              {/* Referrers + sources = single bars sharing the same stack slot */}
              <Bar dataKey="other" stackId="ref" radius={[6, 6, 0, 0]}>
                {chartRows.map((r, i) => <Cell key={i} fill={otherColorByName[r.name as string] ?? '#CBD5E1'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Grouped breakdown */}
          <div className="space-y-3 mt-3">
            {directOwnerBars.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-wide mb-1.5">
                  Direct (by owner) · Rs {(directTotal / 1000).toFixed(0)}k
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {directOwnerBars.map((b) => (
                    <div key={b.id} className="bg-navy-50/60 rounded-xl p-2 text-center">
                      <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: b.color }} />
                      <p className="text-xs font-medium text-navy-700 truncate">{b.name}</p>
                      <p className="text-xs text-navy-400">{b.count} booking{b.count !== 1 ? 's' : ''} · Rs {(b.total / 1000).toFixed(0)}k</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {([['Owner Referrals', 'Referral'], ['Marketing Sources', 'Source']] as const).map(([title, grp]) => {
              const items = otherBars.filter((b) => b.group === grp);
              if (items.length === 0) return null;
              return (
                <div key={grp}>
                  <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-wide mb-1.5">{title}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {items.map((b) => (
                      <div key={b.name} className="bg-navy-50/60 rounded-xl p-2 text-center">
                        <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: b.color }} />
                        <p className="text-xs font-medium text-navy-700 truncate">{b.name}</p>
                        <p className="text-xs text-navy-400">{b.count} booking{b.count !== 1 ? 's' : ''} · Rs {(b.total / 1000).toFixed(0)}k</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
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

      {/* Payout records table */}
      <div className="card">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <p className="section-title">All Payout Records</p>
            <p className="text-xs text-navy-400 mt-0.5">
              {filteredCommissions.length} of {commissions.length} · Income Rs {filteredTotal.toLocaleString()} · Owner Rs {filteredOwnerTotal.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={exportCSV}
              disabled={filteredCommissions.length === 0}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-xl transition-colors"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button
              onClick={exportPDF}
              disabled={filteredCommissions.length === 0}
              className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-xl transition-colors"
            >
              <FileText size={14} /> PDF
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none" />
            <input
              className="input pl-10 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, vehicle, owner…"
            />
          </div>
          <div className="w-40">
            <Select value={fOwner} onChange={setFOwner} placeholder="All owners"
              options={owners.map((o) => ({ value: o.id, label: o.name }))} />
          </div>
          <div className="w-52">
            <Select value={fVehicle} onChange={setFVehicle} placeholder="All vehicles"
              options={vehiclesInUse.map((v) => ({ value: v.id, label: `${v.brand} ${v.model}`, sub: v.vehicleNumber }))} />
          </div>
          <div className="w-40">
            <Select value={fReferral} onChange={setFReferral} placeholder="All referrals"
              options={referralOptions.map((r) => ({ value: r, label: r }))} />
          </div>
          <div className="w-36">
            <Select value={fStatus} onChange={setFStatus} placeholder="All status"
              options={['Pending', 'Paid', 'Credit'].map((s) => ({ value: s, label: s }))} />
          </div>
          {filtersActive && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs font-medium text-navy-500 hover:text-navy-800 bg-navy-50 hover:bg-navy-100 px-3.5 py-2.5 rounded-xl transition-colors flex-shrink-0">
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {/* Date / period filter */}
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <div className="flex bg-navy-50 rounded-xl p-0.5 gap-0.5">
            {([['all', 'All time'], ['week', 'This Week'], ['month', 'This Month'], ['year', 'This Year'], ['custom', 'Custom']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
                  period === key ? 'bg-navy-700 text-white shadow-sm' : 'text-navy-500 hover:text-navy-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" className="input text-sm w-auto" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
              <span className="text-xs text-navy-400">to</span>
              <input type="date" className="input text-sm w-auto" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          )}
          {period !== 'all' && period !== 'custom' && (
            <span className="text-xs text-navy-400">{dateRange.from} → {dateRange.to}</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr>
                <th className="table-head text-left pb-3">Booking</th>
                <th className="table-head text-left pb-3">Vehicle</th>
                <th className="table-head text-left pb-3">Owner</th>
                <th className="table-head text-center pb-3">Referral</th>
                <th className="table-head text-right pb-3">Total</th>
                <th className="table-head text-right pb-3">Referral Fee</th>
                <th className="table-head text-right pb-3">Owner Gets</th>
                <th className="table-head text-right pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommissions.map((c) => {
                const booking = bookings.find((b) => b.id === c.bookingId);
                const vehicle = vehicles.find((v) => v.id === c.vehicleId);
                const owner   = owners.find((o) => o.id === c.ownerId);
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
                      <span className="text-xs bg-navy-50 text-navy-600 px-2 py-0.5 rounded-full">{c.referral}</span>
                    </td>
                    <td className="py-3 text-right text-sm font-semibold text-navy-800">
                      Rs {c.totalIncome.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      {(c.coordinatorFee ?? 0) > 0 ? (
                        <>
                          <p className="text-sm font-semibold text-amber-700">Rs {(c.coordinatorFee ?? 0).toLocaleString()}</p>
                          <p className="text-xs text-navy-400 truncate max-w-[90px] ml-auto">{c.referral}</p>
                        </>
                      ) : (
                        <span className="text-sm text-navy-300">—</span>
                      )}
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
              {filteredCommissions.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-navy-400 text-sm">
                  {commissions.length === 0 ? 'No payout records yet.' : 'No records match your filters.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
