import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench, Database, Gauge, BarChart3, Cpu, GitBranch, Zap, Shield } from 'lucide-react';

interface EvidenceTrailProps {
  sources: any;
  llmMode?: string;
}

const getConfidenceStyle = (level?: string) => {
  if (!level) {
    return { color: 'text-[#6c757d]', bg: 'bg-slate-500/20', border: 'border-slate-500/30', dot: 'bg-slate-500' };
  }
  switch (level.toLowerCase()) {
    case 'high':
      return { color: 'text-emerald-700', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', dot: 'bg-emerald-500' };
    case 'medium':
      return { color: 'text-amber-700', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', dot: 'bg-yellow-500' };
    case 'low':
      return { color: 'text-[#d9251c]', bg: 'bg-red-500/20', border: 'border-red-200', dot: 'bg-red-500' };
    default:
      return { color: 'text-[#6c757d]', bg: 'bg-slate-500/20', border: 'border-slate-500/30', dot: 'bg-slate-500' };
  }
};

const TOOL_LABELS: Record<string, string> = {
  risk: 'Recidivism Risk Scoring Engine',
  network: 'Criminal Network Graph Analyzer',
  map: 'Geospatial Hotspot Mapper',
  chart: 'Crime Trend Aggregator',
  finance: 'Financial Trail Analyzer',
  socio: 'Socio-Demographic Profiler',
  similar: 'Case Similarity Engine',
  forecast: 'Predictive Forecasting Model',
  text: 'RAG Document Retrieval',
  ocr: 'Vernacular OCR Processor',
  cdr: 'CDR Trajectory Analyzer',
  biometrics: 'Facial Biometric Matcher',
  dispatch: 'Patrol Dispatch System',
  timeline: 'Investigation Timeline Builder',
  early_warning: 'Early Warning Intelligence Engine',
  case_summary: 'Automated Case Summarizer',
};

const LLM_LABELS: Record<string, { name: string; badge: string; color: string }> = {
  glm: { name: 'GLM-5.2 Agentic', badge: '🧠', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
  groq: { name: 'Groq LPU · Llama 3.3 70B', badge: '⚡', color: 'text-orange-700 bg-orange-500/10 border-orange-500/20' },
  gemini: { name: 'Google Gemini 2.5 Flash', badge: '✦', color: 'text-[#1e3a5f] bg-blue-500/10 border-blue-500/20' },
  ollama: { name: 'Ollama · Gemma 2B (Local)', badge: '💻', color: 'text-purple-700 bg-purple-500/10 border-purple-500/20' },
  live: { name: 'Cloud LLM', badge: '☁️', color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20' },
  mock: { name: 'Rule-based (No LLM)', badge: '🔧', color: 'text-[#6c757d] bg-slate-500/10 border-slate-500/20' },
  fallback: { name: 'Fallback Mode', badge: '⚠️', color: 'text-amber-700 bg-amber-500/10 border-amber-500/20' },
};

// Reasoning path steps for each tool
const REASONING_STEPS: Record<string, string[]> = {
  risk: ['Query parsed & entity extracted', 'Accused records matched in DB', 'Socio-economic indicators loaded', 'Multi-factor risk score computed', 'Behavioral profile analyzed', 'LLM narrative generated'],
  network: ['Query classified as network analysis', 'CaseLinks table joined with FIR', 'Repeat offenders identified', 'Graph nodes & edges assembled', 'RLS jurisdiction filter applied', 'LLM narrative generated'],
  map: ['Query classified as geospatial', 'Location table joined with FIR', 'Crime type & district filters applied', 'Coordinates extracted for mapping', 'RLS jurisdiction filter applied', 'LLM narrative generated'],
  chart: ['Query classified as trend analytics', 'Monthly aggregation computed', 'District-level breakdown built', 'Seasonal pattern analysis run', 'Event-based cluster detection', 'LLM narrative generated'],
  finance: ['Query classified as financial trail', 'FinancialTransaction table queried', 'Suspicious transactions flagged', 'Money flow graph assembled', 'Cross-account pattern detected', 'LLM narrative generated'],
  socio: ['Query classified as socio-demographic', 'Accused demographics aggregated', 'SocioEconomicIndicators correlated', 'Age/gender/education profiled', 'Migration patterns analyzed', 'LLM narrative generated'],
  similar: ['Query classified as case matching', 'Target FIR loaded', 'MO & crime type similarity scored', 'Shared accused/gang links checked', 'Investigative leads generated', 'LLM narrative generated'],
  forecast: ['Query classified as predictive', 'CrimeForecast table queried', 'Risk levels & confidence extracted', 'Geographic scope filtered', 'Recommendations compiled', 'LLM narrative generated'],
  text: ['Query routed to RAG retrieval', 'Concept vectors computed', 'Cosine similarity ranked', 'Top matching FIRs extracted', 'RLS scope applied', 'LLM narrative generated'],
  ocr: ['Document uploaded & decoded', 'Zia OCR text extraction run', 'Kannada → English translation', 'Named entity recognition applied', 'Suspects & locations identified', 'LLM narrative generated'],
  cdr: ['Query classified as CDR analysis', 'CDR cell tower pings loaded', 'Spatial trajectory assembled', 'Crime scene proximity checked', 'Collision alerts computed', 'LLM narrative generated'],
  biometrics: ['Query classified as biometric search', 'Accused photo database queried', 'Zia facial similarity computed', 'Match candidates ranked', 'RLS jurisdiction filtered', 'LLM narrative generated'],
  dispatch: ['Query classified as dispatch ops', 'Patrol unit status loaded', 'Emergency 112 logs retrieved', 'Vehicle GPS positions mapped', 'Optimal routing computed', 'LLM narrative generated'],
  timeline: ['Query classified as timeline', 'FIR event history loaded', 'Chronological ordering applied', 'Key milestones identified', 'Investigation leads extracted', 'LLM narrative generated'],
  early_warning: ['Query classified as early warning', 'Repeat offender scan complete', 'Gang activity patterns detected', 'MO cluster analysis run', 'Geographic hotspots mapped', 'LLM narrative generated'],
  case_summary: ['Query classified as case summary', 'FIR + Accused + Victims loaded', 'Financial trail appended', 'Case links cross-referenced', 'Executive brief generated', 'LLM narrative generated'],
};

export const EvidenceTrail: React.FC<EvidenceTrailProps> = ({ sources, llmMode }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Handle array of sources or single source object
  const actualSource = Array.isArray(sources) ? sources[0] : sources;
  
  // Safe default if actualSource is missing
  const safeSource = actualSource || { tool: 'Unknown', tablesAccessed: [], confidence: 'low' };
  const confidenceStyle = getConfidenceStyle(safeSource.confidence);
  const toolLabel = TOOL_LABELS[safeSource.tool] || safeSource.tool;
  const llmInfo = LLM_LABELS[llmMode || 'mock'] || LLM_LABELS.mock;
  const steps = REASONING_STEPS[safeSource.tool] || REASONING_STEPS.text;

  return (
    <div className="mt-2 rounded-lg border border-[#d1d9e6]/60 bg-[#f0f4f8] overflow-hidden max-w-full">
      {/* Toggle Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[#6c757d] hover:text-[#2d4a6f] hover:bg-white/40 transition"
      >
        <span className="flex items-center gap-1.5">
          <Shield size={12} className="text-[#1e3a5f]" />
          <span className="font-semibold">Explainable AI — Evidence Trail</span>
          <span className={`text-[9px] ml-1 px-1.5 py-0.5 rounded-full border font-semibold ${confidenceStyle.bg} ${confidenceStyle.color} ${confidenceStyle.border} flex items-center gap-1`}>
            <span className={`h-1 w-1 rounded-full ${confidenceStyle.dot}`} />
            {safeSource.confidence}
          </span>
        </span>
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-[#d1d9e6]/40 space-y-3 max-h-[320px] overflow-y-auto">

          {/* LLM Provider Badge */}
          <div className="flex items-center gap-2 pt-3">
            <Cpu size={13} className="text-[#1e3a5f] shrink-0" />
            <span className="text-[10px] text-[#6c757d] uppercase font-semibold tracking-wider">AI Engine:</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${llmInfo.color} flex items-center gap-1`}>
              {llmInfo.badge} {llmInfo.name}
            </span>
          </div>

          {/* Tool Used */}
          <div className="flex items-center gap-2">
            <Wrench size={13} className="text-[#1e3a5f] shrink-0" />
            <span className="text-[10px] text-[#6c757d] uppercase font-semibold tracking-wider">Analysis Tool:</span>
            <span className="text-xs text-[#1e3a5f] font-medium">{toolLabel}</span>
          </div>

          {/* Tables Accessed */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Database size={13} className="text-purple-700 shrink-0" />
              <span className="text-[10px] text-[#6c757d] uppercase font-semibold tracking-wider">Data Sources Queried:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 ml-5">
              {safeSource.tablesAccessed.map((table: string, index: number) => (
                <span
                  key={index}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#2d4a6f] border border-[#d1d9e6] font-mono"
                >
                  {table}
                </span>
              ))}
            </div>
          </div>

          {/* Confidence Level */}
          <div className="flex items-center gap-2">
            <Gauge size={13} className={confidenceStyle.color + ' shrink-0'} />
            <span className="text-[10px] text-[#6c757d] uppercase font-semibold tracking-wider">Confidence:</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${confidenceStyle.bg} ${confidenceStyle.color} ${confidenceStyle.border} flex items-center gap-1`}>
              <span className={`h-1.5 w-1.5 rounded-full ${confidenceStyle.dot}`} />
              {safeSource.confidence}
            </span>
          </div>

          {/* Data Points Analyzed */}
          {safeSource.queryCount !== undefined && (
            <div className="flex items-center gap-2">
              <BarChart3 size={13} className="text-cyan-400 shrink-0" />
              <span className="text-[10px] text-[#6c757d] uppercase font-semibold tracking-wider">Data Points Analyzed:</span>
              <span className="text-xs text-[#1e3a5f] font-bold">{safeSource.queryCount.toLocaleString()}</span>
            </div>
          )}

          {/* Reasoning Path Visualization */}
          <div className="pt-1">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch size={13} className="text-emerald-700 shrink-0" />
              <span className="text-[10px] text-[#6c757d] uppercase font-semibold tracking-wider">AI Reasoning Path:</span>
            </div>
            <div className="ml-5 space-y-0">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  {/* Vertical connector line + dot */}
                  <div className="flex flex-col items-center">
                    <div className={`h-2.5 w-2.5 rounded-full border-2 shrink-0 mt-0.5 ${
                      i === steps.length - 1 
                        ? 'bg-emerald-500 border-emerald-400' 
                        : 'bg-slate-700 border-[#d1d9e6]'
                    }`} />
                    {i < steps.length - 1 && (
                      <div className="w-px h-3 bg-slate-700" />
                    )}
                  </div>
                  <span className={`text-[10px] font-medium leading-tight ${
                    i === steps.length - 1 ? 'text-emerald-700' : 'text-[#6c757d]'
                  }`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {safeSource.description && (
            <div className="flex items-start gap-2 pt-1">
              <Zap size={13} className="text-amber-700 shrink-0 mt-0.5" />
              <span className="text-[10px] text-[#6c757d] italic leading-relaxed">{safeSource.description}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
