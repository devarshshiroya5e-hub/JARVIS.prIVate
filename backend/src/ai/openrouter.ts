import { JARVIS_TOOL_REGISTRY } from '../../../shared/tools';
import { toolService } from '../services/toolService';
import { db } from '../database/store';

// Convert tool registry to OpenAI/OpenRouter tools format
const OPENROUTER_TOOLS_SCHEMA = JARVIS_TOOL_REGISTRY.map((tool) => ({
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
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
  toolCalls: Array<{
    id: string;
    name: string;
    arguments: Record<string, any>;
    result?: any;
    timestamp: string;
  }>;
}

export class OpenRouterService {
  private defaultModel = 'openai/gpt-4o';

  private getApiKey(overrideKey?: string): string {
    const key = overrideKey || process.env.OPENROUTER_API_KEY || '';
    return key.trim();
  }

  public async sendMessage(options: OpenRouterRequestOptions): Promise<OpenRouterResponse> {
    const apiKey = this.getApiKey(options.apiKey);
    const model = options.model || process.env.OPENROUTER_MODEL || this.defaultModel;
    const memories = db.getMemories();
    const memoryContext = memories.map(m => `- ${m.key}: ${m.value}`).join('\n');

    if (!apiKey) {
      return {
        source: 'openrouter',
        model,
        text: 'Sir, OpenRouter AI engine is active. Please configure your OPENROUTER_API_KEY in the Settings menu or environment to enable deep reasoning, web research, and live tool calling.',
        hindiText: 'श्रीमान, ओपनराउटर एआई सक्रिय है। कृपया सेटिंग्स में अपनी OpenRouter API Key दर्ज करें।',
        toolCalls: [],
      };
    }

    const systemPrompt = `You are J.A.R.V.I.S., the ultimate personal AI desktop operating system and Windows command center.
You control the user's PC, applications, files, browser automation (Playwright), volume, and system settings, and you perform comprehensive web research.
Your persona: Crisp, polite, highly intelligent, concise, and direct (iconic Jarvis: "Certainly Sir", "Right away", "At your service").
BILINGUAL SUPPORT: You speak both English and fluent Hindi (Devanagari script) or natural Hinglish. If user queries in Hindi, reply in Hindi. If English, reply in English.
TOOL DISPATCH: When asked to perform any computer action or research (open apps, launch URLs, manage files, take screenshot, get CPU metrics, deep research), ALWAYS invoke the corresponding tool.
Active Memories:
${memoryContext}`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...(options.conversationHistory || []).slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      })),
      { role: 'user', content: options.prompt },
    ];

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.APP_URL || 'https://ai.studio',
          'X-Title': 'JARVIS Windows Assistant',
        },
        body: JSON.stringify({
          model,
          messages,
          tools: OPENROUTER_TOOLS_SCHEMA,
          tool_choice: 'auto',
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter Error (${response.status}): ${errorText}`);
      }

      const data: any = await response.json();
      const choice = data.choices?.[0];
      const message = choice?.message;

      const executedToolCalls: any[] = [];

      // If the model called tools, execute them and perform a second synthesis turn
      if (message?.tool_calls && message.tool_calls.length > 0) {
        messages.push(message);

        for (const tc of message.tool_calls) {
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(tc.function.arguments || '{}');
          } catch (_) {}

          const toolResult = await toolService.execute({
            tool: tc.function.name,
            arguments: parsedArgs,
          });

          executedToolCalls.push({
            id: tc.id || `tc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: tc.function.name,
            arguments: parsedArgs,
            result: toolResult,
            timestamp: new Date().toISOString(),
          });

          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(toolResult),
          });
        }

        // Multi-turn synthesis pass
        try {
          const followUpRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': process.env.APP_URL || 'https://ai.studio',
              'X-Title': 'JARVIS Windows Assistant',
            },
            body: JSON.stringify({
              model,
              messages,
              temperature: 0.7,
            }),
          });

          if (followUpRes.ok) {
            const followUpData = await followUpRes.json();
            const synthesizedText = followUpData.choices?.[0]?.message?.content;
            if (synthesizedText) {
              return {
                source: 'openrouter',
                model,
                text: synthesizedText,
                toolCalls: executedToolCalls,
              };
            }
          }
        } catch (followErr) {
          console.warn('OpenRouter synthesis follow-up failed, falling back to initial summary', followErr);
        }
      }

      const replyText = message?.content || (executedToolCalls.length > 0 ? 'Action completed, Sir.' : 'At your service, Sir.');

      return {
        source: 'openrouter',
        model,
        text: replyText,
        toolCalls: executedToolCalls,
      };
    } catch (err: any) {
      console.error('OpenRouter processing error:', err);
      throw err;
    }
  }

  public async *streamResponse(options: OpenRouterRequestOptions): AsyncGenerator<string, void, unknown> {
    const apiKey = this.getApiKey(options.apiKey);
    const model = options.model || process.env.OPENROUTER_MODEL || this.defaultModel;

    if (!apiKey) {
      yield 'Sir, OpenRouter API key is required to stream responses. Please configure it in Settings.';
      return;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://ai.studio',
        'X-Title': 'JARVIS Windows Assistant Stream',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are JARVIS, concise and direct AI assistant.' },
          { role: 'user', content: options.prompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`OpenRouter stream failed: ${response.statusText}`);
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
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const chunk = parsed.choices?.[0]?.delta?.content;
            if (chunk) yield chunk;
          } catch (_) {}
        }
      }
    }
  }
}

export const openRouter = new OpenRouterService();
