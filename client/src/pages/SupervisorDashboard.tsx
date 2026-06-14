import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { AuditLogEntry, AnomalyAlert } from '../services/api';
import { ShieldCheck, AlertOctagon, Terminal, Search, RefreshCcw, Loader2, ShieldAlert } from 'lucide-react';

interface SupervisorDashboardProps {
  userId: string;
  role: string;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({ userId, role }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Client-side pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Compliance Override Modal states
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedAlertTitle, setSelectedAlertTitle] = useState('');
  const [overrideReason, setOverrideReason] = useState('Authorized Operational Test');
  const [overrideJustification, setOverrideJustification] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  useEffect(() => {
    fetchSupervisorData();
  }, []);

  const fetchSupervisorData = async () => {
    setLoading(true);
    try {
      // Fetch audit logs
      const logRes = await api.getAuditLogs(userId, role);
      if (logRes.success) {
        setLogs(logRes.logs);
      }

      // Fetch anomalies
      const alertRes = await api.getAnomalies(userId, role);
      if (alertRes.success) {
        setAlerts(alertRes.anomalies.generatedAlerts);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load audit logs or anomaly indices");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOverrideModal = (title: string) => {
    setSelectedAlertTitle(title);
    setOverrideReason('Authorized Operational Test');
    setOverrideJustification('');
    setShowOverrideModal(true);
  };

  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideJustification.trim()) {
      alert("Justification note is required for governance compliance.");
      return;
    }
    setSubmittingOverride(true);
    try {
      const response = await fetch('http://localhost:3001/api/audit-logs/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
          'X-User-Role': role
        },
        body: JSON.stringify({
          alertTitle: selectedAlertTitle,
          reason: overrideReason,
          justification: overrideJustification.trim()
        })
      });
      
      if (response.ok) {
        setShowOverrideModal(false);
        alert("Compliance override successfully written to Datastore audit trail.");
        fetchSupervisorData();
      } else {
        alert("Override recording failed on server.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to communicate with compliance controller.");
    } finally {
      setSubmittingOverride(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const term = logFilter.toLowerCase();
    return (
      log.user_id.toLowerCase().includes(term) ||
      log.role.toLowerCase().includes(term) ||
      log.query_text.toLowerCase().includes(term) ||
      log.action_taken.toLowerCase().includes(term)
    );
  });

  // Calculate pagination variables
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-500/20 text-red-400 border border-red-500/35';
      case 'High':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/35';
      case 'Medium':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/35';
      default:
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/35';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center bg-slate-900/40 border border-slate-850 rounded-lg p-4 bg-white border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-brand-primary" /> Supervision & Audit Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">System audit logs, anomaly alerts, and operational health monitoring</p>
        </div>

