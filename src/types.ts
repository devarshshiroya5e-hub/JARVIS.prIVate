export type JarvisStatus = 'IDLE' | 'LISTENING' | 'THINKING' | 'EXECUTING' | 'SPEAKING' | 'ERROR' | 'OFFLINE';

export type LanguageMode = 'en' | 'hi' | 'auto';

export interface SystemMetrics {
  cpuUsage: number;
  cpuModel: string;
  cpuCores: number;
  ramTotal: number;
  ramUsed: number;
  ramFree: number;
  ramUsagePercent: number;
  diskTotal: number;
  diskUsed: number;
  diskFree: number;
  diskUsagePercent: number;
  networkUploadSpeed: number; // KB/s
  networkDownloadSpeed: number; // KB/s
  osName: string;
  osRelease: string;
  osArch: string;
  hostname: string;
  uptime: number;
  batteryPercent?: number | null;
  isCharging?: boolean | null;
  activeWindow?: string;
  temperature?: number | null;
  processes: ProcessInfo[];
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  status: 'pending' | 'success' | 'failed' | 'requires_confirmation';
  error?: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'jarvis' | 'system';
  text: string;
  hindiText?: string;
  timestamp: string;
  toolCalls?: ToolCallInfo[];
  screenshotUrl?: string;
  status?: 'sending' | 'thinking' | 'done' | 'error';
  isLocalFastCommand?: boolean;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  type: 'voice' | 'intent' | 'tool' | 'system' | 'safety' | 'error' | 'routine';
  title: string;
  detail?: string;
  status: 'info' | 'success' | 'warning' | 'error' | 'pending';
  toolName?: string;
}

export interface MemoryItem {
  id: string;
  category: 'preference' | 'application' | 'directory' | 'credential' | 'workflow' | 'fact';
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRoutine {
  id: string;
  name: string;
  nameHindi?: string;
  description: string;
  iconName: string;
  category: 'work' | 'coding' | 'media' | 'system' | 'custom';
  enabled: boolean;
  steps: AutomationStep[];
}

export interface AutomationStep {
  id: string;
  toolName: string;
  args: Record<string, any>;
  description: string;
  delayMs?: number;
  requiresConfirmation?: boolean;
}

export interface SafetyConfirmationRequest {
  id: string;
  level: 'CONFIRMATION_REQUIRED' | 'ALWAYS_CONFIRM';
  toolName: string;
  args: Record<string, any>;
  reason: string;
  warningText: string;
  callbackId: string;
  timestamp: string;
}

export interface AppSettings {
  aiProvider: 'openrouter' | 'gemini';
  openRouterApiKey: string;
  openRouterModel: string;
  geminiModel: string;
  agentHost?: string;
  agentPort?: number;
  language: LanguageMode;
  wakeWord?: string;
  wakeWordEnabled: boolean;
  voiceGender: 'male' | 'female';
  voicePitch: number;
  voiceRate: number;
  voiceVolume?: number;
  pushToTalkKey?: string;
  soundEffectsEnabled?: boolean;
  autoSpeakResponses?: boolean;
  safetyLevel?: 'strict' | 'standard' | 'relaxed';
  requireConfirmForDangerous?: boolean;
  appPaths?: Record<string, string>;
}

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  updatedAt: string;
  extension?: string;
}
