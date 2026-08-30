import express from 'express';
import http from 'http';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { exec, execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import dotenv from 'dotenv';
import { jarvisWs } from './backend/src/websocket/server';
import { db } from './backend/src/database/store';

dotenv.config();

const app = express();
// Render assigns the public port through the PORT environment variable.
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy init Gemini SDK
let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment.');
    }
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Persistent In-Memory & File Store for Settings, Memory, Automations
const DATA_DIR = path.join(process.cwd(), '.jarvis_data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const MEMORY_FILE = path.join(DATA_DIR, 'memory.json');
const AUTOMATIONS_FILE = path.join(DATA_DIR, 'automations.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Default Memories
let memories: any[] = [
  {
    id: 'mem_1',
    category: 'application',
    key: 'Preferred Code Editor',
    value: 'Visual Studio Code (code)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem_2',
    category: 'application',
    key: 'Preferred Browser',
    value: 'Google Chrome (chrome.exe)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem_3',
    category: 'directory',
    key: 'Projects Directory',
    value: 'C:\\Users\\User\\Projects',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem_4',
    category: 'preference',
    key: 'Voice & Language Preference',
    value: 'Bilingual (English & Hindi / हिंग्लिश)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem_5',
    category: 'fact',
    key: 'Assistant Persona',
    value: 'J.A.R.V.I.S. (Just A Rather Very Intelligent System) - ultra-fast, professional, light command center',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Default Automations
let automations: any[] = [
  {
    id: 'auto_work',
    name: 'Start Work Setup',
    nameHindi: 'काम शुरू करें (वर्क मोड)',
    description: 'Launches VS Code, Chrome, Terminal, and checks system performance.',
    iconName: 'Briefcase',
    category: 'work',
    enabled: true,
    steps: [
      { id: 's1', toolName: 'open_application', args: { appName: 'code' }, description: 'Open Visual Studio Code' },
      { id: 's2', toolName: 'open_url', args: { url: 'https://mail.google.com' }, description: 'Open Work Email (Gmail)' },
      { id: 's3', toolName: 'open_application', args: { appName: 'terminal' }, description: 'Open Command Terminal' },
      { id: 's4', toolName: 'get_system_metrics', args: {}, description: 'Verify CPU and RAM load' },
    ],
  },
  {
    id: 'auto_coding',
    name: 'Full-Stack Coding Session',
    nameHindi: 'कोडिंग सेशन शुरू करें',
    description: 'Opens project workspace, GitHub, and sets up developer environment.',
    iconName: 'Code2',
    category: 'coding',
    enabled: true,
    steps: [
      { id: 'c1', toolName: 'open_application', args: { appName: 'code' }, description: 'Launch Code Editor' },
      { id: 'c2', toolName: 'open_url', args: { url: 'https://github.com' }, description: 'Open GitHub Dashboard' },
      { id: 'c3', toolName: 'search_web', args: { query: 'Latest AI developer updates' }, description: 'Fetch latest documentation' },
    ],
  },
  {
    id: 'auto_media',
    name: 'Entertainment & Music',
    nameHindi: 'मनोरंजन और संगीत',
    description: 'Launches YouTube / Spotify and sets optimal audio volume.',
    iconName: 'Headphones',
    category: 'media',
    enabled: true,
    steps: [
      { id: 'm1', toolName: 'open_url', args: { url: 'https://music.youtube.com' }, description: 'Open YouTube Music' },
      { id: 'm2', toolName: 'press_key', args: { key: 'VolumeUp' }, description: 'Adjust System Volume' },
    ],
  },
  {
    id: 'auto_diag',
    name: 'System Health Diagnostics',
    nameHindi: 'सिस्टम डायग्नोस्टिक्स',
    description: 'Inspects CPU, RAM, Disk usage and active processes.',
    iconName: 'Activity',
    category: 'system',
    enabled: true,
    steps: [
      { id: 'd1', toolName: 'get_system_metrics', args: {}, description: 'Check Hardware Statistics' },
      { id: 'd2', toolName: 'list_files', args: { directory: '.' }, description: 'Scan working directory' },
    ],
  },
];

// Load persisted data if available
try {
  if (fs.existsSync(MEMORY_FILE)) {
    memories = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
  }
  if (fs.existsSync(AUTOMATIONS_FILE)) {
    automations = JSON.parse(fs.readFileSync(AUTOMATIONS_FILE, 'utf-8'));
  }
} catch (e) {
  console.warn('Error loading persisted data, using defaults', e);
}

function saveMemory() {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
  } catch (e) {
    console.error('Failed to save memory', e);
  }
}

function saveAutomations() {
  try {
    fs.writeFileSync(AUTOMATIONS_FILE, JSON.stringify(automations, null, 2));
  } catch (e) {
    console.error('Failed to save automations', e);
  }
}

// ----------------------------------------------------
// System Metrics Helper
// ----------------------------------------------------
let previousCpuTime: { idle: number; total: number } | null = null;

function getCpuUsage(): number {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += (cpu.times as any)[type];
    }
    totalIdle += cpu.times.idle;
  });

  if (!previousCpuTime) {
    previousCpuTime = { idle: totalIdle, total: totalTick };
    return Math.min(100, Math.max(5, Math.round(Math.random() * 20 + 10)));
  }

  const idleDiff = totalIdle - previousCpuTime.idle;
  const totalDiff = totalTick - previousCpuTime.total;
  previousCpuTime = { idle: totalIdle, total: totalTick };

  if (totalDiff <= 0) return 15;
  const percentage = 100 - Math.round((100 * idleDiff) / totalDiff);
  return Math.min(100, Math.max(1, percentage));
}

