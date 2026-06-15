import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ChatInterface } from '../components/ChatInterface/ChatInterface';
import { FinancialFlowGraph } from '../components/Visualizations/FinancialFlowGraph';
import { SimilarCasesCard } from '../components/Visualizations/SimilarCasesCard';
import { FileText, Search, User, ShieldAlert, CheckCircle, Clock, AlertTriangle, Landmark, Layers, Printer, Download, Shield, UploadCloud, Fingerprint, Languages, Pin } from 'lucide-react';

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

  // Phase 6 Massive Upgrades: OCR & Biometric Matcher States
  const [ocrFileName, setOcrFileName] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<any | null>(null);

  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricMatches, setBiometricMatches] = useState<any[]>([]);
  const [selectedMugshot, setSelectedMugshot] = useState<string | null>(null);

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

  const handleOcrUpload = async (sampleName: string) => {
    setOcrFileName(sampleName);
    setOcrLoading(true);
    setOcrResult(null);
    setOcrProgress(10);
    
    // Animate progress bar
    const interval = setInterval(() => {
      setOcrProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 30;
      });
    }, 250);

    try {
      const res = await api.analyzeOcr(sampleName, 'text/plain', 'MOCK_BASE64', userId, role);
      clearInterval(interval);
      setOcrProgress(100);
      setTimeout(() => {
        setOcrResult(res);
        setOcrLoading(false);
      }, 200);
    } catch (err) {
      clearInterval(interval);
      setOcrLoading(false);
      alert("OCR translation pipeline failed.");
    }
  };

  const handleBiometricSearch = async (photoId: string, name: string) => {
    setSelectedMugshot(photoId);
    setBiometricScanning(true);
    setBiometricMatches([]);
    
    try {
      const res = await api.searchBiometrics(name, userId, role);
      if (res.success) {
        setBiometricMatches(res.matches);
      }
    } catch (err) {
      alert("Biometric analysis failed.");
    } finally {
      setBiometricScanning(false);
    }
  };

  const handlePinCase = async () => {
    if (!caseDetails) return;
    try {
      const res = await api.pinWorkspaceAsset(
        'fir', 
        caseDetails.fir_number, 
        `Crime Type: ${caseDetails.crime_type} in ${caseDetails.district}. Status: ${caseDetails.status}`, 
        userId, 
        role
      );
      if (res.success) {
        alert(res.pinned ? 'Case successfully pinned to Collaborative Desk!' : 'Case unpinned from Collaborative Desk!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to pin case.');
    }
  };

  const handlePinAccused = async (name: string) => {
    try {
      const res = await api.pinWorkspaceAsset(
        'accused',
        name,
        `Offender records for ${name} linked to FIR ${caseDetails?.fir_number || 'N/A'}.`,
        userId,
        role
      );
      if (res.success) {
        alert(res.pinned ? 'Accused successfully pinned to Collaborative Desk!' : 'Accused unpinned from Collaborative Desk!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to pin suspect.');
    }
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

  const handleExportXml = () => {
    if (!caseDetails) return;

    // Build structured XML layout for the FIR dossier
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<FIRReport xmlns="http://ksp.gov.in/crime-intelligence/fir" version="1.0">
  <Metadata>
    <FIRNumber>${caseDetails.fir_number || ''}</FIRNumber>
    <District>${caseDetails.district || ''}</District>
    <PoliceStation>${caseDetails.police_station || ''}</PoliceStation>
    <DateOccurrence>${caseDetails.date_occurrence || ''}</DateOccurrence>
    <DateReported>${caseDetails.date_reported || ''}</DateReported>
    <Status>${caseDetails.status || ''}</Status>
    <CrimeType>${caseDetails.crime_type || ''}</CrimeType>
    <ExportTimestamp>${new Date().toISOString()}</ExportTimestamp>
    <AuditedBy>${userId}</AuditedBy>
    <SystemHash>SHA-256:${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}</SystemHash>
  </Metadata>
  <ModusOperandi><![CDATA[${caseDetails.modus_operandi || ''}]]></ModusOperandi>
  <Narrative><![CDATA[${caseDetails.description || ''}]]></Narrative>
  <Complainants>
    ${(caseDetails.victims || []).map((vic: any) => `
    <Complainant>
      <Name>${vic.name || ''}</Name>
      <Age>${vic.age || ''}</Age>
      <Occupation>${vic.occupation || ''}</Occupation>
      <Address>${vic.address || ''}</Address>
      <InjuryType>${vic.injury_type || ''}</InjuryType>
    </Complainant>`).join('')}
  </Complainants>
  <AccusedList>
    ${(caseDetails.accused || []).map((acc: any) => `
    <Accused>
      <Name>${acc.name || ''}</Name>
      <Age>${acc.age || ''}</Age>
      <PriorConvictions>${acc.prior_convictions || '0'}</PriorConvictions>
    </Accused>`).join('')}
  </AccusedList>
</FIRReport>`;

    const blob = new Blob([xmlData], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FIR-${caseDetails.fir_number || 'export'}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 border border-slate-850 rounded-lg p-4 print:hidden">
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
        <div className="lg:col-span-7 print:hidden">
          <ChatInterface 
            userId={userId} 
            role={role} 
            onFirSelect={(firNo) => setSelectedFirNumber(firNo)}
            initialQuery={chatOverrideQuery}
          />
        </div>

        {/* Right Pane - Case Details Viewer */}
        <div className="lg:col-span-5 h-[600px] print:h-auto print:border-none print:shadow-none flex flex-col bg-slate-950 border border-slate-900 rounded-lg overflow-hidden shadow-2xl print:bg-white print:overflow-visible">
          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-400 text-xs gap-3">
              <LoaderIcon className="animate-spin text-brand-primary" size={24} />
              <span>Loading case records from Datastore...</span>
            </div>
          ) : caseDetails ? (
            <>
              {/* Tabs Bar */}
              <div className="bg-slate-900 border-b border-slate-850 flex items-center print:hidden shrink-0">
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
              <div className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">
                {activeTab === 'summary' && (
                  <div className="space-y-6">
                    {/* Actions Toolbar */}
                    <div className="flex justify-end gap-2 border-b border-slate-900 pb-4 print:hidden">
                      <button
                        onClick={handlePinCase}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition"
                      >
                        <Pin size={13} className="text-blue-400 rotate-45" /> Pin to Desk
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition"
                      >
                        <Printer size={13} /> Print Dossier
                      </button>
                      <button
                        onClick={handleExportXml}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition"
                      >
                        <Download size={13} /> Export XML
                      </button>
                    </div>

                    {/* Dossier Target for printing */}
                    <div className="dossier-print-target space-y-6 text-sm text-slate-300 font-sans print:text-black">
                      
                      {/* Scoped Print Style CSS */}
                      <style dangerouslySetInnerHTML={{__html: `
                        @media print {
                          body * {
                            visibility: hidden !important;
                          }
                          .dossier-print-target, .dossier-print-target * {
                            visibility: visible !important;
                          }
                          .dossier-print-target {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            background: white !important;
                            color: black !important;
                            padding: 30px !important;
                            font-size: 12px !important;
                            line-height: 1.5 !important;
                          }
                          .dossier-print-target .print\\:hidden {
                            display: none !important;
                          }
                          .dossier-print-target strong,
                          .dossier-print-target span,
                          .dossier-print-target div,
                          .dossier-print-target h1,
                          .dossier-print-target h2,
                          .dossier-print-target h3,
                          .dossier-print-target h4 {
                            color: black !important;
                          }
                          .dossier-print-target .section-block {
                            border: 1px solid black !important;
                            background: transparent !important;
                            color: black !important;
                            padding: 12px !important;
                            border-radius: 0 !important;
                            margin-bottom: 15px !important;
                          }
                          .dossier-print-target .table-row {
                            border-bottom: 1px solid black !important;
                            padding: 6px 0 !important;
                          }
                          .dossier-print-target .audit-block {
                            border-top: 2px dashed black !important;
                            padding-top: 15px !important;
                            margin-top: 30px !important;
                          }
                        }
                      `}} />

                      {/* Official FIR Header (Only formatted for print / elegant in portal) */}
                      <div className="border-b-2 border-brand-gold pb-4 text-center space-y-1 print:border-black">
                        <div className="flex justify-center items-center gap-2 text-brand-gold print:text-black">
                          <Shield size={22} />
                          <h2 className="text-sm font-extrabold tracking-wider uppercase">ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್</h2>
                        </div>
                        <h1 className="text-[13px] font-bold text-white print:text-black tracking-wide uppercase">Karnataka State Police</h1>
                        <h3 className="text-xs font-bold text-slate-400 print:text-black uppercase">First Information Report (FIR) Dossier</h3>
                        <span className="text-[10px] text-slate-500 font-mono tracking-wider block print:text-black">UNDER SECTION 154 CR.P.C. • RESTRICTED</span>
                      </div>

                      {/* Section 1: Jurisdiction & Occurrence Details */}
                      <div className="section-block bg-slate-900/30 border border-slate-900 rounded-lg p-4 space-y-3 print:border-black">
                        <h4 className="font-bold text-brand-gold print:text-black text-xs uppercase tracking-wider border-b border-slate-850 pb-1.5 print:border-black">I. Jurisdiction & Event Occurrence</h4>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-semibold">FIR Registration Number</span>
                            <strong className="text-white print:text-black font-mono text-xs">{caseDetails.fir_number}</strong>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-semibold">Current Case Status</span>
                            <div className="flex items-center gap-1.5 mt-0.5 print:text-black">
                              <span className="print:hidden">{getStatusIcon(caseDetails.status)}</span>
                              <strong className="text-white print:text-black text-xs">{caseDetails.status}</strong>
                            </div>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-semibold">Police Station / District</span>
                            <strong className="text-white print:text-black text-xs">{caseDetails.police_station} ({caseDetails.district})</strong>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-semibold">Crime Classification</span>
                            <strong className="text-brand-primary print:text-black text-xs">{caseDetails.crime_type}</strong>
                          </div>
                          <div className="col-span-2 border-t border-slate-850/60 pt-2 mt-1 flex justify-between print:text-black print:border-black">
                            <span>Date & Time of Occurrence: <strong className="text-slate-200 print:text-black">{caseDetails.date_occurrence}</strong></span>
                            <span>Report Registered: <strong className="text-slate-200 print:text-black">{caseDetails.date_reported}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Complainant / Victim Demographics */}
                      <div className="section-block bg-slate-900/30 border border-slate-900 rounded-lg p-4 space-y-3 print:border-black">
                        <h4 className="font-bold text-brand-gold print:text-black text-xs uppercase tracking-wider border-b border-slate-850 pb-1.5 print:border-black">II. Complainants & Victim Register</h4>
                        {caseDetails.victims && caseDetails.victims.length > 0 ? (
                          <div className="space-y-3 divide-y divide-slate-850/40 print:divide-black">
                            {caseDetails.victims.map((vic: any, idx: number) => (
                              <div key={vic.id} className={`text-xs ${idx > 0 ? 'pt-3' : ''} table-row`}>
                                <div className="flex justify-between font-bold">
                                  <span className="text-slate-200 print:text-black">{vic.name} ({vic.age} Yrs)</span>
                                  <span className="text-red-400 print:text-black">{vic.injury_type || 'None Specified'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 print:text-black mt-1 font-medium">
                                  <span>Occupation: {vic.occupation || 'Unemployed'}</span>
                                  <span>Address: {vic.address || 'Not Recorded'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-xs italic">No complainant records registered for this dossier.</p>
                        )}
                      </div>

                      {/* Section 3: Accused Details */}
                      <div className="section-block bg-slate-900/30 border border-slate-900 rounded-lg p-4 space-y-3 print:border-black">
                        <h4 className="font-bold text-brand-gold print:text-black text-xs uppercase tracking-wider border-b border-slate-850 pb-1.5 print:border-black">III. Accused Suspects Directory</h4>
                        {caseDetails.accused && caseDetails.accused.length > 0 ? (
                          <div className="space-y-3">
                            {caseDetails.accused.map((acc: any) => (
                              <div key={acc.id} className="flex justify-between items-center bg-slate-950/40 print:bg-transparent border border-slate-900 print:border-none rounded-lg p-3 table-row">
                                <div className="text-xs">
                                  <strong className="text-white print:text-black flex items-center gap-1">
                                    <User size={12} className="text-slate-500 print:text-black" /> {acc.name}
                                  </strong>
                                  <span className="text-slate-500 print:text-black text-[10px] block mt-0.5">
                                    Age: {acc.age} | Prior Conviction Rate: {acc.prior_convictions} cases
                                  </span>
                                </div>
                                
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handlePinAccused(acc.name)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/20 text-blue-400 rounded-md text-[10px] font-semibold transition cursor-pointer print:hidden"
                                    title="Pin Accused to Workspace"
                                  >
                                    <Pin size={10} className="rotate-45" /> Pin
                                  </button>
                                  <button
                                    onClick={() => handleInvestigateAccused(acc.name)}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-md text-[10px] font-semibold transition cursor-pointer print:hidden"
                                  >
                                    <ShieldAlert size={10} /> Profile Risk
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-xs italic">No accused suspects registered in records yet.</p>
                        )}
                      </div>

                      {/* Section 4: Modus Operandi & Narrative */}
                      <div className="section-block bg-slate-900/30 border border-slate-900 rounded-lg p-4 space-y-3 print:border-black">
                        <h4 className="font-bold text-brand-gold print:text-black text-xs uppercase tracking-wider border-b border-slate-850 pb-1.5 print:border-black">IV. Modus Operandi & Crime Narrative</h4>
                        <div>
                          <span className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Modus Operandi Summary</span>
                          <p className="bg-slate-950/40 print:bg-transparent border border-slate-900 print:border-none rounded-lg p-3 text-slate-200 print:text-black text-xs italic">
                            "{caseDetails.modus_operandi}"
                          </p>
                        </div>
                        <div className="pt-2">
                          <span className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Occurrence Narrative Description</span>
                          <p className="text-slate-300 print:text-black leading-relaxed text-xs text-justify">
                            {caseDetails.description}
                          </p>
                        </div>
                      </div>

                      {/* Section 5: Secure Ledger Digital Audit Trail (Security compliance) */}
                      <div className="audit-block border-t border-dashed border-slate-800 pt-4 mt-6 text-[10px] text-slate-500 print:text-black space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold uppercase tracking-wider text-slate-400 print:text-black">Cryptographic System Stamp</span>
                          <span className="font-mono bg-brand-navy/20 print:bg-transparent px-2 py-0.5 rounded text-brand-gold print:text-black border border-brand-border/40 print:border-none">CONFIDENTIAL</span>
                        </div>
                        <div className="font-mono leading-tight space-y-0.5">
                          <div>SECURE LEDGER SEAL HASH: SHA-256 (352a78f237efb23194a2119efd01902ba98cf218001e3e7f)</div>
                          <div>AUDITED BY TERMINAL ID: KSP-BLR-{userId} • SESSION CAPTURED ON LOGIN</div>
                          <div>GENERATION DATE: {new Date().toLocaleString('en-IN', { hour12: true })}</div>
                        </div>

                        {/* Signatures for print */}
                        <div className="hidden print:flex justify-between items-end pt-12 text-xs">
                          <div>
                            <div className="w-40 border-b border-black"></div>
                            <span className="block text-[9px] mt-1 text-center font-bold">Signature of Complainant/Victim</span>
                          </div>
                          <div>
                            <div className="w-40 border-b border-black text-center font-mono text-[9px] pb-1">KSP-BLR-INV-1002</div>
                            <span className="block text-[9px] mt-1 text-center font-bold">Signature of Station House Officer (SHO)</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {activeTab === 'financial' && (
                  <div className="h-full flex flex-col print:hidden">
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
                  <div className="h-full flex flex-col print:hidden">
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
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500 text-xs gap-3 print:hidden">
              <FileText size={48} className="text-slate-700" />
              <p>Click on any FIR number in the chat assistant or use the search box above to load digital case briefs.</p>
            </div>
          )}
        </div>

      </div>

      {/* Phase 6 Massive Upgrades: Vernacular OCR & Biometric Matcher */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 print:hidden">
        {/* Vernacular OCR Scanner Card */}
        <div className="card-panel border border-slate-200 rounded-lg p-5 bg-white flex flex-col space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Languages className="text-brand-primary" size={16} />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Vernacular OCR Document Intelligence</h3>
          </div>
          
          <div className="text-xs text-slate-500 font-medium leading-relaxed">
            Drag-and-drop or select hand-written Kannada documents to perform simulated OCR text translation and relational entity extraction.
          </div>

          {/* Upload Drop Zone / Sample Select */}
          <div className="border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50 text-center flex flex-col items-center justify-center space-y-2 hover:border-brand-primary/50 transition duration-200">
            <UploadCloud size={32} className="text-slate-400" />
            <span className="text-xs text-slate-600 font-semibold">Select and Analyze Sample Vernacular File:</span>
            
            <div className="flex flex-wrap justify-center gap-2 mt-1">
              <button 
                onClick={() => handleOcrUpload('Sample_Threat_Warning.txt')}
                disabled={ocrLoading}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-200 rounded text-[11px] font-bold cursor-pointer transition"
              >
                Threat Note Scan
              </button>
              <button 
                onClick={() => handleOcrUpload('Sample_Hawala_Ledger.txt')}
                disabled={ocrLoading}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-200 rounded text-[11px] font-bold cursor-pointer transition"
              >
                Hawala Ledger
              </button>
              <button 
                onClick={() => handleOcrUpload('Sample_Suspect_Brief.txt')}
                disabled={ocrLoading}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-200 rounded text-[11px] font-bold cursor-pointer transition"
              >
                Suspect Report
              </button>
            </div>
          </div>

          {/* Loading Progress State */}
          {ocrLoading && (
            <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-150">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <LoaderIcon className="animate-spin text-brand-primary" size={12} />
                  <span>Processing {ocrFileName}...</span>
                </span>
                <span>{ocrProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-brand-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* OCR / Translation Output Results */}
          {!ocrLoading && ocrResult && (
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Raw Kannada Text</span>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[11px] text-slate-700 min-h-[60px] max-h-[80px] overflow-y-auto">
                    {ocrResult.rawKannada}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">English Translation</span>
                  <div className="p-2 bg-white rounded border border-slate-200 text-[11px] text-slate-700 min-h-[60px] max-h-[80px] overflow-y-auto leading-relaxed">
                    {ocrResult.translatedEnglish}
                  </div>
                </div>
              </div>

              {/* Extracted Entities */}
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Extracted System Entities</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-150">
                    <span className="text-slate-400">Suspects:</span>
                    <strong className="text-slate-800">{ocrResult.entities.suspects.join(', ') || 'None'}</strong>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-150">
                    <span className="text-slate-400">Locations:</span>
                    <strong className="text-slate-800">{ocrResult.entities.locations.join(', ') || 'None'}</strong>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-150 col-span-2">
                    <span className="text-slate-400">Monetary:</span>
                    <strong className="text-slate-800">{ocrResult.entities.monetaryAmount}</strong>
                  </div>
                </div>
              </div>

              {/* Action Button: Feed to chat */}
              {ocrResult.entities.suspects.length > 0 && (
                <button
                  onClick={() => {
                    const suspect = ocrResult.entities.suspects[0];
                    const prompt = `Evaluate the risk profile of ${suspect} with active warrant`;
                    setChatOverrideQuery(prompt);
                    setTimeout(() => setChatOverrideQuery(undefined), 100);
                  }}
                  className="w-full mt-1.5 py-1.5 bg-brand-primary hover:bg-brand-primary-light text-white rounded text-[11px] font-bold cursor-pointer transition text-center shadow"
                >
                  Verify Threat Score of {ocrResult.entities.suspects[0]}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Zia Vision Biometric Facial Search Card */}
        <div className="card-panel border border-slate-200 rounded-lg p-5 bg-white flex flex-col space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Fingerprint className="text-brand-primary" size={16} />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Zia Vision Biometric Facial Search</h3>
          </div>

          <div className="text-xs text-slate-500 font-medium leading-relaxed">
            Upload a suspect photo or select pre-loaded criminal mugshots to run real-time similarity matching against the offender registry database.
          </div>

          {/* Preselected Mugshots */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
            <span className="text-xs text-slate-600 font-bold">Select Suspect Mugshot:</span>
            <div className="flex gap-2">
              <button 
                onClick={() => handleBiometricSearch('mugshot_rupa', 'Rupa')}
                disabled={biometricScanning}
                className={`px-2 py-1 text-[11px] font-bold border rounded cursor-pointer transition ${
                  selectedMugshot === 'mugshot_rupa' 
                    ? 'bg-brand-primary text-white border-brand-primary' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Suspect A (Rupa)
              </button>
              <button 
                onClick={() => handleBiometricSearch('mugshot_ramesh', 'Ramesh')}
                disabled={biometricScanning}
                className={`px-2 py-1 text-[11px] font-bold border rounded cursor-pointer transition ${
                  selectedMugshot === 'mugshot_ramesh' 
                    ? 'bg-brand-primary text-white border-brand-primary' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Suspect B (Ramesh)
              </button>
              <button 
                onClick={() => handleBiometricSearch('mugshot_amit', 'Amit')}
                disabled={biometricScanning}
                className={`px-2 py-1 text-[11px] font-bold border rounded cursor-pointer transition ${
                  selectedMugshot === 'mugshot_amit' 
                    ? 'bg-brand-primary text-white border-brand-primary' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Suspect C (Amit)
              </button>
            </div>
          </div>

          {/* Scanning Animation overlay */}
          {biometricScanning && (
            <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-lg border border-slate-150 space-y-3 relative overflow-hidden">
              {/* Spinning Scanner radar grid */}
              <div className="relative h-16 w-16 rounded-full border-2 border-brand-primary/20 flex items-center justify-center animate-pulse">
                <div className="absolute inset-0 rounded-full border-t-2 border-brand-primary animate-spin" />
                <Fingerprint size={28} className="text-brand-primary" />
              </div>
              <span className="text-xs text-slate-600 font-bold animate-pulse">Scanning biometric facial nodes...</span>
            </div>
          )}

          {/* Results Match List */}
          {!biometricScanning && biometricMatches.length > 0 && (
            <div className="space-y-2 max-h-[175px] overflow-y-auto pr-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Top Offender Matches</span>
              {biometricMatches.map((match, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs hover:border-brand-primary/45 transition">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-slate-800 text-[13px]">{match.name}</strong>
                      <span className="text-[10px] text-slate-400 font-medium">({match.age} yrs • {match.gender})</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Gang: <span className="text-slate-700 font-semibold">{match.gang}</span> • Case: <span className="text-brand-primary hover:underline cursor-pointer font-bold" onClick={() => setSelectedFirNumber(match.fir_number)}>{match.fir_number}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[11px] font-bold inline-block">
                      {match.similarity}% Match
                    </div>
                    <button
                      onClick={() => handleInvestigateAccused(match.name)}
                      className="block text-[10px] text-brand-primary font-bold hover:underline cursor-pointer text-right w-full"
                    >
                      Analyze threat score
                    </button>
                  </div>
                </div>
              ))}
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
