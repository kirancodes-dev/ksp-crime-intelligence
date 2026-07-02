import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Shield, MapPin, Clock, Database, Lightbulb, Brain } from 'lucide-react';

interface Forecast {
  district: string;
  predicted_crime_type: string;
  risk_level: 'Critical' | 'High' | 'Medium' | string;
  confidence: number;
  reasoning: string;
  recommended_action: string;
  data_sources: string[];
  valid_until: string;
}

interface ForecastAlertPanelProps {
  forecasts: Forecast[];
}

const getRiskStyles = (level: string) => {
  switch (level) {
    case 'Critical':
      return {
        badge: 'bg-red-500/20 text-[#d9251c] border-red-200',
        border: 'border-red-500/40',
        bar: 'bg-red-500',
        accent: 'border-l-4 border-l-red-500',
      };
    case 'High':
      return {
        badge: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
        border: 'border-orange-500/30',
        bar: 'bg-orange-500',
        accent: 'border-l-4 border-l-orange-500',
      };
    case 'Medium':
      return {
        badge: 'bg-yellow-500/20 text-amber-700 border-yellow-500/30',
        border: 'border-yellow-500/20',
        bar: 'bg-yellow-500',
        accent: 'border-l-4 border-l-yellow-500',
      };
    default:
      return {
        badge: 'bg-slate-500/20 text-[#6c757d] border-slate-500/30',
        border: 'border-[#d1d9e6]',
        bar: 'bg-slate-500',
        accent: '',
      };
  }
};

const ForecastCard: React.FC<{ forecast: Forecast }> = ({ forecast }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const styles = getRiskStyles(forecast.risk_level);
  const confidencePercent = Math.round(forecast.confidence * (forecast.confidence <= 1 ? 100 : 1));

  const toggle = (section: string) => {
    setExpanded(prev => (prev === section ? null : section));
  };

  return (
    <div
      className={`bg-brand-card rounded-lg border p-4 transition-all ${styles.border} ${styles.accent}`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${styles.badge}`}>
              {forecast.risk_level}
            </span>
            <span className="text-xs text-[#6c757d] flex items-center gap-1">
              <Clock size={10} /> Valid until {forecast.valid_until}
            </span>
          </div>
          <h3 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-1.5">
            <MapPin size={14} className="text-[#6c757d]" /> {forecast.district}
          </h3>
        </div>
        <Shield size={20} className={styles.badge.includes('red') ? 'text-[#d9251c]' : styles.badge.includes('orange') ? 'text-orange-700' : 'text-amber-700'} />
      </div>

      {/* Predicted Crime Type */}
      <div className="mb-3">
        <span className="text-xs text-[#6c757d]">Predicted Crime:</span>
        <span className="text-sm font-semibold text-[#1e3a5f] ml-2">{forecast.predicted_crime_type}</span>
      </div>

      {/* Confidence Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-[#6c757d]">Confidence</span>
          <span className="font-bold text-[#1e3a5f]">{confidencePercent}%</span>
        </div>
        <div className="w-full h-2 bg-white rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
      </div>

      {/* Expandable Sections */}
      <div className="space-y-1.5">
        {/* Reasoning */}
        <div className="border border-[#d1d9e6]/60 rounded-md overflow-hidden">
          <button
            onClick={() => toggle('reasoning')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#2d4a6f] hover:bg-white/40 transition"
          >
            <span className="flex items-center gap-1.5">
              <Brain size={12} className="text-[#1e3a5f]" /> Reasoning
            </span>
            {expanded === 'reasoning' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expanded === 'reasoning' && (
            <div className="px-3 pb-3 text-xs text-[#6c757d] border-t border-[#d1d9e6]/40 pt-2">
              {forecast.reasoning}
            </div>
          )}
        </div>

        {/* Recommended Action */}
        <div className="border border-[#d1d9e6]/60 rounded-md overflow-hidden">
          <button
            onClick={() => toggle('action')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#2d4a6f] hover:bg-white/40 transition"
          >
            <span className="flex items-center gap-1.5">
              <Lightbulb size={12} className="text-amber-700" /> Recommended Action
            </span>
            {expanded === 'action' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expanded === 'action' && (
            <div className="px-3 pb-3 text-xs text-[#6c757d] border-t border-[#d1d9e6]/40 pt-2">
              {forecast.recommended_action}
            </div>
          )}
        </div>

        {/* Data Sources */}
        <div className="border border-[#d1d9e6]/60 rounded-md overflow-hidden">
          <button
            onClick={() => toggle('sources')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#2d4a6f] hover:bg-white/40 transition"
          >
            <span className="flex items-center gap-1.5">
              <Database size={12} className="text-emerald-700" /> Data Sources ({forecast.data_sources.length})
            </span>
            {expanded === 'sources' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expanded === 'sources' && (
            <div className="px-3 pb-3 border-t border-[#d1d9e6]/40 pt-2 flex flex-wrap gap-1.5">
              {forecast.data_sources.map((src, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-medium"
                >
                  {src}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ForecastAlertPanel: React.FC<ForecastAlertPanelProps> = ({ forecasts }) => {
  const criticalCount = forecasts.filter(f => f.risk_level === 'Critical').length;
  const highCount = forecasts.filter(f => f.risk_level === 'High').length;

  return (
    <div className="card-panel rounded-lg p-6 text-[#1e3a5f] w-full my-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#d1d9e6] pb-4 mb-6 gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1e3a5f] flex items-center gap-2">
            <AlertTriangle className="text-[#1e3a5f]" size={20} /> Predictive Intelligence Alerts
          </h2>
          <p className="text-xs text-[#6c757d] mt-0.5">AI-generated crime forecasts and recommended deployments</p>
        </div>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/20 text-[#d9251c] border border-red-200">
              {criticalCount} Critical
            </span>
          )}
          {highCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-orange-500/20 text-orange-700 border border-orange-500/30">
              {highCount} High
            </span>
          )}
        </div>
      </div>

      {/* Forecast Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {forecasts.map((forecast, index) => (
          <ForecastCard key={index} forecast={forecast} />
        ))}
      </div>
    </div>
  );
};
