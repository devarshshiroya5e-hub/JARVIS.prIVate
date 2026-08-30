import { db } from '../database/store';
import { JARVIS_TOOL_REGISTRY } from '../../../shared/tools';

const DEFAULT_OPENROUTER_MODEL = 'minimax/minimax-m3:free';
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_TOOL_ROUNDS = 4;

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
  'browser_open',
  'browser_click',
  'browser_type',
  'browser_press',
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

const OPENROUTER_TOOLS = JARVIS_TOOL_REGISTRY
  .filter((tool) => AI_TOOL_NAMES.has(tool.name) && tool.safetyLevel === 'safe')
  .map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));

type ConversationMessage = { sender: 'user' | 'jarvis' | 'assistant'; text: string };

type ToolCallInfo = {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  status: 'success' | 'failed';
  timestamp: string;
};

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

function isKnownBrokenModel(model: string) {
  const normalized = model.trim().toLowerCase();
  return !normalized || normalized.includes('content-safety') || normalized.includes('guardrail');
}

function resolveModel(requested?: string) {
  const candidates = [requested, process.env.OPENROUTER_MODEL, DEFAULT_OPENROUTER_MODEL];
  for (const candidate of candidates) {
    if (candidate && !isKnownBrokenModel(candidate)) return candidate.trim();
  }
  return DEFAULT_OPENROUTER_MODEL;
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
    const language = options.language || 'auto';
    const systemPrompt = `You are J.A.R.V.I.S., the user's personal Windows AI command assistant.
Be concise, intelligent, polite, and action-oriented. Support English, Hindi, and natural Hinglish.
When a request requires a desktop action, use the available tool instead of merely describing what the user could do.
Never claim a desktop action succeeded unless the tool result reports success.
For dangerous operations such as shutdown, restart, deletion, or sleep, do not invoke the tool unless the user has explicitly confirmed it through the UI.
Language preference: ${language}.
Known user memories:\n${memoryContext || '(none)'}`;

    const history = (options.conversationHistory || [])
      .slice(-8)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    return [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: options.prompt.trim() },
    ];
  }

  public async sendMessage(options: OpenRouterRequestOptions): Promise<OpenRouterResponse> {
    const apiKey = this.getApiKey(options.apiKey);
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured. Add your OpenRouter key in JARVIS Settings or the Render environment.');
    }

    let model = resolveModel(options.model);
    let messages: any[] = this.buildMessages(options);
    const toolCalls: ToolCallInfo[] = [];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      let response = await this.request({
        model,
        messages,
        tools: OPENROUTER_TOOLS,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 1024,
      }, apiKey);

      if (!response.ok) {
        const errorText = await response.text();
        const isToolOrModelError = response.status === 400 && /tool|function|model|badrequest|unsupported/i.test(errorText);
        if (isToolOrModelError && model !== DEFAULT_OPENROUTER_MODEL) {
          model = DEFAULT_OPENROUTER_MODEL;
          response = await this.request({
            model,
            messages,
            tools: OPENROUTER_TOOLS,
            tool_choice: 'auto',
            temperature: 0.2,
            max_tokens: 1024,
          }, apiKey);
        }

        if (!response.ok) {
          const retryError = await response.text();
          const plainResponse = await this.request({
            model: DEFAULT_OPENROUTER_MODEL,
            messages,
            temperature: 0.2,
            max_tokens: 1024,
          }, apiKey);
          if (plainResponse.ok) {
            const plainData: any = await plainResponse.json();
            return {
              source: 'openrouter',
              model: DEFAULT_OPENROUTER_MODEL,
              text: plainData.choices?.[0]?.message?.content?.trim() || 'I am online, Sir, but the tool interface needs attention.',
              toolCalls,
            };
          }
          throw new Error(`OpenRouter error (${response.status}): ${retryError || errorText}`);
        }
      }

      const data: any = await response.json();
      const message = data.choices?.[0]?.message;
      const calls = message?.tool_calls || [];

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
        try {
          args = JSON.parse(call?.function?.arguments || '{}');
        } catch (_) {}

        let result: any;
        try {
          if (!AI_TOOL_NAMES.has(name) || !options.executeTool) {
            result = { success: false, error: `Tool ${name} is not available in this execution context.` };
          } else {
            result = await options.executeTool(name, args);
          }
        } catch (error: any) {
          result = { success: false, error: error?.message || String(error) };
        }

        const toolCallInfo: ToolCallInfo = {
          id: call?.id || `tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name,
          arguments: args,
          result,
          status: result?.success === false ? 'failed' : 'success',
          timestamp: new Date().toISOString(),
        };
        toolCalls.push(toolCallInfo);

        messages.push({
          role: 'tool',
          tool_call_id: call?.id,
          content: JSON.stringify(result),
        });
      }
    }

    return {
      source: 'openrouter',
      model,
      text: 'I completed the requested tool steps, Sir.',
      toolCalls,
    };
  }
}

export const openRouter = new OpenRouterService();