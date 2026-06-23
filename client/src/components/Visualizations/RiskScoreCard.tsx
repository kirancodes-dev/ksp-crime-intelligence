import React, { useState } from 'react';
import { ShieldAlert, User, Briefcase, MapPin, Users, Calendar, ArrowRight, RefreshCw } from 'lucide-react';

interface RiskFactor {
  factor: string;
  impact: 'High' | 'Medium' | 'Low' | 'Critical';
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
  behavioral_profile?: {
    crime_diversity: number;
    crime_types: string[];
    geographic_reach: number;
    districts_active: string[];
    active_period_days: number;
    mo_patterns: Array<{ pattern: string; frequency: number }>;
    escalation_detected: boolean;
    cross_district_operations: boolean;
    behavioral_classification: string;
    spatial_pattern: string;
    tempo_pattern: string;
  };
}

interface RiskScoreCardProps {
  profile: RiskProfile;
  onFirSelect?: (firNumber: string) => void;
  onRecalculate?: (queryText: string) => void;
}

export const RiskScoreCard: React.FC<RiskScoreCardProps> = ({ profile, onFirSelect, onRecalculate }) => {
  // Local state for interactive switches
  const [warrant, setWarrant] = useState(false);
  const [weapon, setWeapon] = useState(false);
  const [hawala, setHawala] = useState(false);
  const [history, setHistory] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

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

  const handleRecalculate = () => {
    if (!onRecalculate) return;
    setRecalculating(true);
    
    // Compile search query with text parameters that toolRouter parses
    let query = `Calculate the risk score of ${profile.name}`;
    const flags: string[] = [];
    if (warrant) flags.push("active arrest warrant");
    if (weapon) flags.push("weapon association");
    if (hawala) flags.push("hawala account linkages");
    if (history) flags.push("prior convictions repeat history");
    
    if (flags.length > 0) {
      query += ` with ${flags.join(' and ')}`;
    }

    onRecalculate(query);
    
    // Add brief animation delay
    setTimeout(() => {
      setRecalculating(false);
    }, 1200);
  };

  return (
    <div className={`card-panel rounded-lg border p-6 text-slate-200 ${colors.border} max-w-2xl w-full mx-auto my-4 bg-white border-slate-200`}>
      
      {/* Header */}
      <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
              {profile.threat_level} Threat
            </span>
            {profile.gang_affiliation && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-500/10 text-red-700 border border-red-500/20 flex items-center gap-1">
                <Users size={12} /> Syndicate Associated
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-2 flex items-center gap-2">
            <User className="text-slate-400" /> {profile.name}
          </h2>
          <p className="text-slate-500 text-sm mt-1">Recidivism Risk Profile & Recurrent Offender Index</p>
        </div>

        {/* Circular Gauge */}
        <div className="relative flex items-center justify-center h-28 w-28">
          <svg className="transform -rotate-90 w-full h-full">
            <circle
              cx="56"
              cy="56"
              r={radius}
              className="stroke-slate-100"
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
            <span className="text-2xl font-black text-slate-900">{scorePercent}%</span>
            <span className="block text-[10px] text-slate-400 font-medium tracking-wider">INDEX</span>
          </div>
        </div>
      </div>

      {/* Interactive Parameter Switches Panel */}
      {onRecalculate && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 mb-6">
          <span className="block text-[10px] font-bold text-brand-gold uppercase tracking-wider mb-2">
            Interactive Risk Recalculator (Simulation)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={warrant}
                onChange={(e) => setWarrant(e.target.checked)}
                className="rounded text-brand-primary border-slate-300 focus:ring-0 cursor-pointer"
              />
              <span>Active Arrest Warrant</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={weapon}
                onChange={(e) => setWeapon(e.target.checked)}
                className="rounded text-brand-primary border-slate-300 focus:ring-0 cursor-pointer"
              />
              <span>Weapon Association</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hawala}
                onChange={(e) => setHawala(e.target.checked)}
                className="rounded text-brand-primary border-slate-300 focus:ring-0 cursor-pointer"
              />
              <span>Hawala Linkage</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={history}
                onChange={(e) => setHistory(e.target.checked)}
                className="rounded text-brand-primary border-slate-300 focus:ring-0 cursor-pointer"
              />
              <span>Habitual Offender History</span>
            </label>
          </div>
          
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="w-full mt-3 py-2 bg-brand-primary hover:bg-brand-primary/95 disabled:bg-slate-300 text-white font-bold text-xs uppercase tracking-wider rounded transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {recalculating ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Re-Evaluating Suspect Threat...</span>
              </>
            ) : (
              <>
                <RefreshCw size={13} />
                <span>Recalculate Profile via LLM</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Profile Details Grid */}
      <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-100 mb-6 text-sm text-slate-700">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-400" />
          <span>Age / Gender:</span>
          <strong className="text-slate-900 ml-auto">{profile.age || 'N/A'} yrs / {profile.gender}</strong>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-slate-400" />
          <span>Occupation:</span>
          <strong className="text-slate-900 ml-auto">{profile.occupation}</strong>
        </div>
        <div className="flex items-center gap-2 col-span-2 border-t border-slate-100 pt-2 mt-1">
          <MapPin size={16} className="text-slate-400 shrink-0" />
          <span className="shrink-0">Registered Address:</span>
          <strong className="text-slate-900 text-right truncate w-full ml-2" title={profile.address}>{profile.address}</strong>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1">
          <ShieldAlert size={16} className="text-brand-primary" /> Key Risk Factors
        </h3>
        <div className="space-y-3">
          {profile.factors.map((f, index) => (
            <div key={index} className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-lg p-3">
              <span className={`text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                f.impact === 'Critical' || f.impact === 'High' ? 'bg-red-50 text-red-700 border border-red-200' :
                f.impact === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-emerald-50 text-emerald-750 border border-emerald-200'
              }`}>
                {f.impact}
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-800">{f.factor}</h4>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{f.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Police Command Action Recommendation */}
      <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recommended Action</h3>
        <p className="text-sm text-slate-800 mt-1 font-semibold italic border-l-2 border-brand-primary pl-3">
          "{profile.recommendation}"
        </p>
      </div>

      {/* Behavioral Profile Insights */}
      {profile.behavioral_profile && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1">
            <Briefcase size={16} className="text-brand-primary" /> Behavioral & MO Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
            {/* Classification & Patterns */}
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Classification:</span>
                <span className="font-bold text-slate-900 bg-blue-100/50 text-blue-800 px-2 py-0.5 rounded">
                  {profile.behavioral_profile.behavioral_classification}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Spatial Pattern:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${
                  profile.behavioral_profile.cross_district_operations
                    ? 'bg-red-100/50 text-red-800'
                    : 'bg-emerald-100/50 text-emerald-800'
                }`}>
                  {profile.behavioral_profile.spatial_pattern}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tempo Pattern:</span>
                <span className="font-bold text-slate-900 bg-purple-100/50 text-purple-800 px-2 py-0.5 rounded">
                  {profile.behavioral_profile.tempo_pattern}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Active Span:</span>
                <span className="font-semibold text-slate-800">
                  {profile.behavioral_profile.active_period_days} Days
                </span>
              </div>
              {profile.behavioral_profile.escalation_detected && (
                <div className="mt-2 text-[10px] bg-red-50 border border-red-100 text-red-700 px-2 py-1 rounded font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                  <ShieldAlert size={12} />
                  Crime Severity Escalation Detected
                </div>
              )}
            </div>

            {/* Crime Diversity & Geographic Reach */}
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-500">Crime Diversity:</span>
                  <span className="font-bold text-slate-850">{profile.behavioral_profile.crime_diversity} Type(s)</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profile.behavioral_profile.crime_types?.map((type, idx) => (
                    <span key={idx} className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
              <div className="border-t border-slate-200 pt-2 mt-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-500">Jurisdiction Reach:</span>
                  <span className="font-bold text-slate-850">{profile.behavioral_profile.geographic_reach} District(s)</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profile.behavioral_profile.districts_active?.map((dist, idx) => (
                    <span key={idx} className="text-[10px] bg-amber-100/60 text-amber-800 px-1.5 py-0.5 rounded">
                      {dist}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* MO Patterns (full width) */}
            {profile.behavioral_profile.mo_patterns && profile.behavioral_profile.mo_patterns.length > 0 && (
              <div className="col-span-1 sm:col-span-2 bg-slate-50 border border-slate-100 rounded-lg p-3">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Frequent Modus Operandi (MO) Patterns
                </span>
                <div className="space-y-1.5">
                  {profile.behavioral_profile.mo_patterns?.map((mo, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-slate-755 italic">"{mo.pattern}"</span>
                      <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                        {mo.frequency}x recurring
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Linked Incidents */}
      {profile.incidents && profile.incidents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1">
            Linked Investigations ({profile.incidents.length})
          </h3>
          <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
            {profile.incidents.map((inc, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 rounded-lg p-3 transition duration-150 cursor-pointer"
                onClick={() => onFirSelect && onFirSelect(inc.fir_number)}
              >
                <div>
                  <span className="text-xs font-bold text-brand-primary hover:underline">{inc.fir_number}</span>
                  <span className="text-slate-600 text-xs ml-3 font-semibold">{inc.crime_type}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <span className="font-semibold">{inc.district}</span>
                  <ArrowRight size={12} className="text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
