import React from 'react';
import { ShieldAlert, Users, MapPin, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

interface EarlyWarningAlert {
  type: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  [key: string]: any;
}

interface EarlyWarningPanelProps {
  data: {
    alerts: EarlyWarningAlert[];
    summary: {
      total_alerts: number;
      critical_count: number;
      high_count: number;
      repeat_offenders: number;
      active_gangs: number;
      mo_clusters: number;
      geo_hotspots: number;
      escalations: number;
      temporal_surges: number;
      recommendations: string[];
    };
  };
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  REPEAT_OFFENDER: { icon: <Users size={12} />, color: 'text-red-400', label: 'Repeat Offender' },
  GANG_ACTIVITY: { icon: <ShieldAlert size={12} />, color: 'text-red-400', label: 'Gang Activity' },
  MO_CLUSTER: { icon: <TrendingUp size={12} />, color: 'text-amber-400', label: 'MO Pattern' },
  GEOGRAPHIC_CLUSTER: { icon: <MapPin size={12} />, color: 'text-amber-400', label: 'Geographic Hotspot' },
  ESCALATION: { icon: <AlertTriangle size={12} />, color: 'text-red-400', label: 'Escalation' },
  TEMPORAL_CLUSTER: { icon: <Clock size={12} />, color: 'text-orange-400', label: 'Temporal Surge' },
};

const severityBg: Record<string, string> = {
  Critical: 'bg-red-500/10 border-red-500/30',
  High: 'bg-amber-500/10 border-amber-500/30',
  Medium: 'bg-blue-500/10 border-blue-500/30',
  Low: 'bg-slate-500/10 border-slate-500/30',
};

export const EarlyWarningPanel: React.FC<EarlyWarningPanelProps> = ({ data }) => {
  const { alerts, summary } = data;

  return (
    <div className="w-full max-w-3xl mx-auto my-4 space-y-4">
      {/* Summary Dashboard */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ShieldAlert size={12} /> Enhanced Early Warning Intelligence
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <div className="bg-red-900/20 rounded-lg p-2.5 text-center border border-red-800/30">
            <div className="text-lg font-bold text-red-400">{summary.critical_count}</div>
            <div className="text-[9px] text-slate-500 uppercase">Critical</div>
          </div>
          <div className="bg-amber-900/20 rounded-lg p-2.5 text-center border border-amber-800/30">
            <div className="text-lg font-bold text-amber-400">{summary.high_count}</div>
            <div className="text-[9px] text-slate-500 uppercase">High</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-2.5 text-center border border-slate-600/30">
            <div className="text-lg font-bold text-white">{summary.total_alerts}</div>
            <div className="text-[9px] text-slate-500 uppercase">Total Alerts</div>
          </div>
          <div className="bg-blue-900/20 rounded-lg p-2.5 text-center border border-blue-800/30">
            <div className="text-lg font-bold text-blue-400">{summary.repeat_offenders + summary.active_gangs}</div>
            <div className="text-[9px] text-slate-500 uppercase">Threats</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5 text-center">
          <div className="bg-slate-900/50 rounded p-1.5">
            <div className="text-xs font-bold text-white">{summary.repeat_offenders}</div>
            <div className="text-[8px] text-slate-500">Repeat Offenders</div>
          </div>
          <div className="bg-slate-900/50 rounded p-1.5">
            <div className="text-xs font-bold text-white">{summary.active_gangs}</div>
            <div className="text-[8px] text-slate-500">Active Gangs</div>
          </div>
          <div className="bg-slate-900/50 rounded p-1.5">
            <div className="text-xs font-bold text-white">{summary.mo_clusters}</div>
            <div className="text-[8px] text-slate-500">MO Clusters</div>
          </div>
          <div className="bg-slate-900/50 rounded p-1.5">
            <div className="text-xs font-bold text-white">{summary.geo_hotspots}</div>
            <div className="text-[8px] text-slate-500">Geo Hotspots</div>
          </div>
          <div className="bg-slate-900/50 rounded p-1.5">
            <div className="text-xs font-bold text-white">{summary.temporal_surges}</div>
            <div className="text-[8px] text-slate-500">Temporal Surges</div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Active Alerts ({alerts.length})</h4>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {alerts.slice(0, 15).map((alert, idx) => {
            const config = typeConfig[alert.type] || typeConfig.REPEAT_OFFENDER;
            return (
              <div key={idx} className={`border rounded-lg p-3 ${severityBg[alert.severity] || severityBg.Medium}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={config.color}>{config.icon}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    alert.severity === 'Critical' ? 'bg-red-500/20 text-red-400' :
                    alert.severity === 'High' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>{alert.severity}</span>
                  <span className="text-[9px] text-slate-500 uppercase">{config.label}</span>
                </div>
                <h5 className="text-xs font-bold text-white">{alert.title}</h5>
                <p className="text-[11px] text-slate-400 mt-1">{alert.description}</p>
                <p className="text-[10px] text-emerald-400 mt-1.5 italic">Recommendation: {alert.recommendation}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strategic Recommendations */}
      {summary.recommendations.length > 0 && (
        <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-lg p-4">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Strategic Recommendations</h4>
          <div className="space-y-1">
            {summary.recommendations.map((rec, idx) => (
              <p key={idx} className="text-[11px] text-emerald-300">• {rec}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
