"""
Input & GUI Automation Tools for JARVIS Windows Local Agent
Handles keyboard typing, hotkey shortcuts, mouse clicks/movements, and screen capture.
"""
import os
import base64
import io
import pyautogui

# Safety fail-safe in corners
pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.05

def type_text(text: str, interval_ms: float = 10.0) -> dict:
    """Type a string into active window."""
    try:
        pyautogui.write(text, interval=interval_ms / 1000.0)
        return {"success": True, "action": "type_text", "characters": len(text)}
    except Exception as e:
        return {"success": False, "error": str(e)}

def press_key(key: str) -> dict:
    """Press a single keyboard key."""
    try:
        k = key.lower().strip()
        # Normalization
        KEY_ALIASES = {
            "volumeup": "volumeup",
            "volumedown": "volumedown",
            "volumemute": "volumemute",
            "enter": "enter",
            "return": "enter",
            "esc": "esc",
            "escape": "esc",
            "tab": "tab",
            "space": "space",
            "backspace": "backspace",
        }
        target_key = KEY_ALIASES.get(k, k)
        pyautogui.press(target_key)
        return {"success": True, "action": "press_key", "key": target_key}
    except Exception as e:
        return {"success": False, "error": str(e)}

def keyboard_shortcut(keys: list) -> dict:
    """Trigger hotkey combination (e.g. ['ctrl', 'c'], ['alt', 'tab'], ['win', 'd'])."""
    try:
        # Remap 'win' to 'winleft' for pyautogui
        sanitized = [("winleft" if k.lower() in ("win", "windows", "super", "meta") else k.lower()) for k in keys]
        pyautogui.hotkey(*sanitized)
        return {"success": True, "action": "keyboard_shortcut", "keys": keys}
    except Exception as e:
        return {"success": False, "error": str(e)}

def move_mouse(x: int, y: int, duration: float = 0.2) -> dict:
    """Move cursor to specific screen coordinates."""
    try:
        pyautogui.moveTo(x, y, duration=duration)
        return {"success": True, "action": "move_mouse", "x": x, "y": y}
    except Exception as e:
        return {"success": False, "error": str(e)}

def click_mouse(button: str = "left", x: int = None, y: int = None) -> dict:
    """Click mouse button."""
    try:
        if x is not None and y is not None:
            pyautogui.click(x=x, y=y, button=button)
        else:
            pyautogui.click(button=button)
        return {"success": True, "action": "click_mouse", "button": button}
    except Exception as e:
        return {"success": False, "error": str(e)}

def double_click_mouse(x: int = None, y: int = None) -> dict:
    """Double click mouse."""
    try:
        if x is not None and y is not None:
            pyautogui.doubleClick(x=x, y=y)
        else:
            pyautogui.doubleClick()
        return {"success": True, "action": "double_click_mouse"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def take_screenshot(save_path: str = None) -> dict:
    """Capture full desktop screenshot and return as Base64 data URL."""
    try:
        img = pyautogui.screenshot()
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_b64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        if save_path:
            img.save(save_path)
            
        return {
            "success": True,
            "action": "take_screenshot",
            "resolution": f"{img.width}x{img.height}",
            "base64": f"data:image/png;base64,{img_b64}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
