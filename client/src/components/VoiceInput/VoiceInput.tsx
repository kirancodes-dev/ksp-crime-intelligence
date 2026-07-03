import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceInputProps {
  onTranscriptReady: (text: string) => void;
  textToSpeak?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscriptReady, textToSpeak }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'en-IN' | 'kn-IN'>('en-IN');
  const recognitionRef = useRef<any>(null);
  const onTranscriptReadyRef = useRef(onTranscriptReady);

  useEffect(() => {
    onTranscriptReadyRef.current = onTranscriptReady;
  }, [onTranscriptReady]);

  useEffect(() => {
    if (recognitionRef.current) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN';

      rec.onstart = () => setIsListening(true);

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onTranscriptReadyRef.current(transcript);
        setIsListening(false);
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome/Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      // Dynamically set active language code
      recognitionRef.current.lang = voiceLang;
      recognitionRef.current.start();
    }
  }, [isListening, isSpeaking, voiceLang]);

  const handleSpeak = () => {
    if (!textToSpeak) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      // Speak the text
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      // Attempt to pick a natural sounding voice
      const voices = window.speechSynthesis.getVoices();
      
      if (voiceLang === 'kn-IN') {
        const knVoice = voices.find(v => v.lang === 'kn-IN' || v.name.includes('Kannada') || v.name.includes('India') && v.lang.startsWith('kn'));
        if (knVoice) {
          utterance.voice = knVoice;
        } else {
          const indianVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('India'));
          if (indianVoice) utterance.voice = indianVoice;
        }
      } else {
        const indianVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('India'));
        if (indianVoice) {
          utterance.voice = indianVoice;
        }
      }
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
      };
      
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Stop speaking when component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Language Toggle Badge */}
      <button
        type="button"
        onClick={() => setVoiceLang(prev => prev === 'en-IN' ? 'kn-IN' : 'en-IN')}
        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#d1d9e6] hover:bg-[#eef2f7] text-[#1e3a5f] text-[10px] font-bold uppercase transition cursor-pointer select-none"
        title={voiceLang === 'en-IN' ? "Active Language: English. Click to switch to Kannada" : "ಸಕ್ರಿಯ ಭಾಷೆ: ಕನ್ನಡ. ಇಂಗ್ಲಿಷ್ ಭಾಷೆಗೆ ಬದಲಾಯಿಸಲು ಕ್ಲಿಕ್ ಮಾಡಿ"}
      >
        {voiceLang === 'en-IN' ? 'EN' : 'ಕನ್ನಡ'}
      </button>

      {/* Microphone STT Trigger */}
      <button
        type="button"
        onClick={toggleListening}
        className={`p-3 rounded-full border transition duration-200 relative cursor-pointer ${
          isListening 
            ? 'bg-red-500/20 border-red-500/40 text-[#d9251c] active-ring' 
            : 'bg-[#f0f4f8] border-[#d1d9e6] text-[#6c757d] hover:text-[#1e3a5f] hover:border-[#d1d9e6]'
        }`}
        title={isListening ? "Stop listening" : "Dictate query via Mic"}
      >
        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>

      {/* Speaker TTS Trigger */}
      {textToSpeak && (
        <button
          type="button"
          onClick={handleSpeak}
          className={`p-3 rounded-full border transition duration-200 cursor-pointer ${
            isSpeaking 
              ? 'bg-[#1e3a5f]/20 border-[#1e3a5f]/40 text-[#1e3a5f]' 
              : 'bg-[#f0f4f8] border-[#d1d9e6] text-[#6c757d] hover:text-[#1e3a5f] hover:border-[#d1d9e6]'
          }`}
          title={isSpeaking ? "Mute audio readout" : "Listen to audio readout"}
        >
          {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      )}
    </div>
  );
};
