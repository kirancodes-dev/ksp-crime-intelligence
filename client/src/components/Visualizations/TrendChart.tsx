import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { Calendar, BarChart3, CloudSun, AlertTriangle } from 'lucide-react';

interface MonthlyTrend {
  month: string;
  cyber: number;
  theft: number;
  organized: number;
  fraud: number;
  total: number;
}

interface DistrictCrime {
  district: string;
  cyber: number;
  theft: number;
  organized: number;
  fraud: number;
  total: number;
}

interface TrendChartProps {
  data: {
    monthly: MonthlyTrend[];
    district: DistrictCrime[];
    seasonal?: Record<string, Record<string, number>>;
    eventBased?: Array<{
      district: string;
      crime_type: string;
      incident_count: number;
      start_date: string;
      end_date: string;
    }>;
  };
}

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'district' | 'seasonal'>('timeline');

  // Custom tooltips matching the premium theme
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-[#d1d9e6] p-3 rounded-lg shadow-xl text-xs">
          <p className="font-bold text-[#1e3a5f] mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-3 justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-[#6c757d]">{entry.name}:</span>
                </div>
                <strong className="text-[#1e3a5f]">{entry.value}</strong>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Convert seasonal object to chart array format
  const seasons = ['Summer (Mar-May)', 'Monsoon (Jun-Aug)', 'Post-Monsoon (Sep-Nov)', 'Winter (Dec-Feb)'];
  const seasonalChartData = seasons.map(season => {
    const sData = data.seasonal?.[season] || {};
    return {
      season,
      cyber: sData['Cyber Crime'] || 0,
      theft: sData['Theft'] || 0,
      organized: sData['Organized Crime'] || 0,
      fraud: sData['Financial Fraud'] || 0
    };
  });

  return (
    <div className="bg-white rounded-lg border border-[#d1d9e6] p-6 text-[#1e3a5f] shadow-sm w-full my-4">
      {/* Header and Toggle TABS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#d1d9e6] pb-4 mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1e3a5f] flex items-center gap-2">
            <BarChart3 className="text-[#1e3a5f]" size={20} /> Statistical Crime Timelines & Densities
          </h2>
          <p className="text-xs text-[#6c757d] mt-0.5">Aggregated district analytics, seasonal changes, and local cluster events</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-[#f0f4f8] border border-[#d1d9e6] rounded-lg p-0.5 self-stretch sm:self-auto select-none">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'timeline' ? 'bg-[#1e3a5f] text-white font-bold' : 'text-[#6c757d] hover:text-[#1e3a5f]'
            }`}
          >
            <Calendar size={14} /> Monthly Timeline
          </button>
          <button
            onClick={() => setActiveTab('district')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'district' ? 'bg-[#1e3a5f] text-white font-bold' : 'text-[#6c757d] hover:text-[#1e3a5f]'
            }`}
          >
            <BarChart3 size={14} /> District Comparison
          </button>
          <button
            onClick={() => setActiveTab('seasonal')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'seasonal' ? 'bg-[#1e3a5f] text-white font-bold' : 'text-[#6c757d] hover:text-[#1e3a5f]'
            }`}
          >
            <CloudSun size={14} /> Seasonal &amp; Events
          </button>
        </div>
      </div>

      {/* Chart Render Area */}
      <div className="w-full">
        {activeTab === 'timeline' && (
          <div className="w-full h-80 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCyber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorTheft" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorOrganized" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorFraud" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e8ecf1" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="#6c757d" fontSize={10} tickLine={false} />
                <YAxis stroke="#6c757d" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <Area type="monotone" name="Cyber Crime" dataKey="cyber" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCyber)" />
                <Area type="monotone" name="Theft" dataKey="theft" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorTheft)" />
                <Area type="monotone" name="Organized Crime" dataKey="organized" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorOrganized)" />
                <Area type="monotone" name="Financial Fraud" dataKey="fraud" stroke="#eab308" strokeWidth={2} fillOpacity={1} fill="url(#colorFraud)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'district' && (
          <div className="w-full h-80 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.district} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#e8ecf1" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="district" stroke="#6c757d" fontSize={10} tickLine={false} />
                <YAxis stroke="#6c757d" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <Bar name="Cyber Crime" dataKey="cyber" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar name="Theft" dataKey="theft" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar name="Organized Crime" dataKey="organized" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar name="Financial Fraud" dataKey="fraud" fill="#eab308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'seasonal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[300px]">
            {/* Seasonal Bar Chart */}
            <div className="lg:col-span-7 h-80">
              <h3 className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wider mb-3">Seasonal Crime Distribution</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonalChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#e8ecf1" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="season" stroke="#6c757d" fontSize={9} tickLine={false} />
                  <YAxis stroke="#6c757d" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                  <Bar name="Cyber Crime" dataKey="cyber" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar name="Theft" dataKey="theft" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar name="Organized Crime" dataKey="organized" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar name="Financial Fraud" dataKey="fraud" fill="#eab308" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Event-Based Cluster Alerts */}
            <div className="lg:col-span-5 flex flex-col">
              <h3 className="text-xs font-bold text-[#d9251c] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-[#d9251c]" /> Spatiotemporal Event Clusters
              </h3>
              <div className="flex-1 bg-[#f8f9fa] border border-[#d1d9e6] rounded-lg p-4 space-y-3 overflow-y-auto max-h-[280px]">
                {data.eventBased && data.eventBased.length > 0 ? (
                  data.eventBased.map((ev, index) => (
                    <div key={index} className="bg-white border-l-4 border-[#d9251c] border-t border-b border-r border-[#d1d9e6] p-3 rounded shadow-sm space-y-1">
                      <div className="flex justify-between items-start">
                        <strong className="text-xs text-[#1e3a5f]">{ev.crime_type} Cluster</strong>
                        <span className="text-[10px] bg-red-50 text-[#d9251c] border border-red-100 px-1.5 py-0.5 rounded font-bold">
                          {ev.incident_count} Cases
                        </span>
                      </div>
                      <p className="text-[10px] text-[#4a5568]">
                        Multiple related incidents registered in <span className="font-semibold">{ev.district}</span> within 72 hours.
                      </p>
                      <div className="text-[9px] text-[#6c757d] font-mono flex justify-between pt-1 border-t border-slate-100">
                        <span>Range: {ev.start_date} to {ev.end_date}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-[#6c757d] italic text-center py-10">No active event-driven crime clusters detected.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
