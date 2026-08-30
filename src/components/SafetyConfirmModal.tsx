import React from 'react';
import { AlertTriangle, ShieldAlert, X, Check } from 'lucide-react';

interface SafetyConfirmModalProps {
  isOpen: boolean;
  toolName: string;
  args: Record<string, any>;
  warningText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SafetyConfirmModal: React.FC<SafetyConfirmModalProps> = ({
  isOpen,
  toolName,
  args,
  warningText,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
      <div className="bg-white rounded-3xl border border-rose-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-5">
        <div className="flex items-center gap-3.5 text-rose-600">
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#172033] font-mono uppercase tracking-tight">
              Confirm Destructive Action
            </h3>
            <span className="text-xs text-rose-600 font-mono font-bold uppercase">
              Action: {toolName}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-mono bg-rose-50/60 p-4 rounded-2xl border border-rose-100">
          {warningText}
        </p>

        {args && Object.keys(args).length > 0 && (
          <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-3 rounded-xl border border-[#DDE7F2] truncate">
            Parameters: {JSON.stringify(args)}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ABORT
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>AUTHORIZE EXECUTION</span>
          </button>
        </div>
      </div>
    </div>
  );
};