// ----------------------------------------------------
// Tool Definitions for AI (OpenRouter & Gemini)
// ----------------------------------------------------
const JARVIS_TOOLS: FunctionDeclaration[] = [
  {
    name: 'open_application',
    description: 'Launch a Windows application by name or executable path (e.g., chrome, code, notepad, spotify, discord, calc, explorer, terminal).',
    parameters: {
      type: Type.OBJECT,
      properties: { appName: { type: Type.STRING } },
      required: ['appName'],
    },
  },
  {
    name: 'open_url',
    description: 'Open a website or URL in the default browser.',
    parameters: {
      type: Type.OBJECT,
      properties: { url: { type: Type.STRING } },
      required: ['url'],
    },
  },
  {
    name: 'search_web',
    description: 'Search the web for current information.',
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING } },
      required: ['query'],
    },
  },
  {
    name: 'read_web_page',
    description: 'Read information from a URL.',
    parameters: {
      type: Type.OBJECT,
      properties: { url: { type: Type.STRING } },
      required: ['url'],
    },
  },
  {
    name: 'deep_research',
    description: 'Research a topic and return a detailed summary.',
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING } },
      required: ['query'],
    },
  },
  {
    name: 'take_screenshot',
    description: 'Capture a screenshot from the connected Windows PC.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'get_system_metrics',
    description: 'Get current CPU, RAM and system metrics.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'press_key',
    description: 'Press a keyboard key on the connected Windows PC.',
    parameters: {
      type: Type.OBJECT,
      properties: { key: { type: Type.STRING } },
      required: ['key'],
    },
  },
  {
    name: 'type_text',
    description: 'Type text on the connected Windows PC.',
    parameters: {
      type: Type.OBJECT,
      properties: { text: { type: Type.STRING } },
      required: ['text'],
    },
  },
  {
    name: 'lock_pc',
    description: 'Lock the connected Windows PC.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'list_files',
    description: 'List files in a directory on the connected PC.',
    parameters: {
      type: Type.OBJECT,
      properties: { directory: { type: Type.STRING } },
      required: ['directory'],
    },
  },
  {
    name: 'execute_automation',
    description: 'Execute a saved JARVIS automation routine.',
    parameters: {
      type: Type.OBJECT,
      properties: { routineId: { type: Type.STRING } },
      required: ['routineId'],
    },
  },
];

function executeToolDirectly(toolName: string, args: Record<string, any>) {
  if (toolName === 'get_system_metrics') {
    return { success: true, message: 'System metrics are available through the API.' };
  }
  if (toolName === 'open_url') {
    return { success: true, action: 'open_url', url: args.url };
  }
  if (toolName === 'execute_automation') {
    return { success: true, action: 'execute_automation', routineId: args.routineId };
  }
  return { success: true, action: toolName, args };
}

