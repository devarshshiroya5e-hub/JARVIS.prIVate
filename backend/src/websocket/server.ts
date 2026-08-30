import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { WebSocketMessage } from '../../../shared/types';
import { commandRouter } from '../ai/router';
import { openRouter } from '../ai/openrouter';
import { toolService } from '../services/toolService';

export class JarvisWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private pendingToolCalls = new Map<string, { resolve: (value: any) => void; timeout: NodeJS.Timeout }>();

  public init(httpServer: HttpServer) {
    this.wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`[WS] Client connected. Total clients: ${this.clients.size}`);

      this.sendToClient(ws, {
        type: 'agent_status',
        requestId: `init_${Date.now()}`,
        timestamp: new Date().toISOString(),
        payload: {
          status: 'online',
          agentConnected: false,
          message: 'JARVIS Central Neural Link Online',
        },
      });

      ws.on('message', async (data: Buffer | string) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          await this.handleClientMessage(ws, message);
        } catch (e: any) {
          this.sendToClient(ws, {
            type: 'error',
            requestId: `err_${Date.now()}`,
            timestamp: new Date().toISOString(),
            payload: { error: `Invalid message format: ${e.message}` },
          });
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WS] Client disconnected. Remaining clients: ${this.clients.size}`);
      });

      ws.on('error', (err) => console.error('[WS] WebSocket error:', err));
    });
  }

  private async handleClientMessage(ws: WebSocket, message: WebSocketMessage) {
    const { type, requestId, payload } = message;

    switch (type) {
      case 'ping':
        this.sendToClient(ws, {
          type: 'pong',
          requestId,
          timestamp: new Date().toISOString(),
          payload: { time: Date.now() },
        });
        return;

      case 'agent_status':
        return;

      case 'tool_result': {
        const pending = this.pendingToolCalls.get(requestId);
        if (!pending) return;
        clearTimeout(pending.timeout);
        this.pendingToolCalls.delete(requestId);
        pending.resolve(payload);
        return;
      }

      case 'execute_tool': {
        // Direct browser request: keep existing permission checks and route to the
        // local agent first. The HTTP fallback remains available for dev tools.
        const { tool, arguments: args = {}, confirmed = false } = payload || {};
        const result = await toolService.execute({ tool, arguments: args, confirmed });
        this.sendToClient(ws, {
          type: 'tool_result',
          requestId,
          timestamp: new Date().toISOString(),
          payload: result,
        });
        return;
      }

      case 'voice_transcript': {
        const prompt = payload?.transcript || payload?.text || '';
        if (!prompt) return;

        try {
          // Fast deterministic desktop commands bypass the LLM.
          const localDecision = commandRouter.route(prompt);
          if (localDecision.isLocal && localDecision.tool) {
            const toolResult = await this.executeToolOnBrowser(ws, localDecision.tool, localDecision.args || {});
            const reply = toolResult?.success === false
              ? `${localDecision.immediateReply || 'I attempted that action.'} ${toolResult.error || 'The Windows agent is not available.'}`
              : localDecision.immediateReply || 'Action completed, Sir.';
            this.sendToClient(ws, {
              type: 'jarvis_response',
              requestId,
              timestamp: new Date().toISOString(),
              payload: {
                source: 'local_router',
                model: 'local-command-router',
                text: reply,
                hindiText: localDecision.hindiReply,
                toolCalls: [{
                  id: `call_${Date.now()}`,
                  name: localDecision.tool,
                  arguments: localDecision.args || {},
                  result: toolResult,
                  status: toolResult?.success === false ? 'failed' : 'success',
                  timestamp: new Date().toISOString(),
                }],
              },
            });
            return;
          }

          const aiResponse = await openRouter.sendMessage({
            prompt,
            conversationHistory: payload?.conversationHistory,
            model: payload?.openRouterModel,
            apiKey: payload?.openRouterApiKey,
            language: payload?.language,
            executeTool: (toolName, args) => this.executeToolOnBrowser(ws, toolName, args),
          });

          this.sendToClient(ws, {
            type: 'jarvis_response',
            requestId,
            timestamp: new Date().toISOString(),
            payload: {
              source: aiResponse.source,
              model: aiResponse.model,
              text: aiResponse.text,
              hindiText: aiResponse.hindiText,
              toolCalls: aiResponse.toolCalls,
            },
          });
        } catch (e: any) {
          this.sendToClient(ws, {
            type: 'error',
            requestId,
            timestamp: new Date().toISOString(),
            payload: { error: `AI Processing failed: ${e.message || 'Unknown error'}` },
          });
        }
        return;
      }

      default:
        console.log(`[WS] Unhandled message type: ${type}`);
    }
  }

  private async executeToolOnBrowser(ws: WebSocket, tool: string, args: Record<string, any>) {
    const toolRequestId = `tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = new Promise<any>((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingToolCalls.delete(toolRequestId);
        resolve({
          success: false,
          error: `Timed out waiting for Windows Local Agent while executing ${tool}.`,
        });
      }, 15_000);
      this.pendingToolCalls.set(toolRequestId, { resolve, timeout });
    });

    this.sendToClient(ws, {
      type: 'execute_tool',
      requestId: toolRequestId,
      timestamp: new Date().toISOString(),
      payload: {
        tool,
        arguments: args,
        confirmed: false,
        source: 'jarvis-ai',
      },
    });

    return result;
  }

  public sendToClient(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  }

  public broadcast(message: WebSocketMessage) {
    const serialized = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(serialized);
    }
  }
}

export const jarvisWs = new JarvisWebSocketServer();