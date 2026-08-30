import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Sparkles, Zap, Command, Volume2, ShieldCheck, AlertTriangle, WifiOff } from 'lucide-react';
import { JarvisStatus, LanguageMode } from '../types';
import { LiveAudioWave } from './LiveAudioWave';
import { voiceEngine } from '../services/voice';

interface CentralCoreProps {
  status: JarvisStatus;
  isListening: boolean;
  onToggleMic: () => void;
  onQuickCommand: (command: string) => void;
  language: LanguageMode;
  currentSpeechText?: string;
  isAgentConnected?: boolean;
}

export const CentralCore: React.FC<CentralCoreProps> = ({
  status,
  isListening,
  onToggleMic,
  onQuickCommand,
  language,
  currentSpeechText,
  isAgentConnected = true,
}) => {
  const [pulseScale, setPulseScale] = useState(1);

  // Reaction to real audio volume and states
  useEffect(() => {
    let animId: number;
    const checkVol = () => {
      if (isListening) {
        const vol = voiceEngine.getAverageAudioVolume();
        const normalized = 1 + (vol / 255) * 0.35;
        setPulseScale(normalized);
      } else if (status === 'SPEAKING') {
        const simulated = 1 + Math.sin(Date.now() * 0.015) * 0.15;
        setPulseScale(simulated);
      } else if (status === 'THINKING') {
        const simulated = 1 + Math.sin(Date.now() * 0.008) * 0.08;
        setPulseScale(simulated);
      } else if (status === 'EXECUTING') {
        const simulated = 1 + Math.sin(Date.now() * 0.02) * 0.12;
        setPulseScale(simulated);
      } else {
        // IDLE slow breathing
        const breathe = 1 + Math.sin(Date.now() * 0.002) * 0.03;
        setPulseScale(breathe);
      }
      animId = requestAnimationFrame(checkVol);
    };
    checkVol();
    return () => cancelAnimationFrame(animId);
  }, [isListening, status]);

  const quickPrompts = [
    { en: 'Open Chrome and search YouTube for Python tutorials', hi: 'क्रोम खोलो और यूट्यूब पर पायथन सर्च करो' },
    { en: 'Take screenshot', hi: 'स्क्रीनशॉट लो' },
    { en: 'Start Work Routine', hi: 'वर्क रूटीन शुरू करो' },
    { en: 'What is my CPU and RAM usage?', hi: 'सिस्टम की स्थिति और रैम उपयोग बताओ' },
    { en: 'Open VS Code', hi: 'वीएस कोड खोलो' },
    { en: 'Lock PC', hi: 'पीसी लॉक करो' },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-7 px-6 relative bg-white/70 backdrop-blur-md rounded-3xl border border-[#DDE7F2] shadow-sm overflow-hidden select-none">
      {/* Top Left Indicator */}
      <div className="absolute top-5 left-6 text-[10px] font-bold text-slate-400 tracking-[0.25em] uppercase">
        Neural Core Matrix
      </div>

      {/* Top Right Status Badge */}
      <div className="absolute top-5 right-6 flex items-center gap-1.5 text-[10px] font-bold text-[#16BDE3] tracking-wider uppercase bg-cyan-50/80 px-2.5 py-1 rounded-full border border-cyan-200">
        <Sparkles className="w-3 h-3 text-[#16BDE3]" />
        <span>{language === 'hi' ? 'द्विभाषी (HI)' : language === 'en' ? 'English (EN)' : 'Auto Bilingual'}</span>
      </div>

      {/* Holographic AI Core Orb */}
      <div className="relative w-44 h-44 flex items-center justify-center my-3">
        {/* Animated Dashed and Pulse Orbit Rings */}
        <div
          className={`absolute inset-0 rounded-full border transition-all pointer-events-none ${
            status === 'ERROR'
              ? 'border-rose-400/40 animate-pulse'
              : status === 'OFFLINE'
              ? 'border-slate-300/30'
              : 'border-[#16BDE3]/30 animate-pulse'
          }`}
          style={{ transform: `scale(${pulseScale * 1.06})` }}
        />
        <div
          className={`absolute inset-3 rounded-full border-2 border-dashed transition-all duration-700 pointer-events-none ${
            status === 'THINKING'
              ? 'border-[#6675F5] animate-[spin_3s_linear_infinite]'
              : status === 'EXECUTING'
              ? 'border-amber-400 animate-[spin_1.5s_linear_infinite]'
              : isListening
              ? 'border-[#16BDE3] animate-[spin_8s_linear_infinite]'
              : status === 'ERROR'
              ? 'border-rose-400'
              : 'border-cyan-200 animate-[spin_25s_linear_infinite]'
          }`}
        />

        {/* Outer Glow Ball */}
        <div
          onClick={onToggleMic}
          className={`w-28 h-28 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-105 shadow-lg ${
            status === 'ERROR'
              ? 'bg-gradient-to-tr from-rose-500 to-amber-500 shadow-rose-300/60'
              : status === 'OFFLINE'
              ? 'bg-gradient-to-tr from-slate-400 to-slate-500 shadow-slate-300/40'
              : status === 'EXECUTING'
              ? 'bg-gradient-to-tr from-amber-500 to-cyan-400 shadow-amber-300/60'
              : status === 'THINKING'
              ? 'bg-gradient-to-tr from-[#6675F5] to-[#16BDE3] shadow-indigo-300/60'
              : 'bg-gradient-to-tr from-[#16BDE3] to-[#6675F5] shadow-cyan-300/60'
          }`}
          style={{ transform: `scale(${pulseScale})` }}
        >
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/50 flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-white shadow-inner flex items-center justify-center text-[#172033]">
              {isListening ? (
                <Mic className="w-5 h-5 text-[#16BDE3] animate-bounce" />
              ) : status === 'SPEAKING' ? (
                <Volume2 className="w-5 h-5 text-[#16BDE3] animate-pulse" />
              ) : status === 'EXECUTING' ? (
                <Zap className="w-5 h-5 text-amber-500 animate-spin" />
              ) : status === 'ERROR' ? (
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              ) : status === 'OFFLINE' ? (
                <WifiOff className="w-5 h-5 text-slate-400" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-[#16BDE3] to-[#6675F5]" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bold Typography Title & Status */}
      <div className="text-center">
        <h2 className="text-2xl font-black text-[#172033] tracking-widest uppercase font-sans">
          J.A.R.V.I.S.
        </h2>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === 'ERROR'
                ? 'bg-rose-500'
                : status === 'OFFLINE'
                ? 'bg-slate-400'
                : 'bg-[#16BDE3] animate-ping'
            }`}
          />
          <span className="text-[10px] font-bold tracking-[0.3em] text-[#172033]/70 uppercase font-mono">
            {status === 'LISTENING'
              ? 'LISTENING'
              : status === 'THINKING'
              ? 'THINKING'
              : status === 'EXECUTING'
              ? 'EXECUTING'
              : status === 'SPEAKING'
              ? 'SPEAKING'
              : status === 'ERROR'
              ? 'SYSTEM ERROR'
              : status === 'OFFLINE'
              ? 'OFFLINE'
              : 'IDLE / STANDBY'}
          </span>
        </div>
      </div>

      {/* Live Audio Visualizer */}
      <div className="w-full max-w-md my-2">
        <LiveAudioWave isListening={isListening} status={status} />
      </div>

      {/* Quick Action Voice Chips */}
      <div className="mt-2 flex flex-wrap gap-2 justify-center max-w-2xl">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => onQuickCommand(language === 'hi' ? p.hi : p.en)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/90 hover:bg-cyan-50 text-[#172033] hover:text-[#16BDE3] border border-[#DDE7F2] hover:border-cyan-300 shadow-2xs transition-all hover:scale-102"
          >
            <Command className="w-3 h-3 text-[#16BDE3]" />
            <span>{language === 'hi' ? p.hi : p.en}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
