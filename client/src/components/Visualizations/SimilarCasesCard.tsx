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
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'closed':
    case 'resolved':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'chargesheeted':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'bg-red-500';
  if (score >= 60) return 'bg-amber-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-emerald-500';
};

const getScoreTextColor = (score: number): string => {
  if (score >= 80) return 'text-red-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-emerald-400';
};

export const SimilarCasesCard: React.FC<SimilarCasesCardProps> = ({ data }) => {
  const { targetCase, similarCases, investigativeLeads } = data;

  return (
    <div className="card-panel rounded-lg border border-slate-800 p-6 text-slate-100 shadow-xl w-full my-4">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 mb-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Search className="text-brand-primary" size={20} /> Similar Case Matching
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Pattern-matched cases for <span className="text-brand-primary font-semibold">{targetCase.fir_number}</span>
          {' '}— {targetCase.crime_type} in {targetCase.district}
        </p>
      </div>

      {/* Target Case Summary */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 mb-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Case</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <FileText size={14} className="text-slate-500" />
            <span>FIR:</span>
            <strong className="text-white">{targetCase.fir_number}</strong>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin size={14} className="text-slate-500" />
            <span>District:</span>
            <strong className="text-white">{targetCase.district}</strong>
          </div>
          <div className="col-span-2 text-slate-300 flex items-start gap-2">
            <Tag size={14} className="text-slate-500 mt-0.5 shrink-0" />
            <span className="shrink-0">MO:</span>
            <span className="text-slate-200 italic text-xs">{targetCase.modus_operandi}</span>
          </div>
        </div>
      </div>

      {/* Similar Cases List */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Matched Cases ({similarCases.length})
        </h3>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {similarCases.map((sc, index) => {
            const scorePercent = Math.round(sc.similarity_score * (sc.similarity_score <= 1 ? 100 : 1));
            return (
              <div
                key={index}
                className="bg-slate-900/40 border border-slate-800/60 rounded-lg p-4 hover:border-slate-700/60 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-sm font-bold text-brand-primary">{sc.fir_number}</span>
                    <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded-full font-semibold border ${getStatusColor(sc.status)}`}>
                      {sc.status}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                    {sc.crime_type}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                  <MapPin size={12} className="text-slate-500" />
                  <span>{sc.district}</span>
                </div>

                {/* Similarity Score Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">Similarity Score</span>
                    <span className={`font-bold ${getScoreTextColor(scorePercent)}`}>{scorePercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
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
                        className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium"
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Lightbulb size={16} className="text-amber-400" /> Investigative Leads
          </h3>
          <ol className="space-y-2">
            {investigativeLeads.map((lead, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-slate-200">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
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
