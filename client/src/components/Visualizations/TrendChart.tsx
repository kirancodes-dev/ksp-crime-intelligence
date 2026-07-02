import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { Calendar, BarChart3 } from 'lucide-react';

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
  };
}

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'district'>('timeline');

  // Custom tooltips matching the premium dark theme
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="card-panel border border-[#d1d9e6] p-3 rounded-lg shadow-xl text-xs">
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

  return (
    <div className="card-panel rounded-lg border border-[#d1d9e6] p-6 text-[#1e3a5f] shadow-xl w-full my-4">
      {/* Header and Toggle TABS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#d1d9e6] pb-4 mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1e3a5f] flex items-center gap-2">
            <BarChart3 className="text-[#1e3a5f]" size={20} /> Statistical Crime Timelines & Densities
          </h2>
          <p className="text-xs text-[#6c757d] mt-0.5">Aggregated district analytics and chronological trends</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-[#f0f4f8] border border-[#d1d9e6] rounded-lg p-0.5 self-stretch sm:self-auto">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'timeline' ? 'bg-[#1e3a5f] text-white' : 'text-[#6c757d] hover:text-white'
            }`}
          >
            <Calendar size={14} /> Monthly Timeline
          </button>
          <button
            onClick={() => setActiveTab('district')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'district' ? 'bg-[#1e3a5f] text-white' : 'text-[#6c757d] hover:text-white'
            }`}
          >
            <BarChart3 size={14} /> District Comparison
          </button>
        </div>
      </div>

      {/* Chart Render Area */}
      <div className="w-full h-80 min-h-[300px]">
        {activeTab === 'timeline' ? (
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
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              <Area type="monotone" name="Cyber Crime" dataKey="cyber" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCyber)" />
              <Area type="monotone" name="Theft" dataKey="theft" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorTheft)" />
              <Area type="monotone" name="Organized Crime" dataKey="organized" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorOrganized)" />
              <Area type="monotone" name="Financial Fraud" dataKey="fraud" stroke="#eab308" strokeWidth={2} fillOpacity={1} fill="url(#colorFraud)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.district} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="district" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              <Bar name="Cyber Crime" dataKey="cyber" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar name="Theft" dataKey="theft" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar name="Organized Crime" dataKey="organized" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar name="Financial Fraud" dataKey="fraud" fill="#eab308" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
