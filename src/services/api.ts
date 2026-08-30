import { SystemMetrics, MemoryItem, AutomationRoutine, ToolCallInfo, AppSettings } from '../types';

export const api = {
  async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  async getSystemMetrics(): Promise<SystemMetrics> {
    const res = await fetch('/api/system/metrics');
    if (!res.ok) throw new Error('Failed to fetch system metrics');
    return res.json();
  },

  async processJarvisPrompt(
    prompt: string,
    conversationHistory: any[] = [],
    settings?: Partial<AppSettings>,
    language: string = 'auto'
  ) {
    const payload = {
      prompt,
      conversationHistory,
      language,
      aiProvider: settings?.aiProvider || 'openrouter',
      openRouterApiKey: settings?.openRouterApiKey || '',
      openRouterModel: settings?.openRouterModel || 'openai/gpt-4o',
    };

    const res = await fetch('/api/jarvis/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown server error' }));
      throw new Error(err.error || 'Server error processing request');
    }
    return res.json();
  },

  async executeTool(toolName: string, args: Record<string, any> = {}) {
    const res = await fetch('/api/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName, args }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Tool execution failed' }));
      throw new Error(err.error || 'Failed to execute tool');
    }
    return res.json();
  },

  async analyzeScreen(imageBase64: string, prompt?: string, settings?: Partial<AppSettings>) {
    const res = await fetch('/api/jarvis/analyze-screen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        prompt,
        aiProvider: settings?.aiProvider || 'openrouter',
        openRouterApiKey: settings?.openRouterApiKey || '',
        openRouterModel: settings?.openRouterModel || 'openai/gpt-4o',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Vision analysis failed' }));
      throw new Error(err.error || 'Vision analysis failed');
    }
    return res.json();
  },

  async testOpenRouterKey(apiKey: string, model: string = 'openai/gpt-4o-mini') {
    const res = await fetch('/api/openrouter/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, model }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `HTTP ${res.status}: Failed to connect to OpenRouter`);
    }
    return data;
  },

  async getMemories(): Promise<MemoryItem[]> {
    const res = await fetch('/api/memory');
    const data = await res.json();
    return data.memories || [];
  },

  async addMemory(memory: { category: string; key: string; value: string }): Promise<MemoryItem> {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory),
    });
    const data = await res.json();
    return data.memory;
  },

  async deleteMemory(id: string) {
    const res = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async clearMemories() {
    const res = await fetch('/api/memory', { method: 'DELETE' });
    return res.json();
  },

  async getAutomations(): Promise<AutomationRoutine[]> {
    const res = await fetch('/api/automations');
    const data = await res.json();
    return data.automations || [];
  },

  async createAutomation(routine: Partial<AutomationRoutine>): Promise<AutomationRoutine> {
    const res = await fetch('/api/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routine),
    });
    const data = await res.json();
    return data.routine || data.automation || data;
  },

  async addAutomation(routine: Partial<AutomationRoutine>) {
    return this.createAutomation(routine);
  },

  async updateAutomation(id: string, routine: Partial<AutomationRoutine>) {
    const res = await fetch(`/api/automations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routine),
    });
    return res.json();
  },

  async executeAutomation(id: string) {
    const res = await fetch(`/api/automations/${id}/execute`, {
      method: 'POST',
    });
    return res.json();
  },

  async getBridgeScript(): Promise<{ script: string; filename: string }> {
    const res = await fetch('/api/windows-bridge/script?format=json');
    if (!res.ok) throw new Error('Failed to get bridge script');
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return { script: data.script || '', filename: data.filename || 'jarvis_windows_bridge.py' };
    } else {
      const text = await res.text();
      return { script: text, filename: 'jarvis_windows_bridge.py' };
    }
  },

  async getSettings(): Promise<AppSettings> {
    const saved = localStorage.getItem('jarvis_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {} as AppSettings;
  },

  async saveSettings(settings: AppSettings) {
    localStorage.setItem('jarvis_settings', JSON.stringify(settings));
    return { status: 'ok' };
  },
};
