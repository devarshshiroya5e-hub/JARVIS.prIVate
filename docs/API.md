# J.A.R.V.I.S. API & Architecture Documentation

## 1. Architecture Overview

JARVIS operates on a distributed 3-tier architecture:

1. **Frontend**: React 19 + TypeScript + Tailwind CSS with Web Audio mic capture, voice synthesis, animated AI core, and direct WebSocket connectivity.
2. **Backend**: Express + Node.js + WebSocket Server (`/ws`) providing fast local command routing, OpenRouter AI integration with multi-turn tool loops, persistent memory store, and security permission auditing.
3. **Windows Local Agent**: Python 3.11+ FastAPI & WebSocket service (`ws://127.0.0.1:8765/ws`) that executes real PC operations via `psutil`, `pyautogui`, `pywin32`, and `playwright`.

---

## 2. WebSocket Protocol (`/ws` and `ws://127.0.0.1:8765/ws`)

All WebSocket messages follow the standardized JSON envelope:

```json
{
  "type": "execute_tool",
  "requestId": "req_1718000000000",
  "timestamp": "2026-08-16T10:00:00.000Z",
  "payload": {
    "tool": "open_application",
    "arguments": {
      "application": "chrome"
    }
  }
}
```

### Message Types:
- `execute_tool`: Client requests execution of a tool.
- `tool_result`: Server or Local Agent returns the execution result.
- `system_metrics`: Streamed periodic payload containing CPU, RAM, Disk, Network, and Battery.
- `agent_status`: Connection status updates between Web UI, Backend, and Windows Agent.
- `voice_transcript`: Real-time voice transcript sent for routing and execution.
- `ping` / `pong`: Heartbeat keeping the link alive.
- `confirm_action`: Security gate asking for user confirmation.

---

## 3. Tool Registry Schema

| Tool | Category | Safety Level | Description |
| :--- | :--- | :--- | :--- |
| `open_application` | system | safe | Launch executable by name or path |
| `close_application` | system | safe | Gracefully close running process |
| `lock_pc` | system | safe | Lock Windows workstation |
| `sleep_pc` | system | confirm | Put PC into low-power sleep |
| `restart_pc` | system | always_confirm | Reboot Windows machine |
| `shutdown_pc` | system | always_confirm | Power off PC |
| `take_screenshot` | input | safe | Capture desktop screen |
| `move_mouse` | input | safe | Move cursor to (x, y) |
| `click_mouse` | input | safe | Left/right/middle click |
| `type_text` | input | safe | Type string into active window |
| `keyboard_shortcut` | input | safe | Press keys (e.g. `['ctrl', 'c']`) |
| `search_files` | file | safe | Search folder by keyword or wildcard |
| `delete_file` | file | always_confirm | Delete file or directory |
| `browser_open` | browser | safe | Launch Playwright browser session |
| `browser_type` | browser | safe | Fill input field on web page |
| `deep_research` | research | safe | Multi-source web and knowledge research |

---

## 4. Security & Safety Gates

1. **`safe`**: Tools execute immediately without prompting.
2. **`confirm`**: Requires user click confirmation before executing.
3. **`always_confirm`**: Destructive actions (shutdown, restart, permanent file deletion) trigger a high-visibility modal dialog.
