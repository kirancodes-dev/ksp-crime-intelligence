import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Scale, RefreshCw, Loader2, AlertCircle, CheckSquare, Square,
  ChevronUp, ChevronDown, UserCheck, FileCheck, AlertTriangle,
  ShieldAlert, X, Clock, Search, BarChart3
} from 'lucide-react';

interface WarrantDeskProps {
  userId: string;
  role: string;
}

interface WarrantRow {
  id: number;
  fir_number: string;
  district: string;
  police_station: string;
  crime_type: string;
  status: string;
  date_of_offence: string;
  complainant_name: string;
  days_open: number;
  accused_count: number;
  max_risk_score: number;
}

type SortField = 'days_open' | 'max_risk_score' | 'crime_type' | 'status' | 'district';
type SortDir = 'asc' | 'desc';

const STATUS_OPTIONS = [
  'Under Investigation', 'Charge Sheet Filed', 'Court Trial',
  'Warrant Issued', 'Closed', 'Escalated', 'Under Review',
];

const OFFICERS = [
  'SI Meera Nair', 'SI Ravi Kumar', 'SI Deepa Shetty',
  'PI Arun Gowda', 'PI Mahesh Kamath', 'ACP Raghavendra K.',
  'DA Priya Sharma', 'Inspector Suresh Babu'
];

const riskColor = (score: number) => {
  if (score >= 80) return 'text-[#d9251c] bg-red-50 border-red-900/40';
  if (score >= 60) return 'text-orange-700 bg-orange-950/30 border-orange-900/30';
  if (score >= 40) return 'text-amber-700 bg-amber-950/30 border-amber-900/30';
  return 'text-emerald-700 bg-emerald-950/30 border-emerald-900/30';
};

const urgencyClass = (days: number) => {
  if (days > 60) return 'border-l-4 border-l-red-500';
  if (days > 30) return 'border-l-4 border-l-amber-500';
  return 'border-l-4 border-l-slate-700';
};

