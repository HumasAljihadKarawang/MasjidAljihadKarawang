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

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_FILE=%STARTUP_DIR%\WA-Sender-DKM-AlJihad.vbs"
set "WORK_DIR=%~dp0"
if "%WORK_DIR:~-1%"=="\" set "WORK_DIR=%WORK_DIR:~0,-1%"

> "%VBS_FILE%" (
  echo Set WshShell = CreateObject("WScript.Shell"^)
  echo WshShell.CurrentDirectory = "%WORK_DIR%"
  echo WshShell.Run "cmd /c node server.js", 0, False
)

echo [OK] Auto-start berhasil dipasang di:
echo      %VBS_FILE%
echo.
echo [INFO] Menyalakan WA Sender di background sekarang...
wscript.exe "%VBS_FILE%"
timeout /t 2 /nobreak >nul
echo.
echo [SELESAI] WA Sender sekarang berjalan otomatis di background!
echo           Silakan buka Web Admin -> Surat Undangan Otomatis.
echo           QR Code akan muncul langsung di halaman Web Admin.
echo.
pause
