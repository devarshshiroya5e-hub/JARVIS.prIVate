import React, { useState } from 'react';
import { Activity, CheckCircle2, Clock, Terminal, Trash2, Shield, AlertCircle, Info, ChevronDown, ChevronRight, Search, Download } from 'lucide-react';
import { ActivityLogEntry } from '../types';

interface ActivityLogPanelProps {
  entries: ActivityLogEntry[];
  onClear: () => void;
}

export const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({ entries, onClear }) => {
  const [filter, setFilter] = useState<'all' | 'tool' | 'voice' | 'system'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredEntries = entries.filter((e) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'tool'
        ? e.type === 'tool'
        : filter === 'voice'
        ? e.type === 'voice' || e.type === 'intent'
        : e.type === 'system' || e.type === 'safety' || e.type === 'error';

    const matchesSearch =
      !searchTerm ||
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.detail && e.detail.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(entries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `jarvis-activity-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-md rounded-3xl p-5 border border-[#DDE7F2] shadow-xs overflow-hidden select-none">
      {/* Header */}
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between pb-2 border-b border-[#DDE7F2]">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#16BDE3]" />
          <span>Activity Stream</span>
          <span className="text-[#16BDE3] font-mono text-[9px] font-bold">● LIVE</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Filter Pills */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-full text-[9px] font-bold uppercase font-mono">
            {(['all', 'tool', 'voice', 'system'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded-full transition-all ${
                  filter === f
                    ? 'bg-white text-[#172033] shadow-xs font-bold'
                    : 'text-slate-500 hover:text-[#172033]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportLogs}
            title="Export Activity Log JSON"
            className="p-1 text-slate-400 hover:text-[#172033] hover:bg-slate-100 rounded-md transition-colors"
          >
            <Download className="w-3 h-3" />
          </button>

          <button
            onClick={onClear}
            title="Clear Activity Log"
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Mini Search input */}
      <div className="mb-2 relative">
        <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter telemetry events..."
          className="w-full pl-7 pr-3 py-1 bg-slate-50 border border-[#DDE7F2] rounded-lg text-[10px] text-[#172033] placeholder-slate-400 focus:outline-hidden focus:border-[#16BDE3]"
        />
      </div>

      {/* Activity Timeline List */}
      <div className="flex-1 p-1 overflow-y-auto space-y-1.5 font-mono text-[10px]">
        {filteredEntries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Clock className="w-6 h-6 text-slate-300 mb-2" />
            <p className="text-[10px] uppercase font-bold tracking-wider">No matching telemetry</p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div
                key={entry.id}
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                className="p-2 rounded-xl bg-slate-50/70 hover:bg-white border border-[#DDE7F2] hover:border-cyan-300 transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[#16BDE3] font-bold">{entry.timestamp}</span>
                    <span className="font-bold text-[#172033] truncate">{entry.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                        entry.status === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : entry.status === 'error'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                      }`}
                    >
                      {entry.status}
                    </span>
                    {entry.detail && (
                      isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Detail expansion */}
                {isExpanded && entry.detail && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 text-[9px] text-slate-600 bg-white p-2 rounded-lg break-all border border-slate-100">
                    {entry.detail}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
