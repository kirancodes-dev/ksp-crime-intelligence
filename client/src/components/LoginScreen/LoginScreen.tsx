import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, UserCheck, KeyRound, AlertTriangle } from 'lucide-react';

interface LoginUser {
  userId: string;
  role: 'Investigator' | 'Analyst' | 'Supervisor' | 'Policymaker';
  rank: string;
  name: string;
}

const MOCK_CREDENTIALS: Record<string, LoginUser> = {
  'INV-1002': { userId: 'INV-1002', role: 'Investigator', rank: 'SI', name: 'Meera Nair' },
  'ANA-2041': { userId: 'ANA-2041', role: 'Analyst', rank: 'DA', name: 'Priya Sharma' },
  'SUP-3001': { userId: 'SUP-3001', role: 'Supervisor', rank: 'ACP', name: 'Raghavendra K.' },
  'POL-4001': { userId: 'POL-4001', role: 'Policymaker', rank: 'DGP', name: 'Srinivas M.' },
};

interface LoginScreenProps {
  onLoginSuccess: (userId: string, role: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [badgeId, setBadgeId] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [error, setError] = useState<string | null>(null);
  
  // MFA OTP timer state
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Auto-detect matching officer profile as user types
  const upperBadge = badgeId.toUpperCase().trim();
  const matchedOfficer = MOCK_CREDENTIALS[upperBadge] || null;

  useEffect(() => {
    let timer: any;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanBadge = badgeId.toUpperCase().trim();
    if (!cleanBadge) {
      setError('Badge ID is required.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    // Strict check for demonstration or allow format pattern
    const badgeRegex = /^[A-Z]{3}-\d{4}$/;
    if (!badgeRegex.test(cleanBadge)) {
      setError('Invalid Badge ID format. Expected format: AAA-0000 (e.g. INV-1002).');
      return;
    }

    // Mock validation
    const officer = MOCK_CREDENTIALS[cleanBadge];
    if (officer && password !== 'ksp123') {
      setError('Authentication failed. Incorrect password for this Badge ID.');
      return;
    }

    // Proceed to MFA step
    setStep('otp');
    setCountdown(30);
    setCanResend(false);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6 || !/^\d+$/.test(cleanOtp)) {
      setError('Security violation: Multi-factor token must be a 6-digit numeric code.');
      return;
    }

    // Resolve user details
    const cleanBadge = badgeId.toUpperCase().trim();
    const resolvedUser = MOCK_CREDENTIALS[cleanBadge] || {
      userId: cleanBadge,
      role: 'Investigator',
      rank: 'Officer',
      name: 'External Staff',
    };

    // Complete login
    onLoginSuccess(resolvedUser.userId, resolvedUser.role);
  };

  const handleResendOtp = () => {
    setCountdown(30);
    setCanResend(false);
    setOtp('');
    setError(null);
    alert('A new secure 6-digit verification code has been dispatched to your KSP security token.');
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center p-4 relative overflow-hidden select-none font-sans">
      
      {/* Background visual graphics */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,58,95,0.12)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(28,42,63,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(28,42,63,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* State Colors Accent Bar (Karnataka Yellow & Red) */}
      <div className="w-full max-w-md h-[4px] rounded-t-lg flex overflow-hidden shadow-lg z-10">
        <div className="w-1/2 bg-[#ffd700]" />
        <div className="w-1/2 bg-[#d9251c]" />
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[#111827] border border-brand-border border-t-0 rounded-b-lg p-8 shadow-2xl relative z-10 backdrop-blur-md">
        
        {/* Header section */}
        <div className="text-center space-y-2.5 mb-8">
          <img src="/emblem.png" alt="Karnataka State Police Emblem" className="h-24 w-auto mx-auto object-contain mb-2 hover:scale-105 transition duration-300" />
          <div>
            <h2 className="text-[15px] font-extrabold tracking-widest text-white uppercase">
              ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್
            </h2>
            <h1 className="text-sm font-semibold tracking-wide text-brand-gold uppercase mt-0.5">
              Karnataka State Police
            </h1>
            <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase mt-2">
              Crime Intelligence & Analytics Portal
            </p>
          </div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-6 bg-red-950/40 border border-red-500/30 text-red-400 p-3 rounded-lg flex items-start gap-2.5 text-xs animate-shake">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        {/* Step 1: Username & Password Credentials */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-5">
            
            {/* Badge ID Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Official Badge ID / Service ID
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <UserCheck size={16} />
                </span>
                <input
                  type="text"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  placeholder="e.g. INV-1002"
                  className="bg-brand-dark/50 border border-brand-border focus:border-brand-primary-light focus:ring-1 focus:ring-brand-primary-light focus:outline-none rounded-lg pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-600 w-full tracking-wide transition font-mono uppercase"
                  autoComplete="off"
                />
              </div>
              
              {/* Dynamic Credential Preview Helper */}
              {matchedOfficer && (
                <div className="bg-brand-navy/10 border border-brand-navy/30 rounded p-2 flex items-center gap-2 text-[10px] text-brand-primary-light font-medium transition animate-fade-in">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-ping" />
                  <span>Authorized Officer Found: <strong>{matchedOfficer.rank} {matchedOfficer.name}</strong> ({matchedOfficer.role})</span>
                </div>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Access Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="bg-brand-dark/50 border border-brand-border focus:border-brand-primary-light focus:ring-1 focus:ring-brand-primary-light focus:outline-none rounded-lg pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-600 w-full transition"
                />
              </div>
            </div>

            {/* Submit Credentials Button */}
            <button
              type="submit"
              className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg shadow-lg cursor-pointer transition flex items-center justify-center gap-2"
            >
              <KeyRound size={14} /> Verify Credentials
            </button>
            
            {/* Quick credentials references */}
            <div className="border-t border-brand-border/60 pt-4 mt-2">
              <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                Authorized Reference Badges (Password: ksp123)
              </span>
              <div className="grid grid-cols-2 gap-2 text-[9px]">
                <button
                  type="button"
                  onClick={() => { setBadgeId('INV-1002'); setPassword('ksp123'); }}
                  className="text-left bg-brand-dark/30 hover:bg-brand-dark/80 border border-brand-border/60 text-slate-400 p-1.5 rounded cursor-pointer transition text-xs"
                >
                  <span className="font-mono text-white block">INV-1002</span>
                  Investigator (Meera Nair)
                </button>
                <button
                  type="button"
                  onClick={() => { setBadgeId('ANA-2041'); setPassword('ksp123'); }}
                  className="text-left bg-brand-dark/30 hover:bg-brand-dark/80 border border-brand-border/60 text-slate-400 p-1.5 rounded cursor-pointer transition text-xs"
                >
                  <span className="font-mono text-white block">ANA-2041</span>
                  Analyst (Priya Sharma)
                </button>
                <button
                  type="button"
                  onClick={() => { setBadgeId('SUP-3001'); setPassword('ksp123'); }}
                  className="text-left bg-brand-dark/30 hover:bg-brand-dark/80 border border-brand-border/60 text-slate-400 p-1.5 rounded cursor-pointer transition text-xs"
                >
                  <span className="font-mono text-white block">SUP-3001</span>
                  Supervisor (ACP Raghavendra)
                </button>
                <button
                  type="button"
                  onClick={() => { setBadgeId('POL-4001'); setPassword('ksp123'); }}
                  className="text-left bg-brand-dark/30 hover:bg-brand-dark/80 border border-brand-border/60 text-slate-400 p-1.5 rounded cursor-pointer transition text-xs"
                >
                  <span className="font-mono text-white block">POL-4001</span>
                  Policymaker (DGP Srinivas)
                </button>
              </div>
            </div>

          </form>
        )}

        {/* Step 2: Multi-Factor Authentication (OTP Token) */}
        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-6 animate-fade-in">
            
            <div className="space-y-2 text-center bg-brand-navy/15 border border-brand-navy/30 rounded-lg p-4">
              <span className="text-[10px] font-extrabold text-brand-primary-light uppercase tracking-widest block">
                Two-Factor Security Active
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                A temporary security passcode has been dispatched to the registered mobile terminal ending in <strong>*9891</strong>.
              </p>
              <p className="text-[10px] text-slate-500 font-semibold italic">
                (Enter any 6-digit code or use <strong>123456</strong> to verify)
              </p>
            </div>

            {/* OTP Input */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                Enter 6-Digit MFA Token
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="0 0 0 0 0 0"
                className="bg-brand-dark/50 border border-brand-border focus:border-brand-primary-light focus:ring-1 focus:ring-brand-primary-light focus:outline-none rounded-lg py-3.5 text-lg text-white font-mono tracking-[0.75em] text-center w-full transition"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            {/* OTP Status & Resend */}
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 font-medium">
                {countdown > 0 ? (
                  <span>Code expires in: <strong className="text-slate-300 font-mono">00:{countdown.toString().padStart(2, '0')}</strong></span>
                ) : (
                  <span className="text-red-400">Code expired</span>
                )}
              </span>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={!canResend}
                className="text-brand-primary hover:text-brand-primary-light font-bold uppercase disabled:text-slate-600 cursor-pointer disabled:cursor-not-allowed transition"
              >
                Resend Code
              </button>
            </div>

            {/* Verification Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setStep('credentials'); setOtp(''); setError(null); }}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider py-3 rounded-lg border border-slate-800 transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-[2] bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg shadow-lg transition cursor-pointer"
              >
                Verify Code & Enter
              </button>
            </div>

          </form>
        )}

        {/* Security Warning Footer */}
        <div className="mt-8 pt-4 border-t border-brand-border/60 flex items-start gap-2.5 text-[9px] text-slate-500 leading-normal font-medium">
          <AlertTriangle size={14} className="shrink-0 text-amber-500/70" />
          <span>
            <strong>WARNING:</strong> This is a secure system of the Karnataka State Police. Unauthorized access, tempering, or intrusion attempts will be recorded and prosecuted under Sections 43, 65, and 66 of the IT Act, 2000.
          </span>
        </div>

      </div>
    </div>
  );
};
