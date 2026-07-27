@echo off
cd /d "%~dp0"

echo ==============================================
echo   STAFFLESS - starting up
echo ==============================================

if not exist "node_modules" (
  echo First time setup - installing dependencies, this may take a minute...
  call npm install
)

if not exist ".env" (
  echo Creating .env from template...
  copy ".env.example" ".env" >nul
)

echo.
echo Starting server...
start "" cmd /c "npm start"

timeout /t 4 /nobreak >nul

set PORT=8788
for /f "tokens=2 delims==" %%p in ('findstr /b "PORT=" .env') do set PORT=%%p

echo Opening dashboard in your browser...
start http://localhost:%PORT%

echo.
echo If the page doesn't load, wait a few seconds and refresh.
echo Close this window's server terminal to stop STAFFLESS.
pause
