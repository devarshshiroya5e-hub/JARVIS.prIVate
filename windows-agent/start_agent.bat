@echo off
title JARVIS Windows Local Agent
echo ============================================================
echo   STARTING J.A.R.V.I.S. WINDOWS LOCAL AGENT (Port 8765)
echo ============================================================
echo.

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo [INFO] No virtual environment found, using system Python...
)

python agent.py
pause
