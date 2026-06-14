import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceInputProps {
  onTranscriptReady: (text: string) => void;
  textToSpeak?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscriptReady, textToSpeak }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Check for browser Speech Recognition API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN'; // Set language to English (India) or Kannada if supported

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onTranscriptReady(transcript);
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [onTranscriptReady]);

  const toggleListening = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome/Safari.");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      // Stop speaking if active
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      recognition.start();
    }
  };

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
      const indianVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('India'));
      if (indianVoice) {
        utterance.voice = indianVoice;
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
      {/* Microphone STT Trigger */}
      <button
        onClick={toggleListening}
        className={`p-3 rounded-full border transition duration-200 relative ${
          isListening 
            ? 'bg-red-500/20 border-red-500/40 text-red-400 active-ring' 
            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
        }`}
        title={isListening ? "Stop listening" : "Dictate query via Mic"}
      >
        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>

      {/* Speaker TTS Trigger */}
      {textToSpeak && (
        <button
          onClick={handleSpeak}
          className={`p-3 rounded-full border transition duration-200 ${
            isSpeaking 
              ? 'bg-brand-primary/20 border-brand-primary/40 text-brand-primary' 
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
          title={isSpeaking ? "Mute audio readout" : "Listen to audio readout"}
        >
          {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      )}
    </div>
  );
};