function matchDirectCommand(input: string) {
  const text = input.toLowerCase();

  if (text.includes('search google for ') || text.includes('google search ')) {
    const q = text.replace('search google for ', '').replace('google search ', '').trim();
    return {
      matched: true,
      toolName: 'search_web',
      args: { query: q, engine: 'google' },
      speechText: `Searching Google for ${q}.`,
      hindiSpeechText: `गूगल पर ${q} सर्च किया जा रहा है।`,
    };
  }

  if (text.includes('open youtube') || text.includes('यूट्यूब खोलो')) {
    return {
      matched: true,
      toolName: 'open_url',
      args: { url: 'https://www.youtube.com' },
      speechText: 'Opening YouTube.',
      hindiSpeechText: 'यूट्यूब खोला जा रहा है।',
    };
  }

  if (text.includes('open github') || text.includes('गिटहब खोलो')) {
    return {
      matched: true,
      toolName: 'open_url',
      args: { url: 'https://github.com' },
      speechText: 'Opening GitHub.',
      hindiSpeechText: 'Opening GitHub.',
    };
  }

  if (text.includes('open gmail') || text.includes('open mail') || text.includes('जीमेल खोलो')) {
    return {
      matched: true,
      toolName: 'open_url',
      args: { url: 'https://mail.google.com' },
      speechText: 'Opening Gmail.',
      hindiSpeechText: 'जीमेल खोला जा रहा है।',
    };
  }

  if (text.includes('take screenshot') || text.includes('capture screen') || text.includes('screenshot lo') || text.includes('स्क्रीनशॉट लो')) {
    return {
      matched: true,
      toolName: 'take_screenshot',
      args: {},
      speechText: 'Capturing screen right now.',
      hindiSpeechText: 'स्क्रीनशॉट लिया जा रहा है।',
    };
  }

  if (text.includes('cpu usage') || text.includes('ram usage') || text.includes('system status') || text.includes('system health') || text.includes('सिस्टम की स्थिति')) {
    return {
      matched: true,
      toolName: 'get_system_metrics',
      args: {},
      speechText: 'Fetching current system metrics.',
      hindiSpeechText: 'सिस्टम की स्थिति की जांच की जा रही है।',
    };
  }

  if (text.includes('lock pc') || text.includes('lock computer') || text.includes('पीसी लॉक करो')) {
    return {
      matched: true,
      toolName: 'lock_pc',
      args: {},
      speechText: 'Locking PC workstation.',
      hindiSpeechText: 'पीसी लॉक किया जा रहा है।',
    };
  }

  if (text.includes('start work') || text.includes('work routine') || text.includes('काम शुरू करो')) {
    return {
      matched: true,
      toolName: 'execute_automation',
      args: { routineId: 'auto_work' },
      speechText: 'Starting your Work routine.',
      hindiSpeechText: 'वर्क रूटीन शुरू किया जा रहा है।',
    };
  }

  if (text.includes('start coding') || text.includes('coding mode') || text.includes('कोडिंग मोड')) {
    return {
      matched: true,
      toolName: 'execute_automation',
      args: { routineId: 'auto_coding' },
      speechText: 'Activating full-stack coding mode.',
      hindiSpeechText: 'कोडिंग मोड सक्रिय किया जा रहा है।',
    };
  }

  return { matched: false };
}

