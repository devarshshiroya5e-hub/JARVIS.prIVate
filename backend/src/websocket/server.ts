import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { WebSocketMessage } from '../../../shared/types';
import { commandRouter } from '../ai/router';
import { openRouter } from '../ai/openrouter';
import { toolService } from '../services/toolService';

export class JarvisWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private localAgentWs: WebSocket | null = null;

  public init(httpServer: HttpServer) {
    this.wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.clients.add(ws);
      console.log(`[WS] Client connected. Total clients: ${this.clients.size}`);

      // Send initial welcome & status
      this.sendToClient(ws, {
        type: 'agent_status',
        requestId: `init_${Date.now()}`,
        timestamp: new Date().toISOString(),
        payload: {
          status: 'online',
          agentConnected: this.localAgentWs !== null && this.localAgentWs.readyState === WebSocket.OPEN,
          message: 'JARVIS Central Neural Link Online'
        }
      });

      ws.on('message', async (data: Buffer | string) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          await this.handleClientMessage(ws, message);
        } catch (e: any) {
          this.sendToClient(ws, {
            type: 'error',
            requestId: 'err',
            timestamp: new Date().toISOString(),
            payload: { error: `Invalid message format: ${e.message}` }
          });
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WS] Client disconnected. Remaining: ${this.clients.size}`);
      });

      ws.on('error', (err) => {
        console.error('[WS] WebSocket error:', err);
      });
    });

    // Attempt connecting to the local Windows agent WebSocket if running on host
    this.connectToLocalAgent();
  }

  private connectToLocalAgent() {
    try {
      const agentUrl = 'ws://127.0.0.1:8765';
      const ws = new WebSocket(agentUrl);

      ws.on('open', () => {
        console.log('[WS-Agent] Connected directly to Windows Local Agent on ws://127.0.0.1:8765');
        this.localAgentWs = ws;
        this.broadcast({
          type: 'agent_status',
          requestId: `agent_conn_${Date.now()}`,
          timestamp: new Date().toISOString(),
          payload: { status: 'connected', agentConnected: true }
        });
      });

      ws.on('message', (data: Buffer | string) => {
        try {
          const parsed = JSON.parse(data.toString());
          // Relay agent events (e.g. system metrics, voice transcripts) to all web clients
          this.broadcast(parsed);
        } catch (_) {}
      });

      ws.on('close', () => {
        this.localAgentWs = null;
        // Retry with backoff
        setTimeout(() => this.connectToLocalAgent(), 5000);
      });

      ws.on('error', () => {
        this.localAgentWs = null;
      });
    } catch (_) {
      this.localAgentWs = null;
    }
  }

  private async handleClientMessage(ws: WebSocket, message: WebSocketMessage) {
    const { type, requestId, payload } = message;

    switch (type) {
      case 'ping': {
        this.sendToClient(ws, {
          type: 'pong',
          requestId,
          timestamp: new Date().toISOString(),
          payload: { time: Date.now() }
        });
        break;
      }

      case 'execute_tool': {
        const { tool, arguments: args = {}, confirmed = false } = payload || {};
        const result = await toolService.execute({ tool, arguments: args, confirmed });

        this.sendToClient(ws, {
          type: 'tool_result',
          requestId,
          timestamp: new Date().toISOString(),
          payload: result
        });
        break;
      }

      case 'voice_transcript': {
        const prompt = payload.transcript || payload.text || '';
        if (!prompt) return;

        // 1. Check local command router first for ultra-low latency
        const localDecision = commandRouter.route(prompt);

        if (localDecision.isLocal && localDecision.tool) {
          const toolResult = await toolService.execute({
            tool: localDecision.tool,
            arguments: localDecision.args || {},
          });

          this.sendToClient(ws, {
            type: 'tool_result',
            requestId,
            timestamp: new Date().toISOString(),
            payload: {
              source: 'local_router',
              tool: localDecision.tool,
              arguments: localDecision.args,
              result: toolResult,
              reply: localDecision.immediateReply,
              hindiReply: localDecision.hindiReply
            }
          });
          return;
        }

        // 2. Delegate to OpenRouter for deep reasoning & tool calling
        try {
          const aiResponse = await openRouter.sendMessage({
            prompt,
            conversationHistory: payload.conversationHistory,
            model: payload.model,
            apiKey: payload.openRouterApiKey,
            language: payload.language
          });

          this.sendToClient(ws, {
            type: 'tool_result',
            requestId,
            timestamp: new Date().toISOString(),
            payload: {
              source: 'openrouter',
              model: aiResponse.model,
              reply: aiResponse.text,
              hindiReply: aiResponse.hindiText,
              toolCalls: aiResponse.toolCalls
            }
          });
        } catch (e: any) {
          this.sendToClient(ws, {
            type: 'error',
            requestId,
            timestamp: new Date().toISOString(),
            payload: { error: `AI Processing failed: ${e.message}` }
          });
        }
        break;
      }

      default:
        console.log(`[WS] Unhandled message type: ${type}`);
    }
  }

  public sendToClient(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public broadcast(message: WebSocketMessage) {
    const serialized = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    }
  }
}

export const jarvisWs = new JarvisWebSocketServer();
