"""
File management: create / read / rename / delete / move / open / search.

Safety model:
  * All paths are resolved with expanduser and normalized to absolute.
  * Deletion sends files/folders to the Recycle Bin via `send2trash` when
    available (preferred), and otherwise refuses to delete rather than
    permanently removing data.
  * Operations are confined to a set of SAFE_ROOTS by default; paths that
    escape these roots (e.g. C:\\Windows) are rejected unless explicitly
    marked `allow_anywhere` by the caller.
"""

from __future__ import annotations

import fnmatch
import os
import platform
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

from .registry import ToolError, register

HOME = Path(os.path.expanduser("~"))

# Roots under which file operations are freely permitted.
SAFE_ROOTS: List[Path] = [
    HOME,
    HOME / "Desktop",
    HOME / "Documents",
    HOME / "Downloads",
    HOME / "Pictures",
    HOME / "Music",
    HOME / "Videos",
    Path(os.getcwd()),  # project root
]

# Friendly folder aliases -> resolved path.
FOLDER_ALIASES: Dict[str, Path] = {
    "desktop": HOME / "Desktop",
    "documents": HOME / "Documents",
    "downloads": HOME / "Downloads",
    "pictures": HOME / "Pictures",
    "photos": HOME / "Pictures",
    "music": HOME / "Music",
    "videos": HOME / "Videos",
    "home": HOME,
    "this pc": Path("C:\\"),
    "c drive": Path("C:\\"),
}


def _resolve_folder(name_or_path: Optional[str]) -> Path:
    if not name_or_path:
        raise ToolError("Parameter 'name' or 'path' is required.")
    key = str(name_or_path).strip().lower()
    if key in FOLDER_ALIASES:
        return FOLDER_ALIASES[key]
    p = Path(os.path.expandvars(os.path.expanduser(str(name_or_path)))).resolve()
    return p


def _resolve_file(path: Optional[str], *, must_exist: bool = False) -> Path:
    if not path:
        raise ToolError("Parameter 'path' is required.")
    p = Path(os.path.expandvars(os.path.expanduser(str(path)))).resolve()
    if must_exist and not p.exists():
        raise ToolError(f"File does not exist: {p}")
    return p


def _ensure_safe(p: Path, allow_anywhere: bool = False) -> None:
    if allow_anywhere:
        return
    real = str(p)
    for root in SAFE_ROOTS:
        try:
            root_real = str(root.resolve())
        except Exception:
            continue
        if real == root_real or real.startswith(root_real + os.sep):
            return
    raise ToolError(
        f"Path '{p}' is outside ARLAK's safe folders (Desktop, Documents, "
        f"Downloads, Pictures, Music, Videos, home, and the project folder). "
        f"Pass allow_anywhere=true only if you really mean it."
    )


