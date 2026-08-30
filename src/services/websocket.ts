import { WebSocketMessage } from '../../shared/types';

type MessageHandler = (message: WebSocketMessage) => void;
type StatusHandler = (connected: boolean, source: 'backend' | 'agent') => void;

type PendingRequest = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeoutId: number;
};

export class JarvisWebSocketClient {
  private agentWs: WebSocket | null = null;
  private backendWs: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private pendingRequests = new Map<string, PendingRequest>();
  private agentPort = 8765;
  private reconnectTimeout: number | null = null;
  private backendReconnectTimeout: number | null = null;
  private agentProbeTimeout: number | null = null;
  private agentConnected = false;
  private backendConnected = false;
  private reconnectAttempts = 0;
  private agentEnabled = false;

  constructor() {
    this.init();
  }

  public setAgentPort(port: number) {
    this.agentPort = port;
    if (this.agentEnabled) this.reconnectAgent();
  }

  public init() {
    this.connectBackend();
  }

  public enableAgent() {
    this.agentEnabled = true;
    this.reconnectAttempts = 0;
    this.probeAgent();
  }

  public disableAgent() {
    this.agentEnabled = false;
    if (this.agentProbeTimeout !== null) window.clearTimeout(this.agentProbeTimeout);
    this.agentProbeTimeout = null;
    if (this.reconnectTimeout !== null) window.clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
    try { this.agentWs?.close(); } catch (_) {}
    this.agentWs = null;
    if (this.agentConnected) {
      this.agentConnected = false;
      this.notifyStatus(false, 'agent');
      this.sendAgentStatusToBackend(false);
    }
  }

  public onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public onStatusChange(handler: StatusHandler) {
    handler(this.agentConnected, 'agent');
    handler(this.backendConnected, 'backend');
    return () => this.statusHandlers.delete(handler);
  }

  private connectBackend() {
    if (this.backendWs && (this.backendWs.readyState === WebSocket.OPEN || this.backendWs.readyState === WebSocket.CONNECTING)) return;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      this.backendWs = ws;

      ws.onopen = () => {
        this.backendConnected = true;
        this.notifyStatus(true, 'backend');
        this.sendAgentStatusToBackend(this.agentConnected);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WebSocketMessage;
          if (msg.type === 'execute_tool') {
            this.forwardBackendToolToAgent(msg);
            return;
          }
          this.resolvePending(msg);
          this.notifyMessage(msg);
        } catch (_) {}
      };

      ws.onclose = () => {
        this.backendConnected = false;
        this.notifyStatus(false, 'backend');
        for (const [requestId, pending] of this.pendingRequests) {
          window.clearTimeout(pending.timeoutId);
          pending.reject(new Error('JARVIS backend connection closed.'));
          this.pendingRequests.delete(requestId);
        }
        if (this.backendReconnectTimeout !== null) window.clearTimeout(this.backendReconnectTimeout);
        this.backendReconnectTimeout = window.setTimeout(() => {
          this.backendReconnectTimeout = null;
          this.connectBackend();
        }, 2000);
      };