export const WarrantDesk: React.FC<WarrantDeskProps> = ({ userId, role }) => {
  const [warrants, setWarrants] = useState<WarrantRow[]>([]);
  const [filtered, setFiltered] = useState<WarrantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<SortField>('days_open');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [showModal, setShowModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('Under Review');
  const [bulkOfficer, setBulkOfficer] = useState('');
  const [bulkNote, setBulkNote] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);

  useEffect(() => { loadWarrants(); }, []);

  useEffect(() => {
    let data = [...warrants];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(w =>
        w.fir_number.toLowerCase().includes(q) ||
        w.crime_type.toLowerCase().includes(q) ||
        w.district.toLowerCase().includes(q) ||
        (w.complainant_name || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'All') data = data.filter(w => w.status === statusFilter);
    data.sort((a, b) => {
      const aVal = (a as any)[sortField] ?? 0;
      const bVal = (b as any)[sortField] ?? 0;
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
    setFiltered(data);
  }, [warrants, searchQuery, statusFilter, sortField, sortDir]);

  const loadWarrants = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.getWarrants(userId, role);
      if (res.success) setWarrants(res.warrants || []);
      else setError('Failed to load warrant data.');
    } catch (err: any) {
      setError(err.message || 'Error fetching warrants.');
    } finally { setLoading(false); }
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(w => w.id)));
  };
  const handleSort = (field: SortField) => {
    setSortField(field);
    setSortDir(sortField === field && sortDir === 'desc' ? 'asc' : 'desc');
  };

  const handleBulkApply = async () => {
    if (selected.size === 0) return;
    setBulkLoading(true); setBulkSuccess(null);
    try {
      await api.bulkUpdateWarrants(Array.from(selected), bulkStatus, bulkOfficer, bulkNote, userId, role);
      setBulkSuccess(`✓ ${selected.size} case(s) updated to "${bulkStatus}".`);
      setSelected(new Set()); setShowModal(false);
      await loadWarrants();
    } catch (err: any) {
      setError(err.message || 'Bulk update failed.');
    } finally { setBulkLoading(false); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    sortField === field && sortDir === 'asc' ? <ChevronUp size={10} className="text-[#1e3a5f] inline ml-1" /> :
    sortField === field ? <ChevronDown size={10} className="text-[#1e3a5f] inline ml-1" /> :
    <ChevronDown size={10} className="text-slate-600 inline ml-1" />
  );

  const overdueCritical = warrants.filter(w => w.days_open > 60).length;
  const overdueAmber = warrants.filter(w => w.days_open > 30 && w.days_open <= 60).length;
  const highRisk = warrants.filter(w => w.max_risk_score >= 70).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-[#f0f4f8]/40 border border-[#d1d9e6] rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1e3a5f] flex items-center gap-2">
            <Scale size={18} className="text-[#1e3a5f]" /> Warrant &amp; Case Management Desk
          </h2>
          <p className="text-xs text-[#6c757d] mt-0.5">Bulk manage FIR statuses, assign officers, and track escalations</p>
        </div>
        <button onClick={loadWarrants} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#eef2f7] border border-[#d1d9e6] text-[#2d4a6f] text-xs font-semibold rounded-lg transition cursor-pointer">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <BarChart3 size={14} className="text-[#6c757d] mx-auto mb-1" />, label: 'Total Cases', val: warrants.length, cls: 'text-[#1e3a5f]' },
          { icon: <AlertTriangle size={14} className="text-[#d9251c] mx-auto mb-1" />, label: 'Critical (>60 days)', val: overdueCritical, cls: 'text-[#d9251c]', border: 'border-red-900/40' },
          { icon: <Clock size={14} className="text-amber-700 mx-auto mb-1" />, label: 'Overdue 30-60d', val: overdueAmber, cls: 'text-amber-700', border: 'border-amber-900/40' },
          { icon: <ShieldAlert size={14} className="text-orange-700 mx-auto mb-1" />, label: 'High Risk ≥70', val: highRisk, cls: 'text-orange-700', border: 'border-orange-900/40' },
        ].map((kpi, i) => (
          <div key={i} className={`card-panel border ${kpi.border || 'border-[#d1d9e6]'} rounded-lg p-3 text-center`}>
            {kpi.icon}
            <span className="block text-[10px] text-[#6c757d] uppercase font-semibold">{kpi.label}</span>
            <strong className={`text-xl block ${kpi.cls}`}>{kpi.val}</strong>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6c757d]" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search FIR, crime, district…"
              className="pl-7 pr-3 py-1.5 bg-[#f0f4f8] border border-[#d1d9e6] focus:border-[#1e3a5f] focus:outline-none rounded-lg text-xs text-[#1e3a5f] placeholder-[#9ca3af] w-52 transition" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#f0f4f8] border border-[#d1d9e6] rounded-lg px-2.5 py-1.5 text-xs text-[#2d4a6f] focus:outline-none focus:border-[#1e3a5f] cursor-pointer transition">
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {selected.size > 0 && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-lg">
            <FileCheck size={13} /> Bulk Action ({selected.size})
          </button>
        )}
      </div>

      {bulkSuccess && (
        <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-3 text-emerald-700 text-xs font-semibold">
          <FileCheck size={13} /> {bulkSuccess}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-950/20 border border-red-900/40 rounded-lg p-3 text-[#d9251c] text-xs">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-[#6c757d] text-xs">
          <Loader2 size={14} className="animate-spin text-[#1e3a5f]" /> Loading warrant data...
        </div>
      ) : (
        <div className="bg-[#f0f4f8]/30 border border-[#d1d9e6] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#d1d9e6] bg-[#f0f4f8]/60">
                  <th className="px-3 py-3 text-left">
                    <button onClick={toggleAll} className="cursor-pointer text-[#6c757d] hover:text-[#1e3a5f] transition">
                      {selected.size === filtered.length && filtered.length > 0
                        ? <CheckSquare size={14} className="text-[#1e3a5f]" />
                        : <Square size={14} />}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-[#6c757d] font-semibold uppercase tracking-wider">FIR #</th>
                  <th className="px-3 py-3 text-left cursor-pointer text-[#6c757d] font-semibold uppercase tracking-wider hover:text-[#1e3a5f]" onClick={() => handleSort('district')}>
                    District <SortIcon field="district" />
                  </th>
                  <th className="px-3 py-3 text-left cursor-pointer text-[#6c757d] font-semibold uppercase tracking-wider hover:text-[#1e3a5f]" onClick={() => handleSort('crime_type')}>
                    Crime Type <SortIcon field="crime_type" />
                  </th>
                  <th className="px-3 py-3 text-left cursor-pointer text-[#6c757d] font-semibold uppercase tracking-wider hover:text-[#1e3a5f]" onClick={() => handleSort('status')}>
                    Status <SortIcon field="status" />
                  </th>
                  <th className="px-3 py-3 text-left cursor-pointer text-[#6c757d] font-semibold uppercase tracking-wider hover:text-[#1e3a5f]" onClick={() => handleSort('days_open')}>
                    Days Open <SortIcon field="days_open" />
                  </th>
                  <th className="px-3 py-3 text-left cursor-pointer text-[#6c757d] font-semibold uppercase tracking-wider hover:text-[#1e3a5f]" onClick={() => handleSort('max_risk_score')}>
                    Risk <SortIcon field="max_risk_score" />
                  </th>
                  <th className="px-3 py-3 text-left text-[#6c757d] font-semibold uppercase tracking-wider">Accused</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-[#6c757d] text-xs">No warrants found.</td></tr>
                ) : filtered.map(w => (
                  <tr key={w.id} className={`border-b border-[#d1d9e6]/60 hover:bg-white/30 transition ${urgencyClass(w.days_open)} ${selected.has(w.id) ? 'bg-[#1e3a5f]/5' : ''}`}>
                    <td className="px-3 py-3">
                      <button onClick={() => toggleSelect(w.id)} className="cursor-pointer text-[#6c757d] hover:text-[#1e3a5f] transition">
                        {selected.has(w.id) ? <CheckSquare size={14} className="text-[#1e3a5f]" /> : <Square size={14} />}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-mono text-[#1e3a5f] font-semibold">{w.fir_number}</td>
                    <td className="px-3 py-3 text-[#2d4a6f]">{w.district}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 bg-white border border-[#d1d9e6] rounded text-[#1e3a5f] text-[10px] font-semibold">{w.crime_type}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        w.status === 'Closed' ? 'bg-emerald-950/30 text-emerald-700 border-emerald-900/30' :
                        w.status === 'Escalated' || w.status === 'Warrant Issued' ? 'bg-red-950/30 text-[#d9251c] border-red-900/30' :
                        w.status === 'Court Trial' ? 'bg-purple-950/30 text-purple-700 border-purple-900/30' :
                        'bg-white text-[#2d4a6f] border-[#d1d9e6]'
                      }`}>{w.status}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`font-semibold ${w.days_open > 60 ? 'text-[#d9251c]' : w.days_open > 30 ? 'text-amber-700' : 'text-[#2d4a6f]'}`}>
                        {Math.round(w.days_open)}d
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {w.max_risk_score > 0
                        ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${riskColor(w.max_risk_score)}`}>{Math.round(w.max_risk_score)}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-[#6c757d]">{w.accused_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-[#d1d9e6] text-[11px] text-[#6c757d]">
            Showing {filtered.length} of {warrants.length} cases
            &nbsp;•&nbsp;<span className="text-[#d9251c]">{overdueCritical} critical</span>
            &nbsp;•&nbsp;<span className="text-amber-700">{overdueAmber} overdue</span>
          </div>
        </div>
      )}

      {/* Bulk Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0d2137]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#f0f4f8] border border-[#d1d9e6] rounded-xl shadow-2xl">
            <div className="flex justify-between items-center px-5 py-4 border-b border-[#d1d9e6]">
              <h3 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-2">
                <UserCheck size={14} className="text-[#1e3a5f]" /> Bulk Update — {selected.size} Cases
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#6c757d] hover:text-[#1e3a5f] cursor-pointer transition"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6c757d] mb-1.5">New Status *</label>
                <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
                  className="w-full bg-white border border-[#d1d9e6] rounded-lg px-3 py-2 text-sm text-[#1e3a5f] focus:outline-none focus:border-[#1e3a5f] cursor-pointer">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6c757d] mb-1.5">Assign Officer (optional)</label>
                <select value={bulkOfficer} onChange={e => setBulkOfficer(e.target.value)}
                  className="w-full bg-white border border-[#d1d9e6] rounded-lg px-3 py-2 text-sm text-[#1e3a5f] focus:outline-none focus:border-[#1e3a5f] cursor-pointer">
                  <option value="">— No assignment —</option>
                  {OFFICERS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6c757d] mb-1.5">Urgency Note (optional)</label>
                <textarea value={bulkNote} onChange={e => setBulkNote(e.target.value)} rows={3}
                  placeholder="Enter justification or action note..."
                  className="w-full bg-white border border-[#d1d9e6] rounded-lg px-3 py-2 text-sm text-[#1e3a5f] focus:outline-none focus:border-[#1e3a5f] resize-none placeholder-[#9ca3af]" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={handleBulkApply} disabled={bulkLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 disabled:bg-slate-700 text-white font-bold text-sm rounded-lg transition cursor-pointer">
                  {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <FileCheck size={14} />}
                  {bulkLoading ? 'Applying...' : 'Apply Update'}
                </button>
                <button onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-white hover:bg-[#eef2f7] text-[#2d4a6f] font-semibold text-sm rounded-lg border border-[#d1d9e6] transition cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