@register("createFile")
def create_file(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    content = args.get("content", "")
    overwrite = bool(args.get("overwrite", False))
    p = _resolve_file(path)
    _ensure_safe(p)

    if p.exists() and not overwrite:
        raise ToolError(
            f"File already exists: {p}. Pass overwrite=true to replace it."
        )
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(str(content), encoding="utf-8")
    return {"result": f"Created file: {p}", "path": str(p)}


@register("readFile")
def read_file(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    max_chars = int(args.get("max_chars", 8000))
    p = _resolve_file(path, must_exist=True)
    _ensure_safe(p)
    try:
        text = p.read_text(encoding="utf-8", errors="replace")
    except UnicodeDecodeError:
        return {"result": f"(Binary file, {p.stat().st_size} bytes): {p}"}
    if len(text) > max_chars:
        text = text[:max_chars] + f"\n…[truncated, {len(text) - max_chars} more chars]"
    return {"result": text, "path": str(p)}


@register("renameFile")
def rename_file(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    new_name = args.get("new_name")
    if not new_name:
        raise ToolError("Parameter 'new_name' is required.")
    p = _resolve_file(path, must_exist=True)
    _ensure_safe(p)
    target = (p.parent / str(new_name)).resolve()
    _ensure_safe(target)
    if target.exists():
        raise ToolError(f"A file already exists at the target name: {target}")
    p.rename(target)
    return {"result": f"Renamed {p.name} -> {target.name}", "path": str(target)}


@register("deleteFile")
def delete_file(args: Dict[str, Any]) -> Dict[str, Any]:
    raise ToolError("File deletion has been disabled for safety.")


@register("moveFile")
def move_file(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    destination = args.get("destination")
    p = _resolve_file(path, must_exist=True)
    _ensure_safe(p)
    dest = Path(os.path.expandvars(os.path.expanduser(str(destination)))).resolve()
    # If destination is an existing directory, keep the filename.
    if dest.is_dir():
        dest = dest / p.name
    _ensure_safe(dest)
    if dest.exists():
        raise ToolError(f"Destination already exists: {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    p.rename(dest)
    return {"result": f"Moved {p.name} -> {dest}", "path": str(dest)}


@register("openFolder")
def open_folder(args: Dict[str, Any]) -> Dict[str, Any]:
    name_or_path = args.get("name") or args.get("path")
    if not name_or_path:
        raise ToolError("Parameter 'name' or 'path' is required.")
    
    folder = _resolve_folder(name_or_path)
    
    # Fallback search if it doesn't exist and looks like a raw name
    if not folder.exists() and not os.path.isabs(str(name_or_path)):
        target_name = str(name_or_path).lower().strip()
        matches = []
        for root in SAFE_ROOTS:
            if not root.exists() or root == HOME: continue
            try:
                root_depth = str(root).count(os.sep)
                for dirpath, dirnames, _ in os.walk(str(root)):
                    # Limit depth to 4 levels below root
                    if dirpath.count(os.sep) - root_depth > 4:
                        dirnames[:] = []
                        continue
                    
                    # Exclude hidden and huge folders
                    dirnames[:] = [d for d in dirnames if not d.startswith('.') and d not in ('node_modules', 'AppData', '__pycache__')]
                    
                    for d in dirnames:
                        if d.lower() == target_name:
                            matches.append(Path(dirpath) / d)
            except Exception:
                continue
                
        # Deduplicate matches
        unique_matches = []
        seen = set()
        for m in matches:
            if str(m) not in seen:
                seen.add(str(m))
                unique_matches.append(m)
                
        if len(unique_matches) == 1:
            folder = unique_matches[0]
        elif len(unique_matches) > 1:
            match_list = "\n".join([str(m) for m in unique_matches[:10]])
            raise ToolError(f"Found multiple folders named '{name_or_path}':\n{match_list}\nPlease specify the full path of the one you want to open.")

    if not folder.exists():
        raise ToolError(f"Folder does not exist: {folder}")
        
    # Explorer on Windows, open elsewhere.
    if platform.system() == "Windows":
        subprocess.Popen(f'explorer "{folder}"', shell=True, close_fds=True)
    elif platform.system() == "Darwin":
        subprocess.Popen(["open", str(folder)], close_fds=True)
    else:
        subprocess.Popen(["xdg-open", str(folder)], close_fds=True)
    return {"result": f"Opened folder: {folder}", "path": str(folder)}


@register("listFiles")
def list_files(args: Dict[str, Any]) -> Dict[str, Any]:
    folder = _resolve_folder(args.get("name") or args.get("path"))
    if not folder.exists():
        raise ToolError(f"Folder does not exist: {folder}")
    pattern = args.get("pattern") or "*"
    try:
        names = sorted(
            [p.name + ("/" if p.is_dir() else "") for p in folder.glob(pattern)]
        )
    except Exception as e:  # noqa: BLE001
        raise ToolError(f"Could not list folder: {e}")
    return {
        "result": f"{len(names)} item(s) in {folder}",
        "items": names[:500],
        "count": len(names),
    }


@register("searchFiles")
def search_files(args: Dict[str, Any]) -> Dict[str, Any]:
    """Find files by name glob or extension under a folder.

    Examples:
      name="*.py" under "Documents"          -> all python files
      extension="py"                          -> same as name="*.py"
      name="report*" under "Desktop"
    """
    folder = _resolve_folder(args.get("folder") or args.get("under") or "home")
    name = args.get("name") or args.get("pattern")
    extension = args.get("extension")
    limit = int(args.get("limit", 100))

    if extension:
        if not str(extension).startswith("."):
            extension = "." + str(extension)
        pattern = "*" + str(extension)
    elif name:
        pattern = str(name)
    else:
        raise ToolError("Provide 'name' glob or 'extension'.")

    if not folder.exists():
        raise ToolError(f"Folder does not exist: {folder}")

    matches: List[str] = []
    root_depth = str(folder).count(os.sep)
    for root, dirs, files in os.walk(folder):
        # Limit depth to 5 levels
        if root.count(os.sep) - root_depth > 5:
            dirs[:] = []
            continue
            
        # Exclude hidden and huge folders
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ('node_modules', 'AppData', '__pycache__')]
        
        for fname in files:
            if fnmatch.fnmatch(fname.lower(), pattern.lower()):
                matches.append(os.path.join(root, fname))
                if len(matches) >= limit:
                    break
        if len(matches) >= limit:
            break

    return {
        "result": f"Found {len(matches)} file(s) matching '{pattern}' under {folder}",
        "matches": matches,
        "count": len(matches),
    }


@register("searchFilesAdvanced")
def search_files_advanced(args: Dict[str, Any]) -> Dict[str, Any]:
    """Find files or folders by fuzzy name, extension, and modification/creation date.
    
    Args:
      folder (str): Where to search (defaults to 'home')
      name (str): Fuzzy name to match (e.g., 'report' matches 'Q1_Report_2023.pdf')
      extension (str): File extension to filter by (e.g., '.pdf')
      type (str): 'file', 'folder', or 'both' (default 'both')
      modified_after (str): ISO date string (e.g., '2023-01-01')
    """
    import time
    from datetime import datetime
    
    folder_str = args.get("folder") or args.get("under") or "home"
    folder = _resolve_folder(folder_str)
    
    name = args.get("name")
    extension = args.get("extension")
    item_type = args.get("type", "both").lower()
    modified_after_str = args.get("modified_after")
    limit = int(args.get("limit", 100))
    
    if not folder.exists():
        raise ToolError(f"Folder does not exist: {folder}")
        
    if extension and not extension.startswith("."):
        extension = "." + extension
        
    modified_after = None
    if modified_after_str:
        try:
            modified_after = datetime.fromisoformat(modified_after_str.replace('Z', '+00:00')).timestamp()
        except ValueError:
            raise ToolError("modified_after must be a valid ISO format date (e.g., 2023-01-01T00:00:00)")

    matches: List[str] = []
    
    # Recursive search
    root_depth = str(folder).count(os.sep)
    for root, dirs, files in os.walk(folder):
        # Limit depth to 5 levels
        if root.count(os.sep) - root_depth > 5:
            dirs[:] = []
            continue
            
        # Exclude hidden and huge folders
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ('node_modules', 'AppData', '__pycache__')]
        
        items = []
        if item_type in ("folder", "both"):
            items.extend([(d, True) for d in dirs])
        if item_type in ("file", "both"):
            items.extend([(f, False) for f in files])
            
        for item_name, is_dir in items:
            # Filter by name
            if name and name.lower() not in item_name.lower():
                continue
                
            # Filter by extension
            if not is_dir and extension:
                if not item_name.lower().endswith(extension.lower()):
                    continue
                    
            item_path = os.path.join(root, item_name)
            
            # Filter by date
            if modified_after:
                try:
                    stat = os.stat(item_path)
                    if stat.st_mtime < modified_after and stat.st_ctime < modified_after:
                        continue
                except OSError:
                    continue
                    
            matches.append(item_path)
            if len(matches) >= limit:
                break
        if len(matches) >= limit:
            break
            
    return {
        "result": f"Found {len(matches)} item(s) matching criteria under {folder}",
        "matches": matches,
        "count": len(matches),
    }


__all__ = [
    "create_file",
    "read_file",
    "rename_file",
    "delete_file",
    "move_file",
    "open_folder",
    "list_files",
    "search_files",
    "search_files_advanced",
]

