@echo off
title Intelligent Fitness Pro Server
echo ===================================================
echo Starting Intelligent Fitness Pro (FastAPI + Uvicorn)
echo URL: http://127.0.0.1:8000
echo ===================================================
cd /d "%~dp0"
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
pause
