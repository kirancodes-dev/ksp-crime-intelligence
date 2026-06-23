import React from 'react';
import { FileText, Users, Landmark, Link, ChevronRight, Shield } from 'lucide-react';

interface CaseSummaryCardProps {
  data: {
    summary: {
      executive: string;
      overview: any;
      victims: any[];
      suspects: any[];
      financial: any;
      network: any;
      leads: any[];
      evidence: string[];
    };
    riskAssessment: {
      overall: number;
      level: string;
      factors: any[];
    };
  };
}

export const CaseSummaryCard: React.FC<CaseSummaryCardProps> = ({ data }) => {
  const { summary, riskAssessment } = data;
  const { overview, financial, network } = summary;

  return (
    <div className="w-full max-w-3xl mx-auto my-4 space-y-4">
      {/* Executive Summary */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={14} className="text-blue-400" />
          <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Case Dossier: {overview.fir_number}</h4>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{summary.executive}</p>
      </div>

      {/* Risk Assessment */}
      <div className={`border rounded-lg p-4 ${
        riskAssessment.level === 'Critical' ? 'bg-red-900/20 border-red-800/40' :
        riskAssessment.level === 'Medium' ? 'bg-amber-900/20 border-amber-800/40' :
        'bg-emerald-900/20 border-emerald-800/40'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} className={
            riskAssessment.level === 'Critical' ? 'text-red-400' :
            riskAssessment.level === 'Medium' ? 'text-amber-400' : 'text-emerald-400'
          } />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Overall Risk: {riskAssessment.level} ({(riskAssessment.overall * 100).toFixed(0)}%)</h4>
        </div>
        {riskAssessment.factors.length > 0 && (
          <div className="space-y-1">
            {riskAssessment.factors.map((f, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px]">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  f.impact === 'Critical' ? 'bg-red-500/20 text-red-400' :
                  f.impact === 'High' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>{f.impact}</span>
                <span className="text-slate-300"><strong>{f.factor}:</strong> {f.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suspects */}
      {summary.suspects.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Users size={12} /> Suspects ({summary.suspects.length})
          </h4>
          <div className="space-y-2">
            {summary.suspects.map((s, idx) => (
              <div key={idx} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white">{s.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    s.threat_level === 'Critical' ? 'bg-red-500/20 text-red-400' :
                    s.threat_level === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>{s.threat_level} ({(s.risk_score * 100).toFixed(0)}%)</span>
                </div>
                <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
                  {s.age && <span>Age: {s.age}</span>}
                  {s.occupation && <span>Occupation: {s.occupation}</span>}
                  {s.gang && <span className="text-amber-400">Gang: {s.gang}</span>}
                  {s.prior_convictions > 0 && <span className="text-red-400">{s.prior_convictions} prior convictions</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial Intelligence */}
      {financial.total_transactions > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Landmark size={12} /> Financial Intelligence
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <div className="bg-slate-900/50 rounded p-2 text-center">
              <div className="text-xs font-bold text-white">{financial.total_transactions}</div>
              <div className="text-[8px] text-slate-500">Transactions</div>
            </div>
            <div className="bg-slate-900/50 rounded p-2 text-center">
              <div className="text-xs font-bold text-white">Rs {financial.total_amount.toLocaleString('en-IN')}</div>
              <div className="text-[8px] text-slate-500">Total Flow</div>
            </div>
            <div className="bg-red-900/20 rounded p-2 text-center border border-red-800/30">
              <div className="text-xs font-bold text-red-400">{financial.suspicious_count}</div>
              <div className="text-[8px] text-slate-500">Suspicious</div>
            </div>
            <div className="bg-red-900/20 rounded p-2 text-center border border-red-800/30">
              <div className="text-xs font-bold text-red-400">Rs {financial.suspicious_amount.toLocaleString('en-IN')}</div>
              <div className="text-[8px] text-slate-500">Flagged</div>
            </div>
          </div>
        </div>
      )}

      {/* Network Connections */}
      {network.linked_cases.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Link size={12} /> Network Connections
          </h4>
          <div className="space-y-1.5">
            {network.linked_cases.map((l: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-300">
                <ChevronRight size={10} className="text-blue-400 shrink-0" />
                <span><strong>{l.fir}</strong> — {l.link_type.replace(/_/g, ' ')} ({(l.confidence * 100).toFixed(0)}% confidence)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence */}
      {summary.evidence.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">Key Evidence</h4>
          <div className="space-y-1">
            {summary.evidence.map((e, idx) => (
              <p key={idx} className="text-[11px] text-slate-300">• {e}</p>
            ))}
          </div>
        </div>
      )}

      {/* Investigative Leads */}
      {summary.leads.length > 0 && (
        <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-lg p-4">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Investigative Leads</h4>
          <div className="space-y-1.5">
            {summary.leads.map((lead, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11px]">
                <span className="text-emerald-400 font-bold">P{lead.priority}</span>
                <span className="text-slate-300"><strong>{lead.action}</strong> — {lead.rationale}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
