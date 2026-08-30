import React, { useState } from 'react';
import {
  Keyboard,
  MousePointer,
  Lock,
  Moon,
  RotateCcw,
  Power,
  Terminal,
  Play,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  Minimize2,
  Sparkles,
  Sliders,
  Radio,
} from 'lucide-react';

interface PcControlViewProps {
  onExecuteTool: (toolName: string, args: Record<string, any>) => void;
  onRequestDangerousAction: (toolName: string, args: Record<string, any>, warningText: string) => void;
}

export const PcControlView: React.FC<PcControlViewProps> = ({ onExecuteTool, onRequestDangerousAction }) => {
  const [typedText, setTypedText] = useState('');
  const [terminalCmd, setTerminalCmd] = useState('');
  const [pythonCode, setPythonCode] = useState('import os\nprint("JARVIS Python Engine Running:", os.name)');
  const [commandOutput, setCommandOutput] = useState<string | null>(null);
  const [trackpadCoords, setTrackpadCoords] = useState({ x: 50, y: 50 });

  const handleTypeText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedText) return;
    onExecuteTool('type_text', { text: typedText });
    setTypedText('');
  };

  const handleRunCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalCmd) return;
    onExecuteTool('run_command', { command: terminalCmd });
    setCommandOutput(`Executed: ${terminalCmd}`);
    setTerminalCmd('');
  };

  const handleRunPython = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pythonCode) return;
    onExecuteTool('run_python_script', { scriptCode: pythonCode });
  };

  const handleTrackpadMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setTrackpadCoords({ x, y });
  };

  const hotkeys = [
    { label: 'Task Manager', keys: 'Ctrl+Shift+Esc' },
    { label: 'Show Desktop', keys: 'Win+D' },
    { label: 'File Explorer', keys: 'Win+E' },
    { label: 'Switch Window', keys: 'Alt+Tab' },
    { label: 'Copy Selection', keys: 'Ctrl+C' },
    { label: 'Paste Clipboard', keys: 'Ctrl+V' },
    { label: 'Select All', keys: 'Ctrl+A' },
    { label: 'Undo Action', keys: 'Ctrl+Z' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-[#DDE7F2] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#16BDE3]" />
            <h2 className="text-lg font-black tracking-tight text-[#172033] uppercase">
              Windows PC Remote Command & Hardware Console
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Simulate native keyboard inputs, mouse trackpad navigation, hotkeys, audio mixer, and system power states.
          </p>
        </div>
      </div>

      {/* Grid: Keyboard Simulator & Virtual Trackpad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Keyboard Text Simulator */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-[#16BDE3]" />
              <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider font-mono">
                Active Window Typing
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">pyautogui stream</span>
          </div>

          <form onSubmit={handleTypeText} className="space-y-3">
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="Enter text string to stream-type into active window..."
              className="w-full px-4 py-3 rounded-2xl border border-[#DDE7F2] text-xs font-mono text-[#172033] placeholder-slate-400 focus:outline-hidden focus:border-[#16BDE3] bg-slate-50 focus:bg-white shadow-inner"
            />
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-400 font-mono">Simulates physical keystrokes</span>
              <button
                type="submit"
                disabled={!typedText}
                className="px-5 py-2.5 rounded-xl bg-[#172033] hover:bg-slate-800 text-white text-xs font-bold font-mono transition-all disabled:opacity-40 shadow-xs"
              >
                STREAM TYPE
              </button>
            </div>
          </form>

          {/* Quick Media & Window Controls */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 font-mono block mb-2 uppercase tracking-wider">
              Audio & Window Controls
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onExecuteTool('press_key', { key: 'VolumeUp' })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-cyan-50 border border-[#DDE7F2] text-slate-700 text-xs font-mono transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5 text-[#16BDE3]" />
                <span>Volume +</span>
              </button>
              <button
                onClick={() => onExecuteTool('press_key', { key: 'VolumeDown' })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-cyan-50 border border-[#DDE7F2] text-slate-700 text-xs font-mono transition-colors"
              >
                <Volume1 className="w-3.5 h-3.5 text-[#16BDE3]" />
                <span>Volume -</span>
              </button>
              <button
                onClick={() => onExecuteTool('press_key', { key: 'VolumeMute' })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-rose-50 border border-[#DDE7F2] text-slate-700 text-xs font-mono transition-colors"
              >
                <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                <span>Mute</span>
              </button>
              <button
                onClick={() => onExecuteTool('press_key', { key: 'MediaPlayPause' })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-[#DDE7F2] text-slate-700 text-xs font-mono transition-colors"
              >
                <Play className="w-3.5 h-3.5 text-[#6675F5]" />
                <span>Play / Pause</span>
              </button>
              <button
                onClick={() => onExecuteTool('keyboard_shortcut', { keys: 'Win+Down' })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-[#DDE7F2] text-slate-700 text-xs font-mono transition-colors"
              >
                <Minimize2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Minimize</span>
              </button>
              <button
                onClick={() => onExecuteTool('keyboard_shortcut', { keys: 'Win+Up' })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-[#DDE7F2] text-slate-700 text-xs font-mono transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Maximize</span>
              </button>
            </div>
          </div>
        </div>

        {/* Virtual Mouse Trackpad */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-[#16BDE3]" />
              <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider font-mono">
                Virtual Mouse Trackpad
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#16BDE3]">
              X:{trackpadCoords.x}% Y:{trackpadCoords.y}%
            </span>
          </div>

          <div
            onMouseMove={handleTrackpadMove}
            onClick={() => onExecuteTool('click_mouse', { button: 'left' })}
            className="w-full h-36 rounded-2xl bg-slate-100 border-2 border-dashed border-[#DDE7F2] hover:border-cyan-400 cursor-crosshair relative flex items-center justify-center transition-all select-none group"
          >
            <div
              className="w-4 h-4 rounded-full bg-[#16BDE3] shadow-md shadow-cyan-300 absolute pointer-events-none transition-all duration-75"
              style={{ left: `${trackpadCoords.x}%`, top: `${trackpadCoords.y}%` }}
            />
            <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-slate-600">
              CLICK OR DRAG CURSOR
            </span>
          </div>

          {/* Mouse Button Controls */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onExecuteTool('click_mouse', { button: 'left' })}
              className="py-2.5 rounded-xl bg-slate-50 hover:bg-cyan-50 border border-[#DDE7F2] text-xs font-bold text-[#172033] font-mono transition-colors"
            >
              Left Click
            </button>
            <button
              onClick={() => onExecuteTool('click_mouse', { button: 'middle' })}
              className="py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-[#DDE7F2] text-xs font-bold text-[#172033] font-mono transition-colors"
            >
              Scroll / Mid
            </button>
            <button
              onClick={() => onExecuteTool('click_mouse', { button: 'right' })}
              className="py-2.5 rounded-xl bg-slate-50 hover:bg-cyan-50 border border-[#DDE7F2] text-xs font-bold text-[#172033] font-mono transition-colors"
            >
              Right Click
            </button>
          </div>
        </div>
      </div>

      {/* Shortcuts Grid */}
      <div className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#16BDE3]" />
          <h3 className="text-xs font-bold text-[#172033] font-mono uppercase tracking-wider">
            One-Click Windows Shortcuts
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {hotkeys.map((hk, idx) => (
            <button
              key={idx}
              onClick={() => onExecuteTool('keyboard_shortcut', { keys: hk.keys })}
              className="flex flex-col p-3 rounded-2xl bg-slate-50/80 hover:bg-cyan-50/60 border border-[#DDE7F2] hover:border-cyan-300 transition-all text-left group"
            >
              <span className="text-xs font-semibold text-[#172033]">{hk.label}</span>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 mt-2 rounded-md bg-white text-[#16BDE3] border border-[#DDE7F2] w-fit shadow-2xs">
                {hk.keys}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Command Runner & Python Runner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Terminal Shell */}
        <div className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#16BDE3]" />
            <h3 className="text-xs font-bold text-[#172033] font-mono uppercase tracking-wider">
              PowerShell / CMD Shell Runner
            </h3>
          </div>

          <form onSubmit={handleRunCommand} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={terminalCmd}
                onChange={(e) => setTerminalCmd(e.target.value)}
                placeholder="dir, ping 1.1.1.1, git status..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#16BDE3] bg-slate-50 text-[#172033]"
              />
              <button
                type="submit"
                disabled={!terminalCmd}
                className="px-5 py-2.5 rounded-xl bg-[#172033] hover:bg-slate-800 text-white text-xs font-mono font-bold transition-colors disabled:opacity-40 shadow-xs"
              >
                RUN
              </button>
            </div>
          </form>

          {commandOutput && (
            <div className="p-3 rounded-2xl bg-slate-900 text-cyan-400 font-mono text-xs overflow-x-auto max-h-36 shadow-inner">
              {commandOutput}
            </div>
          )}
        </div>

        {/* Python Script Engine */}
        <div className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#6675F5]" />
            <h3 className="text-xs font-bold text-[#172033] font-mono uppercase tracking-wider">
              Python Automation Runtime
            </h3>
          </div>

          <form onSubmit={handleRunPython} className="space-y-2">
            <textarea
              rows={3}
              value={pythonCode}
              onChange={(e) => setPythonCode(e.target.value)}
              className="w-full p-3 rounded-2xl border border-slate-800 text-xs font-mono focus:outline-hidden focus:border-indigo-400 bg-slate-900 text-emerald-400 shadow-inner"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#6675F5] hover:bg-indigo-600 text-white text-xs font-mono font-bold transition-colors shadow-xs"
              >
                EXECUTE SCRIPT
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Windows Power & System State Operations */}
      <div className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs">
        <h3 className="text-xs font-bold text-[#172033] font-mono mb-4 flex items-center gap-2 uppercase tracking-wider">
          <Power className="w-4 h-4 text-rose-500" />
          <span>System Power Operations</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => onExecuteTool('lock_pc', {})}
            className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-cyan-50 border border-[#DDE7F2] hover:border-cyan-300 transition-all text-left group"
          >
            <div className="p-2.5 rounded-xl bg-cyan-100 text-[#16BDE3]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#172033] block">Lock Workstation</span>
              <span className="text-[10px] text-slate-400 font-mono">Immediate Lock</span>
            </div>
          </button>

          <button
            onClick={() =>
              onRequestDangerousAction(
                'sleep_pc',
                {},
                'Putting the PC to sleep will suspend active applications until wake.'
              )
            }
            className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-sky-50 border border-[#DDE7F2] hover:border-sky-300 transition-all text-left group"
          >
            <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#172033] block">Sleep PC</span>
              <span className="text-[10px] text-amber-600 font-mono">Requires Confirm</span>
            </div>
          </button>

          <button
            onClick={() =>
              onRequestDangerousAction(
                'restart_pc',
                {},
                'Restarting will reboot your Windows PC. All unsaved work will be lost.'
              )
            }
            className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-[#DDE7F2] hover:border-amber-300 transition-all text-left group"
          >
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#172033] block">Restart PC</span>
              <span className="text-[10px] text-rose-600 font-mono font-bold">Always Confirm</span>
            </div>
          </button>

          <button
            onClick={() =>
              onRequestDangerousAction(
                'shutdown_pc',
                {},
                'Shutting down will immediately power off your computer.'
              )
            }
            className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-rose-50 border border-[#DDE7F2] hover:border-rose-300 transition-all text-left group"
          >
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
              <Power className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#172033] block">Shutdown PC</span>
              <span className="text-[10px] text-rose-600 font-mono font-bold">Always Confirm</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
