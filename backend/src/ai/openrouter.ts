import { db } from '../database/store';

const OPENROUTER_MODEL = 'nvidia/nemotron-3.5-content-safety:free';
const REQUEST_TIMEOUT_MS = 45_000;

type ConversationMessage = { sender: 'user' | 'jarvis'; text: string };

export interface OpenRouterRequestOptions {
  prompt: string;
  conversationHistory?: ConversationMessage[];
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

export class OpenRouterService {
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
          'HTTP-Referer': process.env.APP_URL || 'https://jarvis-private.onrender.com',
          'X-Title': 'JARVIS NVIDIA Nemotron 3.5',
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
    if (!apiKey) {
      return {
        source: 'openrouter',
        model: OPENROUTER_MODEL,
        text: 'Sir, OPENROUTER_API_KEY is not configured on the server. Add your OpenRouter key in Render environment variables.',
        hindiText: 'श्रीमान, server पर OPENROUTER_API_KEY configured नहीं है। Render environment variables में OpenRouter key जोड़ें।',
        toolCalls: [],
      };
    }

    const memoryContext = db.getMemories().map((m) => `- ${m.key}: ${m.value}`).join('\n');
    const systemPrompt = `You are J.A.R.V.I.S., the personal AI command assistant for the user.
Use concise, direct, useful answers. Support English, Hindi, and natural Hinglish.
Do not pretend to perform computer actions. Direct desktop actions are handled by JARVIS local command routing and the Windows companion agent.
You are running through NVIDIA Nemotron 3.5 Content Safety on OpenRouter.
Active memories:\n${memoryContext}`;

    const conversation = (options.conversationHistory || [])
      .slice(-4)
      .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation,
      { role: 'user', content: options.prompt.trim() },
    ];

    const response = await this.request({
      model: OPENROUTER_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 512,
    }, apiKey);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter NVIDIA Error (${response.status}): ${errorText}`);
    }

    const data: any = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || 'At your service, Sir.';

    return {
      source: 'openrouter',
      model: OPENROUTER_MODEL,
      text,
      toolCalls: [],
    };
  }

  public async *streamResponse(options: OpenRouterRequestOptions): AsyncGenerator<string, void, unknown> {
    const apiKey = this.getApiKey(options.apiKey);
    if (!apiKey) {
      yield 'Sir, OPENROUTER_API_KEY is not configured on the server.';
      return;
    }

    const response = await this.request({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: 'You are JARVIS. Be concise, direct, safe, and helpful. Support English, Hindi, and Hinglish.' },
        { role: 'user', content: options.prompt.trim() },
      ],
      temperature: 0.2,
      max_tokens: 512,
    }, apiKey, true);

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      throw new Error(`OpenRouter NVIDIA stream error (${response.status}): ${errorText}`);
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
