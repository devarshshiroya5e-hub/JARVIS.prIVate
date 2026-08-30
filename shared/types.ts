/**
 * Shared Type Definitions and Protocol Schemas for JARVIS System
 */

export type ToolSafetyLevel = 'safe' | 'confirm' | 'always_confirm';

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'system' | 'input' | 'browser' | 'file' | 'telemetry' | 'research';
  safetyLevel: ToolSafetyLevel;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface WebSocketMessage<T = any> {
  type:
    | 'execute_tool'
    | 'tool_result'
    | 'system_metrics'
    | 'agent_status'
    | 'voice_transcript'
    | 'ai_stream_chunk'
    | 'ai_stream_end'
    | 'error'
    | 'ping'
    | 'pong'
    | 'confirm_action'
    | 'confirm_response';
  requestId: string;
  timestamp: string;
  payload: T;
}

export interface SystemMetrics {
  cpuUsage: number;
  cpuModel?: string;
  cpuCores?: number;
  ramUsage: number;
  ramUsedGb?: number;
  ramTotalGb?: number;
  gpuUsage?: number | null;
  gpuName?: string;
  diskUsage: number;
  diskFreeGb?: number;
  diskTotalGb?: number;
  networkDownMbps: number;
  networkUpMbps: number;
  batteryLevel?: number | null;
  batteryIsCharging?: boolean;
  activeWindow?: string;
  osName: string;
  uptimeSeconds?: number;
  timestamp: string;
}

export interface ToolExecutionRequest {
  tool: string;
  arguments: Record<string, any>;
  confirmed?: boolean;
}

export interface ToolExecutionResult {
  tool: string;
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  executionTimeMs?: number;
}

export interface AutomationStep {
  id: string;
  tool: string;
  arguments: Record<string, any>;
  description: string;
  delayMs?: number;
}

export interface AutomationRoutine {
  id: string;
  name: string;
  description: string;
  icon?: string;
  enabled: boolean;
  steps: AutomationStep[];
  shortcut?: string;
  lastRun?: string;
}

export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  category: 'preference' | 'directory' | 'workflow' | 'credential_hint' | 'general';
  created: string;
  lastAccessed?: string;
}

export type AICoreState =
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'EXECUTING'
  | 'SPEAKING'
  | 'ERROR'
  | 'OFFLINE';
