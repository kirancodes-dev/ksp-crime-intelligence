import React from 'react';
import { ShieldAlert, User, Briefcase, MapPin, Users, Calendar, ArrowRight } from 'lucide-react';

interface RiskFactor {
  factor: string;
  impact: 'High' | 'Medium' | 'Low';
  detail: string;
}

interface IncidentLink {
  fir_id: number;
  fir_number: string;
  crime_type: string;
  district: string;
  date: string;
}

interface RiskProfile {
  name: string;
  age: number;
  gender: string;
  occupation: string;
  address: string;
  gang_affiliation: string | null;
  prior_convictions: number;
  overall_score: number;
  threat_level: 'Critical' | 'Medium' | 'Low';
  factors: RiskFactor[];
  recommendation: string;
  incidents: IncidentLink[];
}

interface RiskScoreCardProps {
  profile: RiskProfile;
  onFirSelect?: (firNumber: string) => void;
}

export const RiskScoreCard: React.FC<RiskScoreCardProps> = ({ profile, onFirSelect }) => {
  const scorePercent = Math.round(profile.overall_score * 100);
  
  // Dynamic color palette based on risk
  const getRiskColors = (level: string) => {
    switch (level) {
      case 'Critical':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-400',
          stroke: '#ef4444',
        };
      case 'Medium':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          stroke: '#f59e0b',
        };
      default:
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          stroke: '#3b82f6',
        };
    }
  };

  const colors = getRiskColors(profile.threat_level);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (profile.overall_score * circumference);

  return (
    <div className={`card-panel rounded-lg border p-6 text-slate-200 ${colors.border} max-w-2xl w-full mx-auto my-4`}>
      {/* Header */}
      <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
              {profile.threat_level} Threat
            </span>
            {profile.gang_affiliation && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-500/10 text-red-300 border border-red-500/20 flex items-center gap-1">
                <Users size={12} /> Syndicate Associated
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-2 flex items-center gap-2">
            <User className="text-slate-400" /> {profile.name}
          </h2>
          <p className="text-slate-400 text-sm mt-1">Recidivism Risk Profile & Recurrent Offender Index</p>
        </div>

        {/* Circular Gauge */}
        <div className="relative flex items-center justify-center h-28 w-28">
          <svg className="transform -rotate-90 w-full h-full">
            <circle
              cx="56"
              cy="56"
              r={radius}
              className="stroke-slate-800"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="56"
              cy="56"
              r={radius}
              stroke={colors.stroke}
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-2xl font-black text-white">{scorePercent}%</span>
            <span className="block text-[10px] text-slate-400 font-medium tracking-wider">INDEX</span>
          </div>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-2 gap-4 bg-slate-900/40 rounded-lg p-4 border border-slate-800/60 mb-6 text-sm">
        <div className="flex items-center gap-2 text-slate-300">
          <Calendar size={16} className="text-slate-500" />
          <span>Age / Gender:</span>
          <strong className="text-white ml-auto">{profile.age || 'N/A'} yrs / {profile.gender}</strong>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Briefcase size={16} className="text-slate-500" />
          <span>Occupation:</span>
          <strong className="text-white ml-auto">{profile.occupation}</strong>
        </div>
        <div className="flex items-center gap-2 text-slate-300 col-span-2 border-t border-slate-800/40 pt-2 mt-1">
          <MapPin size={16} className="text-slate-500 shrink-0" />
          <span className="shrink-0">Registered Address:</span>
          <strong className="text-white text-right truncate w-full ml-2">{profile.address}</strong>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <ShieldAlert size={16} className="text-brand-primary" /> Key Risk Factors
        </h3>
        <div className="space-y-3">
          {profile.factors.map((f, index) => (
            <div key={index} className="flex items-start gap-3 bg-slate-900/20 border border-slate-800/40 rounded-lg p-3">
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                f.impact === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                f.impact === 'Medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {f.impact}
              </span>
              <div>
                <h4 className="text-sm font-medium text-white">{f.factor}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{f.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Police Command Action Recommendation */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 mb-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recommended Action</h3>
        <p className="text-sm text-slate-200 mt-1 font-medium italic border-l-2 border-brand-primary pl-3">
          "{profile.recommendation}"
        </p>
      </div>

      {/* Linked Incidents */}
      {profile.incidents && profile.incidents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Linked Investigations ({profile.incidents.length})
          </h3>
          <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
            {profile.incidents.map((inc, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between bg-slate-900/40 hover:bg-slate-800/40 border border-slate-800/60 hover:border-slate-700/60 rounded-lg p-3 transition duration-150 cursor-pointer"
                onClick={() => onFirSelect && onFirSelect(inc.fir_number)}
              >
                <div>
                  <span className="text-xs font-bold text-brand-primary">{inc.fir_number}</span>
                  <span className="text-slate-400 text-xs ml-3">{inc.crime_type}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <span>{inc.district}</span>
                  <ArrowRight size={12} className="text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
