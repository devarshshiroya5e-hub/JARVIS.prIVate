import React, { useState, useEffect } from 'react';
import { X, Download, Copy, Check, Terminal, ShieldCheck, Sparkles, ExternalLink, Cpu } from 'lucide-react';
import { api } from '../services/api';

interface WindowsBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WindowsBridgeModal: React.FC<WindowsBridgeModalProps> = ({ isOpen, onClose }) => {
  const [scriptCode, setScriptCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'code'>('quick');

  useEffect(() => {
    if (isOpen) {
      api.getBridgeScript().then((res) => {
        setScriptCode(res.script);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([scriptCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jarvis_windows_bridge.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
      <div className="bg-white rounded-3xl border border-[#DDE7F2] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#DDE7F2] flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-100/70 text-[#16BDE3] border border-cyan-200">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#172033] font-mono uppercase tracking-wider">
                Windows PC Native Companion Bridge
              </h3>
              <p className="text-xs text-slate-500">
                Unlock full native control over your local Windows hardware, mouse & applications.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-[#172033] hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#DDE7F2] px-6 pt-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('quick')}
            className={`pb-3 px-4 font-bold transition-colors border-b-2 ${
              activeTab === 'quick' ? 'border-[#16BDE3] text-[#16BDE3]' : 'border-transparent text-slate-400'
            }`}
          >
            Quick Setup (3 Steps)
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`pb-3 px-4 font-bold transition-colors border-b-2 ${
              activeTab === 'code' ? 'border-[#16BDE3] text-[#16BDE3]' : 'border-transparent text-slate-400'
            }`}
          >
            Bridge Python Script
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono">
          {activeTab === 'quick' ? (
            <div className="space-y-4 text-slate-700">
              <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#16BDE3] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#172033] block mb-1">Dual Execution Architecture</span>
                  <span className="text-[11px] text-slate-600 leading-relaxed block">
                    JARVIS is currently running directly in your web sandbox. To grant JARVIS direct hardware control over your host Windows machine (your real cursor, keyboard, and Windows programs), run the lightweight Python bridge below.
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-[#DDE7F2] space-y-1.5">
                  <span className="font-bold text-[#172033] block text-xs">Step 1: Install Python prerequisites</span>
                  <code className="block bg-[#172033] text-cyan-300 p-3 rounded-xl text-[11px]">
                    pip install pyautogui psutil requests pillow
                  </code>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-[#DDE7F2] space-y-2">
                  <span className="font-bold text-[#172033] block text-xs">Step 2: Download the Companion Script</span>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#172033] hover:bg-slate-800 text-white font-bold transition-colors shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download jarvis_windows_bridge.py</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-[#DDE7F2] space-y-1.5">
                  <span className="font-bold text-[#172033] block text-xs">Step 3: Run the bridge on Windows</span>
                  <code className="block bg-[#172033] text-cyan-300 p-3 rounded-xl text-[11px]">
                    python jarvis_windows_bridge.py
                  </code>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Native Windows Companion Agent Code</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#172033] font-bold"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#172033] hover:bg-slate-800 text-white font-bold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
              <pre className="p-4 rounded-2xl bg-[#0e1626] text-cyan-300 overflow-x-auto text-[11px] max-h-80 font-mono leading-relaxed border border-slate-800">
                {scriptCode}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#DDE7F2] bg-slate-50/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#172033] hover:bg-slate-800 text-white text-xs font-bold font-mono transition-colors shadow-2xs"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
