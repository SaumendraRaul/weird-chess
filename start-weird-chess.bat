@echo off
title Weird Chess
echo Installing / checking dependencies...
npm install
if errorlevel 1 (pause & exit /b 1)
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8080"
npm start
