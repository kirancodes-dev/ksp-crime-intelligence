import { useState, useEffect } from 'react';
import { api, BASE_URL } from '../services/api';
import type { AuditLogEntry, AnomalyAlert } from '../services/api';
import { WarrantDesk } from '../components/WarrantDesk/WarrantDesk';
import { IntelligenceBrief } from '../components/IntelligenceBrief/IntelligenceBrief';
import { ShieldCheck, AlertOctagon, Terminal, Search, RefreshCcw, RefreshCw, Loader2, ShieldAlert, Database, Scale } from 'lucide-react';

interface SupervisorDashboardProps {
  userId: string;
  role: string;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({ userId, role }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [supervisorTab, setSupervisorTab] = useState<'audit' | 'warrants'>('audit');
  
  // Client-side pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Compliance Override Modal states
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedAlertTitle, setSelectedAlertTitle] = useState('');
  const [overrideReason, setOverrideReason] = useState('Authorized Operational Test');
  const [overrideJustification, setOverrideJustification] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  // Phase 6 Massive Upgrades: Emergency Dispatch states
  const [patrolUnits, setPatrolUnits] = useState<any[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<any[]>([
    { id: 3849, time: "21:15", caller: "Public Witness", details: "Verbal altercation reported at Commercial Street, Bengaluru Central.", status: "Resolved", vehicle: "PATROL-101" },
    { id: 3850, time: "21:24", caller: "Security Guard", details: "Attempted vehicle break-in near Jayanagar 4th Block.", status: "Resolved", vehicle: "PATROL-102" }
  ]);
  const [selectedCall, setSelectedCall] = useState<any | null>(null);
  const [dispatchRecommendation, setDispatchRecommendation] = useState<any | null>(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);

  // Advanced Upgrades: CCTNS Scheduler states
  const [syncRuns, setSyncRuns] = useState<any[]>([]);
  const [cronInterval, setCronInterval] = useState<string>('Hourly');
  const [runningSync, setRunningSync] = useState<boolean>(false);
  const [logsOutput, setLogsOutput] = useState<string[]>([]);

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

      // Fetch CCTNS runs
      const runsRes = await api.getCctnsRuns(userId, role);
      if (runsRes.success) {
        setSyncRuns(runsRes.runs || []);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load audit logs, anomaly indices, or sync logs");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSync = async () => {
    setRunningSync(true);
    setLogsOutput([]);
    
    const logsStream = [
      "[INFO] Resolving endpoint for CCTNS National Registry...",
      "[INFO] Opening secure tunnel proxy KSP-GATEWAY-112...",
      "[SUCCESS] Credentials validated. Fetching delta packets...",
      "[INFO] Ingesting crime reports & records from district grids...",
      "[SUCCESS] Ingested new incident reports successfully.",
      "[INFO] Updating local datastore indices and Zia risk tables...",
      "[SUCCESS] Synchronization complete. Local databases synced."
    ];

    logsStream.forEach((log, idx) => {
      setTimeout(() => {
        setLogsOutput(prev => [...prev, log]);
      }, (idx + 1) * 350);
    });

    try {
      const res = await api.triggerCctnsSync('Manual', userId, role);
      if (res.success) {
        setTimeout(async () => {
          setRunningSync(false);
          const runsRes = await api.getCctnsRuns(userId, role);
          if (runsRes.success) {
            setSyncRuns(runsRes.runs || []);
          }
        }, logsStream.length * 350 + 200);
      }
    } catch (err) {
      console.error(err);
      setRunningSync(false);
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
      const response = await fetch(`${BASE_URL}/audit-logs/override`, {
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

  const fetchPatrolUnits = async () => {
    try {
      const res = await api.getDispatchUnits(userId, role);
      if (res.success) {
        setPatrolUnits(res.units);
      }
    } catch (err) {
      console.error("Failed to load patrol units:", err);
    }
  };

  useEffect(() => {
    fetchPatrolUnits();
  }, []);

  useEffect(() => {
    const alertsQueue = [
      { id: 3851, time: "21:31", caller: "Citizen Report", details: "Chain snatching incident near Hubballi Railway Station.", status: "Pending", vehicle: "" },
      { id: 3852, time: "21:33", caller: "Store Manager", details: "Suspicious vehicle observed idling near Chamundi Hill, Mysuru.", status: "Pending", vehicle: "" },
      { id: 3853, time: "21:35", caller: "Bank Teller", details: "Credit card fraud report at Mangaluru Kadri PS.", status: "Pending", vehicle: "" }
    ];
    let index = 0;

    const interval = setInterval(() => {
      if (index < alertsQueue.length) {
        setDispatchLogs(prev => [alertsQueue[index], ...prev]);
        index++;
      }
    }, 18000); // Add new alert every 18 seconds

    return () => clearInterval(interval);
  }, []);

  const handleGenerateRecommendation = async (call: any) => {
    setDispatchLoading(true);
    setDispatchRecommendation(null);
    
    // Simulate LLM/Route calculation delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    let closestUnit = patrolUnits[0] || null;
    let distance = "4.2 km";
    let eta = "9 mins";
    
    const text = call.details.toLowerCase();
    if (text.includes('hubballi')) {
      closestUnit = patrolUnits.find(u => u.id === 'PATROL-301') || closestUnit;
      distance = "1.8 km";
      eta = "4 mins";
    } else if (text.includes('mysuru')) {
      closestUnit = patrolUnits.find(u => u.id === 'PATROL-201') || closestUnit;
      distance = "2.9 km";
      eta = "6 mins";
    } else if (text.includes('mangaluru') || text.includes('mangalan')) {
      closestUnit = patrolUnits.find(u => u.id === 'PATROL-401') || closestUnit;
      distance = "3.1 km";
      eta = "7 mins";
    } else {
      closestUnit = patrolUnits.find(u => u.id === 'PATROL-101') || closestUnit;
      distance = "1.2 km";
      eta = "3 mins";
    }
    
    setDispatchRecommendation({
      unit: closestUnit,
      distance,
      eta,
      routeDescription: `Head north on main highway, take the first exit toward station road. Turn left at junction.`
    });
    setDispatchLoading(false);
  };

  const handleExecuteDispatch = (callId: number, unitId: string) => {
    setDispatchLogs(prev => 
      prev.map(c => c.id === callId ? { ...c, status: 'Dispatched', vehicle: unitId } : c)
    );
    setPatrolUnits(prev => 
      prev.map(u => u.id === unitId ? { ...u, status: 'Busy' } : u)
    );
    setSelectedCall(null);
    setDispatchRecommendation(null);
    alert(`Patrol Unit ${unitId} successfully dispatched to Call #${callId}.`);
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
        return 'bg-red-500/20 text-[#d9251c] border border-red-500/35';
      case 'High':
        return 'bg-orange-500/20 text-orange-700 border border-orange-500/35';
      case 'Medium':
        return 'bg-amber-500/20 text-amber-700 border border-amber-500/35';
      default:
        return 'bg-blue-500/20 text-[#1e3a5f] border border-blue-500/35';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center bg-[#f0f4f8]/40 border border-[#d1d9e6] rounded-lg p-4 bg-white border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-[#1e3a5f]" /> Supervision & Audit Management
          </h1>
          <p className="text-xs text-[#6c757d] mt-0.5 font-medium">System audit logs, anomaly alerts, and operational health monitoring</p>
        </div>

        <div className="flex items-center gap-2">
          <IntelligenceBrief userId={userId} role={role} />
          <button
            onClick={fetchSupervisorData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
            <span>Sync Dashboard</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setSupervisorTab('audit')}
          className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold transition cursor-pointer border-b-2 ${
            supervisorTab === 'audit' ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-[#6c757d] hover:text-slate-700'
          }`}
        >
          <ShieldCheck size={13} /> Audit &amp; Anomaly
        </button>
        <button
          onClick={() => setSupervisorTab('warrants')}
          className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold transition cursor-pointer border-b-2 ${
            supervisorTab === 'warrants' ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-[#6c757d] hover:text-slate-700'
          }`}
        >
          <Scale size={13} /> Warrant Desk
        </button>
      </div>

      {/* Tab content */}
      {supervisorTab === 'warrants' ? (
        <WarrantDesk userId={userId} role={role} />
      ) : (
      <>

      {/* System Health Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-panel border border-slate-200 rounded-lg p-4 flex flex-col justify-center items-center bg-white">
          <span className="text-[11px] text-[#6c757d] uppercase font-bold">Datastore Health</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <strong className="text-sm text-slate-800">99.98% / Healthy</strong>
          </div>
        </div>
        <div className="card-panel border border-slate-200 rounded-lg p-4 flex flex-col justify-center items-center bg-white">
          <span className="text-[11px] text-[#6c757d] uppercase font-bold">AutoML Sync</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <strong className="text-sm text-slate-800">Zia Engine Online</strong>
          </div>
        </div>
        <div className="card-panel border border-slate-200 rounded-lg p-4 flex flex-col justify-center items-center bg-white">
          <span className="text-[11px] text-[#6c757d] uppercase font-bold">Audit Ledger Integrity</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <strong className="text-sm text-slate-800">Cryptographic / Verified</strong>
          </div>
        </div>
        <div className="card-panel border border-slate-200 rounded-lg p-4 flex flex-col justify-center items-center bg-white">
          <span className="text-[11px] text-[#6c757d] uppercase font-bold">Compliance Rating</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <strong className="text-sm text-slate-800">100% Compliant</strong>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-10 text-[#6c757d] text-xs gap-2">
          <Loader2 size={16} className="animate-spin text-[#1e3a5f]" />
          <span>Fetching log ledgers and anomalies...</span>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Zia AutoML Anomaly Alerts */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2 px-1">
              <AlertOctagon size={16} className="text-[#1e3a5f]" />
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
                    <p className="text-xs text-[#6c757d] mt-1.5 leading-relaxed font-medium">{alert.description}</p>
                    
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50">
                      <span className="text-[10px] text-[#1e3a5f] font-bold uppercase tracking-wider block">
                        Source: {alert.type}
                      </span>
                      
                      <button
                        onClick={() => handleOpenOverrideModal(alert.title)}
                        className="px-2.5 py-1 bg-[#1e3a5f]/10 hover:bg-[#1e3a5f]/20 text-white border border-[#1e3a5f]/25 rounded text-[10px] font-bold transition cursor-pointer"
                      >
                        Resolve Flag
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-[#6c757d] border border-slate-200 rounded-lg bg-white text-xs">
                  No predictive anomaly spikes flagged today.
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Governance Audit Logs */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-[#1e3a5f]" />
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">Traceability Ledger (Audit Logs)</span>
              </div>

              {/* Log filter */}
              <div className="relative w-full sm:w-48">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6c757d]" />
                <input
                  type="text"
                  value={logFilter}
                  onChange={(e) => {
                    setLogFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Filter logs..."
                  className="bg-white border border-slate-200 focus:border-[#1e3a5f] focus:outline-none rounded-lg pl-8 pr-3 py-1 text-[11px] text-slate-800 placeholder-slate-400 w-full"
                />
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow flex flex-col">
              <div className="overflow-x-auto min-h-[380px] max-h-[460px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs table-zebra">
                  <thead>
                    <tr className="bg-slate-50 text-[#6c757d] font-bold border-b border-slate-200">
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
                            <span className="text-[11px] text-[#6c757d] font-semibold">{log.role}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-slate-800 font-semibold block max-w-xs truncate" title={log.query_text}>
                              {log.query_text}
                            </span>
                            <span className="text-[10px] text-[#1e3a5f] font-bold block mt-0.5">
                              {log.action_taken}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                              log.data_classification === 'Top Secret'
                                ? 'bg-red-600 text-white border-red-700'
                                : log.data_classification === 'Secret'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : log.data_classification === 'Confidential' || log.data_classification === 'SENSITIVE'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {log.data_classification || 'Restricted'}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap text-[#6c757d] font-medium">
                            {new Date(log.timestamp).toLocaleDateString()}
                            <span className="block text-[11px] text-[#6c757d] font-mono mt-0.5">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="p-3 text-right whitespace-nowrap text-[#6c757d] font-mono">
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
                  <span className="text-[#6c757d] font-bold">
                    Showing <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</strong> of <strong className="text-slate-800">{filteredLogs.length}</strong> logs
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white text-slate-600 border border-slate-200 rounded text-[11px] font-bold cursor-pointer disabled:cursor-not-allowed transition"
                    >
                      Prev
                    </button>
                    <span className="px-2.5 py-1 bg-white text-slate-700 border border-slate-200 rounded font-mono text-[11px] font-semibold">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white text-slate-600 border border-slate-200 rounded text-[11px] font-bold cursor-pointer disabled:cursor-not-allowed transition"
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

      {/* Phase 6 Massive Upgrades: Emergency 112 Dispatch & Patrol Router */}
      {!loading && (
        <div className="card-panel border border-slate-200 rounded-lg p-5 bg-white space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="h-2 w-2 rounded-full bg-red-600 animate-ping shrink-0" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">KSP 112 Emergency Dispatch & AI Patrol Router</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Live Ticker Feed */}
            <div className="lg:col-span-4 space-y-3">
              <span className="text-[10px] uppercase font-bold text-[#6c757d] block">Active Incoming Calls (Live Feed)</span>
              
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {dispatchLogs.map((log) => {
                  const isPending = log.status === 'Pending';
                  const isDispatched = log.status === 'Dispatched';
                  
                  return (
                    <div 
                      key={log.id} 
                      onClick={() => isPending && setSelectedCall(log)}
                      className={`p-3 rounded-lg border transition text-xs ${
                        selectedCall?.id === log.id 
                          ? 'border-[#1e3a5f] bg-blue-50/20' 
                          : isPending 
                            ? 'border-amber-200 bg-amber-50/10 hover:border-amber-400 cursor-pointer' 
                            : 'border-slate-200 bg-slate-50/30'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <strong className="text-slate-800">Call #{log.id}</strong>
                        <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                          isPending 
                            ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                            : isDispatched 
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      
                      <p className="text-slate-600 mt-1.5 font-medium leading-relaxed">{log.details}</p>
                      
                      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-[#6c757d]">
                        <span>Time: <strong>{log.time}</strong> • Caller: <strong>{log.caller}</strong></span>
                        {log.vehicle && (
                          <span className="text-slate-600 font-bold bg-white px-1.5 py-0.5 border border-slate-200 rounded font-mono">
                            {log.vehicle}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Dispatch Routing Recommendation */}
            <div className="lg:col-span-4 space-y-3">
              <span className="text-[10px] uppercase font-bold text-[#6c757d] block">AI Patrol Dispatch Router</span>
              
              {selectedCall ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#6c757d]">Processing Incident</span>
                    <strong className="text-slate-850 block">Call #{selectedCall.id}</strong>
                    <p className="text-slate-600 font-medium">{selectedCall.details}</p>
                  </div>
                  
                  {!dispatchRecommendation && !dispatchLoading && (
                    <button
                      onClick={() => handleGenerateRecommendation(selectedCall)}
                      className="w-full py-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]-light text-white text-xs font-bold rounded-lg transition cursor-pointer text-center"
                    >
                      Calculate AI Dispatch Route
                    </button>
                  )}

                  {dispatchLoading && (
                    <div className="flex flex-col items-center justify-center py-4 text-[#6c757d] text-xs gap-2">
                      <Loader2 size={16} className="animate-spin text-[#1e3a5f]" />
                      <span>Spatially locating closest patrol unit...</span>
                    </div>
                  )}

                  {dispatchRecommendation && (
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-[#6c757d] block mb-0.5">Assigned Unit</span>
                          <strong className="text-slate-800 block font-mono">{dispatchRecommendation.unit?.id}</strong>
                          <span className="text-[10px] text-[#6c757d] font-medium block">{dispatchRecommendation.unit?.vehicle.split(' ')[0]}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-[#6c757d] block mb-0.5">Distance / ETA</span>
                          <strong className="text-slate-800 block">{dispatchRecommendation.distance}</strong>
                          <span className="text-[10px] text-[#6c757d] font-medium block">{dispatchRecommendation.eta}</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-[#6c757d] block mb-1">Optimized Patrol Path</span>
                        <p className="text-slate-600 italic leading-relaxed">{dispatchRecommendation.routeDescription}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExecuteDispatch(selectedCall.id, dispatchRecommendation.unit?.id)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded cursor-pointer transition text-center"
                        >
                          Confirm Dispatch
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCall(null);
                            setDispatchRecommendation(null);
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded text-xs font-bold cursor-pointer transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-[#6c757d] border border-dashed border-slate-350 rounded-lg text-center space-y-2 bg-slate-50">
                  <span className="h-5 w-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[#6c757d] text-xs">?</span>
                  <p className="text-xs font-semibold text-[#6c757d]">Select any pending incident from the live feed to run AI dispatch routing.</p>
                </div>
              )}
            </div>

            {/* Active Patrol Unit Grid */}
            <div className="lg:col-span-4 space-y-3">
              <span className="text-[10px] uppercase font-bold text-[#6c757d] block">Patrol Fleet Status Ledger</span>
              
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {patrolUnits.map((unit) => (
                  <div key={unit.id} className="flex justify-between items-center bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-800 font-mono">{unit.id}</strong>
                        <span className="text-[10px] text-[#6c757d] font-medium">({unit.officer})</span>
                      </div>
                      <span className="text-[10px] text-[#6c757d] font-medium mt-0.5 block">{unit.vehicle}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      unit.status === 'Available' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                        : 'bg-red-50 text-red-700 border-red-150'
                    }`}>
                      {unit.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CCTNS Cron & Ingestion Controller Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mt-6">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg flex items-center justify-center">
                  <Database size={20} className={runningSync ? 'animate-bounce' : ''} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase">CCTNS Ingestion Control & Scheduler</h3>
                  <p className="text-[10px] text-[#6c757d] font-bold uppercase mt-0.5">Automated Synchronizer • Catalyst Cron Daemon</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerSync}
                  disabled={runningSync}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-650 text-[#1e3a5f] font-bold text-xs uppercase tracking-wider rounded-lg transition cursor-pointer disabled:bg-slate-200 disabled:text-[#6c757d] disabled:cursor-not-allowed"
                >
                  <RefreshCw size={12} className={runningSync ? 'animate-spin' : ''} />
                  <span>{runningSync ? 'Syncing...' : 'Trigger Immediate Sync'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left & Mid: Chronological runs table */}
              <div className="lg:col-span-2 space-y-3">
                <span className="text-[10px] uppercase font-bold text-[#6c757d] block mb-1">
                  Ingestion Execution History (Last 10 Runs)
                </span>
                
                <div className="overflow-x-auto border border-slate-150 rounded-lg bg-slate-50">
                  <table className="min-w-full text-xs text-slate-700">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-150 font-bold text-[#6c757d] uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-2 text-left">Run Timestamp</th>
                        <th className="px-4 py-2 text-left">Trigger</th>
                        <th className="px-4 py-2 text-left">Records Ingested</th>
                        <th className="px-4 py-2 text-left">Latency</th>
                        <th className="px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {syncRuns.slice(0, 10).map((run) => (
                        <tr key={run.id} className="hover:bg-white transition font-medium">
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-800">
                            {new Date(run.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              run.trigger_type === 'Manual'
                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                : 'bg-slate-100 text-[#6c757d] border-slate-200'
                            }`}>
                              {run.trigger_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">{run.records_ingested} Recs</td>
                          <td className="px-4 py-3 font-mono text-[11px] text-[#6c757d]">{run.latency_ms} ms</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              run.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-red-50 text-red-700 border-red-100'
                            }`}>
                              {run.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right: Cron config & status logs */}
              <div className="space-y-4">
                {/* Config */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-[#6c757d] block">
                    Catalyst Daemon Cron Setting
                  </span>
                  
                  <div className="space-y-2">
                    <select
                      value={cronInterval}
                      onChange={(e) => setCronInterval(e.target.value)}
                      className="bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-3 py-2 w-full focus:outline-none focus:border-[#1e3a5f]"
                    >
                      <option value="1min">Every 1 Minute (Operational Sync)</option>
                      <option value="5min">Every 5 Minutes (Standard Ingest)</option>
                      <option value="Hourly">Every Hour (Hourly Reconciliation)</option>
                      <option value="Daily">Every 24 Hours (Daily Audit Backup)</option>
                    </select>
                    <p className="text-[10px] text-[#6c757d] font-semibold italic">
                      Active: Daemon scheduler fires sync requests on configured intervals.
                    </p>
                  </div>
                </div>

                {/* Logs terminal */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#6c757d] block">
                    Daemon Ingestion Log Terminal
                  </span>
                  
                  <div className="bg-[#0d2137] text-[#2d4a6f] font-mono text-[10px] p-3 rounded-lg border border-slate-900 h-32 overflow-y-auto space-y-1">
                    {logsOutput.map((l, i) => (
                      <div key={i} className="leading-tight">
                        <span className="text-emerald-500">&gt;</span> {l}
                      </div>
                    ))}
                    {runningSync && (
                      <div className="text-[#6c757d] animate-pulse">Ingesting data packets...</div>
                    )}
                    {!runningSync && logsOutput.length === 0 && (
                      <div className="text-[#6c757d] italic">No active sync log. Click sync above to trigger.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Override Justification Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-[#f0f4f8]/60 backdrop-blur-sm flex items-center justify-center z-[5000] p-4 font-sans select-none">
          <form onSubmit={handleSubmitOverride} className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-6 flex flex-col gap-4">
            
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase">Compliance Override</h3>
                <p className="text-[10px] text-[#6c757d] font-semibold uppercase mt-0.5">Governance Resolution Log</p>
              </div>
            </div>

            {/* Target Alert */}
            <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 text-xs">
              <span className="block text-[10px] text-[#6c757d] font-bold uppercase mb-1">Target Anomaly</span>
              <strong className="text-slate-800 font-bold">"{selectedAlertTitle}"</strong>
            </div>

            {/* Reason Select */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Resolution Category</label>
              <select
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="bg-white border border-slate-200 text-xs text-slate-800 rounded-lg px-3 py-2 w-full focus:outline-none focus:border-[#1e3a5f]"
              >
                <option value="Authorized Operational Test">Authorized Operational Test</option>
                <option value="False Positive Verification">False Positive Verification</option>
                <option value="Strategic Security Waiver">Strategic Security Waiver</option>
                <option value="Emergency Investigation Exemption">Emergency Investigation Exemption</option>
              </select>
            </div>

            {/* Justification Textarea */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-[#6c757d] uppercase tracking-wider">Justification Note</label>
              <textarea
                value={overrideJustification}
                onChange={(e) => setOverrideJustification(e.target.value)}
                placeholder="Enter official justification detailing why this anomaly flag is overridden..."
                rows={3}
                className="bg-white border border-slate-200 text-xs text-slate-800 rounded-lg p-3 w-full focus:outline-none focus:border-[#1e3a5f] font-medium"
                required
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                disabled={submittingOverride}
                className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider py-2.5 rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingOverride}
                className="flex-1 bg-[#1e3a5f] hover:bg-[#1e3a5f]/95 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submittingOverride ? 'Submitting Override...' : 'Submit Override'}
              </button>
            </div>

          </form>
        </div>
      )}

      </> /* end audit tab */
      )} /* end supervisorTab ternary */

    </div>
  );
};
