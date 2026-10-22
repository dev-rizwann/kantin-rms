@echo off
setlocal
title MUZAFARABAD - Clear Test Sales
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0Clear-Test-Sales.ps1"
if errorlevel 1 (
  echo FAILED. Do not start trading. Keep this window and read the error above.
  pause
  exit /b 1
)
pause
