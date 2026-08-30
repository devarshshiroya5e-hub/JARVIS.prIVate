# J.A.R.V.I.S. Windows Local Agent

The native Windows desktop companion service for the JARVIS AI Command Center. This component provides the actual hands and senses of JARVIS on your computer.

---

## 🚀 Quick Start (Automated Installation)

1. Open this folder in Windows File Explorer: `windows-agent`
2. Double-click **`install_agent.bat`** (installs Python packages and Playwright browser automation).
3. Double-click **`start_agent.bat`** to start the local agent.

The agent will bind locally to **`http://127.0.0.1:8765`** and **`ws://127.0.0.1:8765/ws`**.

---

## 🛠️ Manual Installation (Command Line)

If you prefer using PowerShell or CMD:

```powershell
# 1. Navigate to windows-agent directory
cd windows-agent

# 2. Create Python virtual environment
python -m venv venv

# 3. Activate the virtual environment
.\venv\Scripts\activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Install Playwright browser engine
playwright install chromium

# 6. Run JARVIS Local Agent
python agent.py
```

---

## 🔒 Security Architecture

- **Localhost Binding**: The agent binds strictly to `127.0.0.1:8765` and does NOT expose your computer to the public internet.
- **Permission Confirmation**: Destructive actions (such as `shutdown_pc`, `restart_pc`, and `delete_file`) require interactive approval in the web interface before executing.
- **Fail-Safe Mode**: PyAutoGUI fail-safe is enabled. Moving your mouse to any screen corner immediately halts running mouse automations.

---

## 🖥️ Starting with Windows (Optional)

To start the JARVIS Local Agent automatically when your PC boots without requiring administrator privileges:

1. Press <kbd>Win</kbd> + <kbd>R</kbd>, type `shell:startup`, and press Enter.
2. Create a shortcut to `start_agent.bat` in that Startup folder.
3. You can set the shortcut's **Run** property to `Minimized` in its Properties dialog.

---

## 📡 Exposed Local Endpoints

- `GET http://127.0.0.1:8765/api/health` — Agent health check
- `GET http://127.0.0.1:8765/api/metrics` — Real-time CPU, RAM, Disk, Network, Battery snapshot
- `POST http://127.0.0.1:8765/api/execute` — Execute tool dispatch
- `WS ws://127.0.0.1:8765/ws` — Real-time WebSocket connection for bi-directional command execution and live telemetry streaming.
