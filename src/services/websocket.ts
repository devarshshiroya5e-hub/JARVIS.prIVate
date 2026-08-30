import { WebSocketMessage, SystemMetrics } from '../../shared/types';

type MessageHandler = (message: WebSocketMessage) => void;
type StatusHandler = (connected: boolean, source: 'backend' | 'agent') => void;

export class JarvisWebSocketClient {
  private agentWs: WebSocket | null = null;
  private backendWs: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private agentPort: number = 8765;
  private reconnectTimeout: any = null;
  private agentConnected: boolean = false;
  private backendConnected: boolean = false;
  private reconnectAttempts: number = 0;

  constructor() {
    this.init();
  }

  public setAgentPort(port: number) {
    this.agentPort = port;
    this.reconnectAgent();
  }

  public init() {
    this.connectBackend();
    this.connectAgent();
  }

  public onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public onStatusChange(handler: StatusHandler) {
    this.statusHandlers.add(handler);
    // Send immediate initial status
    handler(this.agentConnected, 'agent');
    handler(this.backendConnected, 'backend');
    return () => this.statusHandlers.delete(handler);
  }

  private connectBackend() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      this.backendWs = new WebSocket(wsUrl);

      this.backendWs.onopen = () => {
        this.backendConnected = true;
        this.notifyStatus(true, 'backend');
      };

      this.backendWs.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          this.notifyMessage(msg);
        } catch (_) {}
      };

      this.backendWs.onclose = () => {
        this.backendConnected = false;
        this.notifyStatus(false, 'backend');
        setTimeout(() => this.connectBackend(), 3000);
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
    try {
      const agentUrl = `ws://127.0.0.1:${this.agentPort}/ws`;
      this.agentWs = new WebSocket(agentUrl);

      this.agentWs.onopen = () => {
        this.agentConnected = true;
        this.reconnectAttempts = 0;
        this.notifyStatus(true, 'agent');
      };

      this.agentWs.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          this.notifyMessage(msg);
        } catch (_) {}
      };

      this.agentWs.onclose = () => {
        this.agentConnected = false;
        this.notifyStatus(false, 'agent');
        this.scheduleAgentReconnect();
      };

      this.agentWs.onerror = () => {
        this.agentConnected = false;
        this.notifyStatus(false, 'agent');
      };
    } catch (_) {
      this.agentConnected = false;
      this.notifyStatus(false, 'agent');
      this.scheduleAgentReconnect();
    }
  }

  private scheduleAgentReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    // Exponential backoff capped at 8 seconds
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      this.connectAgent();
    }, delay);
  }

  public reconnectAgent() {
    if (this.agentWs) {
      try { this.agentWs.close(); } catch (_) {}
    }
    this.connectAgent();
  }

  public send(message: Partial<WebSocketMessage>) {
    const fullMsg: WebSocketMessage = {
      type: message.type || 'execute_tool',
      requestId: message.requestId || `req_${Date.now()}`,
      timestamp: new Date().toISOString(),
      payload: message.payload || {}
    };

    const text = JSON.stringify(fullMsg);

    // Prefer native Windows local agent connection if alive
    if (this.agentWs && this.agentWs.readyState === WebSocket.OPEN) {
      this.agentWs.send(text);
      return;
    }

    // Fallback to backend WebSocket server
    if (this.backendWs && this.backendWs.readyState === WebSocket.OPEN) {
      this.backendWs.send(text);
    }
  }

  private notifyMessage(msg: WebSocketMessage) {
    for (const handler of this.messageHandlers) {
      handler(msg);
    }
  }

  private notifyStatus(connected: boolean, source: 'backend' | 'agent') {
    for (const handler of this.statusHandlers) {
      handler(connected, source);
    }
  }

  public isAgentConnected() {
    return this.agentConnected;
  }

  public isBackendConnected() {
    return this.backendConnected;
  }
}

export const wsClient = new JarvisWebSocketClient();
