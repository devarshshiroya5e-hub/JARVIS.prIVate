@echo off
title JARVIS Local Windows Agent - Installer
echo ============================================================
echo   J.A.R.V.I.S. WINDOWS LOCAL AGENT - INSTALLATION SCRIPT
echo ============================================================
echo.
echo Checking for Python 3.11+...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in PATH!
    echo Please install Python 3.11 or higher from https://www.python.org/
    echo Make sure to check "Add python.exe to PATH" during installation.
    pause
    exit /b 1
)

echo [OK] Python is installed.
echo.
echo Creating virtual environment (venv)...
if not exist "venv" (
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Upgrading pip...
python -m pip install --upgrade pip

echo Installing required Python packages from requirements.txt...
pip install -r requirements.txt

echo.
echo Installing Playwright browser automation binaries...
playwright install chromium

echo.
echo ============================================================
echo   INSTALLATION COMPLETED SUCCESSFULLY!
echo   You can now launch the agent by double-clicking:
echo   start_agent.bat
echo ============================================================
echo.
pause