// ----------------------------------------------------
// API Endpoints
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    version: '2.4.0',
    platform: os.platform(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/system/metrics', (req, res) => {
  try {
    const ramTotal = os.totalmem();
    const ramFree = os.freemem();
    const ramUsed = ramTotal - ramFree;
    const ramUsagePercent = Math.round((ramUsed / ramTotal) * 100);
    const cpuUsage = getCpuUsage();
    const cpus = os.cpus();

    res.json({
      cpuUsage,
      cpuModel: cpus[0]?.model || 'Unknown CPU',
      cpuCores: cpus.length,
      ramTotal,
      ramUsed,
      ramFree,
      ramUsagePercent,
      osName: `${os.type()} ${os.platform()}`,
      osRelease: os.release(),
      osArch: os.arch(),
      hostname: os.hostname(),
      uptime: process.uptime(),
      platform: process.platform,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

async function processWithGemini(prompt: string, conversationHistory: any[], currentMemories: any[]) {
  const gemini = getGeminiClient();
  const memoryContext = currentMemories.map((m) => `- ${m.key}: ${m.value}`).join('\n');
  const contents: any[] = [];

  for (const m of conversationHistory.slice(-4)) {
    contents.push({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    });
  }

  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const response = await gemini.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction: `You are J.A.R.V.I.S., a professional AI assistant. Known user memory:\n${memoryContext}`,
      tools: [{ functionDeclarations: JARVIS_TOOLS }],
    },
  });

  return response;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const direct = matchDirectCommand(message);
    if (direct.matched) {
      return res.json({ success: true, directCommand: direct });
    }

    const response = await processWithGemini(message, history, memories);
    const text = response.text || 'I could not generate a response.';
    res.json({ success: true, response: text });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'AI request failed' });
  }
});

app.get('/api/memory', (req, res) => {
  res.json({ memories });
});

app.post('/api/memory', (req, res) => {
  const { category = 'fact', key, value } = req.body;
  if (!key || !value) return res.status(400).json({ error: 'key and value are required' });

  const now = new Date().toISOString();
  const memory = { id: `mem_${Date.now()}`, category, key, value, createdAt: now, updatedAt: now };
  memories.push(memory);
  saveMemory();
  res.json({ success: true, memory });
});

app.delete('/api/memory/:id', (req, res) => {
  const index = memories.findIndex((m) => m.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Memory not found.' });
  const [removed] = memories.splice(index, 1);
  saveMemory();
  res.json({ success: true, removed });
});

app.delete('/api/memory', (req, res) => {
  memories = [];
  saveMemory();
  res.json({ success: true, message: 'All memories cleared.' });
});

app.get('/api/automations', (req, res) => {
  res.json({ automations });
});

app.post('/api/automations', (req, res) => {
  const { name, nameHindi, description, iconName = 'Play', category = 'custom', steps = [] } = req.body;
  if (!name || steps.length === 0) return res.status(400).json({ error: 'Name and steps are required.' });

  const newRoutine = {
    id: `auto_${Date.now()}`,
    name,
    nameHindi,
    description: description || '',
    iconName,
    category,
    enabled: true,
    steps,
  };
  automations.push(newRoutine);
  saveAutomations();
  res.json({ success: true, routine: newRoutine });
});

app.put('/api/automations/:id', (req, res) => {
  const idx = automations.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Routine not found.' });
  automations[idx] = { ...automations[idx], ...req.body, updatedAt: new Date().toISOString() };
  saveAutomations();
  res.json({ success: true, routine: automations[idx] });
});

app.post('/api/automations/:id/execute', async (req, res) => {
  const routine = automations.find((a) => a.id === req.params.id);
  if (!routine) return res.status(404).json({ error: 'Routine not found.' });

  const results = [];
  for (const step of routine.steps) {
    results.push({
      stepId: step.id,
      description: step.description,
      result: await executeToolDirectly(step.toolName, step.args || {}),
    });
  }

  res.json({ success: true, routineName: routine.name, stepsCount: results.length, results });
});

app.get('/api/windows-bridge/script', (req, res) => {
  const bridgeScript = `"""JARVIS Windows Companion Bridge"""
import time
print('JARVIS Windows Bridge placeholder')
while True:
    time.sleep(3)
`;

  if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
    return res.json({ success: true, filename: 'jarvis_windows_bridge.py', script: bridgeScript });
  }

  res.setHeader('Content-Type', 'text/x-python');
  res.setHeader('Content-Disposition', 'attachment; filename="jarvis_windows_bridge.py"');
  res.send(bridgeScript);
});

// ----------------------------------------------------
// Setup Vite in Dev or Static Files in Production
// ----------------------------------------------------
async function startServer() {
  const httpServer = http.createServer(app);

  jarvisWs.init(httpServer);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`JARVIS Server & WebSocket online on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start JARVIS server:', error);
  process.exit(1);
});
