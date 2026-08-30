import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, CheckCircle2, Sparkles, Terminal, Copy, Check } from 'lucide-react';
import Markdown from 'react-markdown';
import { ChatMessage, LanguageMode } from '../types';
import { voiceEngine } from '../services/voice';

interface ConversationPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isListening: boolean;
  onToggleMic: () => void;
  language: LanguageMode;
  isLoading: boolean;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  messages,
  onSendMessage,
  isListening,
  onToggleMic,
  language,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const updateSpeaking = (speaking: boolean) => {
      if (!speaking) setSpeakingId(null);
    };
    voiceEngine.onSpeakingChange = updateSpeaking;
    return () => {
      if (voiceEngine.onSpeakingChange === updateSpeaking) voiceEngine.onSpeakingChange = undefined;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleSpeak = async (id: string, text: string) => {
    if (speakingId === id || voiceEngine.isSpeaking) {
      voiceEngine.stopSpeaking();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(id);
    try {
      await voiceEngine.speak(text, language);
    } finally {
      setSpeakingId((current) => current === id ? null : current);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  };

  return (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-md rounded-3xl p-5 border border-[#DDE7F2] shadow-xs overflow-hidden select-none">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#DDE7F2]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#16BDE3]" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Neural Command & Stream Log</span>
        </div>
        <div className="text-[10px] font-bold font-mono text-[#16BDE3] bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">{messages.length} Events Logged</div>
      </div>

      <div className="flex-1 p-2 overflow-y-auto space-y-3.5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Sparkles className="w-8 h-8 text-[#16BDE3] mb-2 opacity-70" />
            <p className="text-xs font-bold text-[#172033]">JARVIS Standby</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-normal">Speak naturally or type any desktop instruction, automation, or query.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[92%] px-4 py-3 rounded-2xl text-xs leading-relaxed transition-all ${msg.sender === 'user' ? 'bg-[#172033] text-white rounded-tr-none shadow-xs' : 'bg-white text-[#172033] rounded-tl-none border border-[#DDE7F2] shadow-xs'}`}>
                <div className="font-medium prose prose-slate max-w-none text-xs"><Markdown>{msg.text}</Markdown></div>

                {msg.hindiText && msg.sender === 'jarvis' && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-slate-600 text-[11px] font-medium">
                    <span className="font-bold text-[#16BDE3] mr-1">🇮🇳 हिंदी:</span><span>{msg.hindiText}</span>
                  </div>
                )}

                {msg.screenshotUrl && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-[#DDE7F2]"><img src={msg.screenshotUrl} alt="Screen Capture" className="max-h-48 w-full object-cover" /></div>
                )}

                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 pt-2 border-t border-slate-100 font-mono">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1"><Terminal className="w-3 h-3 text-[#16BDE3]" /><span>Executed Subroutines</span></div>
                    {msg.toolCalls.map((tc) => (
                      <div key={tc.id} className="flex items-center justify-between text-[10px] px-2.5 py-1 rounded-lg bg-slate-50 border border-[#DDE7F2] text-[#172033]">
                        <div className="flex items-center gap-1.5 truncate"><CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" /><span className="font-bold text-[#16BDE3]">{tc.name}</span><span className="text-slate-400 text-[9px]">({JSON.stringify(tc.arguments).slice(0, 32)}...)</span></div>
                        <span className={`text-[9px] font-black uppercase ml-2 ${tc.status === 'failed' ? 'text-rose-600' : 'text-emerald-600'}`}>{tc.status === 'failed' ? 'FAILED' : 'DONE'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.sender === 'jarvis' && (
                  <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-end gap-1 text-slate-400">
                    <button onClick={() => handleCopy(msg.id, msg.text)} title="Copy response" className="p-1 rounded-md hover:text-[#172033] hover:bg-slate-100 transition-colors">
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <button onClick={() => void handleSpeak(msg.id, msg.text)} title={speakingId === msg.id ? 'Stop speaking' : 'Read out loud'} className={`p-1 rounded-md hover:bg-cyan-50 transition-colors ${speakingId === msg.id ? 'text-[#16BDE3] bg-cyan-50' : 'hover:text-[#16BDE3]'}`}>
                      {speakingId === msg.id ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>
              <span className={`text-[9px] text-slate-400 mt-1 uppercase font-mono ${msg.sender === 'user' ? 'mr-1' : 'ml-1'}`}>{msg.timestamp}</span>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2.5 border border-[#DDE7F2] shadow-xs flex items-center gap-2.5">
              <div className="flex gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#16BDE3] animate-bounce" /><span className="w-1.5 h-1.5 rounded-full bg-[#6675F5] animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 rounded-full bg-[#172033] animate-bounce" style={{ animationDelay: '300ms' }} /></div>
              <span className="text-[11px] font-bold text-slate-500 font-mono">Neural processing stream...</span>
            </div>
            <span className="text-[9px] text-slate-400 mt-1 ml-1 font-mono uppercase">LIVE</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={language === 'hi' ? 'कमांड लिखें (उदा. क्रोम खोलो, स्क्रीनशॉट लो)...' : 'Enter instruction or ask JARVIS anything...'} className="flex-1 bg-slate-50 border border-[#DDE7F2] rounded-xl px-4 py-2.5 text-xs text-[#172033] placeholder-slate-400 focus:outline-hidden focus:border-[#16BDE3] focus:bg-white transition-all shadow-inner font-medium" />
        <button type="button" onClick={onToggleMic} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-[#16BDE3] text-white ring-2 ring-cyan-300 animate-pulse' : 'bg-white border border-[#DDE7F2] text-slate-400 hover:text-[#172033] hover:bg-slate-50'}`} title={isListening ? 'Stop listening' : 'Voice Input'}>
          {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>
        <button type="submit" disabled={!inputText.trim() || isLoading} className="bg-[#172033] text-white w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-slate-800 transition-all shadow-xs"><Send className="w-4 h-4" /></button>
      </form>
    </div>
  );
};