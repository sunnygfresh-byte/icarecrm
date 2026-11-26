@echo off
cd /d "%~dp0"
where node >nul 2>&1 || (echo Install Node.js 22 or newer first. & pause & exit /b 1)
node --env-file-if-exists=.env server.mjs
pause
