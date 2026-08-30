$ErrorActionPreference = 'Stop'

Write-Host """
J.A.R.V.I.S. Windows Companion Installer
This installs the local desktop-control bridge for the current Windows user.
""" -ForegroundColor Cyan

$repoRoot = Split-Path -Parent $PSScriptRoot
$bridgeSource = Join-Path $repoRoot 'public\jarvis_windows_bridge.py'
$installRoot = Join-Path $env:LOCALAPPDATA 'JARVIS\WindowsAgent'
$bridgeTarget = Join-Path $installRoot 'jarvis_windows_bridge.py'
$venv = Join-Path $installRoot '.venv'
$python = $null

foreach ($candidate in @('py', 'python')) {
  try {
    if (Get-Command $candidate -ErrorAction Stop) {
      $python = $candidate
      break
    }
  } catch {}
}

if (-not $python) {
  Write-Host "Python was not found." -ForegroundColor Yellow
  Write-Host "Install Python for Windows, then run this installer again." -ForegroundColor Yellow
  Write-Host "Official guide: https://docs.python.org/3/using/windows.html"
  exit 1
}

New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
Copy-Item -Force $bridgeSource $bridgeTarget

Write-Host "Creating isolated Python environment..." -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $venv 'Scripts\python.exe'))) {
  if ($python -eq 'py') {
    & py -3 -m venv $venv
  } else {
    & python -m venv $venv
  }
}

$venvPython = Join-Path $venv 'Scripts\python.exe'
$venvPythonW = Join-Path $venv 'Scripts\pythonw.exe'

Write-Host "Installing JARVIS companion dependencies..." -ForegroundColor Cyan
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install fastapi uvicorn pyautogui psutil pillow pydantic websockets

Write-Host "Registering JARVIS companion to start when you sign in..." -ForegroundColor Cyan
$action = New-ScheduledTaskAction -Execute $venvPythonW -Argument ('"' + $bridgeTarget + '"')
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName 'JARVIS Windows Companion' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

Write-Host "Starting JARVIS Windows Companion now..." -ForegroundColor Cyan
Start-Process -FilePath $venvPythonW -ArgumentList ('"' + $bridgeTarget + '"') -WorkingDirectory $installRoot
Start-Sleep -Seconds 2

try {
  $health = Invoke-RestMethod -Uri 'http://localhost:8765/api/health' -TimeoutSec 3
  Write-Host "JARVIS Windows Companion is ONLINE." -ForegroundColor Green
  Write-Host ($health | ConvertTo-Json -Compress)
} catch {
  Write-Host "The companion did not answer on localhost:8765 yet." -ForegroundColor Yellow
  Write-Host "Run scripts\start-windows-agent.bat to start it manually and check the console for errors."
}

Write-Host ""
Write-Host "Installed at: $installRoot" -ForegroundColor Green
Write-Host "The companion runs as your normal Windows user; no administrator mode is required for ordinary apps." -ForegroundColor Green
Write-Host "Do NOT disable UAC just for JARVIS." -ForegroundColor Green
