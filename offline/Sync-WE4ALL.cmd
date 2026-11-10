@echo off
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0Sync-WE4ALL.ps1" -Install
if errorlevel 1 (
  echo Sync did not complete. Read the message above; your local edits were not overwritten.
)
pause
