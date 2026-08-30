import React, { useState } from 'react';
import {
  Compass,
  Search,
  Globe,
  Youtube,
  Github,
  BookOpen,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';

interface BrowserControlViewProps {
  onExecuteTool: (toolName: string, args: Record<string, any>) => void;
}

export const BrowserControlView: React.FC<BrowserControlViewProps> = ({ onExecuteTool }) => {
  const [urlInput, setUrlInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEngine, setSelectedEngine] = useState<'google' | 'youtube' | 'github' | 'wikipedia'>('google');

  const handleOpenUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    onExecuteTool('open_url', { url: urlInput.trim() });
    setUrlInput('');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onExecuteTool('search_web', { query: searchQuery.trim(), engine: selectedEngine });
    setSearchQuery('');
  };

  const quickSites = [
    { name: 'Google', url: 'https://google.com', icon: Globe, color: 'text-blue-500 bg-blue-50' },
    { name: 'YouTube', url: 'https://youtube.com', icon: Youtube, color: 'text-red-500 bg-red-50' },
    { name: 'GitHub', url: 'https://github.com', icon: Github, color: 'text-slate-800 bg-slate-100' },
    { name: 'Wikipedia', url: 'https://wikipedia.org', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50' },
    { name: 'Gmail', url: 'https://mail.google.com', icon: Globe, color: 'text-amber-500 bg-amber-50' },
    { name: 'ChatGPT / AI', url: 'https://chatgpt.com', icon: Sparkles, color: 'text-cyan-600 bg-cyan-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 font-mono flex items-center space-x-2">
            <Compass className="w-5 h-5 text-cyan-600" />
            <span>BROWSER AUTOMATION & WEB SEARCH HUB</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Command JARVIS to open websites, search online databases, or control multi-step browser workflows.
          </p>
        </div>
      </div>

      {/* URL Navigator */}
      <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 font-mono flex items-center space-x-2">
          <Globe className="w-4 h-4 text-cyan-600" />
          <span>DIRECT URL NAVIGATION</span>
        </h3>

        <form onSubmit={handleOpenUrl} className="flex space-x-3">
          <input
            type="text"
            placeholder="Enter URL (e.g. github.com/trending, news.ycombinator.com)..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400 bg-white"
          />
          <button
            type="submit"
            disabled={!urlInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold font-mono transition-colors disabled:opacity-40"
          >
            NAVIGATE
          </button>
        </form>
      </div>

      {/* Search Bar with Engine Selector */}
      <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 font-mono flex items-center space-x-2">
            <Search className="w-4 h-4 text-sky-600" />
            <span>MULTI-ENGINE WEB SEARCH</span>
          </h3>

          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-mono">
            {(['google', 'youtube', 'github', 'wikipedia'] as const).map((eng) => (
              <button
                key={eng}
                type="button"
                onClick={() => setSelectedEngine(eng)}
                className={`px-3 py-1 rounded-lg uppercase text-[10px] font-bold transition-all ${
                  selectedEngine === eng
                    ? 'bg-white text-cyan-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {eng}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex space-x-3">
          <input
            type="text"
            placeholder={`Search ${selectedEngine.toUpperCase()} for tutorials, repositories, documentation...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-sky-400 bg-white"
          />
          <button
            type="submit"
            disabled={!searchQuery.trim()}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold font-mono transition-colors disabled:opacity-40"
          >
            SEARCH {selectedEngine.toUpperCase()}
          </button>
        </form>
      </div>

      {/* Quick Launch Bookmarks */}
      <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 font-mono">QUICK LAUNCH BOOKMARKS</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickSites.map((site, idx) => {
            const Icon = site.icon;
            return (
              <button
                key={idx}
                onClick={() => onExecuteTool('open_url', { url: site.url })}
                className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-cyan-300 transition-all flex flex-col items-center justify-center space-y-2 group shadow-sm hover:shadow"
              >
                <div className={`p-2 rounded-lg ${site.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-700">{site.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
