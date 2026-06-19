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
  if (score >= 80) return 'text-red-400 bg-red-950/40 border-red-900/40';
  if (score >= 60) return 'text-orange-400 bg-orange-950/30 border-orange-900/30';
  if (score >= 40) return 'text-amber-400 bg-amber-950/30 border-amber-900/30';
  return 'text-emerald-400 bg-emerald-950/30 border-emerald-900/30';
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
    sortField === field && sortDir === 'asc' ? <ChevronUp size={10} className="text-brand-primary inline ml-1" /> :
    sortField === field ? <ChevronDown size={10} className="text-brand-primary inline ml-1" /> :
    <ChevronDown size={10} className="text-slate-600 inline ml-1" />
  );

  const overdueCritical = warrants.filter(w => w.days_open > 60).length;
  const overdueAmber = warrants.filter(w => w.days_open > 30 && w.days_open <= 60).length;
  const highRisk = warrants.filter(w => w.max_risk_score >= 70).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-slate-900/40 border border-slate-850 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Scale size={18} className="text-brand-primary" /> Warrant &amp; Case Management Desk
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Bulk manage FIR statuses, assign officers, and track escalations</p>
        </div>
        <button onClick={loadWarrants} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition cursor-pointer">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <BarChart3 size={14} className="text-slate-400 mx-auto mb-1" />, label: 'Total Cases', val: warrants.length, cls: 'text-white' },
          { icon: <AlertTriangle size={14} className="text-red-400 mx-auto mb-1" />, label: 'Critical (>60 days)', val: overdueCritical, cls: 'text-red-400', border: 'border-red-900/40' },
          { icon: <Clock size={14} className="text-amber-400 mx-auto mb-1" />, label: 'Overdue 30-60d', val: overdueAmber, cls: 'text-amber-400', border: 'border-amber-900/40' },
          { icon: <ShieldAlert size={14} className="text-orange-400 mx-auto mb-1" />, label: 'High Risk ≥70', val: highRisk, cls: 'text-orange-400', border: 'border-orange-900/40' },
        ].map((kpi, i) => (
          <div key={i} className={`card-panel border ${kpi.border || 'border-slate-800'} rounded-lg p-3 text-center`}>
            {kpi.icon}
            <span className="block text-[10px] text-slate-500 uppercase font-semibold">{kpi.label}</span>
            <strong className={`text-xl block ${kpi.cls}`}>{kpi.val}</strong>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search FIR, crime, district…"
              className="pl-7 pr-3 py-1.5 bg-slate-900 border border-slate-800 focus:border-brand-primary focus:outline-none rounded-lg text-xs text-slate-200 placeholder-slate-600 w-52 transition" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-primary cursor-pointer transition">
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {selected.size > 0 && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-lg">
            <FileCheck size={13} /> Bulk Action ({selected.size})
          </button>
        )}
      </div>

      {bulkSuccess && (
        <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-3 text-emerald-400 text-xs font-semibold">
          <FileCheck size={13} /> {bulkSuccess}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-950/20 border border-red-900/40 rounded-lg p-3 text-red-400 text-xs">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-400 text-xs">
          <Loader2 size={14} className="animate-spin text-brand-primary" /> Loading warrant data...
        </div>
      ) : (
        <div className="bg-slate-900/30 border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  <th className="px-3 py-3 text-left">
                    <button onClick={toggleAll} className="cursor-pointer text-slate-400 hover:text-white transition">
                      {selected.size === filtered.length && filtered.length > 0
                        ? <CheckSquare size={14} className="text-brand-primary" />
                        : <Square size={14} />}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-slate-400 font-semibold uppercase tracking-wider">FIR #</th>
                  <th className="px-3 py-3 text-left cursor-pointer text-slate-400 font-semibold uppercase tracking-wider hover:text-white" onClick={() => handleSort('district')}>
                    District <SortIcon field="district" />
                  </th>
                  <th className="px-3 py-3 text-left cursor-pointer text-slate-400 font-semibold uppercase tracking-wider hover:text-white" onClick={() => handleSort('crime_type')}>
                    Crime Type <SortIcon field="crime_type" />
                  </th>
                  <th className="px-3 py-3 text-left cursor-pointer text-slate-400 font-semibold uppercase tracking-wider hover:text-white" onClick={() => handleSort('status')}>
                    Status <SortIcon field="status" />
                  </th>
                  <th className="px-3 py-3 text-left cursor-pointer text-slate-400 font-semibold uppercase tracking-wider hover:text-white" onClick={() => handleSort('days_open')}>
                    Days Open <SortIcon field="days_open" />
                  </th>
                  <th className="px-3 py-3 text-left cursor-pointer text-slate-400 font-semibold uppercase tracking-wider hover:text-white" onClick={() => handleSort('max_risk_score')}>
                    Risk <SortIcon field="max_risk_score" />
                  </th>
                  <th className="px-3 py-3 text-left text-slate-400 font-semibold uppercase tracking-wider">Accused</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-slate-500 text-xs">No warrants found.</td></tr>
                ) : filtered.map(w => (
                  <tr key={w.id} className={`border-b border-slate-800/60 hover:bg-slate-800/30 transition ${urgencyClass(w.days_open)} ${selected.has(w.id) ? 'bg-brand-primary/5' : ''}`}>
                    <td className="px-3 py-3">
                      <button onClick={() => toggleSelect(w.id)} className="cursor-pointer text-slate-400 hover:text-brand-primary transition">
                        {selected.has(w.id) ? <CheckSquare size={14} className="text-brand-primary" /> : <Square size={14} />}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-mono text-brand-primary font-semibold">{w.fir_number}</td>
                    <td className="px-3 py-3 text-slate-300">{w.district}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 text-[10px] font-semibold">{w.crime_type}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        w.status === 'Closed' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30' :
                        w.status === 'Escalated' || w.status === 'Warrant Issued' ? 'bg-red-950/30 text-red-400 border-red-900/30' :
                        w.status === 'Court Trial' ? 'bg-purple-950/30 text-purple-400 border-purple-900/30' :
                        'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>{w.status}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`font-semibold ${w.days_open > 60 ? 'text-red-400' : w.days_open > 30 ? 'text-amber-400' : 'text-slate-300'}`}>
                        {Math.round(w.days_open)}d
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {w.max_risk_score > 0
                        ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${riskColor(w.max_risk_score)}`}>{Math.round(w.max_risk_score)}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-slate-400">{w.accused_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-slate-800 text-[11px] text-slate-500">
            Showing {filtered.length} of {warrants.length} cases
            &nbsp;•&nbsp;<span className="text-red-400">{overdueCritical} critical</span>
            &nbsp;•&nbsp;<span className="text-amber-400">{overdueAmber} overdue</span>
          </div>
        </div>
      )}

      {/* Bulk Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck size={14} className="text-brand-primary" /> Bulk Update — {selected.size} Cases
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer transition"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">New Status *</label>
                <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-primary cursor-pointer">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Assign Officer (optional)</label>
                <select value={bulkOfficer} onChange={e => setBulkOfficer(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-primary cursor-pointer">
                  <option value="">— No assignment —</option>
                  {OFFICERS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Urgency Note (optional)</label>
                <textarea value={bulkNote} onChange={e => setBulkNote(e.target.value)} rows={3}
                  placeholder="Enter justification or action note..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-primary resize-none placeholder-slate-600" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={handleBulkApply} disabled={bulkLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/90 disabled:bg-slate-700 text-white font-bold text-sm rounded-lg transition cursor-pointer">
                  {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <FileCheck size={14} />}
                  {bulkLoading ? 'Applying...' : 'Apply Update'}
                </button>
                <button onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-lg border border-slate-700 transition cursor-pointer">
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
