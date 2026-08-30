import { WebSocketMessage } from '../../shared/types';

type MessageHandler = (message: WebSocketMessage) => void;
type StatusHandler = (connected: boolean, source: 'backend' | 'agent') => void;

export class JarvisWebSocketClient {
  private agentWs: WebSocket | null = null;
  private backendWs: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private agentPort = 8765;
  private reconnectTimeout: number | null = null;
  private backendReconnectTimeout: number | null = null;
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
    // The Windows bridge is optional. Do not open localhost:8765 on every
    // page load when the companion agent is not installed/running.
  }

  public enableAgent() {
    this.agentEnabled = true;
    this.reconnectAttempts = 0;
    this.reconnectAgent();
  }

  public disableAgent() {
    this.agentEnabled = false;
    if (this.reconnectTimeout !== null) window.clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
    try { this.agentWs?.close(); } catch (_) {}
    this.agentWs = null;
    if (this.agentConnected) {
      this.agentConnected = false;
      this.notifyStatus(false, 'agent');
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
      this.backendWs = new WebSocket(wsUrl);

      this.backendWs.onopen = () => {
        this.backendConnected = true;
        this.notifyStatus(true, 'backend');
      };

      this.backendWs.onmessage = (event) => {
        try { this.notifyMessage(JSON.parse(event.data) as WebSocketMessage); } catch (_) {}
      };

      this.backendWs.onclose = () => {
        this.backendConnected = false;
        this.notifyStatus(false, 'backend');
        if (this.backendReconnectTimeout !== null) window.clearTimeout(this.backendReconnectTimeout);
        this.backendReconnectTimeout = window.setTimeout(() => {
          this.backendReconnectTimeout = null;
          this.connectBackend();
        }, 3000);
      };

      this.backendWs.onerror = () => {
        this.backendConnected = false;
        this.notifyStatus(false, 'backend');
      };
    } catch (_) {
      this.backendConnected = false;
      this.notifyStatus(false, 'backend');
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
      };

      ws.onmessage = (event) => {
        try { this.notifyMessage(JSON.parse(event.data) as WebSocketMessage); } catch (_) {}
      };

      ws.onclose = () => {
        if (this.agentWs === ws) this.agentWs = null;
        const wasConnected = this.agentConnected;
        this.agentConnected = false;
        if (wasConnected) this.notifyStatus(false, 'agent');
        this.scheduleAgentReconnect();
      };

      // Deliberately do not log or surface localhost connection failures.
      // The companion is optional and may simply be stopped/uninstalled.
      ws.onerror = () => {
        if (this.agentConnected) {
          this.agentConnected = false;
          this.notifyStatus(false, 'agent');
        }
      };
    } catch (_) {
      this.agentWs = null;
      this.agentConnected = false;
      this.scheduleAgentReconnect();
    }
  }

  private scheduleAgentReconnect() {
    if (!this.agentEnabled || this.reconnectTimeout !== null) return;
    const delay = Math.min(5000 * Math.pow(1.5, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connectAgent();
    }, delay);
  }

  public reconnectAgent() {
    if (!this.agentEnabled) return;
    if (this.reconnectTimeout !== null) window.clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
    try { this.agentWs?.close(); } catch (_) {}
    this.agentWs = null;
    this.connectAgent();
  }

  public send(message: Partial<WebSocketMessage>) {
    const fullMsg: WebSocketMessage = {
      type: message.type || 'execute_tool',
      requestId: message.requestId || `req_${Date.now()}`,
      timestamp: new Date().toISOString(),
      payload: message.payload || {},
    };
    const text = JSON.stringify(fullMsg);

    if (this.agentWs?.readyState === WebSocket.OPEN) {
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
