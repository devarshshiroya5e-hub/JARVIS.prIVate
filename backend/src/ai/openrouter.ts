import { db } from '../database/store';
import { JARVIS_TOOL_REGISTRY } from '../../../shared/tools';

const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';
const TOOL_CAPABLE_FALLBACKS = ['google/gemma-4-31b-it:free', 'minimax/minimax-m3:free'] as const;
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_TOOL_ROUNDS = 6;

type ConversationMessage = { sender: 'user' | 'jarvis' | 'assistant'; text: string };

type ToolCallInfo = {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  status: 'success' | 'failed';
  timestamp: string;
};

const AI_TOOL_NAMES = new Set([
  'open_application',
  'close_application',
  'lock_pc',
  'type_text',
  'press_key',
  'keyboard_shortcut',
  'move_mouse',
  'click_mouse',
  'double_click_mouse',
  'take_screenshot',
  'open_url',
  'search_web',
  'browser_open',
  'browser_click',
  'browser_type',
  'list_files',
  'search_files',
  'create_folder',
  'create_file',
  'get_cpu',
  'get_ram',
  'get_gpu',
  'get_disk',
  'get_battery',
  'get_network',
  'get_system_metrics',
]);

function sanitizeSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(sanitizeSchema);

  const out: Record<string, any> = { ...schema };
  if (out.type === 'array' && !out.items) out.items = { type: 'string' };
  if (out.properties && typeof out.properties === 'object') {
    out.properties = Object.fromEntries(Object.entries(out.properties).map(([key, value]) => [key, sanitizeSchema(value)]));
  }
  if (out.items) out.items = sanitizeSchema(out.items);
  if (out.additionalProperties && typeof out.additionalProperties === 'object') out.additionalProperties = sanitizeSchema(out.additionalProperties);
  return out;
}

const OPENROUTER_TOOLS = JARVIS_TOOL_REGISTRY
  .filter((tool) => AI_TOOL_NAMES.has(tool.name) && tool.safetyLevel === 'safe')
  .map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: sanitizeSchema(tool.parameters),
    },
  }));

function isKnownBrokenModel(model: string) {
  const normalized = model.trim().toLowerCase();
  return !normalized || normalized.includes('content-safety') || normalized.includes('guardrail');
}

function modelCandidates(requested?: string) {
  const values = [requested, process.env.OPENROUTER_MODEL, DEFAULT_OPENROUTER_MODEL, ...TOOL_CAPABLE_FALLBACKS];
  return [...new Set(values.filter((value): value is string => !!value && !isKnownBrokenModel(value)).map((value) => value.trim()))];
}

export interface OpenRouterRequestOptions {
  prompt: string;
  conversationHistory?: ConversationMessage[];
  model?: string;
  apiKey?: string;
  language?: string;
  executeTool?: (toolName: string, args: Record<string, any>) => Promise<any>;
}

export interface OpenRouterResponse {
  source: 'openrouter';
  model: string;
  text: string;
  hindiText?: string;
  toolCalls: ToolCallInfo[];
}

export class OpenRouterService {
  private getApiKey(overrideKey?: string) {
    return (overrideKey || process.env.OPENROUTER_API_KEY || '').trim();
  }

  private async request(body: Record<string, any>, apiKey: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.APP_URL || 'https://jarvis-private.onrender.com',
          'X-Title': 'JARVIS Private',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private buildMessages(options: OpenRouterRequestOptions) {
    const memoryContext = db.getMemories().map((m) => `- ${m.key}: ${m.value}`).join('\n');
    const systemPrompt = `You are J.A.R.V.I.S., the user's personal Windows AI command assistant.
Be concise, intelligent, polite, and action-oriented. Support English, Hindi, and natural Hinglish.
Use tools for desktop actions when appropriate. Never claim an action succeeded unless the tool result says success.
Do not invoke dangerous/destructive operations; those require an explicit confirmation UI.
Language preference: ${options.language || 'auto'}.
Known user memories:\n${memoryContext || '(none)'}`;

    const history = (options.conversationHistory || [])
      .slice(-8)
      .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

    return [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: options.prompt.trim() },
    ];
  }

  private async plainFallback(messages: any[], apiKey: string, candidates: string[]) {
    for (const model of candidates) {
      try {
        const response = await this.request({ model, messages, temperature: 0.2, max_tokens: 1024 }, apiKey);
        if (!response.ok) continue;
        const data: any = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return { model, text };
      } catch (_) {}
    }
    return null;
  }

  public async sendMessage(options: OpenRouterRequestOptions): Promise<OpenRouterResponse> {
    const apiKey = this.getApiKey(options.apiKey);
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured. Add your OpenRouter key in JARVIS Settings or Render.');

    const candidates = modelCandidates(options.model);
    const messages: any[] = this.buildMessages(options);
    const toolCalls: ToolCallInfo[] = [];
    let lastError = '';

    for (const model of candidates) {
      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const response = await this.request({
            model,
            messages,
            tools: OPENROUTER_TOOLS,
            tool_choice: 'auto',
            temperature: 0.2,
            max_tokens: 1024,
          }, apiKey);

          if (!response.ok) {
            lastError = await response.text();
            break;
          }

          const data: any = await response.json();
          const message = data.choices?.[0]?.message;
          const calls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];

          if (!calls.length) {
            return {
              source: 'openrouter',
              model,
              text: message?.content?.trim() || 'At your service, Sir.',
              toolCalls,
            };
          }

          messages.push(message);

          for (const call of calls) {
            const name = call?.function?.name || '';
            let args: Record<string, any> = {};
            try { args = JSON.parse(call?.function?.arguments || '{}'); } catch (_) {}

            let result: any;
            try {
              if (!AI_TOOL_NAMES.has(name) || !options.executeTool) {
                result = { success: false, error: `Tool ${name} is not available.` };
              } else {
                result = await options.executeTool(name, args);
              }
            } catch (error: any) {
              result = { success: false, error: error?.message || String(error) };
            }

            toolCalls.push({
              id: call?.id || `tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              name,
              arguments: args,
              result,
              status: result?.success === false ? 'failed' : 'success',
              timestamp: new Date().toISOString(),
            });

            messages.push({
              role: 'tool',
              tool_call_id: call?.id,
              content: JSON.stringify(result),
            });
          }
        }

        // Some providers reject one or more tool schemas while still accepting normal chat.
        // Keep JARVIS usable instead of surfacing a provider 400 to the UI.
        const plain = await this.plainFallback(messages, apiKey, [model, ...candidates.filter((candidate) => candidate !== model)]);
        if (plain) {
          return {
            source: 'openrouter',
            model: plain.model,
            text: plain.text,
            toolCalls,
          };
        }
      } catch (error: any) {
        lastError = error?.message || String(error);
      }
    }

    throw new Error(`OpenRouter could not process the request. ${lastError || 'No compatible model/provider was available.'}`);
  }
}

export const openRouter = new OpenRouterService();