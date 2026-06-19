import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import type { EvidenceSource } from '../../services/api';
import { VoiceInput } from '../VoiceInput/VoiceInput';
import { HotspotMap } from '../Visualizations/HotspotMap';
import { TrendChart } from '../Visualizations/TrendChart';
import { NetworkGraph } from '../Visualizations/NetworkGraph';
import { RiskScoreCard } from '../Visualizations/RiskScoreCard';
import { FinancialFlowGraph } from '../Visualizations/FinancialFlowGraph';
import { SocioDemographicChart } from '../Visualizations/SocioDemographicChart';
import { SimilarCasesCard } from '../Visualizations/SimilarCasesCard';
import { ForecastAlertPanel } from '../Visualizations/ForecastAlertPanel';
import { OcrAnalysisCard } from '../Visualizations/OcrAnalysisCard';
import { BiometricMatchesCard } from '../Visualizations/BiometricMatchesCard';
import { DispatchConsoleCard } from '../Visualizations/DispatchConsoleCard';
import { CdrTimelineMap } from '../Visualizations/CdrTimelineMap';
import { EvidenceTrail } from './EvidenceTrail';
import { Send, Bot, User as UserIcon, Loader2, Download, AlertCircle, MessageSquare, Sparkles, History, ChevronRight, X } from 'lucide-react';

type ToolType = 'map' | 'chart' | 'network' | 'risk' | 'text' | 'finance' | 'socio' | 'similar' | 'forecast' | 'ocr' | 'cdr' | 'biometrics' | 'dispatch';

interface Message {
  id: string;
  sender: 'user' | 'system';
  text: string;
  timestamp: Date;
  toolResult?: {
    tool: ToolType;
    data: any;
  };
  evidenceSources?: EvidenceSource;
  followUpSuggestions?: string[];
}

