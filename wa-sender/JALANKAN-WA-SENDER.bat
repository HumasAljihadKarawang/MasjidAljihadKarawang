@echo off
title WA Sender Lokal - DKM Masjid Al-Jihad Karawang
cd /d "%~dp0"

echo ======================================================
echo   WA SENDER LOKAL - DKM MASJID AL-JIHAD KARAWANG
echo ======================================================
echo.

if not exist "node_modules" (
  echo [INFO] Pertama kali dijalankan: Menginstall library WA Sender...
  call npm install
  echo.
)

echo [INFO] Menyalakan WA Sender di http://127.0.0.1:3099 ...
echo [INFO] Jika muncul QR Code, scan dari WhatsApp HP Anda.
echo.
node server.js
pause
