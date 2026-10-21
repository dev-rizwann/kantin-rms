@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Kashmir-Sync.ps1"
if errorlevel 1 (
  echo Installation did not complete. Please share the error above.
) else (
  echo Setup complete. Kantin POS was not stopped.
)
pause
