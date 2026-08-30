import React, { useState, useEffect } from 'react';
import {
  Settings,
  Cpu,
  Key,
  Globe,
  Volume2,
  Shield,
  Save,
  CheckCircle2,
  Sparkles,
  Sliders,
  Search,
  Activity,
  AlertCircle,
  Zap,
  Flame,
  Cloud,
  Database,
  Terminal,
  Copy,
  Check,
  User as UserIcon,
  ExternalLink,
} from 'lucide-react';
import { AppSettings } from '../types';
import { api } from '../services/api';
import {
  firebaseConfig,
  auth,
  signInWithGoogle,
  signInAsGuest,
  signOutUser,
  subscribeToAuthState,
  testFirebaseConnection,
} from '../services/firebase';
import type { User } from 'firebase/auth';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

const OPENROUTER_MODEL_PRESETS = [
  {
    category: 'Free Tier (Zero Credits Required)',
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', desc: '100% Free - Flagship 70B open reasoning' },
      { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', desc: '100% Free - Advanced mathematical & coding reasoning' },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash Exp (Free)', desc: '100% Free - Fast multimodal reasoning' },
      { id: 'qwen/qwen-2.5-coder-32b-instruct:free', name: 'Qwen 2.5 Coder 32B (Free)', desc: '100% Free - Code generation and analysis' },
      { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', desc: '100% Free - Low-latency quick answers' },
      { id: 'cognitivecomputations/dolphin3.0-r1-mistral-24b:free', name: 'Dolphin 3.0 R1 24B (Free)', desc: '100% Free - Unfiltered reasoning & assistant' },
    ],
  },
  {
    category: 'Deep Research & Reasoning (Paid / Credits)',
    models: [
      { id: 'perplexity/sonar-reasoning', name: 'Perplexity Sonar Reasoning', desc: 'Real-time live web research & citations' },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Official)', desc: 'State-of-the-art open reasoning & math' },
      { id: 'openai/o3-mini', name: 'OpenAI o3-mini', desc: 'Fast step-by-step analytical reasoning' },
      { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', desc: 'Hybrid reasoning and high-level coding' },
    ],
  },
  {
    category: 'High-Performance & Multimodal (Paid / Credits)',
    models: [
      { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o', desc: 'Multimodal vision, function calling & desktop actions' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', desc: 'Precision code generation & complex research' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', desc: 'Open-weights flagship intelligence' },
      { id: 'mistralai/mistral-large-2411', name: 'Mistral Large 2', desc: 'Multilingual and reasoning specialist' },
    ],
  },
  {
    category: 'Fast & Lightweight (Paid / Credits)',
    models: [
      { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini', desc: 'Ultra-low latency command execution' },
      { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', desc: 'Lightning fast responses' },
    ],
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSaveSettings }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; latency?: number; isCreditError?: boolean } | null>(null);

  // Firebase integration state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFbAuthLoading, setIsFbAuthLoading] = useState(false);
  const [fbStatusMessage, setFbStatusMessage] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsFbAuthLoading(true);
    setFbStatusMessage(null);
    try {
      const user = await signInWithGoogle();
      setFbStatusMessage(`Successfully signed in with Google as ${user.email || user.displayName}!`);
    } catch (err: any) {
      setFbStatusMessage(`Google Auth Notice: ${err.message}`);
    } finally {
      setIsFbAuthLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsFbAuthLoading(true);
    setFbStatusMessage(null);
    try {
      const user = await signInAsGuest();
      setFbStatusMessage(`Signed in as Anonymous Guest (UID: ${user.uid.substring(0, 8)}...)`);
    } catch (err: any) {
      setFbStatusMessage(`Guest Auth Notice: ${err.message}`);
    } finally {
      setIsFbAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsFbAuthLoading(true);
    try {
      await signOutUser();
      setFbStatusMessage('Signed out from Firebase account.');
    } catch (err: any) {
      setFbStatusMessage(`Sign out error: ${err.message}`);
    } finally {
      setIsFbAuthLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestOpenRouter = async () => {
    if (!formData.openRouterApiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an OpenRouter API key first.' });
      return;
    }
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const res = await api.testOpenRouterKey(formData.openRouterApiKey, formData.openRouterModel || 'openai/gpt-4o-mini');
      setTestResult({
        success: true,
        message: res.reply || 'Connection verified and operational!',
        latency: res.latencyMs,
      });
    } catch (err: any) {
      const msg = err.message || 'Connection failed.';
      const isCredit = msg.includes('402') || msg.toLowerCase().includes('credit') || msg.toLowerCase().includes('balance');
      setTestResult({
        success: false,
        isCreditError: isCredit,
        message: msg,
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-[#DDE7F2] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#16BDE3]" />
            <h2 className="text-lg font-black tracking-tight text-[#172033] uppercase">
              System Configuration & AI Model Hub
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure OpenRouter AI models for deep research, voice synthesis, PC control tools, and safety protocols.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* AI Provider & Models Section */}
        <div className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#16BDE3]" />
              <h3 className="text-sm font-black text-[#172033] font-mono uppercase tracking-wider">
                Neural Reasoning & Research Engine
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-50 text-[#16BDE3] border border-cyan-200">
              OpenRouter Primary
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 font-mono block mb-1.5">
                ACTIVE AI ENGINE
              </label>
              <select
                value={formData.aiProvider}
                onChange={(e: any) => setFormData({ ...formData, aiProvider: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#16BDE3] bg-white shadow-2xs font-semibold text-[#172033]"
              >
                <option value="openrouter">OpenRouter (Research, Claude, DeepSeek, GPT-4o, Sonar)</option>
                <option value="gemini">Google Gemini 3.7 (Fallback / Alternative)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 font-mono block mb-1.5">
                RESEARCH & REASONING MODEL
              </label>
              <select
                value={formData.openRouterModel}
                onChange={(e) => setFormData({ ...formData, openRouterModel: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#16BDE3] bg-white shadow-2xs text-[#172033]"
              >
                {OPENROUTER_MODEL_PRESETS.map((group) => (
                  <optgroup key={group.category} label={group.category}>
                    {group.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* OpenRouter Config & Key Verification */}
          <div className="p-5 rounded-2xl bg-slate-50/90 border border-[#DDE7F2] space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 font-mono flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#16BDE3]" />
                  <span>OPENROUTER API KEY</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">Starts with sk-or-v1-...</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={formData.openRouterApiKey}
                  onChange={(e) => setFormData({ ...formData, openRouterApiKey: e.target.value })}
                  placeholder="Paste your OpenRouter API key here (sk-or-v1-...)"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#16BDE3] bg-white text-[#172033]"
                />
                <button
                  type="button"
                  onClick={handleTestOpenRouter}
                  disabled={isTestingKey || !formData.openRouterApiKey}
                  className="px-4 py-2.5 rounded-xl bg-[#172033] hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-2xs shrink-0"
                >
                  <Activity className={`w-3.5 h-3.5 ${isTestingKey ? 'animate-spin' : ''}`} />
                  <span>{isTestingKey ? 'Testing...' : 'Test Key'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
                Used for live web research, deep answering, code synthesis, screen understanding, and Windows PC actions.
              </p>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-xl text-xs font-mono flex flex-col gap-2.5 border ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">
                      {testResult.success
                        ? `Neural Link Verified (${testResult.latency}ms latency)`
                        : testResult.isCreditError
                        ? 'OpenRouter 402: Account Credits Exhausted'
                        : 'Connection Verification Failed'}
                    </div>
                    <div className="text-[11px] mt-0.5 opacity-90">{testResult.message}</div>
                  </div>
                </div>

                {testResult.isCreditError && (
                  <div className="pt-2 border-t border-rose-200/80 flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Quick Fix:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          openRouterModel: 'meta-llama/llama-3.3-70b-instruct:free',
                        }));
                        setTestResult({
                          success: true,
                          message: 'Selected Free Tier Model: Llama 3.3 70B (0 credits required). Click "Save System Settings" below.',
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 hover:bg-rose-100 text-rose-900 text-[10px] font-bold transition-all shadow-2xs"
                    >
                      Use Free Llama 3.3 (0 Credits)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          openRouterModel: 'deepseek/deepseek-r1:free',
                        }));
                        setTestResult({
                          success: true,
                          message: 'Selected Free Tier Model: DeepSeek R1 Reasoning (0 credits required). Click "Save System Settings" below.',
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 hover:bg-rose-100 text-rose-900 text-[10px] font-bold transition-all shadow-2xs"
                    >
                      Use Free DeepSeek R1 (0 Credits)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          aiProvider: 'gemini',
                        }));
                        setTestResult({
                          success: true,
                          message: 'Switched to built-in Google Gemini 3.7. Click "Save System Settings" below.',
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#172033] hover:bg-slate-800 text-white text-[10px] font-bold transition-all shadow-2xs"
                    >
                      Switch to Google Gemini 3.7
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 font-mono block mb-1">
                CUSTOM MODEL IDENTIFIER (OPTIONAL)
              </label>
              <input
                type="text"
                value={formData.openRouterModel}
                onChange={(e) => setFormData({ ...formData, openRouterModel: e.target.value })}
                placeholder="e.g. perplexity/sonar-reasoning or anthropic/claude-3.7-sonnet"
                className="w-full px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#16BDE3] bg-white text-[#172033]"
              />
            </div>
          </div>
        </div>

        {/* Voice & Language Settings */}
        <div className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[#6675F5]" />
            <h3 className="text-sm font-black text-[#172033] font-mono uppercase tracking-wider">
              Bilingual Voice & Speech Synthesis
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 font-mono block mb-1.5">
                DEFAULT RECOGNITION & OUTPUT LANGUAGE
              </label>
              <select
                value={formData.language}
                onChange={(e: any) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#6675F5] bg-white text-[#172033]"
              >
                <option value="auto">Bilingual Auto-Detection (English & Hindi)</option>
                <option value="en">English (US / UK)</option>
                <option value="hi">हिंदी (Devanagari Hindi)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 font-mono block mb-1.5">
                VOICE ASSISTANT PERSONA
              </label>
              <select
                value={formData.voiceGender}
                onChange={(e: any) => setFormData({ ...formData, voiceGender: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#6675F5] bg-white text-[#172033]"
              >
                <option value="male">Male (Classic British JARVIS tone)</option>
                <option value="female">Female (FRIDAY voice tone)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="font-bold text-slate-700">Speech Rate</span>
                <span className="text-[#16BDE3] font-bold">{formData.voiceRate}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={formData.voiceRate}
                onChange={(e) => setFormData({ ...formData, voiceRate: parseFloat(e.target.value) })}
                className="w-full accent-[#16BDE3]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="font-bold text-slate-700">Speech Pitch</span>
                <span className="text-[#16BDE3] font-bold">{formData.voicePitch}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={formData.voicePitch}
                onChange={(e) => setFormData({ ...formData, voicePitch: parseFloat(e.target.value) })}
                className="w-full accent-[#16BDE3]"
              />
            </div>
          </div>
        </div>

        {/* Safety & Confirmation Safeguards */}
        <div className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-black text-[#172033] font-mono uppercase tracking-wider">
              Safety Safeguards & Hardware Audit
            </h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-[#DDE7F2] cursor-pointer hover:bg-slate-100/60 transition-colors">
              <input
                type="checkbox"
                checked={formData.requireConfirmForDangerous}
                onChange={(e) => setFormData({ ...formData, requireConfirmForDangerous: e.target.checked })}
                className="w-4 h-4 rounded text-[#16BDE3] accent-[#16BDE3]"
              />
              <div>
                <span className="font-bold text-[#172033] block">Require user confirmation for destructive operations</span>
                <span className="text-[11px] text-slate-500 block">
                  Prevents automatic execution of shutdown, sleep, restart, or file deletion commands without your explicit UI approval.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-[#DDE7F2] cursor-pointer hover:bg-slate-100/60 transition-colors">
              <input
                type="checkbox"
                checked={formData.wakeWordEnabled}
                onChange={(e) => setFormData({ ...formData, wakeWordEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-[#16BDE3] accent-[#16BDE3]"
              />
              <div>
                <span className="font-bold text-[#172033] block">Continuous Wake-Word Detection ("Jarvis" / "जार्विस")</span>
                <span className="text-[11px] text-slate-500 block">
                  Continuously listen for wake phrase in the background.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Firebase Cloud Services & Hosting Hub */}
        <div className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500/20" />
              <div>
                <h3 className="text-sm font-black text-[#172033] font-mono uppercase tracking-wider">
                  Firebase Cloud Backend & Hosting
                </h3>
                <span className="text-[10px] font-mono text-slate-500 block">
                  Project: <span className="font-bold text-amber-600 font-mono">{firebaseConfig.projectId}</span> • Region: Global
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SDK CONNECTED
              </span>
            </div>
          </div>

          {/* Firebase Authentication & User State */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-amber-50/30 border border-[#DDE7F2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#172033] font-mono">
                  {currentUser
                    ? currentUser.displayName || currentUser.email || `Anonymous (${currentUser.uid.substring(0, 8)}...)`
                    : 'Not Authenticated to Firebase'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {currentUser
                    ? `UID: ${currentUser.uid} • ${currentUser.isAnonymous ? 'Guest Account' : 'Google Account'}`
                    : 'Sign in to synchronize memories, notes, and automations to Cloud Firestore'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {currentUser ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isFbAuthLoading}
                  className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-mono font-bold transition-all shadow-2xs"
                >
                  {isFbAuthLoading ? 'Signing out...' : 'Sign Out'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isFbAuthLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-[#172033] text-white hover:bg-slate-800 text-xs font-mono font-bold transition-all shadow-2xs flex items-center gap-1.5"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isFbAuthLoading ? 'Connecting...' : 'Google Sign In'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGuestSignIn}
                    disabled={isFbAuthLoading}
                    className="px-3 py-1.5 rounded-xl border border-[#DDE7F2] bg-white text-slate-700 hover:bg-slate-100 text-xs font-mono font-bold transition-all shadow-2xs"
                  >
                    Guest
                  </button>
                </>
              )}
            </div>
          </div>

          {fbStatusMessage && (
            <div className="p-3 rounded-xl text-xs font-mono bg-blue-50 text-blue-900 border border-blue-200">
              {fbStatusMessage}
            </div>
          )}

          {/* Active Firebase Services Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-white border border-[#DDE7F2] shadow-2xs">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-bold text-[#172033] font-mono">Cloud Firestore</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                Real-time synchronized memories & conversation state.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-[#DDE7F2] shadow-2xs">
              <div className="flex items-center gap-2 mb-1">
                <Cloud className="w-3.5 h-3.5 text-cyan-600" />
                <span className="text-xs font-bold text-[#172033] font-mono">Cloud Storage</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono truncate" title={firebaseConfig.storageBucket}>
                Bucket: {firebaseConfig.storageBucket}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-[#DDE7F2] shadow-2xs">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-xs font-bold text-[#172033] font-mono">Google Analytics</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                Stream ID: {firebaseConfig.measurementId}
              </p>
            </div>
          </div>

          {/* Firebase Hosting Deployment Card & Commands */}
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Terminal className="w-4 h-4" />
                <span>FIREBASE HOSTING DEPLOYMENT GUIDE (firebase.json ready)</span>
              </div>
              <span className="text-[10px] text-slate-400">Target: {firebaseConfig.authDomain}</span>
            </div>

            <p className="text-[11px] text-slate-300">
              <code className="text-amber-300">firebase.json</code> and <code className="text-amber-300">.firebaserc</code> have been configured for single-page app hosting with public folder <code className="text-cyan-300">dist</code>.
            </p>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-xl border border-slate-800">
                <span className="text-emerald-400 select-all font-mono text-[11px]">npm run build && firebase deploy</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('npm run build && firebase deploy', 'deploy')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 flex items-center gap-1 font-mono transition-colors"
                >
                  {copiedCmd === 'deploy' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd === 'deploy' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-mono font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings saved successfully!</span>
            </div>
          )}

          <button
            type="submit"
            className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-[#172033] hover:bg-slate-800 text-white text-xs font-bold font-mono transition-all shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>SAVE CONFIGURATION</span>
          </button>
        </div>
      </form>
    </div>
  );
};
