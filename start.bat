@echo off
echo =========================================
echo   Starting Mediguide X Local Environment
echo =========================================

echo.
echo [1/2] Starting FastAPI Backend...
start "Mediguide Backend" cmd /k "cd backend && if exist venv\Scripts\activate (call venv\Scripts\activate) else (echo Warning: No venv found) && python run.py"

echo.
echo [2/2] Starting React Frontend...
start "Mediguide Frontend" cmd /k "npm run dev"

echo.
echo Both services are launching in separate windows!
echo - Frontend will be available at http://localhost:5173
echo - Backend API will be available at http://127.0.0.1:8000
echo.
pause
