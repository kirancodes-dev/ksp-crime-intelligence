import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { InvestigationTimeline } from '../Visualizations/InvestigationTimeline';
import { EarlyWarningPanel } from '../Visualizations/EarlyWarningPanel';
import { CaseSummaryCard } from '../Visualizations/CaseSummaryCard';
import { Send, Bot, User as UserIcon, Loader2, Download, AlertCircle, MessageSquare, Sparkles, History, ChevronRight, X } from 'lucide-react';

type ToolType = 'map' | 'chart' | 'network' | 'risk' | 'text' | 'finance' | 'socio' | 'similar' | 'forecast' | 'ocr' | 'cdr' | 'biometrics' | 'dispatch' | 'timeline' | 'early_warning' | 'case_summary' | 'general';

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
  llmMode?: string;
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
  const [llmMode, setLlmMode] = useState<string>('mock');
  // Session memory: last 5 queries for context
  const [sessionHistory, setSessionHistory] = useState<Array<{query: string; tool: string; ts: Date}>>([]);
  const [showHistory, setShowHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const handleSendRef = useRef<(query: string) => void>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = useCallback(async (queryText: string) => {
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
      timeline:   ['Show financial trail for this case', 'Risk profile of all suspects', 'Find similar past cases'],
      early_warning: ['Show repeat offender profiles', 'Map gang activity networks', 'Forecast next 30 days'],
      case_summary: ['Show investigation timeline', 'Risk profile of suspects', 'Show linked cases'],
      text:       ['Show crime hotspot map', 'Crime trend analysis for this month', 'Identify syndicate networks'],
      general:    ['Explain how recidivism is calculated', 'What are typical warning signs for cyber crime escalation?', 'Show recent crime trend chart'],
    };

    const systemMsgId = Math.random().toString(36).substring(7);
    const initialSystemMessage: Message = {
      id: systemMsgId,
      sender: 'system',
      text: 'Thinking...',
      timestamp: new Date(),
      llmMode: 'mock'
    };

    setMessages(prev => [...prev, initialSystemMessage]);

    try {
      const response = await fetch(`/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
          'X-User-Role': role,
        },
        body: JSON.stringify({ query: trimmed, sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to communicate with streaming service');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('Streaming response body not readable');

      let accumulatedText = '';
      let detectedTool = 'text';
      let currentLlmMode = 'mock';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(trimmedLine.slice(6));

            if (event.type === 'metadata') {
              detectedTool = event.tool;

              setMessages(prev => prev.map(m => m.id === systemMsgId ? {
                ...m,
                toolResult: event.tool !== 'text' ? {
                  tool: event.tool as ToolType,
                  data: event.data
                } : undefined,
                evidenceSources: event.evidenceSources
              } : m));

              if (event.tool !== 'text') {
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
                  dispatch: 'Dispatch Operations',
                  timeline: 'Investigation Timeline',
                  early_warning: 'Early Warning Intelligence',
                  case_summary: 'Case Summary',
                  general: 'General Q&A'
                };
                setContextIndicator(toolLabels[event.tool] || null);
              }
            } else if (event.type === 'meta') {
              currentLlmMode = event.provider || 'mock';
              setLlmMode(currentLlmMode);
              setMessages(prev => prev.map(m => m.id === systemMsgId ? {
                ...m,
                llmMode: currentLlmMode
              } : m));
            } else if (event.type === 'token') {
              if (accumulatedText === '') {
                accumulatedText = event.content;
              } else {
                accumulatedText += event.content;
              }
              setMessages(prev => prev.map(m => m.id === systemMsgId ? {
                ...m,
                text: accumulatedText
              } : m));
            } else if (event.type === 'translation') {
              accumulatedText = event.content;
              setMessages(prev => prev.map(m => m.id === systemMsgId ? {
                ...m,
                text: accumulatedText
              } : m));
            } else if (event.type === 'done') {
              const finalNarrative = event.narrative || accumulatedText;
              const suggestions = followUpMap[detectedTool] || followUpMap['text'];
              
              setMessages(prev => prev.map(m => m.id === systemMsgId ? {
                ...m,
                text: finalNarrative,
                llmMode: event.llmMode || currentLlmMode,
                followUpSuggestions: suggestions
              } : m));

              const memEntry = { query: trimmed, tool: detectedTool, ts: new Date() };
              setSessionHistory(prev => [...prev.slice(-4), memEntry]);
            } else if (event.type === 'error') {
              setError(event.error);
            }
          } catch (e) {
            console.warn('Failed parsing stream chunk:', e);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during query execution.');
      setMessages(prev => prev.filter(m => m.id !== systemMsgId || m.text !== 'Thinking...'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, role, sessionId]);

  handleSendRef.current = handleSend;

  // Execute initial query if passed
  useEffect(() => {
    if (initialQuery && handleSendRef.current) {
      handleSendRef.current(initialQuery);
    }
  }, [initialQuery]);

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
      const dateStr = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      let htmlContent = `
        <html>
        <head>
          <style>
            @page { margin: 20mm 15mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 0; font-size: 13px; position: relative; }
            .watermark { position: fixed; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 60px; color: rgba(220,38,38,0.06); font-weight: 900; letter-spacing: 8px; z-index: 0; pointer-events: none; white-space: nowrap; }
            .header-bar { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 20px 24px; border-radius: 6px; margin-bottom: 20px; }
            .header-bar h1 { margin: 0; font-size: 18px; letter-spacing: 1px; }
            .header-bar .subtitle { font-size: 11px; color: #94a3b8; margin-top: 4px; }
            .classification { text-align: center; background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; font-size: 10px; font-weight: 800; letter-spacing: 2px; padding: 6px; margin-bottom: 16px; border-radius: 3px; text-transform: uppercase; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; font-size: 11px; }
            .meta-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 12px; }
            .meta-label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
            .meta-value { color: #0f172a; font-weight: 700; margin-top: 2px; }
            .message { margin-bottom: 16px; padding: 14px; border-radius: 6px; page-break-inside: avoid; }
            .user { background: #f1f5f9; border-left: 4px solid #475569; }
            .system { background: #f0fdf4; border-left: 4px solid #22c55e; }
            .sender { font-weight: 700; font-size: 11px; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
            .text { font-size: 13px; white-space: pre-line; line-height: 1.6; color: #1e293b; }
            .evidence { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; margin-top: 10px; font-size: 10px; color: #64748b; }
            .evidence strong { color: #475569; }
            .evidence-row { display: flex; gap: 16px; margin-top: 4px; }
            .evidence-item { display: flex; align-items: center; gap: 4px; }
            .badge { display: inline-block; background: #e2e8f0; color: #475569; padding: 1px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; margin: 0 2px; }
            .footer { margin-top: 30px; padding-top: 12px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 9px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="watermark">RESTRICTED</div>
          <div class="classification">Restricted — For Official Use Only — Karnataka State Police</div>
          <div class="header-bar">
            <h1>\u2588 CRIME INTELLIGENCE REPORT</h1>
            <div class="subtitle">Karnataka State Police — Crime Intelligence & Analytics Division</div>
          </div>
          <div class="meta-grid">
            <div class="meta-item"><div class="meta-label">Generating Officer</div><div class="meta-value">${userId} (${role})</div></div>
            <div class="meta-item"><div class="meta-label">Report Date</div><div class="meta-value">${dateStr}</div></div>
            <div class="meta-item"><div class="meta-label">Session ID</div><div class="meta-value">${sessionId.substring(0, 20)}...</div></div>
            <div class="meta-item"><div class="meta-label">AI Engine</div><div class="meta-value">${llmMode === 'glm' ? 'GLM-5.2 Agentic' : llmMode === 'groq' ? 'Groq LPU (Llama 3.3 70B)' : llmMode === 'live' ? 'Live LLM' : llmMode}</div></div>
          </div>
      `;

      messages.forEach(msg => {
        const senderLabel = msg.sender === 'user' ? '\u25B6 Investigating Officer' : '\u25C6 KSP Intelligence Assistant';
        const typeClass = msg.sender;
        const evidenceSource = Array.isArray(msg.evidenceSources) ? msg.evidenceSources[0] : msg.evidenceSources;
        htmlContent += `
          <div class="message ${typeClass}">
            <div class="sender">${senderLabel} — ${msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="text">${msg.text}</div>
            ${evidenceSource ? `
              <div class="evidence">
                <strong>Evidence Trail</strong>
                <div class="evidence-row">
                  <div class="evidence-item"><strong>Tool:</strong> ${evidenceSource.tool}</div>
                  <div class="evidence-item"><strong>Confidence:</strong> ${evidenceSource.confidence}</div>
                  <div class="evidence-item"><strong>LLM:</strong> ${msg.llmMode || 'mock'}</div>
                </div>
                <div style="margin-top:4px;"><strong>Tables:</strong> ${(evidenceSource.tablesAccessed || []).map((t: string) => '<span class="badge">' + t + '</span>').join(' ')}</div>
              </div>
            ` : ''}
          </div>
        `;
      });

      htmlContent += `
          <div class="footer">
            \u00A9 ${new Date().getFullYear()} Karnataka State Police. This report was auto-generated by the Crime Intelligence Portal. 
            Classification: RESTRICTED. Unauthorized distribution is prohibited under IT Act 2000.
          </div>
        </body></html>`;
      const blob = await api.exportPdfReport(htmlContent, userId, role);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ksp-intelligence-report-${Date.now()}.pdf`);
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
    if (llmMode === 'glm') return 'bg-pink-500';
    if (llmMode === 'groq') return 'bg-orange-500';
    if (llmMode === 'gemini') return 'bg-blue-500';
    if (llmMode === 'ollama') return 'bg-purple-500';
    if (llmMode === 'live') return 'bg-emerald-500';
    if (llmMode === 'fallback') return 'bg-amber-500';
    return 'bg-brand-primary';
  };

  const getStatusLabel = () => {
    if (llmMode === 'glm') return 'GLM-5.2 Agentic';
    if (llmMode === 'groq') return 'Groq ⚡ Live';
    if (llmMode === 'gemini') return 'Gemini Live';
    if (llmMode === 'ollama') return 'Ollama Local';
    if (llmMode === 'live') return 'Live LLM';
    if (llmMode === 'fallback') return 'LLM Fallback';
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
      <div className="flex justify-between items-center bg-slate-900 px-6 py-4 border-b border-slate-800">
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
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
            title="Session History"
          >
            <History size={12} />
            {sessionHistory.length > 0 && <span className="text-[10px] bg-brand-primary text-white rounded-full px-1.5 py-0.5">{sessionHistory.length}</span>}
          </button>
          
          {/* PDF Export action */}
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
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
                    : 'bg-slate-900/40 text-slate-200 border border-slate-800 rounded-tl-none font-medium'
                }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
                
                {/* Evidence Trail - shown under system messages */}
                {msg.sender === 'system' && msg.evidenceSources && (
                  <EvidenceTrail sources={msg.evidenceSources} llmMode={msg.llmMode} />
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
                {msg.toolResult.tool === 'timeline' && (
                  <InvestigationTimeline data={msg.toolResult.data} />
                )}
                {msg.toolResult.tool === 'early_warning' && (
                  <EarlyWarningPanel data={msg.toolResult.data} />
                )}
                {msg.toolResult.tool === 'case_summary' && (
                  <CaseSummaryCard data={msg.toolResult.data} />
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
            <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-800 rounded-lg px-4 py-3 text-slate-400 text-xs">
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

      {/* Demo Presets Row */}
      <div className="bg-slate-950 px-4 py-2 border-t border-slate-900/60 flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Demo Presets:</span>
        <div className="flex flex-1 gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { label: '👤 Risk of Jacky', query: 'Show risk profile of Jacky' },
            { label: '🕸️ Offender Network: Sharief', query: 'Map offender network connections for Mohammad Sharief' },
            { label: '💰 Financial Trail: FIR-2026-004', query: 'Show financial transaction trail for FIR-2026-004' },
            { label: '📍 Hotspots: Bengaluru', query: 'Show crime hotspots in Bengaluru' },
            { label: '🔮 Forecast hotspots', query: 'Predict upcoming crime hotspots' }
          ].map((preset, index) => (
            <button
              key={index}
              type="button"
              onClick={() => !isLoading && handleSend(preset.query)}
              disabled={isLoading}
              className="text-[10px] whitespace-nowrap px-2.5 py-1 bg-slate-900/80 hover:bg-brand-primary/10 border border-slate-800 hover:border-brand-primary/30 text-slate-300 hover:text-brand-primary rounded transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(inputText); }}
        className="bg-slate-900 p-4 border-t border-slate-800 flex items-center gap-3"
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
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-brand-primary focus:outline-none rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition"
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