interface ChatInterfaceProps {
  userId: string;
  role: string;
  onFirSelect?: (firNumber: string) => void;
  onAccusedSelect?: (name: string) => void;
  initialQuery?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  userId, 
  role, 
  onFirSelect, 
  onAccusedSelect,
  initialQuery 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'system',
      text: "Welcome to KSP Crime Intelligence System. You can query in English or Kannada. Examples:\n\n• Show crime hotspots in Bengaluru\n• Map offender network connections\n• Risk profile of a specific accused\n• Crime trend comparison between districts\n• Financial transaction trail for fraud cases\n• Socio-demographic crime insights\n• Find similar past cases\n• Predict upcoming crime hotspots",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  const [contextIndicator, setContextIndicator] = useState<string | null>(null);
  const [llmMode, setLlmMode] = useState<'mock' | 'fallback' | 'live'>('mock');
  // Session memory: last 5 queries for context
  const [sessionHistory, setSessionHistory] = useState<Array<{query: string; tool: string; ts: Date}>>([]);
  const [showHistory, setShowHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Execute initial query if passed
  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  const handleSend = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    // Add user message
    const userMsgId = Math.random().toString(36).substring(7);
    const userMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text: trimmed,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      // Send to Express API with session ID for context tracking
      const result = await api.submitChat(trimmed, userId, role, sessionId);
      
      if (result.llmMode) {
        setLlmMode(result.llmMode);
      }

      // Update session memory
      const memEntry = { query: trimmed, tool: result.tool || 'text', ts: new Date() };
      setSessionHistory(prev => [...prev.slice(-4), memEntry]);

      // Generate contextual follow-up suggestions based on the tool used
      const followUpMap: Record<string, string[]> = {
        map:        ['Show crime trend chart for this area', 'Identify syndicate networks in this zone', 'Predict future hotspots here'],
        chart:      ['Socio-demographic breakdown of offenders', 'Map the top crime locations', 'Forecast crime for next 30 days'],
        network:    ['Show financial trail for this case', 'Risk profile of top node', 'Find similar past cases'],
        risk:       ['Show offender network connections', 'Financial transaction trail', 'Find similar cases with same MO'],
        finance:    ['Show network graph of all suspects', 'Risk profile of the primary accused', 'Map transaction origin locations'],
        socio:      ['Crime trend over 6 months', 'Predict high-risk districts', 'Network analysis for organized crime'],
        similar:    ['Risk score for the accused in this case', 'Show network graph', 'Financial trail for FIR'],
        forecast:   ['Show current hotspot map', 'View socio-demographic risk factors', 'Network of known recidivists'],
        ocr:        ['Risk profile of extracted suspect names', 'Search similar cases with this MO', 'Map location mentioned in document'],
        cdr:        ['Show network connections for this suspect', 'Risk profile analysis', 'Map recent crime hotspots'],
        biometrics: ['Risk profile of matched suspect', 'Show network connections', 'Financial trail for matched FIR'],
        dispatch:   ['Show current crime hotspot map', 'Forecast upcoming incidents', 'Review recent anomaly alerts'],
        text:       ['Show crime hotspot map', 'Crime trend analysis for this month', 'Identify syndicate networks'],
      };
      const suggestions = followUpMap[result.tool] || followUpMap['text'];

      const systemMessage: Message = {
        id: Math.random().toString(36).substring(7),
        sender: 'system',
        text: result.narrative,
        timestamp: new Date(),
        toolResult: result.tool !== 'text' ? {
          tool: result.tool as ToolType,
          data: result.data
        } : undefined,
        evidenceSources: result.evidenceSources,
        followUpSuggestions: suggestions
      };

      setMessages(prev => [...prev, systemMessage]);

      // Update context indicator
      if (result.tool !== 'text') {
        const toolLabels: Record<string, string> = {
          map: 'Geographic Analysis',
          chart: 'Trend Analytics',
          network: 'Network Analysis',
          risk: 'Risk Profiling',
          finance: 'Financial Trail',
          socio: 'Demographic Insights',
          similar: 'Case Matching',
          forecast: 'Predictive Intelligence',
          ocr: 'Vernacular OCR',
          cdr: 'CDR Spatial Timeline',
          biometrics: 'Biometric Search',
          dispatch: 'Dispatch Operations'
        };
        setContextIndicator(toolLabels[result.tool] || null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during query execution.');
    } finally {
      setIsLoading(false);
    }
  };

  // Triggered when double-clicking nodes in vis-network graph
  const handleNodeSelect = (name: string, type: 'person' | 'case') => {
    if (type === 'person') {
      if (onAccusedSelect) onAccusedSelect(name);
      handleSend(`What is the risk score of ${name}?`);
    } else {
      if (onFirSelect) onFirSelect(name);
      handleSend(`Show case details for ${name}`);
    }
  };

  // Compile full conversation into HTML and download as PDF via SmartBrowz
  const handleExportPdf = async () => {
    try {
      setIsLoading(true);
      let htmlContent = `
        <html>
        <head>
          <style>
            body { font-family: sans-serif; color: #1e293b; padding: 30px; }
            h1 { color: #0f172a; border-bottom: 2px solid #10b981; padding-bottom: 8px; }
            .meta { color: #64748b; font-size: 12px; margin-bottom: 25px; }
            .message { margin-bottom: 20px; padding: 15px; border-radius: 6px; }
            .user { background: #f1f5f9; border-left: 4px solid #64748b; }
            .system { background: #ecfdf5; border-left: 4px solid #10b981; }
            .sender { font-weight: bold; font-size: 13px; margin-bottom: 5px; }
            .text { font-size: 14px; white-space: pre-line; }
            .evidence { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; margin-top: 8px; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <h1>KSP Crime Intelligence Report</h1>
          <div class="meta">Generated by: ${userId} (${role}) | Date: ${new Date().toLocaleString()} | Session: ${sessionId}</div>
      `;

      messages.forEach(msg => {
        const senderLabel = msg.sender === 'user' ? 'Investigating Officer' : 'KSP Intelligence Assistant';
        const typeClass = msg.sender;
        htmlContent += `
          <div class="message ${typeClass}">
            <div class="sender">${senderLabel} (${msg.timestamp.toLocaleTimeString()})</div>
            <div class="text">${msg.text}</div>
            ${msg.evidenceSources ? `
              <div class="evidence">
                <strong>Evidence Trail:</strong> Tool: ${msg.evidenceSources.tool} | 
                Tables: ${msg.evidenceSources.tablesAccessed.join(', ')} | 
                Confidence: ${msg.evidenceSources.confidence}
              </div>
            ` : ''}
          </div>
        `;
      });

      htmlContent += `</body></html>`;
      const blob = await api.exportPdfReport(htmlContent, userId, role);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ksp-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to export report PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  // Text spoken by voice reader is the last system message
  const getLastSystemText = () => {
    const systemMsgs = messages.filter(m => msgIsTextOnly(m));
    if (systemMsgs.length > 0) {
      return systemMsgs[systemMsgs.length - 1].text.replace(/[*#]/g, '');
    }
    return undefined;
  };

  const msgIsTextOnly = (m: Message) => m.sender === 'system' && !m.toolResult;

  const getStatusColor = () => {
    if (llmMode === 'live') return 'bg-emerald-500';
    if (llmMode === 'fallback') return 'bg-amber-500';
    return 'bg-brand-primary';
  };

  const getStatusLabel = () => {
    if (llmMode === 'live') return 'Live LLM';
    if (llmMode === 'fallback') return 'LLM Fallback (Offline)';
    return 'Local Mock';
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-950 border border-slate-900 rounded-lg overflow-hidden shadow-2xl relative">
      
      {/* Session History Sidebar */}
      {showHistory && (
        <div className="absolute inset-0 z-50 flex">
          <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <History size={14} className="text-brand-primary" /> Session History
              </h4>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white cursor-pointer transition">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sessionHistory.length === 0 ? (
                <p className="text-xs text-slate-500 text-center mt-6">No queries yet in this session.</p>
              ) : (
                sessionHistory.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => { setShowHistory(false); handleSend(h.query); }}
                    className="w-full text-left px-3 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg group transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs text-slate-200 font-medium leading-relaxed line-clamp-2">{h.query}</span>
                      <ChevronRight size={12} className="text-slate-500 group-hover:text-brand-primary shrink-0 mt-0.5 transition" />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 bg-brand-primary/10 text-brand-primary rounded border border-brand-primary/20 font-semibold uppercase">{h.tool}</span>
                      <span className="text-[10px] text-slate-500">{h.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="flex-1 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
        </div>
      )}
      
      {/* Header bar */}
      <div className="flex justify-between items-center bg-slate-900 px-6 py-4 border-b border-slate-850">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${getStatusColor()}`} />
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              AI Intelligence Assistant
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                llmMode === 'live' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : llmMode === 'fallback'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
                {getStatusLabel()}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Secure Query Terminal • {role}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Context indicator */}
          {contextIndicator && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-md text-[11px] text-brand-primary font-semibold">
              <MessageSquare size={10} />
              <span>Context: {contextIndicator}</span>
            </div>
          )}

          {/* History toggle */}
          <button
            onClick={() => setShowHistory(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition cursor-pointer ${
              sessionHistory.length > 0
                ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary hover:bg-brand-primary/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-750'
            }`}
            title="Session History"
          >
            <History size={12} />
            {sessionHistory.length > 0 && <span className="text-[10px] bg-brand-primary text-white rounded-full px-1.5 py-0.5">{sessionHistory.length}</span>}
          </button>
          
          {/* PDF Export action */}
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 rounded-lg text-xs font-semibold transition cursor-pointer"
            title="Download Chat Log PDF"
          >
            <Download size={12} /> Export Report
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-4">
            <div className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                msg.sender === 'user' 
                  ? 'bg-slate-800 border-slate-700 text-slate-300' 
                  : 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'
              }`}>
                {msg.sender === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
              </div>
              
              <div>
                <div className={`rounded-lg p-4 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tr-none'
                    : 'bg-slate-900/40 text-slate-200 border border-slate-850 rounded-tl-none font-medium'
                }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
                
                {/* Evidence Trail - shown under system messages */}
                {msg.sender === 'system' && msg.evidenceSources && (
                  <EvidenceTrail sources={msg.evidenceSources} />
                )}

                {/* Follow-up suggestion chips */}
                {msg.sender === 'system' && msg.followUpSuggestions && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <div className="w-full flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
                      <Sparkles size={9} className="text-brand-primary" /> You might ask
                    </div>
                    {msg.followUpSuggestions.map((suggestion, si) => (
                      <button
                        key={si}
                        onClick={() => !isLoading && handleSend(suggestion)}
                        disabled={isLoading}
                        className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-brand-primary/10 border border-slate-700 hover:border-brand-primary/30 text-slate-300 hover:text-brand-primary rounded-full transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                
                <span className="text-[11px] text-slate-500 mt-1 block px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Inline Widget Render */}
            {msg.toolResult && (
              <div className="w-full flex justify-center">
                {msg.toolResult.tool === 'map' && (
                  <HotspotMap incidents={msg.toolResult.data} onFirSelect={onFirSelect} />
                )}
                {msg.toolResult.tool === 'chart' && (
                  <TrendChart data={msg.toolResult.data} />
                )}
                {msg.toolResult.tool === 'network' && (
                  <NetworkGraph data={msg.toolResult.data} onNodeSelect={handleNodeSelect} />
                )}
                {msg.toolResult.tool === 'risk' && (
                  <RiskScoreCard profile={msg.toolResult.data} onFirSelect={onFirSelect} onRecalculate={(query) => handleSend(query)} />
                )}
                {msg.toolResult.tool === 'finance' && (
                  <FinancialFlowGraph data={msg.toolResult.data} totalAmount={msg.toolResult.data.totalAmount} suspiciousCount={msg.toolResult.data.suspiciousCount} />
                )}
                {msg.toolResult.tool === 'socio' && (
                  <SocioDemographicChart data={msg.toolResult.data} />
                )}
                {msg.toolResult.tool === 'similar' && (
                  <SimilarCasesCard data={msg.toolResult.data} />
                )}
                {msg.toolResult.tool === 'forecast' && (
                  <ForecastAlertPanel forecasts={msg.toolResult.data} />
                )}
                {msg.toolResult.tool === 'ocr' && (
                  <OcrAnalysisCard data={msg.toolResult.data} />
                )}
                {msg.toolResult.tool === 'cdr' && (
                  <CdrTimelineMap data={msg.toolResult.data} mapId={`cdr-map-${msg.id}`} />
                )}
                {msg.toolResult.tool === 'biometrics' && (
                  <BiometricMatchesCard data={msg.toolResult.data} onAccusedSelect={onAccusedSelect} onFirSelect={onFirSelect} />
                )}
                {msg.toolResult.tool === 'dispatch' && (
                  <DispatchConsoleCard data={msg.toolResult.data} />
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-[85%] items-center">
            <div className="h-8 w-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-850 rounded-lg px-4 py-3 text-slate-400 text-xs">
              <Loader2 size={12} className="animate-spin text-brand-primary" />
              <span>Processing query...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex gap-2 items-center bg-red-950/20 border border-red-900/40 rounded-lg p-3 text-red-400 text-xs">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(inputText); }}
        className="bg-slate-900 p-4 border-t border-slate-850 flex items-center gap-3"
      >
        {/* Voice Dictation Panel */}
        <VoiceInput 
          onTranscriptReady={(txt) => handleSend(txt)} 
          textToSpeak={getLastSystemText()} 
        />

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter your query..."
          className="flex-1 bg-slate-950 border border-slate-850 focus:border-brand-primary focus:outline-none rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition"
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="p-3 bg-brand-primary hover:bg-brand-primary/95 disabled:bg-slate-800 text-white disabled:text-slate-600 rounded-lg transition shrink-0 cursor-pointer"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
