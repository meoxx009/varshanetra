@echo off
title VarshaNetra Public Mobile Tunnel
color 0A
echo ==============================================================================
echo   VarshaNetra - Public Remote / Mobile Access Tunnel
echo ==============================================================================
echo.
echo NOTE: For working on this computer, always use http://localhost:3000
echo.
echo Starting fixed-name tunnel on port 3000...
echo.
call npx --yes localtunnel --port 3000 --subdomain varshanetra-command
pause
