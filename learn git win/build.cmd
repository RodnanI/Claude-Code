@echo off
rem Double-click to rebuild learn-git-win.html with the PowerShell that ships with Windows.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build.ps1"
pause
