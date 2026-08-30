import { ToolExecutionRequest, ToolExecutionResult } from '../../../shared/types';
import { permissions } from '../security/permissions';
import fs from 'fs';
import path from 'path';
import os from 'os';

function normalizeArgs(tool: string, input: Record<string, any>) {
  const args = { ...input };
  if (tool === 'open_application') args.application = args.application || args.appName || '';
  if (tool === 'close_application') args.application = args.application || args.processName || '';
  if (tool === 'create_folder') args.path = args.path || args.folderPath || '';
  if (tool === 'create_file') args.path = args.path || args.filePath || '';
  if (tool === 'delete_file') args.path = args.path || args.filePath || '';
  return args;
}

export class ToolService {
  private localAgentUrl = 'http://127.0.0.1:8765';

  public setAgentUrl(url: string) {
    this.localAgentUrl = url;
  }

  public async execute(req: ToolExecutionRequest): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const tool = req.tool;
    const args = normalizeArgs(tool, req.arguments || {});
    const confirmed = req.confirmed === true;

    const permCheck = permissions.checkExecution(tool, args, confirmed);
    if (!permCheck.allowed) {
      return {
        tool,
        success: false,
        error: permCheck.warningMessage || 'Action requires confirmation.',
        data: {
          requiresConfirmation: true,
          safetyLevel: permCheck.safetyLevel,
          reason: permCheck.reason,
        },
        executionTimeMs: Date.now() - startTime,
      };
    }

    // This server-side agent URL is useful when JARVIS is running locally.
    // In production the browser-side WebSocket proxy sends commands to the
    // user's Windows companion instead, so never wait several seconds here.
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 750);
      try {
        const agentRes = await fetch(`${this.localAgentUrl}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool, arguments: args }),
          signal: controller.signal,
        });
        if (agentRes.ok) {
          const agentData: any = await agentRes.json();
          return {
            tool,
            success: agentData.success !== false,
            message: agentData.message || 'Executed via Windows Local Agent',
            data: agentData.data || agentData,
            error: agentData.error,
            executionTimeMs: Date.now() - startTime,
          };
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (_) {
      // Expected on hosted deployments where 127.0.0.1 is the Render host.
    }

    return this.executeFallback(tool, args, startTime);
  }

  private async executeFallback(tool: string, args: Record<string, any>, startTime: number): Promise<ToolExecutionResult> {
    try {
      switch (tool) {
        case 'open_application':
          return { tool, success: false, message: `Windows Local Agent is offline; cannot launch ${args.application || 'application'} from the hosted server.`, data: { requiresAgent: true }, executionTimeMs: Date.now() - startTime };
        case 'close_application':
          return { tool, success: false, message: 'Windows Local Agent is offline; cannot close desktop applications from the hosted server.', data: { requiresAgent: true }, executionTimeMs: Date.now() - startTime };
        case 'open_url': {
          const url = args.url || 'https://google.com';
          return { tool, success: false, message: `Windows Local Agent is offline; open ${url} after starting the companion.`, data: { url, requiresAgent: true }, executionTimeMs: Date.now() - startTime };
        }
        case 'search_web': {
          const q = encodeURIComponent(args.query || '');
          const engine = (args.engine || 'google').toLowerCase();
          let searchUrl = `https://www.google.com/search?q=${q}`;
          if (engine === 'youtube') searchUrl = `https://www.youtube.com/results?search_query=${q}`;
          if (engine === 'github') searchUrl = `https://github.com/search?q=${q}`;
          if (engine === 'wikipedia') searchUrl = `https://en.wikipedia.org/wiki/Special:Search?search=${q}`;
          return { tool, success: true, message: `Prepared ${engine} search for "${args.query || ''}".`, data: { searchUrl } };
        }
        case 'get_system_metrics': {
          const total = os.totalmem();
          const free = os.freemem();
          return { tool, success: true, message: 'Host telemetry retrieved.', data: { cpuUsage: os.loadavg()[0] || 0, ramUsage: Math.round(((total - free) / total) * 100), ramUsedGb: (total - free) / 1024 ** 3, ramTotalGb: total / 1024 ** 3, osName: `${os.platform()} ${os.release()}`, requiresAgent: true }, executionTimeMs: Date.now() - startTime };
        }
        case 'list_files': {
          const dir = args.directory || process.cwd();
          const resolved = path.resolve(dir);
          if (!fs.existsSync(resolved)) return { tool, success: false, error: `Directory does not exist: ${resolved}`, executionTimeMs: Date.now() - startTime };
          const files = fs.readdirSync(resolved, { withFileTypes: true }).slice(0, 100).map((f) => ({ name: f.name, isDirectory: f.isDirectory(), size: f.isFile() ? fs.statSync(path.join(resolved, f.name)).size : 0, path: path.join(resolved, f.name) }));
          return { tool, success: true, message: `Found ${files.length} items in ${dir}.`, data: { directory: dir, files }, executionTimeMs: Date.now() - startTime };
        }
        default:
          return { tool, success: false, message: `Windows Local Agent is offline for ${tool}.`, data: { requiresAgent: true, arguments: args }, executionTimeMs: Date.now() - startTime };
      }
    } catch (err: any) {
      return { tool, success: false, error: err?.message || String(err), executionTimeMs: Date.now() - startTime };
    }
  }
}

export const toolService = new ToolService();