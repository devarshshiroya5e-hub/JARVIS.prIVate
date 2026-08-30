import express from 'express';
import http from 'http';
import path from 'path';
import os from 'os';
import fs from 'fs';
import dotenv from 'dotenv';
import { openRouter } from './backend/src/ai/openrouter';
import { commandRouter } from './backend/src/ai/router';
import { toolService } from './backend/src/services/toolService';
import { jarvisWs } from './backend/src/websocket/server';
import { db } from './backend/src/database/store';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const INDEX_FILE = path.join(DIST_DIR, 'index.html');
const OPENROUTER_MODEL = 'nvidia/nemotron-3.5-content-safety:free';

app.disable('x-powered-by');
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.use(express.static(DIST_DIR, {
  index: false,
  redirect: false,
  fallthrough: true,
  setHeaders: (res, filePath) => {
    if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else res.setHeader('Cache-Control', 'no-cache');
  },
}));

app.get('/favicon.ico', (_req, res) => res.status(204).end());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    aiProvider: 'openrouter',
    model: OPENROUTER_MODEL,
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/system/metrics', (_req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const cpus = os.cpus();
  const load = os.loadavg()[0] || 0;
  const cpuUsage = Math.max(0, Math.min(100, Math.round((load / Math.max(cpus.length, 1)) * 100)));
  res.json({
    cpuUsage, cpuModel: cpus[0]?.model || 'Render CPU', cpuCores: cpus.length || 1,
    ramTotal: totalMem, ramUsed: usedMem, ramFree: freeMem, ramUsagePercent: Math.round((usedMem / totalMem) * 100),
    diskTotal: 0, diskUsed: 0, diskFree: 0, diskUsagePercent: 0,
    networkUploadSpeed: 0, networkDownloadSpeed: 0, osName: os.type(), osRelease: os.release(), osArch: os.arch(),
    hostname: os.hostname(), uptime: Math.round(os.uptime()), batteryPercent: null, isCharging: null,
    activeWindow: 'JARVIS Cloud Backend', temperature: null, processes: [],
  });
});

app.post('/api/jarvis/process', async (req, res) => {
  try {
    const { prompt, conversationHistory = [], language = 'auto' } = req.body || {};
    if (typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'Prompt string is required.' });

    const startedAt = Date.now();
    const trimmedPrompt = prompt.trim();
    const localDecision = commandRouter.route(trimmedPrompt);

    // NVIDIA Nemotron 3.5 Content Safety is intentionally used as the only
    // remote AI model. It does not provide OpenRouter tool/function calling,
    // so predictable PC commands continue through the deterministic local
    // command router before the model is contacted.
    if (localDecision.isLocal && localDecision.tool) {
      const toolResult = await toolService.execute({
        tool: localDecision.tool,
        arguments: localDecision.args || {},
        confirmed: false,
      });
      const call = {
        id: `local_${Date.now()}`,
        name: localDecision.tool,
        arguments: localDecision.args || {},
        result: toolResult,
        timestamp: new Date().toISOString(),
      };
      return res.json({
        source: 'local_router',
        model: OPENROUTER_MODEL,
        text: localDecision.immediateReply || 'Action completed, Sir.',
        hindiText: localDecision.hindiReply,
        toolCalls: [call],
        latencyMs: Date.now() - startedAt,
      });
    }

    const result = await openRouter.sendMessage({
      prompt: trimmedPrompt,
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory.slice(-4) : [],
      model: OPENROUTER_MODEL,
      apiKey: process.env.OPENROUTER_API_KEY,
      language,
    });
    return res.json({ ...result, source: 'openrouter', model: OPENROUTER_MODEL, latencyMs: Date.now() - startedAt });
  } catch (error: any) {
    const message = error?.message || 'OpenRouter request failed.';
    console.error('[OpenRouter]', message);
    return res.status(502).json({ error: message, source: 'openrouter', model: OPENROUTER_MODEL, text: 'NVIDIA Nemotron could not process that request. Check OPENROUTER_API_KEY and OpenRouter model availability.' });
  }
});

app.post('/api/tools/execute', async (req, res) => {
  try {
    const { toolName, args = {}, confirmed = false } = req.body || {};
    if (!toolName) return res.status(400).json({ error: 'toolName is required.' });
    const result = await toolService.execute({ tool: toolName, arguments: args, confirmed });
    return res.status(result.success ? 200 : 400).json({ success: result.success, toolName, args, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Tool execution failed.' });
  }
});

app.post('/api/jarvis/analyze-screen', async (req, res) => {
  try {
    const { imageBase64, prompt = 'Analyze this screenshot in detail.' } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required.' });
    const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
    if (!apiKey) return res.status(503).json({ error: 'OPENROUTER_API_KEY is not configured.' });
    const cleanBase64 = String(imageBase64).replace(/^data:image\/[^;]+;base64,/, '');
    const dataUri = String(imageBase64).startsWith('data:') ? imageBase64 : `data:image/png;base64,${cleanBase64}`;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'HTTP-Referer': process.env.APP_URL || 'https://jarvis-private.onrender.com', 'X-Title': 'JARVIS NVIDIA Nemotron Vision' },
      body: JSON.stringify({ model: OPENROUTER_MODEL, messages: [{ role: 'user', content: [{ type: 'text', text: `You are JARVIS Vision and safety analysis. ${prompt}` }, { type: 'image_url', image_url: { url: dataUri } }] }], max_tokens: 900, temperature: 0.2 }),
    });
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `OpenRouter Vision Error (${response.status}): ${text}` });
    }
    const data: any = await response.json();
    return res.json({ success: true, source: 'openrouter', model: OPENROUTER_MODEL, analysis: data.choices?.[0]?.message?.content || 'No analysis returned.' });
  } catch (error: any) {
    return res.status(502).json({ error: error?.message || 'Vision request failed.' });
  }
});

