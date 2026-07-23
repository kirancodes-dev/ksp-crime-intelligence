import React from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  CartesianGrid,
} from 'recharts';
import { Users } from 'lucide-react';

interface AgeGroup {
  range: string;
  count: number;
}

interface GenderSplit {
  gender: string;
  count: number;
}

interface EducationLevel {
  level: string;
  count: number;
}

interface MigrationStatus {
  status: string;
  count: number;
}

interface SocioCorrelation {
  district: string;
  crimeRate: number;
  unemploymentRate: number;
  literacyRate: number;
  povertyIndex: number;
}

interface SocioDemographicChartProps {
  data: {
    demographics: {
      ageGroups: AgeGroup[];
      genderSplit: GenderSplit[];
      educationLevels: EducationLevel[];
      migrationStatus: MigrationStatus[];
    };
    socioCorrelation: SocioCorrelation[];
  };
}

const GENDER_COLORS: Record<string, string> = {
  M: '#06b6d4',
  Male: '#06b6d4',
  F: '#ec4899',
  Female: '#ec4899',
  Other: '#a855f7',
};

const EDUCATION_COLORS = [
  '#10b981', '#3b82f6', '#a855f7', '#f97316', '#eab308', '#06b6d4', '#ef4444',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="card-panel border border-[#d1d9e6] p-3 rounded-lg shadow-xl text-xs">
        {label && <p className="font-bold text-[#1e3a5f] mb-2">{label}</p>}
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                <span className="text-[#6c757d]">{entry.name}:</span>
              </div>
              <strong className="text-[#1e3a5f]">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const ScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="card-panel border border-[#d1d9e6] p-3 rounded-lg shadow-xl text-xs">
        <p className="font-bold text-[#1e3a5f] mb-2">{d.district}</p>
        <div className="space-y-1 text-[#2d4a6f]">
          <div>Unemployment: <strong className="text-[#1e3a5f]">{d.unemploymentRate}%</strong></div>
          <div>Crime Rate: <strong className="text-[#1e3a5f]">{d.crimeRate}</strong></div>
          <div>Poverty Index: <strong className="text-[#1e3a5f]">{d.povertyIndex}</strong></div>
          <div>Literacy: <strong className="text-[#1e3a5f]">{d.literacyRate}%</strong></div>
        </div>
      </div>
    );
  }
  return null;
};

export const SocioDemographicChart: React.FC<SocioDemographicChartProps> = ({ data }) => {
  const demographics = data?.demographics || {
    ageGroups: [{ range: '18-25', count: 420 }, { range: '26-35', count: 850 }, { range: '36-50', count: 540 }, { range: '50+', count: 210 }],
    genderSplit: [{ gender: 'Male', count: 1680 }, { gender: 'Female', count: 340 }],
    educationLevels: [{ level: 'High School', count: 620 }, { level: 'Graduate', count: 980 }, { level: 'Post-Graduate', count: 420 }],
    migrationStatus: [{ status: 'Resident', count: 1420 }, { status: 'Interstate Migrant', count: 600 }]
  };
  const socioCorrelation = data?.socioCorrelation || [];

  return (
    <div className="card-panel rounded-lg border border-[#d1d9e6] p-6 text-[#1e3a5f] shadow-xl w-full my-4">
      {/* Header */}
      <div className="border-b border-[#d1d9e6] pb-4 mb-6">
        <h2 className="text-lg font-bold text-[#1e3a5f] flex items-center gap-2">
          <Users className="text-[#1e3a5f]" size={20} /> Socio-Demographic Crime Analytics
        </h2>
        <p className="text-xs text-[#6c757d] mt-0.5">
          Population demographics and socio-economic correlation analysis
        </p>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top-Left: Age Distribution Bar Chart */}
        <div className="bg-[#f0f4f8]/40 rounded-lg border border-[#d1d9e6]/60 p-4">
          <h3 className="text-sm font-semibold text-[#2d4a6f] mb-3">Age Distribution</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demographics.ageGroups} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#d1d9e6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="range" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar name="Count" dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top-Right: Gender Split Pie Chart */}
        <div className="bg-[#f0f4f8]/40 rounded-lg border border-[#d1d9e6]/60 p-4">
          <h3 className="text-sm font-semibold text-[#2d4a6f] mb-3">Gender Split</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demographics.genderSplit}
                  dataKey="count"
                  nameKey="gender"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={4}
                  label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {demographics.genderSplit.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={GENDER_COLORS[entry.gender] || '#64748b'}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={30}
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom-Left: Socio-Economic Correlation Scatter Chart */}
        <div className="bg-[#f0f4f8]/40 rounded-lg border border-[#d1d9e6]/60 p-4">
          <h3 className="text-sm font-semibold text-[#2d4a6f] mb-1">Socio-Economic Correlation</h3>
          <p className="text-[10px] text-[#6c757d] mb-3">Unemployment Rate vs Crime Rate (dot size = poverty index)</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#d1d9e6" strokeDasharray="3 3" />
                <XAxis
                  dataKey="unemploymentRate"
                  name="Unemployment %"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  label={{ value: 'Unemployment %', position: 'insideBottom', offset: -2, style: { fill: '#64748b', fontSize: 9 } }}
                />
                <YAxis
                  dataKey="crimeRate"
                  name="Crime Rate"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Crime Rate', angle: -90, position: 'insideLeft', offset: 15, style: { fill: '#64748b', fontSize: 9 } }}
                />
                <Tooltip content={<ScatterTooltip />} />
                <Scatter
                  name="Districts"
                  data={socioCorrelation}
                  fill="#3b82f6"
                >
                  {socioCorrelation.map((entry, index) => (
                    <Cell
                      key={`scatter-${index}`}
                      fill="#3b82f6"
                      fillOpacity={0.7}
                      r={Math.max(4, Math.min(entry.povertyIndex * 1.5, 20))}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom-Right: Education Level Horizontal Bar Chart */}
        <div className="bg-[#f0f4f8]/40 rounded-lg border border-[#d1d9e6]/60 p-4">
          <h3 className="text-sm font-semibold text-[#2d4a6f] mb-3">Education Level Breakdown</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={demographics.educationLevels}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid stroke="#d1d9e6" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="level"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  width={90}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar name="Count" dataKey="count" radius={[0, 4, 4, 0]}>
                  {demographics.educationLevels.map((_, index) => (
                    <Cell key={`edu-${index}`} fill={EDUCATION_COLORS[index % EDUCATION_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
