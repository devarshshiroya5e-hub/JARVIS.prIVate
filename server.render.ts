import express from 'express';
import http from 'http';
import path from 'path';
import os from 'os';
import fs from 'fs';
import dotenv from 'dotenv';
import { openRouter } from './backend/src/ai/openrouter';
import { toolService } from './backend/src/services/toolService';
import { jarvisWs } from './backend/src/websocket/server';
import { db } from './backend/src/database/store';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(process.cwd(), '.jarvis_data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.disable('x-powered-by');
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    aiProvider: 'openrouter',
    model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/system/metrics', (_req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const cpus = os.cpus();

  res.json({
    cpuUsage: Math.round((1 - (os.loadavg()[0] || 0) / Math.max(cpus.length, 1)) * 100) || 0,
    cpuModel: cpus[0]?.model || 'Render CPU',
    cpuCores: cpus.length || 1,
    ramTotal: totalMem,
    ramUsed: usedMem,
    ramFree: freeMem,
    ramUsagePercent: Math.round((usedMem / totalMem) * 100),
    diskTotal: 0,
    diskUsed: 0,
    diskFree: 0,
    diskUsagePercent: 0,
    networkUploadSpeed: 0,
    networkDownloadSpeed: 0,
    osName: os.type(),
    osRelease: os.release(),
    osArch: os.arch(),
    hostname: os.hostname(),
    uptime: Math.round(os.uptime()),
    batteryPercent: null,
    isCharging: null,
    activeWindow: 'JARVIS Cloud Backend',
    temperature: null,
    processes: [],
  });
});

app.post('/api/jarvis/process', async (req, res) => {
  try {
    const {
      prompt,
      conversationHistory = [],
      language = 'auto',
      openRouterModel,
    } = req.body || {};

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt string is required.' });
    }

    const startedAt = Date.now();
    const result = await openRouter.sendMessage({
      prompt: prompt.trim(),
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory.slice(-4) : [],
      model: openRouterModel || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      apiKey: process.env.OPENROUTER_API_KEY,
      language,
    });

    return res.json({
      ...result,
      source: 'openrouter',
      latencyMs: Date.now() - startedAt,
    });
  } catch (error: any) {
    const message = error?.message || 'OpenRouter request failed.';
    console.error('[OpenRouter]', message);
    return res.status(502).json({
      error: message,
      source: 'openrouter',
      text: 'OpenRouter could not process that request. Please check the API key, selected model, and account balance.',
    });
  }
});

app.post('/api/tools/execute', async (req, res) => {
  try {
    const { toolName, args = {}, confirmed = false } = req.body || {};
    if (!toolName) return res.status(400).json({ error: 'toolName is required.' });

    const result = await toolService.execute({
      tool: toolName,
      arguments: args,
      confirmed,
    });

    return res.json({
      success: result.success,
      toolName,
      args,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Tool execution failed.' });
  }
});

app.post('/api/jarvis/analyze-screen', async (req, res) => {
  try {
    const { imageBase64, prompt = 'Analyze this screenshot in detail.', openRouterModel } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required.' });

    const cleanBase64 = String(imageBase64).replace(/^data:image\/[^;]+;base64,/, '');
    const dataUri = String(imageBase64).startsWith('data:')
      ? imageBase64
      : `data:image/png;base64,${cleanBase64}`;

    const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
    if (!apiKey) return res.status(503).json({ error: 'OPENROUTER_API_KEY is not configured.' });

    const model = openRouterModel || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://ai.studio',
        'X-Title': 'JARVIS OpenRouter Vision',
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `You are JARVIS Vision. ${prompt}` },
            { type: 'image_url', image_url: { url: dataUri } },
          ],
        }],
        max_tokens: 900,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `OpenRouter Vision Error (${response.status}): ${text}` });
    }

    const data: any = await response.json();
    return res.json({
      success: true,
      source: 'openrouter',
      model,
      analysis: data.choices?.[0]?.message?.content || 'No analysis returned.',
    });
  } catch (error: any) {
    return res.status(502).json({ error: error?.message || 'Vision request failed.' });
  }
});

