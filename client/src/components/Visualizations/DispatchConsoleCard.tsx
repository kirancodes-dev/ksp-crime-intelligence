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
    <div className="w-full bg-[#f0f4f8] border border-[#d1d9e6] rounded-lg p-5 shadow-lg text-[#1e3a5f]">
      <div className="flex items-center justify-between border-b border-[#d1d9e6] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Radio className="text-red-500 h-5 w-5 animate-pulse" />
          <h4 className="font-bold text-sm uppercase tracking-wider text-[#1e3a5f]">
            Emergency Dispatch Desk (KSP 112 Hub)
          </h4>
        </div>
        <span className="text-[10px] bg-red-500/10 border border-red-500/25 text-[#d9251c] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
          Live Dispatch
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Active 112 Ticker Feed */}
        <div className="space-y-3">
          <span className="text-[10px] uppercase font-bold text-[#6c757d] block mb-1">
            Recent 112 Call Tickers
          </span>
          <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
            {localLogs.map((log) => (
              <div 
                key={log.id} 
                className={`p-3 rounded-lg border text-xs transition ${
                  log.status === 'Dispatched' 
                    ? 'bg-[#0d2137]/40 border-[#d1d9e6] opacity-75' 
                    : 'bg-[#0d2137] border-[#d1d9e6] hover:border-[#d1d9e6]'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[#6c757d] font-bold text-[10px]">{log.time} • Caller: {log.caller}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                    log.status === 'Dispatched' 
                      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' 
                      : 'bg-red-500/10 text-[#d9251c] border-red-500/20'
                  }`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-[#1e3a5f] font-semibold mb-2">{log.details}</p>
                
                {log.status === 'Pending' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRecommend(log.id)}
                      className="px-2.5 py-1 bg-slate-850 hover:bg-white border border-[#d1d9e6] text-[#2d4a6f] font-semibold rounded text-[10px] cursor-pointer flex items-center gap-1"
                    >
                      <Navigation size={10} className="text-[#1e3a5f]" />
                      Run AI Dispatch Router
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle size={10} />
                    Dispatched unit: {log.vehicle}
                  </div>
                )}

                {/* Recommendation Modal / UI inline */}
                {selectedLogId === log.id && recommendation && (
                  <div className="mt-2.5 p-2 bg-[#1e3a5f]/10 border border-[#1e3a5f]/20 text-white rounded text-[11px] font-bold space-y-2">
                    <div>{recommendation}</div>
                    <button
                      onClick={() => handleDispatch(log.id)}
                      className="px-2 py-0.5 bg-[#1e3a5f] text-white rounded font-bold text-[10px] hover:bg-[#1e3a5f]/90 cursor-pointer"
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
          <span className="text-[10px] uppercase font-bold text-[#6c757d] block mb-1">
            KSP Fleet Registry Status
          </span>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {data.units.map((unit) => (
              <div 
                key={unit.id} 
                className="flex items-center justify-between p-2.5 bg-white border border-[#d1d9e6] rounded-lg text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded bg-[#f0f4f8] border ${
                    unit.status === 'Available' ? 'border-emerald-500/20' : 'border-[#d1d9e6]'
                  }`}>
                    <Truck size={14} className={unit.status === 'Available' ? 'text-emerald-700' : 'text-[#6c757d]'} />
                  </div>
                  <div>
                    <div className="font-bold text-[#1e3a5f]">{unit.vehicle}</div>
                    <div className="text-[10px] text-[#6c757d] font-semibold">Officer: {unit.officer}</div>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  unit.status === 'Available' 
                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
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
