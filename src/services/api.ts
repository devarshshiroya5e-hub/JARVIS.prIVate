import { SystemMetrics, MemoryItem, AutomationRoutine, AppSettings } from '../types';
import { wsClient } from './websocket';

// Current free OpenRouter model with multimodal input and tool calling.
// See: https://openrouter.ai/minimax/minimax-m3:free
export const FAST_AI_MODEL = 'minimax/minimax-m3:free';
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

const normalizeModel = (model?: string) => {
  const value = (model || '').trim();
  if (!value || /content-safety|guardrail/i.test(value)) return FAST_AI_MODEL;
  return value;
};

const normalizeSettings = (settings: Partial<AppSettings> = {}): AppSettings => ({
  aiProvider: 'openrouter',
  openRouterApiKey: settings.openRouterApiKey || '',
  openRouterModel: normalizeModel(settings.openRouterModel),
  geminiModel: settings.geminiModel || FAST_AI_MODEL,
  agentHost: settings.agentHost,
  agentPort: settings.agentPort || 8765,
  language: settings.language || 'auto',
  wakeWord: settings.wakeWord,
  wakeWordEnabled: settings.wakeWordEnabled ?? true,
  voiceGender: settings.voiceGender || 'male',
  voicePitch: settings.voicePitch ?? 1,
  voiceRate: settings.voiceRate ?? 1.05,
  voiceVolume: settings.voiceVolume ?? 1,
  pushToTalkKey: settings.pushToTalkKey,
  soundEffectsEnabled: settings.soundEffectsEnabled ?? true,
  autoSpeakResponses: settings.autoSpeakResponses ?? true,
  safetyLevel: settings.safetyLevel || 'standard',
  requireConfirmForDangerous: settings.requireConfirmForDangerous ?? true,
  appPaths: settings.appPaths || {},
});

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

  async processJarvisPrompt(prompt: string, conversationHistory: any[] = [], settings?: Partial<AppSettings>, language = 'auto') {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) throw new Error('Prompt cannot be empty.');

    const model = normalizeModel(settings?.openRouterModel);
    return wsClient.processPrompt(
      normalizedPrompt,
      conversationHistory,
      language,
      settings?.openRouterApiKey?.trim() || '',
      model,
    );
  },

  async executeTool(toolName: string, args: Record<string, any> = {}) {
    return new Promise<any>((resolve, reject) => {
      const requestId = `tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const timeoutId = window.setTimeout(() => reject(new Error(`Tool ${toolName} timed out.`)), 20_000);
      const unsubscribe = wsClient.onMessage((msg) => {
        if (msg.requestId !== requestId) return;
        unsubscribe();
        window.clearTimeout(timeoutId);
        if (msg.type === 'tool_result') resolve(msg.payload);
        else reject(new Error(msg.payload?.error || `Tool ${toolName} failed.`));
      });
      wsClient.send({
        type: 'execute_tool',
        requestId,
        payload: { tool: toolName, arguments: args },
      });
    });
  },

  async analyzeScreen(imageBase64: string, prompt?: string, settings?: Partial<AppSettings>) {
    const model = normalizeModel(settings?.openRouterModel);
    const res = await fetchWithTimeout('/api/jarvis/analyze-screen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        prompt,
        openRouterModel: model,
        openRouterApiKey: settings?.openRouterApiKey?.trim() || undefined,
      }),
    }, 60_000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Vision analysis failed' }));
      throw new Error(err.error || 'Vision analysis failed');
    }
    return res.json();
  },

  async testOpenRouterKey(apiKey: string, model = FAST_AI_MODEL) {
    const selectedModel = normalizeModel(model);
    const res = await fetchWithTimeout('/api/openrouter/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, model: selectedModel }),
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
    const res = await fetchWithTimeout('/jarvis_windows_bridge.py');
    if (!res.ok) throw new Error('Failed to get Windows agent script');
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
    const normalized = normalizeSettings(settings);
    localStorage.setItem('jarvis_settings', JSON.stringify(normalized));
    return { status: 'ok', model: normalized.openRouterModel };
  },
};