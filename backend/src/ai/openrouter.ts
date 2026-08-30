import { JARVIS_TOOL_REGISTRY } from '../../../shared/tools';
import { toolService } from '../services/toolService';
import { db } from '../database/store';

const OPENROUTER_TOOLS_SCHEMA = JARVIS_TOOL_REGISTRY.map((tool) => ({
  type: 'function',
  function: { name: tool.name, description: tool.description, parameters: tool.parameters },
}));

export interface OpenRouterRequestOptions {
  prompt: string;
  conversationHistory?: Array<{ sender: 'user' | 'jarvis'; text: string }>;
  model?: string;
  apiKey?: string;
  language?: string;
}

export interface OpenRouterResponse {
  source: 'openrouter';
  model: string;
  text: string;
  hindiText?: string;
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, any>; result?: any; timestamp: string }>;
}

const REQUEST_TIMEOUT_MS = 45_000;

export class OpenRouterService {
  private defaultModel = 'openai/gpt-4o-mini';

  private getApiKey(overrideKey?: string): string {
    return (overrideKey || process.env.OPENROUTER_API_KEY || '').trim();
  }

  private async request(body: Record<string, any>, apiKey: string, stream = false): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.APP_URL || 'https://ai.studio',
          'X-Title': 'JARVIS OpenRouter Assistant',
        },
        body: JSON.stringify({ ...body, stream }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  public async sendMessage(options: OpenRouterRequestOptions): Promise<OpenRouterResponse> {
    const apiKey = this.getApiKey(options.apiKey);
    const model = options.model || process.env.OPENROUTER_MODEL || this.defaultModel;

    if (!apiKey) {
      return {
        source: 'openrouter', model,
        text: 'Sir, the OpenRouter neural link is ready but OPENROUTER_API_KEY is not configured on the server.',
        hindiText: 'श्रीमान, OpenRouter neural link तैयार है, लेकिन server पर OPENROUTER_API_KEY configured नहीं है।',
        toolCalls: [],
      };
    }

    const memoryContext = db.getMemories().map(m => `- ${m.key}: ${m.value}`).join('\n');
    const systemPrompt = `You are J.A.R.V.I.S., a fast personal AI desktop command center.
Use concise, direct responses. Speak fluent English, Hindi, and natural Hinglish. Match the user's language.
When the user asks you to take an action or research something, use the appropriate tool. Do not claim an action happened unless the tool result confirms it.
The cloud server cannot directly control the user's Windows desktop unless the Windows Local Agent is connected; when a tool reports that limitation, explain it clearly.
Active memories:\n${memoryContext}`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...(options.conversationHistory || []).slice(-4).map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
      { role: 'user', content: options.prompt },
    ];

    const response = await this.request({
      model,
      messages,
      tools: OPENROUTER_TOOLS_SCHEMA,
      tool_choice: 'auto',
      temperature: 0.35,
      max_tokens: 700,
    }, apiKey);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter Error (${response.status}): ${errorText}`);
    }

    const data: any = await response.json();
    const message = data.choices?.[0]?.message;
    const executedToolCalls: any[] = [];

    if (message?.tool_calls?.length) {
      messages.push(message);
      for (const tc of message.tool_calls) {
        let parsedArgs: Record<string, any> = {};
        try { parsedArgs = JSON.parse(tc.function.arguments || '{}'); } catch (_) {}

        const toolResult = await toolService.execute({ tool: tc.function.name, arguments: parsedArgs, confirmed: false });
        executedToolCalls.push({
          id: tc.id || `tc_${Date.now()}`,
          name: tc.function.name,
          arguments: parsedArgs,
          result: toolResult,
          timestamp: new Date().toISOString(),
        });
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(toolResult) });
      }

      const followUp = await this.request({
        model,
        messages,
        temperature: 0.35,
        max_tokens: 700,
      }, apiKey);

      if (followUp.ok) {
        const followData: any = await followUp.json();
        const synthesizedText = followData.choices?.[0]?.message?.content;
        if (synthesizedText) return { source: 'openrouter', model, text: synthesizedText, toolCalls: executedToolCalls };
      }
    }

    return {
      source: 'openrouter',
      model,
      text: message?.content || (executedToolCalls.length ? 'Action completed, Sir.' : 'At your service, Sir.'),
      toolCalls: executedToolCalls,
    };
  }

  public async *streamResponse(options: OpenRouterRequestOptions): AsyncGenerator<string, void, unknown> {
    const apiKey = this.getApiKey(options.apiKey);
    const model = options.model || process.env.OPENROUTER_MODEL || this.defaultModel;
    if (!apiKey) {
      yield 'Sir, OPENROUTER_API_KEY is not configured.';
      return;
    }

    const response = await this.request({
      model,
      messages: [{ role: 'system', content: 'You are JARVIS. Be concise, direct, and helpful.' }, { role: 'user', content: options.prompt }],
      temperature: 0.35,
      max_tokens: 700,
    }, apiKey, true);

    if (!response.ok || !response.body) throw new Error(`OpenRouter stream failed: ${response.status} ${response.statusText}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) yield chunk;
        } catch (_) {}
      }
    }
  }
}

export const openRouter = new OpenRouterService();
