import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Pin, Trash2, Users, FileText, Sparkles, Download, RefreshCw, Save, CheckCircle } from 'lucide-react';

interface PinnedAsset {
  id: number;
  asset_type: 'fir' | 'accused';
  asset_id: string;
  details: string;
  pinned_at: string;
}

interface CollaborativeWorkspaceProps {
  userId: string;
  role: string;
  onFirSelect?: (firNumber: string) => void;
  onAccusedSelect?: (name: string) => void;
}

export const CollaborativeWorkspace: React.FC<CollaborativeWorkspaceProps> = ({
  userId,
  role,
  onFirSelect,
  onAccusedSelect
}) => {
  const [pinnedAssets, setPinnedAssets] = useState<PinnedAsset[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [reportGenerating, setReportGenerating] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [generatedReportHtml, setGeneratedReportHtml] = useState<string>('');

  const activeTeam = [
    { name: 'SI Meera Nair', role: 'Investigator', status: 'Online', badge: 'KSP-8831' },
    { name: 'DA Priya Sharma', role: 'Analyst', status: 'Online', badge: 'KSP-4102' },
    { name: 'ACP Raghavendra K.', role: 'Supervisor', status: 'Away', badge: 'KSP-0021' },
    { name: 'DGP Srinivas M.', role: 'Policymaker', status: 'Online', badge: 'KSP-0001' }
  ];

  const fetchState = async () => {
    try {
      setLoading(true);
      const res = await api.getWorkspaceState(userId, role);
      if (res.success) {
        setPinnedAssets(res.pinned || []);
        setNotes(res.notes || '');
      }
    } catch (err) {
      console.error('Failed to load workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, [userId, role]);

  const handleSaveNotes = async () => {
    try {
      setSaveStatus('saving');
      const res = await api.saveWorkspaceNotes(notes, userId, role);
      if (res.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  };

  const handleUnpin = async (assetType: 'fir' | 'accused', assetId: string) => {
    try {
      const res = await api.pinWorkspaceAsset(assetType, assetId, '', userId, role);
      if (res.success) {
        setPinnedAssets(prev => prev.filter(a => !(a.asset_type === assetType && a.asset_id === assetId)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateReport = async () => {
    setReportGenerating(true);
    // Construct premium HTML case progress report
    const html = `
      <html>
      <head>
        <style>
          body { font-family: sans-serif; color: #1e293b; padding: 40px; }
          h1 { color: #0a0f1d; border-bottom: 3px solid #d9251c; padding-bottom: 10px; margin-bottom: 5px; text-transform: uppercase; font-size: 22px; }
          .subtitle { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 30px; font-weight: bold; }
          .section { margin-bottom: 25px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
          .section-title { font-size: 14px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; font-size: 12px; margin-bottom: 20px; }
          .meta-item { border-left: 3px solid #3b82f6; padding-left: 8px; }
          .meta-label { color: #64748b; font-weight: bold; font-size: 10px; text-transform: uppercase; }
          .meta-value { font-weight: bold; color: #1e293b; }
          .notes { white-space: pre-wrap; font-style: italic; font-size: 13px; color: #334155; line-height: 1.6; }
          .asset-tag { display: inline-block; padding: 4px 8px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; font-size: 11px; font-weight: bold; border-radius: 4px; margin-right: 6px; margin-bottom: 6px; }
          .footer { text-align: center; margin-top: 40px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <h1>KSP Collaborative Case Briefing</h1>
        <div class="subtitle">Karnataka State Police • Official Investigation Summary</div>
        
        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">Compiled By</div>
            <div class="meta-value">${userId} (${role})</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Date Compiled</div>
            <div class="meta-value">${new Date().toLocaleString()}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Shared Investigation Desk Notes</div>
          <div class="notes">${notes || 'No notes compiled for this workspace yet.'}</div>
        </div>

        <div class="section">
          <div class="section-title">Pinned Investigative Assets (${pinnedAssets.length})</div>
          <div>
            ${pinnedAssets.length > 0 
              ? pinnedAssets.map(a => `<span class="asset-tag">${a.asset_type.toUpperCase()}: ${a.asset_id}</span>`).join('')
              : '<span style="font-size: 12px; color: #94a3b8; italic">No assets pinned to workspace.</span>'
            }
          </div>
        </div>

        <div class="section">
          <div class="section-title">Active Station Roster (Access Audit)</div>
          <div style="font-size: 12px; line-height: 1.5;">
            ${activeTeam.map(t => `• <strong>${t.name}</strong> (${t.role}) - Badge: ${t.badge} (${t.status})<br/>`).join('')}
          </div>
        </div>

        <div class="footer">
          CONFIDENTIAL • RESTRICTED ACCESS • KARNATAKA STATE POLICE © 2026
        </div>
      </body>
      </html>
    `;

    setGeneratedReportHtml(html);
    setReportGenerating(false);
    setShowReportModal(true);
  };

  const handleDownloadPdf = async () => {
    try {
      setReportGenerating(true);
      const blob = await api.exportPdfReport(generatedReportHtml, userId, role);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `KSP-Workspace-Brief-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      setShowReportModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to compile PDF briefing.');
    } finally {
      setReportGenerating(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 relative font-sans text-slate-800">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-150 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-50 text-brand-primary border border-blue-100 rounded-lg flex items-center justify-center">
            <Pin size={20} className="rotate-45" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase">Collaborative Investigation Desk</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Shared Station Workspace • Real-Time Synchronization</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchState}
            disabled={loading}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-lg transition cursor-pointer"
            title="Refresh Workspace"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={handleGenerateReport}
            disabled={loading || reportGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition cursor-pointer"
          >
            <FileText size={13} />
            <span>Compile Briefing</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2 text-sm">
          <RefreshCw className="animate-spin text-brand-primary" size={16} />
          <span>Synchronizing collaborative desk...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Notes and Active Roster */}
          <div className="lg:col-span-2 space-y-5">
            {/* Notes Section */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] uppercase font-extrabold text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Sparkles size={12} className="text-brand-primary" />
                  Shared Investigation Notes
                </span>
                
                <div className="flex items-center gap-2">
                  {saveStatus === 'saving' && <span className="text-[10px] text-slate-400 italic">Saving...</span>}
                  {saveStatus === 'saved' && (
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                      <CheckCircle size={10} /> Saved
                    </span>
                  )}
                  {saveStatus === 'error' && <span className="text-[10px] text-red-600 font-bold">Error saving</span>}
                  
                  <button
                    onClick={handleSaveNotes}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] rounded transition cursor-pointer"
                  >
                    <Save size={10} /> Save
                  </button>
                </div>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Collaborative notes here... Type suspect MOs, transaction details, or case timelines. Everyone in this station shares this state."
                className="w-full h-48 bg-white border border-slate-200 rounded-md p-3 text-xs leading-relaxed focus:border-brand-primary focus:outline-none text-slate-800 placeholder-slate-400 font-medium"
              />
            </div>

            {/* Active Station Investigators Roster */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <span className="text-[11px] uppercase font-extrabold text-slate-500 tracking-wider flex items-center gap-1.5 mb-3">
                <Users size={12} className="text-brand-primary" />
                Active Station Investigators
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeTeam.map((member, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-white border border-slate-150 rounded-lg text-xs">
                    <div>
                      <strong className="text-slate-800 text-[12px]">{member.name}</strong>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mt-0.5">{member.role} • {member.badge}</span>
                    </div>
                    
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                      member.status === 'Online'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {member.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Pinned Investigation Assets */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 h-fit space-y-4">
            <span className="text-[11px] uppercase font-extrabold text-slate-500 tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Pin size={12} className="text-brand-primary" />
              Pinned case assets ({pinnedAssets.length})
            </span>

            {pinnedAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs italic">
                <span>No assets pinned to desk.</span>
                <span className="text-[10px] text-slate-400 mt-1">Pin cases/suspects from their dockets to see them here.</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {pinnedAssets.map((asset) => (
                  <div key={asset.id} className="p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-350 transition relative group">
                    
                    <button
                      onClick={() => handleUnpin(asset.asset_type, asset.asset_id)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100 cursor-pointer p-1"
                      title="Unpin Asset"
                    >
                      <Trash2 size={12} />
                    </button>

                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                      {asset.asset_type === 'fir' ? 'Case File' : 'Accused'}
                    </div>

                    <div 
                      className="text-brand-primary font-extrabold text-[13px] hover:underline cursor-pointer flex items-center gap-1"
                      onClick={() => {
                        if (asset.asset_type === 'fir') {
                          if (onFirSelect) onFirSelect(asset.asset_id);
                        } else {
                          if (onAccusedSelect) onAccusedSelect(asset.asset_id);
                        }
                      }}
                    >
                      {asset.asset_id}
                    </div>

                    {asset.details && (
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold leading-relaxed line-clamp-2">
                        {asset.details}
                      </p>
                    )}

                    <div className="text-[9px] text-slate-400 font-bold mt-2">
                      Pinned: {new Date(asset.pinned_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Report Preview Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[5000] p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-2xl p-6 relative flex flex-col gap-4 max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase">Case Progress Briefing Preview</h3>
              <span className="text-[10px] bg-blue-50 text-brand-primary px-2 rounded font-bold uppercase">SmartBrowz PDF</span>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div 
                className="bg-white p-6 shadow-sm border border-slate-150 rounded"
                dangerouslySetInnerHTML={{ __html: generatedReportHtml }}
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-150 pt-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-lg transition cursor-pointer"
              >
                Close
              </button>
              
              <button
                onClick={handleDownloadPdf}
                disabled={reportGenerating}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition cursor-pointer"
              >
                <Download size={13} />
                {reportGenerating ? 'Generating PDF...' : 'Download Official PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
