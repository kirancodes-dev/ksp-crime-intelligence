import React from 'react';
import { FileText, Globe, MapPin, User, DollarSign, AlertCircle, Sparkles } from 'lucide-react';

interface OcrAnalysisCardProps {
  data: {
    rawKannada: string;
    translatedEnglish: string;
    detectedLanguage: string;
    translationConfidence: number;
    entities: {
      suspects: string[];
      locations: string[];
      dates: string[];
      monetaryAmount: string;
      weaponsMentioned: string[];
    };
  };
}

export const OcrAnalysisCard: React.FC<OcrAnalysisCardProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="w-full bg-[#f0f4f8] border border-[#d1d9e6] rounded-lg p-5 shadow-lg text-[#1e3a5f]">
      <div className="flex items-center justify-between border-b border-[#d1d9e6] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <FileText className="text-[#1e3a5f] h-5 w-5 animate-pulse" />
          <h4 className="font-bold text-sm uppercase tracking-wider text-[#1e3a5f]">
            Vernacular OCR Intelligence
          </h4>
        </div>
        <div className="flex items-center gap-2 bg-slate-850 px-2.5 py-1 rounded border border-[#d1d9e6] text-[11px]">
          <Globe size={12} className="text-emerald-700" />
          <span className="text-[#2d4a6f] font-semibold uppercase">{data.detectedLanguage} (Kannada)</span>
          <span className="text-[#6c757d]">•</span>
          <span className="text-emerald-700 font-bold">{(data.translationConfidence * 100).toFixed(0)}% Confidence</span>
        </div>
      </div>

      {/* Side-by-Side Text translation pane */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="bg-[#0d2137] p-4 rounded-lg border border-[#d1d9e6]">
          <div className="text-[10px] font-bold text-[#6c757d] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Raw Kannada Source
          </div>
          <p className="text-sm font-medium leading-relaxed text-[#2d4a6f] font-kannada select-all break-words">
            {data.rawKannada}
          </p>
        </div>

        <div className="bg-[#0d2137] p-4 rounded-lg border border-[#d1d9e6]">
          <div className="text-[10px] font-bold text-[#6c757d] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            AI Translated English
          </div>
          <p className="text-sm font-semibold leading-relaxed text-[#1e3a5f] italic select-all break-words">
            "{data.translatedEnglish}"
          </p>
        </div>
      </div>

      {/* Extracted Relational Entities */}
      <div className="bg-[#0d2137]/40 p-4 rounded-lg border border-[#d1d9e6]">
        <div className="text-[10px] font-bold text-[#6c757d] uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Sparkles size={12} className="text-[#1e3a5f]" />
          Extracted Case Entities
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-[#6c757d] font-bold uppercase tracking-wider flex items-center gap-1">
              <User size={10} className="text-[#1e3a5f]" /> Accused / Suspects
            </span>
            <div className="text-xs font-bold text-[#1e3a5f]">
              {Array.isArray(data?.entities?.suspects) && data.entities.suspects.length > 0 ? (
                data.entities.suspects.map((s, i) => (
                  <span key={i} className="inline-block bg-blue-500/10 text-[#2a4a73] border border-blue-500/25 px-1.5 py-0.5 rounded text-[11px]">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-[#6c757d] italic">None Detected</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-[#6c757d] font-bold uppercase tracking-wider flex items-center gap-1">
              <MapPin size={10} className="text-emerald-700" /> Locations
            </span>
            <div className="text-xs font-bold text-[#1e3a5f]">
              {Array.isArray(data?.entities?.locations) && data.entities.locations.length > 0 ? (
                data.entities.locations.map((l, i) => (
                  <span key={i} className="inline-block bg-emerald-500/10 text-emerald-700 border border-emerald-500/25 px-1.5 py-0.5 rounded text-[11px]">
                    {l}
                  </span>
                ))
              ) : (
                <span className="text-[#6c757d] italic">None Detected</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-[#6c757d] font-bold uppercase tracking-wider flex items-center gap-1">
              <DollarSign size={10} className="text-amber-700" /> Monetary Amounts
            </span>
            <div className="text-xs font-bold text-[#1e3a5f]">
              {data.entities.monetaryAmount !== 'None' ? (
                <span className="inline-block bg-amber-500/10 text-amber-700 border border-amber-500/25 px-1.5 py-0.5 rounded text-[11px]">
                  {data.entities.monetaryAmount}
                </span>
              ) : (
                <span className="text-[#6c757d] italic">None</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-[#6c757d] font-bold uppercase tracking-wider flex items-center gap-1">
              <AlertCircle size={10} className="text-[#d9251c]" /> Weapons
            </span>
            <div className="text-xs font-bold text-[#1e3a5f]">
              {data.entities.weaponsMentioned && data.entities.weaponsMentioned[0] !== 'None' ? (
                <span className="inline-block bg-red-500/10 text-[#d9251c] border border-red-500/25 px-1.5 py-0.5 rounded text-[11px]">
                  {data.entities.weaponsMentioned.join(', ')}
                </span>
              ) : (
                <span className="text-[#6c757d] italic">None</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
