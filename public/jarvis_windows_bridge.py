"""
JARVIS Windows Local Companion Bridge
Run with Python 3.11+ on the Windows PC that is running the JARVIS web UI.
This file is intentionally self-contained so the JARVIS download button works.

Install:
    py -m pip install fastapi uvicorn pyautogui psutil pillow pydantic websockets
Run:
    py jarvis_windows_bridge.py

The browser connects to ws://127.0.0.1:8765/ws and sends desktop commands.
"""

from __future__ import annotations

import asyncio
import ctypes
import json
import os
import platform
import subprocess
import time
import webbrowser
from pathlib import Path
from typing import Any, Dict

import psutil
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    import pyautogui
    pyautogui.FAILSAFE = True
except Exception:
    pyautogui = None

app = FastAPI(title="JARVIS Windows Local Companion", version="4.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ToolRequest(BaseModel):
    tool: str
    arguments: Dict[str, Any] = {}


def ok(**data: Any) -> dict:
    return {"success": True, **data}


def fail(message: str, **data: Any) -> dict:
    return {"success": False, "error": message, **data}


def open_application(application: str, args: str = "") -> dict:
    app = (application or "").strip()
    aliases = {
        "chrome": "chrome", "google chrome": "chrome",
        "code": "code", "vscode": "code", "vs code": "code",
        "notepad": "notepad.exe", "calculator": "calc.exe", "calc": "calc.exe",
        "spotify": "spotify", "discord": "discord", "explorer": "explorer.exe",
        "files": "explorer.exe", "file explorer": "explorer.exe",
        "terminal": "wt.exe", "windows terminal": "wt.exe",
        "powershell": "powershell.exe", "cmd": "cmd.exe",
        "task manager": "taskmgr.exe", "taskmgr": "taskmgr.exe",
        "edge": "msedge", "microsoft edge": "msedge",
    }
    target = aliases.get(app.lower(), app)
    if not target:
        return fail("Application name is empty.")
    try:
        if platform.system() == "Windows":
            subprocess.Popen(f'start "" "{target}" {args}'.strip(), shell=True)
        else:
            subprocess.Popen([target] + ([args] if args else []))
        return ok(action="open_application", application=app, message=f"Successfully launched {app}.")
    except Exception as exc:
        return fail(str(exc), action="open_application", application=app)


def close_application(application: str) -> dict:
    name = (application or "").lower().replace(".exe", "")
    if not name:
        return fail("Application name is empty.")
    count = 0
    for proc in psutil.process_iter(["name"]):
        try:
            pname = (proc.info.get("name") or "").lower().replace(".exe", "")
            if name in pname or pname.startswith(name):
                proc.terminate()
                count += 1
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    if count == 0:
        return fail(f"No active process matching '{application}' was found.")
    return ok(action="close_application", application=application, message=f"Terminated {count} process instance(s) of {application}.")


def get_metrics() -> dict:
    try:
        cpu = psutil.cpu_percent(interval=0.15)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage(Path.home().anchor or "/")
        battery = psutil.sensors_battery()
        active_window = "JARVIS Desktop Command Center"
        if platform.system() == "Windows":
            try:
                import win32gui  # optional pywin32
                title = win32gui.GetWindowText(win32gui.GetForegroundWindow())
                if title:
                    active_window = title
            except Exception:
                pass
        return ok(
            cpuUsage=cpu,
            ramUsage=mem.percent,
            ramUsedGb=round(mem.used / 1024**3, 2),
            ramTotalGb=round(mem.total / 1024**3, 2),
            diskUsage=disk.percent,
            diskFreeGb=round(disk.free / 1024**3, 1),
            diskTotalGb=round(disk.total / 1024**3, 1),
            batteryLevel=round(battery.percent) if battery else None,
            batteryIsCharging=battery.power_plugged if battery else None,
            activeWindow=active_window,
            osName=platform.platform(),
            uptimeSeconds=round(time.time() - psutil.boot_time()),
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )
    except Exception as exc:
        return fail(str(exc))


def execute_tool(tool: str, args: dict) -> dict:
    try:
        if tool == "open_application":
            return open_application(args.get("application") or args.get("appName", ""), args.get("args", ""))
        if tool == "close_application":
            return close_application(args.get("application") or args.get("processName", ""))
        if tool == "open_url":
            url = args.get("url", "").strip()
            if not url:
                return fail("URL is empty.")
            if not url.startswith(("http://", "https://")):
                url = "https://" + url
            webbrowser.open(url)
            return ok(action="open_url", url=url, message=f"Opened {url}.")
        if tool == "search_web":
            q = args.get("query", "").strip()
            engine = (args.get("engine") or "google").lower()
            from urllib.parse import quote_plus
            if engine == "youtube":
                url = f"https://www.youtube.com/results?search_query={quote_plus(q)}"
            elif engine == "github":
                url = f"https://github.com/search?q={quote_plus(q)}"
            elif engine == "wikipedia":
                url = f"https://en.wikipedia.org/wiki/Special:Search?search={quote_plus(q)}"
            else:
                url = f"https://www.google.com/search?q={quote_plus(q)}"
            webbrowser.open(url)
            return ok(action="search_web", engine=engine, query=q, url=url)
        if tool == "type_text":
            if pyautogui is None:
                return fail("pyautogui is not installed.")
            text = str(args.get("text", ""))
            interval_ms = float(args.get("intervalMs", 10.0))
            pyautogui.write(text, interval=max(0, interval_ms) / 1000.0)
            return ok(action="type_text", message="Text typed successfully.")
        if tool == "press_key":
            if pyautogui is None:
                return fail("pyautogui is not installed.")
            key = str(args.get("key", "enter")).lower()
            aliases = {"volumeup": "volumeup", "volumedown": "volumedown", "volumemute": "volumemute", "escape": "esc"}
            pyautogui.press(aliases.get(key, key))
            return ok(action="press_key", key=key)
        if tool == "keyboard_shortcut":
            if pyautogui is None:
                return fail("pyautogui is not installed.")
            keys = args.get("keys", [])
            if isinstance(keys, str):
                keys = [k.strip().lower() for k in keys.replace("+", " ").split() if k.strip()]
            pyautogui.hotkey(*[str(k).lower() for k in keys])
            return ok(action="keyboard_shortcut", keys=keys)
        if tool == "move_mouse":
            if pyautogui is None:
                return fail("pyautogui is not installed.")
            pyautogui.moveTo(int(args.get("x", 0)), int(args.get("y", 0)), duration=float(args.get("duration", 0.2)))
            return ok(action="move_mouse", x=args.get("x"), y=args.get("y"))
        if tool == "click_mouse":
            if pyautogui is None:
                return fail("pyautogui is not installed.")
            x, y = args.get("x"), args.get("y")
            if x is not None and y is not None:
                pyautogui.moveTo(int(x), int(y), duration=0.1)
            pyautogui.click(button=args.get("button", "left"))
            return ok(action="click_mouse", button=args.get("button", "left"))
        if tool == "double_click_mouse":
            if pyautogui is None:
                return fail("pyautogui is not installed.")
            x, y = args.get("x"), args.get("y")
            if x is not None and y is not None:
                pyautogui.moveTo(int(x), int(y), duration=0.1)
            pyautogui.doubleClick()
            return ok(action="double_click_mouse")
        if tool == "take_screenshot":
            if pyautogui is None:
                return fail("pyautogui is not installed.")
            target = args.get("savePath") or str(Path.cwd() / "jarvis_screen.png")
            pyautogui.screenshot().save(target)
            return ok(action="take_screenshot", path=target, message=f"Screenshot saved to {target}.")
        if tool in {"get_system_metrics", "get_cpu", "get_ram", "get_disk", "get_battery", "get_network", "get_gpu"}:
            return get_metrics()
        if tool == "list_files":
            directory = Path(args.get("directory") or str(Path.home()))
            if not directory.exists(): return fail(f"Directory does not exist: {directory}")
            items = []
            for item in list(directory.iterdir())[:100]:
                try:
                    stat = item.stat()
                    items.append({"name": item.name, "isDirectory": item.is_dir(), "size": stat.st_size if item.is_file() else 0, "path": str(item)})
                except Exception:
                    continue
            return ok(directory=str(directory), files=items, total=len(items))
        if tool == "search_files":
            base = Path(args.get("directory") or str(Path.home()))
            query = str(args.get("query") or "").lower()
            recursive = bool(args.get("recursive", True))
            if not base.exists(): return fail(f"Directory does not exist: {base}")
            iterator = base.rglob("*") if recursive else base.glob("*")
            found = []
            for item in iterator:
                if len(found) >= 50: break
                if query in item.name.lower() or (query.startswith("*.") and item.suffix.lower() == query[1:]):
                    found.append({"name": item.name, "path": str(item), "isDirectory": item.is_dir()})
            return ok(query=query, directory=str(base), matches=found)
        if tool == "create_folder":
            path_value = args.get("path") or args.get("folderPath")
            if not path_value: return fail("Folder path is empty.")
            Path(path_value).mkdir(parents=True, exist_ok=True)
            return ok(path=str(Path(path_value).resolve()))
        if tool == "create_file":
            path_value = args.get("path") or args.get("filePath")
            if not path_value: return fail("File path is empty.")
            target = Path(path_value)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(str(args.get("content", "")), encoding="utf-8")
            return ok(path=str(target.resolve()), bytesWritten=len(str(args.get("content", "")).encode("utf-8")))
        if tool == "lock_pc":
            if platform.system() == "Windows":
                ctypes.windll.user32.LockWorkStation()
            return ok(message="Workstation locked.")
        return fail(f"Unknown tool '{tool}'.")
    except Exception as exc:
        return fail(str(exc))


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "agent": "JARVIS Windows Local Companion", "version": "4.0.0"}


