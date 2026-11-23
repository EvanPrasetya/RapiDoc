@echo off
title RapiDoc Launcher - Backend & Frontend
echo ===================================================
echo   Menjalankan RapiDoc (Smart Document Auto-Formatter)
echo ===================================================
echo.

echo [1/2] Menjalankan Backend Engine (FastAPI Port 8000)...
start "RapiDoc Backend (Port 8000)" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [2/2] Menjalankan Frontend Web (Next.js Port 3000)...
start "RapiDoc Frontend (Port 3000)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Selesai! Tunggu beberapa detik lalu buka browser di:
echo   Desktop : http://localhost:3000
echo.
pause
