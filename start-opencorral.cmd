@echo off
cd /d "%~dp0"
if not exist node_modules\typescript\package.json (
  echo Install dependencies first with npm ci.
  pause
  exit /b 1
)
call npm run build
if errorlevel 1 (
  pause
  exit /b 1
)
call npm start
if errorlevel 1 pause
