import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { AuditLogEntry, AnomalyAlert } from '../services/api';
import { ShieldCheck, AlertOctagon, Terminal, Search, RefreshCcw, Loader2 } from 'lucide-react';

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
      <div className="flex justify-between items-center bg-slate-900/40 border border-slate-850 rounded-lg p-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-brand-primary" /> Supervision & Audit Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">System audit logs, anomaly alerts, and operational health monitoring</p>
        </div>

        <button
          onClick={fetchSupervisorData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 text-slate-300 border border-slate-850 hover:border-slate-700 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
          Sync Dashboard
        </button>
      </div>

      {/* System Health Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-panel border border-slate-800 rounded-lg p-4 flex flex-col justify-center items-center">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">Datastore Health</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <strong className="text-sm text-white">99.98% / Healthy</strong>
          </div>
        </div>
        <div className="card-panel border border-slate-800 rounded-lg p-4 flex flex-col justify-center items-center">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">AutoML Sync</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <strong className="text-sm text-white">Zia Engine Online</strong>
          </div>
        </div>
        <div className="card-panel border border-slate-800 rounded-lg p-4 flex flex-col justify-center items-center">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">Audit Ledger Integrity</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <strong className="text-sm text-white">Cryptographic / Verified</strong>
          </div>
        </div>
        <div className="card-panel border border-slate-800 rounded-lg p-4 flex flex-col justify-center items-center">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">Compliance Rating</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <strong className="text-sm text-white">100% Compliant</strong>
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
              <span className="text-sm font-bold text-white uppercase tracking-wider">Predictive Intelligence Flags</span>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
              {alerts.length > 0 ? (
                alerts.map((alert, idx) => (
                  <div 
                    key={idx} 
                    className="card-panel border border-slate-800/80 rounded-lg p-4 relative overflow-hidden transition hover:border-slate-750"
                  >
                    {/* Severity Badge */}
                    <div className="flex justify-between items-start gap-4">
                      <span className={`text-[11px] uppercase font-black px-1.5 py-0.5 rounded ${getSeverityBadge(alert.severity)}`}>
                        {alert.severity} Flag
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mt-2.5">{alert.title}</h4>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{alert.description}</p>
                    
                    <span className="text-[11px] text-brand-primary font-bold uppercase tracking-wider block mt-3">
                      Source Index: {alert.type}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-500 border border-slate-900 rounded-lg bg-slate-950/20 text-xs">
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
                <span className="text-sm font-bold text-white uppercase tracking-wider">Traceability Ledger (Audit Logs)</span>
              </div>

              {/* Log filter */}
              <div className="relative w-full sm:w-48">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={logFilter}
                  onChange={(e) => {
                    setLogFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Filter logs..."
                  className="bg-slate-950 border border-slate-850 focus:border-brand-primary focus:outline-none rounded-lg pl-8 pr-3 py-1 text-[11px] text-slate-100 placeholder-slate-500 w-full"
                />
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-slate-950 border border-slate-900 rounded-lg overflow-hidden shadow-2xl flex flex-col">
              <div className="overflow-x-auto min-h-[380px] max-h-[460px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs table-zebra">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-850">
                      <th className="p-3">User & Role</th>
                      <th className="p-3">Audit Details</th>
                      <th className="p-3 text-center">Security Level</th>
                      <th className="p-3">Time</th>
                      <th className="p-3 text-right">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {paginatedLogs.length > 0 ? (
                      paginatedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/30 transition">
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-bold text-white block">{log.user_id}</span>
                            <span className="text-[11px] text-slate-500">{log.role}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-slate-200 font-medium block max-w-xs truncate" title={log.query_text}>
                              "{log.query_text}"
                            </span>
                            <span className="text-[10px] text-brand-primary font-semibold block mt-0.5">
                              {log.action_taken}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap text-center">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                              log.data_classification === 'Secret' || log.data_classification === 'Confidential'
                                ? 'bg-red-500/15 text-red-400 border-red-500/25'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                            }`}>
                              {log.data_classification || 'Restricted'}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap text-slate-400">
                            {new Date(log.timestamp).toLocaleDateString()}
                            <span className="block text-[11px] text-slate-500 mt-0.5">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="p-3 text-right whitespace-nowrap text-slate-500 font-mono">
                            {log.ip_address}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-500 italic">
                          No audit trace logs match current filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center bg-slate-900 px-4 py-3 border-t border-slate-850 text-xs mt-auto">
                  <span className="text-slate-400 font-medium">
                    Showing <strong className="text-white">{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-white">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</strong> of <strong className="text-white">{filteredLogs.length}</strong> logs
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-950 text-slate-300 border border-slate-850 rounded text-[11px] font-bold cursor-pointer disabled:cursor-not-allowed transition"
                    >
                      Prev
                    </button>
                    <span className="px-2.5 py-1 bg-slate-950/40 text-slate-300 border border-slate-850 rounded font-mono text-[11px]">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-950 text-slate-300 border border-slate-850 rounded text-[11px] font-bold cursor-pointer disabled:cursor-not-allowed transition"
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
    </div>
  );
};
