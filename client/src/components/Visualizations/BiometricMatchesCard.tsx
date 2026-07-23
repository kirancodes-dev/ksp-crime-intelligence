import React from 'react';
import { Fingerprint, Target, User, AlertTriangle } from 'lucide-react';

interface BiometricMatch {
  accused_id: number;
  name: string;
  age: number;
  gender: string;
  gang: string;
  risk_score: number;
  fir_number: string;
  crime_type: string;
  address: string;
  similarity: number;
  biometric_features: {
    facial_symmetry: string;
    iris_match: string;
    forehead_nodes: number;
    chin_type: string;
  };
}

interface BiometricMatchesCardProps {
  data: {
    success: boolean;
    matches: BiometricMatch[];
  };
  onAccusedSelect?: (name: string) => void;
  onFirSelect?: (firNumber: string) => void;
}

export const BiometricMatchesCard: React.FC<BiometricMatchesCardProps> = ({ data, onAccusedSelect, onFirSelect }) => {
  if (!data || !data.success || !data.matches) return null;

  return (
    <div className="w-full bg-[#f0f4f8] border border-[#d1d9e6] rounded-lg p-5 shadow-lg text-[#1e3a5f]">
      <div className="flex items-center justify-between border-b border-[#d1d9e6] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Fingerprint className="text-[#1e3a5f] h-5 w-5 animate-pulse" />
          <h4 className="font-bold text-sm uppercase tracking-wider text-[#1e3a5f]">
            Zia Facial Biometric Registry matches
          </h4>
        </div>
        <span className="text-[10px] bg-[#1e3a5f]/10 border border-[#1e3a5f]/20 text-white px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
          Zia Vision Active
        </span>
      </div>

      {(data?.matches || []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-[#6c757d] text-xs">
          <AlertTriangle className="h-8 w-8 text-slate-600 mb-2" />
          <span>No suspect mugshot matches found in KSP database registries.</span>
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {(data?.matches || []).map((match, idx) => (
            <div 
              key={idx} 
              className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-[#d1d9e6] p-4 rounded-lg text-xs hover:border-[#1e3a5f]/45 transition gap-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <strong 
                    className="text-[#1e3a5f] text-sm font-bold hover:text-[#1e3a5f] transition cursor-pointer flex items-center gap-1"
                    onClick={() => onAccusedSelect && onAccusedSelect(match.name)}
                  >
                    <User size={13} className="text-[#6c757d]" />
                    {match.name}
                  </strong>
                  <span className="text-[10px] text-[#6c757d] font-semibold">
                    ({match.age} yrs • {match.gender})
                  </span>
                </div>
                <div className="text-[11px] text-[#6c757d] font-medium">
                  Gang Affiliation: <span className="text-[#1e3a5f] font-semibold">{match.gang}</span> • Case Link:{' '}
                  <span 
                    className="text-[#1e3a5f] hover:underline cursor-pointer font-bold" 
                    onClick={() => onFirSelect && onFirSelect(match.fir_number)}
                  >
                    {match.fir_number}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 border-t border-slate-900/60 text-[10px] text-[#6c757d] font-semibold">
                  <div>Symmetry: <span className="text-[#2d4a6f]">{match.biometric_features.facial_symmetry}</span></div>
                  <div>Iris: <span className="text-[#2d4a6f]">{match.biometric_features.iris_match}</span></div>
                  <div>Nodes: <span className="text-[#2d4a6f]">{match.biometric_features.forehead_nodes}</span></div>
                  <div>Chin: <span className="text-[#2d4a6f]">{match.biometric_features.chin_type}</span></div>
                </div>
              </div>

              <div className="text-right flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2 md:gap-1.5 border-t md:border-t-0 border-slate-900 pt-2.5 md:pt-0">
                <div className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded text-xs font-bold flex items-center gap-1">
                  <Target size={12} />
                  {match.similarity}% Match
                </div>
                <button
                  onClick={() => onAccusedSelect && onAccusedSelect(match.name)}
                  className="text-[10px] text-[#1e3a5f] font-bold hover:underline cursor-pointer"
                >
                  Inspect Case Dossier
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
