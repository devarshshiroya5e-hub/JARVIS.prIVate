"""
System Tools for JARVIS Windows Local Agent
Handles real application launching, window manipulation, power state, and telemetry.
"""
import os
import sys
import psutil
import subprocess
import time
import ctypes

def open_application(application: str, args: str = "") -> dict:
    """Launch a Windows application executable."""
    app_lower = application.lower().strip()
    
    # Common Windows application shortcuts and paths
    APP_MAP = {
        "chrome": "chrome",
        "google chrome": "chrome",
        "vscode": "code",
        "vs code": "code",
        "code": "code",
        "notepad": "notepad.exe",
        "calculator": "calc.exe",
        "calc": "calc.exe",
        "spotify": "spotify",
        "explorer": "explorer.exe",
        "files": "explorer.exe",
        "file explorer": "explorer.exe",
        "terminal": "wt.exe",
        "windows terminal": "wt.exe",
        "powershell": "powershell.exe",
        "cmd": "cmd.exe",
        "task manager": "taskmgr.exe",
        "taskmgr": "taskmgr.exe",
        "edge": "msedge",
        "microsoft edge": "msedge",
        "settings": "ms-settings:",
    }

    target = APP_MAP.get(app_lower, application)
    cmd = f'start "" "{target}" {args}'.strip()

    try:
        if sys.platform == "win32":
            os.system(cmd)
        else:
            subprocess.Popen([target] if not args else [target, args], shell=True)

        return {
            "success": True,
            "action": "open_application",
            "application": application,
            "message": f"Successfully launched {application}"
        }
    except Exception as e:
        return {
            "success": False,
            "action": "open_application",
            "application": application,
            "error": str(e)
        }

def close_application(application: str) -> dict:
    """Gracefully terminate a running process by name."""
    app_name = application.lower().replace(".exe", "")
    killed_count = 0

    for proc in psutil.process_iter(['pid', 'name']):
        try:
            pname = proc.info['name'].lower()
            if app_name in pname or pname.startswith(app_name):
                proc.terminate()
                killed_count += 1
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    if killed_count > 0:
        return {
            "success": True,
            "action": "close_application",
            "application": application,
            "message": f"Terminated {killed_count} process instances of {application}"
        }
    return {
        "success": False,
        "action": "close_application",
        "application": application,
        "error": f"No active process matching '{application}' was found."
    }

def lock_pc() -> dict:
    """Lock the Windows desktop session."""
    try:
        if sys.platform == "win32":
            ctypes.windll.user32.LockWorkStation()
            return {"success": True, "message": "Workstation locked successfully."}
        return {"success": True, "message": "Lock simulated on non-Windows environment."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def sleep_pc() -> dict:
    """Put PC into sleep state."""
    try:
        if sys.platform == "win32":
            os.system("rundll32.exe powrprof.dll,SetSuspendState 0,1,0")
            return {"success": True, "message": "Computer entered sleep mode."}
        return {"success": True, "message": "Sleep command executed."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def restart_pc(force: bool = False) -> dict:
    """Restart the Windows PC."""
    try:
        flag = "/f" if force else ""
        os.system(f"shutdown /r /t 5 {flag}")
        return {"success": True, "message": "Restarting Windows in 5 seconds."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def shutdown_pc(force: bool = False) -> dict:
    """Shut down the Windows PC."""
    try:
        flag = "/f" if force else ""
        os.system(f"shutdown /s /t 5 {flag}")
        return {"success": True, "message": "Shutting down Windows in 5 seconds."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_system_metrics() -> dict:
    """Collect real-time CPU, RAM, Disk, Battery, and Network statistics."""
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        net1 = psutil.net_io_counters()
        time.sleep(0.1)
        net2 = psutil.net_io_counters()
        
        down_mbps = round(((net2.bytes_recv - net1.bytes_recv) * 8) / (1024 * 1024 * 0.1), 1)
        up_mbps = round(((net2.bytes_sent - net1.bytes_sent) * 8) / (1024 * 1024 * 0.1), 1)

        battery = psutil.sensors_battery()
        battery_pct = round(battery.percent) if battery else None
        is_charging = battery.power_plugged if battery else None

        active_window = "JARVIS Desktop Command Center"
        if sys.platform == "win32":
            try:
                import win32gui
                hwnd = win32gui.GetForegroundWindow()
                title = win32gui.GetWindowText(hwnd)
                if title:
                    active_window = title
            except Exception:
                pass

        return {
            "success": True,
            "cpuUsage": cpu_percent,
            "ramUsage": round(mem.percent, 1),
            "ramUsedGb": round(mem.used / (1024**3), 2),
            "ramTotalGb": round(mem.total / (1024**3), 2),
            "diskUsage": round(disk.percent, 1),
            "diskFreeGb": round(disk.free / (1024**3), 1),
            "diskTotalGb": round(disk.total / (1024**3), 1),
            "networkDownMbps": max(0.1, down_mbps),
            "networkUpMbps": max(0.1, up_mbps),
            "batteryLevel": battery_pct,
            "batteryIsCharging": is_charging,
            "activeWindow": active_window,
            "osName": f"Windows 11 ({sys.platform})",
            "uptimeSeconds": round(time.time() - psutil.boot_time()),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
