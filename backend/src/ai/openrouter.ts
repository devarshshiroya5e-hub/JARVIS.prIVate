import { GoogleGenAI } from '@google/genai';
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
  source: 'openrouter' | 'gemini_fallback';
  model: string;
  text: string;
  hindiText?: string;
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, any>; result?: any; timestamp: string }>;
}

const REQUEST_TIMEOUT_MS = 45_000;
const GEMINI_TIMEOUT_MS = 30_000;

export class OpenRouterService {
  private defaultModel = 'openai/gpt-4o-mini';
  private geminiFallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite';

  private getApiKey(overrideKey?: string): string {
    return (overrideKey || process.env.OPENROUTER_API_KEY || '').trim();
  }

  private getGeminiKey(): string {
    return (process.env.GEMINI_API_KEY || '').trim();
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

  private async geminiFallback(options: OpenRouterRequestOptions, reason?: string): Promise<OpenRouterResponse> {
    const apiKey = this.getGeminiKey();
    const model = this.geminiFallbackModel;
    if (!apiKey) {
      const detail = reason ? ` OpenRouter fallback was triggered by: ${reason}.` : '';
      return {
        source: 'gemini_fallback',
        model,
        text: `Sir, the primary OpenRouter connection is unavailable and no GEMINI_API_KEY is configured on the server.${detail}`,
        hindiText: 'श्रीमान, OpenRouter connection उपलब्ध नहीं है और server पर GEMINI_API_KEY configured नहीं है।',
        toolCalls: [],
      };
    }

    const memoryContext = db.getMemories().map((m) => `- ${m.key}: ${m.value}`).join('\n');
    const systemInstruction = `You are J.A.R.V.I.S., a fast personal AI assistant.
Use concise, direct responses. Speak fluent English, Hindi, and natural Hinglish. Match the user's language.
Do not claim a computer action happened unless a tool result confirms it.
The cloud server cannot directly control the user's Windows desktop unless the Windows Local Agent is connected.
Active memories:\n${memoryContext}`;

    const conversation = (options.conversationHistory || [])
      .slice(-4)
      .map((m) => `${m.sender === 'user' ? 'User' : 'JARVIS'}: ${m.text}`)
      .join('\n');
    const prompt = `${conversation ? `${conversation}\n` : ''}User: ${options.prompt}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.35,
          maxOutputTokens: 700,
        },
      });
      const text = response.text?.trim() || 'At your service, Sir.';
      return {
        source: 'gemini_fallback',
        model,
        text,
        toolCalls: [],
      };
    } catch (error: any) {
      const message = error?.message || 'Gemini fallback failed.';
      throw new Error(`OpenRouter unavailable and Gemini fallback failed: ${message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  public async sendMessage(options: OpenRouterRequestOptions): Promise<OpenRouterResponse> {
    const apiKey = this.getApiKey(options.apiKey);
    const model = options.model || process.env.OPENROUTER_MODEL || this.defaultModel;

    if (!apiKey) return this.geminiFallback(options, 'OPENROUTER_API_KEY is not configured');

    const memoryContext = db.getMemories().map((m) => `- ${m.key}: ${m.value}`).join('\n');
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

    let response: Response;
    try {
      response = await this.request({
        model,
        messages,
        tools: OPENROUTER_TOOLS_SCHEMA,
        tool_choice: 'auto',
        temperature: 0.35,
        max_tokens: 700,
      }, apiKey);
    } catch (error: any) {
      return this.geminiFallback(options, error?.message || 'network failure');
    }

    if (!response.ok) {
      const errorText = await response.text();
      const reason = `OpenRouter HTTP ${response.status}`;
      if (response.status === 401 || response.status === 402 || response.status === 403 || response.status === 429 || response.status >= 500) {
        console.warn(`[AI] ${reason}; attempting Gemini fallback.`);
        return this.geminiFallback(options, reason);
      }
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
      const fallback = await this.geminiFallback(options, 'OPENROUTER_API_KEY is not configured');
      yield fallback.text;
      return;
    }

    let response: Response;
    try {
      response = await this.request({
        model,
        messages: [{ role: 'system', content: 'You are JARVIS. Be concise, direct, and helpful.' }, { role: 'user', content: options.prompt }],
        temperature: 0.35,
        max_tokens: 700,
      }, apiKey, true);
    } catch (error: any) {
      const fallback = await this.geminiFallback(options, error?.message || 'network failure');
      yield fallback.text;
      return;
    }

    if (!response.ok || !response.body) {
      if (response.status === 401 || response.status === 402 || response.status === 403 || response.status === 429 || response.status >= 500) {
        const fallback = await this.geminiFallback(options, `OpenRouter HTTP ${response.status}`);
        yield fallback.text;
        return;
      }
      throw new Error(`OpenRouter stream failed: ${response.status} ${response.statusText}`);
    }

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