app.post('/api/openrouter/test', async (req, res) => {
  try {
    const apiKey = (process.env.OPENROUTER_API_KEY || req.body?.apiKey || '').trim();
    if (!apiKey) return res.status(400).json({ success: false, error: 'OPENROUTER_API_KEY is not configured.' });
    const startedAt = Date.now();
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'HTTP-Referer': process.env.APP_URL || 'https://jarvis-private.onrender.com', 'X-Title': 'JARVIS NVIDIA Nemotron Connection Test' },
      body: JSON.stringify({ model: OPENROUTER_MODEL, messages: [{ role: 'user', content: 'Reply with exactly: JARVIS NVIDIA Nemotron link operational.' }], max_tokens: 24, temperature: 0 }),
    });
    const latencyMs = Date.now() - startedAt;
    const raw = await response.text();
    if (!response.ok) {
      let msg = `OpenRouter returned HTTP ${response.status}.`;
      try { msg = JSON.parse(raw)?.error?.message || msg; } catch (_) {}
      return res.status(response.status).json({ success: false, latencyMs, model: OPENROUTER_MODEL, error: msg, isCreditError: response.status === 402, isAuthError: response.status === 401 });
    }
    const data = JSON.parse(raw);
    return res.json({ success: true, latencyMs, model: OPENROUTER_MODEL, reply: data.choices?.[0]?.message?.content || 'JARVIS NVIDIA Nemotron link operational.' });
  } catch (error: any) {
    return res.status(502).json({ success: false, error: error?.message || 'Connection test failed.', model: OPENROUTER_MODEL });
  }
});

app.get('/api/memory', (_req, res) => res.json({ memories: db.getMemories() }));
app.post('/api/memory', (req, res) => {
  const { category = 'fact', key, value } = req.body || {};
  if (!key || !value) return res.status(400).json({ error: 'key and value are required.' });
  const memory = db.addMemory(key, value, category);
  res.json({ success: true, memory });
});
app.delete('/api/memory/:id', (req, res) => res.json({ success: db.deleteMemory(req.params.id) }));
app.delete('/api/memory', (_req, res) => { db.clearAllMemories(); res.json({ success: true }); });

app.get('/api/automations', (_req, res) => res.json({ automations: db.getAutomations() }));
app.post('/api/automations', (req, res) => {
  const { name, nameHindi, description, iconName = 'Play', category = 'custom', steps = [] } = req.body || {};
  if (!name || !Array.isArray(steps) || steps.length === 0) return res.status(400).json({ error: 'Name and at least one step are required.' });
  const routine: any = { id: `auto_${Date.now()}`, name, nameHindi, description: description || '', iconName, category, enabled: true, steps };
  db.saveAutomation(routine);
  res.json({ success: true, routine });
});
app.put('/api/automations/:id', (req, res) => {
  const existing = db.getAutomation(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Routine not found.' });
  const updated = { ...existing, ...req.body, id: existing.id };
  db.saveAutomation(updated);
  res.json({ success: true, routine: updated });
});
app.post('/api/automations/:id/execute', async (req, res) => {
  const routine = db.getAutomation(req.params.id);
  if (!routine) return res.status(404).json({ error: 'Routine not found.' });
  const results = [];
  for (const step of routine.steps as any[]) {
    results.push({ stepId: step.id, description: step.description, result: await toolService.execute({ tool: step.toolName || step.tool, arguments: step.args || step.arguments || {}, confirmed: false }) });
  }
  res.json({ success: true, routineName: routine.name, stepsCount: results.length, results });
});

app.get('/api/windows-bridge/script', (_req, res) => {
  const serverUrl = process.env.APP_URL || 'http://localhost:3000';
  const script = `import os, time, psutil, requests\nJARVIS_SERVER_URL = ${JSON.stringify(serverUrl)}\nprint('JARVIS Windows bridge target:', JARVIS_SERVER_URL)\nwhile True:\n    time.sleep(2)\n`;
  if ((_req.query as any)?.format === 'json') return res.json({ success: true, filename: 'jarvis_windows_bridge.py', script });
  res.type('text/plain').send(script);
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found.' });
  if (req.method !== 'GET' || path.extname(req.path) || !req.accepts('html')) return res.status(404).type('text/plain').send('Not Found');
  if (!fs.existsSync(INDEX_FILE)) {
    console.error(`[Static] Missing frontend entry: ${INDEX_FILE}`);
    return res.status(503).type('text/plain').send('Frontend build is missing.');
  }
  return res.sendFile(INDEX_FILE);
});

const httpServer = http.createServer(app);
jarvisWs.init(httpServer);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`JARVIS OpenRouter backend listening on 0.0.0.0:${PORT}`);
  console.log(`Frontend dist: ${DIST_DIR}`);
  console.log(`OpenRouter model: ${OPENROUTER_MODEL}`);
});
