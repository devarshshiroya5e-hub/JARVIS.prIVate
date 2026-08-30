import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Cpu, ShieldCheck } from 'lucide-react';

interface StartupSequenceModalProps {
  onComplete: () => void;
}

export const StartupSequenceModal: React.FC<StartupSequenceModalProps> = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    'INITIALIZING JARVIS OS KERNEL v2.4...',
    'CONNECTING TO SERVER-SIDE NEURAL REASONING CORES...',
    'ESTABLISHING WINDOWS HARDWARE I/O CHANNELS...',
    'CALIBRATING DUAL-LANGUAGE VOICE ENGINE (EN/HI)...',
    'MOUNTING PERSISTENT WORKSPACE & FILE SYSTEM...',
    'ALL SYSTEMS ONLINE. STANDING BY FOR USER COMMAND.',
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(timer);
          setTimeout(onComplete, 800);
          return prev;
        }
      });
    }, 450);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-xl select-none">
      <div className="max-w-md w-full p-8 text-center space-y-6">
        {/* Futuristic Glowing AI Hexagon/Orb */}
        <div className="relative flex items-center justify-center w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400 animate-[spin_6s_linear_infinite]" />
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center text-white shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-widest text-white font-mono">
            J.A.R.V.I.S.
          </h2>
          <span className="text-[11px] font-mono text-cyan-400 tracking-wider">
            PERSONAL AI DESKTOP ASSISTANT
          </span>
        </div>

        {/* Boot Sequence List */}
        <div className="space-y-2 text-left font-mono text-xs bg-slate-950/80 p-4 rounded-2xl border border-cyan-500/30 text-slate-300">
          {steps.slice(0, stepIndex + 1).map((st, i) => (
            <div key={i} className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className={i === stepIndex ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
                {st}
              </span>
            </div>
          ))}
        </div>

        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-400 to-sky-400 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
