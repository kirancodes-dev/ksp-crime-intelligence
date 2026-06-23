import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';

interface TimelineEvent {
  date: string;
  type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  details?: any;
}

interface InvestigationTimelineProps {
  data: {
    timeline: TimelineEvent[];
    summary: {
      executive: string;
      overview: any;
      victims: any[];
      suspects: any[];
      financial: any;
      network: any;
      leads: string[];
      escalations: string[];
    };
    suspects: any[];
    leads: string[];
  };
}

const severityColors: Record<string, string> = {
  critical: 'border-red-500 bg-red-500/10',
  warning: 'border-amber-500 bg-amber-500/10',
  info: 'border-blue-500 bg-blue-500/10',
};

const severityDot: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

export const InvestigationTimeline: React.FC<InvestigationTimelineProps> = ({ data }) => {
  const { timeline, summary } = data;

  return (
    <div className="w-full max-w-3xl mx-auto my-4 space-y-4">
      {/* Executive Summary */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Executive Summary</h4>
        <p className="text-sm text-slate-300 leading-relaxed">{summary.executive}</p>
      </div>

      {/* Timeline */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock size={12} /> Investigation Timeline ({timeline.length} events)
        </h4>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-600" />
          <div className="space-y-3">
            {timeline.map((event, idx) => (
              <div key={idx} className="relative pl-10">
                <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-slate-800 ${severityDot[event.severity]}`} />
                <div className={`border-l-2 ${severityColors[event.severity]} rounded-r-lg p-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-slate-500 font-mono">{event.date}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      event.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                      event.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>{event.type.replace(/_/g, ' ')}</span>
                  </div>
                  <h5 className="text-xs font-bold text-white">{event.title}</h5>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Investigative Leads */}
      {summary.leads.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Investigative Leads</h4>
          <div className="space-y-1.5">
            {summary.leads.map((lead, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                <ChevronRight size={10} className="text-emerald-400 mt-0.5 shrink-0" />
                <span>{lead}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Escalation Flags */}
      {summary.escalations.length > 0 && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-4">
          <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Escalation Flags</h4>
          <div className="space-y-1">
            {summary.escalations.map((esc, idx) => (
              <p key={idx} className="text-[11px] text-red-300">{esc}</p>
            ))}
          </div>
        </div>
      )}

      {/* Suspects Overview */}
      {summary.suspects.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Suspects ({summary.suspects.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {summary.suspects.map((s, idx) => (
              <div key={idx} className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white">{s.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    s.threat_level === 'Critical' ? 'bg-red-500/20 text-red-400' :
                    s.threat_level === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>{s.threat_level}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Score: {(s.risk_score * 100).toFixed(0)}% • {s.gang || 'No gang'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
