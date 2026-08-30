import React, { useState } from 'react';
import {
  Grid,
  Play,
  XCircle,
  Plus,
  Compass,
  Code2,
  FileText,
  Music,
  MessageCircle,
  Folder,
  Calculator,
  Terminal,
  Search,
  CheckCircle2,
} from 'lucide-react';

interface ApplicationsViewProps {
  onLaunchApp: (appName: string) => void;
  onCloseApp: (processName: string) => void;
  appPaths: Record<string, string>;
  onSaveAppPath: (name: string, path: string) => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  onLaunchApp,
  onCloseApp,
  appPaths,
  onSaveAppPath,
}) => {
  const [customName, setCustomName] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [searchApp, setSearchApp] = useState('');

  const defaultApps = [
    {
      id: 'chrome',
      name: 'Google Chrome',
      desc: 'Web Browser',
      icon: Compass,
      cmd: 'chrome',
      proc: 'chrome.exe',
      color: 'text-amber-500 bg-amber-50 border-amber-200',
    },
    {
      id: 'code',
      name: 'Visual Studio Code',
      desc: 'Code Editor',
      icon: Code2,
      cmd: 'code',
      proc: 'code.exe',
      color: 'text-sky-500 bg-sky-50 border-sky-200',
    },
    {
      id: 'notepad',
      name: 'Notepad',
      desc: 'Text Editor',
      icon: FileText,
      cmd: 'notepad',
      proc: 'notepad.exe',
      color: 'text-[#16BDE3] bg-cyan-50 border-cyan-200',
    },
    {
      id: 'calc',
      name: 'Calculator',
      desc: 'Windows Calculator',
      icon: Calculator,
      cmd: 'calc',
      proc: 'CalculatorApp.exe',
      color: 'text-[#6675F5] bg-indigo-50 border-indigo-200',
    },
    {
      id: 'explorer',
      name: 'File Explorer',
      desc: 'Windows File Manager',
      icon: Folder,
      cmd: 'explorer',
      proc: 'explorer.exe',
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      id: 'terminal',
      name: 'Windows Terminal / CMD',
      desc: 'Command Prompt',
      icon: Terminal,
      cmd: 'terminal',
      proc: 'WindowsTerminal.exe',
      color: 'text-slate-800 bg-slate-100 border-slate-200',
    },
    {
      id: 'spotify',
      name: 'Spotify',
      desc: 'Music & Audio',
      icon: Music,
      cmd: 'spotify',
      proc: 'Spotify.exe',
      color: 'text-emerald-500 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'discord',
      name: 'Discord',
      desc: 'Chat & Community',
      icon: MessageCircle,
      cmd: 'discord',
      proc: 'Discord.exe',
      color: 'text-purple-500 bg-purple-50 border-purple-200',
    },
  ];

  const filteredApps = defaultApps.filter((a) =>
    a.name.toLowerCase().includes(searchApp.toLowerCase()) ||
    a.desc.toLowerCase().includes(searchApp.toLowerCase())
  );

  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customPath) return;
    onSaveAppPath(customName, customPath);
    setCustomName('');
    setCustomPath('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-[#DDE7F2] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Grid className="w-5 h-5 text-[#16BDE3]" />
            <h2 className="text-lg font-black tracking-tight text-[#172033] uppercase">
              Application Matrix & Process Controller
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            One-click launch and terminate Windows programs or configure custom executable binary paths.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchApp}
            onChange={(e) => setSearchApp(e.target.value)}
            placeholder="Search applications..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#DDE7F2] rounded-xl text-xs text-[#172033] placeholder-slate-400 focus:outline-hidden focus:border-[#16BDE3] focus:bg-white"
          />
        </div>
      </div>

      {/* Applications Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredApps.map((app) => {
          const Icon = app.icon;
          return (
            <div
              key={app.id}
              className="p-5 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] hover:border-cyan-300 shadow-xs transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-2xl border ${app.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#172033]">{app.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">{app.desc}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 font-mono text-xs">
                <button
                  onClick={() => onLaunchApp(app.cmd)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-[#16BDE3] font-bold border border-cyan-200 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Launch</span>
                </button>
                <button
                  onClick={() => onCloseApp(app.proc)}
                  title="Close Application Process"
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Executable Paths */}
      <div className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#16BDE3]" />
          <h3 className="text-xs font-bold text-[#172033] font-mono uppercase tracking-wider">
            Register Custom Application Binary
          </h3>
        </div>

        <form onSubmit={handleAddCustomApp} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Application Name (e.g. Blender, Unreal Engine)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#16BDE3] bg-slate-50 text-[#172033]"
          />
          <input
            type="text"
            placeholder="Executable Path (e.g. C:\Program Files\Blender\blender.exe)"
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#16BDE3] bg-slate-50 text-[#172033]"
          />
          <button
            type="submit"
            disabled={!customName || !customPath}
            className="px-5 py-2.5 rounded-xl bg-[#172033] hover:bg-slate-800 text-white text-xs font-bold font-mono transition-colors disabled:opacity-40 shadow-xs"
          >
            REGISTER APP
          </button>
        </form>

        {Object.keys(appPaths).length > 0 && (
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              Configured Custom Launchers
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(appPaths).map(([name, path]) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-[#DDE7F2] text-xs font-mono"
                >
                  <div className="truncate">
                    <span className="font-bold text-[#172033] block">{name}</span>
                    <span className="text-[10px] text-slate-400 truncate block">{path}</span>
                  </div>
                  <button
                    onClick={() => onLaunchApp(path)}
                    className="p-2 rounded-xl bg-cyan-50 text-[#16BDE3] border border-cyan-200 hover:bg-cyan-100 ml-2"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
