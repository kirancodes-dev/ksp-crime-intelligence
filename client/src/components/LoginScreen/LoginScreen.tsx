import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, UserCheck, KeyRound, AlertTriangle, Phone, Globe } from 'lucide-react';
import { api } from '../../services/api';

interface LoginUser {
  userId: string;
  role: 'Investigator' | 'Analyst' | 'Supervisor' | 'Policymaker';
  rank: string;
  name: string;
}

const MOCK_CREDENTIALS: Record<string, LoginUser> = {
  'INV-1001': { userId: 'INV-1001', role: 'Investigator', rank: 'SI', name: 'Meera Nair' },
  'ANA-2001': { userId: 'ANA-2001', role: 'Analyst', rank: 'DA', name: 'Priya Sharma' },
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
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
      setError('Invalid Badge ID format. Expected format: AAA-0000 (e.g. INV-1001).');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.login(cleanBadge, password);
      if (res.success && res.token) {
        // Store temp details to verify OTP step
        localStorage.setItem('ksp_jwt_token', res.token);
        localStorage.setItem('ksp_temp_user_id', res.user.userId);
        localStorage.setItem('ksp_temp_user_role', res.user.role);
        
        // Proceed to MFA step
        setStep('otp');
        setCountdown(30);
        setCanResend(false);
      } else {
        setError(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication connection failed. Please check backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6 || !/^\d+$/.test(cleanOtp)) {
      setError('Security violation: Multi-factor token must be a 6-digit numeric code.');
      return;
    }

    // Complete login using stored temporary session
    const tempUserId = localStorage.getItem('ksp_temp_user_id');
    const tempUserRole = localStorage.getItem('ksp_temp_user_role');

    if (!tempUserId || !tempUserRole) {
      setError('Authentication session expired. Please log in again.');
      setStep('credentials');
      return;
    }

    // Clean up temporary variables
    localStorage.removeItem('ksp_temp_user_id');
    localStorage.removeItem('ksp_temp_user_role');

    onLoginSuccess(tempUserId, tempUserRole);
  };

  const handleResendOtp = () => {
    setCountdown(30);
    setCanResend(false);
    setOtp('');
    setError(null);
    alert('A new secure 2FA verification token has been dispatched to your official communication terminal.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f4f8] to-[#dce4ed] flex flex-col select-none font-sans">
      
      {/* Government Utility Bar */}
      <div className="bg-[#0d2137] text-slate-400 text-[10px] py-1 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span>Official Website of Government of Karnataka</span>
            <a href="https://ksp.karnataka.gov.in" target="_blank" rel="noopener" className="text-[#d4a843] hover:text-white transition hidden sm:inline">ksp.karnataka.gov.in</a>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Phone size={9} />
              <span>Emergency: <strong className="text-white">112</strong></span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1">
              <Globe size={9} />
              <span>English</span>
            </div>
          </div>
        </div>
      </div>

      {/* Indian Tricolor */}
      <div className="h-[4px] w-full flex">
        <div className="flex-1 bg-[#ff9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Login Header Bar */}
      <div className="bg-white border-b-[3px] border-[#1e3a5f] shadow-sm px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <img src="/emblem.png" alt="KSP Emblem" className="h-12 w-auto object-contain" />
          <div>
            <h1 className="text-[14px] font-bold tracking-wide text-[#1e3a5f] uppercase" style={{ fontFamily: "'Noto Sans Kannada', sans-serif" }}>
              ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್
            </h1>
            <h2 className="text-[12px] font-bold tracking-wider text-[#1e3a5f] uppercase">
              Karnataka State Police
            </h2>
            <span className="text-[10px] text-[#6c757d] font-semibold">Government of Karnataka</span>
          </div>
        </div>
      </div>

      {/* Main Content — Centered Login */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">

          {/* Login Card */}
          <div className="bg-white border border-[#d1d9e6] rounded-lg shadow-xl overflow-hidden">
            
            {/* Card Navy Header */}
            <div className="bg-[#1e3a5f] px-6 py-4 text-center">
              <img src="/emblem.png" alt="Karnataka State Police Emblem" className="h-16 w-auto mx-auto object-contain mb-2 drop-shadow-lg" />
              <h2 className="text-[14px] font-bold tracking-widest text-white uppercase" style={{ fontFamily: "'Noto Sans Kannada', sans-serif" }}>
                ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್
              </h2>
              <h3 className="text-[12px] font-semibold tracking-wide text-[#d4a843] uppercase mt-0.5">
                Karnataka State Police
              </h3>
              <p className="text-[10px] text-blue-200 font-medium tracking-wide uppercase mt-1.5">
                Crime Intelligence & Analytics Portal — Secure Login
              </p>
            </div>

            {/* Card Body */}
            <div className="p-6">
              
              {/* Error Alert Box */}
              {error && (
                <div className="mb-5 bg-red-50 border border-red-200 text-[#d9251c] p-3 rounded-lg flex items-start gap-2.5 text-xs">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{error}</span>
                </div>
              )}

              {/* Step 1: Username & Password Credentials */}
              {step === 'credentials' && (
                <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                  
                  {/* Badge ID Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-[#4a5568] uppercase tracking-wider">
                      Official Badge ID / Service ID
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6c757d]">
                        <UserCheck size={16} />
                      </span>
                      <input
                        type="text"
                        value={badgeId}
                        disabled={isSubmitting}
                        onChange={(e) => setBadgeId(e.target.value)}
                        placeholder="e.g. INV-1001"
                        className="bg-[#f8f9fa] border border-[#d1d9e6] focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20 focus:outline-none rounded-lg pl-10 pr-3 py-2.5 text-xs text-[#1e3a5f] placeholder-[#9ca3af] w-full tracking-wide transition font-mono uppercase"
                        autoComplete="off"
                      />
                    </div>
                    
                    {/* Dynamic Credential Preview Helper */}
                    {matchedOfficer && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2 flex items-center gap-2 text-[10px] text-[#1e3a5f] font-medium transition">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Authorized Officer Found: <strong>{matchedOfficer.rank} {matchedOfficer.name}</strong> ({matchedOfficer.role})</span>
                      </div>
                    )}
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-[#4a5568] uppercase tracking-wider">
                      Access Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6c757d]">
                        <Lock size={16} />
                      </span>
                      <input
                        type="password"
                        value={password}
                        disabled={isSubmitting}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="bg-[#f8f9fa] border border-[#d1d9e6] focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20 focus:outline-none rounded-lg pl-10 pr-3 py-2.5 text-xs text-[#1e3a5f] placeholder-[#9ca3af] w-full transition"
                      />
                    </div>
                  </div>

                  {/* Submit Credentials Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#1e3a5f] hover:bg-[#2a4a73] text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg shadow-lg cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <KeyRound size={14} /> {isSubmitting ? 'Authenticating...' : 'Verify Credentials'}
                  </button>
                  
                  {/* Quick credentials references */}
                  <div className="border-t border-[#e8ecf1] pt-4 mt-2">
                    <span className="block text-[9px] text-[#6c757d] font-bold uppercase tracking-wider mb-2">
                      Authorized Reference Badges (Password: ksp2026)
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                      <button
                        type="button"
                        onClick={() => { setBadgeId('INV-1001'); setPassword('ksp2026'); }}
                        className="text-left bg-[#f8f9fa] hover:bg-[#eef2f7] border border-[#d1d9e6] text-[#4a5568] p-1.5 rounded cursor-pointer transition text-xs"
                      >
                        <span className="font-mono text-[#1e3a5f] block">INV-1001</span>
                        Investigator (Meera Nair)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBadgeId('ANA-2001'); setPassword('ksp2026'); }}
                        className="text-left bg-[#f8f9fa] hover:bg-[#eef2f7] border border-[#d1d9e6] text-[#4a5568] p-1.5 rounded cursor-pointer transition text-xs"
                      >
                        <span className="font-mono text-[#1e3a5f] block">ANA-2001</span>
                        Analyst (Priya Sharma)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBadgeId('SUP-3001'); setPassword('ksp2026'); }}
                        className="text-left bg-[#f8f9fa] hover:bg-[#eef2f7] border border-[#d1d9e6] text-[#4a5568] p-1.5 rounded cursor-pointer transition text-xs"
                      >
                        <span className="font-mono text-[#1e3a5f] block">SUP-3001</span>
                        Supervisor (ACP Raghavendra)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBadgeId('POL-4001'); setPassword('ksp2026'); }}
                        className="text-left bg-[#f8f9fa] hover:bg-[#eef2f7] border border-[#d1d9e6] text-[#4a5568] p-1.5 rounded cursor-pointer transition text-xs"
                      >
                        <span className="font-mono text-[#1e3a5f] block">POL-4001</span>
                        Policymaker (DGP Srinivas)
                      </button>
                    </div>
                  </div>

                </form>
              )}

              {/* Step 2: Multi-Factor Authentication (OTP Token) */}
              {step === 'otp' && (
                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  
                  <div className="space-y-2 text-center bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <span className="text-[10px] font-extrabold text-[#1e3a5f] uppercase tracking-widest block">
                      Two-Factor Security Active
                    </span>
                    <p className="text-[11px] text-[#4a5568] leading-relaxed font-medium">
                      A temporary security passcode has been dispatched to the registered mobile terminal ending in <strong>*9891</strong>.
                    </p>
                    <p className="text-[10px] text-[#6c757d] font-semibold italic">
                      (Enter any 6-digit code or use <strong>123456</strong> to verify)
                    </p>
                  </div>

                  {/* OTP Input */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-[#4a5568] uppercase tracking-wider text-center">
                      Enter 6-Digit MFA Token
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="0 0 0 0 0 0"
                      className="bg-[#f8f9fa] border border-[#d1d9e6] focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20 focus:outline-none rounded-lg py-3.5 text-lg text-[#1e3a5f] font-mono tracking-[0.75em] text-center w-full transition"
                      autoComplete="one-time-code"
                      autoFocus
                    />
                  </div>

                  {/* OTP Status & Resend */}
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#6c757d] font-medium">
                      {countdown > 0 ? (
                        <span>Code expires in: <strong className="text-[#1e3a5f] font-mono">00:{countdown.toString().padStart(2, '0')}</strong></span>
                      ) : (
                        <span className="text-[#d9251c]">Code expired</span>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={!canResend}
                      className="text-[#1e3a5f] hover:text-[#2a4a73] font-bold uppercase disabled:text-[#9ca3af] cursor-pointer disabled:cursor-not-allowed transition"
                    >
                      Resend Code
                    </button>
                  </div>

                  {/* Verification Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setStep('credentials'); setOtp(''); setError(null); }}
                      className="flex-1 bg-[#f8f9fa] hover:bg-[#eef2f7] text-[#4a5568] font-bold text-xs uppercase tracking-wider py-3 rounded-lg border border-[#d1d9e6] transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-[2] bg-[#1e3a5f] hover:bg-[#2a4a73] text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg shadow-lg transition cursor-pointer"
                    >
                      Verify Code & Enter
                    </button>
                  </div>

                </form>
              )}

            </div>
          </div>

          {/* Security Warning Footer */}
          <div className="mt-4 bg-white border border-[#d1d9e6] rounded-lg p-4 flex items-start gap-2.5 text-[9px] text-[#6c757d] leading-normal font-medium shadow-sm">
            <AlertTriangle size={14} className="shrink-0 text-amber-500" />
            <span>
              <strong className="text-[#1e3a5f]">WARNING:</strong> This is a secure system of the Karnataka State Police. Unauthorized access, tampering, or intrusion attempts will be recorded and prosecuted under Sections 43, 65, and 66 of the IT Act, 2000.
            </span>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#0d2137] border-t-[3px] border-[#d4a843] py-4 text-center">
        <div className="text-[10px] text-slate-400">
          &copy; {new Date().getFullYear()} Karnataka State Police — Crime Intelligence & Analytics Division
        </div>
        <div className="text-[9px] text-slate-500 mt-1">
          Designed & Developed for KSP — Powered by CCTNS & NIC
        </div>
      </div>

    </div>
  );
};
