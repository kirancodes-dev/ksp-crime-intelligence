import { useState, useEffect } from 'react';
import { InvestigatorDashboard } from './pages/InvestigatorDashboard';
import { AnalystDashboard } from './pages/AnalystDashboard';
import { SupervisorDashboard } from './pages/SupervisorDashboard';
import { PolicymakerDashboard } from './pages/PolicymakerDashboard';
import { SmartBrowzDashboard } from './pages/SmartBrowzDashboard';
import { LoginScreen } from './components/LoginScreen/LoginScreen';
import { CollaborativeWorkspace } from './components/CollaborativeWorkspace/CollaborativeWorkspace';
import { Clock, UserCheck, LogOut, RefreshCw, Database, ShieldAlert } from 'lucide-react';
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
  };

  const startSyncSimulation = () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncLogs([]);
    
    const logs = [
      "[INFO] Handshake request dispatched to CCTNS main frame...",
      "[INFO] Connection approved. Establishing secure end-to-end tunnel...",
      "[INFO] Querying Karnataka State database for new incident logs...",
      "[SUCCESS] Found 14 new incidents in Bengaluru City.",
      "[SUCCESS] Ingested 3 financial hawala transactions for organized crimes.",
      "[INFO] Ingesting Mysuru and Mangaluru district criminal registry...",
      "[SUCCESS] Ingested 8 minor theft records and 4 cyber offences.",
      "[INFO] Re-training Zia AutoML recidivism risk parameters...",
      "[SUCCESS] Re-trained risk evaluations on 18 recidivists.",
      "[SUCCESS] System sync complete. Local datastore is 100% updated."
    ];
    
    logs.forEach((log, idx) => {
      setTimeout(() => {
        setSyncLogs(prev => [...prev, log]);
        setSyncProgress(Math.round(((idx + 1) / logs.length) * 100));
        
        if (idx === logs.length - 1) {
          setIsSyncing(false);
        }
      }, (idx + 1) * 700);
    });
  };

  // Switch to Login screen if not authenticated or role is invalid
  if (!userId || !activeRole || !mfaVerified || !ROLE_LABELS[activeRole]) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const roleInfo = ROLE_LABELS[activeRole];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col font-sans relative">
      
      {/* Geofence sliding toast alert */}
      {toastAlert && toastAlert.show && (
        <div className="fixed top-20 right-6 z-[9999] max-w-sm w-full bg-red-600 border border-red-500 rounded-xl shadow-2xl text-white p-4 font-sans animate-pulse">
          <div className="flex gap-3 items-start">
            <div className="bg-white/20 p-2 rounded-lg text-white">
              <ShieldAlert size={20} className="animate-pulse" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="font-bold text-xs uppercase tracking-wider flex justify-between items-center">
                <span>🚨 Critical Geofence breach</span>
                <span className="text-[9px] bg-white text-red-600 font-extrabold px-1.5 py-0.5 rounded uppercase">Live Alert</span>
              </div>
              <p className="text-xs font-semibold leading-relaxed">
                Suspect <strong>{toastAlert.suspect}</strong> just pinged near <strong>{toastAlert.tower}</strong> (associated with <strong>{toastAlert.fir}</strong>).
              </p>
              <div className="flex gap-2 pt-1.5 border-t border-white/20">
                <button
                  onClick={() => handleInspectGeofence(toastAlert.suspect)}
                  className="px-2.5 py-1 bg-white text-red-600 hover:bg-slate-50 font-bold text-[10px] uppercase rounded-lg shadow-sm cursor-pointer transition"
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
      
      {/* Classification Banner — always visible */}
      <div className="classification-banner">
        Restricted — For Official Use Only • Karnataka State Police
      </div>

      {/* State Colors Accent Bar (Karnataka Yellow & Red) */}
      <div className="h-[3px] w-full flex shrink-0">
        <div className="w-1/2 bg-[#ffd700]" />
        <div className="w-1/2 bg-[#d9251c]" />
      </div>

      {/* Official Header */}
      <header className="bg-[#0f172a] border-b border-slate-700 px-6 py-3 flex flex-col md:flex-row justify-between items-center gap-3 sticky top-0 z-[2000]">
        
        {/* Emblem & Title */}
        <div className="flex items-center gap-3">
          <img src="/emblem.png" alt="KSP Emblem" className="h-10 w-auto object-contain" />
          <div>
            <h1 className="text-sm font-bold tracking-wide text-white uppercase">
              Crime Intelligence Portal
            </h1>
            <span className="text-[11px] text-slate-400 font-medium block">
              Karnataka State Police — Crime Intelligence & Analytics Division
            </span>
          </div>
        </div>

        {/* Right Section: Clock + Role + User */}
        <div className="flex items-center gap-4">
          
          {/* Date & Time */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 font-mono font-medium">
            <Clock size={12} className="text-slate-400" />
            <span>
              {currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' · '}
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-6 bg-slate-600"></div>

          {/* CCTNS Status indicator */}
          <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-700/50 rounded-lg px-2.5 py-1 text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="hidden sm:inline">CCTNS Link: Connected</span>
            <span className="sm:hidden">CCTNS Active</span>
          </div>

          {/* Sync Button */}
          <button
            onClick={() => {
              setShowSyncModal(true);
              startSyncSimulation();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw size={12} className="shrink-0" />
            <span>Sync CCTNS</span>
          </button>

          {/* Divider */}
          <div className="hidden lg:block w-px h-6 bg-slate-600"></div>

          {/* Active Role Portal Tag */}
          <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-700/50 rounded-lg px-3 py-1.5 text-xs text-blue-400 font-bold uppercase tracking-wider">
            <UserCheck size={13} className="text-brand-gold shrink-0" />
            <span>{activeRole} Portal</span>
          </div>

          {/* User Badge */}
          <div className="flex items-center gap-2 text-xs">
            <div className="h-7 w-7 rounded-md bg-blue-900/40 border border-blue-700/50 flex items-center justify-center text-[10px] font-bold text-blue-400">
              {roleInfo.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="hidden sm:block">
              <span className="font-semibold text-slate-200 block text-[11px]">{roleInfo.rank} {roleInfo.name}</span>
              <span className="text-[10px] text-slate-400">Badge: {userId}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-slate-600"></div>

          {/* Logout Trigger */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-700/50 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <LogOut size={13} className="shrink-0" />
            <span>Logout</span>
          </button>
        </div>

      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
        
        {/* Navigation Tabs between Dashboard and Shared Workspace */}
        <div className="flex gap-2 border-b border-slate-700 pb-1.5 print:hidden">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider border-b-2 transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            📊 Command Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider border-b-2 transition cursor-pointer ${
              activeTab === 'workspace'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            🤝 Collaborative Station Workspace
          </button>

          <button
            onClick={() => setActiveTab('smartbrowz')}
            className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider border-b-2 transition cursor-pointer ${
              activeTab === 'smartbrowz'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            🌐 SmartBrowz Console
          </button>
        </div>

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

      {/* Footer */}
      <footer className="bg-[#0f172a] border-t border-slate-700 py-3 text-center text-[11px] text-slate-400 font-medium">
        &copy; 2026 Karnataka State Police. Crime Intelligence & Analytics Division. v2.0.0
      </footer>

      {/* CCTNS Database Handshake Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[5000] p-4 font-sans">
          <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 relative overflow-hidden flex flex-col gap-4">
            
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-900/40 flex items-center justify-center text-blue-400">
                <Database size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase">CCTNS Sync Terminal</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">National Crime & Criminal Tracking Network System</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400 font-bold">
                <span>Database Sync Status</span>
                <span>{syncProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                <div 
                  className="h-full bg-brand-primary transition-all duration-300 rounded-full"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
            </div>

            {/* Simulated Log Output Screen */}
            <div className="bg-slate-950 rounded-lg p-4 h-48 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-2 border border-slate-800">
              {syncLogs.map((log, index) => (
                <div key={index} className="leading-relaxed">
                  <span className="text-brand-primary">&gt;</span> {log}
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
              >
                {isSyncing ? 'Synchronizing...' : 'Close Terminal'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
