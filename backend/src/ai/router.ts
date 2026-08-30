/**
 * Fast Local AI Command Router
 * Bypasses LLM latency for predictable, direct PC control and desktop actions.
 */

export interface RouterDecision {
  isLocal: boolean;
  tool?: string;
  args?: Record<string, any>;
  immediateReply?: string;
  hindiReply?: string;
  intent?: string;
}

export class CommandRouter {
  public route(input: string): RouterDecision {
    const raw = input.trim();
    const text = raw.toLowerCase();

    // 1. App Launching / Opening
    if (text.startsWith('open ') || text.startsWith('launch ') || text.startsWith('start ') || text.includes('kholo') || text.includes('chalu karo')) {
      let target = text
        .replace(/^(jarvis|hey jarvis|please|bhai)\s*,?\s*/i, '')
        .replace(/^(open|launch|start|run)\s+/i, '')
        .replace(/\s+(kholo|chalu karo|start karo)$/i, '')
        .trim();

      // App aliases
      if (target === 'chrome' || target === 'browser' || target === 'google chrome') {
        return {
          isLocal: true,
          tool: 'open_application',
          args: { application: 'chrome' },
          immediateReply: 'Opening Chrome, Sir.',
          hindiReply: 'क्रोम खोल रहा हूँ, श्रीमान।'
        };
      }
      if (target === 'vs code' || target === 'vscode' || target === 'code' || target === 'visual studio code') {
        return {
          isLocal: true,
          tool: 'open_application',
          args: { application: 'code' },
          immediateReply: 'Launching Visual Studio Code.',
          hindiReply: 'विजुअल स्टूडियो कोड शुरू कर रहा हूँ।'
        };
      }
      if (target === 'notepad' || target === 'text editor') {
        return {
          isLocal: true,
          tool: 'open_application',
          args: { application: 'notepad' },
          immediateReply: 'Opening Notepad.',
          hindiReply: 'नोटपैड खोल रहा हूँ।'
        };
      }
      if (target === 'calculator' || target === 'calc') {
        return {
          isLocal: true,
          tool: 'open_application',
          args: { application: 'calc' },
          immediateReply: 'Opening Calculator.',
          hindiReply: 'कैलकुलेटर खोल रहा हूँ।'
        };
      }
      if (target === 'spotify' || target === 'music') {
        return {
          isLocal: true,
          tool: 'open_application',
          args: { application: 'spotify' },
          immediateReply: 'Launching Spotify.',
          hindiReply: 'स्पॉटिफाई खोल रहा हूँ।'
        };
      }
      if (target === 'file explorer' || target === 'explorer' || target === 'files' || target === 'my files') {
        return {
          isLocal: true,
          tool: 'open_application',
          args: { application: 'explorer' },
          immediateReply: 'Opening Windows File Explorer.',
          hindiReply: 'फ़ाइल एक्सप्लोरर खोल रहा हूँ।'
        };
      }
      if (target === 'terminal' || target === 'powershell' || target === 'cmd' || target === 'command prompt') {
        return {
          isLocal: true,
          tool: 'open_application',
          args: { application: 'powershell' },
          immediateReply: 'Opening PowerShell terminal.',
          hindiReply: 'पावरशेल टर्मिनल खोल रहा हूँ।'
        };
      }
      if (target === 'task manager') {
        return {
          isLocal: true,
          tool: 'open_application',
          args: { application: 'taskmgr' },
          immediateReply: 'Opening Windows Task Manager.',
          hindiReply: 'टास्क मैनेजर खोल रहा हूँ।'
        };
      }
      if (target === 'settings') {
        return {
          isLocal: true,
          tool: 'open_application',
          args: { application: 'ms-settings:' },
          immediateReply: 'Opening Windows Settings.',
          hindiReply: 'विंडोज सेटिंग्स खोल रहा हूँ।'
        };
      }

      // If it's a URL
      if (target.startsWith('http://') || target.startsWith('https://') || target.includes('.com') || target.includes('.org')) {
        const url = target.startsWith('http') ? target : `https://${target}`;
        return {
          isLocal: true,
          tool: 'open_url',
          args: { url },
          immediateReply: `Opening ${target}.`,
          hindiReply: `${target} खोल रहा हूँ।`
        };
      }

      // Generic app launch
      if (target.length > 0 && target.split(' ').length <= 3) {
        return {
          isLocal: true,
          tool: 'open_application',
          args: { application: target },
          immediateReply: `Launching ${target}.`,
          hindiReply: `${target} शुरू कर रहा हूँ।`
        };
      }
    }

    // 2. Closing apps
    if (text.startsWith('close ') || text.startsWith('kill ') || text.includes('band karo')) {
      const target = text
        .replace(/^(close|kill|quit|exit)\s+/i, '')
        .replace(/\s+band karo$/i, '')
        .trim();
      return {
        isLocal: true,
        tool: 'close_application',
        args: { application: target },
        immediateReply: `Closing ${target}.`,
        hindiReply: `${target} बंद कर रहा हूँ।`
      };
    }

    // 3. Screenshots & Screen Inspection
    if (text.includes('screenshot') || text.includes('capture screen') || text.includes('screen photo') || text.includes('screen lo')) {
      return {
        isLocal: true,
        tool: 'take_screenshot',
        args: {},
        immediateReply: 'Capturing desktop screenshot.',
        hindiReply: 'डेस्कटॉप स्क्रीनशॉट ले रहा हूँ।'
      };
    }

    // 4. System telemetry & metrics
    if (
      text.includes('cpu usage') ||
      text.includes('ram usage') ||
      text.includes('memory usage') ||
      text.includes('system status') ||
      text.includes('pc status') ||
      text.includes('system info') ||
      text.includes('battery status') ||
      text.includes('disk space') ||
      text.includes('system metrics') ||
      text.includes('system telemetry')
    ) {
      return {
        isLocal: true,
        tool: 'get_system_metrics',
        args: {},
        immediateReply: 'Retrieving live system telemetry.',
        hindiReply: 'सिस्टम मेट्रिक्स प्राप्त कर रहा हूँ।'
      };
    }

    // 5. Volume and Media controls
    if (text.includes('volume up') || text.includes('increase volume') || text.includes('awaz badhao')) {
      return {
        isLocal: true,
        tool: 'press_key',
        args: { key: 'volumeup' },
        immediateReply: 'Volume increased.',
        hindiReply: 'आवाज बढ़ा दी गई है।'
      };
    }
    if (text.includes('volume down') || text.includes('decrease volume') || text.includes('awaz kam karo')) {
      return {
        isLocal: true,
        tool: 'press_key',
        args: { key: 'volumedown' },
        immediateReply: 'Volume decreased.',
        hindiReply: 'आवाज कम कर दी गई है।'
      };
    }
    if (text.includes('mute') || text.includes('unmute') || text.includes('silent')) {
      return {
        isLocal: true,
        tool: 'press_key',
        args: { key: 'volumemute' },
        immediateReply: 'Audio toggled.',
        hindiReply: 'ऑडियो टॉगल किया गया।'
      };
    }

    // 6. Lock / Sleep / Desktop
    if (text.includes('lock pc') || text.includes('lock my computer') || text.includes('lock screen') || text.includes('screen lock')) {
      return {
        isLocal: true,
        tool: 'lock_pc',
        args: {},
        immediateReply: 'Workstation locked, Sir.',
        hindiReply: 'वर्कस्टेशन लॉक कर दिया गया है, श्रीमान।'
      };
    }
    if (text.includes('show desktop') || text.includes('minimize all') || text.includes('clear screen')) {
      return {
        isLocal: true,
        tool: 'keyboard_shortcut',
        args: { keys: ['win', 'd'] },
        immediateReply: 'Showing desktop.',
        hindiReply: 'डेस्कटॉप दिखा रहा हूँ।'
      };
    }

    // 7. Power Actions (requires confirmation)
    if (text.includes('shutdown') || text.includes('shut down') || text.includes('turn off pc')) {
      return {
        isLocal: true,
        tool: 'shutdown_pc',
        args: { force: false },
        immediateReply: 'Initiating shutdown sequence. Confirmation required.',
        hindiReply: 'शटडाउन अनुक्रम आरंभ किया गया। पुष्टि आवश्यक है।'
      };
    }
    if (text.includes('restart pc') || text.includes('reboot pc') || text.includes('reboot')) {
      return {
        isLocal: true,
        tool: 'restart_pc',
        args: { force: false },
        immediateReply: 'Initiating reboot sequence. Confirmation required.',
        hindiReply: 'रीबूट अनुक्रम आरंभ किया गया। पुष्टि आवश्यक है।'
      };
    }

    // 8. File searches (e.g., "find pdf files in downloads", "search for budget.xlsx")
    const findMatch = text.match(/(?:find|search for|locate)\s+([a-zA-Z0-9_.*\- ]+?)\s+(?:in|inside)\s+([a-zA-Z0-9_:\\\-\/ ]+)/i);
    if (findMatch) {
      const query = findMatch[1].trim();
      const dir = findMatch[2].trim();
      return {
        isLocal: true,
        tool: 'search_files',
        args: { query, directory: dir, recursive: true },
        immediateReply: `Searching for "${query}" in ${dir}.`,
        hindiReply: `${dir} में "${query}" खोज रहा हूँ।`
      };
    }

    // 9. Web Search (e.g., "search youtube for python tutorials", "search google for weather")
    const searchMatch = text.match(/search\s+(youtube|google|github|wikipedia)\s+for\s+(.+)/i);
    if (searchMatch) {
      const engine = searchMatch[1].toLowerCase();
      const query = searchMatch[2].trim();
      return {
        isLocal: true,
        tool: 'search_web',
        args: { engine, query },
        immediateReply: `Searching ${engine} for "${query}".`,
        hindiReply: `${engine} पर "${query}" खोज रहा हूँ।`
      };
    }

    // Otherwise, delegate to OpenRouter for deep reasoning & multimodal interaction
    return {
      isLocal: false
    };
  }
}

export const commandRouter = new CommandRouter();
