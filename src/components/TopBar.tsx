import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Settings, Globe, Download, Wifi, WifiOff, Monitor, Bot, Flame } from 'lucide-react';
import { JarvisStatus, LanguageMode, AppSettings } from '../types';
import { subscribeToAuthState, firebaseConfig } from '../services/firebase';
import type { User } from 'firebase/auth';

interface TopBarProps {
  status: JarvisStatus;
  isListening: boolean;
  onToggleMic: () => void;
  onOpenSettings: () => void;
  onOpenBridge: () => void;
  language: LanguageMode;
  onToggleLanguage: () => void;
  settings: AppSettings;
  isOnline: boolean;
  isAgentConnected?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  status,
  isListening,
  onToggleMic,
  onOpenSettings,
  onOpenBridge,
  language,
  onToggleLanguage,
  settings,
  isOnline,
  isAgentConnected = false,
}) => {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [fbUser, setFbUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((u) => setFbUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setDate(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="h-14 w-full bg-[#F5F8FC]/90 backdrop-blur-md border-b border-[#DDE7F2] flex items-center justify-between px-6 z-30 sticky top-0 shadow-xs">
      {/* Brand & Connection State */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onOpenSettings}>
          <span className="font-black text-xl tracking-wider text-[#172033]">J.A.R.V.I.S.</span>
          <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-cyan-50 text-[#16BDE3] border border-cyan-200">
            v3.0
          </span>
        </div>

        <div className="h-4 w-[1px] bg-[#DDE7F2] hidden md:block"></div>

        {/* Real Live Online Connection status indicators */}
        <div className="hidden md:flex items-center gap-3 text-[10px] font-semibold tracking-wider">
          {/* JARVIS ONLINE */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-[#DDE7F2] shadow-2xs">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-xs shadow-emerald-300' : 'bg-rose-500'}`}></span>
            <span className="text-[#172033] font-bold">{isOnline ? 'JARVIS ONLINE' : 'JARVIS OFFLINE'}</span>
          </div>

          {/* AI CONNECTED */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-[#DDE7F2] shadow-2xs">
            <Bot className="w-3 h-3 text-[#6675F5]" />
            <span className="text-[#172033]">AI CONNECTED</span>
          </div>

          {/* WINDOWS AGENT STATUS */}
          <div
            onClick={onOpenBridge}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border cursor-pointer transition-all shadow-2xs ${
              isAgentConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
            title={isAgentConnected ? 'Windows Agent is actively connected' : 'Click to connect Windows Local Agent'}
          >
            <Monitor className="w-3 h-3" />
            <span className="font-bold">
              {isAgentConnected ? 'WINDOWS AGENT CONNECTED' : 'WINDOWS AGENT OFFLINE'}
            </span>
          </div>

          {/* FIREBASE STATUS */}
          <div
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50/70 border border-amber-200/80 cursor-pointer hover:bg-amber-100/70 transition-all shadow-2xs"
            title={`Firebase connected: ${firebaseConfig.projectId}`}
          >
            <Flame className="w-3 h-3 text-amber-600 fill-amber-500/20" />
            <span className="text-amber-900 font-bold">
              {fbUser ? fbUser.displayName || fbUser.email?.split('@')[0] || 'FB USER' : 'FIREBASE ACTIVE'}
            </span>
          </div>

          {/* MICROPHONE READY */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-[#DDE7F2] shadow-2xs">
            <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-cyan-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            <span className="text-[#172033]">{isListening ? 'MIC ACTIVE' : 'MIC READY'}</span>
          </div>
        </div>
      </div>

      {/* Right Controls & Time */}
      <div className="flex items-center gap-3 sm:gap-4 text-[11px] font-medium text-[#172033]">
        {/* Time & Date Display */}
        <div className="hidden lg:flex flex-col items-end mr-2">
          <span className="text-xs font-bold text-[#172033] font-mono tracking-tight">{time}</span>
          <span className="text-[9px] uppercase tracking-tight font-medium text-slate-500">{date}</span>
        </div>

        {/* Bilingual Language Switcher */}
        <button
          onClick={onToggleLanguage}
          title="Toggle Language: Auto / English / Hindi (द्विभाषी)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#DDE7F2] text-[10px] font-bold uppercase tracking-wider text-[#172033] hover:bg-white transition-all bg-white/80 shadow-2xs"
        >
          <Globe className="w-3 h-3 text-[#16BDE3]" />
          <span>{language === 'auto' ? 'Bilingual' : language === 'hi' ? 'हिंदी' : 'English'}</span>
        </button>

        {/* Windows Companion Bridge Button */}
        <button
          onClick={onOpenBridge}
          title="Windows PC Companion Bridge"
          className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#DDE7F2] text-[10px] font-bold uppercase tracking-wider text-[#16BDE3] bg-cyan-50/70 hover:bg-cyan-100 transition-all shadow-2xs"
        >
          <Download className="w-3 h-3 text-[#16BDE3]" />
          <span>Agent</span>
        </button>

        {/* Voice Active Pill Button */}
        <button
          onClick={onToggleMic}
          className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 ${
            isListening
              ? 'bg-[#16BDE3] text-white ring-2 ring-cyan-300 animate-pulse'
              : 'bg-[#172033] text-white hover:bg-slate-800'
          }`}
        >
          {isListening ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>Listening</span>
            </>
          ) : (
            <>
              <Mic className="w-3 h-3 text-slate-300" />
              <span>Voice PTT</span>
            </>
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          title="JARVIS Settings"
          className="w-8 h-8 rounded-full border border-[#DDE7F2] flex items-center justify-center text-[#172033] hover:bg-white transition-colors bg-white/80 shadow-2xs"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
};

