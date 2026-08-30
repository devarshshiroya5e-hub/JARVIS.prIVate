"""
JARVIS Windows Local Agent (Python 3.11+)
The native bridge between JARVIS Web UI and the Windows Operating System.
Listens on localhost port 8765.
"""
import asyncio
import json
import time
from typing import Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Import tool modules
from tools import system_tools, input_tools, file_tools, browser_tools

app = FastAPI(title="JARVIS Windows Local Agent", version="3.0.0")

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

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[Agent] Client connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[Agent] Client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        text = json.dumps(message)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(text)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

async def execute_tool_dispatch(tool: str, args: dict) -> dict:
    """Route tool request to native python execution handlers."""
    try:
        # System
        if tool == "open_application":
            return system_tools.open_application(args.get("application", ""), args.get("args", ""))
        elif tool == "close_application":
            return system_tools.close_application(args.get("application", ""))
        elif tool == "lock_pc":
            return system_tools.lock_pc()
        elif tool == "sleep_pc":
            return system_tools.sleep_pc()
        elif tool == "restart_pc":
            return system_tools.restart_pc(args.get("force", False))
        elif tool == "shutdown_pc":
            return system_tools.shutdown_pc(args.get("force", False))
        elif tool in ("get_system_metrics", "get_cpu", "get_ram", "get_disk", "get_battery", "get_network"):
            return system_tools.get_system_metrics()

        # Input / GUI
        elif tool == "type_text":
            return input_tools.type_text(args.get("text", ""), args.get("intervalMs", 10.0))
        elif tool == "press_key":
            return input_tools.press_key(args.get("key", ""))
        elif tool == "keyboard_shortcut":
            return input_tools.keyboard_shortcut(args.get("keys", []))
        elif tool == "move_mouse":
            return input_tools.move_mouse(args.get("x", 0), args.get("y", 0), args.get("duration", 0.2))
        elif tool == "click_mouse":
            return input_tools.click_mouse(args.get("button", "left"), args.get("x"), args.get("y"))
        elif tool == "double_click_mouse":
            return input_tools.double_click_mouse(args.get("x"), args.get("y"))
        elif tool == "take_screenshot":
            return input_tools.take_screenshot(args.get("savePath"))

        # Files
        elif tool == "list_files":
            return file_tools.list_files(args.get("directory", ""))
        elif tool == "search_files":
            return file_tools.search_files(args.get("query", ""), args.get("directory"), args.get("recursive", True))
        elif tool == "create_folder":
            return file_tools.create_folder(args.get("path", ""))
        elif tool == "create_file":
            return file_tools.create_file(args.get("path", ""), args.get("content", ""))
        elif tool == "rename_file":
            return file_tools.rename_file(args.get("oldPath", ""), args.get("newPath", ""))
        elif tool == "copy_file":
            return file_tools.copy_file(args.get("source", ""), args.get("destination", ""))
        elif tool == "move_file":
            return file_tools.move_file(args.get("source", ""), args.get("destination", ""))
        elif tool == "delete_file":
            return file_tools.delete_file(args.get("path", ""), args.get("moveToRecycleBin", True))

        # Browser (Playwright)
        elif tool == "browser_open":
            return await browser_tools.browser_open(args.get("url", ""), args.get("headless", False))
        elif tool == "browser_click":
            return await browser_tools.browser_click(args.get("selector", ""))
        elif tool == "browser_type":
            return await browser_tools.browser_type(args.get("selector", ""), args.get("text", ""), args.get("submit", False))
        elif tool == "search_web" and args.get("engine") == "youtube":
            return await browser_tools.browser_search_youtube(args.get("query", ""))
        elif tool == "open_url":
            import webbrowser
            webbrowser.open(args.get("url", "https://google.com"))
            return {"success": True, "action": "open_url", "url": args.get("url")}

        else:
            return {"success": False, "error": f"Unknown tool '{tool}' in Windows Agent"}

    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "agent": "JARVIS Windows Local Agent", "version": "3.0.0"}

@app.get("/api/metrics")
async def get_metrics():
    return system_tools.get_system_metrics()

@app.post("/api/execute")
async def execute_endpoint(req: ToolRequest):
    res = await execute_tool_dispatch(req.tool, req.arguments)
    return res

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                req_id = msg.get("requestId", f"req_{int(time.time()*1000)}")
                msg_type = msg.get("type", "")

                if msg_type == "execute_tool":
                    payload = msg.get("payload", {})
                    tool_name = payload.get("tool", "")
                    tool_args = payload.get("arguments", {})
                    result = await execute_tool_dispatch(tool_name, tool_args)
                    
                    await websocket.send_text(json.dumps({
                        "type": "tool_result",
                        "requestId": req_id,
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        "payload": result
                    }))
                elif msg_type == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "requestId": req_id,
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        "payload": {"time": time.time()}
                    }))
            except Exception as e:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "payload": {"error": str(e)}
                }))
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def telemetry_broadcast_loop():
    """Periodically collect and broadcast system stats to all connected dashboards."""
    while True:
        try:
            if len(manager.active_connections) > 0:
                metrics = system_tools.get_system_metrics()
                if metrics.get("success"):
                    await manager.broadcast({
                        "type": "system_metrics",
                        "requestId": f"metric_{int(time.time())}",
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        "payload": metrics
                    })
        except Exception:
            pass
        await asyncio.sleep(1.5)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(telemetry_broadcast_loop())
    print("\n============================================================")
    print("  JARVIS Windows Local Agent is running on http://127.0.0.1:8765")
    print("  WebSocket: ws://127.0.0.1:8765/ws")
    print("============================================================\n")

if __name__ == "__main__":
    uvicorn.run("agent:app", host="127.0.0.1", port=8765, log_level="info", reload=False)
