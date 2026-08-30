import React, { useState } from 'react';
import {
  Zap,
  Play,
  CheckCircle2,
  Plus,
  Clock,
  Code2,
  Briefcase,
  Headphones,
  Activity,
  ChevronRight,
  Shield,
  Sparkles,
} from 'lucide-react';
import { AutomationRoutine, AutomationStep } from '../types';

interface AutomationsViewProps {
  routines: AutomationRoutine[];
  onExecuteRoutine: (id: string) => void;
  onCreateRoutine: (routine: Partial<AutomationRoutine>) => void;
  isExecutingId: string | null;
}

export const AutomationsView: React.FC<AutomationsViewProps> = ({
  routines,
  onExecuteRoutine,
  onCreateRoutine,
  isExecutingId,
}) => {
  const [showBuilder, setShowBuilder] = useState(false);
  const [name, setName] = useState('');
  const [nameHindi, setNameHindi] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'work' | 'coding' | 'media' | 'system' | 'custom'>('custom');
  const [steps, setSteps] = useState<AutomationStep[]>([
    { id: '1', toolName: 'open_application', args: { appName: 'chrome' }, description: 'Launch Google Chrome' },
  ]);

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        id: String(Date.now()),
        toolName: 'open_url',
        args: { url: 'https://github.com' },
        description: 'Open Target URL in browser',
      },
    ]);
  };

  const handleSaveRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || steps.length === 0) return;
    onCreateRoutine({
      name,
      nameHindi,
      description,
      category,
      iconName: 'Zap',
      enabled: true,
      steps,
    });
    setName('');
    setNameHindi('');
    setDescription('');
    setShowBuilder(false);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'work':
        return Briefcase;
      case 'coding':
        return Code2;
      case 'media':
        return Headphones;
      case 'system':
        return Activity;
      default:
        return Zap;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-[#DDE7F2] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#16BDE3]" />
            <h2 className="text-lg font-black tracking-tight text-[#172033] uppercase">
              Automated Workflows & Multi-Step Macro Routines
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chain multiple OS actions, browser sessions, applications, and diagnostics into single automated macros.
          </p>
        </div>

        <button
          onClick={() => setShowBuilder(!showBuilder)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#172033] hover:bg-slate-800 text-white text-xs font-bold font-mono transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{showBuilder ? 'CLOSE BUILDER' : 'CREATE ROUTINE'}</span>
        </button>
      </div>

      {/* Routine Builder Modal/Form */}
      {showBuilder && (
        <form onSubmit={handleSaveRoutine} className="p-6 rounded-3xl bg-white/95 border-2 border-cyan-200 shadow-md space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#16BDE3]" />
            <h3 className="text-xs font-bold text-[#172033] font-mono uppercase tracking-wider">
              Workflow Routine Sequence Creator
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Routine Name (English) e.g. Start Work Morning"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#16BDE3] bg-slate-50 text-[#172033]"
              required
            />
            <input
              type="text"
              placeholder="Routine Name (Hindi) e.g. काम शुरू करें"
              value={nameHindi}
              onChange={(e) => setNameHindi(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#16BDE3] bg-slate-50 text-[#172033]"
            />
          </div>

          <input
            type="text"
            placeholder="Description of what this routine executes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#16BDE3] bg-slate-50 text-[#172033]"
          />

          {/* Steps */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#172033] font-mono">AUTOMATION ACTION STEPS:</span>
              <button
                type="button"
                onClick={handleAddStep}
                className="text-xs text-[#16BDE3] hover:text-cyan-800 font-bold font-mono"
              >
                + Add Step
              </button>
            </div>

            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-[#DDE7F2] text-xs font-mono">
                <span className="w-5 h-5 rounded-full bg-cyan-100 text-[#16BDE3] flex items-center justify-center font-bold text-[10px]">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={step.description}
                  onChange={(e) => {
                    const copy = [...steps];
                    copy[idx].description = e.target.value;
                    setSteps(copy);
                  }}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-[#DDE7F2] bg-white text-[#172033]"
                  placeholder="Step description"
                />
                <select
                  value={step.toolName}
                  onChange={(e) => {
                    const copy = [...steps];
                    copy[idx].toolName = e.target.value;
                    setSteps(copy);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-[#DDE7F2] bg-white text-[#172033]"
                >
                  <option value="open_application">open_application</option>
                  <option value="open_url">open_url</option>
                  <option value="press_key">press_key</option>
                  <option value="search_web">search_web</option>
                  <option value="take_screenshot">take_screenshot</option>
                  <option value="get_system_metrics">get_system_metrics</option>
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowBuilder(false)}
              className="px-4 py-2 rounded-xl text-xs font-mono text-slate-500 hover:bg-slate-100"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#16BDE3] hover:bg-cyan-600 text-white text-xs font-mono font-bold shadow-xs"
            >
              SAVE ROUTINE
            </button>
          </div>
        </form>
      )}

      {/* Routines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {routines.map((routine) => {
          const Icon = getCategoryIcon(routine.category);
          const isRunning = isExecutingId === routine.id;

          return (
            <div
              key={routine.id}
              className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] hover:border-cyan-300 shadow-xs transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-cyan-50 border border-cyan-200 text-[#16BDE3]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#172033]">{routine.name}</h3>
                      {routine.nameHindi && (
                        <span className="text-xs text-slate-500 font-medium">{routine.nameHindi}</span>
                      )}
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase bg-slate-100 text-slate-600 border border-slate-200">
                    {routine.steps.length} STEPS
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{routine.description}</p>

                {/* Steps preview list */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  {routine.steps.map((st, i) => (
                    <div key={st.id} className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[9px]">
                        {i + 1}
                      </span>
                      <span className="truncate">{st.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400 text-[11px]">Direct execution sequence</span>
                <button
                  onClick={() => onExecuteRoutine(routine.id)}
                  disabled={isRunning}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#172033] hover:bg-slate-800 text-white font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                  <span>{isRunning ? 'RUNNING...' : 'EXECUTE'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
