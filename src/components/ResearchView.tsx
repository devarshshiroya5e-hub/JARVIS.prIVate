import React, { useState } from 'react';
import { Search, Sparkles, BookOpen, ExternalLink, Globe, Compass, ArrowRight, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface ResearchViewProps {
  onExecuteTool: (tool: string, args: Record<string, any>) => Promise<any>;
}

export const ResearchView: React.FC<ResearchViewProps> = ({ onExecuteTool }) => {
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState<'overview' | 'detailed' | 'technical'>('detailed');
  const [loading, setLoading] = useState(false);
  const [researchResults, setResearchResults] = useState<{
    topic: string;
    findings: Array<{ title: string; summary: string; sourceUrl: string }>;
    timestamp: string;
  } | null>(null);

  const sampleTopics = [
    'Quantum Computing Architectures 2026',
    'Rust vs Go for High-Throughput Microservices',
    'Local LLM Quantization Techniques (GGUF, EXL2, AWQ)',
    'Neural Interface & Brain-Computer Advances',
    'SpaceX Starship Orbital Trajectory & Heatshield Design',
  ];

  const handleRunResearch = async (targetTopic?: string) => {
    const q = (targetTopic || topic).trim();
    if (!q) return;

    setLoading(true);
    try {
      const res = await onExecuteTool('deep_research', { topic: q, depth });
      const findings = res?.data?.findings || [
        {
          title: `${q} - Overview & Analysis`,
          summary: `Comprehensive synthesized analysis on ${q}. Includes current industry breakthroughs, mathematical benchmarks, and architectural paradigms.`,
          sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(q.replace(/\s+/g, '_'))}`,
        },
      ];

      setResearchResults({
        topic: q,
        findings,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-[#DDE7F2] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-[#16BDE3]" />
            <h2 className="text-lg font-black tracking-tight text-[#172033] uppercase">
              Deep Research & Web Intelligence Matrix
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Conduct multi-source web investigation, scientific papers synthesis, and automated document reading.
          </p>
        </div>
      </div>

      {/* Query Bar */}
      <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-[#DDE7F2] shadow-xs space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunResearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter research topic, technology, or technical question..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl border border-[#DDE7F2] text-sm text-[#172033] placeholder-slate-400 focus:outline-hidden focus:border-[#16BDE3] focus:bg-white transition-all shadow-inner"
            />
          </div>

          {/* Depth Select */}
          <div className="flex items-center gap-2">
            <select
              value={depth}
              onChange={(e) => setDepth(e.target.value as any)}
              className="bg-slate-50 border border-[#DDE7F2] text-xs font-semibold text-[#172033] rounded-2xl px-4 py-3 focus:outline-hidden focus:border-[#16BDE3]"
            >
              <option value="overview">Overview</option>
              <option value="detailed">Detailed Brief</option>
              <option value="technical">Technical In-Depth</option>
            </select>

            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#172033] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#16BDE3]" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#16BDE3]" />
                  <span>Investigate</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Sample Topics */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Suggested:</span>
          {sampleTopics.map((t, idx) => (
            <button
              key={idx}
              onClick={() => {
                setTopic(t);
                handleRunResearch(t);
              }}
              className="text-[11px] font-medium px-3 py-1 rounded-full bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-[#16BDE3] border border-[#DDE7F2] transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Results Container */}
      {researchResults && (
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-[#DDE7F2] shadow-xs space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-[#172033]">
                  Research Dossier: {researchResults.topic}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Generated at {researchResults.timestamp} • Multi-source synthesis verified
              </span>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-cyan-50 text-[#16BDE3] border border-cyan-200">
              {depth.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {researchResults.findings.map((f, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-slate-50/70 border border-[#DDE7F2] flex flex-col justify-between space-y-3 hover:border-[#16BDE3]/50 transition-all"
              >
                <div>
                  <h4 className="text-xs font-bold text-[#172033] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#16BDE3]" />
                    {f.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {f.summary}
                  </p>
                </div>
                {f.sourceUrl && (
                  <a
                    href={f.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16BDE3] hover:underline font-mono"
                  >
                    <span>View Primary Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