@app.get("/api/metrics")
async def metrics() -> dict:
    return get_metrics()


@app.post("/api/execute")
async def api_execute(req: ToolRequest) -> dict:
    return execute_tool(req.tool, req.arguments)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text(json.dumps({
        "type": "agent_status",
        "requestId": f"agent_init_{int(time.time()*1000)}",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "payload": {"status": "connected", "agentConnected": True, "version": "4.0.0"},
    }))
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            request_id = msg.get("requestId", f"req_{int(time.time()*1000)}")
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "requestId": request_id, "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "payload": {"time": time.time()}}))
            elif msg.get("type") == "execute_tool":
                payload = msg.get("payload", {})
                result = execute_tool(payload.get("tool", ""), payload.get("arguments", {}))
                await websocket.send_text(json.dumps({
                    "type": "tool_result",
                    "requestId": request_id,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "payload": result,
                }))
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_text(json.dumps({"type": "error", "requestId": f"err_{int(time.time()*1000)}", "payload": {"error": str(exc)}}))
        except Exception:
            pass


if __name__ == "__main__":
    print("J.A.R.V.I.S. Windows Local Companion v4.0.0")
    print("WebSocket: ws://127.0.0.1:8765/ws")
    print("HTTP:      http://127.0.0.1:8765/api/health")
    uvicorn.run(app, host="127.0.0.1", port=8765, log_level="info")
