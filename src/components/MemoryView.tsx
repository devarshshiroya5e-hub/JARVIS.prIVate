import React, { useState } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Bookmark,
  Sparkles,
  Tag,
  Key,
  Folder,
  Code2,
} from 'lucide-react';
import { MemoryItem } from '../types';

interface MemoryViewProps {
  memories: MemoryItem[];
  onAddMemory: (memory: { category: string; key: string; value: string }) => void;
  onDeleteMemory: (id: string) => void;
  onClearMemories: () => void;
}

export const MemoryView: React.FC<MemoryViewProps> = ({
  memories,
  onAddMemory,
  onDeleteMemory,
  onClearMemories,
}) => {
  const [category, setCategory] = useState<'preference' | 'application' | 'directory' | 'credential' | 'workflow' | 'fact'>('preference');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !value.trim()) return;
    onAddMemory({ category, key: key.trim(), value: value.trim() });
    setKey('');
    setValue('');
  };

  const filteredMemories = memories.filter((m) => {
    if (filterCategory === 'all') return true;
    return m.category === filterCategory;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'application':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'directory':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'credential':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'workflow':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'preference':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-[#DDE7F2] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#16BDE3]" />
            <h2 className="text-lg font-black tracking-tight text-[#172033] uppercase">
              Neural Memory & Preference Registry
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            JARVIS remembers directory paths, application configurations, personal preferences, and custom context.
          </p>
        </div>

        <button
          onClick={onClearMemories}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-mono font-bold border border-rose-200 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Purge All</span>
        </button>
      </div>

      {/* Add New Memory Card */}
      <div className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#16BDE3]" />
          <h3 className="text-xs font-bold text-[#172033] font-mono uppercase tracking-wider">
            Store New Neural Memory Item
          </h3>
        </div>

        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select
            value={category}
            onChange={(e: any) => setCategory(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#16BDE3] bg-slate-50 text-[#172033]"
          >
            <option value="preference">Preference</option>
            <option value="application">Application</option>
            <option value="directory">Directory</option>
            <option value="workflow">Workflow</option>
            <option value="fact">Personal Fact</option>
          </select>

          <input
            type="text"
            placeholder="Key (e.g. Favorite Browser, Main Workspace)"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#16BDE3] bg-slate-50 text-[#172033]"
            required
          />

          <input
            type="text"
            placeholder="Value (e.g. Chrome, C:\Projects\MyRepo)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#16BDE3] bg-slate-50 text-[#172033]"
            required
          />

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#172033] hover:bg-slate-800 text-white text-xs font-bold font-mono transition-colors shadow-xs"
          >
            RECORD MEMORY
          </button>
        </form>
      </div>

      {/* Memory Filter & List */}
      <div className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#172033] font-mono uppercase tracking-wider">
            Active Neural Context ({filteredMemories.length})
          </h3>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-mono">
            {['all', 'preference', 'application', 'directory', 'fact'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-lg capitalize transition-all ${
                  filterCategory === cat
                    ? 'bg-white text-[#172033] font-bold shadow-2xs'
                    : 'text-slate-500 hover:text-[#172033]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMemories.map((mem) => (
            <div
              key={mem.id}
              className="p-5 rounded-2xl bg-white border border-[#DDE7F2] hover:border-cyan-300 transition-all flex items-start justify-between gap-3 group shadow-2xs"
            >
              <div className="space-y-1.5 truncate">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black font-mono uppercase border ${getCategoryBadge(mem.category)}`}>
                    {mem.category}
                  </span>
                  <span className="font-bold text-xs text-[#172033] truncate">{mem.key}</span>
                </div>
                <p className="text-xs text-slate-600 font-mono break-all leading-relaxed">{mem.value}</p>
                <span className="text-[10px] text-slate-400 font-mono block">
                  Updated {new Date(mem.updatedAt).toLocaleDateString()}
                </span>
              </div>

              <button
                onClick={() => onDeleteMemory(mem.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Delete memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
