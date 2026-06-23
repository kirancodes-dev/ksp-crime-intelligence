import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { SmartBrowzLog, SmartBrowzStatsResponse } from '../services/api';
import { 
  Globe, Code2, FileSpreadsheet, FileCode, CheckCircle2, 
  XCircle, Clock, Database, BarChart3, RefreshCw, Terminal, 
  Search, Sliders, ChevronRight, HelpCircle, Save, X, Play
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

interface SmartBrowzDashboardProps {
  userId: string;
  role: string;
}

export const SmartBrowzDashboard: React.FC<SmartBrowzDashboardProps> = ({ userId, role }) => {
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '30d'>('24h');
  const [loading, setLoading] = useState<boolean>(true);
  const [statsData, setStatsData] = useState<SmartBrowzStatsResponse['stats'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search filter for logs table
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Simulator states
  const [selectedSimAction, setSelectedSimAction] = useState<string>('headless_run');
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simTerminalLogs, setSimTerminalLogs] = useState<string[]>([]);
  const [simStatus, setSimStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');

  // Modal Editor states
  const [activeModal, setActiveModal] = useState<'none' | 'browser_logic' | 'templates' | 'dataverse'>('none');
  const [editorContent, setEditorContent] = useState<string>('');

  // Mock template files to load in modals
  const MOCK_CODES = {
    browser_logic: `// SmartBrowz Headless Browser Logic Script
// Automated verification sequence for case file archives

async function runBypassAudit(page, context) {
  console.log("Navigating to secure authentication gateway...");
  await page.goto("https://ksp-cctns.internal/gateway/login");
  
  console.log("Injecting audit credential tokens...");
  await page.fill("#badge-id", context.badgeId || "AUDIT-1002");
  await page.fill("#bypass-token", process.env.SYSTEM_AUDIT_BYPASS);
  
  console.log("Submitting form parameters...");
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click("#submit-btn")
  ]);
  
  const welcomeText = await page.textContent(".welcome-banner");
  if (welcomeText.includes("Restricted Access")) {
    console.log("Authentication successful, token cached.");
    return { status: "SUCCESS", token: "SB_JWT_99218AA" };
  } else {
    throw new Error("Failed to authenticate; signature mismatch");
  }
}`,
    templates: `<!-- SmartBrowz Intelligence Dossier Template -->
<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    body { font-family: 'Helvetica', sans-serif; padding: 30px; color: #333; }
    .header { border-bottom: 3px double #d9251c; padding-bottom: 10px; margin-bottom: 20px; }
    .title { font-size: 24px; font-weight: bold; color: #1d4ed8; text-transform: uppercase; }
    .meta-box { background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px; }
    .accused-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .accused-table th, .accused-table td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
    .accused-table th { background-color: #e2e8f0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">Official Crime Intelligence Brief</div>
    <div>Karnataka State Police Department</div>
  </div>
  <div class="meta-box">
    <strong>FIR ID:</strong> {{fir_number}}<br>
    <strong>Jurisdiction:</strong> {{district}} District<br>
    <strong>Classification:</strong> RESTRICTED (Official Use Only)
  </div>
  <h3>Accused Profiles</h3>
  <table class="accused-table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Age</th>
        <th>Risk Assessment</th>
        <th>Affiliation</th>
      </tr>
    </thead>
    <tbody>
      {% for offender in accused_list %}
      <tr>
        <td><strong>{{offender.name}}</strong></td>
        <td>{{offender.age}}</td>
        <td>{{offender.risk_score}}</td>
        <td>{{offender.gang_affiliation or 'None'}}</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>
</body>
</html>`,
    dataverse: `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CCTNS_Dataverse_Mapping",
  "type": "object",
  "properties": {
    "entity_name": { "type": "string", "const": "CriminalRegistry" },
    "fields_mapping": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "source_field": { "type": "string" },
          "target_field": { "type": "string" },
          "data_type": { "type": "string", "enum": ["VARCHAR", "INT", "FLOAT", "DATETIME"] }
        },
        "required": ["source_field", "target_field", "data_type"]
      }
    }
  },
  "default": {
    "entity_name": "CriminalRegistry",
    "fields_mapping": [
      { "source_field": "fir_number", "target_field": "case_id", "data_type": "VARCHAR" },
      { "source_field": "crime_type", "target_field": "classification", "data_type": "VARCHAR" },
      { "source_field": "district", "target_field": "region", "data_type": "VARCHAR" },
      { "source_field": "risk_score", "target_field": "threat_index", "data_type": "FLOAT" }
    ]
  }
}`
  };

  useEffect(() => {
    fetchStats();
  }, [timeFilter]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getSmartBrowzStats(timeFilter, userId, role);
      if (response.success) {
        setStatsData(response.stats);
      } else {
        setError(response.error || 'Failed to load SmartBrowz data');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while contacting backend API');
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async () => {
    if (simulating) return;
    setSimulating(true);
    setSimStatus('running');
    setSimTerminalLogs([`[INIT] Preparing to launch simulated action: ${selectedSimAction.toUpperCase()}...`]);

    try {
      const response = await api.triggerSmartBrowzAction(selectedSimAction, userId, role);
      
      // Simulate real-time terminal output stream line-by-line
      let currentLine = 0;
      const totalLines = response.logOutput.length;
      
      const interval = setInterval(() => {
        if (currentLine < totalLines) {
          setSimTerminalLogs(prev => [...prev, response.logOutput[currentLine]]);
          currentLine++;
        } else {
          clearInterval(interval);
          setSimulating(false);
          setSimStatus(response.success ? 'success' : 'failed');
          // Reload dashboard stats to see the new log reflected
          fetchStats();
        }
      }, 500);

    } catch (err: any) {
      console.error(err);
      setSimTerminalLogs(prev => [...prev, `[CRITICAL ERROR] Connection to SmartBrowz agent failed: ${err.message}`]);
      setSimulating(false);
      setSimStatus('failed');
    }
  };

  const openCodeEditor = (type: 'browser_logic' | 'templates' | 'dataverse') => {
    setEditorContent(MOCK_CODES[type]);
    setActiveModal(type);
  };

  const saveCodeEditor = () => {
    alert('SmartBrowz configuration saved successfully! Schema synchronized.');
    setActiveModal('none');
  };

  // Filter logs locally based on search query
  const filteredLogs = statsData?.recentLogs.filter((log: SmartBrowzLog) => {
    const query = searchQuery.toLowerCase();
    return (
      log.feature.toLowerCase().includes(query) ||
      log.category.toLowerCase().includes(query) ||
      log.status.toLowerCase().includes(query) ||
      log.details.toLowerCase().includes(query)
    );
  }) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      
      {/* 1. Left Sidebar Navigation Container */}
      <div className="lg:col-span-3 bg-[#0f172a]/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-6 shadow-xl h-fit">
        
        {/* Sidebar Brand Header */}
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/10">
            <Globe size={18} className="animate-pulse" />
          </div>
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-blue-500 block">Catalyst Service</span>
            <h2 className="text-sm font-black text-white uppercase tracking-wide">SmartBrowz</h2>
          </div>
        </div>

        {/* Browser Control Section */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block px-2">Browser Control</span>
          <div className="space-y-1">
            <button 
              onClick={() => openCodeEditor('browser_logic')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-900 border border-slate-800/40 hover:border-slate-700/60 rounded-lg transition cursor-pointer group"
            >
              <span className="flex items-center gap-2">
                <Globe size={13} className="text-slate-500 group-hover:text-blue-400" /> Headless Browser
              </span>
              <ChevronRight size={12} className="text-slate-600" />
            </button>
            <button 
              onClick={() => openCodeEditor('browser_logic')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-900 border border-slate-800/40 hover:border-slate-700/60 rounded-lg transition cursor-pointer group"
            >
              <span className="flex items-center gap-2">
                <Code2 size={13} className="text-slate-500 group-hover:text-blue-400" /> Browser Logic
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/20 text-blue-400 border border-blue-800/20 uppercase font-bold">Script</span>
            </button>
          </div>
        </div>

        {/* Convert Section */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block px-2">Convert API</span>
          <div className="space-y-1">
            <button 
              onClick={() => setSelectedSimAction('pdf_convert')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-900 border border-slate-800/40 hover:border-slate-700/60 rounded-lg transition cursor-pointer group"
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet size={13} className="text-slate-500 group-hover:text-blue-400" /> PDF & Screenshot
              </span>
              <ChevronRight size={12} className="text-slate-600" />
            </button>
            <button 
              onClick={() => openCodeEditor('templates')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-900 border border-slate-800/40 hover:border-slate-700/60 rounded-lg transition cursor-pointer group"
            >
              <span className="flex items-center gap-2">
                <FileCode size={13} className="text-slate-500 group-hover:text-blue-400" /> Templates
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/20 text-blue-400 border border-blue-800/20 uppercase font-bold">HTML</span>
            </button>
          </div>
        </div>

        {/* Data Section */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block px-2">Data Registry</span>
          <div className="space-y-1">
            <button 
              onClick={() => openCodeEditor('dataverse')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-900 border border-slate-800/40 hover:border-slate-700/60 rounded-lg transition cursor-pointer group"
            >
              <span className="flex items-center gap-2">
                <Database size={13} className="text-slate-500 group-hover:text-blue-400" /> Dataverse
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase font-extrabold tracking-wider">Beta</span>
            </button>
          </div>
        </div>

        {/* Secondary Info / Help Links */}
        <div className="mt-auto pt-6 border-t border-slate-800 space-y-2 text-slate-500 text-[11px] font-medium">
          <div className="flex items-center gap-2 px-2 hover:text-slate-300 cursor-pointer">
            <Sliders size={12} />
            <span>Service Gateway Active</span>
          </div>
          <div className="flex items-center gap-2 px-2 hover:text-slate-300 cursor-pointer" onClick={() => alert('SmartBrowz matches headless chromium logic clusters with secure datastores to render case PDF files.')}>
            <HelpCircle size={12} />
            <span>System Help & Docs</span>
          </div>
        </div>

      </div>

      {/* 2. Main Analytics & Dashboard Container */}
      <div className="lg:col-span-9 space-y-6">
        
        {/* Top Header & Time Filter Selection */}
        <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 bg-slate-900/40 border border-slate-800 rounded-xl p-4 shadow-md">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Globe className="text-blue-500" /> SmartBrowz Management Console
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Headless browser rendering telemetry and conversion workload statistics</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Interval:</span>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-1 flex">
              <button 
                onClick={() => setTimeFilter('24h')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                  timeFilter === '24h' 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                Last 24 Hours
              </button>
              <button 
                onClick={() => setTimeFilter('7d')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                  timeFilter === '7d' 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                7 Days
              </button>
              <button 
                onClick={() => setTimeFilter('30d')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                  timeFilter === '30d' 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                30 Days
              </button>
            </div>
            
            <button 
              onClick={fetchStats}
              disabled={loading}
              className="p-2.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:text-slate-600 hover:border-slate-700/60 rounded-lg cursor-pointer transition flex items-center justify-center shadow"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Error or Loading state */}
        {error && (
          <div className="bg-red-950/20 border border-red-900/40 text-red-400 rounded-xl p-4 text-xs font-semibold flex items-center gap-2">
            <XCircle size={16} />
            <span>Telemetry link error: {error}</span>
          </div>
        )}

        {/* KPI metrics grid */}
        {loading && !statsData ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="card-panel border-slate-800 rounded-xl p-5 text-center animate-pulse">
                <div className="h-3 w-20 bg-slate-800 rounded mx-auto mb-2" />
                <div className="h-6 w-16 bg-slate-850 rounded mx-auto" />
              </div>
            ))}
          </div>
        ) : statsData ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI Card 1: Total Requests */}
            <div className="card-panel border-slate-850 rounded-xl p-5 hover:border-slate-700 transition flex items-center gap-4 bg-slate-900/20">
              <div className="h-10 w-10 rounded-lg bg-blue-900/30 border border-blue-800/40 flex items-center justify-center text-blue-400 shrink-0">
                <Globe size={18} />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-black tracking-widest">Total Requests</span>
                <strong className="text-xl text-white block mt-0.5 font-mono">{statsData.total}</strong>
              </div>
            </div>

            {/* KPI Card 2: Success Rate */}
            <div className="card-panel border-slate-850 rounded-xl p-5 hover:border-slate-700 transition flex items-center gap-4 bg-slate-900/20">
              <div className={`h-10 w-10 rounded-lg border flex items-center justify-center shrink-0 ${
                statsData.successRate >= 95 
                  ? 'bg-emerald-900/30 border-emerald-800/40 text-emerald-400' 
                  : 'bg-amber-900/30 border-amber-800/40 text-amber-400'
              }`}>
                {statsData.successRate >= 95 ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-black tracking-widest">Success Rate</span>
                <strong className={`text-xl block mt-0.5 font-mono ${
                  statsData.successRate >= 95 ? 'text-emerald-400' : 'text-amber-400'
                }`}>{statsData.successRate}%</strong>
              </div>
            </div>

            {/* KPI Card 3: Avg Latency */}
            <div className="card-panel border-slate-850 rounded-xl p-5 hover:border-slate-700 transition flex items-center gap-4 bg-slate-900/20">
              <div className="h-10 w-10 rounded-lg bg-indigo-900/30 border border-indigo-800/40 flex items-center justify-center text-indigo-400 shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-black tracking-widest">Avg Latency</span>
                <strong className="text-xl text-white block mt-0.5 font-mono">
                  {statsData.avgLatency > 1000 
                    ? `${(statsData.avgLatency / 1000).toFixed(2)}s` 
                    : `${statsData.avgLatency}ms`
                  }
                </strong>
              </div>
            </div>

            {/* KPI Card 4: Total Size */}
            <div className="card-panel border-slate-850 rounded-xl p-5 hover:border-slate-700 transition flex items-center gap-4 bg-slate-900/20">
              <div className="h-10 w-10 rounded-lg bg-purple-900/30 border border-purple-800/40 flex items-center justify-center text-purple-400 shrink-0">
                <Database size={18} />
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-black tracking-widest">Data Generated</span>
                <strong className="text-xl text-white block mt-0.5 font-mono">
                  {statsData.totalSize > 1024 
                    ? `${(statsData.totalSize / 1024).toFixed(1)} MB` 
                    : `${statsData.totalSize} KB`
                  }
                </strong>
              </div>
            </div>
          </div>
        ) : null}

        {/* Charts & Categorized Workloads row */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Workload trend chart */}
          <div className="xl:col-span-8 space-y-3">
            <div className="flex items-center gap-2 px-1 text-slate-400">
              <BarChart3 size={15} />
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Workload Request Volume History</span>
            </div>
            
            <div className="card-panel border-slate-800 rounded-xl p-4 bg-slate-950/40 h-80 relative shadow-inner">
              {loading && !statsData ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs font-semibold">
                  Compiling trend telemetry...
                </div>
              ) : statsData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={statsData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis 
                      dataKey="time" 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        borderColor: '#475569', 
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#cbd5e1'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="requests" 
                      name="Successful"
                      stroke="#2563eb" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorRequests)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="failed" 
                      name="Failed"
                      stroke="#dc2626" 
                      strokeWidth={1.5}
                      fillOpacity={1} 
                      fill="url(#colorFailed)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs font-semibold">
                  No telemetry logged in interval
                </div>
              )}
            </div>
          </div>

          {/* Sub-features success details */}
          <div className="xl:col-span-4 space-y-3">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400 block px-1">Sub-Component Analysis</span>
            
            <div className="card-panel border-slate-800 rounded-xl p-4 bg-slate-900/10 space-y-4 shadow-sm h-80 overflow-y-auto">
              {loading && !statsData ? (
                [1, 2, 3].map(n => (
                  <div key={n} className="space-y-1.5 animate-pulse">
                    <div className="h-3 w-28 bg-slate-800 rounded" />
                    <div className="h-2 w-full bg-slate-850 rounded" />
                  </div>
                ))
              ) : statsData && statsData.features.length > 0 ? (
                statsData.features.map((feat, idx) => {
                  // Percentage calculation for relative load
                  const pctLoad = Math.min(100, Math.round((feat.count / (statsData.total || 1)) * 100));
                  return (
                    <div key={idx} className="space-y-1 bg-slate-950/20 p-2.5 rounded-lg border border-slate-850">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-200">{feat.feature}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{feat.category}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-850 rounded-full overflow-hidden mt-1.5">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${pctLoad}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 font-semibold">
                        <span>Load: {pctLoad}% ({feat.count} reqs)</span>
                        <span className={feat.successRate >= 95 ? 'text-emerald-500' : 'text-amber-500'}>
                          SLA: {feat.successRate}%
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 text-center text-xs py-10 font-semibold">
                  No operational records found.
                </div>
              )}
            </div>

          </div>

        </div>

        {/* SmartBrowz interactive simulation terminal */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Controls Panel */}
          <div className="xl:col-span-4 space-y-3">
            <div className="flex items-center gap-1.5 px-1 text-slate-400">
              <Sliders size={14} />
              <span className="text-xs uppercase font-extrabold tracking-wider">Browser Workload Simulator</span>
            </div>
            
            <div className="card-panel border-slate-800 rounded-xl p-4 bg-slate-900/30 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Target Simulator Module</label>
                <select
                  value={selectedSimAction}
                  onChange={(e) => setSelectedSimAction(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2.5 focus:border-blue-500 focus:outline-none cursor-pointer font-semibold"
                >
                  <option value="headless_run">Headless Browser run (Chromium rendering)</option>
                  <option value="browser_logic">Browser Logic automation script</option>
                  <option value="pdf_convert">PDF & Screenshot conversion</option>
                  <option value="screenshot">Screenshot captures (Leaflet rasterization)</option>
                  <option value="template_render">HTML Templates compilations</option>
                  <option value="dataverse_sync">Dataverse database schema synchronizations</option>
                </select>
              </div>

              <div className="text-slate-400 text-[11px] leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-850 font-medium">
                Executing triggers realistic operations telemetry in the datastore, updating aggregated statistics and trend graphs dynamically.
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={simulating}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-850 disabled:text-slate-600 text-white text-xs font-extrabold uppercase tracking-widest rounded-lg shadow-md hover:shadow-blue-500/10 cursor-pointer disabled:cursor-not-allowed transition duration-150"
              >
                <Play size={13} fill="currentColor" /> {simulating ? 'Running Sandbox Session...' : 'Execute Simulator Task'}
              </button>
            </div>
          </div>

          {/* Terminal Console Stream Panel */}
          <div className="xl:col-span-8 space-y-3">
            <div className="flex items-center justify-between px-1 text-slate-400">
              <span className="text-xs uppercase font-extrabold tracking-wider flex items-center gap-2">
                <Terminal size={14} className="text-blue-400" /> Command Line stdout stream
              </span>
              {simStatus !== 'idle' && (
                <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                  simStatus === 'running' ? 'bg-blue-900/30 text-blue-400 animate-pulse border border-blue-800/30' :
                  simStatus === 'success' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/30' :
                  'bg-red-900/30 text-red-400 border border-red-800/30'
                }`}>
                  {simStatus}
                </span>
              )}
            </div>
            
            <div className="bg-slate-950 rounded-xl p-4 h-52 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1.5 border border-slate-800 shadow-inner">
              {simTerminalLogs.map((log, index) => (
                <div key={index} className="leading-relaxed">
                  <span className="text-blue-500 font-bold">&gt;</span> {log}
                </div>
              ))}
              {simTerminalLogs.length === 0 && (
                <div className="text-slate-600 italic py-16 text-center select-none">
                  Awaiting simulated process deployment. Choose a module and execute...
                </div>
              )}
              {simulating && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-ping" />
                  <span>Streaming stdout packet feeds...</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Database Recent Operations logs table */}
        <div className="space-y-3">
          
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400 block px-1">Raw Database Operations Feed</span>
            
            {/* Search Input bar */}
            <div className="relative w-full md:w-72">
              <input 
                type="text" 
                placeholder="Search log details, status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
              />
              <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
            </div>
          </div>

          <div className="card-panel border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs table-zebra">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Feature</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Latency</th>
                    <th className="p-3 text-right">Payload Size</th>
                    <th className="p-3 pl-6">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300 font-medium">
                  {loading && statsData === null ? (
                    [1, 2, 3].map(n => (
                      <tr key={n} className="animate-pulse">
                        <td className="p-3"><div className="h-3 w-28 bg-slate-800 rounded" /></td>
                        <td className="p-3"><div className="h-3 w-16 bg-slate-800 rounded" /></td>
                        <td className="p-3"><div className="h-3 w-20 bg-slate-800 rounded" /></td>
                        <td className="p-3"><div className="h-3.5 w-12 bg-slate-800 rounded" /></td>
                        <td className="p-3"><div className="h-3 w-10 bg-slate-850 rounded ml-auto" /></td>
                        <td className="p-3"><div className="h-3 w-12 bg-slate-850 rounded ml-auto" /></td>
                        <td className="p-3 pl-6"><div className="h-3 w-48 bg-slate-800 rounded" /></td>
                      </tr>
                    ))
                  ) : filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="transition duration-150">
                        {/* Timestamp */}
                        <td className="p-3 font-mono text-[10px] text-slate-400">
                          {new Date(log.timestamp.replace(' ', 'T') + 'Z').toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                          })}
                        </td>
                        {/* Category */}
                        <td className="p-3 text-slate-400 font-semibold">{log.category}</td>
                        {/* Feature */}
                        <td className="p-3"><span className="text-white font-bold">{log.feature}</span></td>
                        {/* Status tag */}
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            log.status === 'SUCCESS' 
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                              : 'bg-red-950/40 text-red-400 border border-red-900/30'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        {/* Latency */}
                        <td className="p-3 text-right font-mono text-slate-300">
                          {log.latency_ms > 1000 
                            ? `${(log.latency_ms / 1000).toFixed(2)}s` 
                            : `${log.latency_ms}ms`
                          }
                        </td>
                        {/* Payload size */}
                        <td className="p-3 text-right font-mono text-slate-400">
                          {log.size_kb ? `${log.size_kb} KB` : '—'}
                        </td>
                        {/* Details */}
                        <td className="p-3 pl-6 text-slate-400 italic font-semibold max-w-xs truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-semibold italic">
                        No operations logs matched the query filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Simulated Code/Schema Configuration Modal */}
      {activeModal !== 'none' && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Code2 className="text-blue-500" size={16} />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  {activeModal === 'browser_logic' ? 'Edit Headless Script: auth_verification.js' :
                   activeModal === 'templates' ? 'Edit Brief Template: report_format.jinja2' :
                   'Edit Integration Schema: dataverse_mapping.json'}
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal('none')}
                className="p-1 hover:bg-slate-800 text-slate-500 hover:text-slate-300 rounded-full transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Textarea Editor */}
            <div className="flex-1 p-4 bg-slate-950 font-mono text-xs">
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="w-full h-full bg-slate-950 text-slate-300 border-none outline-none resize-none font-mono focus:ring-0 leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-900/60 border-t border-slate-850 flex justify-end gap-2.5">
              <button
                onClick={() => setActiveModal('none')}
                className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Discard
              </button>
              <button
                onClick={saveCodeEditor}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
              >
                <Save size={13} /> Sync & Compile
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
