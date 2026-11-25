@echo off
title Pasang Auto-Start WA Sender - Masjid Al-Jihad
cd /d "%~dp0"

echo ======================================================
echo   PASANG AUTO-START WA SENDER (WINDOWS LOGIN)
echo ======================================================
echo.

if not exist "node_modules" (
  echo [INFO] Menginstall library WA Sender terlebih dahulu...
  call npm install
  echo.
)

REM Hentikan semua watchdog & node server.js lama agar tidak bentrok (code 440)
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'cmd.exe' -and $_.CommandLine -like '*wa-watchdog.bat*') -or ($_.Name -eq 'node.exe' -and $_.CommandLine -like '*server.js*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3099 " ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_FILE=%STARTUP_DIR%\WA-Sender-DKM-AlJihad.vbs"
set "WORK_DIR=%~dp0"
if "%WORK_DIR:~-1%"=="\" set "WORK_DIR=%WORK_DIR:~0,-1%"

> "%VBS_FILE%" (
  echo Set WshShell = CreateObject("WScript.Shell"^)
  echo WshShell.CurrentDirectory = "%WORK_DIR%"
  echo WshShell.Run "cmd /c ""%WORK_DIR%\wa-watchdog.bat""", 0, False
)

echo [OK] Auto-start berhasil dipasang di:
echo      %VBS_FILE%
echo.
echo [INFO] Menyalakan WA Sender di background sekarang...
wscript.exe "%VBS_FILE%"
timeout /t 3 /nobreak >nul
echo.
echo [SELESAI] WA Sender sekarang berjalan otomatis di background (auto-restart aktif)!
echo           Silakan refresh Web Admin, status akan otomatis terdeteksi.
echo.
pause
