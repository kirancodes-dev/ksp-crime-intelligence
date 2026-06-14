import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ChatInterface } from '../components/ChatInterface/ChatInterface';
import { FinancialFlowGraph } from '../components/Visualizations/FinancialFlowGraph';
import { SimilarCasesCard } from '../components/Visualizations/SimilarCasesCard';
import { FileText, Search, User, ShieldAlert, CheckCircle, Clock, AlertTriangle, Landmark, Layers } from 'lucide-react';

interface InvestigatorDashboardProps {
  userId: string;
  role: string;
}

export const InvestigatorDashboard: React.FC<InvestigatorDashboardProps> = ({ userId, role }) => {
  const [selectedFirNumber, setSelectedFirNumber] = useState<string | null>(null);
  const [caseDetails, setCaseDetails] = useState<any>(null);
  const [firInput, setFirInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatOverrideQuery, setChatOverrideQuery] = useState<string | undefined>(undefined);

  // Phase 2 Tabs and Data States
  const [activeTab, setActiveTab] = useState<'summary' | 'financial' | 'similar'>('summary');
  const [financialData, setFinancialData] = useState<any>(null);
  const [similarData, setSimilarData] = useState<any>(null);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [similarLoading, setSimilarLoading] = useState(false);

  useEffect(() => {
    if (selectedFirNumber) {
      fetchCaseFile(selectedFirNumber);
      setActiveTab('summary');
      setFinancialData(null);
      setSimilarData(null);
    }
  }, [selectedFirNumber]);

  const fetchCaseFile = async (firNo: string) => {
    setLoading(true);
    try {
      const result = await api.getCaseDetails(firNo, userId, role);
      if (result.success) {
        setCaseDetails(result.case);
      } else {
        alert("Case file not found");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to retrieve case file");
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialTrail = async () => {
    if (!caseDetails || financialData) return;
    setFinancialLoading(true);
    try {
      const result = await api.getFinancialTrail(caseDetails.id, userId, role);
      if (result.success) {
        setFinancialData(result);
      }
    } catch (err) {
      console.error('Failed to retrieve financial trail:', err);
    } finally {
      setFinancialLoading(false);
    }
  };

  const fetchSimilarCases = async () => {
    if (!caseDetails || similarData) return;
    setSimilarLoading(true);
    try {
      const result = await api.getSimilarCases(caseDetails.id, userId, role);
      if (result.success) {
        setSimilarData(result);
      }
    } catch (err) {
      console.error('Failed to retrieve similar cases:', err);
    } finally {
      setSimilarLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'financial') {
      fetchFinancialTrail();
    } else if (activeTab === 'similar') {
      fetchSimilarCases();
    }
  }, [activeTab, caseDetails]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (firInput.trim()) {
      setSelectedFirNumber(firInput.toUpperCase().trim());
    }
  };

  const handleInvestigateAccused = (name: string) => {
    setChatOverrideQuery(`Calculate the risk profile of ${name}`);
    setTimeout(() => setChatOverrideQuery(undefined), 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Closed':
        return <CheckCircle size={16} className="text-emerald-400" />;
      case 'Charge Sheeted':
        return <Clock size={16} className="text-blue-400" />;
      default:
        return <AlertTriangle size={16} className="text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 border border-slate-850 rounded-lg p-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="text-brand-primary" /> Case File Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Search FIR records and access case intelligence</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            value={firInput}
            onChange={(e) => setFirInput(e.target.value)}
            placeholder="Search FIR (e.g., FIR-2026-003)"
            className="bg-slate-950 border border-slate-850 focus:border-brand-primary focus:outline-none rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 w-full md:w-60"
          />
          <button 
            type="submit"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition"
          >
            <Search size={14} /> Search
          </button>
        </form>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Pane - Chat Assistant */}
        <div className="lg:col-span-7">
          <ChatInterface 
            userId={userId} 
            role={role} 
            onFirSelect={(firNo) => setSelectedFirNumber(firNo)}
            initialQuery={chatOverrideQuery}
          />
        </div>

        {/* Right Pane - Case Details Viewer */}
        <div className="lg:col-span-5 h-[600px] flex flex-col bg-slate-950 border border-slate-900 rounded-lg overflow-hidden shadow-2xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-400 text-xs gap-3">
              <LoaderIcon className="animate-spin text-brand-primary" size={24} />
              <span>Loading case records from Datastore...</span>
            </div>
          ) : caseDetails ? (
            <>
              {/* Tabs Bar */}
              <div className="bg-slate-900 border-b border-slate-850 flex items-center">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
                    activeTab === 'summary'
                      ? 'border-brand-primary text-white bg-slate-950/40'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText size={12} /> Brief
                </button>
                <button
                  onClick={() => setActiveTab('financial')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
                    activeTab === 'financial'
                      ? 'border-brand-primary text-white bg-slate-950/40'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Landmark size={12} /> Financial Trail
                </button>
                <button
                  onClick={() => setActiveTab('similar')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
                    activeTab === 'similar'
                      ? 'border-brand-primary text-white bg-slate-950/40'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers size={12} /> Similar Cases
                </button>
              </div>

              {/* Tab Content Panels */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'summary' && (
                  <div className="space-y-6 text-sm text-slate-300">
                    {/* Meta details */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-900/30 border border-slate-900 rounded-lg p-4">
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Jurisdiction</span>
                        <strong className="text-white text-xs">{caseDetails.police_station} ({caseDetails.district})</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Case Status</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {getStatusIcon(caseDetails.status)}
                          <strong className="text-white text-xs">{caseDetails.status}</strong>
                        </div>
                      </div>
                      <div className="col-span-2 border-t border-slate-900 pt-2 mt-1">
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Crime Category</span>
                        <strong className="text-brand-primary text-xs">{caseDetails.crime_type}</strong>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex justify-between text-xs text-slate-400 border-b border-slate-900 pb-3">
                      <span>Occurred: <strong>{caseDetails.date_occurrence}</strong></span>
                      <span>Reported: <strong>{caseDetails.date_reported}</strong></span>
                    </div>

                    {/* Modus Operandi */}
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 mb-2">Modus Operandi</h4>
                      <p className="bg-slate-900/40 border border-slate-900 rounded-lg p-3 text-slate-200 text-xs italic">
                        "{caseDetails.modus_operandi}"
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 mb-2">Occurrence Narrative</h4>
                      <p className="text-slate-300 leading-relaxed text-xs">
                        {caseDetails.description}
                      </p>
                    </div>

                    {/* Accused Section */}
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 mb-3">Accused Suspects ({caseDetails.accused?.length || 0})</h4>
                      {caseDetails.accused && caseDetails.accused.length > 0 ? (
                        <div className="space-y-3">
                          {caseDetails.accused.map((acc: any) => (
                            <div key={acc.id} className="flex justify-between items-center bg-slate-900/40 border border-slate-900 rounded-lg p-3">
                              <div>
                                <strong className="text-white text-xs flex items-center gap-1"><User size={12} className="text-slate-500" /> {acc.name}</strong>
                                <span className="text-slate-500 text-[10px] block mt-0.5">Age: {acc.age} | Prior Convictions: {acc.prior_convictions}</span>
                              </div>
                              
                              <button
                                onClick={() => handleInvestigateAccused(acc.name)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-md text-[10px] font-semibold transition cursor-pointer"
                              >
                                <ShieldAlert size={10} /> Profile Risk
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-xs italic">No accused registered in case records yet.</p>
                      )}
                    </div>

                    {/* Victims Section */}
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 mb-3">Complainants / Victims ({caseDetails.victims?.length || 0})</h4>
                      {caseDetails.victims && caseDetails.victims.length > 0 ? (
                        <div className="space-y-2">
                          {caseDetails.victims.map((vic: any) => (
                            <div key={vic.id} className="bg-slate-900/20 border border-slate-900 rounded-lg p-3 text-xs">
                              <div className="flex justify-between">
                                <strong className="text-slate-200">{vic.name} ({vic.age})</strong>
                                <span className="text-red-400/90 text-[10px] font-medium">{vic.injury_type}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1">Occupation: {vic.occupation} | Resides: {vic.address}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-xs italic">No victim records found.</p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'financial' && (
                  <div className="h-full flex flex-col">
                    {financialLoading ? (
                      <div className="flex flex-col items-center justify-center flex-1 text-slate-400 text-xs gap-3">
                        <LoaderIcon className="animate-spin text-brand-primary" size={24} />
                        <span>Compiling financial transactions...</span>
                      </div>
                    ) : financialData && financialData.nodes?.length > 0 ? (
                      <div className="h-[480px]">
                        <FinancialFlowGraph 
                          data={financialData} 
                          totalAmount={financialData.totalAmount}
                          suspiciousCount={financialData.suspiciousCount}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center flex-1 text-slate-500 text-xs gap-2 py-12">
                        <Landmark size={32} className="text-slate-700" />
                        <p>No financial transactions registered for this case.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'similar' && (
                  <div className="h-full flex flex-col">
                    {similarLoading ? (
                      <div className="flex flex-col items-center justify-center flex-1 text-slate-400 text-xs gap-3">
                        <LoaderIcon className="animate-spin text-brand-primary" size={24} />
                        <span>Analyzing database for patterns...</span>
                      </div>
                    ) : similarData && similarData.similarCases?.length > 0 ? (
                      <SimilarCasesCard data={similarData} />
                    ) : (
                      <div className="flex flex-col items-center justify-center flex-1 text-slate-500 text-xs gap-2 py-12">
                        <Layers size={32} className="text-slate-700" />
                        <p>No similar cases identified in the database.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500 text-xs gap-3">
              <FileText size={48} className="text-slate-700" />
              <p>Click on any FIR number in the chat assistant or use the search box above to load digital case briefs.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const LoaderIcon = ({ className, size }: { className?: string, size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