      ws.onerror = () => {
        this.backendConnected = false;
        this.notifyStatus(false, 'backend');
      };
    } catch (_) {
      this.backendConnected = false;
      this.notifyStatus(false, 'backend');
    }
  }

  private async probeAgent() {
    if (!this.agentEnabled) return;
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 1200);
      const response = await fetch(`http://127.0.0.1:${this.agentPort}/api/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      if (response.ok) {
        this.connectAgent();
        return;
      }
    } catch (_) {}

    if (this.agentConnected) {
      this.agentConnected = false;
      this.notifyStatus(false, 'agent');
      this.sendAgentStatusToBackend(false);
    }

    if (this.agentProbeTimeout === null) {
      this.agentProbeTimeout = window.setTimeout(() => {
        this.agentProbeTimeout = null;
        this.probeAgent();
      }, 5000);
    }
  }

  private connectAgent() {
    if (!this.agentEnabled) return;
    if (this.agentWs && (this.agentWs.readyState === WebSocket.OPEN || this.agentWs.readyState === WebSocket.CONNECTING)) return;

    try {
      const agentUrl = `ws://127.0.0.1:${this.agentPort}/ws`;
      const ws = new WebSocket(agentUrl);
      this.agentWs = ws;

      ws.onopen = () => {
        this.agentConnected = true;
        this.reconnectAttempts = 0;
        this.notifyStatus(true, 'agent');
        this.sendAgentStatusToBackend(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WebSocketMessage;
          if (this.backendWs?.readyState === WebSocket.OPEN && (msg.type === 'tool_result' || msg.type === 'error')) {
            this.backendWs.send(JSON.stringify(msg));
          }
          this.notifyMessage(msg);
        } catch (_) {}
      };

      ws.onclose = () => {
        if (this.agentWs === ws) this.agentWs = null;
        const wasConnected = this.agentConnected;
        this.agentConnected = false;
        if (wasConnected) {
          this.notifyStatus(false, 'agent');
          this.sendAgentStatusToBackend(false);
        }
        this.scheduleAgentProbe();
      };

      ws.onerror = () => {
        // Do not generate noisy UI/console errors when the optional companion
        // disappears; the next health probe will discover it again.
        if (this.agentWs === ws) this.agentWs = null;
        if (this.agentConnected) {
          this.agentConnected = false;
          this.notifyStatus(false, 'agent');
          this.sendAgentStatusToBackend(false);
        }
      };
    } catch (_) {
      this.agentWs = null;
      this.agentConnected = false;
      this.scheduleAgentProbe();
    }
  }

  private scheduleAgentProbe() {
    if (!this.agentEnabled || this.agentProbeTimeout !== null) return;
    const delay = Math.min(1500 * Math.pow(1.4, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    this.agentProbeTimeout = window.setTimeout(() => {
      this.agentProbeTimeout = null;
      this.probeAgent();
    }, delay);
  }

  public reconnectAgent() {
    if (!this.agentEnabled) return;
    if (this.agentProbeTimeout !== null) window.clearTimeout(this.agentProbeTimeout);
    this.agentProbeTimeout = null;
    try { this.agentWs?.close(); } catch (_) {}
    this.agentWs = null;
    this.probeAgent();
  }

  public async processPrompt(prompt: string, conversationHistory: any[] = [], language = 'auto', apiKey = '', model = ''): Promise<any> {
    const requestId = `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    if (!this.backendWs || this.backendWs.readyState !== WebSocket.OPEN) {
      this.connectBackend();
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    }
    if (!this.backendWs || this.backendWs.readyState !== WebSocket.OPEN) {
      throw new Error('JARVIS backend is offline. Please refresh the page.');
    }

    const result = new Promise<any>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('JARVIS request timed out.'));
      }, 60_000);
      this.pendingRequests.set(requestId, { resolve, reject, timeoutId });
    });

    const msg: WebSocketMessage = {
      type: 'voice_transcript',
      requestId,
      timestamp: new Date().toISOString(),
      payload: {
        transcript: prompt,
        conversationHistory: conversationHistory.slice(-6),
        language,
        openRouterApiKey: apiKey,
        openRouterModel: model,
      },
    };
    this.backendWs.send(JSON.stringify(msg));
    return result;
  }

  private resolvePending(msg: WebSocketMessage) {
    const pending = this.pendingRequests.get(msg.requestId);
    if (!pending) return;
    if (msg.type !== 'jarvis_response' && msg.type !== 'error') return;
    window.clearTimeout(pending.timeoutId);
    this.pendingRequests.delete(msg.requestId);
    if (msg.type === 'error') pending.reject(new Error(msg.payload?.error || 'JARVIS processing failed.'));
    else pending.resolve(msg.payload || {});
  }

  private forwardBackendToolToAgent(msg: WebSocketMessage) {
    if (this.agentWs?.readyState === WebSocket.OPEN) {
      this.agentWs.send(JSON.stringify(msg));
      return;
    }
    const error: WebSocketMessage = {
      type: 'tool_result',
      requestId: msg.requestId,
      timestamp: new Date().toISOString(),
      payload: {
        tool: msg.payload?.tool,
        success: false,
        error: 'Windows Local Agent is offline. Start the JARVIS Windows agent to execute desktop actions.',
      },
    };
    if (this.backendWs?.readyState === WebSocket.OPEN) this.backendWs.send(JSON.stringify(error));
  }

  private sendAgentStatusToBackend(connected: boolean) {
    if (this.backendWs?.readyState !== WebSocket.OPEN) return;
    const msg: WebSocketMessage = {
      type: 'agent_status',
      requestId: `agent_status_${Date.now()}`,
      timestamp: new Date().toISOString(),
      payload: { status: connected ? 'connected' : 'disconnected', agentConnected: connected },
    };
    try { this.backendWs.send(JSON.stringify(msg)); } catch (_) {}
  }

  public send(message: Partial<WebSocketMessage>) {
    const fullMsg: WebSocketMessage = {
      type: message.type || 'execute_tool',
      requestId: message.requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      payload: message.payload || {},
    };
    const text = JSON.stringify(fullMsg);
    if (this.agentWs?.readyState === WebSocket.OPEN && fullMsg.type === 'execute_tool') {
      this.agentWs.send(text);
      return;
    }
    if (this.backendWs?.readyState === WebSocket.OPEN) this.backendWs.send(text);
  }

  private notifyMessage(msg: WebSocketMessage) {
    for (const handler of this.messageHandlers) handler(msg);
  }

  private notifyStatus(connected: boolean, source: 'backend' | 'agent') {
    for (const handler of this.statusHandlers) handler(connected, source);
  }

  public isAgentConnected() { return this.agentConnected; }
  public isBackendConnected() { return this.backendConnected; }
}

export const wsClient = new JarvisWebSocketClient();
