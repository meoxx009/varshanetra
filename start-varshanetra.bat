@echo off
title VarshaNetra District Command System
color 0B
echo ==============================================================================
echo   VarshaNetra - District Disaster Response & Hydrological Command System
echo ==============================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [2/3] Preparing production bundle...
if not exist ".next\BUILD_ID" (
    echo Building VarshaNetra production bundle...
    call npm run build
)

echo [3/3] Launching VarshaNetra web server on http://localhost:3000 ...
echo.
echo ==============================================================================
echo   ACCESS YOUR APPLICATION AT:
echo   - Local URL (Direct, No Tunnel):  http://localhost:3000
echo   - Local Network (Same Wi-Fi):     http://127.0.0.1:3000
echo ==============================================================================
echo.
start http://localhost:3000
call npm run start

pause
