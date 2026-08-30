import fs from 'fs';
import path from 'path';
import { MemoryEntry, AutomationRoutine } from '../../../shared/types';

interface StoreSchema {
  memories: MemoryEntry[];
  automations: AutomationRoutine[];
  settings: Record<string, any>;
}

const DATA_DIR = path.join(process.cwd(), '.jarvis_data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const DEFAULT_AUTOMATIONS: AutomationRoutine[] = [
  {
    id: 'start_work',
    name: 'Start Work Routine',
    description: 'Launch VS Code, Google Chrome development tools, and check system performance.',
    icon: 'briefcase',
    enabled: true,
    steps: [
      { id: 's1', tool: 'open_application', arguments: { application: 'code' }, description: 'Launch Visual Studio Code' },
      { id: 's2', tool: 'open_application', arguments: { application: 'chrome' }, description: 'Launch Google Chrome' },
      { id: 's3', tool: 'get_system_metrics', arguments: {}, description: 'Inspect PC telemetry' }
    ]
  },
  {
    id: 'media_chill',
    name: 'Music & Relaxation',
    description: 'Launch YouTube Music or Spotify and set audio volume.',
    icon: 'music',
    enabled: true,
    steps: [
      { id: 'm1', tool: 'open_url', arguments: { url: 'https://music.youtube.com' }, description: 'Open YouTube Music' },
      { id: 'm2', tool: 'press_key', arguments: { key: 'volumeup' }, description: 'Increase volume' }
    ]
  },
  {
    id: 'clean_workspace',
    name: 'Clean Workspace',
    description: 'Minimize all open windows and show the Windows Desktop clean slate.',
    icon: 'layout',
    enabled: true,
    steps: [
      { id: 'c1', tool: 'keyboard_shortcut', arguments: { keys: ['win', 'd'] }, description: 'Show Desktop' }
    ]
  }
];

const DEFAULT_MEMORIES: MemoryEntry[] = [
  {
    id: 'mem_1',
    key: 'user_name',
    value: 'Sir',
    category: 'preference',
    created: new Date().toISOString()
  },
  {
    id: 'mem_2',
    key: 'default_browser',
    value: 'Google Chrome',
    category: 'preference',
    created: new Date().toISOString()
  },
  {
    id: 'mem_3',
    key: 'project_directory',
    value: 'C:\\Users\\Desktop\\Projects',
    category: 'directory',
    created: new Date().toISOString()
  },
  {
    id: 'mem_4',
    key: 'agent_websocket_port',
    value: '8765',
    category: 'preference',
    created: new Date().toISOString()
  }
];

export class DatabaseStore {
  private data: StoreSchema = {
    memories: DEFAULT_MEMORIES,
    automations: DEFAULT_AUTOMATIONS,
    settings: {}
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = { ...this.data, ...JSON.parse(raw) };
      } else {
        this.persist();
      }
    } catch (e) {
      console.warn('Database initialization warning:', e);
    }
  }

  private persist() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist database:', e);
    }
  }

  // Memory Operations
  public getMemories(): MemoryEntry[] {
    return this.data.memories;
  }

  public addMemory(key: string, value: string, category: MemoryEntry['category'] = 'general'): MemoryEntry {
    const existingIndex = this.data.memories.findIndex(m => m.key.toLowerCase() === key.toLowerCase());
    const item: MemoryEntry = {
      id: existingIndex >= 0 ? this.data.memories[existingIndex].id : `mem_${Date.now()}`,
      key,
      value,
      category,
      created: existingIndex >= 0 ? this.data.memories[existingIndex].created : new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      this.data.memories[existingIndex] = item;
    } else {
      this.data.memories.push(item);
    }
    this.persist();
    return item;
  }

  public deleteMemory(id: string): boolean {
    const initialLen = this.data.memories.length;
    this.data.memories = this.data.memories.filter(m => m.id !== id && m.key !== id);
    this.persist();
    return this.data.memories.length < initialLen;
  }

  public clearAllMemories(): void {
    this.data.memories = [];
    this.persist();
  }

  // Automations Operations
  public getAutomations(): AutomationRoutine[] {
    return this.data.automations;
  }

  public getAutomation(id: string): AutomationRoutine | undefined {
    return this.data.automations.find(a => a.id === id || a.name.toLowerCase() === id.toLowerCase());
  }

  public saveAutomation(routine: AutomationRoutine): AutomationRoutine {
    const idx = this.data.automations.findIndex(a => a.id === routine.id);
    if (idx >= 0) {
      this.data.automations[idx] = routine;
    } else {
      this.data.automations.push(routine);
    }
    this.persist();
    return routine;
  }

  public deleteAutomation(id: string): boolean {
    const initial = this.data.automations.length;
    this.data.automations = this.data.automations.filter(a => a.id !== id);
    this.persist();
    return this.data.automations.length < initial;
  }
}

export const db = new DatabaseStore();
