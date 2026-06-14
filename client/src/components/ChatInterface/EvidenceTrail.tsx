import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench, Database, Gauge, BarChart3 } from 'lucide-react';

interface EvidenceTrailProps {
  sources: any;
}

const getConfidenceStyle = (level?: string) => {
  if (!level) {
    return { color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/30', dot: 'bg-slate-500' };
  }
  switch (level.toLowerCase()) {
    case 'high':
      return { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', dot: 'bg-emerald-500' };
    case 'medium':
      return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', dot: 'bg-yellow-500' };
    case 'low':
      return { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', dot: 'bg-red-500' };
    default:
      return { color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/30', dot: 'bg-slate-500' };
  }
};

export const EvidenceTrail: React.FC<EvidenceTrailProps> = ({ sources }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Handle array of sources or single source object
  const actualSource = Array.isArray(sources) ? sources[0] : sources;
  
  // Safe default if actualSource is missing
  const safeSource = actualSource || { tool: 'Unknown', tablesAccessed: [], confidence: 'low' };
  const confidenceStyle = getConfidenceStyle(safeSource.confidence);

  return (
    <div className="mt-2 rounded-lg border border-slate-800/60 bg-slate-900 overflow-hidden max-w-full">
      {/* Toggle Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-300 hover:bg-slate-800/40 transition"
      >
        <span className="flex items-center gap-1.5">
          <Database size={12} className="text-slate-500" />
          View Evidence Trail
        </span>
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-slate-800/40 space-y-3 max-h-[200px] overflow-y-auto">
          {/* Tool Used */}
          <div className="flex items-center gap-2 pt-3">
            <Wrench size={13} className="text-blue-400 shrink-0" />
            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Tool:</span>
            <span className="text-xs text-white font-medium">{safeSource.tool}</span>
          </div>

          {/* Tables Accessed */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Database size={13} className="text-purple-400 shrink-0" />
              <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Tables Accessed:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 ml-5">
              {safeSource.tablesAccessed.map((table: string, index: number) => (
                <span
                  key={index}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono"
                >
                  {table}
                </span>
              ))}
            </div>
          </div>

          {/* Confidence Level */}
          <div className="flex items-center gap-2">
            <Gauge size={13} className={confidenceStyle.color + ' shrink-0'} />
            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Confidence:</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${confidenceStyle.bg} ${confidenceStyle.color} ${confidenceStyle.border} flex items-center gap-1`}>
              <span className={`h-1.5 w-1.5 rounded-full ${confidenceStyle.dot}`} />
              {safeSource.confidence}
            </span>
          </div>

          {/* Query Count */}
          {safeSource.queryCount !== undefined && (
            <div className="flex items-center gap-2">
              <BarChart3 size={13} className="text-cyan-400 shrink-0" />
              <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Data Points Analyzed:</span>
              <span className="text-xs text-white font-bold">{safeSource.queryCount.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
