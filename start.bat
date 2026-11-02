@echo off
title Espanol Trainer
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed. It is free: https://nodejs.org  ^(choose the LTS version^)
  echo Install it, then double-click this file again.
  echo.
  pause
  exit /b
)
node server.js
echo.
echo The trainer has stopped.
pause
