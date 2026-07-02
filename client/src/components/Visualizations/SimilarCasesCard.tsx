import React from 'react';
import { Search, Lightbulb, FileText, MapPin, Tag } from 'lucide-react';

interface SimilarCase {
  fir_number: string;
  crime_type: string;
  district: string;
  similarity_score: number;
  status: string;
  shared_attributes: string[];
}

interface SimilarCasesCardProps {
  data: {
    targetCase: {
      fir_number: string;
      crime_type: string;
      district: string;
      modus_operandi: string;
    };
    similarCases: SimilarCase[];
    investigativeLeads: string[];
  };
}

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'open':
    case 'under investigation':
      return 'bg-blue-500/20 text-[#1e3a5f] border-blue-500/30';
    case 'closed':
    case 'resolved':
      return 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30';
    case 'chargesheeted':
      return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
    default:
      return 'bg-slate-500/20 text-[#6c757d] border-slate-500/30';
  }
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'bg-red-500';
  if (score >= 60) return 'bg-amber-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-emerald-500';
};

const getScoreTextColor = (score: number): string => {
  if (score >= 80) return 'text-[#d9251c]';
  if (score >= 60) return 'text-amber-700';
  if (score >= 40) return 'text-amber-700';
  return 'text-emerald-700';
};

export const SimilarCasesCard: React.FC<SimilarCasesCardProps> = ({ data }) => {
  const { targetCase, similarCases, investigativeLeads } = data;

  return (
    <div className="card-panel rounded-lg border border-[#d1d9e6] p-6 text-[#1e3a5f] shadow-xl w-full my-4">
      {/* Header */}
      <div className="border-b border-[#d1d9e6] pb-4 mb-6">
        <h2 className="text-lg font-bold text-[#1e3a5f] flex items-center gap-2">
          <Search className="text-[#1e3a5f]" size={20} /> Similar Case Matching
        </h2>
        <p className="text-xs text-[#6c757d] mt-0.5">
          Pattern-matched cases for <span className="text-[#1e3a5f] font-semibold">{targetCase.fir_number}</span>
          {' '}— {targetCase.crime_type} in {targetCase.district}
        </p>
      </div>

      {/* Target Case Summary */}
      <div className="bg-[#f0f4f8]/60 border border-[#d1d9e6] rounded-lg p-4 mb-6">
        <h3 className="text-xs font-bold text-[#6c757d] uppercase tracking-wider mb-2">Target Case</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-[#2d4a6f]">
            <FileText size={14} className="text-[#6c757d]" />
            <span>FIR:</span>
            <strong className="text-[#1e3a5f]">{targetCase.fir_number}</strong>
          </div>
          <div className="flex items-center gap-2 text-[#2d4a6f]">
            <MapPin size={14} className="text-[#6c757d]" />
            <span>District:</span>
            <strong className="text-[#1e3a5f]">{targetCase.district}</strong>
          </div>
          <div className="col-span-2 text-[#2d4a6f] flex items-start gap-2">
            <Tag size={14} className="text-[#6c757d] mt-0.5 shrink-0" />
            <span className="shrink-0">MO:</span>
            <span className="text-[#1e3a5f] italic text-xs">{targetCase.modus_operandi}</span>
          </div>
        </div>
      </div>

      {/* Similar Cases List */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[#6c757d] uppercase tracking-wider mb-3">
          Matched Cases ({similarCases.length})
        </h3>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {similarCases.map((sc, index) => {
            const scorePercent = Math.round(sc.similarity_score * (sc.similarity_score <= 1 ? 100 : 1));
            return (
              <div
                key={index}
                className="bg-[#f0f4f8]/40 border border-[#d1d9e6]/60 rounded-lg p-4 hover:border-[#d1d9e6]/60 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-sm font-bold text-[#1e3a5f]">{sc.fir_number}</span>
                    <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded-full font-semibold border ${getStatusColor(sc.status)}`}>
                      {sc.status}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-white border border-[#d1d9e6] text-[#2d4a6f]">
                    {sc.crime_type}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#6c757d] mb-3">
                  <MapPin size={12} className="text-[#6c757d]" />
                  <span>{sc.district}</span>
                </div>

                {/* Similarity Score Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#6c757d]">Similarity Score</span>
                    <span className={`font-bold ${getScoreTextColor(scorePercent)}`}>{scorePercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getScoreColor(scorePercent)}`}
                      style={{ width: `${scorePercent}%` }}
                    />
                  </div>
                </div>

                {/* Shared Attributes */}
                {sc.shared_attributes && sc.shared_attributes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {sc.shared_attributes.map((attr, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 font-medium"
                      >
                        {attr}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Investigative Leads */}
      {investigativeLeads && investigativeLeads.length > 0 && (
        <div className="bg-[#f0f4f8]/60 border border-[#d1d9e6] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Lightbulb size={16} className="text-amber-700" /> Investigative Leads
          </h3>
          <ol className="space-y-2">
            {investigativeLeads.map((lead, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-[#1e3a5f]">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 text-xs font-bold">
                  {index + 1}
                </span>
                <span className="pt-0.5">{lead}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};
