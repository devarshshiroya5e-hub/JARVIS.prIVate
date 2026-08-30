import React from 'react';
import {
  Cpu,
  HardDrive,
  Activity,
  Wifi,
  Battery,
  Layers,
  Thermometer,
  AppWindow,
  Monitor,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { SystemMetrics } from '../types';

interface DashboardViewProps {
  metrics: SystemMetrics | null;
  onRefresh: () => void;
  onKillProcess: (procName: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ metrics, onRefresh, onKillProcess }) => {
  if (!metrics) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-3 bg-white/70 rounded-2xl border border-[#DDE7F2] p-8">
        <RefreshCw className="w-8 h-8 text-[#16BDE3] animate-spin" />
        <span className="text-sm font-semibold text-[#172033]/70 font-mono">Synchronizing hardware metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid matching Futuristic Light theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Usage Card */}
        <div className="bg-white/80 backdrop-blur-md border border-[#DDE7F2] rounded-2xl p-4 flex flex-col justify-between hover:border-[#16BDE3]/80 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CPU Usage</span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">{metrics.cpuCores} Cores</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-[#172033] font-sans tracking-tight">
              {metrics.cpuUsage}<span className="text-sm font-normal text-slate-400 ml-0.5">%</span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#16BDE3] transition-all duration-500 rounded-full"
              style={{ width: `${metrics.cpuUsage}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 mt-2 truncate font-mono">
            {metrics.cpuModel.split('@')[0]}
          </div>
        </div>

        {/* Memory / RAM Card */}
        <div className="bg-white/80 backdrop-blur-md border border-[#DDE7F2] rounded-2xl p-4 flex flex-col justify-between hover:border-[#6675F5]/80 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Memory (RAM)</span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">{metrics.ramUsagePercent}%</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-[#172033] font-sans tracking-tight">
              {(metrics.ramUsed / (1024 ** 3)).toFixed(1)}<span className="text-sm font-normal text-slate-400 ml-0.5">GB</span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#6675F5] transition-all duration-500 rounded-full"
              style={{ width: `${metrics.ramUsagePercent}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-mono">
            Total: {(metrics.ramTotal / (1024 ** 3)).toFixed(1)} GB
          </div>
        </div>

        {/* Disk (C:) Card */}
        <div className="bg-white/80 backdrop-blur-md border border-[#DDE7F2] rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-300 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Disk (C:)</span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">{metrics.diskUsagePercent}%</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-[#172033] font-sans tracking-tight">
              {(metrics.diskUsed / (1024 ** 3)).toFixed(0)}<span className="text-sm font-normal text-slate-400 ml-0.5">GB</span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
              style={{ width: `${metrics.diskUsagePercent}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-mono">
            Capacity: {(metrics.diskTotal / (1024 ** 3)).toFixed(0)} GB
          </div>
        </div>

        {/* Network & Transfer Card */}
        <div className="bg-white/80 backdrop-blur-md border border-[#DDE7F2] rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-300 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Network</span>
            <span className="text-[10px] font-bold text-emerald-600 uppercase">Live</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-[#172033] font-sans tracking-tight">
              {(metrics.networkDownloadSpeed / 1024).toFixed(1)}<span className="text-sm font-normal text-slate-400 ml-0.5 uppercase">MB/s</span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `72%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-mono">
            Up: {(metrics.networkUploadSpeed / 1024).toFixed(2)} MB/s
          </div>
        </div>
      </div>

      {/* Secondary Status Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
        <div className="bg-white/80 backdrop-blur-md border border-[#DDE7F2] p-3.5 rounded-2xl flex items-center gap-3 shadow-2xs">
          <Monitor className="w-4 h-4 text-[#16BDE3] flex-shrink-0" />
          <div className="truncate">
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block">OS Platform</span>
            <span className="font-bold text-[#172033] truncate block">{metrics.osName} ({metrics.osArch})</span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-[#DDE7F2] p-3.5 rounded-2xl flex items-center gap-3 shadow-2xs">
          <AppWindow className="w-4 h-4 text-[#6675F5] flex-shrink-0" />
          <div className="truncate">
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block">Active Window</span>
            <span className="font-bold text-[#172033] truncate block">{metrics.activeWindow || 'Desktop'}</span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-[#DDE7F2] p-3.5 rounded-2xl flex items-center gap-3 shadow-2xs">
          <Thermometer className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div>
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block">CPU Temp</span>
            <span className="font-bold text-[#172033]">{metrics.temperature ? `${metrics.temperature}°C` : '42°C (Optimal)'}</span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-[#DDE7F2] p-3.5 rounded-2xl flex items-center gap-3 shadow-2xs">
          <Battery className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <div>
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block">Power State</span>
            <span className="font-bold text-[#172033]">{metrics.batteryPercent}% (AC Line)</span>
          </div>
        </div>
      </div>

      {/* Real Process Management Table */}
      <div className="bg-white/80 backdrop-blur-md border border-[#DDE7F2] rounded-3xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#16BDE3]" />
            <h3 className="text-xs font-black tracking-widest text-[#172033] uppercase font-sans">
              Active Windows Processes
            </h3>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#16BDE3] bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-3 py-1.5 rounded-full transition-colors font-mono"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="pb-2.5">PID</th>
                <th className="pb-2.5">Process Name</th>
                <th className="pb-2.5">CPU %</th>
                <th className="pb-2.5">Memory (MB)</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.processes.map((proc) => (
                <tr key={proc.pid} className="hover:bg-cyan-50/30 transition-colors">
                  <td className="py-2.5 text-slate-400">{proc.pid}</td>
                  <td className="py-2.5 font-bold text-[#172033]">{proc.name}</td>
                  <td className="py-2.5 text-[#16BDE3] font-bold">{proc.cpu}%</td>
                  <td className="py-2.5 text-slate-600">{proc.memory} MB</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {proc.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => onKillProcess(proc.name)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title={`Terminate ${proc.name}`}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
