import React, { useState } from 'react';
import { Radio, Truck, CheckCircle, Navigation } from 'lucide-react';

interface PatrolUnit {
  id: string;
  vehicle: string;
  lat: number;
  lng: number;
  status: 'Available' | 'Busy';
  officer: string;
}

interface DispatchLog {
  id: number;
  time: string;
  caller: string;
  details: string;
  status: 'Pending' | 'Dispatched';
  vehicle: string;
}

interface DispatchConsoleCardProps {
  data: {
    units: PatrolUnit[];
    logs: DispatchLog[];
  };
}

export const DispatchConsoleCard: React.FC<DispatchConsoleCardProps> = ({ data }) => {
  const [localLogs, setLocalLogs] = useState<DispatchLog[]>(data.logs || []);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  if (!data) return null;

  const handleRecommend = (logId: number) => {
    setSelectedLogId(logId);
    // Suggest the first available patrol unit
    const availableUnit = data.units.find(u => u.status === 'Available');
    if (availableUnit) {
      setRecommendation(`AI Suggests dispatching ${availableUnit.vehicle} (Officer: ${availableUnit.officer}) - Estimated dispatch time: 3 mins.`);
    } else {
      setRecommendation(`All units are currently busy. Dispatching closest secondary patrol unit KA-01-G-7788.`);
    }
  };

  const handleDispatch = (logId: number) => {
    const availableUnit = data.units.find(u => u.status === 'Available');
    setLocalLogs(prev => prev.map(log => {
      if (log.id === logId) {
        return {
          ...log,
          status: 'Dispatched',
          vehicle: availableUnit ? availableUnit.vehicle : 'KA-01-G-7788'
        };
      }
      return log;
    }));
    setRecommendation(null);
    setSelectedLogId(null);
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Radio className="text-red-500 h-5 w-5 animate-pulse" />
          <h4 className="font-bold text-sm uppercase tracking-wider text-slate-200">
            Emergency Dispatch Desk (KSP 112 Hub)
          </h4>
        </div>
        <span className="text-[10px] bg-red-500/10 border border-red-500/25 text-red-400 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
          Live Dispatch
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Active 112 Ticker Feed */}
        <div className="space-y-3">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Recent 112 Call Tickers
          </span>
          <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
            {localLogs.map((log) => (
              <div 
                key={log.id} 
                className={`p-3 rounded-lg border text-xs transition ${
                  log.status === 'Dispatched' 
                    ? 'bg-slate-950/40 border-slate-850 opacity-75' 
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400 font-bold text-[10px]">{log.time} • Caller: {log.caller}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                    log.status === 'Dispatched' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-slate-200 font-semibold mb-2">{log.details}</p>
                
                {log.status === 'Pending' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRecommend(log.id)}
                      className="px-2.5 py-1 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 font-semibold rounded text-[10px] cursor-pointer flex items-center gap-1"
                    >
                      <Navigation size={10} className="text-brand-primary" />
                      Run AI Dispatch Router
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle size={10} />
                    Dispatched unit: {log.vehicle}
                  </div>
                )}

                {/* Recommendation Modal / UI inline */}
                {selectedLogId === log.id && recommendation && (
                  <div className="mt-2.5 p-2 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary rounded text-[11px] font-bold space-y-2">
                    <div>{recommendation}</div>
                    <button
                      onClick={() => handleDispatch(log.id)}
                      className="px-2 py-0.5 bg-brand-primary text-white rounded font-bold text-[10px] hover:bg-brand-primary/90 cursor-pointer"
                    >
                      Confirm Dispatch Unit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Patrol Vehicles Status Registry */}
        <div className="space-y-3">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            KSP Fleet Registry Status
          </span>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {data.units.map((unit) => (
              <div 
                key={unit.id} 
                className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded bg-slate-900 border ${
                    unit.status === 'Available' ? 'border-emerald-500/20' : 'border-slate-800'
                  }`}>
                    <Truck size={14} className={unit.status === 'Available' ? 'text-emerald-400' : 'text-slate-500'} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">{unit.vehicle}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">Officer: {unit.officer}</div>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  unit.status === 'Available' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {unit.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