        <button
          onClick={fetchSupervisorData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:bg-slate-200 text-slate-650 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
          <span>Sync Dashboard</span>
        </button>
      </div>

      {/* System Health Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-panel border border-slate-200 rounded-lg p-4 flex flex-col justify-center items-center bg-white">
          <span className="text-[11px] text-slate-400 uppercase font-bold">Datastore Health</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <strong className="text-sm text-slate-800">99.98% / Healthy</strong>
          </div>
        </div>
        <div className="card-panel border border-slate-200 rounded-lg p-4 flex flex-col justify-center items-center bg-white">
          <span className="text-[11px] text-slate-400 uppercase font-bold">AutoML Sync</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <strong className="text-sm text-slate-800">Zia Engine Online</strong>
          </div>
        </div>
        <div className="card-panel border border-slate-200 rounded-lg p-4 flex flex-col justify-center items-center bg-white">
          <span className="text-[11px] text-slate-400 uppercase font-bold">Audit Ledger Integrity</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <strong className="text-sm text-slate-800">Cryptographic / Verified</strong>
          </div>
        </div>
        <div className="card-panel border border-slate-200 rounded-lg p-4 flex flex-col justify-center items-center bg-white">
          <span className="text-[11px] text-slate-400 uppercase font-bold">Compliance Rating</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <strong className="text-sm text-slate-800">100% Compliant</strong>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-10 text-slate-400 text-xs gap-2">
          <Loader2 size={16} className="animate-spin text-brand-primary" />
          <span>Fetching log ledgers and anomalies...</span>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Zia AutoML Anomaly Alerts */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2 px-1">
              <AlertOctagon size={16} className="text-brand-primary" />
              <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">Predictive Intelligence Flags</span>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
              {alerts.length > 0 ? (
                alerts.map((alert, idx) => (
                  <div 
                    key={idx} 
                    className="card-panel border border-slate-200 rounded-lg p-4 relative overflow-hidden bg-white transition hover:shadow"
                  >
                    {/* Severity Badge */}
                    <div className="flex justify-between items-start gap-4">
                      <span className={`text-[11px] uppercase font-black px-1.5 py-0.5 rounded ${getSeverityBadge(alert.severity)}`}>
                        {alert.severity} Flag
                      </span>
                      <span className="text-[11px] text-slate-450 font-semibold">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-800 mt-2.5">{alert.title}</h4>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">{alert.description}</p>
                    
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50">
                      <span className="text-[10px] text-brand-primary font-bold uppercase tracking-wider block">
                        Source: {alert.type}
                      </span>
                      
                      <button
                        onClick={() => handleOpenOverrideModal(alert.title)}
                        className="px-2.5 py-1 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/25 rounded text-[10px] font-bold transition cursor-pointer"
                      >
                        Resolve Flag
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-500 border border-slate-200 rounded-lg bg-white text-xs">
                  No predictive anomaly spikes flagged today.
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Governance Audit Logs */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-brand-primary" />
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">Traceability Ledger (Audit Logs)</span>
              </div>

              {/* Log filter */}
              <div className="relative w-full sm:w-48">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={logFilter}
                  onChange={(e) => {
                    setLogFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Filter logs..."
                  className="bg-white border border-slate-200 focus:border-brand-primary focus:outline-none rounded-lg pl-8 pr-3 py-1 text-[11px] text-slate-800 placeholder-slate-400 w-full"
                />
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow flex flex-col">
              <div className="overflow-x-auto min-h-[380px] max-h-[460px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs table-zebra">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="p-3">User & Role</th>
                      <th className="p-3">Audit Details</th>
                      <th className="p-3 text-center">Security Level</th>
                      <th className="p-3">Time</th>
                      <th className="p-3 text-right">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedLogs.length > 0 ? (
                      paginatedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-bold text-slate-900 block">{log.user_id}</span>
                            <span className="text-[11px] text-slate-400 font-semibold">{log.role}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-slate-800 font-semibold block max-w-xs truncate" title={log.query_text}>
                              {log.query_text}
                            </span>
                            <span className="text-[10px] text-brand-primary font-bold block mt-0.5">
                              {log.action_taken}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap text-center">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                              log.data_classification === 'Secret' || log.data_classification === 'Confidential'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-emerald-50 text-emerald-750 border-emerald-200'
                            }`}>
                              {log.data_classification || 'Restricted'}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap text-slate-500 font-medium">
                            {new Date(log.timestamp).toLocaleDateString()}
                            <span className="block text-[11px] text-slate-400 font-mono mt-0.5">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="p-3 text-right whitespace-nowrap text-slate-400 font-mono">
                            {log.ip_address}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-450 font-medium italic">
                          No audit trace logs match current filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center bg-slate-50 px-4 py-3 border-t border-slate-200 text-xs mt-auto">
                  <span className="text-slate-500 font-bold">
                    Showing <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</strong> of <strong className="text-slate-800">{filteredLogs.length}</strong> logs
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white text-slate-650 border border-slate-200 rounded text-[11px] font-bold cursor-pointer disabled:cursor-not-allowed transition"
                    >
                      Prev
                    </button>
                    <span className="px-2.5 py-1 bg-white text-slate-700 border border-slate-200 rounded font-mono text-[11px] font-semibold">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white text-slate-650 border border-slate-200 rounded text-[11px] font-bold cursor-pointer disabled:cursor-not-allowed transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Compliance Override Justification Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[5000] p-4 font-sans select-none">
          <form onSubmit={handleSubmitOverride} className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-6 flex flex-col gap-4">
            
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase">Compliance Override</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Governance Resolution Log</p>
              </div>
            </div>

            {/* Target Alert */}
            <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 text-xs">
              <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Target Anomaly</span>
              <strong className="text-slate-800 font-bold">"{selectedAlertTitle}"</strong>
            </div>

            {/* Reason Select */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Resolution Category</label>
              <select
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-3 py-2 w-full focus:outline-none focus:border-brand-primary"
              >
                <option value="Authorized Operational Test">Authorized Operational Test</option>
                <option value="False Positive Verification">False Positive Verification</option>
                <option value="Strategic Security Waiver">Strategic Security Waiver</option>
                <option value="Emergency Investigation Exemption">Emergency Investigation Exemption</option>
              </select>
            </div>

            {/* Justification Textarea */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider">Justification Note</label>
              <textarea
                value={overrideJustification}
                onChange={(e) => setOverrideJustification(e.target.value)}
                placeholder="Enter official justification detailing why this anomaly flag is overridden..."
                rows={3}
                className="bg-white border border-slate-200 text-xs text-slate-800 rounded-lg p-3 w-full focus:outline-none focus:border-brand-primary font-medium"
                required
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                disabled={submittingOverride}
                className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-650 font-bold text-xs uppercase tracking-wider py-2.5 rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingOverride}
                className="flex-1 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submittingOverride ? 'Submitting Override...' : 'Submit Override'}
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
};
