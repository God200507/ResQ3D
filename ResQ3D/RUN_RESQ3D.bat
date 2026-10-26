@echo off
cd /d "%~dp0"
echo ========================================
echo        RESQ3D SERVER STARTUP
echo ========================================
python backend\server.py
pause