app.post('/api/openrouter/test', async (req, res) => {
  try {
    const apiKey = (process.env.OPENROUTER_API_KEY || req.body?.apiKey || '').trim();
    const model = req.body?.model || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
    if (!apiKey) return res.status(400).json({ success: false, error: 'OPENROUTER_API_KEY is not configured.' });

    const startedAt = Date.now();
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://ai.studio',
        'X-Title': 'JARVIS OpenRouter Connection Test',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with exactly: JARVIS OpenRouter link operational.' }],
        max_tokens: 20,
        temperature: 0,
      }),
    });

    const latencyMs = Date.now() - startedAt;
    const raw = await response.text();
    if (!response.ok) {
      let msg = `OpenRouter returned HTTP ${response.status}.`;
      try {
        const parsed = JSON.parse(raw);
        msg = parsed?.error?.message || parsed?.error || msg;
      } catch (_) {}
      return res.status(response.status).json({
        success: false,
        latencyMs,
        error: msg,
        isCreditError: response.status === 402,
        isAuthError: response.status === 401,
      });
    }

    const data = JSON.parse(raw);
    return res.json({
      success: true,
      latencyMs,
      model,
      reply: data.choices?.[0]?.message?.content || 'JARVIS OpenRouter link operational.',
    });
  } catch (error: any) {
    return res.status(502).json({ success: false, error: error?.message || 'Connection test failed.' });
  }
});

app.get('/api/memory', (_req, res) => {
  res.json({ memories: db.getMemories() });
});

app.post('/api/memory', (req, res) => {
  const { category = 'fact', key, value } = req.body || {};
  if (!key || !value) return res.status(400).json({ error: 'key and value are required.' });
  const memory: any = {
    id: `mem_${Date.now()}`,
    category,
    key,
    value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.addMemory(memory);
  res.json({ success: true, memory });
});

app.delete('/api/memory/:id', (req, res) => {
  db.deleteMemory(req.params.id);
  res.json({ success: true });
});

app.delete('/api/memory', (_req, res) => {
  for (const memory of db.getMemories()) db.deleteMemory(memory.id);
  res.json({ success: true });
});

app.get('/api/automations', (_req, res) => res.json({ automations: db.getAutomations() }));

app.post('/api/automations', (req, res) => {
  const { name, nameHindi, description, iconName = 'Play', category = 'custom', steps = [] } = req.body || {};
  if (!name || !Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ error: 'Name and at least one step are required.' });
  }
  const routine: any = {
    id: `auto_${Date.now()}`,
    name,
    nameHindi,
    description: description || '',
    iconName,
    category,
    enabled: true,
    steps,
  };
  db.addAutomation(routine);
  res.json({ success: true, routine });
});

app.put('/api/automations/:id', (req, res) => {
  const updated = db.updateAutomation(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Routine not found.' });
  res.json({ success: true, routine: updated });
});

app.post('/api/automations/:id/execute', async (req, res) => {
  const routine = db.getAutomations().find((item: any) => item.id === req.params.id);
  if (!routine) return res.status(404).json({ error: 'Routine not found.' });
  const results = [];
  for (const step of routine.steps) {
    results.push({
      stepId: step.id,
      description: step.description,
      result: await toolService.execute({ tool: step.toolName, arguments: step.args || {}, confirmed: false }),
    });
  }
  res.json({ success: true, routineName: routine.name, stepsCount: results.length, results });
});

app.get('/api/windows-bridge/script', (_req, res) => {
  const serverUrl = process.env.APP_URL || 'http://localhost:3000';
  const script = `import time, requests, psutil, os\n\nJARVIS_SERVER_URL = ${JSON.stringify(serverUrl)}\n\nwhile True:\n    try:\n        payload = {\n            'cpuUsage': psutil.cpu_percent(interval=0.2),\n            'ramUsagePercent': psutil.virtual_memory().percent,\n            'batteryPercent': psutil.sensors_battery().percent if psutil.sensors_battery() else 100,\n            'isCharging': psutil.sensors_battery().power_plugged if psutil.sensors_battery() else True,\n            'platform': os.name,\n        }\n        time.sleep(2)\n    except Exception:\n        time.sleep(3)\n`;
  if ((req.query as any)?.format === 'json') return res.json({ success: true, filename: 'jarvis_windows_bridge.py', script });
  res.type('text/plain').send(script);
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found.' });
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

const httpServer = http.createServer(app);
jarvisWs.init(httpServer);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`JARVIS OpenRouter backend listening on 0.0.0.0:${PORT}`);
  console.log(`OpenRouter model: ${process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'}`);
});
