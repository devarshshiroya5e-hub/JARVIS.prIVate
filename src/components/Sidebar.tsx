import React from 'react';
import {
  Home,
  MessageSquare,
  Sliders,
  Grid,
  FolderTree,
  Compass,
  Zap,
  Database,
  Search,
  Eye,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Cpu,
  HardDrive,
} from 'lucide-react';
import { SystemMetrics } from '../types';

export type TabType =
  | 'home'
  | 'conversations'
  | 'pc_control'
  | 'applications'
  | 'files'
  | 'browser'
  | 'automations'
  | 'memory'
  | 'research'
  | 'vision'
  | 'system'
  | 'settings';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  metrics?: SystemMetrics | null;
  isAgentConnected?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  metrics,
  isAgentConnected = false,
}) => {
  const menuItems: { id: TabType; label: string; hindiLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Neural Cockpit', hindiLabel: 'कॉकपिट', icon: Home },
    { id: 'conversations', label: 'Voice & Chat', hindiLabel: 'संवाद', icon: MessageSquare },
    { id: 'pc_control', label: 'PC Remote', hindiLabel: 'पीसी कंट्रोल', icon: Sliders },
    { id: 'applications', label: 'Applications', hindiLabel: 'एप्लिकेशन्स', icon: Grid },
    { id: 'files', label: 'File System', hindiLabel: 'फ़ाइलें', icon: FolderTree },
    { id: 'browser', label: 'Browser Bot', hindiLabel: 'ब्राउज़र', icon: Compass },
    { id: 'automations', label: 'Automations', hindiLabel: 'रूटीन्स', icon: Zap },
    { id: 'memory', label: 'Neural Memory', hindiLabel: 'मेमोरी', icon: Database },
    { id: 'research', label: 'Deep Research', hindiLabel: 'रिसर्च', icon: Search },
    { id: 'vision', label: 'Screen Vision', hindiLabel: 'स्क्रीन विजन', icon: Eye },
    { id: 'system', label: 'Diagnostics', hindiLabel: 'डायग्नोस्टिक्स', icon: Activity },
    { id: 'settings', label: 'System Config', hindiLabel: 'सेटिंग्स', icon: Settings },
  ];

  return (
    <aside
      className={`h-[calc(100vh-3.5rem)] bg-[#F5F8FC]/95 backdrop-blur-xl border-r border-[#DDE7F2] transition-all duration-300 flex flex-col justify-between z-20 select-none ${
        isCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Navigation List */}
      <div className="p-2.5 space-y-1 overflow-y-auto flex-1">
        {!isCollapsed && (
          <div className="px-2.5 pt-1.5 pb-1 text-[9px] font-bold tracking-[0.22em] text-slate-400 uppercase font-mono">
            Command Modules
          </div>
        )}
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={`${item.label} (${item.hindiLabel})`}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-all duration-200 group relative ${
                isActive
                  ? 'bg-white text-[#172033] font-bold border border-[#DDE7F2] shadow-xs shadow-cyan-500/5'
                  : 'text-slate-600 hover:text-[#172033] hover:bg-white/80 border border-transparent font-medium'
              }`}
            >
              {/* Active neon accent pill */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#16BDE3] shadow-xs shadow-cyan-300" />
              )}
              <div
                className={`p-1 rounded-lg transition-colors ${
                  isActive ? 'bg-cyan-50 text-[#16BDE3]' : 'text-slate-400 group-hover:text-[#172033]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col items-start leading-tight truncate">
                  <span className="tracking-tight text-xs font-semibold">{item.label}</span>
                  <span className="text-[9px] text-slate-400 font-normal">{item.hindiLabel}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mini Telemetry Gauges in expanded sidebar */}
      {!isCollapsed && metrics && (
        <div className="mx-2.5 mb-2 p-2.5 rounded-xl bg-white/80 border border-[#DDE7F2] space-y-2 shadow-2xs font-mono text-[10px]">
          <div className="flex items-center justify-between text-slate-400 text-[9px] font-bold uppercase tracking-wider">
            <span>Hardware Load</span>
            <span className={isAgentConnected ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
              {isAgentConnected ? 'AGENT LIVE' : 'HOST LIVE'}
            </span>
          </div>
          {/* CPU Bar */}
          <div>
            <div className="flex justify-between text-slate-600 mb-0.5 font-medium">
              <span>CPU</span>
              <span className="font-bold text-[#172033]">{metrics.cpuUsage}%</span>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#16BDE3] transition-all duration-300"
                style={{ width: `${Math.min(metrics.cpuUsage, 100)}%` }}
              />
            </div>
          </div>
          {/* RAM Bar */}
          <div>
            <div className="flex justify-between text-slate-600 mb-0.5 font-medium">
              <span>RAM</span>
              <span className="font-bold text-[#172033]">{metrics.ramUsagePercent}%</span>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#6675F5] transition-all duration-300"
                style={{ width: `${Math.min(metrics.ramUsagePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer / Collapse Toggle */}
      <div className="p-2 border-t border-[#DDE7F2] flex items-center justify-between bg-white/40">
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 text-[9px] text-slate-500 px-2 font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16BDE3] animate-ping" />
            <span>JARVIS CORE 3.0</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-[#172033] hover:bg-white transition-colors mx-auto border border-transparent hover:border-[#DDE7F2]"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
