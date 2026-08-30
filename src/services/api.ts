import { SystemMetrics, MemoryItem, AutomationRoutine, AppSettings } from '../types';

const FAST_AI_MODEL = 'nvidia/nemotron-3.5-content-safety:free';
const REQUEST_TIMEOUT_MS = 45_000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

const normalizeSettings = (settings: Partial<AppSettings> = {}): AppSettings => ({
  ...settings,
  aiProvider: 'openrouter',
  openRouterModel: FAST_AI_MODEL,
  geminiModel: FAST_AI_MODEL,
} as AppSettings);

export const api = {
  async getHealth() {
    const res = await fetchWithTimeout('/api/health', {}, 10_000);
    return res.json();
  },

  async getSystemMetrics(): Promise<SystemMetrics> {
    const res = await fetchWithTimeout('/api/system/metrics', {}, 10_000);
    if (!res.ok) throw new Error('Failed to fetch system metrics');
    return res.json();
  },

  async processJarvisPrompt(prompt: string, conversationHistory: any[] = [], _settings?: Partial<AppSettings>, language = 'auto') {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) throw new Error('Prompt cannot be empty.');

    const payload = {
      prompt: normalizedPrompt,
      conversationHistory: conversationHistory.slice(-4),
      language,
      aiProvider: 'openrouter',
      openRouterModel: FAST_AI_MODEL,
    };

    const startedAt = performance.now();
    let res: Response;
    try {
      res = await fetchWithTimeout('/api/jarvis/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error: any) {
      if (error?.name === 'AbortError') throw new Error('JARVIS request timed out. Please try again.');
      throw error;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown server error' }));
      throw new Error(err.error || `NVIDIA OpenRouter server error (${res.status})`);
    }

    const data = await res.json();
    data.clientLatencyMs = Math.round(performance.now() - startedAt);
    return data;
  },

  async executeTool(toolName: string, args: Record<string, any> = {}) {
    const res = await fetchWithTimeout('/api/tools/execute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toolName, args }),
    }, 20_000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Tool execution failed' }));
      throw new Error(err.error || 'Failed to execute tool');
    }
    return res.json();
  },

  async analyzeScreen(imageBase64: string, prompt?: string, _settings?: Partial<AppSettings>) {
    const res = await fetchWithTimeout('/api/jarvis/analyze-screen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, prompt, openRouterModel: FAST_AI_MODEL }),
    }, 60_000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Vision analysis failed' }));
      throw new Error(err.error || 'Vision analysis failed');
    }
    return res.json();
  },

  async testOpenRouterKey(apiKey: string, _model = FAST_AI_MODEL) {
    const res = await fetchWithTimeout('/api/openrouter/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, model: FAST_AI_MODEL }),
    }, 20_000);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}: Failed to connect to OpenRouter`);
    return data;
  },

  async getMemories(): Promise<MemoryItem[]> {
    const res = await fetchWithTimeout('/api/memory', {}, 10_000);
    const data = await res.json();
    return data.memories || [];
  },

  async addMemory(memory: { category: string; key: string; value: string }): Promise<MemoryItem> {
    const res = await fetchWithTimeout('/api/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(memory) });
    const data = await res.json();
    return data.memory;
  },

  async deleteMemory(id: string) {
    const res = await fetchWithTimeout(`/api/memory/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async clearMemories() {
    const res = await fetchWithTimeout('/api/memory', { method: 'DELETE' });
    return res.json();
  },

  async getAutomations(): Promise<AutomationRoutine[]> {
    const res = await fetchWithTimeout('/api/automations');
    const data = await res.json();
    return data.automations || [];
  },

  async createAutomation(routine: Partial<AutomationRoutine>): Promise<AutomationRoutine> {
    const res = await fetchWithTimeout('/api/automations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(routine) });
    const data = await res.json();
    return data.routine || data.automation || data;
  },

  async addAutomation(routine: Partial<AutomationRoutine>) { return this.createAutomation(routine); },

  async updateAutomation(id: string, routine: Partial<AutomationRoutine>) {
    const res = await fetchWithTimeout(`/api/automations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(routine) });
    return res.json();
  },

  async executeAutomation(id: string) {
    const res = await fetchWithTimeout(`/api/automations/${id}/execute`, { method: 'POST' }, 60_000);
    return res.json();
  },

  async getBridgeScript(): Promise<{ script: string; filename: string }> {
    const res = await fetchWithTimeout('/api/windows-bridge/script?format=json');
    if (!res.ok) throw new Error('Failed to get bridge script');
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return { script: data.script || '', filename: data.filename || 'jarvis_windows_bridge.py' };
    }
    return { script: await res.text(), filename: 'jarvis_windows_bridge.py' };
  },

  async getSettings(): Promise<AppSettings> {
    const saved = localStorage.getItem('jarvis_settings');
    if (saved) {
      try { return normalizeSettings(JSON.parse(saved)); } catch (_) {}
    }
    return normalizeSettings();
  },

  async saveSettings(settings: AppSettings) {
    localStorage.setItem('jarvis_settings', JSON.stringify(normalizeSettings(settings)));
    return { status: 'ok', model: FAST_AI_MODEL };
  },
};
