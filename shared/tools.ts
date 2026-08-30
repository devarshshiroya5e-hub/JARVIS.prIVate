import { ToolDefinition } from './types';

export const JARVIS_TOOL_REGISTRY: ToolDefinition[] = [
  // System Tools
  {
    name: 'open_application',
    description: 'Launch a Windows application or executable by name or path (e.g., chrome, code, notepad, spotify, explorer, calc).',
    category: 'system',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        application: { type: 'string', description: 'Name or executable command of the application (e.g., "chrome", "code", "notepad")' },
        args: { type: 'string', description: 'Optional command line arguments to pass to the application' }
      },
      required: ['application']
    }
  },
  {
    name: 'close_application',
    description: 'Gracefully close or terminate a running application by name.',
    category: 'system',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        application: { type: 'string', description: 'Name of the process/application to close' }
      },
      required: ['application']
    }
  },
  {
    name: 'minimize_application',
    description: 'Minimize the currently active or specified window.',
    category: 'system',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        windowTitle: { type: 'string', description: 'Title or partial title of the window to minimize' }
      }
    }
  },
  {
    name: 'maximize_application',
    description: 'Maximize the specified or currently active window.',
    category: 'system',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        windowTitle: { type: 'string', description: 'Title or partial title of the window to maximize' }
      }
    }
  },
  {
    name: 'switch_application',
    description: 'Bring a specific application or window to the foreground.',
    category: 'system',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        windowTitle: { type: 'string', description: 'Title of the window to activate' }
      },
      required: ['windowTitle']
    }
  },
  {
    name: 'lock_pc',
    description: 'Immediately lock the Windows desktop workstation.',
    category: 'system',
    safetyLevel: 'safe',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'sleep_pc',
    description: 'Put the Windows computer into low-power sleep state.',
    category: 'system',
    safetyLevel: 'confirm',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'restart_pc',
    description: 'Reboot the Windows computer.',
    category: 'system',
    safetyLevel: 'always_confirm',
    parameters: {
      type: 'object',
      properties: {
        force: { type: 'boolean', description: 'Force restart without waiting for apps' }
      }
    }
  },
  {
    name: 'shutdown_pc',
    description: 'Power off the Windows computer completely.',
    category: 'system',
    safetyLevel: 'always_confirm',
    parameters: {
      type: 'object',
      properties: {
        force: { type: 'boolean', description: 'Force shutdown without waiting for apps' }
      }
    }
  },

  // Input & Keyboard/Mouse Tools
  {
    name: 'type_text',
    description: 'Type a string of text into the currently active window or input field.',
    category: 'input',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text string to type' },
        intervalMs: { type: 'number', description: 'Delay in milliseconds between keystrokes' }
      },
      required: ['text']
    }
  },
  {
    name: 'press_key',
    description: 'Press a single key on the keyboard (e.g. enter, esc, tab, space, backspace, volumeup, volumedown, volumedown).',
    category: 'input',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Key name (e.g. "enter", "space", "volumeup", "volumedown", "volumemute")' }
      },
      required: ['key']
    }
  },
  {
    name: 'keyboard_shortcut',
    description: 'Execute a keyboard hotkey combination (e.g. ["ctrl", "c"], ["alt", "tab"], ["win", "d"], ["ctrl", "shift", "esc"]).',
    category: 'input',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        keys: {
          type: 'array',
          description: 'List of keys pressed together in order'
        }
      },
      required: ['keys']
    }
  },
  {
    name: 'move_mouse',
    description: 'Move mouse cursor to specific (x, y) desktop coordinates.',
    category: 'input',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X coordinate' },
        y: { type: 'number', description: 'Y coordinate' },
        duration: { type: 'number', description: 'Movement duration in seconds' }
      },
      required: ['x', 'y']
    }
  },
  {
    name: 'click_mouse',
    description: 'Perform a mouse click at current cursor position or specified coordinates.',
    category: 'input',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        button: { type: 'string', enum: ['left', 'right', 'middle'], description: 'Mouse button to click' },
        x: { type: 'number', description: 'Optional X coordinate' },
        y: { type: 'number', description: 'Optional Y coordinate' }
      }
    }
  },
  {
    name: 'double_click_mouse',
    description: 'Perform a double click at specified or current coordinates.',
    category: 'input',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'Optional X coordinate' },
        y: { type: 'number', description: 'Optional Y coordinate' }
      }
    }
  },
  {
    name: 'take_screenshot',
    description: 'Capture a screenshot of the primary Windows desktop monitor.',
    category: 'input',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        savePath: { type: 'string', description: 'Optional file path to save image' }
      }
    }
  },
  {
    name: 'read_screen',
    description: 'Inspect the screen content or active window text for OCR/visual comprehension.',
    category: 'input',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        region: { type: 'string', description: 'Optional bounding box or "full"' }
      }
    }
  },

  // Browser Automation Tools (Playwright)
  {
    name: 'open_url',
    description: 'Open a URL in the user default web browser.',
    category: 'browser',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Web address to open' }
      },
      required: ['url']
    }
  },
  {
    name: 'search_web',
    description: 'Search Google, YouTube, GitHub, or Wikipedia for a query.',
    category: 'browser',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term or query' },
        engine: { type: 'string', enum: ['google', 'youtube', 'github', 'wikipedia'], description: 'Search provider' }
      },
      required: ['query']
    }
  },
  {
    name: 'browser_open',
    description: 'Launch an automated Playwright browser session for headless or headed interaction.',
    category: 'browser',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to navigate to' },
        headless: { type: 'boolean', description: 'Run headless or visible browser' }
      },
      required: ['url']
    }
  },
  {
    name: 'browser_click',
    description: 'Click an element matching a CSS or text selector on the active browser page.',
    category: 'browser',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector or text (e.g., "button:has-text(\'Search\')")' }
      },
      required: ['selector']
    }
  },
  {
    name: 'browser_type',
    description: 'Fill in or type text into a browser input field matching a selector.',
    category: 'browser',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Input field selector' },
        text: { type: 'string', description: 'Text to enter' },
        submit: { type: 'boolean', description: 'Press Enter after typing' }
      },
      required: ['selector', 'text']
    }
  },
  {
    name: 'browser_press',
    description: 'Press a key inside the active automated browser page (e.g. "Enter", "Tab", "Escape").',
    category: 'browser',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Key name' }
      },
      required: ['key']
    }
  },

  // File Management Tools
  {
    name: 'list_files',
    description: 'List contents of a Windows folder with sizes, extensions, and modification timestamps.',
    category: 'file',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Folder path (e.g. "C:\\Users\\User\\Downloads" or "Downloads")' }
      },
      required: ['directory']
    }
  },
  {
    name: 'search_files',
    description: 'Search for files matching a pattern, extension, or filename within a directory.',
    category: 'file',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Filename or extension pattern (e.g., "*.pdf", "budget", "invoice")' },
        directory: { type: 'string', description: 'Directory to search within' },
        recursive: { type: 'boolean', description: 'Search recursively into subdirectories' }
      },
      required: ['query']
    }
  },
  {
    name: 'create_folder',
    description: 'Create a new directory at the specified Windows path.',
    category: 'file',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Full path of folder to create' }
      },
      required: ['path']
    }
  },
  {
    name: 'create_file',
    description: 'Create or overwrite a file with specific text content.',
    category: 'file',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        content: { type: 'string', description: 'Text content' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'rename_file',
    description: 'Rename or move a file/folder to a new name.',
    category: 'file',
    safetyLevel: 'confirm',
    parameters: {
      type: 'object',
      properties: {
        oldPath: { type: 'string', description: 'Current file path' },
        newPath: { type: 'string', description: 'New file path or name' }
      },
      required: ['oldPath', 'newPath']
    }
  },
  {
    name: 'copy_file',
    description: 'Copy a file or directory to a target destination.',
    category: 'file',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source path' },
        destination: { type: 'string', description: 'Destination path' }
      },
      required: ['source', 'destination']
    }
  },
  {
    name: 'move_file',
    description: 'Move a file or folder to another directory.',
    category: 'file',
    safetyLevel: 'confirm',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source path' },
        destination: { type: 'string', description: 'Target path' }
      },
      required: ['source', 'destination']
    }
  },
  {
    name: 'delete_file',
    description: 'Delete a file or directory on the Windows machine.',
    category: 'file',
    safetyLevel: 'always_confirm',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to delete' },
        moveToRecycleBin: { type: 'boolean', description: 'Send to Windows Recycle Bin instead of permanent deletion' }
      },
      required: ['path']
    }
  },

  // Telemetry & Metrics Tools
  {
    name: 'get_cpu',
    description: 'Get current CPU usage percentage, frequency, and core load.',
    category: 'telemetry',
    safetyLevel: 'safe',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_ram',
    description: 'Get current RAM memory usage, used GB, and total GB.',
    category: 'telemetry',
    safetyLevel: 'safe',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_gpu',
    description: 'Get GPU usage and memory metrics if NVIDIA/AMD dedicated GPU is available.',
    category: 'telemetry',
    safetyLevel: 'safe',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_disk',
    description: 'Get disk partition storage statistics (free, used, total space).',
    category: 'telemetry',
    safetyLevel: 'safe',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_battery',
    description: 'Get laptop battery charge percentage and power connection status.',
    category: 'telemetry',
    safetyLevel: 'safe',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_network',
    description: 'Get real-time network download and upload speeds in Mbps.',
    category: 'telemetry',
    safetyLevel: 'safe',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_system_metrics',
    description: 'Get a full comprehensive snapshot of all system telemetry and active window.',
    category: 'telemetry',
    safetyLevel: 'safe',
    parameters: { type: 'object', properties: {} }
  },

  // Execution & Scripting Tools
  {
    name: 'run_command',
    description: 'Execute a Windows CLI / PowerShell command.',
    category: 'system',
    safetyLevel: 'confirm',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command line string to execute' },
        shell: { type: 'string', enum: ['powershell', 'cmd'], description: 'Target shell interpreter' }
      },
      required: ['command']
    }
  },
  {
    name: 'run_python_script',
    description: 'Run a Python script or inline snippet on the Windows host machine.',
    category: 'system',
    safetyLevel: 'confirm',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Python code snippet or path to script' }
      },
      required: ['code']
    }
  },
  {
    name: 'execute_automation',
    description: 'Execute a pre-configured automation routine workflow.',
    category: 'system',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        automationId: { type: 'string', description: 'ID or name of the routine to execute' }
      },
      required: ['automationId']
    }
  },

  // Research Tools
  {
    name: 'deep_research',
    description: 'Conduct comprehensive multi-source web and technical research on a topic.',
    category: 'research',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic or query to investigate' },
        depth: { type: 'string', enum: ['overview', 'detailed', 'technical'], description: 'Depth of analysis' }
      },
      required: ['topic']
    }
  },
  {
    name: 'read_web_page',
    description: 'Extract and read clean text content from a web page URL for research.',
    category: 'research',
    safetyLevel: 'safe',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Web page URL to read' }
      },
      required: ['url']
    }
  }
];
