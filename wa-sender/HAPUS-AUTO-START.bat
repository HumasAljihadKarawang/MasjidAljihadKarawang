@echo off
title Hapus Auto-Start WA Sender - Masjid Al-Jihad
set "VBS_FILE=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\WA-Sender-DKM-AlJihad.vbs"

if exist "%VBS_FILE%" (
  del /f /q "%VBS_FILE%"
  echo [OK] Auto-start WA Sender berhasil dihapus dari Windows Startup.
) else (
  echo [INFO] File auto-start tidak ditemukan (sudah nonaktif).
)
echo.
pause
