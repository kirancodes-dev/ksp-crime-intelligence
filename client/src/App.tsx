import { useState, useEffect } from 'react';
import { InvestigatorDashboard } from './pages/InvestigatorDashboard';
import { AnalystDashboard } from './pages/AnalystDashboard';
import { SupervisorDashboard } from './pages/SupervisorDashboard';
import { PolicymakerDashboard } from './pages/PolicymakerDashboard';
import { LoginScreen } from './components/LoginScreen/LoginScreen';
import { Shield, Clock, UserCheck, LogOut } from 'lucide-react';
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

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  // Switch to Login screen if not authenticated
  if (!userId || !activeRole || !mfaVerified) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const roleInfo = ROLE_LABELS[activeRole];

  return (
    <div className="min-h-screen bg-brand-dark text-slate-200 flex flex-col font-sans select-none">
      
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
      <header className="bg-[#0a0f1d] border-b border-brand-border px-6 py-3 flex flex-col md:flex-row justify-between items-center gap-3 sticky top-0 z-[2000]">
        
        {/* Emblem & Title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-brand-navy/30 border border-brand-navy/50 flex items-center justify-center text-brand-gold">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-white uppercase">
              Crime Intelligence Portal
            </h1>
            <span className="text-[11px] text-slate-500 font-medium block">
              Karnataka State Police — Crime Intelligence & Analytics Division
            </span>
          </div>
        </div>

        {/* Right Section: Clock + Role + User */}
        <div className="flex items-center gap-4">
          
          {/* Date & Time */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <Clock size={12} className="text-slate-500" />
            <span>
              {currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' · '}
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-6 bg-brand-border"></div>

          {/* Active Role Portal Tag */}
          <div className="flex items-center gap-2 bg-brand-navy/20 border border-brand-navy/40 rounded-lg px-3 py-1.5 text-xs text-brand-primary-light font-bold uppercase tracking-wider">
            <UserCheck size={13} className="text-brand-gold" />
            <span>{activeRole} Portal</span>
          </div>

          {/* User Badge */}
          <div className="flex items-center gap-2 text-xs">
            <div className="h-7 w-7 rounded-md bg-brand-navy/40 border border-brand-navy/60 flex items-center justify-center text-[10px] font-bold text-brand-primary-light">
              {roleInfo.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="hidden sm:block">
              <span className="font-semibold text-white block text-[11px]">{roleInfo.rank} {roleInfo.name}</span>
              <span className="text-[10px] text-slate-500">Badge: {userId}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-brand-border"></div>

          {/* Logout Trigger */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>

      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {activeRole === 'Investigator' && (
          <InvestigatorDashboard userId={userId} role={activeRole} />
        )}
        {activeRole === 'Analyst' && (
          <AnalystDashboard userId={userId} role={activeRole} />
        )}
        {activeRole === 'Supervisor' && (
          <SupervisorDashboard userId={userId} role={activeRole} />
        )}
        {activeRole === 'Policymaker' && (
          <PolicymakerDashboard userId={userId} role={activeRole} />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-[#0a0f1d] border-t border-brand-border py-3 text-center text-[11px] text-slate-500 font-medium">
        &copy; 2026 Karnataka State Police. Crime Intelligence & Analytics Division. v2.0.0
      </footer>

    </div>
  );
}

export default App;
