@echo off
setlocal
set "INSTALL=%LOCALAPPDATA%\JARVIS\WindowsAgent"
set "PYTHON=%INSTALL%\.venv\Scripts\python.exe"
set "BRIDGE=%INSTALL%\jarvis_windows_bridge.py"

if not exist "%PYTHON%" (
  echo JARVIS Windows Companion is not installed.
  echo Run scripts\install-windows-agent.ps1 from PowerShell first.
  pause
  exit /b 1
)

if not exist "%BRIDGE%" (
  echo JARVIS Windows Companion files are missing.
  echo Run the installer again.
  pause
  exit /b 1
)

cd /d "%INSTALL%"
"%PYTHON%" "%BRIDGE%"
