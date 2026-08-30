"""
File Management Tools for JARVIS Windows Local Agent
Handles real Windows folder searching, creating, copying, moving, and deleting.
"""
import os
import shutil
import glob
import time

def list_files(directory: str) -> dict:
    """List directory contents with file metadata."""
    try:
        # Resolve common placeholders
        expanded = os.path.expanduser(os.path.expandvars(directory))
        if not os.path.exists(expanded):
            return {"success": False, "error": f"Directory '{directory}' does not exist."}

        items = []
        for entry in os.scandir(expanded):
            try:
                stat = entry.stat()
                items.append({
                    "name": entry.name,
                    "path": entry.path,
                    "isDirectory": entry.is_dir(),
                    "sizeBytes": stat.st_size if entry.is_file() else 0,
                    "modified": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(stat.st_mtime))
                })
            except Exception:
                continue

        # Sort folders first, then alphabetical
        items.sort(key=lambda x: (not x["isDirectory"], x["name"].lower()))

        return {
            "success": True,
            "directory": expanded,
            "count": len(items),
            "files": items
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def search_files(query: str, directory: str = None, recursive: bool = True) -> dict:
    """Search for files by keyword or extension pattern (e.g. *.pdf)."""
    try:
        base_dir = directory or os.path.expanduser("~/Downloads")
        expanded = os.path.expanduser(os.path.expandvars(base_dir))

        pattern = query if "*" in query or "?" in query else f"*{query}*"
        search_path = os.path.join(expanded, "**", pattern) if recursive else os.path.join(expanded, pattern)

        matches = []
        for file_path in glob.glob(search_path, recursive=recursive):
            try:
                stat = os.stat(file_path)
                matches.append({
                    "name": os.path.basename(file_path),
                    "path": file_path,
                    "isDirectory": os.path.isdir(file_path),
                    "sizeBytes": stat.st_size if os.path.isfile(file_path) else 0,
                    "modified": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(stat.st_mtime))
                })
            except Exception:
                continue

        return {
            "success": True,
            "query": query,
            "directory": expanded,
            "count": len(matches),
            "results": matches[:100]  # Cap at 100
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def create_folder(path: str) -> dict:
    """Create directory structure."""
    try:
        expanded = os.path.expanduser(os.path.expandvars(path))
        os.makedirs(expanded, exist_ok=True)
        return {"success": True, "path": expanded, "message": f"Folder created at {expanded}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def create_file(path: str, content: str = "") -> dict:
    """Create or overwrite a file."""
    try:
        expanded = os.path.expanduser(os.path.expandvars(path))
        os.makedirs(os.path.dirname(expanded), exist_ok=True)
        with open(expanded, "w", encoding="utf-8") as f:
            f.write(content)
        return {"success": True, "path": expanded, "size": len(content)}
    except Exception as e:
        return {"success": False, "error": str(e)}

def rename_file(old_path: str, new_path: str) -> dict:
    """Rename a file or folder."""
    try:
        src = os.path.expanduser(os.path.expandvars(old_path))
        dst = os.path.expanduser(os.path.expandvars(new_path))
        os.rename(src, dst)
        return {"success": True, "oldPath": src, "newPath": dst}
    except Exception as e:
        return {"success": False, "error": str(e)}

def copy_file(source: str, destination: str) -> dict:
    """Copy a file or directory."""
    try:
        src = os.path.expanduser(os.path.expandvars(source))
        dst = os.path.expanduser(os.path.expandvars(destination))
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
        return {"success": True, "source": src, "destination": dst}
    except Exception as e:
        return {"success": False, "error": str(e)}

def move_file(source: str, destination: str) -> dict:
    """Move a file or folder."""
    try:
        src = os.path.expanduser(os.path.expandvars(source))
        dst = os.path.expanduser(os.path.expandvars(destination))
        shutil.move(src, dst)
        return {"success": True, "source": src, "destination": dst}
    except Exception as e:
        return {"success": False, "error": str(e)}

def delete_file(path: str, move_to_recycle_bin: bool = True) -> dict:
    """Delete file or directory with optional Recycle Bin support."""
    try:
        target = os.path.expanduser(os.path.expandvars(path))
        if not os.path.exists(target):
            return {"success": False, "error": f"Path '{path}' not found."}

        if move_to_recycle_bin:
            try:
                import send2trash
                send2trash.send2trash(target)
                return {"success": True, "path": target, "message": f"Moved '{target}' to Recycle Bin"}
            except Exception:
                pass

        if os.path.isdir(target):
            shutil.rmtree(target)
        else:
            os.remove(target)

        return {"success": True, "path": target, "message": f"Permanently deleted '{target}'"}
    except Exception as e:
        return {"success": False, "error": str(e)}
