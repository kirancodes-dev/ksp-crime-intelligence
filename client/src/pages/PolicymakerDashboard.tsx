import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

import { TrendChart } from '../components/Visualizations/TrendChart';
import { SocioDemographicChart } from '../components/Visualizations/SocioDemographicChart';
import { ForecastAlertPanel } from '../components/Visualizations/ForecastAlertPanel';
import { IntelligenceBrief } from '../components/IntelligenceBrief/IntelligenceBrief';
import { ShieldAlert, TrendingUp, Loader2, AlertCircle, Users, Landmark } from 'lucide-react';

interface PolicymakerDashboardProps {
  userId: string;
  role: string;
}

export const PolicymakerDashboard: React.FC<PolicymakerDashboardProps> = ({ userId, role }) => {
  const [trendData, setTrendData] = useState<any>(null);
  const [socioData, setSocioData] = useState<any>(null);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [stateStats, setStateStats] = useState({
    totalCases: 0,
    activeCases: 0,
    criticalForecasts: 0,
    districtsMonitored: 5
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPolicymakerData();
  }, []);

  const loadPolicymakerData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch trend data
      const trendRes = await api.submitChat('crime trend chart statistics', userId, role);
      if (trendRes.success && trendRes.tool === 'chart') {
        setTrendData(trendRes.data);
        const totalCases = trendRes.data.monthly?.reduce((sum: number, m: any) => sum + m.total, 0) || 0;
        const activeCases = Math.round(totalCases * 0.55);
        setStateStats(prev => ({ ...prev, totalCases, activeCases }));
      }

      // Fetch socio-demographic insights
      const socioRes = await api.getSocioDemographics(userId, role);
      if (socioRes.success) {
        const mappedAgeGroups = (socioRes.demographics?.ageGroups || []).map((g: any) => ({
          range: g.age_group || 'Unknown',
          count: Number(g.count) || 0
        }));
        const mappedEducation = (socioRes.demographics?.educationLevels || []).map((e: any) => ({
          level: e.education_level || 'Unknown',
          count: Number(e.count) || 0
        }));
        const mappedMigration = (socioRes.demographics?.migrationStatus || []).map((m: any) => ({
          status: m.status || 'Local',
          count: Number(m.count) || 0
        }));
        const mappedCorrelation = (socioRes.socioCorrelation || []).map((c: any) => ({
          district: c.district || 'Unknown',
          crimeRate: Number(c.crime_count) || 0,
          unemploymentRate: Number(c.unemployment_rate) || 0,
          literacyRate: Number(c.literacy_rate) || 0,
          povertyIndex: Number(c.poverty_index) || 0
        }));

        setSocioData({
          demographics: {
            ageGroups: mappedAgeGroups,
            genderSplit: socioRes.demographics?.genderSplit || [],
            educationLevels: mappedEducation,
            migrationStatus: mappedMigration
          },
          socioCorrelation: mappedCorrelation
        });
      }

      // Fetch forecasts
      const forecastRes = await api.getForecasts(userId, role);
      if (forecastRes.success) {
        const mappedForecasts = (forecastRes.forecasts || []).map((f: any) => ({
          ...f,
          data_sources: typeof f.data_sources === 'string'
            ? f.data_sources.split(',').map((s: string) => s.trim())
            : (Array.isArray(f.data_sources) ? f.data_sources : [])
        }));
        setForecasts(mappedForecasts);
        const criticalCount = mappedForecasts.filter(
          (f: any) => f.risk_level === 'Critical' || f.risk_level === 'High'
        ).length;
        setStateStats(prev => ({ ...prev, criticalForecasts: criticalCount }));
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to compile statewide intelligence overview.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#f0f4f8]/40 border border-[#d1d9e6] rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
              <Landmark className="text-[#1e3a5f]" /> Executive Intelligence Brief
            </h1>
            <p className="text-xs text-[#6c757d] mt-0.5">
              State-wide crime analytics, demographic insights, and predictive threat assessment
            </p>
          </div>
          <IntelligenceBrief userId={userId} role={role} />
        </div>
      </div>

      {/* Statewide KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-panel border border-[#d1d9e6] rounded-lg p-4 text-center">
          <span className="block text-[11px] text-[#6c757d] uppercase font-semibold">Total Cases (180 days)</span>
          <strong className="text-2xl text-[#1e3a5f] block mt-1">{stateStats.totalCases}</strong>
        </div>
        <div className="card-panel border border-[#d1d9e6] rounded-lg p-4 text-center">
          <span className="block text-[11px] text-[#6c757d] uppercase font-semibold">Active Investigations</span>
          <strong className="text-2xl text-orange-700 block mt-1">{stateStats.activeCases}</strong>
        </div>
        <div className="card-panel border border-[#d1d9e6] rounded-lg p-4 text-center">
          <span className="block text-[11px] text-[#6c757d] uppercase font-semibold">Critical Forecasts</span>
          <strong className="text-2xl text-red-500 block mt-1">{stateStats.criticalForecasts}</strong>
        </div>
        <div className="card-panel border border-[#d1d9e6] rounded-lg p-4 text-center">
          <span className="block text-[11px] text-[#6c757d] uppercase font-semibold">Districts Monitored</span>
          <strong className="text-2xl text-emerald-700 block mt-1">{stateStats.districtsMonitored}</strong>
        </div>
      </div>

      {/* Loading & Error */}
      {loading && (
        <div className="flex items-center justify-center gap-2 bg-[#f0f4f8]/20 border border-slate-900 rounded-lg p-4 text-[#6c757d] text-xs">
          <Loader2 size={12} className="animate-spin text-[#1e3a5f]" />
          <span>Compiling statewide intelligence metrics from all district nodes...</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-950/20 border border-red-900/40 rounded-lg p-3 text-[#d9251c] text-xs">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Crime Trend Overview */}
      {trendData && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp size={16} className="text-[#1e3a5f]" />
            <span className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wider">Statewide Crime Trend Analysis</span>
          </div>
          <TrendChart data={trendData} />
        </div>
      )}

      {/* Section 2: Socio-Demographic Insights */}
      {socioData && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Users size={16} className="text-[#1e3a5f]" />
            <span className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wider">Sociological Crime Insights</span>
          </div>
          <SocioDemographicChart data={socioData} />
        </div>
      )}

      {/* Section 3: Predictive Forecasts */}
      {forecasts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <ShieldAlert size={16} className="text-[#1e3a5f]" />
            <span className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wider">Predictive Crime Intelligence & Early Warning</span>
          </div>
          <ForecastAlertPanel forecasts={forecasts} />
        </div>
      )}
    </div>
  );
};
