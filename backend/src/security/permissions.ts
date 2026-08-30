import { JARVIS_TOOL_REGISTRY } from '../../../shared/tools';
import { ToolSafetyLevel } from '../../../shared/types';

export interface PermissionCheckResult {
  allowed: boolean;
  requiresConfirmation: boolean;
  safetyLevel: ToolSafetyLevel;
  warningMessage?: string;
  reason?: string;
}

export class PermissionManager {
  private customRules: Map<string, ToolSafetyLevel> = new Map();

  constructor() {
    // Default safety level overrides if needed
  }

  public getToolSafetyLevel(toolName: string): ToolSafetyLevel {
    if (this.customRules.has(toolName)) {
      return this.customRules.get(toolName)!;
    }
    const def = JARVIS_TOOL_REGISTRY.find(t => t.name === toolName);
    return def ? def.safetyLevel : 'confirm';
  }

  public checkExecution(
    toolName: string,
    args: Record<string, any>,
    userConfirmed: boolean = false
  ): PermissionCheckResult {
    const safetyLevel = this.getToolSafetyLevel(toolName);

    // Safe tools run immediately
    if (safetyLevel === 'safe') {
      return {
        allowed: true,
        requiresConfirmation: false,
        safetyLevel: 'safe'
      };
    }

    // Tools requiring confirmation
    if (safetyLevel === 'confirm') {
      if (userConfirmed) {
        return {
          allowed: true,
          requiresConfirmation: false,
          safetyLevel: 'confirm'
        };
      }
      return {
        allowed: false,
        requiresConfirmation: true,
        safetyLevel: 'confirm',
        warningMessage: `Executing "${toolName}" requires your confirmation before proceeding.`,
        reason: `Potential system impact with arguments: ${JSON.stringify(args)}`
      };
    }

    // Dangerous tools requiring explicit confirmation every time
    if (safetyLevel === 'always_confirm') {
      if (userConfirmed) {
        return {
          allowed: true,
          requiresConfirmation: false,
          safetyLevel: 'always_confirm'
        };
      }

      let warning = `Dangerous Action: "${toolName}". This will significantly alter system state or delete data.`;
      if (toolName === 'shutdown_pc') warning = 'Are you sure you want to shut down your Windows computer?';
      if (toolName === 'restart_pc') warning = 'Are you sure you want to reboot your Windows computer?';
      if (toolName === 'delete_file') warning = `Are you sure you want to delete "${args.path || 'the specified file'}"?`;

      return {
        allowed: false,
        requiresConfirmation: true,
        safetyLevel: 'always_confirm',
        warningMessage: warning,
        reason: `Destructive operation parameters: ${JSON.stringify(args)}`
      };
    }

    return {
      allowed: true,
      requiresConfirmation: false,
      safetyLevel: 'safe'
    };
  }

  public setToolSafetyLevel(toolName: string, level: ToolSafetyLevel) {
    this.customRules.set(toolName, level);
  }
}

export const permissions = new PermissionManager();
