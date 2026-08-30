# JARVIS Windows Desktop Control Setup

JARVIS is split into two parts:

1. The hosted JARVIS web app/AI.
2. A **local Windows Companion** running on your PC at `localhost:8765`.

The hosted app cannot directly control Windows. Native actions such as opening VS Code, typing into applications, mouse movement, screenshots, file operations and locking the workstation must be executed by the local companion.

## One-time installation

From a PowerShell window opened in the JARVIS repository:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\install-windows-agent.ps1
```

The installer:

- creates an isolated Python environment under `%LOCALAPPDATA%\JARVIS\WindowsAgent`
- installs the required Python packages
- copies the current companion bridge
- registers **JARVIS Windows Companion** to start at Windows sign-in for your user
- starts it immediately

Python can be installed per-user; an administrator install is not required for the normal companion workflow. See the official Python Windows documentation if Python is not installed.

## Verify the companion

Open this address on the same PC:

`http://localhost:8765/api/health`

You should see JSON containing `"status":"ok"`, `"agent":"JARVIS Windows Local Companion"`, and `"pyautogui":true`.

For a deeper check:

`http://localhost:8765/api/diagnostics`

Then refresh the JARVIS web app. The **Windows Agent** indicator should become online automatically; no extra toggle is required.

## Windows permissions

### Microphone

For voice input, Windows 11 should have:

- Settings → Privacy & security → Microphone → **Microphone access: On**
- **Let apps access your microphone: On**
- **Let desktop apps access your microphone: On**

Chrome/Edge also needs microphone permission for the JARVIS website.

### Desktop control

There is **no single Windows “allow JARVIS to control my PC” switch**. The companion runs as your logged-in Windows user and uses normal process launching and input automation.

For ordinary applications (Chrome, VS Code, Notepad, Explorer, etc.) you normally do **not** need to run JARVIS as administrator.

### Elevated/admin applications

Windows security boundaries can prevent a normal-privilege automation process from controlling an application running at a higher integrity level. If VS Code, PowerShell, Task Manager, an installer, or another application is running **as Administrator**, JARVIS may not be able to drive that window.

**Do not disable UAC.** Keep UAC enabled and approve elevation prompts yourself when a task genuinely needs administrator rights. If you need repeatable automation of elevated applications, the safer design is to install/sign a dedicated UIAccess companion rather than running an unrestricted AI process as Administrator.

### Locked/secure desktop

Mouse and keyboard injection requires an unlocked, interactive desktop. JARVIS should not be expected to type/click through the Windows sign-in screen or a secure UAC desktop.

## Firewall

The companion binds only to `127.0.0.1`/`localhost`. You should **not** open TCP port 8765 to your LAN or the Internet, and you should not disable Windows Firewall. The browser and companion communicate locally on the same machine.

## What JARVIS can control

With the companion online, JARVIS can execute supported tools such as:

- open/close applications
- keyboard input and shortcuts
- mouse movement/clicks/double-clicks
- screenshots
- file listing/search/create operations
- system metrics
- opening URLs/searching the web
- workstation lock

The exact set is defined by `shared/tools.ts` and implemented by `public/jarvis_windows_bridge.py`.

## Security

The companion is intentionally powerful. It can interact with your files, applications and input devices. Keep it bound to localhost, keep UAC enabled, and only use the JARVIS web application you trust. The bridge now rejects WebSocket origins outside the configured JARVIS origins.
