import { useState, useEffect } from 'react';
import { InvestigatorDashboard } from './pages/InvestigatorDashboard';
import { AnalystDashboard } from './pages/AnalystDashboard';
import { SupervisorDashboard } from './pages/SupervisorDashboard';
import { PolicymakerDashboard } from './pages/PolicymakerDashboard';
import { SmartBrowzDashboard } from './pages/SmartBrowzDashboard';
import { LoginScreen } from './components/LoginScreen/LoginScreen';
import { CollaborativeWorkspace } from './components/CollaborativeWorkspace/CollaborativeWorkspace';
import { Clock, LogOut, RefreshCw, Database, ShieldAlert, Phone, Globe, Shield } from 'lucide-react';
import { api } from './services/api';
import './App.css';

type UserRole = 'Investigator' | 'Analyst' | 'Supervisor' | 'Policymaker';

const ROLE_LABELS: Record<UserRole, { rank: string; name: string }> = {
  Investigator: { rank: 'SI', name: 'Meera Nair' },
  Analyst: { rank: 'DA', name: 'Priya Sharma' },
  Supervisor: { rank: 'ACP', name: 'Raghavendra K.' },
  Policymaker: { rank: 'DGP', name: 'Srinivas M.' },
};

function App() {
  const [activeRole, setActiveRole] = useState<UserRole | null>(() => {
    return (localStorage.getItem('ksp_user_role') as UserRole) || null;
  });
  const [userId, setUserId] = useState<string | null>(() => {
    return localStorage.getItem('ksp_user_id') || null;
  });
  const [mfaVerified, setMfaVerified] = useState<boolean>(() => {
    return localStorage.getItem('ksp_mfa_verified') === 'true';
  });
  
  const [currentTime, setCurrentTime] = useState(new Date());

  // CCTNS Sync Simulator States
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'workspace' | 'smartbrowz'>('dashboard');
  const [toastAlert, setToastAlert] = useState<{ show: boolean; suspect: string; tower: string; fir: string } | null>(null);
  
  // Geofence Navigation Helper States
  const [analystSubTab, setAnalystSubTab] = useState<'intel' | 'cdr'>('intel');
  const [analystSuspect, setAnalystSuspect] = useState<string>('Rupa Naik');

  // Web Audio API Geofence Siren Chime
  const playGeofenceAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.05, audioCtx.currentTime);
      osc1.start();
      
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.setValueAtTime(1760, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc2.start();
        
        setTimeout(() => {
          osc2.stop();
          audioCtx.close();
        }, 150);
      }, 100);

      setTimeout(() => {
        osc1.stop();
      }, 250);
    } catch (e) {
      console.warn("Audio Context alert blocked or failed:", e);
    }
  };

  // Geofence simulation loop
  useEffect(() => {
    if (!userId || !activeRole) return;

    const interval = setInterval(() => {
      // 15% chance of alert trigger every 20 seconds
      if (Math.random() > 0.85 && !toastAlert) {
        const suspects = ['Rupa Naik', 'Ramesh Kumar', 'Amit Verma'];
        const chosenSuspect = suspects[Math.floor(Math.random() * suspects.length)];
        const towers: Record<string, { tower: string; fir: string }> = {
          'Rupa Naik': { tower: 'MG Road Metro Station', fir: 'FIR-2026-003' },
          'Ramesh Kumar': { tower: 'Keshwapur Tower B', fir: 'FIR-2026-004' },
          'Amit Verma': { tower: 'Silk Board Crossing', fir: 'FIR-2026-001' }
        };
        const activeTower = towers[chosenSuspect];

        setToastAlert({
          show: true,
          suspect: chosenSuspect,
          tower: activeTower.tower,
          fir: activeTower.fir
        });

        playGeofenceAlertSound();

        // Auto-dismiss after 10 seconds if not clicked
        setTimeout(() => {
          setToastAlert(null);
        }, 10000);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [userId, activeRole, toastAlert]);

  const handleInspectGeofence = (suspect: string) => {
    setActiveRole('Analyst' as UserRole);
    setAnalystSubTab('cdr');
    setAnalystSuspect(suspect);
    setActiveTab('dashboard'); // Switch back to Dashboard Desk
    setToastAlert(null);
  };

  const handleLoginSuccess = (uid: string, urole: string) => {
    setUserId(uid);
    setActiveRole(urole as UserRole);
    setMfaVerified(true);
    localStorage.setItem('ksp_user_id', uid);
    localStorage.setItem('ksp_user_role', urole);
    localStorage.setItem('ksp_mfa_verified', 'true');
  };

  const handleLogout = () => {
    setUserId(null);
    setActiveRole(null);
    setMfaVerified(false);
    localStorage.removeItem('ksp_user_id');
    localStorage.removeItem('ksp_user_role');
    localStorage.removeItem('ksp_mfa_verified');
    localStorage.removeItem('ksp_jwt_token');
  };

  const startRealSync = async () => {
    setIsSyncing(true);
    setSyncProgress(10);
    setSyncLogs(["[INFO] Handshake request dispatched to CCTNS main frame..."]);
    
    try {
      setSyncProgress(30);
      setSyncLogs(prev => [...prev, "[INFO] Establishing secure end-to-end tunnel..."]);
      
      const res = await api.triggerCctnsSync('Manual', userId || 'INV-1001', activeRole || 'Investigator');
      
      setSyncProgress(70);
      setSyncLogs(prev => [...prev, `[INFO] Synchronizing records... Status: ${res.job.status}`]);
      
      if (res.success) {
        setSyncProgress(100);
        setSyncLogs(prev => [
          ...prev,
          `[SUCCESS] Sync complete: ${res.job.records_ingested} records/warrants ingested.`,
          `[INFO] Mode: ${res.job.mode}. Latency: ${res.job.latency_ms}ms.`
        ]);
      } else {
        setSyncProgress(100);
        setSyncLogs(prev => [
          ...prev,
          `[ERROR] Sync failed.`,
          ...(res.job.errors || [])
        ]);
      }
    } catch (err: any) {
      setSyncProgress(100);
      setSyncLogs(prev => [...prev, `[ERROR] Connection failed: ${err.message}`]);
    } finally {
      setIsSyncing(false);
    }
  };

  // Switch to Login screen if not authenticated, role is invalid, or JWT token is missing
  if (!userId || !activeRole || !mfaVerified || !ROLE_LABELS[activeRole] || !localStorage.getItem('ksp_jwt_token')) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const roleInfo = ROLE_LABELS[activeRole];

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-[#1e3a5f] flex flex-col font-sans relative">
      
      {/* Geofence sliding toast alert */}
      {toastAlert && toastAlert.show && (
        <div className="fixed top-24 right-6 z-[9999] max-w-sm w-full bg-[#d9251c] border border-red-700 rounded-xl shadow-2xl text-white p-4 font-sans animate-pulse">
          <div className="flex gap-3 items-start">
            <div className="bg-white/20 p-2 rounded-lg text-white">
              <ShieldAlert size={20} className="animate-pulse" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="font-bold text-xs uppercase tracking-wider flex justify-between items-center">
                <span>🚨 Critical Geofence Breach</span>
                <span className="text-[9px] bg-white text-[#d9251c] font-extrabold px-1.5 py-0.5 rounded uppercase">Live Alert</span>
              </div>
              <p className="text-xs font-semibold leading-relaxed">
                Suspect <strong>{toastAlert.suspect}</strong> just pinged near <strong>{toastAlert.tower}</strong> (associated with <strong>{toastAlert.fir}</strong>).
              </p>
              <div className="flex gap-2 pt-1.5 border-t border-white/20">
                <button
                  onClick={() => handleInspectGeofence(toastAlert.suspect)}
                  className="px-2.5 py-1 bg-white text-[#d9251c] hover:bg-slate-50 font-bold text-[10px] uppercase rounded-lg shadow-sm cursor-pointer transition"
                >
                  Inspect Trajectory
                </button>
                <button
                  onClick={() => setToastAlert(null)}
                  className="px-2.5 py-1 bg-transparent hover:bg-white/10 text-white font-bold text-[10px] uppercase rounded-lg cursor-pointer transition border border-white/20"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* GOVERNMENT UTILITY BAR — Top dark strip                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="govt-utility-bar">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-400">Official Website of Government of Karnataka</span>
            <a href="https://ksp.karnataka.gov.in" target="_blank" rel="noopener" className="text-[10px] text-[#d4a843] hover:text-white transition hidden sm:inline">ksp.karnataka.gov.in</a>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <Phone size={10} />
              <span>Emergency: <strong className="text-white">112</strong></span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <Globe size={10} className="text-slate-400" />
              <span className="text-slate-400">English</span>
            </div>
          </div>
        </div>
      </div>

      {/* Indian Tricolor Bar */}
      <div className="tricolor-bar">
        <div className="saffron" />
        <div className="white" />
        <div className="green" />
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* OFFICIAL HEADER — White with KSP emblem & bilingual title  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header className="govt-header px-4 py-3 sticky top-0 z-[2000]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          
          {/* Emblem & Bilingual Title */}
          <div className="flex items-center gap-3">
            <img src="/emblem.png" alt="KSP Emblem" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="text-[13px] font-bold tracking-wide text-[#1e3a5f] uppercase" style={{ fontFamily: "'Noto Sans Kannada', sans-serif" }}>
                ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್
              </h1>
              <h2 className="text-[12px] font-bold tracking-wider text-[#1e3a5f] uppercase">
                Karnataka State Police
              </h2>
              <span className="text-[10px] text-[#6c757d] font-semibold block">
                Crime Intelligence & Analytics Division — Government of Karnataka
              </span>
            </div>
          </div>

          {/* Right Section: Clock + Status + User */}
          <div className="flex items-center gap-3 flex-wrap justify-end">
            
            {/* Date & Time */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-[#6c757d] font-mono font-medium">
              <Clock size={12} className="text-[#1e3a5f]" />
              <span>
                {currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                {' · '}
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px h-6 bg-[#d1d9e6]"></div>

            {/* CCTNS Status indicator */}
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 text-[11px] text-emerald-700 font-bold uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="hidden sm:inline">CCTNS Link: Connected</span>
              <span className="sm:hidden">CCTNS Active</span>
            </div>

            {/* Sync Button */}
            <button
              onClick={() => {
                setShowSyncModal(true);
                startRealSync();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#2a4a73] text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw size={12} className="shrink-0" />
              <span>Sync CCTNS</span>
            </button>

            {/* Divider */}
            <div className="hidden lg:block w-px h-6 bg-[#d1d9e6]"></div>

            {/* Active Role Portal Tag */}
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-[#1e3a5f] font-bold uppercase tracking-wider">
              <Shield size={13} className="text-[#d4a843] shrink-0" />
              <span>{activeRole} Portal</span>
            </div>

            {/* User Badge */}
            <div className="flex items-center gap-2 text-xs">
              <div className="h-7 w-7 rounded-md bg-[#1e3a5f] flex items-center justify-center text-[10px] font-bold text-white">
                {roleInfo.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="hidden sm:block">
                <span className="font-semibold text-[#1e3a5f] block text-[11px]">{roleInfo.rank} {roleInfo.name}</span>
                <span className="text-[10px] text-[#6c757d]">Badge: {userId}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-[#d1d9e6]"></div>

            {/* Logout Trigger */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#d9251c] border border-red-200 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <LogOut size={13} className="shrink-0" />
              <span>Logout</span>
            </button>
          </div>

        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* NAVIGATION BAR — Navy blue with white text tabs             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <nav className="govt-nav print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex gap-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'dashboard' ? 'active' : ''
            }`}
          >
            📊 Command Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'workspace' ? 'active' : ''
            }`}
          >
            🤝 Collaborative Station Workspace
          </button>

          <button
            onClick={() => setActiveTab('smartbrowz')}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'smartbrowz' ? 'active' : ''
            }`}
          >
            🌐 SmartBrowz Console
          </button>
        </div>
      </nav>

      {/* Classification Banner */}
      <div className="classification-banner">
        ಅಧಿಕೃತ ಬಳಕೆಗೆ ಮಾತ್ರ • Restricted — For Official Use Only • Karnataka State Police
      </div>

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-4">

        {activeTab === 'workspace' ? (
          <CollaborativeWorkspace 
            userId={userId} 
            role={activeRole} 
            onFirSelect={() => setActiveTab('dashboard')}
            onAccusedSelect={() => setActiveTab('dashboard')}
          />
        ) : activeTab === 'smartbrowz' ? (
          <SmartBrowzDashboard 
            userId={userId}
            role={activeRole}
          />
        ) : (
          <>
            {activeRole === 'Investigator' && (
              <InvestigatorDashboard userId={userId} role={activeRole} />
            )}
            {activeRole === 'Analyst' && (
              <AnalystDashboard 
                userId={userId} 
                role={activeRole} 
                initialSubTab={analystSubTab}
                initialSuspect={analystSuspect}
              />
            )}
            {activeRole === 'Supervisor' && (
              <SupervisorDashboard userId={userId} role={activeRole} />
            )}
            {activeRole === 'Policymaker' && (
              <PolicymakerDashboard userId={userId} role={activeRole} />
            )}
          </>
        )}

      </main>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* OFFICIAL FOOTER — Dark navy with government credits         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <footer className="govt-footer py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px]">
            
            {/* Column 1: KSP Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <img src="/emblem.png" alt="KSP" className="h-8 w-auto object-contain opacity-80" />
                <div>
                  <span className="font-bold text-white text-xs block">Karnataka State Police</span>
                  <span className="text-slate-400 text-[10px]">ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್</span>
                </div>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Crime Intelligence & Analytics Division<br />
                Government of Karnataka
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-2">
              <span className="font-bold text-[#d4a843] text-[10px] uppercase tracking-wider block mb-2">Quick Links</span>
              <div className="grid grid-cols-2 gap-1 text-slate-400">
                <a href="https://ksp.karnataka.gov.in" target="_blank" rel="noopener" className="hover:text-white transition">KSP Official Portal</a>
                <a href="https://www.karnataka.gov.in" target="_blank" rel="noopener" className="hover:text-white transition">Government of Karnataka</a>
                <a href="#" className="hover:text-white transition">CCTNS Dashboard</a>
                <a href="#" className="hover:text-white transition">e-FIR Portal</a>
                <a href="#" className="hover:text-white transition">Court Connect</a>
                <a href="#" className="hover:text-white transition">Prison Connect</a>
              </div>
            </div>

            {/* Column 3: Contact */}
            <div className="space-y-2">
              <span className="font-bold text-[#d4a843] text-[10px] uppercase tracking-wider block mb-2">Emergency Contact</span>
              <div className="text-slate-400 space-y-1">
                <p>Police Control Room: <strong className="text-white">100</strong></p>
                <p>Emergency Helpline: <strong className="text-white">112</strong></p>
                <p>Women Helpline: <strong className="text-white">1091</strong></p>
                <p>Child Helpline: <strong className="text-white">1098</strong></p>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-slate-700 mt-5 pt-4 flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] text-slate-500">
            <span>&copy; {new Date().getFullYear()} Karnataka State Police. Crime Intelligence & Analytics Division. v2.0.0</span>
            <span>Designed & Developed for KSP — Powered by CCTNS & NIC</span>
          </div>
        </div>
      </footer>

      {/* CCTNS Database Handshake Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[5000] p-4 font-sans">
          <div className="w-full max-w-lg bg-white border border-[#d1d9e6] rounded-xl shadow-2xl relative overflow-hidden flex flex-col">
            
            {/* Modal Header — Navy */}
            <div className="flex items-center gap-3 bg-[#1e3a5f] px-6 py-4">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Database size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase">CCTNS Sync Terminal</h3>
                <p className="text-[10px] text-blue-200 font-semibold uppercase mt-0.5">National Crime & Criminal Tracking Network System</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#4a5568] font-bold">
                  <span>Database Sync Status</span>
                  <span>{syncProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-[#eef2f7] rounded-full overflow-hidden border border-[#d1d9e6]">
                  <div 
                    className="h-full bg-[#1e3a5f] transition-all duration-300 rounded-full"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              </div>

              {/* Simulated Log Output Screen — Dark terminal preserved */}
              <div className="bg-[#0d2137] rounded-lg p-4 h-48 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-2 border border-[#1e3a5f]">
                {syncLogs.map((log, index) => (
                  <div key={index} className="leading-relaxed">
                    <span className="text-[#d4a843]">&gt;</span> {log}
                  </div>
                ))}
                {isSyncing && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-ping" />
                    <span>Awaiting packet stream...</span>
                  </div>
                )}
              </div>

              {/* Modal Controls */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowSyncModal(false)}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a73] disabled:bg-[#d1d9e6] disabled:text-[#6c757d] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSyncing ? 'Synchronizing...' : 'Close Terminal'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
