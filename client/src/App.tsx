import { useState, useEffect } from 'react';
import { InvestigatorDashboard } from './pages/InvestigatorDashboard';
import { AnalystDashboard } from './pages/AnalystDashboard';
import { SupervisorDashboard } from './pages/SupervisorDashboard';
import { PolicymakerDashboard } from './pages/PolicymakerDashboard';
import { Shield, Clock, UserCheck } from 'lucide-react';
import './App.css';

type UserRole = 'Investigator' | 'Analyst' | 'Supervisor' | 'Policymaker';

const ROLE_LABELS: Record<UserRole, { rank: string; name: string }> = {
  Investigator: { rank: 'SI', name: 'Meera Nair' },
  Analyst: { rank: 'DA', name: 'Priya Sharma' },
  Supervisor: { rank: 'ACP', name: 'Raghavendra K.' },
  Policymaker: { rank: 'DGP', name: 'Srinivas M.' },
};

function App() {
  const [activeRole, setActiveRole] = useState<UserRole>('Investigator');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mapping of roles to mock user IDs
  const getMockUserId = (role: UserRole) => {
    switch (role) {
      case 'Analyst':
        return 'ANA-2041';
      case 'Supervisor':
        return 'SUP-3001';
      case 'Policymaker':
        return 'POL-4001';
      default:
        return 'INV-1002';
    }
  };

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const userId = getMockUserId(activeRole);
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

          {/* Role Switcher */}
          <div className="flex items-center gap-2 bg-brand-card border border-brand-border rounded-lg px-3 py-1.5">
            <UserCheck size={13} className="text-brand-primary" />
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as UserRole)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer border-none pr-5 py-0"
            >
              <option value="Investigator" className="bg-brand-card text-white">Investigator ({getMockUserId('Investigator')})</option>
              <option value="Analyst" className="bg-brand-card text-white">Analyst ({getMockUserId('Analyst')})</option>
              <option value="Supervisor" className="bg-brand-card text-white">Supervisor ({getMockUserId('Supervisor')})</option>
              <option value="Policymaker" className="bg-brand-card text-white">Policymaker ({getMockUserId('Policymaker')})</option>
            </select>
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
